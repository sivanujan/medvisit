/**
 * Client-Side Image Compressor & Validator for MedVisit
 *
 * Resizes large photos (e.g. from iPhone/Android cameras) down to web-safe dimensions,
 * re-encodes to WebP/PNG/JPEG with ~0.85 quality, preserves PNG transparency for logos,
 * detects unsupported formats (HEIC/HEIF/SVG) with user-friendly messages,
 * and enforces server-matched 5MB size guards.
 */

export interface CompressImageOptions {
    /** Maximum allowed width or height in pixels (default: 2000, or 1024 for logos) */
    maxDimension?: number;
    /** Output quality between 0.1 and 1.0 (default: 0.85) */
    quality?: number;
    /** Whether to preserve transparent alpha channel (default: true for logos or PNGs) */
    preserveTransparency?: boolean;
    /** Whether this image is a logo (defaults maxDimension to 1024px and enables SVG-specific alert) */
    isLogo?: boolean;
    /** Max output size in bytes (default: 5 * 1024 * 1024 = 5MB, matching Laravel max:5120) */
    maxBytes?: number;
}

export class ImageValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ImageValidationError';
    }
}

export interface CompressedImageResult {
    file: File;
    width: number;
    height: number;
    originalSize: number;
    compressedSize: number;
}

const SERVER_MAX_BYTES = 5 * 1024 * 1024; // 5MB matches Laravel max:5120

/**
 * Validate and compress an image file before upload.
 *
 * @throws {ImageValidationError} when the file is invalid, HEIC, SVG, or exceeds limits
 */
