<?php

declare(strict_types=1);

namespace Tests\Unit\Security;

use Tests\TestCase;

class ComposerAuditCheckTest extends TestCase
{
    private string $tempDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tempDir = sys_get_temp_dir().'/composer_audit_test_'.uniqid();
        mkdir($this->tempDir, 0777, true);
    }

    protected function tearDown(): void
    {
        if (is_dir($this->tempDir)) {
            $files = glob($this->tempDir.'/*');
            foreach ($files as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
            rmdir($this->tempDir);
        }
        parent::tearDown();
    }

    private function runCheckScript(string $auditJson, ?string $allowlistJson = null): array
    {
        $auditFile = $this->tempDir.'/audit.json';
        file_put_contents($auditFile, $auditJson);

        $allowlistFile = $this->tempDir.'/allowlist.json';
        if ($allowlistJson !== null) {
            file_put_contents($allowlistFile, $allowlistJson);
        }

        $scriptPath = dirname(__DIR__, 3).'/.github/scripts/check-composer-audit.php';
        $cmd = escapeshellarg(PHP_BINARY).' '.escapeshellarg($scriptPath).' '.escapeshellarg($auditFile);
        if ($allowlistJson !== null) {
            $cmd .= ' '.escapeshellarg($allowlistFile);
        }

        exec($cmd, $output, $exitCode);

        return [
            'exitCode' => $exitCode,
            'output' => implode("\n", $output),
        ];
    }

    public function test_passes_when_no_advisories_present(): void
    {
        $auditJson = json_encode(['advisories' => []]);
        $result = $this->runCheckScript($auditJson);

        $this->assertSame(0, $result['exitCode']);
        $this->assertStringContainsString('No vulnerabilities reported', $result['output']);
    }

    public function test_fails_on_unrated_unknown_severity_advisory(): void
    {
        $auditJson = json_encode([
            'advisories' => [
                'symfony/http-foundation' => [
                    [
                        'advisoryId' => 'PKSA-test-1234',
                        'cve' => 'CVE-2026-99999',
                        'title' => 'Test unrated advisory',
                        'severity' => '',
                    ],
                ],
            ],
        ]);

        $result = $this->runCheckScript($auditJson);

        $this->assertSame(1, $result['exitCode'], 'Unrated severity must fail the build');
        $this->assertStringContainsString('unrated (treated as high)', $result['output']);
        $this->assertStringContainsString('CVE-2026-99999', $result['output']);
    }

    public function test_fails_on_high_or_critical_severity_advisory(): void
    {
        $auditJson = json_encode([
            'advisories' => [
                'vendor/vulnerable' => [
                    [
                        'advisoryId' => 'PKSA-crit-1234',
                        'cve' => 'CVE-2026-88888',
                        'title' => 'Critical RCE advisory',
                        'severity' => 'critical',
                    ],
                ],
            ],
        ]);

        $result = $this->runCheckScript($auditJson);

        $this->assertSame(1, $result['exitCode'], 'Critical severity must fail the build');
        $this->assertStringContainsString('[critical]', $result['output']);
    }

    public function test_passes_when_blocking_advisory_is_allowlisted_with_future_expiry(): void
    {
        $auditJson = json_encode([
            'advisories' => [
                'symfony/http-foundation' => [
                    [
                        'advisoryId' => 'PKSA-test-5678',
                        'cve' => 'CVE-2026-99999',
                        'title' => 'Test unrated advisory with exception',
                        'severity' => '',
                    ],
                ],
            ],
        ]);

        $futureDate = date('Y-m-d', strtotime('+30 days'));
        $allowlistJson = json_encode([
            'advisories' => [
                [
                    'id' => 'CVE-2026-99999',
                    'package' => 'symfony/http-foundation',
                    'reason' => 'Reviewed: not applicable to MedVisit architecture',
                    'expires_at' => $futureDate,
                ],
            ],
        ]);

        $result = $this->runCheckScript($auditJson, $allowlistJson);

        $this->assertSame(0, $result['exitCode'], 'Allowlisted advisory with future expiry must pass');
        $this->assertStringContainsString('[ALLOWLISTED]', $result['output']);
        $this->assertStringContainsString('Reason: Reviewed', $result['output']);
    }

    public function test_fails_when_allowlist_entry_has_expired(): void
    {
        $auditJson = json_encode([
            'advisories' => [
                'symfony/http-foundation' => [
                    [
                        'advisoryId' => 'PKSA-test-9999',
                        'cve' => 'CVE-2026-99999',
                        'title' => 'Test expired advisory',
                        'severity' => '',
                    ],
                ],
            ],
        ]);

        $pastDate = date('Y-m-d', strtotime('-1 day'));
        $allowlistJson = json_encode([
            'advisories' => [
                [
                    'id' => 'CVE-2026-99999',
                    'package' => 'symfony/http-foundation',
                    'reason' => 'Temporary exception that has now expired',
                    'expires_at' => $pastDate,
                ],
            ],
        ]);

        $result = $this->runCheckScript($auditJson, $allowlistJson);

        $this->assertSame(1, $result['exitCode'], 'Expired allowlist exemption must fail the build');
        $this->assertStringContainsString('EXPIRED ALLOWLIST EXEMPTION', $result['output']);
    }

    public function test_low_severity_emits_warning_without_failing(): void
    {
        $auditJson = json_encode([
            'advisories' => [
                'vendor/package' => [
                    [
                        'advisoryId' => 'PKSA-low-1111',
                        'cve' => 'CVE-2026-11111',
                        'title' => 'Low severity issue',
                        'severity' => 'low',
                    ],
                ],
            ],
        ]);

        $result = $this->runCheckScript($auditJson);

        $this->assertSame(0, $result['exitCode'], 'Low severity without other issues should pass');
        $this->assertStringContainsString('::warning::[low]', $result['output']);
    }
}
