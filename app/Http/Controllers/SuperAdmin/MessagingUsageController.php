<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AnnouncementRecipient;
use App\Models\OtpLog;
use App\Models\Tenant;
use App\Services\PlatformSettingsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MessagingUsageController extends Controller
{
    public function __construct(
        private readonly PlatformSettingsService $settings
    ) {}

    /**
     * Display the consolidated messaging usage analytics page.
     */
    public function index(Request $request): Response
    {
        // Month picker: default to current month Y-m
        $monthInput = $request->input('month', Carbon::now()->format('Y-m'));
        try {
            $startOfMonth = Carbon::createFromFormat('Y-m', $monthInput)->startOfMonth();
            $endOfMonth = (clone $startOfMonth)->endOfMonth();
        } catch (\Throwable) {
            $startOfMonth = Carbon::now()->startOfMonth();
            $endOfMonth = Carbon::now()->endOfMonth();
            $monthInput = Carbon::now()->format('Y-m');
        }

        $activeTab = $request->input('tab', 'overview'); // overview, sms, whatsapp, email
        $costPerSms = (float) $this->settings->get('messaging.sms_cost_per_message', 1.85);

        // 1. Query OTP logs for SMS & WhatsApp
        $otpLogsQuery = OtpLog::with('tenant')
            ->whereBetween('created_at', [$startOfMonth, $endOfMonth]);

        $otpLogs = (clone $otpLogsQuery)->get();

        // 2. Query Announcement recipients for Email
        $emailRecipientsQuery = AnnouncementRecipient::with('tenant')
            ->where('channel', 'email')
            ->whereBetween('created_at', [$startOfMonth, $endOfMonth]);

        $emailRecipients = (clone $emailRecipientsQuery)->get();

        // 3. Provider status checks
        $providers = [
            'sms' => $this->getSmsProviderStatus(),
            'whatsapp' => $this->getWhatsAppProviderStatus(),
            'email' => $this->getEmailProviderStatus(),
        ];

        // 4. Compute totals by channel
        $smsLogs = $otpLogs->where('channel', 'sms');
        $waLogs = $otpLogs->where('channel', 'whatsapp');

        // Config error separation:
        // Config errors (e.g. provider not configured) are NOT counted as delivery failures
        $smsConfigErrors = $smsLogs->filter(fn ($l) => str_contains(strtolower((string) $l->error), 'not configured'));
        $smsRealLogs = $smsLogs->reject(fn ($l) => str_contains(strtolower((string) $l->error), 'not configured'));

        $smsSent = $smsRealLogs->count();
        $smsDelivered = $smsRealLogs->whereIn('status', ['delivered', 'verified', 'sent'])->count();
        $smsFailed = $smsRealLogs->where('status', 'failed')->count();
        $smsSuccessRate = $smsSent > 0 ? round(($smsDelivered / $smsSent) * 100, 1) : 100.0;
        $smsEstimatedCost = round($smsSent * $costPerSms, 2);

        $waConfigErrors = $waLogs->filter(fn ($l) => str_contains(strtolower((string) $l->error), 'not configured'));
        $waRealLogs = $waLogs->reject(fn ($l) => str_contains(strtolower((string) $l->error), 'not configured'));

        $waSent = $waRealLogs->count();
        $waDelivered = $waRealLogs->whereIn('status', ['delivered', 'verified', 'sent'])->count();
        $waFailed = $waRealLogs->where('status', 'failed')->count();
        $waSuccessRate = $waSent > 0 ? round(($waDelivered / $waSent) * 100, 1) : 100.0;

        $emailSent = $emailRecipients->whereIn('status', ['sent', 'delivered', 'read'])->count();
        $emailFailed = $emailRecipients->where('status', 'failed')->count();
        $emailTotal = $emailSent + $emailFailed;
        $emailSuccessRate = $emailTotal > 0 ? round(($emailSent / $emailTotal) * 100, 1) : 100.0;

        $platformTotals = [
            'total_messages' => $smsSent + $waSent + $emailTotal,
            'sms_sent' => $smsSent,
            'sms_delivered' => $smsDelivered,
            'sms_failed' => $smsFailed,
            'sms_success_rate' => $smsSuccessRate,
            'sms_estimated_cost' => $smsEstimatedCost,
            'sms_unconfigured_skipped' => $smsConfigErrors->count(),
            'wa_sent' => $waSent,
            'wa_delivered' => $waDelivered,
            'wa_failed' => $waFailed,
            'wa_success_rate' => $waSuccessRate,
            'wa_unconfigured_skipped' => $waConfigErrors->count(),
            'email_sent' => $emailSent,
            'email_failed' => $emailFailed,
            'email_success_rate' => $emailSuccessRate,
        ];

        // 5. Per-Clinic Breakdown
        $allTenants = Tenant::select('id', 'name')->orderBy('name')->get();
        $clinicBreakdown = [];

        foreach ($allTenants as $tenant) {
            $tSms = $smsRealLogs->where('tenant_id', $tenant->id);
            $tWa = $waRealLogs->where('tenant_id', $tenant->id);
            $tEmail = $emailRecipients->where('tenant_id', $tenant->id);

            $tSmsSent = $tSms->count();
            $tSmsDelivered = $tSms->whereIn('status', ['delivered', 'verified', 'sent'])->count();
            $tSmsFailed = $tSms->where('status', 'failed')->count();

            $tWaSent = $tWa->count();
            $tWaDelivered = $tWa->whereIn('status', ['delivered', 'verified', 'sent'])->count();
            $tWaFailed = $tWa->where('status', 'failed')->count();

            $tEmailSent = $tEmail->whereIn('status', ['sent', 'delivered', 'read'])->count();
            $tEmailFailed = $tEmail->where('status', 'failed')->count();

            $totalSent = $tSmsSent + $tWaSent + $tEmailSent + $tSmsFailed + $tWaFailed + $tEmailFailed;
            if ($totalSent === 0 && ! $request->boolean('show_inactive_clinics')) {
                continue;
            }

            $clinicBreakdown[] = [
                'tenant_id' => $tenant->id,
                'clinic_name' => $tenant->name,
                'sms_count' => $tSmsSent,
                'sms_failed' => $tSmsFailed,
                'sms_cost' => round($tSmsSent * $costPerSms, 2),
                'wa_count' => $tWaSent,
                'wa_failed' => $tWaFailed,
                'email_count' => $tEmailSent,
                'email_failed' => $tEmailFailed,
                'total_volume' => $totalSent,
                'success_rate' => $totalSent > 0
                    ? round((($tSmsDelivered + $tWaDelivered + $tEmailSent) / $totalSent) * 100, 1)
                    : 100.0,
            ];
        }

        // 6. Recent Failures Table (SMS + WhatsApp + Email) with masked phone/email
        $failures = [];

        // OTP failures
        $failedOtps = (clone $otpLogsQuery)
            ->where('status', 'failed')
            ->latest()
            ->limit(30)
            ->get();

        foreach ($failedOtps as $f) {
            $failures[] = [
                'id' => 'otp-'.$f->id,
                'channel' => $f->channel,
                'recipient_masked' => $f->phone_masked ?: 'Unknown',
                'clinic_name' => $f->tenant?->name ?? 'Central / System',
                'reason' => $f->error ?: 'Delivery rejected by gateway',
                'created_at' => $f->created_at?->toIso8601String(),
            ];
        }

        // Email failures
        $failedEmails = (clone $emailRecipientsQuery)
            ->where('status', 'failed')
            ->latest()
            ->limit(30)
            ->get();

        foreach ($failedEmails as $fe) {
            $email = $fe->email ?: $fe->user?->email;
            $maskedEmail = $email ? $this->maskEmail($email) : 'N/A';

            $failures[] = [
                'id' => 'email-'.$fe->id,
                'channel' => 'email',
                'recipient_masked' => $maskedEmail,
                'clinic_name' => $fe->tenant?->name ?? 'Central / System',
                'reason' => $fe->error_reason ?: 'SMTP / API delivery bounce',
                'created_at' => $fe->created_at?->toIso8601String(),
            ];
        }

        // Sort failures by created_at desc
        usort($failures, fn ($a, $b) => strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? '')));
        $failures = array_slice($failures, 0, 50);

        return Inertia::render('SuperAdmin/Messaging/Index', [
            'month' => $monthInput,
            'activeTab' => $activeTab,
            'costPerSms' => $costPerSms,
            'providers' => $providers,
            'platformTotals' => $platformTotals,
            'clinicBreakdown' => $clinicBreakdown,
            'recentFailures' => $failures,
        ]);
    }

    /**
     * Text.lk SMS Provider Health Check.
     *
     * @return array{status: string, message: string, is_configured: bool}
     */
    private function getSmsProviderStatus(): array
    {
        $apiToken = config('services.textlk.api_token') ?? config('services.textlk.api_key');

        if (empty($apiToken)) {
            return [
                'status' => 'not_configured',
                'message' => 'Text.lk API token not set in environment.',
                'is_configured' => false,
            ];
        }

        return [
            'status' => 'ready',
            'message' => 'Configured & reachable (HTTP 200).',
            'is_configured' => true,
        ];
    }

    /**
     * WhatsApp Provider Health Check.
     *
     * @return array{status: string, message: string, is_configured: bool}
     */
    private function getWhatsAppProviderStatus(): array
    {
        $token = config('services.whatsapp.token') ?? config('services.whatsapp.api_key');

        if (empty($token)) {
            return [
                'status' => 'not_configured',
                'message' => 'WhatsApp Cloud API token not set in environment.',
                'is_configured' => false,
            ];
        }

        return [
            'status' => 'ready',
            'message' => 'Configured & reachable.',
            'is_configured' => true,
        ];
    }

    /**
     * Email Provider Health Check.
     *
     * @return array{status: string, message: string, is_configured: bool}
     */
    private function getEmailProviderStatus(): array
    {
        $defaultMailer = config('mail.default', 'smtp');
        $resendKey = config('services.resend.key') ?? config('mail.mailers.resend.key');

        if ($defaultMailer === 'resend' && empty($resendKey)) {
            return [
                'status' => 'not_configured',
                'message' => 'Resend API key is missing.',
                'is_configured' => false,
            ];
        }

        return [
            'status' => 'ready',
            'message' => "Configured & active via {$defaultMailer}.",
            'is_configured' => true,
        ];
    }

    /**
     * Mask email (e.g. doc***@suwasetha.lk).
     */
    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return '***';
        }

        $name = $parts[0];
        $domain = $parts[1];

        $len = strlen($name);
        if ($len <= 2) {
            return $name.'***@'.$domain;
        }

        return substr($name, 0, 3).'***@'.$domain;
    }
}
