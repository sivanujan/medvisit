<?php

declare(strict_types=1);

namespace App\Services\Pharmacy;

use App\Models\BillItem;
use App\Models\ClinicMedicine;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionTemplateItem;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class MedicineDuplicateService
{
    /**
     * Known brand names that sometimes get incorrectly saved as generic / product names.
     */
    protected const KNOWN_BRANDS = [
        'panadol', 'disprin', 'amoxil', 'moxilen', 'augumentin', 'augmentin',
        'zinnat', 'flagyl', 'cipro', 'ciprobay', 'voltaren', 'cataflam',
        'brufen', 'ponstan', 'glucophage', 'lipitor', 'crestor', 'norvasc',
        'plavix', 'nexium', 'losec', 'ventolin', 'zantac', 'clarityn',
        'zyrtec', 'actifed', 'piriton', 'solpadeine', 'tramal', 'doliprane',
    ];

    /**
     * Build a clean, normalized display name that never repeats the brand or generic.
     * Pattern: "{Generic or product name} {strength} {form}" + brand in brackets if different and not already in name.
     *
     * @return array{
     *     normalized_name: string,
     *     brand_flag: string|null,
     *     has_repeated_brand: bool
     * }
     */
    public function normalizeDisplayName(ClinicMedicine $medicine): array
    {
        $rawGeneric = trim((string) ($medicine->variant?->medicine?->generic_name ?? ''));
        $rawStrength = trim((string) ($medicine->variant?->strength_text ?? ''));
        $rawForm = trim((string) ($medicine->variant?->dosage_form ?? ''));
        $rawBrand = trim((string) ($medicine->brand?->brand_name ?? ''));

        // If generic_name is missing, try to parse from display_name
        if ($rawGeneric === '') {
            $rawGeneric = trim($medicine->display_name);
        }

        // Clean out repeating brand from the generic if it literally duplicates
        // Example: "Samahan Samahan Herbal" -> "Samahan Herbal"
        $words = preg_split('/\s+/', $rawGeneric);
        if (count($words) >= 2 && strcasecmp($words[0], $words[1]) === 0) {
            array_shift($words);
            $rawGeneric = implode(' ', $words);
        }

        // Check if a known brand name is stored in generic name while brand is empty or Generic
        $brandFlag = null;
        $lowerGeneric = strtolower($rawGeneric);
        $isBrandGeneric = empty($rawBrand) || strcasecmp($rawBrand, 'generic') === 0;

        if ($isBrandGeneric) {
            foreach (self::KNOWN_BRANDS as $kb) {
                if (preg_match('/\b'.preg_quote($kb, '/').'\b/i', $lowerGeneric)) {
                    $brandFlag = "Known brand '".ucfirst($kb)."' detected in product name while brand is marked Generic.";
                    break;
                }
            }
        }

        // Clean up strength and form formatting
        $strength = $rawStrength !== '' ? $rawStrength : '';
        $form = $rawForm !== '' ? ucfirst(strtolower($rawForm)) : '';

        // If form already appears in generic or strength, don't duplicate
        if ($form !== '' && preg_match('/\b'.preg_quote($form, '/').'\b/i', $rawGeneric)) {
            $form = '';
        }

        // Assemble the base name: "{Generic or product name} {strength} {form}"
        $parts = array_filter([$rawGeneric, $strength, $form], fn ($p) => $p !== '');
        $baseName = implode(' ', $parts);

        // Remove extra spaces
        $baseName = trim((string) preg_replace('/\s+/', ' ', $baseName));

        // Determine if brand should be added in brackets
        // Add brand in brackets ONLY if it's not empty, not "Generic", and not already contained in baseName
        $hasRepeatedBrand = false;
        $finalName = $baseName;

        if (! empty($rawBrand) && strcasecmp($rawBrand, 'generic') !== 0) {
            // Check if brand is already present in baseName
            $brandInBase = preg_match('/\b'.preg_quote($rawBrand, '/').'\b/i', $baseName);
            if ($brandInBase) {
                $hasRepeatedBrand = true;
                // Don't append brand again
                $finalName = $baseName;
            } else {
                // If brand contains the strength/form (like "Panadol 500mg"), strip that for the chip/bracket
                $cleanBrand = preg_replace('/\s*\b\d+\s*(?:mg|g|mcg|ml|iu)\b/i', '', $rawBrand);
                $cleanBrand = trim((string) preg_replace('/\s*\b(?:tablet|capsule|syrup|cream|ointment|injection|suspension)\b/i', '', $cleanBrand));
                if (empty($cleanBrand)) {
                    $cleanBrand = $rawBrand;
                }

                if (! preg_match('/\b'.preg_quote($cleanBrand, '/').'\b/i', $baseName)) {
                    $finalName = "{$baseName} ({$cleanBrand})";
                }
            }
        }

        return [
            'normalized_name' => $finalName,
            'brand_flag' => $brandFlag,
            'has_repeated_brand' => $hasRepeatedBrand,
        ];
    }

    /**
     * Detect possible duplicate medicines for a tenant.
     *
     * @return array<int, array{
     *     pair_key: string,
     *     reason: string,
     *     medicine_a: array,
     *     medicine_b: array
     * }>
     */
    public function detectDuplicates(string $tenantId): array
    {
        $dismissedPairs = (array) (tenant()->pharmacy_dismissed_duplicate_pairs ?? []);

        $medicines = ClinicMedicine::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with(['variant.medicine', 'brand', 'batches' => fn ($q) => $q->whereNull('voided_at')])
            ->withCount([
                'movements',
                'batches as active_batches_count' => fn ($q) => $q->whereNull('voided_at')->where('quantity_remaining', '>', 0),
            ])
            ->get();

        $pairs = [];
        $seenPairs = [];

        $items = $medicines->values();
        $count = $items->count();

        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                $medA = $items[$i];
                $medB = $items[$j];

                // Deterministic pair key
                $minId = min($medA->id, $medB->id);
                $maxId = max($medA->id, $medB->id);
                $pairKey = "{$minId}_{$maxId}";

                if (in_array($pairKey, $dismissedPairs, true) || isset($seenPairs[$pairKey])) {
                    continue;
                }

                $matchResult = $this->compareMedicines($medA, $medB);
                if ($matchResult['is_match']) {
                    $seenPairs[$pairKey] = true;
                    $pairs[] = [
                        'pair_key' => $pairKey,
                        'reason' => $matchResult['reason'],
                        'medicine_a' => $this->formatMedicineForComparison($medA),
                        'medicine_b' => $this->formatMedicineForComparison($medB),
                    ];
                }
            }
        }

        return $pairs;
    }

    /**
     * Compare two medicines to check if they represent the same pharmaceutical product.
     *
     * @return array{is_match: bool, reason: string}
     */
    protected function compareMedicines(ClinicMedicine $a, ClinicMedicine $b): array
    {
        // 1. Same exact variant_id
        if ($a->medicine_variant_id && $b->medicine_variant_id && $a->medicine_variant_id === $b->medicine_variant_id) {
            // If one is generic and the other is branded, or both have same brand
            $brandA = strtolower(trim((string) ($a->brand?->brand_name ?? '')));
            $brandB = strtolower(trim((string) ($b->brand?->brand_name ?? '')));

            $isAGeneric = empty($brandA) || $brandA === 'generic';
            $isBGeneric = empty($brandB) || $brandB === 'generic';

            if ($isAGeneric || $isBGeneric || $brandA === $brandB) {
                return [
                    'is_match' => true,
                    'reason' => 'Exact same generic variant, strength and form ('.($isAGeneric || $isBGeneric ? 'Generic vs Branded' : 'Duplicate brand entries').')',
                ];
            }
        }

        // 2. Normalized Generic + Strength + Form matching
        $genA = $this->normalizeString($a->variant?->medicine?->generic_name ?? $a->display_name);
        $genB = $this->normalizeString($b->variant?->medicine?->generic_name ?? $b->display_name);

        $strA = $this->normalizeStrength($a->variant?->strength_text ?? $a->display_name);
        $strB = $this->normalizeStrength($b->variant?->strength_text ?? $b->display_name);

        $formA = $this->normalizeForm($a->variant?->dosage_form ?? $a->display_name);
        $formB = $this->normalizeForm($b->variant?->dosage_form ?? $b->display_name);

        // Check if generic names match
        $genericMatches = ($genA !== '' && $genB !== '') && (
            $genA === $genB
            || str_contains($genA, $genB)
            || str_contains($genB, $genA)
        );

        if ($genericMatches && $strA !== '' && $strA === $strB && ($formA === '' || $formB === '' || $formA === $formB)) {
            return [
                'is_match' => true,
                'reason' => "Matching generic '{$a->variant?->medicine?->generic_name}' with identical strength ({$strA}) and dosage form",
            ];
        }

        // 3. Known brand in generic name vs registered brand
        // e.g. "Panadol Paracetamol 500 mg" vs "Paracetamol 500mg Tablet (Panadol)"
        $nameA = strtolower($a->display_name);
        $nameB = strtolower($b->display_name);

        foreach (self::KNOWN_BRANDS as $kb) {
            $hasInA = str_contains($nameA, $kb);
            $hasInB = str_contains($nameB, $kb);
            if ($hasInA && $hasInB && $strA !== '' && $strA === $strB) {
                return [
                    'is_match' => true,
                    'reason' => "Both contain brand '".ucfirst($kb)."' with identical strength ({$strA})",
                ];
            }
        }

        return ['is_match' => false, 'reason' => ''];
    }

    /**
     * Merge one clinic medicine into another.
     * Moves all batches, stock movements, prescription and template references, bill lines.
     * Archives the merged item and logs audit.
     * Never auto-merges.
     */
    public function mergeMedicines(
        ClinicMedicine $kept,
        ClinicMedicine $merged,
        User $user,
        string $tenantId,
        ?string $reason = null
    ): void {
        abort_unless($kept->tenant_id === $tenantId && $merged->tenant_id === $tenantId, 404);

        if ($kept->id === $merged->id) {
            throw new InvalidArgumentException('Cannot merge a medicine into itself.');
        }

        DB::transaction(function () use ($kept, $merged, $user, $tenantId, $reason) {
            // 1. Move all StockBatches
            $batchCount = StockBatch::where('tenant_id', $tenantId)
                ->where('clinic_medicine_id', $merged->id)
                ->update(['clinic_medicine_id' => $kept->id]);

            // 2. Move all StockMovements
            $movementCount = StockMovement::where('tenant_id', $tenantId)
                ->where('clinic_medicine_id', $merged->id)
                ->update(['clinic_medicine_id' => $kept->id]);

            // 3. Move PrescriptionItem references (both prescribed and dispensed)
            $rxItemCount = PrescriptionItem::where('clinic_medicine_id', $merged->id)
                ->update(['clinic_medicine_id' => $kept->id]);

            $rxDispensedCount = PrescriptionItem::where('dispensed_clinic_medicine_id', $merged->id)
                ->update(['dispensed_clinic_medicine_id' => $kept->id]);

            // 4. Move PrescriptionTemplateItem references
            $templateCount = PrescriptionTemplateItem::where('clinic_medicine_id', $merged->id)
                ->update(['clinic_medicine_id' => $kept->id]);

            // 5. Move BillItem references
            $billItemCount = BillItem::where('clinic_medicine_id', $merged->id)
                ->update(['clinic_medicine_id' => $kept->id]);

            // 6. Deactivate and mark merged medicine as archived
            $merged->update([
                'is_active' => false,
                'display_name' => $merged->display_name.' [Merged into #'.$kept->id.']',
            ]);

            // 7. Audit log the merge operation
            AuditLogger::log('stock.medicine_merged', [
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'resource' => $kept,
                'metadata' => [
                    'kept_medicine_id' => $kept->id,
                    'kept_display_name' => $kept->display_name,
                    'merged_medicine_id' => $merged->id,
                    'merged_display_name' => $merged->display_name,
                    'batches_moved' => $batchCount,
                    'movements_moved' => $movementCount,
                    'prescription_items_moved' => $rxItemCount + $rxDispensedCount,
                    'template_items_moved' => $templateCount,
                    'bill_items_moved' => $billItemCount,
                    'reason' => $reason ?? 'Pharmacist merged duplicate medicine entries',
                ],
            ]);
        });
    }

    /**
     * Dismiss a possible duplicate pair so it no longer flags.
     */
    public function dismissDuplicatePair(string $pairKey, User $user, string $tenantId): void
    {
        $tenant = tenant();
        $dismissed = (array) ($tenant->pharmacy_dismissed_duplicate_pairs ?? []);
        if (! in_array($pairKey, $dismissed, true)) {
            $dismissed[] = $pairKey;
            $tenant->update(['pharmacy_dismissed_duplicate_pairs' => $dismissed]);

            AuditLogger::log('stock.duplicate_dismissed', [
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'metadata' => [
                    'pair_key' => $pairKey,
                    'action' => 'dismissed_by_user',
                ],
            ]);
        }
    }

    protected function formatMedicineForComparison(ClinicMedicine $med): array
    {
        $totalQty = (int) $med->batches->whereNull('voided_at')->sum('quantity_remaining');
        $norm = $this->normalizeDisplayName($med);

        return [
            'id' => $med->id,
            'display_name' => $med->display_name,
            'normalized_display_name' => $norm['normalized_name'],
            'generic_name' => $med->variant?->medicine?->generic_name ?? 'Generic',
            'strength_form' => $med->variant?->display_name ?? '—',
            'brand_name' => $med->brand?->brand_name ?? 'Generic',
            'base_unit' => $med->base_unit,
            'selling_price_cents' => (int) ($med->selling_price_cents ?? 0),
            'reorder_level' => $med->reorder_level,
            'shelf_location' => $med->shelf_location,
            'total_quantity' => $totalQty,
            'batches_count' => $med->batches->whereNull('voided_at')->count(),
            'movements_count' => (int) ($med->movements_count ?? 0),
            'brand_flag' => $norm['brand_flag'],
        ];
    }

    protected function normalizeString(?string $str): string
    {
        if (! $str) {
            return '';
        }
        $s = strtolower(trim($str));

        return (string) preg_replace('/[^a-z0-9]/', '', $s);
    }

    protected function normalizeStrength(?string $str): string
    {
        if (! $str) {
            return '';
        }
        if (preg_match('/(\d+(?:\.\d+)?)\s*(mg|g|mcg|ml|iu|%)/i', $str, $m)) {
            return strtolower($m[1].' '.$m[2]);
        }

        return '';
    }

    protected function normalizeForm(?string $str): string
    {
        if (! $str) {
            return '';
        }
        $s = strtolower($str);
        if (str_contains($s, 'tab')) {
            return 'tablet';
        }
        if (str_contains($s, 'cap')) {
            return 'capsule';
        }
        if (str_contains($s, 'syrup') || str_contains($s, 'liquid')) {
            return 'syrup';
        }
        if (str_contains($s, 'powder')) {
            return 'powder';
        }
        if (str_contains($s, 'inj')) {
            return 'injection';
        }
        if (str_contains($s, 'cream') || str_contains($s, 'ointment')) {
            return 'cream';
        }
        if (str_contains($s, 'drop')) {
            return 'drops';
        }

        return '';
    }
}
