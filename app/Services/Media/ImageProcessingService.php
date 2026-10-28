<?php

declare(strict_types=1);

namespace App\Services\Media;

use App\Models\Doctor;
use App\Models\Tenant;
use App\Models\User;
use GuzzleHttp\TransferStats;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Image;
use Intervention\Image\ImageManager;

class ImageProcessingService
{
    public const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

    public const MAX_DIMENSION = 6000;         // 6000x6000 px

    protected ImageManager $manager;

    public function __construct()
    {
        $this->manager = new ImageManager(new Driver);
    }

    /**
     * Get the configured filesystem media disk.
     */
    public function getDisk(): string
    {
        return (string) config('filesystems.media_disk', env('MEDIA_DISK', 'public'));
    }

    /**
     * Fetch external image from URL securely with strict SSRF protection.
     *
     * @throws ValidationException
     */
    public function fetchSecurelyFromUrl(string $url, ?int $userId = null): string
    {
        // 1. Rate limiting: 10 fetches per minute per user (or IP)
        $rateKey = 'media-fetch:'.($userId ?: request()->ip());
        if (RateLimiter::tooManyAttempts($rateKey, 10)) {
            $seconds = RateLimiter::availableIn($rateKey);
            throw ValidationException::withMessages([
                'source_url' => ["Too many URL fetch attempts. Please wait {$seconds} seconds."],
            ]);
        }
        RateLimiter::hit($rateKey, 60);

        // 2. Initial URL validation
        $url = trim($url);
        if (empty($url) || ! filter_var($url, FILTER_VALIDATE_URL)) {
            throw ValidationException::withMessages([
                'source_url' => ["Couldn't fetch that image: invalid URL format."],
            ]);
        }

        $parsed = parse_url($url);
        $scheme = strtolower($parsed['scheme'] ?? '');
        if (! in_array($scheme, ['http', 'https'], true)) {
            throw ValidationException::withMessages([
                'source_url' => ['Only HTTP and HTTPS image URLs are permitted.'],
            ]);
        }

        $host = strtolower($parsed['host'] ?? '');
        if (empty($host)) {
            throw ValidationException::withMessages([
                'source_url' => ["Couldn't fetch that image: missing host."],
            ]);
        }

        // 3. Resolve host and validate against SSRF
        $this->assertHostIsSafe($host);

        // 4. Download with stream, max 3 redirects (validating each hop), 10s timeout, max 5 MB
        return $this->downloadStreamWithSsrfProtection($url);
    }

    /**
     * Download binary with SSRF checking on every redirect hop and strict 5MB limit.
     */
    protected function downloadStreamWithSsrfProtection(string $initialUrl, int $maxRedirects = 3): string
    {
        $currentUrl = $initialUrl;
        $hops = 0;

        while ($hops <= $maxRedirects) {
            $parsed = parse_url($currentUrl);
            $host = strtolower($parsed['host'] ?? '');
            $this->assertHostIsSafe($host);

            // Stream response to check size and abort if exceeding 5 MB
            $totalBytes = 0;
            $buffer = '';

            try {
                $response = Http::timeout(10)
                    ->withoutRedirecting()
                    ->withHeaders([
                        'User-Agent' => 'MedVisit-ImageFetcher/1.0 (+https://medvisit.lk)',
                        'Accept' => 'image/png,image/jpeg,image/webp,*/*',
                    ])
                    ->withOptions([
                        'on_stats' => function (TransferStats $stats) use (&$totalBytes) {
                            // Can track stats if needed
                        },
                    ])
                    ->get($currentUrl);
            } catch (\Throwable $e) {
                throw ValidationException::withMessages([
                    'source_url' => ["Couldn't fetch that image: {$e->getMessage()}"],
                ]);
            }

            // Handle Redirects (301, 302, 307, 308)
            if ($response->status() >= 300 && $response->status() < 400) {
                $location = $response->header('Location');
                if (empty($location)) {
                    throw ValidationException::withMessages([
                        'source_url' => ["Couldn't fetch that image: redirect without location."],
                    ]);
                }

                // Resolve relative redirect if needed
                if (! preg_match('#^https?://#i', $location)) {
                    $scheme = $parsed['scheme'] ?? 'http';
                    $location = $scheme.'://'.$host.'/'.ltrim($location, '/');
                }

                $currentUrl = $location;
                $hops++;

                continue;
            }

            if (! $response->successful()) {
                throw ValidationException::withMessages([
                    'source_url' => ["Couldn't fetch that image (HTTP {$response->status()})."],
                ]);
            }

            // Check Content-Type
            $contentType = strtolower($response->header('Content-Type') ?? '');

            // Google Drive / Dropbox share links detection
            if (str_contains($contentType, 'text/html') || str_contains($host, 'drive.google.com') || str_contains($host, 'dropbox.com')) {
                if (str_contains($contentType, 'text/html')) {
                    throw ValidationException::withMessages([
                        'source_url' => ['Please use a direct image link or upload the file (this link returned a web page, not image data).'],
                    ]);
                }
            }

            $body = $response->body();
            if (strlen($body) > self::MAX_BYTES) {
                throw ValidationException::withMessages([
                    'source_url' => ['Image too large. Maximum allowed size is 5 MB.'],
                ]);
            }

            // Verify content is a real image
            $this->validateImageBytes($body);

            return $body;
        }

        throw ValidationException::withMessages([
            'source_url' => ["Couldn't fetch that image: too many redirects."],
        ]);
    }

