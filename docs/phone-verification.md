# Public Booking Phone Verification (WhatsApp Reverse & Text.lk SMS)

MedVisit implements a dual-channel mobile phone verification flow exclusively for **public online bookings** (`/book/...` on clinic subdomains). Reception-issued internal tokens never require verification.

---

## 1. Architecture Overview

1. **Patient Choice**:
   - The patient enters their Sri Lankan mobile number (`+94 7X XXX XXXX`).
   - If both channels are available, we ask: *"Do you use WhatsApp on this number?"*
     - `[ Yes, verify with WhatsApp ]`
     - `[ No, send me an SMS code ]`
   - Choice is saved in `localStorage` for future visits. If only one channel is enabled on the platform/clinic, the choice step is automatically skipped.
2. **Reverse WhatsApp Verification (Path A)**:
   - Zero-cost to the clinic (patient initiates message to your WhatsApp Business number).
   - Generates a 6-digit code (stored hashed only).
   - Opens `https://wa.me/<NUMBER>?text=VERIFY%20<code>` or displays a QR code + copyable text for desktop users.
   - Polling endpoint checks verification every 2 seconds.
   - Meta webhook at `/webhooks/whatsapp` receives `VERIFY <code>` and verifies the attempt only if sender matches the entered number.
   - Automatic 45-second fallback: *"Didn't work? Send me an SMS code instead"*.
3. **SMS Verification via Text.lk (Path B)**:
   - Single GSM segment: `"MedVisit code: 482913. Valid 10 min. Do not share."`
   - 6 individual digit input boxes with paste support and auto-submission on 6th digit.
   - 60-second resend countdown timer with link to switch back to WhatsApp.
4. **180-Day Retention**:
   - Verified numbers are stored in `verified_phones` table for 180 days and set in a signed, tamper-proof device cookie `medvisit_verified_phone`. Returning patients skip verification.

---

## 2. Text.lk Setup Guide (Sri Lanka SMS)

1. **Sign Up & Account Units**:
   - Create an account on [https://app.text.lk](https://app.text.lk).
   - Purchase SMS credit units (typically ~Rs. 0.45 – 0.65 per SMS).
2. **Sender ID**:
   - In Text.lk dashboard -> **Sender IDs**, request an approved alphanumeric Sender ID (e.g. `MedVisit` or your clinic brand).
   - While pending approval, you can use the default shared sender ID or test sender provided by Text.lk.
3. **Generate API Token**:
   - Go to **Settings** -> **API Keys / Tokens** -> Generate a New API Token.
   - Add to `.env`:
     ```env
     TEXTLK_API_TOKEN=your_textlk_bearer_token_here
     TEXTLK_SENDER_ID=MedVisit
     ```
4. **Local Fallback**:
   - If `TEXTLK_API_TOKEN` is empty and `APP_ENV=local`, MedVisit automatically uses the local log driver and displays the code on screen in a convenient test banner.

---

## 3. Meta WhatsApp Cloud API Setup (Reverse Verification)

### Step 3.1: Create Meta Developer App & WhatsApp Product
1. Go to [developers.facebook.com](https://developers.facebook.com) and log in with your Meta account.
2. Click **My Apps** -> **Create App**. Select **Other** -> **Business**.
3. Under **Add products to your app**, locate **WhatsApp** and click **Set up**.

### Step 3.2: Development Mode & Test Number
1. In WhatsApp -> **API Setup**:
   - Note your **Phone number ID**, **WhatsApp Business Account ID**, and **Temporary Access Token**.
   - Note the **Test Business Phone Number** provided by Meta (e.g. `+1 555 0...`).
2. **Add Recipient / Tester Numbers**:
   - In development/sandbox mode, Meta only allows sending/receiving to pre-registered tester phone numbers.
   - In the "To" dropdown on the API Setup page, click **Manage phone number list** and add your personal Sri Lankan mobile number (e.g. `94771234567`). Verify the 6-digit code received on WhatsApp.
3. **24-Hour Temporary Token**:
   - Temporary access tokens expire every 24 hours.
   - Regenerate in the developer portal and update `WHATSAPP_ACCESS_TOKEN` in `.env`.
   - Run `php artisan medvisit:whatsapp-check` to confirm validity and expiration.

### Step 3.3: Local Webhook with Cloudflare Quick Tunnel
Meta requires an HTTPS callback URL with a valid SSL certificate. Use Cloudflare Quick Tunnels:

1. Install `cloudflared`:
   ```bash
   winget install Cloudflare.cloudflared
   # or brew install cloudflared
   ```
2. Start the tunnel to your local Laravel server:
   ```bash
   cloudflared tunnel --url http://localhost:8000
   ```
3. Copy the generated random hostname (e.g. `https://random-words.trycloudflare.com`).
4. In Meta Developer Portal -> WhatsApp -> **Configuration** -> **Webhook**:
   - **Callback URL**: `https://<tunnel-host>.trycloudflare.com/webhooks/whatsapp`
   - **Verify Token**: Must match `WHATSAPP_VERIFY_TOKEN` in your `.env` (e.g. `medvisit_secret_verify_token_2026`).
   - Click **Verify and Save**.
5. Click **Manage** webhook field subscriptions and subscribe to **`messages`**.

---

## 4. Production Checklist (Meta WhatsApp)

Moving from developer test mode to live production:
1. **Dedicated SIM Card**:
   - Acquire a fresh physical or eSIM number that is **NOT** currently registered on any standard WhatsApp or WhatsApp Business mobile app.
   - If registered, delete the account in the WhatsApp app first before connecting to Cloud API.
2. **Meta Business Verification**:
   - In Meta Business Manager -> **Security Center**, complete Business Verification (upload BR document / clinic registration).
3. **Display Name Approval**:
   - Submit your clinic's display name for approval (e.g. `MedVisit Healthcare`).
4. **Permanent System User Access Token**:
   - Go to Meta Business Manager -> **Users** -> **System Users**.
   - Add a System User with Admin role.
   - Generate a permanent token with permissions: `whatsapp_business_messaging`, `whatsapp_business_management`.
   - Set expiry to **Never**.
   - Update `WHATSAPP_ACCESS_TOKEN` with this permanent token.

---

## 5. Developer CLI Tools

### Test Verification Dispatch
```bash
# Test SMS via Text.lk (or local driver if token is empty)
php artisan medvisit:test-otp 0771234567 --channel=textlk

# Test WhatsApp reverse verification (prints code, message, and wa.me URL)
php artisan medvisit:test-otp 0771234567 --channel=whatsapp

# Test local log driver
php artisan medvisit:test-otp 0771234567 --channel=log
```

### Validate Meta WhatsApp Credentials & Token Expiry
```bash
php artisan medvisit:whatsapp-check
```

---

## 6. Central Super Admin Analytics

Navigate to `http://medvisit.localhost:8000/super-admin/otp-usage` (or on central domain) to review:
- Platform monthly volumes by channel (WhatsApp vs Text.lk SMS).
- Clinic-by-clinic verification success rate.
- Real-time audit log of failures, delivery errors, and wrong code attempts (all phone numbers masked).
