/**
 * Barcode scanner deduplication and line application logic.
 */

export interface ScannableLineItem {
    clinic_medicine_id?: number | null;
    medicine_variant_id?: number | null;
    medicine_brand_id?: number | null;
    display_name: string;
    generic_name?: string;
    brand_name?: string | null;
    base_unit: string;
    batch_number: string;
    expiry_date: string;
    packs?: number;
    pack_size?: number;
    quantity: number;
    cost_price: string;
    selling_price: string;
}

export interface ScannedMedicinePayload {
    clinic_medicine_id?: number | null;
    variant_id: number;
    brand_id?: number | null;
    display_name: string;
    generic_name?: string;
    brand_name?: string | null;
    base_unit?: string;
    pack_size?: number;
    cost_price?: string;
    selling_price?: string;
}

export interface ApplyScanResult<T extends ScannableLineItem> {
    lines: T[];
    action: 'incremented' | 'added';
    lineIndex: number;
    quantity: number;
}

/**
 * Manages cooldown timestamps per barcode and lock state to prevent frame-rate multi-scans.
 */
export class BarcodeScanDeduplicator {
    private lastScannedAt: Map<string, number> = new Map();
    private cooldownMs: number;
    private locked: boolean = false;

    constructor(cooldownMs: number = 2000) {
        this.cooldownMs = cooldownMs;
    }

    setLocked(locked: boolean): void {
        this.locked = locked;
    }

    isLocked(): boolean {
        return this.locked;
    }

    /**
     * Checks if a barcode scan should be accepted.
     * Returns true if accepted (and updates timestamp for that code).
     * Returns false if locked or within cooldown window of previous scan of that code.
     */
    shouldAccept(barcode: string, now: number = Date.now()): boolean {
        if (this.locked) {
            return false;
        }

        const code = barcode?.trim();
        if (!code) {
            return false;
        }

        const lastTime = this.lastScannedAt.get(code);
        if (lastTime !== undefined && now - lastTime < this.cooldownMs) {
            return false;
        }

        this.lastScannedAt.set(code, now);
        return true;
    }

    recordScan(barcode: string, now: number = Date.now()): void {
        const code = barcode?.trim();
        if (code) {
            this.lastScannedAt.set(code, now);
        }
    }

    getCooldownRemaining(barcode: string, now: number = Date.now()): number {
        const code = barcode?.trim();
        if (!code) return 0;
        const lastTime = this.lastScannedAt.get(code);
        if (lastTime === undefined) return 0;
        const elapsed = now - lastTime;
        return Math.max(0, this.cooldownMs - elapsed);
    }

    reset(): void {
        this.lastScannedAt.clear();
        this.locked = false;
    }
}

/**
 * Re-scan of a barcode already in the GRN increments the quantity of the most recent line
 * for that same clinic medicine/brand by one pack (pack_size).
 * If not already in lines, adds a new line with quantity = pack_size.
 */
export function applyBarcodeScanToLines<T extends ScannableLineItem>(
    currentLines: T[],
    scanned: ScannedMedicinePayload
): ApplyScanResult<T> {
    const packSize = Math.max(1, Number(scanned.pack_size) || 1);

    // Search backwards for the most recent line matching this medicine variant and brand
    let targetIndex = -1;
    for (let i = currentLines.length - 1; i >= 0; i--) {
        const line = currentLines[i];
        const sameVariant = line.medicine_variant_id === scanned.variant_id;
        const sameBrand = (line.medicine_brand_id ?? null) === (scanned.brand_id ?? null);
        if (sameVariant && sameBrand) {
            targetIndex = i;
            break;
        }
    }

    if (targetIndex >= 0) {
        // Increment quantity of the most recent line by 1 pack (pack_size)
        const updatedLines = [...currentLines];
        const existingLine = updatedLines[targetIndex];
        const currentQty = Number(existingLine.quantity) || 0;
        const newQty = currentQty + packSize;

        updatedLines[targetIndex] = {
            ...existingLine,
            pack_size: existingLine.pack_size || packSize,
            quantity: newQty,
        };

        return {
            lines: updatedLines,
            action: 'incremented',
            lineIndex: targetIndex,
            quantity: newQty,
        };
    }

    // Otherwise, create a new line with quantity = 1 pack
    const newLine = {
        clinic_medicine_id: scanned.clinic_medicine_id || null,
        medicine_variant_id: scanned.variant_id,
        medicine_brand_id: scanned.brand_id ?? null,
        display_name: scanned.display_name,
        generic_name: scanned.generic_name,
        brand_name: scanned.brand_name ?? null,
        base_unit: scanned.base_unit || 'tablet',
        batch_number: '',
        expiry_date: '',
        pack_size: packSize,
        quantity: packSize,
        cost_price: scanned.cost_price || '',
        selling_price: scanned.selling_price || '',
    } as T;

    return {
        lines: [...currentLines, newLine],
        action: 'added',
        lineIndex: currentLines.length,
        quantity: packSize,
    };
}

/**
 * Play a short 880Hz audio beep on successful barcode scan using Web Audio API.
 */
export function playScanBeep(): void {
    if (typeof window === 'undefined') return;
    try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch {
        // Audio playback may be restricted or unavailable
    }
}

/**
 * Trigger device haptic vibration on successful barcode scan if supported.
 */
export function triggerScanHaptic(durationMs: number = 100): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    try {
        if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
            navigator.vibrate(durationMs);
        }
    } catch {
        // Vibration not supported or allowed
    }
}
