import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/UI/PageHeader';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout>
            <Head title="My Profile" />

            <div className="space-y-6">
                <PageHeader
                    title="My Profile"
                    subtitle="Manage your personal account details, security credentials, and login access."
                />

                <div className="space-y-6 max-w-4xl">
                    <div className="p-6 sm:p-8 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="p-6 sm:p-8 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="p-6 sm:p-8 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
