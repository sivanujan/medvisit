import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Camera, Trash2, Upload, User as UserIcon } from 'lucide-react';
import ImageUploaderModal from '@/Components/Media/ImageUploaderModal';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user;
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(
        (user as any).avatar_url || null
    );

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Profile Information
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Update your account's profile photo, display name, and email address.
                </p>
            </header>

            {/* Profile Avatar Section */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-white dark:border-slate-800">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={user.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            userInitial
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-white hover:bg-primary-600 shadow-md transition-transform hover:scale-110 focus:outline-none"
                        title="Change profile photo"
                    >
                        <Camera className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        Profile Avatar
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Shown in the top-bar user menu, staff lists, and clinic audit trails. PNG, JPEG or WebP up to 5 MB.
                    </p>
                    <div className="flex items-center gap-2 mt-2.5">
                        <button
                            type="button"
                            onClick={() => setIsAvatarModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs shadow-sm shadow-primary/25 transition-all"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                        </button>
                        {avatarUrl && (
                            <button
                                type="button"
                                onClick={() => setIsAvatarModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-semibold text-xs transition-all"
                            >
                                <span>Manage / Remove</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div>
                    <InputLabel htmlFor="name" value="Name" />

                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />

                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError className="mt-2" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-gray-800">
                            Your email address is unverified.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-600">
                                A new verification link has been sent to your
                                email address.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Save</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-gray-600">
                            Saved.
                        </p>
                    </Transition>
                </div>
            </form>

            <ImageUploaderModal
                isOpen={isAvatarModalOpen}
                onClose={() => setIsAvatarModalOpen(false)}
                type="avatar"
                currentImageUrl={avatarUrl}
                uploadEndpoint="/profile/avatar"
                deleteEndpoint="/profile/avatar"
                title="Profile Photo"
                subtitle="Upload from device or paste an image link. Stored securely and optimized as WebP for fast loading."
                fallbackInitial={userInitial}
                onSuccess={(data) => {
                    if (data.avatar_url) {
                        setAvatarUrl(data.avatar_url);
                        router.reload({ only: ['auth'] });
                    }
                }}
                onRemove={() => {
                    setAvatarUrl(null);
                    router.reload({ only: ['auth'] });
                }}
            />
        </section>
    );
}