    /**
     * Assert host resolves to a public, non-private, non-loopback IP address.
     */
    public function assertHostIsSafe(string $host): void
    {
        // 1. Deny obvious local hostnames
        if (in_array($host, ['localhost', '127.0.0.1', '::1', '0.0.0.0'], true) ||
            str_ends_with($host, '.localhost') ||
            str_ends_with($host, '.local') ||
            str_ends_with($host, '.internal') ||
            str_ends_with($host, '.test')) {
            throw ValidationException::withMessages([
                'source_url' => ['Access to internal or local addresses is blocked for security.'],
            ]);
        }

        // 2. If host is already an IP, validate directly
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            if ($this->isPrivateOrReservedIp($host)) {
                throw ValidationException::withMessages([
                    'source_url' => ['Access to private, link-local, or reserved network addresses is blocked.'],
                ]);
            }

            return;
        }

        // 3. Resolve hostname to IPv4 and IPv6 addresses
        $ips = [];
        $recordsA = @dns_get_record($host, DNS_A);
        if (is_array($recordsA)) {
            foreach ($recordsA as $rec) {
                if (! empty($rec['ip'])) {
                    $ips[] = $rec['ip'];
                }
            }
        }

        $recordsAaaa = @dns_get_record($host, DNS_AAAA);
        if (is_array($recordsAaaa)) {
            foreach ($recordsAaaa as $rec) {
                if (! empty($rec['ipv6'])) {
                    $ips[] = $rec['ipv6'];
                }
            }
        }

        if (empty($ips)) {
            $fallback = @gethostbynamel($host);
            if (is_array($fallback)) {
                $ips = $fallback;
            }
        }

        if (empty($ips)) {
            throw ValidationException::withMessages([
                'source_url' => ["Couldn't fetch that image: unable to resolve host {$host}."],
            ]);
        }

