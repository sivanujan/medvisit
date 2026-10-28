import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Sparkles,
    Eye,
    X,
    LogOut,
    ArrowLeft,
    CheckCircle2,
    ShieldCheck,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import { SetupFormData, SetupPageProps } from './types';
import SetupStepper, { WIZARD_STEPS } from './Components/SetupStepper';
import LivePreview from './Components/LivePreview';

// Steps
import StepWelcome from './Components/StepWelcome';
import StepLogoBrand from './Components/StepLogoBrand';
import StepCoverPhoto from './Components/StepCoverPhoto';
import StepLocationContact from './Components/StepLocationContact';
import StepOpeningHours from './Components/StepOpeningHours';
import StepServices from './Components/StepServices';
import StepOnlineBooking from './Components/StepOnlineBooking';
import StepPharmacy from './Components/StepPharmacy';
import StepPrinting from './Components/StepPrinting';
import StepDirectory from './Components/StepDirectory';
import StepCelebration from './Components/StepCelebration';

export default function SetupIndex({
    tenant,
    form: initialForm,
    districts,
    preset_services,
}: SetupPageProps) {
    // Current step (1 = Welcome, 2 = Logo, ..., 10 = Directory, 11 = Celebration)
    const initialStep = Math.max(1, Math.min(11, tenant.setup_step || 1));
    const [currentStep, setCurrentStep] = useState<number>(initialStep);
    const [highestUnlockedStep, setHighestUnlockedStep] = useState<number>(
        Math.max(initialStep, tenant.setup_completed ? 11 : initialStep)
    );

    const [form, setForm] = useState<SetupFormData>(initialForm);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isCompleted, setIsCompleted] = useState<boolean>(tenant.setup_completed);
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

    // Update single field in form state
    const handleChange = <K extends keyof SetupFormData>(field: K, value: SetupFormData[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        // Clear field error
        if (errors[field as string]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field as string];
                return next;
            });
        }
    };

    // Helper to get CSRF token
    const getCsrfToken = () =>
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

    // Save current step to backend
    const handleSaveStep = async (stepId: number, additionalPayload: Record<string, unknown> = {}) => {
        setSaving(true);
        setErrors({});

        let payload: Record<string, unknown> = {};

        switch (stepId) {
            case 1:
                // Welcome
                payload = {};
                break;
            case 2:
                // Logo & Brand
                payload = {
                    brand_color: form.brand_color,
                    theme: form.theme,
                    use_initials: form.use_initials,
                };
                break;
            case 3:
                // Cover Photo
                payload = {
                    cover_photo_url: form.cover_photo_url || null,
                    skipped: additionalPayload.skipped || false,
                };
                break;
            case 4:
                // Location & Contact
                payload = {
                    address_line: form.address_line,
                    city: form.city,
                    district: form.district,
                    postal_code: form.postal_code,
                    latitude: form.latitude,
                    longitude: form.longitude,
                    phone: form.phone,
                    whatsapp: form.whatsapp,
                    email: form.email,
                };
                break;
            case 5:
                // Opening Hours
                payload = {
                    opening_hours: form.opening_hours,
                    opening_hours_note: form.opening_hours_note,
                };
                break;
            case 6:
                // Services
                payload = {
                    services: form.services,
                };
                break;
            case 7:
                // Online Booking
                payload = {
                    online_booking_enabled: form.online_booking_enabled,
                    max_active_tokens_per_phone: form.max_active_tokens_per_phone,
                    require_staff_approval: form.require_staff_approval,
                    require_phone_verification: form.require_phone_verification,
                };
                break;
            case 8:
                // Pharmacy (Guaranteed false if tenant plan does not allow pharmacy)
                payload = {
                    pharmacy_enabled: tenant.plan_allows_pharmacy ? Boolean(form.pharmacy_enabled) : false,
                    stock_reduction_mode: form.stock_reduction_mode,
                };
                break;
            case 9:
                // Printing
                payload = {
                    print_enabled: form.print_enabled,
                    receipt_format: form.print_receipt_format,
                    receipt_prefix: form.receipt_prefix,
                    token_slip_enabled: form.print_token_slip_enabled,
                    token_slip_autoprint: form.print_token_slip_autoprint,
                    prescription_print_enabled: form.prescription_print_enabled,
                    prescription_print_language: form.prescription_print_language,
                    prescription_paper_size: form.prescription_paper_size,
                    print_header_show_logo: form.print_header_show_logo,
                    print_header_show_address: form.print_header_show_address,
                    registration_number: form.registration_number,
                };
                break;
            case 10:
                // Directory
                payload = {
                    directory_enabled: form.directory_enabled,
                    consent: form.directory_consented,
                };
                break;
            default:
                break;
        }

        try {
            const res = await fetch(`/setup/step/${stepId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.errors) {
                    const mapped: Record<string, string> = {};
                    Object.keys(data.errors).forEach((k) => {
                        mapped[k] = Array.isArray(data.errors[k])
                            ? data.errors[k][0]
                            : data.errors[k];
                    });
                    setErrors(mapped);
                } else {
                    setErrors({ general: data.message || 'Validation error saving step.' });
                }
                setSaving(false);
                return false;
            }

            const next = data.next_step || stepId + 1;
            setCurrentStep(next);
            setHighestUnlockedStep((prev) => Math.max(prev, next));
            setSaving(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return true;
        } catch (err: unknown) {
            setErrors({ general: 'Network error. Please try again.' });
            setSaving(false);
            return false;
        }
    };

    // Complete setup endpoint
    const handleCompleteSetup = async () => {
        setSaving(true);
        setErrors({});

        try {
            const res = await fetch('/setup/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
            });

            const data = await res.json();
            if (!res.ok) {
                setErrors({ general: data.message || 'Could not complete setup.' });
                setSaving(false);
                return;
            }

            setIsCompleted(true);
            setSaving(false);
        } catch (err: unknown) {
            setErrors({ general: 'Network error. Please try again.' });
            setSaving(false);
        }
    };

    // Save & exit handler
    const handleSaveAndExit = () => {
        if (tenant.in_grace || tenant.setup_completed) {
            router.visit('/dashboard');
        } else {
            // New clinic without grace: notify that progress is saved
            alert('Your setup progress has been saved. Please complete the remaining steps to unlock your dashboard.');
        }
    };

    const activeStepDef = WIZARD_STEPS.find((s) => s.id === currentStep) || WIZARD_STEPS[0];

    return (
        <div className="min-h-screen bg-[#F5F8FD] dark:bg-[#08111F] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
            <Head title={`Clinic Setup - ${tenant.name}`} />

            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-8 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Left Branding */}
                    <div className="flex items-center gap-3">
                        <ApplicationLogo className="h-7 w-auto sm:h-8" />
                        <div className="h-5 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight">
                                {tenant.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E6FD9]/10 text-[#1E6FD9] dark:text-[#5c9df4]">
                                {tenant.subdomain}.medvisit.lk
                            </span>
                        </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-3">
                        {/* Mobile Live Preview Trigger */}
                        <button
                            type="button"
                            onClick={() => setMobilePreviewOpen(true)}
                            className="lg:hidden p-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            <Eye className="w-4 h-4 text-[#1E6FD9]" />
                            <span className="hidden xs:inline">Preview</span>
                        </button>

                        <ThemeToggle size="sm" />

                        {/* Save & Exit Button */}
                        <button
                            type="button"
                            onClick={handleSaveAndExit}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200/80 dark:border-white/10 transition-colors cursor-pointer"
                        >
                            {tenant.in_grace || tenant.setup_completed ? 'Exit to dashboard' : 'Save & exit'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Wizard Workspace */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row items-start gap-8">
                    {/* Left Rail: Vertical Stepper */}
                    <SetupStepper
                        currentStep={currentStep}
                        highestUnlockedStep={highestUnlockedStep}
                        onSelectStep={(stepId) => {
                            setCurrentStep(stepId);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        brandColor={form.brand_color}
                    />

                    {/* Center Column: Form Glass Card */}
                    <div className="flex-1 w-full max-w-2xl min-w-0">
                        <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
                            {/* General Error Banner */}
                            {errors.general && (
                                <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                                    {errors.general}
                                </div>
                            )}

                            {/* Render active step */}
                            {currentStep === 1 && (
                                <StepWelcome
                                    tenant={tenant}
                                    onContinue={() => handleSaveStep(1)}
                                    saving={saving}
                                />
                            )}

                            {currentStep === 2 && (
                                <StepLogoBrand
                                    tenant={tenant}
                                    form={form}
                                    onChange={handleChange}
                                    onContinue={() => handleSaveStep(2)}
                                    onBack={() => setCurrentStep(1)}
                                    saving={saving}
                                    errors={errors}
                                />
                            )}

                            {currentStep === 3 && (
                                <StepCoverPhoto
                                    tenant={tenant}
                                    form={form}
                                    onChange={handleChange}
                                    onContinue={(skipped) => handleSaveStep(3, { skipped })}
                                    onBack={() => setCurrentStep(2)}
                                    saving={saving}
                                    errors={errors}
                                />
                            )}

                            {currentStep === 4 && (
                                <StepLocationContact
                                    tenant={tenant}
                                    form={form}
                                    districts={districts}
                                    onChange={handleChange}
                                    onContinue={() => handleSaveStep(4)}
                                    onBack={() => setCurrentStep(3)}
                                    saving={saving}
                                    errors={errors}
                                />
                            )}

                            {currentStep === 5 && (
                                <StepOpeningHours
                                    tenant={tenant}
                                    form={form}
                                    onChange={handleChange}
                                    onContinue={() => handleSaveStep(5)}
                                    onBack={() => setCurrentStep(4)}
                                    saving={saving}
                                    errors={errors}
                                />
                            )}

                            {currentStep === 6 && (
                                <StepServices
                                    tenant={tenant}
                                    form={form}
                                    presetServices={preset_services}
                                    onChange={handleChange}
                                    onContinue={() => handleSaveStep(6)}
                                    onBack={() => setCurrentStep(5)}
                                    saving={saving}
                                    errors={errors}
                                />
                            )}

                            {currentStep === 7 && (
                                <StepOnlineBooking
                                    tenant={tenant}
                                    form={form}
                                    onChange={handleChange}
                                    onContinue={() => handleSaveStep(7)}
                                    onBack={() => setCurrentStep(6)}
                                    saving={saving}
                                    errors={errors}
                                />
                            )}

                            {currentStep === 8 && (
                                <StepPharmacy
                                    tenant={tenant}
                                    form={form}
                                    onChange={handleChange}
                                    onContinue={() => handleSaveStep(8)}
                                    onBack={() => setCurrentStep(7)}
                                    saving={saving}
                                    errors={errors}
                                />
                            )}

                            {currentStep === 9 && (
                                <StepPrinting
                                    tenant={tenant}
                                    form={form}
                                    onChange={handleChange}
                                    onContinue={() => handleSaveStep(9)}
                                    onBack={() => setCurrentStep(8)}
                                    saving={saving}
                                    errors={errors}
                                />
                            )}

                            {currentStep === 10 && (
                                <StepDirectory
                                    tenant={tenant}
                                    form={form}
                                    onChange={handleChange}
                                    onContinue={() => handleSaveStep(10)}
                                    onBack={() => setCurrentStep(9)}
                                    saving={saving}
                                    errors={errors}
                                />
                            )}

                            {currentStep === 11 && (
                                <StepCelebration
                                    tenant={tenant}
                                    form={form}
                                    onComplete={handleCompleteSetup}
                                    onJumpToStep={(stepId) => setCurrentStep(stepId)}
                                    saving={saving}
                                    isCompleted={isCompleted}
                                />
                            )}
                        </div>
                    </div>

                    {/* Right Rail: Desktop Sticky Live Preview */}
                    <div className="hidden lg:block">
                        <LivePreview step={currentStep} tenant={tenant} form={form} />
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Sheet Drawer for Live Preview */}
            {mobilePreviewOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Live preview"
                    className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end p-4 animate-in fade-in"
                >
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-200 dark:border-white/10">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                Live Preview
                            </span>
                            <button
                                type="button"
                                onClick={() => setMobilePreviewOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <LivePreview step={currentStep} tenant={tenant} form={form} />

                        <button
                            type="button"
                            onClick={() => setMobilePreviewOpen(false)}
                            className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold cursor-pointer"
                        >
                            Close preview
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
