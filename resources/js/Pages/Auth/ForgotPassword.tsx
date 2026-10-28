import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Mail } from 'lucide-react';
import ClinicAuthLayout, { ClinicBranding, inOrder } from '@/Components/ClinicAuth/ClinicAuthLayout';
import { AuthAlert, AuthField, AuthSubmit } from '@/Components/ClinicAuth/AuthControls';

interface Props {
    status?: string;
    tenant?: ClinicBranding;
}

export default function ForgotPassword({ status, tenant }: Props) {
    return tenant ? (
        <ClinicForgotPassword status={status} clinic={tenant} />
    ) : (
        <CentralForgotPassword status={status} />
    );
}

/** Clinic subdomain version; posts to the tenant-scoped route. */
function ClinicForgotPassword({ status, clinic }: { status?: string; clinic: ClinicBranding }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/forgot-password');
    };

    return (
        <ClinicAuthLayout
            clinic={clinic}
            tv="still"
            pageTitle="Reset password"
            title="Reset your password"
            subtitle={`Enter the email you use at ${clinic.name}. We'll send you a link to choose a new password.`}
        >
            {status && <AuthAlert tone="success">{status}</AuthAlert>}
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
                    inputMode="email"
                    autoFocus
                    placeholder="you@example.com"
                    error={errors.email}
                    wrapperStyle={inOrder(3)}
                />
                <AuthSubmit busy={processing} busyLabel="Sending link…" style={inOrder(4)}>
                    Email reset link
                </AuthSubmit>
            </form>
            <p className="ca-in mt-6 text-sm text-[color:var(--ca-muted)]" style={inOrder(5)}>
                Remembered it?{' '}
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

function CentralForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <div className="mb-4 text-sm text-gray-600">
                Forgot your password? No problem. Just let us know your email address and we will email you a password
                reset link that will allow you to choose a new one.
            </div>

            {status && <div className="mb-4 text-sm font-medium text-green-600">{status}</div>}

            <form onSubmit={submit}>
                <TextInput
                    id="email"
                    type="email"
                    name="email"
                    value={data.email}
                    className="mt-1 block w-full"
                    isFocused={true}
                    onChange={(e) => setData('email', e.target.value)}
                />

                <InputError message={errors.email} className="mt-2" />

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton className="ms-4" disabled={processing}>
                        Email Password Reset Link
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
