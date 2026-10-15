import React, { FormEventHandler } from 'react';
import { Head, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import { CheckCircle2, ShieldCheck, Lock, User } from 'lucide-react';

interface Props {
    invitation: {
        token: string;
        name: string;
        email: string;
        role: string;
        role_label: string;
    };
    clinicName: string;
}

export default function AcceptInvitation({ invitation, clinicName }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: invitation.name,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(`/invitation/accept/${invitation.token}`);
    };

    return (
        <GuestLayout>
            <Head title={`Join ${clinicName} - MedVisit`} />

            <div className="space-y-6">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary border border-primary-200 dark:border-primary-800/40 mb-3 shadow-md shadow-primary/10">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        Join {clinicName}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        You have been invited to join the clinical management team as a{' '}
                        <strong className="text-primary font-bold">{invitation.role_label}</strong>. Set your password to activate your account.
                    </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Invited Email</span>
                        <span className="font-bold text-slate-900 dark:text-white">{invitation.email}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                        {invitation.role_label}
                    </span>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <InputLabel htmlFor="name" value="Your Full Name" />
                        <TextInput
                            id="name"
                            type="text"
                            name="name"
                            value={data.name}
                            className="mt-1 block w-full text-xs"
                            autoComplete="name"
                            isFocused={true}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                        <InputError message={errors.name} className="mt-1 text-xs" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="Choose Password" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full text-xs"
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            required
                        />
                        <InputError message={errors.password} className="mt-1 text-xs" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirm Password" />
                        <TextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="mt-1 block w-full text-xs"
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            required
                        />
                        <InputError message={errors.password_confirmation} className="mt-1 text-xs" />
                    </div>

                    <PrimaryButton
                        className="w-full justify-center py-2.5 text-xs font-bold shadow-md shadow-primary/20"
                        disabled={processing}
                    >
                        {processing ? 'Activating Account...' : 'Set Password & Enter Workspace'}
                    </PrimaryButton>
                </form>
            </div>
        </GuestLayout>
    );
}
