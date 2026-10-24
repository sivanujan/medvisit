<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Support\ClinicWebsite;
use App\Support\SiteKit;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * 1200×630 link-preview image (og:image) built from the clinic's own name, city,
 * brand colour and logo. Cached per clinic and rebuilt when any of those change.
 */
class ClinicShareImageController extends Controller
{
    private const W = 1200;

    private const H = 630;

    public function show(): Response
    {
        $tenant = tenant();
        $look = ClinicWebsite::liveLook($tenant);
        $color = $look['brand_color'] ?? (SiteKit::THEME_COLORS[$look['theme']]['primary'] ?? '#1E6FD9');
        $name = ClinicWebsite::clinicName($tenant);
        $city = ClinicWebsite::city($tenant);
        $logoPath = $this->localLogoPath();

        $key = 'share-images/'.$tenant->id.'-'.md5(implode('|', [$name, $city, $color, (string) $logoPath, '1'])).'.png';
        $disk = Storage::disk('local');

        if (! $disk->exists($key)) {
            $disk->put($key, $this->render($name, $city, $color, $logoPath));
        }

        return response($disk->get($key), 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    private function render(string $name, string $city, string $hex, ?string $logoPath): string
    {
        $img = imagecreatetruecolor(self::W, self::H);
        [$r, $g, $b] = sscanf($hex, '#%02x%02x%02x');

        // Brand colour background with a slightly darker lower band.
        imagefill($img, 0, 0, imagecolorallocate($img, $r, $g, $b));
        imagefilledrectangle($img, 0, 470, self::W, self::H, imagecolorallocate($img, (int) ($r * 0.82), (int) ($g * 0.82), (int) ($b * 0.82)));

        $white = imagecolorallocate($img, 255, 255, 255);
        $soft = imagecolorallocatealpha($img, 255, 255, 255, 30);
        $bold = base_path('vendor/dompdf/dompdf/lib/fonts/DejaVuSans-Bold.ttf');
        $regular = base_path('vendor/dompdf/dompdf/lib/fonts/DejaVuSans.ttf');

        $x = 90;
        if ($logoPath !== null && ($logo = @imagecreatefromstring((string) file_get_contents($logoPath))) !== false) {
            $size = 150;
            $card = imagecolorallocate($img, 255, 255, 255);
            imagefilledrectangle($img, $x, 90, $x + $size, 90 + $size, $card);
            imagecopyresampled($img, $logo, $x + 12, 102, 0, 0, $size - 24, $size - 24, imagesx($logo), imagesy($logo));
            imagedestroy($logo);
        }

        $nameSize = mb_strlen($name) > 26 ? 52 : 64;
        foreach ($this->wrap($name, $bold, $nameSize, self::W - 180) as $i => $line) {
            imagettftext($img, $nameSize, 0, $x, 330 + $i * (int) ($nameSize * 1.3), $white, $bold, $line);
        }
        if ($city !== '') {
            imagettftext($img, 30, 0, $x, 440, $soft, $regular, $city);
        }
        imagettftext($img, 30, 0, $x, 565, $white, $bold, 'Book a channeling token online');

        ob_start();
        imagepng($img);
        imagedestroy($img);

        return (string) ob_get_clean();
    }

    /**
     * @return array<int, string> at most two lines
     */
    private function wrap(string $text, string $font, int $size, int $maxWidth): array
    {
        $lines = [''];
        foreach (preg_split('/\s+/', $text) ?: [] as $word) {
            $try = trim(end($lines).' '.$word);
            $box = imagettfbbox($size, 0, $font, $try);
            if ($box !== false && ($box[2] - $box[0]) > $maxWidth && end($lines) !== '') {
                $lines[] = $word;
            } else {
                $lines[count($lines) - 1] = $try;
            }
        }

        return array_slice($lines, 0, 2);
    }

    /**
     * The clinic's PNG/WebP logo when it is stored on a local disk (remote logos are skipped).
     */
    private function localLogoPath(): ?string
    {
        $tenant = tenant();
        $diskName = config('filesystems.media_disk', env('MEDIA_DISK', 'public'));
        $disk = Storage::disk($diskName);
        foreach ([$tenant->logo_png_path, $tenant->logo_path] as $path) {
            if ($path && method_exists($disk, 'path') && config("filesystems.disks.{$diskName}.driver") === 'local' && $disk->exists($path)) {
                return $disk->path($path);
            }
        }

        return null;
    }
}
