<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\AuditEvent;
use App\Models\BookingToken;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendTokenMoveNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $oldTokenId,
        public int $newTokenId,
        public string $reason = ''
    ) {}

    public function handle(): void
    {
        $newToken = BookingToken::with(['patient', 'doctorSession.doctor'])->find($this->newTokenId);
        if (! $newToken || ! $newToken->patient || empty($newToken->patient->phone)) {
            return;
        }

        $patient = $newToken->patient;
        $session = $newToken->doctorSession;
        $doctor = $session?->doctor;
        $docName = trim(($doctor?->title ?? 'Dr.').' '.($doctor?->name ?? 'Doctor'));
        $dateFormatted = $session?->session_date ? $session->session_date->format('M d, Y (D)') : 'scheduled date';
        $timeFormatted = $session?->start_time ? Carbon::parse($session->start_time)->format('g:i A') : '';
        $approxTime = $newToken->estimated_time ? Carbon::parse($newToken->estimated_time)->format('g:i A') : $timeFormatted;

        $message = "MedVisit: Your appointment for {$patient->name} has been moved to {$docName} on {$dateFormatted} at approx. {$approxTime}. Your new token is #{$newToken->token_number}.";

        $tenantId = $newToken->tenant_id;
        $phone = $patient->phone;

        // Check if SMS provider is configured
        $token = (string) config('services.textlk.api_token');
        $senderId = substr((string) config('services.textlk.sender_id', 'MedVisit'), 0, 11);
        $apiUrl = rtrim((string) config('services.textlk.api_url', 'https://app.text.lk/api/v3'), '/');

        $sent = false;
        $error = null;

        if (! empty($token)) {
            try {
                // Normalize phone to 94XXXXXXXXX
                $cleanDigits = preg_replace('/\D/', '', $phone);
                if (str_starts_with($cleanDigits, '0')) {
                    $recipient = '94'.substr($cleanDigits, 1);
                } elseif (str_starts_with($cleanDigits, '94')) {
                    $recipient = $cleanDigits;
                } else {
                    $recipient = '94'.$cleanDigits;
                }

                $res = Http::timeout(10)->withHeaders([
                    'Authorization' => "Bearer {$token}",
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])->post("{$apiUrl}/sms/send", [
                    'recipient' => $recipient,
                    'sender_id' => $senderId,
                    'type' => 'plain',
                    'message' => $message,
                ]);

                if ($res->successful()) {
                    $sent = true;
                } else {
                    $error = $res->body();
                }
            } catch (\Throwable $e) {
                $error = $e->getMessage();
            }
        }

        Log::info("[Notification] Token move SMS for token #{$newToken->id} to {$phone}: {$message}".($error ? " [Error: {$error}]" : ' [Queued/Sent]'));

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => null,
            'action' => 'notification.token_moved',
            'resource_type' => 'booking_token',
            'resource_id' => (string) $newToken->id,
            'metadata' => [
                'recipient_phone' => $phone,
                'patient_name' => $patient->name,
                'doctor_name' => $docName,
                'token_number' => $newToken->token_number,
                'session_date' => $dateFormatted,
                'approx_time' => $approxTime,
                'message' => $message,
                'gateway_sent' => $sent,
                'error' => $error,
            ],
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);
    }
}
