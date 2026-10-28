<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\Demo\DemoModeService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceDemoGuards
{
    public function __construct(
        protected DemoModeService $demoService
    ) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = $this->demoService->currentTenant();

        // If not in a demo tenant, pass straight through
        if (! $tenant || ! $tenant->is_demo) {
            return $next($request);
        }

        // 1. Guard against destructive modifications
        if ($this->demoService->isRestrictedRequest($request)) {
            $message = $this->demoService->getRestrictionMessage();

            if ($request->expectsJson() || $request->isXmlHttpRequest()) {
                return response()->json([
                    'error' => $message,
                    'is_demo' => true,
                ], 403);
            }

            return redirect()->back()->with('error', $message);
        }

        $response = $next($request);

        // 2. Set search engine shields
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');

        return $response;
    }
}
