<?php

namespace App\Models;

use App\Mail\Auth\ResetPasswordMail;
use App\Mail\Auth\VerifyEmailMail;
use Database\Factories\UserFactory;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Testing\Fakes\NotificationFake;
use Spatie\Permission\Traits\HasRoles;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use BelongsToTenant, HasFactory, HasRoles, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'phone',
        'password',
        'email_verified_at',
        'phone_verified_at',
        'is_active',
        'avatar_path',
        'avatar_url',
    ];

    /**
     * Get the user's avatar URL.
     */
    public function getAvatarUrlAttribute(): ?string
    {
        if (! empty($this->attributes['avatar_url'])) {
            return $this->attributes['avatar_url'];
        }
        if (! empty($this->attributes['avatar_path'])) {
            $disk = config('filesystems.media_disk', env('MEDIA_DISK', 'public'));

            return Storage::disk($disk)->url($this->attributes['avatar_path']).'?v='.($this->updated_at?->timestamp ?? time());
        }

        return null;
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'two_factor_recovery_codes' => 'array',
            'two_factor_confirmed_at' => 'datetime',
            'mute_announcement_emails' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function agreementAcceptances(): HasMany
    {
        return $this->hasMany(AgreementAcceptance::class);
    }

    public function latestAgreementAcceptance(): HasOne
    {
        return $this->hasOne(AgreementAcceptance::class)->latestOfMany('accepted_at');
    }

    public function hasAcceptedLatestAgreements(): bool
    {
        $versions = [
            'terms' => (string) (config('legal.versions.terms') ?: config('legal.terms_version')),
            'privacy' => (string) (config('legal.versions.privacy') ?: config('legal.privacy_version')),
            'refund' => (string) (config('legal.versions.refund') ?: config('legal.refund_version')),
            'dispute' => (string) (config('legal.versions.dispute') ?: config('legal.dispute_version')),
        ];
        $latest = $this->latestAgreementAcceptance;

        if (! $latest) {
            return false;
        }

        foreach ($versions as $key => $ver) {
            $col = "{$key}_version";
            if (! isset($latest->{$col}) || strcmp((string) $latest->{$col}, (string) $ver) < 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * Send the email verification notification.
     */
    public function sendEmailVerificationNotification(): void
    {
        if (Notification::getFacadeRoot() instanceof NotificationFake) {
            $this->notify(new VerifyEmail);
        }

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes((int) config('auth.verification.expire', 60)),
            [
                'id' => $this->getKey(),
                'hash' => sha1($this->getEmailForVerification()),
            ]
        );

        Mail::to($this->email)->queue(new VerifyEmailMail($this, $verificationUrl));
    }

    /**
     * Send the password reset notification.
     *
     * @param  string  $token
     */
    public function sendPasswordResetNotification($token): void
    {
        if (Notification::getFacadeRoot() instanceof NotificationFake) {
            $this->notify(new ResetPassword($token));
        }

        Mail::to($this->email)->queue(new ResetPasswordMail($this, (string) $token));
    }
}
