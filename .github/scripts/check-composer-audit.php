<?php

declare(strict_types=1);

$file = $argv[1] ?? 'composer-audit.json';

if (! file_exists($file)) {
    echo "No audit file found at {$file}. Skipping check.\n";
    exit(0);
}

$raw = file_get_contents($file);
$data = json_decode($raw, true);

if (! is_array($data) || empty($data['advisories'])) {
    echo "No vulnerabilities reported by Composer.\n";
    exit(0);
}

$hasHighOrCritical = false;

foreach ($data['advisories'] as $packageName => $advisories) {
    if (! is_array($advisories)) {
        continue;
    }

    foreach ($advisories as $advisory) {
        $severity = strtolower((string) ($advisory['severity'] ?? ''));
        $title = $advisory['title'] ?? 'Security advisory';
        $cve = $advisory['cve'] ?? 'N/A';

        if ($severity === 'high' || $severity === 'critical') {
            echo "::error::[{$severity}] {$packageName}: {$title} ({$cve})\n";
            $hasHighOrCritical = true;
        } else {
            echo "::warning::[{$severity}] {$packageName}: {$title} ({$cve})\n";
        }
    }
}

if ($hasHighOrCritical) {
    echo "❌ High or Critical vulnerabilities detected in Composer dependencies!\n";
    exit(1);
}

echo "✅ Composer audit passed: No high or critical vulnerabilities detected.\n";
exit(0);