export async function compressImageBeforeUpload(
    file: File,
    options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
    const nameLower = (file.name || '').toLowerCase();
    const typeLower = (file.type || '').toLowerCase();

    // 1. iPhone HEIC / HEIF detection
    if (
        typeLower === 'image/heic' ||
        typeLower === 'image/heif' ||
        nameLower.endsWith('.heic') ||
        nameLower.endsWith('.heif')
    ) {
        throw new ImageValidationError(
            "iPhone HEIC photos aren't supported yet — please choose JPG or PNG (or change your iPhone camera setting to 'Most Compatible')"
        );
    }

    // 2. SVG handling
    const isSvg = typeLower === 'image/svg+xml' || nameLower.endsWith('.svg');
    if (isSvg) {
        if (options.isLogo) {
            throw new ImageValidationError(
                "SVG logos aren't supported for security reasons — please upload a PNG, WebP, or JPG image."
            );
        }
        // For website media uploads, do not compress SVG (canvas would rasterize it);
        // pass through uncompressed to the server SVG sanitizer.
        const maxBytes = options.maxBytes ?? SERVER_MAX_BYTES;
        if (file.size > maxBytes) {
            const limitMb = (maxBytes / (1024 * 1024)).toFixed(0);
            throw new ImageValidationError(
                `SVG file size exceeds the ${limitMb}MB limit. Please choose a smaller file.`
            );
        }
        return {
            file,
            width: 0,
            height: 0,
            originalSize: file.size,
            compressedSize: file.size,
        };
    }

    // 3. GIF handling (preserve animation)
    const isGif = typeLower === 'image/gif' || nameLower.endsWith('.gif');
    if (isGif) {
        if (options.isLogo) {
            throw new ImageValidationError(
                'GIF images are not permitted for logos. Please use PNG, JPEG, or WebP.'
            );
        }
        // Keep animated GIFs animated by avoiding canvas re-encoding
        const maxBytes = options.maxBytes ?? SERVER_MAX_BYTES;
        if (file.size > maxBytes) {
            const limitMb = (maxBytes / (1024 * 1024)).toFixed(0);
            throw new ImageValidationError(
                `GIF file size exceeds the ${limitMb}MB limit. Please choose a smaller file.`
            );
        }
        return {
            file,
            width: 0,
            height: 0,
            originalSize: file.size,
            compressedSize: file.size,
        };
    }

    // 4. Allowed format check (PNG, JPEG, WebP)
    const isPng = typeLower === 'image/png' || nameLower.endsWith('.png');
    const isJpg =
        typeLower === 'image/jpeg' ||
        typeLower === 'image/jpg' ||
        nameLower.endsWith('.jpg') ||
        nameLower.endsWith('.jpeg');
    const isWebp = typeLower === 'image/webp' || nameLower.endsWith('.webp');

    if (!isPng && !isJpg && !isWebp) {
        throw new ImageValidationError(
            'Invalid format. Please upload a PNG, WebP, or JPEG image.'
        );
    }

    const maxDim = options.maxDimension ?? (options.isLogo ? 1024 : 2000);
    const quality = options.quality ?? 0.85;
    const preserveAlpha = options.preserveTransparency ?? (options.isLogo || isPng);
    const maxBytes = options.maxBytes ?? SERVER_MAX_BYTES;

    // 5. Load image with EXIF orientation applied (via createImageBitmap or fallback)
    const loaded = await loadImageSource(file);
    const originalWidth = loaded.width;
    const originalHeight = loaded.height;

    if (!originalWidth || !originalHeight) {
        loaded.cleanup();
        throw new ImageValidationError('Could not read image dimensions. Please try another image.');
    }

    // 6. Calculate target dimensions respecting aspect ratio
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (originalWidth > maxDim || originalHeight > maxDim) {
        if (originalWidth >= originalHeight) {
            targetWidth = maxDim;
            targetHeight = Math.round((originalHeight * maxDim) / originalWidth);
        } else {
            targetHeight = maxDim;
            targetWidth = Math.round((originalWidth * maxDim) / originalHeight);
        }
    }

    // 7. Draw to Canvas (this renders raw pixels and strips all EXIF/GPS metadata)
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        loaded.cleanup();
        throw new ImageValidationError('Browser canvas not supported. Please update your browser.');
    }

    // High quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (!preserveAlpha) {
        // Fill background with white to avoid black backgrounds on transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    ctx.drawImage(loaded.source, 0, 0, targetWidth, targetHeight);
    loaded.cleanup();

    // 7. Output encoding
    // For logos / transparent PNGs: try PNG first to preserve pixel-perfect lines
    let preferredMime = 'image/webp';
    let outputBlob: Blob | null = null;

    if (preserveAlpha && isPng) {
        // Test PNG export
        outputBlob = await canvasToBlob(canvas, 'image/png');
        // If PNG output is still larger than 2MB, fall back to WebP with alpha at quality 0.85
        if (outputBlob && outputBlob.size > 2 * 1024 * 1024) {
            const webpBlob = await canvasToBlob(canvas, 'image/webp', quality);
            if (webpBlob && webpBlob.size < outputBlob.size) {
                outputBlob = webpBlob;
                preferredMime = 'image/webp';
            } else {
                preferredMime = 'image/png';
            }
        } else {
            preferredMime = 'image/png';
        }
    } else {
        // General photos / covers: WebP with fallback to JPEG
        outputBlob = await canvasToBlob(canvas, 'image/webp', quality);
        if (!outputBlob || outputBlob.type !== 'image/webp') {
            outputBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
            preferredMime = 'image/jpeg';
        } else {
            preferredMime = 'image/webp';
        }
    }

    if (!outputBlob) {
        throw new ImageValidationError('Failed to encode compressed image.');
    }

    // 8. Construct final File
    const ext = preferredMime === 'image/webp' ? 'webp' : preferredMime === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const finalFile = new File([outputBlob], `${baseName}.${ext}`, {
        type: preferredMime,
        lastModified: Date.now(),
    });

    // 9. Enforce size guard on the compressed file
    if (finalFile.size > maxBytes) {
        const sizeMb = (finalFile.size / (1024 * 1024)).toFixed(1);
        const limitMb = (maxBytes / (1024 * 1024)).toFixed(0);
        throw new ImageValidationError(
            `File size (${sizeMb}MB) exceeds the ${limitMb}MB limit even after compression. Please choose a smaller image.`
        );
    }

    return {
        file: finalFile,
        width: targetWidth,
        height: targetHeight,
        originalSize: file.size,
        compressedSize: finalFile.size,
    };
}

/**
 * Safely load an image into a CanvasImageSource with EXIF orientation applied.
 * Uses window.createImageBitmap with imageOrientation: 'from-image' when available
 * to ensure portrait smartphone photos are correctly oriented before drawing to canvas.
 * When drawn to canvas, all original EXIF and GPS metadata is automatically stripped.
 */
async function loadImageSource(file: File): Promise<{
    source: CanvasImageSource;
    width: number;
    height: number;
    cleanup: () => void;
}> {
    // 1. Prefer modern createImageBitmap with EXIF orientation handling
    if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
        try {
            const bitmap = await window.createImageBitmap(file, {
                imageOrientation: 'from-image',
            });
            return {
                source: bitmap,
                width: bitmap.width,
                height: bitmap.height,
                cleanup: () => {
                    if (typeof (bitmap as any).close === 'function') {
                        (bitmap as any).close();
                    }
                },
            };
        } catch {
            // Fallback to HTMLImageElement if createImageBitmap fails on specific browser or format
        }
    }

    // 2. Fallback to HTMLImageElement (modern browsers honor CSS image-orientation: from-image)
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            resolve({
                source: img,
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height,
                cleanup: () => URL.revokeObjectURL(objectUrl),
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new ImageValidationError('Could not read or decode image file. Please try another.'));
        };

        img.src = objectUrl;
    });
}

/**
 * Promise wrapper for HTMLCanvasElement.toBlob
 */
function canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality?: number
): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
}
