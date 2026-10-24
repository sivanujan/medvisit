<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Cache;

class PlatformSettingsService
{
    public const CACHE_KEY = 'medvisit_platform_settings_all';

    public const DEFAULTS = [
        // General
        'general.platform_name' => 'MedVisit Platform',
        'general.support_email' => 'support@medvisit.lk',
        'general.support_phone' => '+94 11 234 5678',
        'general.support_whatsapp' => '+94 77 123 4567',
        // Signups
        'signups.open' => true,
        'signups.trial_days' => 30,
        'signups.default_plan_slug' => 'starter',
        'signups.require_email_verification' => false,
        // Billing
        'billing.grace_days' => 3,
        'billing.reminder_days' => '7,1',
        'billing.currency' => 'LKR',
        // Messaging
        'messaging.sms_cost_per_message' => 1.85,
        'messaging.otp_channel_order' => ['sms', 'whatsapp'],
        'messaging.sender_name' => 'MedVisit',
        // Security
        'security.enforce_2fa_super_admin' => false,
        'security.session_lifetime_minutes' => 120,
        // Maintenance
        'maintenance.enabled' => false,
        'maintenance.banner_text' => 'MedVisit Platform will undergo routine scheduled maintenance on Sunday from 02:00 to 04:00 AM Colombo time.',
        // Support Chat
        'support.business_hours_days' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        'support.business_hours_start' => '08:30',
        'support.business_hours_end' => '18:00',
        'support.business_hours_timezone' => 'Asia/Colombo',
        'support.offline_message' => 'Our team is currently offline. Please leave your message and email, and we will reply as soon as business hours resume.',
        'support.response_time_text' => 'Usually replies within a few hours',
    ];

    /**
     * Retrieve all platform settings merged with defaults.
     *
     * @return array<string, mixed>
     */
    public function all(): array
    {
        return Cache::remember(self::CACHE_KEY, 3600, function (): array {
            $settings = self::DEFAULTS;

            // In production, enforce_2fa_super_admin defaults to true
            if (config('app.env') === 'production') {
                $settings['security.enforce_2fa_super_admin'] = true;
            }

            $stored = PlatformSetting::all()->pluck('value', 'key')->toArray();

            return array_merge($settings, $stored);
        });
    }

    /**
     * Get a specific setting with an optional fallback.
     */
    public function get(string $key, mixed $default = null): mixed
    {
        $all = $this->all();

        return $all[$key] ?? $default ?? (self::DEFAULTS[$key] ?? null);
    }

    /**
     * Set multiple settings at once, busting cache and logging audit trail.
     *
     * @param  array<string, mixed>  $values
     */
    public function updateMany(array $values, ?int $userId = null): void
    {
        $changes = [];

        foreach ($values as $key => $val) {
            $group = explode('.', $key)[0] ?? 'general';

            $setting = PlatformSetting::firstOrNew(['key' => $key]);
            $oldVal = $setting->value;

            $setting->value = $val;
            $setting->group = $group;
            $setting->save();

            $changes[$key] = [
                'old' => $oldVal,
                'new' => $val,
            ];
        }

        Cache::forget(self::CACHE_KEY);

        AuditLogger::log('platform_settings.updated', [
            'user_id' => $userId,
            'metadata' => [
                'changes' => $changes,
            ],
        ]);
    }
}
