<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Subscription;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlanManagementController extends Controller
{
    /**
     * Display all subscription tiers and plans.
     */
    public function index(): Response
    {
        $plans = Plan::withCount(['subscriptions' => function ($q) {
            $q->where('status', 'active');
        }])
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'price_cents' => $p->price_cents,
                'price_lkr' => round($p->price_cents / 100, 2),
                'billing_interval' => $p->billing_interval,
                'description' => $p->description,
                'features' => $p->features ?? [],
                'limits' => $p->limits ?? [],
                'is_active' => (bool) $p->is_active,
                'is_public' => (bool) $p->is_public,
                'active_subscribers_count' => $p->subscriptions_count,
                'total_subscribers_count' => Subscription::where('plan_id', $p->id)->count(),
            ]);

        return Inertia::render('SuperAdmin/Plans/Index', [
            'plans' => $plans,
        ]);
    }

    /**
     * Create a new plan tier.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'string', 'max:100', 'unique:plans,slug'],
            'price_lkr' => ['required', 'numeric', 'min:0'],
            'billing_interval' => ['required', 'string', 'in:month,year'],
            'features' => ['nullable', 'array'],
        ]);

        $plan = Plan::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'price_cents' => (int) round(((float) $validated['price_lkr']) * 100),
            'billing_interval' => $validated['billing_interval'],
            'features' => $validated['features'] ?? [],
            'is_active' => true,
        ]);

        AuditLogger::log('superadmin.plan.created', [
            'resource' => $plan,
            'user' => $request->user(),
        ]);

        return back()->with('success', "Plan '{$plan->name}' created.");
    }

    /**
     * Update an existing plan tier.
     * Note: Price modifications apply to next renewal cycle only.
     */
    public function update(Request $request): RedirectResponse
    {
        $planId = $request->route('plan');
        $plan = $planId instanceof Plan ? $planId : Plan::findOrFail($planId);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'price_lkr' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_public' => ['nullable', 'boolean'],
            'features' => ['nullable', 'array'],
            'limits' => ['nullable', 'array'],
            'limits.doctors' => ['nullable', 'integer'],
            'limits.staff' => ['nullable', 'integer'],
            'limits.tv_screens' => ['nullable', 'integer'],
            'limits.sms_monthly' => ['nullable', 'integer'],
            'limits.free_premium_templates' => ['nullable', 'integer'],
        ]);

        $newPriceCents = (int) round(((float) $validated['price_lkr']) * 100);
        $oldPriceCents = $plan->price_cents;

        $updateData = [
            'name' => $validated['name'],
            'price_cents' => $newPriceCents,
        ];

        if (array_key_exists('description', $validated)) {
            $updateData['description'] = $validated['description'];
        }
        if (array_key_exists('is_public', $validated)) {
            $updateData['is_public'] = (bool) $validated['is_public'];
        }
        if (isset($validated['features'])) {
            $updateData['features'] = $validated['features'];
        }
        if (isset($validated['limits'])) {
            $updateData['limits'] = $validated['limits'];
        }

        $plan->update($updateData);

        AuditLogger::log('superadmin.plan.updated', [
            'resource' => $plan,
            'user' => $request->user(),
            'metadata' => [
                'old_price_cents' => $oldPriceCents,
                'new_price_cents' => $newPriceCents,
                'note' => 'Price updates apply to next renewal cycles only.',
            ],
        ]);

        return back()->with('success', "Plan '{$plan->name}' updated. Price change will apply to upcoming renewals.");
    }

    /**
     * Toggle active/inactive status.
     */
    public function toggleActive(Request $request): RedirectResponse
    {
        $planId = $request->route('plan');
        $plan = $planId instanceof Plan ? $planId : Plan::findOrFail($planId);
        $plan->update(['is_active' => ! $plan->is_active]);

        AuditLogger::log('superadmin.plan.status_toggled', [
            'resource' => $plan,
            'user' => $request->user(),
            'metadata' => ['is_active' => $plan->is_active],
        ]);

        return back()->with('success', "Plan '{$plan->name}' status updated.");
    }

    /**
     * Delete a plan (only permitted if 0 subscribers exist).
     */
    public function destroy(Request $request): RedirectResponse
    {
        $planId = $request->route('plan');
        $plan = $planId instanceof Plan ? $planId : Plan::findOrFail($planId);
        $subscriberCount = Subscription::where('plan_id', $plan->id)->count();
        if ($subscriberCount > 0) {
            return back()->with('error', "Cannot delete plan '{$plan->name}' because it has {$subscriberCount} subscribers. Deactivate the plan instead.");
        }

        $plan->delete();

        AuditLogger::log('superadmin.plan.deleted', [
            'resource' => $plan,
            'user' => $request->user(),
        ]);

        return back()->with('success', "Plan '{$plan->name}' deleted.");
    }
}
