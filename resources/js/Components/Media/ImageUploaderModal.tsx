import React, { useState, useRef, useCallback } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import {
    Upload,
    Link as LinkIcon,
    Camera,
    RotateCw,
    ZoomIn,
    ZoomOut,
    Check,
    X,
    Trash2,
    AlertCircle,
    Loader2,
    Building2,
    ExternalLink,
} from 'lucide-react';
import axios from 'axios';

export type UploaderType = 'logo' | 'avatar' | 'doctor';

export interface ImageUploaderModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: UploaderType;
    currentImageUrl?: string | null;
    uploadEndpoint: string;
    deleteEndpoint: string;
    title?: string;
    subtitle?: string;
    clinicName?: string;
    fallbackInitial?: string;
    onSuccess: (data: { logo_url?: string; avatar_url?: string; photo_url?: string }) => void;
    onRemove?: () => void;
}

export default function ImageUploaderModal({
    isOpen,
    onClose,
    type,
    currentImageUrl,
    uploadEndpoint,
    deleteEndpoint,
    title,
    subtitle,
    clinicName = 'Clinic Workspace',
    fallbackInitial = 'M',
    onSuccess,
    onRemove,
}: ImageUploaderModalProps) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [fetchingLink, setFetchingLink] = useState(false);

    // Cropper states
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [logoAspect, setLogoAspect] = useState<number | undefined>(1); // 1: 1:1, 16/9: wide, undefined: free

    // Status states
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const isLogo = type === 'logo';
    const isRound = type === 'avatar' || type === 'doctor';
    const effectiveAspect = isLogo ? logoAspect : 1;
    const cropShape = isRound ? 'round' : 'rect';

    const defaultTitle = isLogo
        ? 'Clinic Brand Logo'
        : type === 'doctor'
        ? 'Doctor Profile Photo'
        : 'Profile Avatar';

    const defaultSubtitle = isLogo
        ? 'Upload your official clinic logo to display in the sidebar, public website, PDF receipts, and emails.'
        : type === 'doctor'
        ? 'Upload a professional medical photo shown on public channeling and doctor schedules.'
        : 'Upload a personal profile photo displayed across workspace top bars and staff directories.';

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // Handle Client File Selection with validation
    const handleFileSelected = (file: File) => {
        setErrorMessage(null);
        setSuccessMessage(null);

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            setErrorMessage('Invalid file type. Only PNG, JPEG, and WebP images are allowed. SVG and GIF are blocked for security.');
            return;
        }

        const maxBytes = 5 * 1024 * 1024;
        if (file.size > maxBytes) {
            setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`);
            return;
        }

        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = () => {
            setImageSrc(reader.result as string);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
        };
        reader.readAsDataURL(file);
    };

    // Drag and Drop
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelected(e.dataTransfer.files[0]);
        }
    };

    // Handle Image from URL Link
    const handleFetchLink = async () => {
        setErrorMessage(null);
        setSuccessMessage(null);

        const trimmed = linkUrl.trim();
        if (!trimmed) {
            setErrorMessage('Please enter an image URL.');
            return;
        }

        if (!/^https?:\/\//i.test(trimmed)) {
            setErrorMessage('Only http:// and https:// URLs are allowed.');
            return;
        }

        // Detect obvious Google Drive / Dropbox share links that return HTML
        if (
            (trimmed.includes('drive.google.com') && !trimmed.includes('export=download')) ||
            (trimmed.includes('dropbox.com') && !trimmed.includes('raw=1') && !trimmed.includes('dl=1'))
        ) {
            setErrorMessage('Please use a direct image link or upload the file (share links often return a web page instead of image data).');
            return;
        }

        setFetchingLink(true);

        try {
            // Verify link client-side preview via Image object
            const testImg = new Image();
            testImg.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
                testImg.onload = () => resolve();
                testImg.onerror = () => reject(new Error("Couldn't preview that image."));
                testImg.src = trimmed;
            });

            setImageSrc(trimmed);
            setSelectedFile(null); // using link
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
        } catch {
            // Even if client preview fails (CORS), we still allow server-side fetch with SSRF protection
            setImageSrc(trimmed);
            setSelectedFile(null);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
        } finally {
            setFetchingLink(false);
        }
    };

    // Submit cropped image to server
    const handleSave = async () => {
        if (!imageSrc && !selectedFile && !linkUrl) {
            setErrorMessage('Please select or paste an image first.');
            return;
        }

        setSubmitting(true);
        setErrorMessage(null);

        try {
            const formData = new FormData();

            if (selectedFile) {
                formData.append('file', selectedFile);
            } else if (linkUrl) {
                formData.append('source_url', linkUrl);
            }

            if (croppedAreaPixels) {
                formData.append('crop_x', String(Math.round(croppedAreaPixels.x)));
                formData.append('crop_y', String(Math.round(croppedAreaPixels.y)));
                formData.append('crop_width', String(Math.round(croppedAreaPixels.width)));
                formData.append('crop_height', String(Math.round(croppedAreaPixels.height)));
            }

            formData.append('rotate', String(rotation));

            const res = await axios.post(uploadEndpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Accept: 'application/json',
                },
            });

            setSuccessMessage(res.data.message || 'Image uploaded successfully!');
            onSuccess(res.data);
            setTimeout(() => {
                onClose();
            }, 700);
        } catch (err: unknown) {
            let msg = 'Failed to process image. Please try another file.';
            if (axios.isAxiosError(err)) {
                const responseData = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
                if (responseData?.errors) {
                    const firstErrKey = Object.keys(responseData.errors)[0];
                    msg = responseData.errors[firstErrKey]?.[0] || msg;
                } else if (responseData?.message) {
                    msg = responseData.message;
                }
            } else if (err instanceof Error) {
                msg = err.message;
            }
            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // Remove photo and restore default
    const handleRemove = async () => {
        if (!confirm('Are you sure you want to remove this image and restore the default?')) {
            return;
        }

        setDeleting(true);
        setErrorMessage(null);

        try {
            await axios.delete(deleteEndpoint, {
                headers: { Accept: 'application/json' },
            });
            setSuccessMessage('Image removed.');
            setImageSrc(null);
            setSelectedFile(null);
            setLinkUrl('');
            if (onRemove) onRemove();
            setTimeout(() => {
                onClose();
            }, 600);
        } catch (err: unknown) {
            let msg = 'Failed to remove image.';
            if (axios.isAxiosError(err)) {
                const responseData = err.response?.data as { message?: string } | undefined;
                msg = responseData?.message || msg;
            }
            setErrorMessage(msg);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-200/70 dark:border-white/10">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {title || defaultTitle}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                            {subtitle || defaultSubtitle}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Alerts */}
                {errorMessage && (
                    <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Source Selection Tabs (when not yet in crop mode or changing) */}
                <div className="mt-4 flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('upload');
                            setErrorMessage(null);
                        }}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                            activeTab === 'upload'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload from device</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('link');
                            setErrorMessage(null);
                        }}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                            activeTab === 'link'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>From link</span>
                    </button>
                </div>

                {/* Tab 1: Upload from device */}
                {activeTab === 'upload' && !imageSrc && (
                    <div className="mt-4 space-y-3">
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-white/[0.01]"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-xs">
                                <Upload className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                Drag & drop image here, or <span className="text-primary underline">browse</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Supports PNG, JPEG, WebP up to 5 MB
                            </p>
                        </div>

                        {/* Mobile Camera Option */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="sm:hidden flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                <Camera className="w-4 h-4 text-primary" />
                                <span>Take Photo</span>
                            </button>
                        </div>

                        {/* Hidden file inputs */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    handleFileSelected(e.target.files[0]);
                                }
                            }}
                        />
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    handleFileSelected(e.target.files[0]);
                                }
                            }}
                        />
                    </div>
                )}

                {/* Tab 2: From Link */}
                {activeTab === 'link' && !imageSrc && (
                    <div className="mt-4 space-y-3">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Paste public image URL:
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://example.com/clinic-logo.png"
                                className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                                type="button"
                                onClick={handleFetchLink}
                                disabled={fetchingLink || !linkUrl.trim()}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-600 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
                            >
                                {fetchingLink ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Fetching...</span>
                                    </>
                                ) : (
                                    <span>Fetch</span>
                                )}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            Must be a direct link ending in .png, .jpg, or .webp. Google Drive / Dropbox share pages are automatically guarded.
                        </p>
                    </div>
                )}

                {/* Crop & Edit Interface */}
                {imageSrc && (
                    <div className="mt-4 space-y-4">
                        <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                rotation={rotation}
                                aspect={effectiveAspect}
                                cropShape={cropShape}
                                showGrid={true}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                onRotationChange={setRotation}
                            />
                        </div>

                        {/* Controls Bar: Zoom + Rotate + Logo Aspect Toggle */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-white/5 text-xs">
                            {/* Zoom Slider */}
                            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                                <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                                <input
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full accent-primary cursor-pointer"
                                />
                                <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
                            </div>

                            {/* Rotate 90° */}
                            <button
                                type="button"
                                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                                className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors flex items-center gap-1.5 font-semibold"
                                title="Rotate 90° clockwise"
                            >
                                <RotateCw className="w-3.5 h-3.5" />
                                <span>Rotate</span>
                            </button>

                            {/* Aspect Ratio Toggle (For Logo only) */}
                            {isLogo && (
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setLogoAspect(1)}
                                        className={`px-2 py-1 rounded-lg font-bold text-[10px] ${
                                            logoAspect === 1
                                                ? 'bg-primary text-white'
                                                : 'text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        1:1 Square
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLogoAspect(16 / 9)}
                                        className={`px-2 py-1 rounded-lg font-bold text-[10px] ${
                                            logoAspect === 16 / 9
                                                ? 'bg-primary text-white'
                                                : 'text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        Wide
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLogoAspect(undefined)}
                                        className={`px-2 py-1 rounded-lg font-bold text-[10px] ${
                                            logoAspect === undefined
                                                ? 'bg-primary text-white'
                                                : 'text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        Free
                                    </button>
                                </div>
                            )}

                            {/* Reset or Choose Different Image */}
                            <button
                                type="button"
                                onClick={() => {
                                    setImageSrc(null);
                                    setSelectedFile(null);
                                    setLinkUrl('');
                                }}
                                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold underline text-xs"
                            >
                                Change
                            </button>
                        </div>

                        {/* In-Context Preview */}
                        <div className="p-3 bg-slate-100/60 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-white/5 space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {isLogo
                                    ? 'Sidebar Brand Block Preview (Light & Dark)'
                                    : type === 'doctor'
                                    ? 'Doctor Card Preview'
                                    : 'User Menu Header Preview'}
                            </div>

                            {/* Logo Context Preview */}
                            {isLogo && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Light mode preview */}
                                    <div className="h-16 px-4 bg-white/90 border border-slate-200/80 rounded-xl flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center overflow-hidden shrink-0">
                                            <img
                                                src={imageSrc}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold text-slate-900 truncate">
                                                {clinicName}
                                            </div>
                                            <div className="text-[10px] text-primary font-medium flex items-center gap-1">
                                                <span>View public site</span>
                                                <ExternalLink className="w-2.5 h-2.5" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dark mode preview */}
                                    <div className="h-16 px-4 bg-slate-900 border border-white/10 rounded-xl flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                            <img
                                                src={imageSrc}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold text-white truncate">
                                                {clinicName}
                                            </div>
                                            <div className="text-[10px] text-primary-400 font-medium flex items-center gap-1">
                                                <span>View public site</span>
                                                <ExternalLink className="w-2.5 h-2.5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Avatar / Doctor Context Preview */}
                            {!isLogo && (
                                <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/10">
                                    <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-primary/30 shrink-0">
                                        <img
                                            src={imageSrc}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {type === 'doctor' ? 'Dr. Consultant' : 'Thanarasan S.'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                            {type === 'doctor' ? 'MBBS, MD • General Physician' : 'Clinic Administrator'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200/70 dark:border-white/10">
                    <div>
                        {currentImageUrl && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={deleting || submitting}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1.5"
                            >
                                {deleting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                                <span>Remove {isLogo ? 'Logo' : 'Photo'}</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!imageSrc || submitting}
                            className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-600 text-white disabled:opacity-50 transition-all shadow-sm shadow-primary/25 flex items-center gap-1.5"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Processing & Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Save & Apply</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
