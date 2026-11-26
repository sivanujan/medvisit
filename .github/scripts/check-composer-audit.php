<?php

declare(strict_types=1);

$auditFile = $argv[1] ?? 'composer-audit.json';
$allowlistFile = $argv[2] ?? __DIR__.'/../security/composer-audit-allowlist.json';

if (! file_exists($auditFile)) {
    echo "No audit file found at {$auditFile}. Skipping check.\n";
    exit(0);
}

$raw = file_get_contents($auditFile);
$data = json_decode($raw, true);

if (! is_array($data) || empty($data['advisories'])) {
    echo "✅ No vulnerabilities reported by Composer.\n";
    exit(0);
}

// Load allowlist if present
$allowlist = [];
if (file_exists($allowlistFile)) {
    $allowlistRaw = file_get_contents($allowlistFile);
    $allowlistData = json_decode($allowlistRaw, true);
    if (is_array($allowlistData) && ! empty($allowlistData['advisories'])) {
        $allowlist = $allowlistData['advisories'];
    }
}

$today = date('Y-m-d');
$hasBlockingVulnerability = false;

foreach ($data['advisories'] as $packageName => $advisories) {
    if (! is_array($advisories)) {
        continue;
    }

    foreach ($advisories as $advisory) {
        $rawSeverity = $advisory['severity'] ?? null;
        $severityStr = is_string($rawSeverity) ? trim(strtolower($rawSeverity)) : '';
        $title = $advisory['title'] ?? 'Security advisory';
        $cve = $advisory['cve'] ?? 'N/A';
        $advisoryId = $advisory['advisoryId'] ?? '';

        // Unrated / unknown severity is treated as high (blocking) per security policy
        $isUnknownSeverity = ($severityStr === '' || $severityStr === 'unknown');
        $isHighOrCritical = ($severityStr === 'high' || $severityStr === 'critical');
        $isBlockingSeverity = $isHighOrCritical || $isUnknownSeverity;

        $displaySeverity = $isUnknownSeverity ? 'unrated (treated as high)' : $severityStr;

        // Check if advisory is covered by an active (unexpired) allowlist entry
        $allowlistedEntry = null;
        foreach ($allowlist as $entry) {
            $entryId = $entry['id'] ?? $entry['cve'] ?? '';
            $entryPackage = $entry['package'] ?? '';

            $idMatches = (! empty($entryId)) && (
                strcasecmp($entryId, (string) $cve) === 0 ||
                strcasecmp($entryId, (string) $advisoryId) === 0
            );

            $packageMatches = empty($entryPackage) || (strcasecmp($entryPackage, $packageName) === 0);

            if ($idMatches && $packageMatches) {
                $allowlistedEntry = $entry;
                break;
            }
        }

        if ($allowlistedEntry !== null) {
            $reason = $allowlistedEntry['reason'] ?? 'Accepted risk';
            $expiresAt = $allowlistedEntry['expires_at'] ?? '9999-12-31';

            if ($expiresAt >= $today) {
                echo "::notice::[ALLOWLISTED] {$packageName}: {$title} ({$cve} / {$advisoryId}) - Reason: {$reason} (Expires: {$expiresAt})\n";
                continue;
            }

            echo "::error::[EXPIRED ALLOWLIST EXEMPTION: {$expiresAt}] {$packageName}: {$title} ({$cve} / {$advisoryId}) - Reason: {$reason}\n";
            $hasBlockingVulnerability = true;
            continue;
        }

        if ($isBlockingSeverity) {
            echo "::error::[{$displaySeverity}] {$packageName}: {$title} ({$cve} / {$advisoryId})\n";
            $hasBlockingVulnerability = true;
        } else {
            echo "::warning::[{$displaySeverity}] {$packageName}: {$title} ({$cve} / {$advisoryId})\n";
        }
    }
}

if ($hasBlockingVulnerability) {
    echo "❌ Blocking vulnerabilities (high, critical, or unrated) detected in Composer dependencies!\n";
    exit(1);
}

echo "✅ Composer audit passed: No unaccepted blocking vulnerabilities detected.\n";
exit(0);