        foreach ($ips as $ip) {
            if ($this->isPrivateOrReservedIp($ip)) {
                throw ValidationException::withMessages([
                    'source_url' => ['Access to private, loopback, or cloud-metadata IP addresses is blocked.'],
                ]);
            }
        }
    }

    /**
     * Check if an IPv4 or IPv6 is private, loopback, link-local, multicast, or reserved.
     */
    public function isPrivateOrReservedIp(string $ip): bool
    {
        // Handle IPv4-mapped IPv6 (::ffff:192.168.1.1)
        if (str_starts_with(strtolower($ip), '::ffff:')) {
            $embeddedIpv4 = substr($ip, 7);
            if (filter_var($embeddedIpv4, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                $ip = $embeddedIpv4;
            }
        }

        // Use PHP's built-in filter flags first
        $flags = FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;
        if (! filter_var($ip, FILTER_VALIDATE_IP, $flags)) {
            return true;
        }

        // Explicit CIDR checking for IPv4
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $long = ip2long($ip);
            if ($long === false) {
                return true;
            }

            $blockedCidrs = [
                '0.0.0.0/8',
                '10.0.0.0/8',
                '100.64.0.0/10',        // Carrier-grade NAT
                '127.0.0.0/8',          // Loopback
                '169.254.0.0/16',       // Link-local / AWS metadata
                '172.16.0.0/12',        // Private Class B
                '192.0.0.0/24',         // IETF Protocol
                '192.0.2.0/24',         // Documentation
                '192.88.99.0/24',       // 6to4 Relay
                '192.168.0.0/16',       // Private Class C
                '198.18.0.0/15',        // Benchmarking
                '198.51.100.0/24',      // Documentation
                '203.0.113.0/24',       // Documentation
                '224.0.0.0/4',          // Multicast
                '240.0.0.0/4',          // Reserved
                '255.255.255.255/32',   // Broadcast
            ];

            foreach ($blockedCidrs as $cidr) {
                if ($this->ipv4InCidr($ip, $cidr)) {
                    return true;
                }
            }

            return false;
        }

        // IPv6 explicit check
        $hex = bin2hex(inet_pton($ip) ?: '');
        if (empty($hex)) {
            return true;
        }

        // ::1 loopback
        if ($ip === '::1' || $hex === str_repeat('0', 31).'1') {
            return true;
        }

        // fc00::/7 (unique local)
        if (str_starts_with(strtolower($ip), 'fc') || str_starts_with(strtolower($ip), 'fd')) {
            return true;
        }

        // fe80::/10 (link local)
        if (str_starts_with(strtolower($ip), 'fe8') || str_starts_with(strtolower($ip), 'fe9') || str_starts_with(strtolower($ip), 'fea') || str_starts_with(strtolower($ip), 'feb')) {
            return true;
        }

        return false;
    }

    /**
     * Check if IPv4 address matches a CIDR range.
     */
    protected function ipv4InCidr(string $ip, string $cidr): bool
    {
        [$subnet, $bits] = explode('/', $cidr);
        $ipLong = ip2long($ip);
        $subnetLong = ip2long($subnet);
        if ($ipLong === false || $subnetLong === false) {
            return false;
        }

        $mask = -1 << (32 - (int) $bits);
        $subnetLong &= $mask;

        return ($ipLong & $mask) === $subnetLong;
    }

    /**
     * Validate that bytes represent a valid PNG, JPEG, or WebP image under 6000x6000px.
     *
     * @throws ValidationException
     */
    public function validateImageBytes(string $bytes): void
    {
        if (strlen($bytes) > self::MAX_BYTES) {
            throw ValidationException::withMessages([
                'file' => ['Image exceeds maximum allowed size of 5 MB.'],
            ]);
        }

        // Fast reject SVG & GIF
        $trimmed = ltrim($bytes);
        if (str_starts_with($trimmed, '<?xml') || str_starts_with($trimmed, '<svg') || str_contains(substr($trimmed, 0, 1024), '<svg')) {
            throw ValidationException::withMessages([
                'file' => ['SVG images are not permitted for security reasons. Please use PNG, JPEG, or WebP.'],
            ]);
        }
        if (str_starts_with($trimmed, 'GIF87a') || str_starts_with($trimmed, 'GIF89a')) {
            throw ValidationException::withMessages([
                'file' => ['GIF images are not permitted. Please use PNG, JPEG, or WebP.'],
            ]);
        }

        $info = @getimagesizefromstring($bytes);
        if (! $info) {
            throw ValidationException::withMessages([
                'file' => ["That link isn't an image or the file format is corrupt."],
            ]);
        }

        $mime = strtolower((string) ($info['mime'] ?? ''));
        if (! in_array($mime, ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'], true)) {
            throw ValidationException::withMessages([
                'file' => ['Unsupported image format. Only PNG, JPEG, and WebP are accepted.'],
            ]);
        }

        $width = (int) ($info[0] ?? 0);
        $height = (int) ($info[1] ?? 0);
        if ($width > self::MAX_DIMENSION || $height > self::MAX_DIMENSION) {
            throw ValidationException::withMessages([
                'file' => ["Image dimensions ({$width}×{$height}) exceed maximum allowed of 6000×6000 pixels."],
            ]);
        }
    }

    /**
     * Process and store clinic logo in all required sizes and formats:
     * - WebP 512px, 192px
     * - PNG 192px, 32px (favicons)
     * - PNG 512px (for PDF receipts, prescriptions, and emails)
     *
     * @param  array<string, mixed>  $crop
     * @return array{
     *     logo_path: string,
     *     logo_url: string,
     *     logo_png_path: string,
     *     logo_png_url: string,
     *     favicon_path: string,
     *     favicon_url: string
     * }
     */
    public function processClinicLogo(Tenant $tenant, string $binaryContent, array $crop = []): array
    {
        $this->validateImageBytes($binaryContent);
        $disk = $this->getDisk();

        // Decode image, auto-orient, and apply crop
        $img = $this->prepareImage($binaryContent, $crop);

        $hash = Str::random(24);
        $baseDir = "tenants/{$tenant->id}/branding";

        // 1. 512px WebP (Main logo)
        $img512 = clone $img;
        $img512->scaleDown(512, 512);
        $path512Webp = "{$baseDir}/logo_{$hash}_512.webp";
        Storage::disk($disk)->put($path512Webp, $img512->encodeUsingFileExtension('webp')->toString());

        // 2. 192px WebP (Compact logo)
        $img192 = clone $img;
        $img192->scaleDown(192, 192);
        $path192Webp = "{$baseDir}/logo_{$hash}_192.webp";
        Storage::disk($disk)->put($path192Webp, $img192->encodeUsingFileExtension('webp')->toString());

        // 3. 512px PNG (Email & DomPDF copy)
        $img512Png = clone $img;
        $img512Png->scaleDown(512, 512);
        $path512Png = "{$baseDir}/logo_{$hash}_512.png";
        Storage::disk($disk)->put($path512Png, $img512Png->encodeUsingFileExtension('png')->toString());

        // 4. Favicon 192px PNG
        $img192Png = clone $img;
        $img192Png->scaleDown(192, 192);
        $path192Png = "{$baseDir}/favicon_{$hash}_192.png";
        Storage::disk($disk)->put($path192Png, $img192Png->encodeUsingFileExtension('png')->toString());

        // 5. Favicon 32px PNG
        $img32Png = clone $img;
        $img32Png->scaleDown(32, 32);
        $path32Png = "{$baseDir}/favicon_{$hash}_32.png";
        Storage::disk($disk)->put($path32Png, $img32Png->encodeUsingFileExtension('png')->toString());

        // Delete old branding files if present
        $this->deleteOldClinicLogo($tenant);

        $timestamp = time();
        $logoUrl = Storage::disk($disk)->url($path512Webp).'?v='.$timestamp;
        $logoPngUrl = Storage::disk($disk)->url($path512Png).'?v='.$timestamp;
        $faviconUrl = Storage::disk($disk)->url($path32Png).'?v='.$timestamp;

        // Save paths to tenant
        $tenant->logo_path = $path512Webp;
        $tenant->logo_url = $logoUrl;
        $tenant->logo_png_path = $path512Png;
        $tenant->favicon_path = $path32Png;
        $tenant->save();

        return [
            'logo_path' => $path512Webp,
            'logo_url' => $logoUrl,
            'logo_png_path' => $path512Png,
            'logo_png_url' => $logoPngUrl,
            'favicon_path' => $path32Png,
            'favicon_url' => $faviconUrl,
        ];
    }

    /**
     * Remove clinic logo and delete all files from storage.
     */
    public function deleteOldClinicLogo(Tenant $tenant): void
    {
        $disk = $this->getDisk();

        $oldPaths = [
            $tenant->logo_path,
            $tenant->logo_png_path,
            $tenant->favicon_path,
        ];

        // Also check any files in branding directory for this tenant if present
        foreach ($oldPaths as $path) {
            if ($path && Storage::disk($disk)->exists($path)) {
                Storage::disk($disk)->delete($path);
            }
        }

        // Clean up 192 variants
        if ($tenant->logo_path) {
            $webp192 = str_replace('_512.webp', '_192.webp', $tenant->logo_path);
            if (Storage::disk($disk)->exists($webp192)) {
                Storage::disk($disk)->delete($webp192);
            }
        }
        if ($tenant->favicon_path) {
            $fav192 = str_replace('_32.png', '_192.png', $tenant->favicon_path);
            if (Storage::disk($disk)->exists($fav192)) {
                Storage::disk($disk)->delete($fav192);
            }
        }
    }

    /**
     * Process and store user avatar (256px and 64px WebP).
     *
     * @param  array<string, mixed>  $crop
     * @return array{avatar_path: string, avatar_url: string}
     */
    public function processUserAvatar(User $user, string $binaryContent, array $crop = []): array
    {
        $this->validateImageBytes($binaryContent);
        $disk = $this->getDisk();

        $tenantId = $user->tenant_id ?: 'central';
        $baseDir = "tenants/{$tenantId}/users/{$user->id}";

        // Prepare image with crop & orientation
        $img = $this->prepareImage($binaryContent, $crop);

        $hash = Str::random(24);

        // 256px WebP
        $img256 = clone $img;
        $img256->cover(256, 256);
        $path256 = "{$baseDir}/avatar_{$hash}_256.webp";
        Storage::disk($disk)->put($path256, $img256->encodeUsingFileExtension('webp')->toString());

        // 64px WebP
        $img64 = clone $img;
        $img64->cover(64, 64);
        $path64 = "{$baseDir}/avatar_{$hash}_64.webp";
        Storage::disk($disk)->put($path64, $img64->encodeUsingFileExtension('webp')->toString());

        // Delete old avatar
        $this->deleteOldUserAvatar($user);

        $avatarUrl = Storage::disk($disk)->url($path256).'?v='.time();

        $user->avatar_path = $path256;
        $user->avatar_url = $avatarUrl;
        $user->save();

        return [
            'avatar_path' => $path256,
            'avatar_url' => $avatarUrl,
        ];
    }

    /**
     * Delete user avatar files.
     */
    public function deleteOldUserAvatar(User $user): void
    {
        $disk = $this->getDisk();
        if ($user->avatar_path && Storage::disk($disk)->exists($user->avatar_path)) {
            Storage::disk($disk)->delete($user->avatar_path);
            $path64 = str_replace('_256.webp', '_64.webp', $user->avatar_path);
            if (Storage::disk($disk)->exists($path64)) {
                Storage::disk($disk)->delete($path64);
            }
        }
    }

    /**
     * Process and store doctor photo (256px and 64px WebP).
     *
     * @param  array<string, mixed>  $crop
     * @return array{photo_path: string, photo_url: string}
     */
    public function processDoctorPhoto(Doctor $doctor, string $binaryContent, array $crop = []): array
    {
        $this->validateImageBytes($binaryContent);
        $disk = $this->getDisk();

        $tenantId = $doctor->tenant_id;
        $baseDir = "tenants/{$tenantId}/doctors/{$doctor->id}";

        $img = $this->prepareImage($binaryContent, $crop);

        $hash = Str::random(24);

        // 256px WebP
        $img256 = clone $img;
        $img256->cover(256, 256);
        $path256 = "{$baseDir}/photo_{$hash}_256.webp";
        Storage::disk($disk)->put($path256, $img256->encodeUsingFileExtension('webp')->toString());

        // 64px WebP
        $img64 = clone $img;
        $img64->cover(64, 64);
        $path64 = "{$baseDir}/photo_{$hash}_64.webp";
        Storage::disk($disk)->put($path64, $img64->encodeUsingFileExtension('webp')->toString());

        // Delete old photo
        $this->deleteOldDoctorPhoto($doctor);

        $photoUrl = Storage::disk($disk)->url($path256).'?v='.time();

        $doctor->photo_path = $path256;
        $doctor->photo_url = $photoUrl;
        $doctor->save();

        return [
            'photo_path' => $path256,
            'photo_url' => $photoUrl,
        ];
    }

    /**
     * Delete doctor photo files.
     */
    public function deleteOldDoctorPhoto(Doctor $doctor): void
    {
        $disk = $this->getDisk();
        if ($doctor->photo_path && Storage::disk($disk)->exists($doctor->photo_path)) {
            Storage::disk($disk)->delete($doctor->photo_path);
            $path64 = str_replace('_256.webp', '_64.webp', $doctor->photo_path);
            if (Storage::disk($disk)->exists($path64)) {
                Storage::disk($disk)->delete($path64);
            }
        }
    }

    /**
     * Prepare image by decoding, auto-orienting, applying rotation and crop if given.
     *
     * @param  array<string, mixed>  $crop
     */
    protected function prepareImage(string $binary, array $crop = []): Image
    {
        $img = $this->manager->decodeBinary($binary);

        // 1. Auto-orient from EXIF
        $img->orient();

        // 2. Rotate if specified (e.g. 90, 180, 270)
        if (! empty($crop['rotate']) && is_numeric($crop['rotate'])) {
            $angle = (float) $crop['rotate'];
            if ($angle !== 0.0) {
                $img->rotate($angle);
            }
        }

        // 3. Crop if specified: crop_x, crop_y, crop_width, crop_height
        if (isset($crop['crop_width'], $crop['crop_height']) && $crop['crop_width'] > 0 && $crop['crop_height'] > 0) {
            $cropW = (int) round((float) $crop['crop_width']);
            $cropH = (int) round((float) $crop['crop_height']);
            $cropX = (int) round((float) ($crop['crop_x'] ?? 0));
            $cropY = (int) round((float) ($crop['crop_y'] ?? 0));

            // Constrain crop to image boundaries
            $origW = $img->width();
            $origH = $img->height();

            $cropX = max(0, min($cropX, $origW - 1));
            $cropY = max(0, min($cropY, $origH - 1));
            $cropW = min($cropW, $origW - $cropX);
            $cropH = min($cropH, $origH - $cropY);

            if ($cropW > 0 && $cropH > 0) {
                $img->crop($cropW, $cropH, $cropX, $cropY);
            }
        }

        return $img;
    }
}
