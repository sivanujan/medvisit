import React, { FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { User, Mail, Lock, UserPlus, ArrowLeft } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';
import {
    GlassLabel,
    GlassInput,
    GlassError,
} from '@/Components/UI/FormControls';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Create Account" />

            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Get Started with MedVisit
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Set up your healthcare administrator account.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <GlassLabel htmlFor="name" required>
                        Full Name
                    </GlassLabel>
                    <GlassInput
                        id="name"
                        name="name"
                        value={data.name}
                        placeholder="Dr. Samantha Perera"
                        icon={<User className="w-4 h-4" />}
                        error={!!errors.name}
                        autoComplete="name"
                        autoFocus
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                    <GlassError message={errors.name} />
                </div>

                <div>
                    <GlassLabel htmlFor="email" required>
                        Work Email
                    </GlassLabel>
                    <GlassInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        placeholder="admin@yourclinic.lk"
                        icon={<Mail className="w-4 h-4" />}
                        error={!!errors.email}
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                    <GlassError message={errors.email} />
                </div>

                <div>
                    <GlassLabel htmlFor="password" required>
                        Password
                    </GlassLabel>
                    <GlassInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        placeholder="••••••••••••"
                        icon={<Lock className="w-4 h-4" />}
                        error={!!errors.password}
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <GlassError message={errors.password} />
                </div>

                <div>
                    <GlassLabel htmlFor="password_confirmation" required>
                        Confirm Password
                    </GlassLabel>
                    <GlassInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        placeholder="••••••••••••"
                        icon={<Lock className="w-4 h-4" />}
                        error={!!errors.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                    <GlassError message={errors.password_confirmation} />
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>{processing ? 'Creating account...' : 'Create Account'}</span>
                </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200/70 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
                Already registered?{' '}
                <Link
                    href={route('login')}
                    className="font-bold text-primary hover:text-primary-600 dark:hover:text-primary-300 inline-flex items-center gap-1"
                >
                    <span>Sign In</span>
                </Link>
            </div>
        </GuestLayout>
    );
}
