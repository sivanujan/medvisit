import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Lock, Mail } from 'lucide-react';
import ClinicAuthLayout, { ClinicBranding, inOrder } from '@/Components/ClinicAuth/ClinicAuthLayout';
import { AuthField, AuthSubmit } from '@/Components/ClinicAuth/AuthControls';

interface Props {
    token: string;
    email: string;
    tenant?: ClinicBranding;
}

export default function ResetPassword({ token, email, tenant }: Props) {
    return tenant ? (
        <ClinicResetPassword token={token} email={email} clinic={tenant} />
    ) : (
        <CentralResetPassword token={token} email={email} />
    );
}

/** Clinic subdomain version; posts to the tenant-scoped route. */
function ClinicResetPassword({ token, email, clinic }: { token: string; email: string; clinic: ClinicBranding }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/reset-password', {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <ClinicAuthLayout
            clinic={clinic}
            tv="still"
            pageTitle="Choose a new password"
            title="Choose a new password"
            subtitle={`You'll use it to sign in to ${clinic.name}.`}
        >
            <form onSubmit={submit} noValidate className="space-y-5">
                <AuthField
                    id="email"
                    label="Email"
                    icon={Mail}
                    type="email"
                    name="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    autoComplete="username"
                    error={errors.email}
                    wrapperStyle={inOrder(3)}
                />
                <AuthField
                    id="password"
                    label="New password"
                    icon={Lock}
                    type="password"
                    name="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    revealable
                    error={errors.password}
                    wrapperStyle={inOrder(4)}
                />
                <AuthField
                    id="password_confirmation"
                    label="Confirm new password"
                    icon={Lock}
                    type="password"
                    name="password_confirmation"
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    autoComplete="new-password"
                    revealable
                    error={errors.password_confirmation}
                    wrapperStyle={inOrder(5)}
                />
                <AuthSubmit busy={processing} busyLabel="Saving…" style={inOrder(6)}>
                    Save new password
                </AuthSubmit>
            </form>
            <p className="ca-in mt-6 text-sm text-[color:var(--ca-muted)]" style={inOrder(7)}>
                <Link
                    href="/login"
                    className="rounded font-medium text-primary-700 hover:underline dark:text-primary-300"
                >
                    Back to sign in
                </Link>
            </p>
        </ClinicAuthLayout>
    );
}

function CentralResetPassword({ token, email }: { token: string; email: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        isFocused={true}
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password_confirmation" value="Confirm Password" />

                    <TextInput
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                    />

                    <InputError message={errors.password_confirmation} className="mt-2" />
                </div>

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton className="ms-4" disabled={processing}>
                        Reset Password
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
