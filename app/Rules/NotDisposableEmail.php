<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class NotDisposableEmail implements ValidationRule
{
    /**
     * Common disposable email domains list.
     *
     * @var array<string>
     */
    protected static array $commonDisposableDomains = [
        'mailinator.com',
        'tempmail.com',
        '10minutemail.com',
        'guerrillamail.com',
        'sharklasers.com',
        'trashmail.com',
        'getairmail.com',
        'yopmail.com',
        'dispostable.com',
        'maildrop.cc',
        'inboxkitten.com',
        'throwawaymail.com',
        'fakemailgenerator.com',
        'temp-mail.org',
    ];

    /**
     * Check if an email address belongs to a disposable email provider.
     */
    public static function isDisposable(?string $email): bool
    {
        if (! $email || ! str_contains($email, '@')) {
            return false;
        }

        $domain = strtolower(trim(substr(strrchr($email, '@') ?: '', 1)));
        if ($domain === '') {
            return false;
        }

        $blocked = array_merge(
            static::$commonDisposableDomains,
            config('auth.disposable_email_domains', [])
        );

        foreach ($blocked as $item) {
            $item = strtolower(trim($item));
            if ($item === '') {
                continue;
            }
            if ($domain === $item || str_ends_with($domain, '.'.$item)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        if (self::isDisposable($value)) {
            $fail('Temporary or disposable email addresses are not permitted. Please use a valid personal or clinic email.');
        }
    }
}
