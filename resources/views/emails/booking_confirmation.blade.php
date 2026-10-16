<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Confirmation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #0f172a; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { margin: 6px 0 0; color: #94a3b8; font-size: 13px; }
        .token-badge { background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 16px; text-align: center; margin: 24px; }
        .token-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #15803d; }
        .token-number { font-size: 40px; font-weight: 900; color: #166534; line-height: 1; margin: 6px 0; }
        .token-approx { font-size: 13px; color: #15803d; font-weight: 600; }
        .body { padding: 0 24px 24px; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #64748b; font-weight: 500; }
        .detail-value { color: #0f172a; font-weight: 700; text-align: right; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>{{ $clinicName }}</h1>
            <p>Doctor Channeling Appointment Confirmation</p>
        </div>

        <div class="token-badge">
            <div class="token-label">Your Channeling Token</div>
            <div class="token-number">#{{ $tokenNumber }}</div>
            <div class="token-approx">Approx. Time: {{ $approxTime }}</div>
        </div>

        <div class="body">
            <div class="detail-row">
                <span class="detail-label">Patient Name</span>
                <span class="detail-value">{{ $patientName }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Doctor</span>
                <span class="detail-value">{{ $doctorName }} ({{ $doctorSpecialty }})</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Date</span>
                <span class="detail-value">{{ $sessionDate }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Session Hours</span>
                <span class="detail-value">{{ $sessionTime }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Room / Suite</span>
                <span class="detail-value">{{ $roomNumber }}</span>
            </div>
        </div>

        <div class="footer">
            Please arrive at the clinic 15 minutes before your approximate consultation time.<br>
            Powered by MedVisit • Clinic Management System
        </div>
    </div>
</body>
</html>
