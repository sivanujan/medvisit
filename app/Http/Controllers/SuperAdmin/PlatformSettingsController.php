<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Services\PlatformSettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PlatformSettingsController extends Controller
{
    public function __construct(
        private readonly PlatformSettingsService $settings
    ) {}

    /**
     * Display the platform configuration settings.
     */
    public function index(): Response
    {
        $allSettings = $this->settings->all();
        $plans = Plan::select('id', 'name', 'slug')->get();

        return Inertia::render('SuperAdmin/Settings/Index', [
            'settings' => $allSettings,
            'plans' => $plans,
            'baseDomain' => config('tenancy.central_domains.0', 'medvisit.localhost'),
        ]);
    }

    /**
     * Update settings in batch, busting cache and logging audit trail.
     */
    public function update(Request $request): RedirectResponse
    {
        $raw = $request->all();
        $normalized = [];
        $knownGroups = ['general', 'signups', 'billing', 'messaging', 'security', 'maintenance'];

        foreach ($raw as $key => $val) {
            if (str_contains($key, '_') && ! str_contains($key, '.')) {
                foreach ($knownGroups as $grp) {
                    if (str_starts_with($key, $grp.'_')) {
                        $sub = substr($key, strlen($grp) + 1);
                        $key = "{$grp}.{$sub}";
                        break;
                    }
                }
            }
            $normalized[$key] = $val;
        }

        $request->replace(Arr::undot($normalized));

        $validated = $request->validate([
            // General
            'general.platform_name' => ['required', 'string', 'max:100'],
            'general.support_email' => ['required', 'email'],
            'general.support_phone' => ['required', 'string', 'max:50'],
            'general.support_whatsapp' => ['required', 'string', 'max:50'],

            // Signups
            'signups.open' => ['required', 'boolean'],
            'signups.trial_days' => ['required', 'integer', 'min:1', 'max:365'],
            'signups.default_plan_slug' => ['required', 'string'],
            'signups.require_email_verification' => ['required', 'boolean'],

            // Billing
            'billing.grace_days' => ['required', 'integer', 'min:0', 'max:30'],
            'billing.reminder_days' => ['required', 'string'],

            // Messaging
            'messaging.sms_cost_per_message' => ['required', 'numeric', 'min:0'],
            'messaging.otp_channel_order' => ['required', 'array'],
            'messaging.sender_name' => ['required', 'string', 'max:20'],

            // Security
            'security.enforce_2fa_super_admin' => ['required', 'boolean'],
            'security.session_lifetime_minutes' => ['required', 'integer', 'min:15', 'max:10080'],

            // Maintenance
            'maintenance.enabled' => ['required', 'boolean'],
            'maintenance.banner_text' => ['required', 'string', 'max:500'],
        ]);

        $settingsToUpdate = [];
        foreach ($validated as $group => $fields) {
            if (is_array($fields)) {
                foreach ($fields as $subKey => $val) {
                    $settingsToUpdate["{$group}.{$subKey}"] = $val;
                }
            } else {
                $settingsToUpdate[$group] = $fields;
            }
        }

        $this->settings->updateMany($settingsToUpdate, Auth::id());

        return back()->with('success', 'Platform settings have been updated successfully.');
    }
}
