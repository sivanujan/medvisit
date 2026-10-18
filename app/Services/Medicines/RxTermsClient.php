<?php

declare(strict_types=1);

namespace App\Services\Medicines;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RxTermsClient
{
    protected string $baseUrl = 'https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search';

    /**
     * Search RxTerms API with caching (7 days).
     *
     * @return array{
     *     total: int,
     *     names: array<string>,
     *     extra_fields: array<string, mixed>,
     *     display: array<mixed>
     * }
     */
    public function search(string $term, int $maxList = 50): array
    {
        $term = trim($term);
        if ($term === '') {
            return [
                'total' => 0,
                'names' => [],
                'extra_fields' => [],
                'display' => [],
                'error' => null,
            ];
        }

        $cacheKey = 'rxterms_search_v2_'.md5(strtolower($term).'_'.$maxList);
        $cached = Cache::get($cacheKey);
        if (is_array($cached) && empty($cached['error'])) {
            return $cached;
        }

        try {
            $response = Http::timeout(15)
                ->retry(2, 200, throw: false)
                ->get($this->baseUrl, [
                    'terms' => $term,
                    'ef' => 'STRENGTHS_AND_FORMS,RXCUIS,SXDG_RXCUI',
                    'maxList' => $maxList,
                ]);

            if ($response->successful()) {
                $json = $response->json();
                if (is_array($json) && count($json) >= 3) {
                    $result = [
                        'total' => (int) ($json[0] ?? 0),
                        'names' => (array) ($json[1] ?? []),
                        'extra_fields' => (array) ($json[2] ?? []),
                        'display' => (array) ($json[3] ?? []),
                        'error' => null,
                    ];

                    Cache::put($cacheKey, $result, now()->addDays(7));

                    return $result;
                }

                $errorMsg = 'RxTerms API returned unexpected response format.';
            } else {
                $errorMsg = "RxTerms API HTTP error {$response->status()}: {$response->body()}";
            }

            Log::warning('RxTerms API search non-success: '.$errorMsg, [
                'term' => $term,
            ]);

            return [
                'total' => 0,
                'names' => [],
                'extra_fields' => [],
                'display' => [],
                'error' => $errorMsg,
            ];
        } catch (\Throwable $e) {
            Log::error('RxTerms API request failed: '.$e->getMessage(), [
                'term' => $term,
            ]);

            return [
                'total' => 0,
                'names' => [],
                'extra_fields' => [],
                'display' => [],
                'error' => $e->getMessage(),
            ];
        }
    }
}
