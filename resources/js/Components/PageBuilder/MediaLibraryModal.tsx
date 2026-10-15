import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    UploadCloud,
    Image as ImageIcon,
    Check,
    Trash2,
    Edit3,
    Search,
    X,
    Link as LinkIcon,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Copy,
    ExternalLink,
    ArrowUpDown,
    Info,
    Eye,
    Sparkles,
} from 'lucide-react';

export interface MediaAsset {
    id: number;
    src: string;
    url?: string;
    filename: string;
    name: string;
    alt?: string;
    size?: number;
    size_formatted?: string;
    dimensions?: string | null;
    updated_at?: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string, asset?: MediaAsset) => void;
    currentValue?: string;
    title?: string;
    tenant?: {
        id?: string;
        name?: string;
    };
}

export default function MediaLibraryModal({
    isOpen,
    onClose,
    onSelect,
    currentValue = '',
    title = 'Clinic Media Library',
    tenant = {},
}: Props) {
    const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'url'>('library');
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
    const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

    // Upload state
    const [uploadQueue, setUploadQueue] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // URL input state
    const [urlInput, setUrlInput] = useState('');
    const [urlNameInput, setUrlNameInput] = useState('');
    const [urlPreviewError, setUrlPreviewError] = useState(false);

    // Rename & details state
    const [editingName, setEditingName] = useState('');
    const [editingAlt, setEditingAlt] = useState('');
    const [savingMeta, setSavingMeta] = useState(false);
    const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<MediaAsset | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);

    // Fetch assets from backend
    const fetchAssets = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/website/builder/media');
            const data = await res.json();
            if (res.ok && data.assets) {
                setAssets(data.assets);
                if (currentValue) {
                    const match = data.assets.find((a: MediaAsset) => a.src === currentValue || a.url === currentValue);
                    if (match) setSelectedAsset(match);
                }
            } else {
                setError(data.error || 'Failed to load media assets.');
            }
        } catch (err) {
            console.error('Error fetching assets:', err);
            setError('Could not connect to media library service.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAssets();
            setActiveTab('library');
            setDeleteConfirmAsset(null);
            setUrlInput('');
            setUrlNameInput('');
            setUrlPreviewError(false);
        } else {
            setSelectedAsset(null);
            setUploadQueue([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                if (deleteConfirmAsset) {
                    setDeleteConfirmAsset(null);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, deleteConfirmAsset, onClose]);

    useEffect(() => {
        if (selectedAsset) {
            setEditingName(selectedAsset.name || '');
            setEditingAlt(selectedAsset.alt || '');
            setCopiedUrl(false);
        }
    }, [selectedAsset]);

    // Filter and sort assets
    const filteredAssets = useMemo(() => {
        let result = [...assets];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (a) =>
                    a.name?.toLowerCase().includes(q) ||
                    a.filename?.toLowerCase().includes(q) ||
                    a.alt?.toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => {
            if (sortBy === 'newest') return (b.updated_at || 0) - (a.updated_at || 0);
            if (sortBy === 'oldest') return (a.updated_at || 0) - (b.updated_at || 0);
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
            return 0;
        });
        return result;
    }, [assets, searchQuery, sortBy]);

    // Handle Upload
    const handleFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const validFiles = Array.from(files).filter((file) =>
            ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'].includes(file.type)
        );
        if (validFiles.length === 0) {
            setError('Please select valid image files (JPG, PNG, WebP, SVG, GIF).');
            return;
        }
        setUploadQueue((prev) => [...prev, ...validFiles]);
    };

    const performUpload = async () => {
        if (uploadQueue.length === 0) return;
        setUploading(true);
        setError(null);

        const formData = new FormData();
        uploadQueue.forEach((file) => formData.append('files[]', file));

        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

            const res = await fetch('/website/builder/media/upload', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                setUploadQueue([]);
                await fetchAssets();
                setActiveTab('library');
                if (data.assets && data.assets.length > 0) {
                    setSelectedAsset(data.assets[0]);
                }
            } else {
                setError(data.error || data.message || 'Upload failed. Check file types and sizes.');
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError('An error occurred while uploading. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // Handle Direct URL Submission
    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!urlInput.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

            const res = await fetch('/website/builder/media/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    url: urlInput.trim(),
                    name: urlNameInput.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (res.ok && data.ok && data.asset) {
                await fetchAssets();
                setSelectedAsset(data.asset);
                setActiveTab('library');
            } else {
                setError(data.error || 'Failed to save URL asset.');
            }
        } catch (err) {
            setError('Failed to link image URL.');
        } finally {
            setLoading(false);
        }
    };

    // Handle Delete
    const handleDelete = async (asset: MediaAsset) => {
        setDeleting(true);
        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

            const res = await fetch(`/website/builder/media/${asset.id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                setAssets((prev) => prev.filter((a) => a.id !== asset.id));
                if (selectedAsset?.id === asset.id) {
                    setSelectedAsset(null);
                }
                setDeleteConfirmAsset(null);
            } else {
                setError(data.error || 'Failed to delete asset.');
            }
        } catch (err) {
            setError('An error occurred while deleting asset.');
        } finally {
            setDeleting(false);
        }
    };

    // Handle Save Metadata
    const handleSaveMeta = async () => {
        if (!selectedAsset) return;
        setSavingMeta(true);
        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

            const res = await fetch(`/website/builder/media/${selectedAsset.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    name: editingName,
                    alt_text: editingAlt,
                }),
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                setAssets((prev) =>
                    prev.map((a) =>
                        a.id === selectedAsset.id
                            ? { ...a, name: editingName, alt: editingAlt }
                            : a
                    )
                );
                setSelectedAsset((prev) =>
                    prev ? { ...prev, name: editingName, alt: editingAlt } : null
                );
            }
        } catch (err) {
            console.error('Error saving meta:', err);
        } finally {
            setSavingMeta(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
            <div
                className="w-full max-w-5xl h-[85vh] max-h-[820px] bg-white dark:bg-[#0f1117] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between flex-shrink-0 bg-slate-50/70 dark:bg-[#141721]/70">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {title}
                                {tenant.name && (
                                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                        • {tenant.name}
                                    </span>
                                )}
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Select or upload branded photos, medical facility logos, and specialist banners.
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-[#1a1e2b] p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('library')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'library'
                                    ? 'bg-white dark:bg-teal-600 text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Media Library ({assets.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('upload')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'upload'
                                    ? 'bg-white dark:bg-teal-600 text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Upload Files
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('url')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'url'
                                    ? 'bg-white dark:bg-teal-600 text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Direct URL
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                        title="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Area */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0f1117]">
                        {/* Error Alert */}
                        {error && (
                            <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setError(null)}
                                    className="text-rose-400 hover:text-rose-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {/* TAB 1: Library */}
                        {activeTab === 'library' && (
                            <>
                                {/* Search & Sort Controls */}
                                <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#12141c]/50">
                                    <div className="relative flex-1 min-w-[200px] max-w-md">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search media by filename, alt text..."
                                            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-white dark:bg-[#1a1e2b] text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-teal-500"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <ArrowUpDown className="w-3 h-3" /> Sort:
                                        </span>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as any)}
                                            className="text-xs rounded-lg py-1 px-2.5 bg-white dark:bg-[#1a1e2b] border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 font-medium"
                                        >
                                            <option value="newest">Newest First</option>
                                            <option value="oldest">Oldest First</option>
                                            <option value="name">Name (A-Z)</option>
                                            <option value="size">File Size</option>
                                        </select>

                                        <button
                                            type="button"
                                            onClick={fetchAssets}
                                            className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                            title="Refresh assets"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Asset Grid */}
                                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                    {loading && assets.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                                            <p className="text-xs">Loading clinic media...</p>
                                        </div>
                                    ) : filteredAssets.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                            <ImageIcon className="w-12 h-12 stroke-1 text-slate-300 dark:text-slate-600 mb-3" />
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                {searchQuery ? 'No matching images found' : 'No images in media library'}
                                            </p>
                                            <p className="text-xs text-slate-400 max-w-sm mt-1">
                                                {searchQuery
                                                    ? 'Try searching for different keywords or clear the filter.'
                                                    : 'Upload your clinic facade, doctor portraits, or consultation room photos.'}
                                            </p>
                                            {!searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('upload')}
                                                    className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <UploadCloud className="w-3.5 h-3.5" />
                                                    Upload First Photo
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {filteredAssets.map((asset) => {
                                                const isSelected = selectedAsset?.id === asset.id;
                                                return (
                                                    <div
                                                        key={asset.id}
                                                        onClick={() => setSelectedAsset(asset)}
                                                        onDoubleClick={() => {
                                                            onSelect(asset.src || asset.url || '', asset);
                                                            onClose();
                                                        }}
                                                        className={`group relative rounded-xl overflow-hidden border cursor-pointer aspect-square bg-slate-100 dark:bg-[#161924] transition-all duration-150 ${
                                                            isSelected
                                                                ? 'border-teal-500 ring-2 ring-teal-500/30 shadow-md'
                                                                : 'border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'
                                                        }`}
                                                    >
                                                        <img
                                                            src={asset.src || asset.url}
                                                            alt={asset.alt || asset.name}
                                                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                            loading="lazy"
                                                        />

                                                        {/* Selected Badge */}
                                                        {isSelected && (
                                                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-md">
                                                                <Check className="w-3 h-3 stroke-[3]" />
                                                            </div>
                                                        )}

                                                        {/* Info overlay on hover */}
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <p className="text-[11px] font-bold truncate">
                                                                {asset.name || asset.filename}
                                                            </p>
                                                            {asset.size_formatted && (
                                                                <p className="text-[9px] text-slate-300">
                                                                    {asset.size_formatted}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* TAB 2: Upload Files */}
                        {activeTab === 'upload' && (
                            <div className="flex-1 p-6 flex flex-col items-center justify-center">
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        handleFiles(e.dataTransfer.files);
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`w-full max-w-xl p-10 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                                        isDragging
                                            ? 'border-teal-500 bg-teal-500/10'
                                            : 'border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141721] hover:border-teal-400'
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
                                        className="hidden"
                                        onChange={(e) => handleFiles(e.target.files)}
                                    />
                                    <div className="w-14 h-14 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                                        <UploadCloud className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Drag & drop images here, or click to browse
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                                        Supports JPG, PNG, WebP, SVG, and GIF up to 5MB each.
                                    </p>
                                </div>

                                {/* Queued Files */}
                                {uploadQueue.length > 0 && (
                                    <div className="w-full max-w-xl mt-6 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141721]">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                Ready to Upload ({uploadQueue.length} files)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setUploadQueue([])}
                                                className="text-[11px] text-slate-400 hover:text-slate-600"
                                            >
                                                Clear all
                                            </button>
                                        </div>
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto mb-4">
                                            {uploadQueue.map((file, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1a1e2b] text-xs"
                                                >
                                                    <span className="truncate max-w-[320px] font-medium text-slate-700 dark:text-slate-300">
                                                        {file.name}
                                                    </span>
                                                    <span className="text-slate-400 text-[10px]">
                                                        {(file.size / 1024).toFixed(1)} KB
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={performUpload}
                                            disabled={uploading}
                                            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            {uploading ? (
                                                <>
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Uploading to clinic storage...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadCloud className="w-3.5 h-3.5" />
                                                    <span>Start Upload</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: Direct URL */}
                        {activeTab === 'url' && (
                            <form
                                onSubmit={handleUrlSubmit}
                                className="flex-1 p-6 flex flex-col items-center justify-center max-w-lg mx-auto w-full"
                            >
                                <div className="w-full space-y-4">
                                    <div className="text-center mb-2">
                                        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 mx-auto flex items-center justify-center mb-2">
                                            <LinkIcon className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Insert from Web Address
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Use a direct public HTTPS URL for cloud-hosted images or CDN assets.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Image URL (HTTPS) *
                                        </label>
                                        <input
                                            type="url"
                                            required
                                            value={urlInput}
                                            onChange={(e) => {
                                                setUrlInput(e.target.value);
                                                setUrlPreviewError(false);
                                            }}
                                            placeholder="https://images.unsplash.com/photo-..."
                                            className="w-full text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#1a1e2b] px-3 py-2 text-slate-900 dark:text-slate-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Image Name / Label
                                        </label>
                                        <input
                                            type="text"
                                            value={urlNameInput}
                                            onChange={(e) => setUrlNameInput(e.target.value)}
                                            placeholder="e.g. Modern Consultation Suite"
                                            className="w-full text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#1a1e2b] px-3 py-2 text-slate-900 dark:text-slate-100"
                                        />
                                    </div>

                                    {urlInput && !urlPreviewError && (
                                        <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161924]">
                                            <span className="text-[10px] font-bold text-slate-400 block mb-1">
                                                URL Preview
                                            </span>
                                            <img
                                                src={urlInput}
                                                alt="Preview"
                                                onError={() => setUrlPreviewError(true)}
                                                className="max-h-40 rounded-lg mx-auto object-contain"
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || !urlInput.trim()}
                                        className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>Link &amp; Add to Library</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Right Details Panel (when asset selected in Library) */}
                    {activeTab === 'library' && (
                        <aside className="w-full md:w-72 border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#12141c]/70 p-4 flex flex-col justify-between overflow-y-auto flex-shrink-0">
                            {selectedAsset ? (
                                <div className="space-y-4">
                                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-[#1c202d] border border-slate-200 dark:border-white/10 relative">
                                        <img
                                            src={selectedAsset.src || selectedAsset.url}
                                            alt={selectedAsset.name}
                                            className="w-full h-full object-contain p-1"
                                        />
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                Label / Title
                                            </label>
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onBlur={handleSaveMeta}
                                                className="w-full text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1e2b] px-2 py-1 font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                Alt Text (Accessibility)
                                            </label>
                                            <input
                                                type="text"
                                                value={editingAlt}
                                                onChange={(e) => setEditingAlt(e.target.value)}
                                                onBlur={handleSaveMeta}
                                                placeholder="Describe image..."
                                                className="w-full text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1e2b] px-2 py-1"
                                            />
                                        </div>

                                        <div className="p-2.5 rounded-lg bg-white dark:bg-[#1a1e2b] border border-slate-200 dark:border-white/10 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                                            {selectedAsset.dimensions && (
                                                <div className="flex justify-between">
                                                    <span>Dimensions:</span>
                                                    <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">
                                                        {selectedAsset.dimensions}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedAsset.size_formatted && (
                                                <div className="flex justify-between">
                                                    <span>Size:</span>
                                                    <span className="font-mono text-slate-700 dark:text-slate-200">
                                                        {selectedAsset.size_formatted}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(
                                                        selectedAsset.src || selectedAsset.url || ''
                                                    );
                                                    setCopiedUrl(true);
                                                    setTimeout(() => setCopiedUrl(false), 2000);
                                                }}
                                                className="flex-1 py-1 px-2 rounded-lg border border-slate-300 dark:border-white/10 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-white dark:hover:bg-slate-800"
                                            >
                                                {copiedUrl ? (
                                                    <>
                                                        <Check className="w-3 h-3 text-emerald-500" />
                                                        <span>Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3 h-3" />
                                                        <span>Copy URL</span>
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setDeleteConfirmAsset(selectedAsset)}
                                                className="p-1.5 rounded-lg border border-rose-300 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                title="Delete image"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                                    <Info className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600 mb-2" />
                                    <p className="text-xs font-medium">Select an image to preview details</p>
                                </div>
                            )}

                            {/* Select / Insert Button */}
                            <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                                <button
                                    type="button"
                                    disabled={!selectedAsset}
                                    onClick={() => {
                                        if (selectedAsset) {
                                            onSelect(
                                                selectedAsset.src || selectedAsset.url || '',
                                                selectedAsset
                                            );
                                            onClose();
                                        }
                                    }}
                                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4 stroke-[2.5]" />
                                    <span>Insert Image</span>
                                </button>
                            </div>
                        </aside>
                    )}
                </div>

                {/* Delete Confirmation Dialog */}
                {deleteConfirmAsset && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                        <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#161922] p-5 shadow-2xl border border-slate-200 dark:border-white/10 text-center space-y-3">
                            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                Delete Image?
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-200">{deleteConfirmAsset.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirmAsset(null)}
                                    className="flex-1 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={deleting}
                                    onClick={() => handleDelete(deleteConfirmAsset)}
                                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {deleting && <RefreshCw className="w-3 h-3 animate-spin" />}
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
