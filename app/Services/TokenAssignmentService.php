<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\BookingToken;
use App\Models\DoctorSession;
use App\Models\Patient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class TokenAssignmentService
{
    /**
     * Atomically assign the next channeling token for a patient in a doctor session.
     * Uses row locking (lockForUpdate) inside a database transaction to prevent duplicates.
     *
     * @throws RuntimeException
     */
    public function assignToken(
        DoctorSession $session,
        Patient $patient,
        string $bookedVia = 'reception',
        ?string $notes = null
    ): BookingToken {
        return DB::transaction(function () use ($session, $patient, $bookedVia, $notes) {
            // Lock the session row to prevent race conditions during concurrent bookings
            /** @var DoctorSession $lockedSession */
            $lockedSession = DoctorSession::where('id', $session->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedSession->status === 'cancelled') {
                throw new RuntimeException('Cannot book token: this session has been cancelled.');
            }

            // Check if patient already has an active token in this session
            $existingActive = BookingToken::where('doctor_session_id', $lockedSession->id)
                ->where('patient_id', $patient->id)
                ->whereNotIn('status', [BookingToken::STATUS_CANCELLED, BookingToken::STATUS_MOVED])
                ->exists();

            if ($existingActive) {
                throw new RuntimeException('Patient already has an active booking token for this session.');
            }

            // Count current active bookings against capacity
            $activeCount = BookingToken::where('doctor_session_id', $lockedSession->id)
                ->whereNotIn('status', [BookingToken::STATUS_CANCELLED, BookingToken::STATUS_MOVED])
                ->count();

            if ($activeCount >= $lockedSession->max_tokens) {
                throw new RuntimeException('Cannot book token: this channeling session is fully booked.');
            }

            // Sequential token number: always 1 greater than highest token issued for this session
            $highestToken = (int) BookingToken::where('doctor_session_id', $lockedSession->id)
                ->max('token_number');
            $nextTokenNumber = $highestToken + 1;

            $estimatedTime = $lockedSession->calculateEstimatedTime($nextTokenNumber);

            return BookingToken::create([
                'tenant_id' => $lockedSession->tenant_id,
                'doctor_session_id' => $lockedSession->id,
                'patient_id' => $patient->id,
                'token_number' => $nextTokenNumber,
                'estimated_time' => $estimatedTime,
                'status' => BookingToken::STATUS_BOOKED,
                'booked_via' => $bookedVia,
                'signed_cancel_token' => Str::random(40),
                'notes' => $notes,
            ]);
        });
    }
}
