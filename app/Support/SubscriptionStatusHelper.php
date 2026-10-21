<?php

declare(strict_types=1);

namespace App\Support;

use Carbon\Carbon;

class SubscriptionStatusHelper
{
    /**
     * Map a raw subscription status to its user-friendly display label.
     */
    public static function getLabel(
        ?string $status,
        Carbon|string|null $periodEnd = null,
        ?int $trialDaysLeft = null
    ): string {
        $normalized = strtolower(trim((string) $status));

        $periodCarbon = null;
        if ($periodEnd instanceof Carbon) {
            $periodCarbon = $periodEnd;
        } elseif (is_string($periodEnd) && ! empty($periodEnd)) {
            try {
                $periodCarbon = Carbon::parse($periodEnd);
            } catch (\Throwable) {
                // ignore parsing failure
            }
        }

        return match ($normalized) {
            'active' => 'Active',
            'trial', 'trialing' => $trialDaysLeft !== null
                ? ($trialDaysLeft > 0 ? "Trial: {$trialDaysLeft}d left" : 'Trial Expired')
                : 'Trial',
            'pending_payment' => 'Payment due',
            'past_due' => 'Past due',
            'expired' => 'Expired',
            'cancelled', 'canceled' => 'Cancelled',
            'cancelling', 'canceling' => $periodCarbon
                ? 'Cancels on '.$periodCarbon->format('d/m/Y')
                : 'Cancelling at period end',
            'unpaid' => 'Payment overdue',
            'comp', 'complimentary' => 'Complimentary',
            default => ! empty($normalized) ? ucwords(str_replace('_', ' ', $normalized)) : 'Active',
        };
    }

    /**
     * Return semantic tone and CSS badge classes for a given status.
     *
     * @return array{
     *     label: string,
     *     tone: 'emerald'|'amber'|'rose'|'slate'|'blue',
     *     bg_class: string,
     *     text_class: string,
     *     border_class: string
     * }
     */
    public static function getDescriptor(
        ?string $status,
        Carbon|string|null $periodEnd = null,
        ?int $trialDaysLeft = null
    ): array {
        $normalized = strtolower(trim((string) $status));
        $label = self::getLabel($status, $periodEnd, $trialDaysLeft);

        return match ($normalized) {
            'active', 'comp', 'complimentary' => [
                'label' => $label,
                'tone' => 'emerald',
                'bg_class' => 'bg-emerald-50 dark:bg-emerald-950/40',
                'text_class' => 'text-emerald-700 dark:text-emerald-400',
                'border_class' => 'border-emerald-200/80 dark:border-emerald-800/50',
            ],
            'trial', 'trialing', 'pending_payment', 'cancelling', 'canceling' => [
                'label' => $label,
                'tone' => 'amber',
                'bg_class' => 'bg-amber-50 dark:bg-amber-950/40',
                'text_class' => 'text-amber-800 dark:text-amber-300',
                'border_class' => 'border-amber-200/80 dark:border-amber-800/50',
            ],
            'past_due', 'unpaid', 'expired', 'cancelled', 'canceled' => [
                'label' => $label,
                'tone' => 'rose',
                'bg_class' => 'bg-rose-50 dark:bg-rose-950/40',
                'text_class' => 'text-rose-700 dark:text-rose-400',
                'border_class' => 'border-rose-200/80 dark:border-rose-800/50',
            ],
            default => [
                'label' => $label,
                'tone' => 'slate',
                'bg_class' => 'bg-slate-50 dark:bg-slate-800/50',
                'text_class' => 'text-slate-700 dark:text-slate-300',
                'border_class' => 'border-slate-200/80 dark:border-slate-700/50',
            ],
        };
    }
}
