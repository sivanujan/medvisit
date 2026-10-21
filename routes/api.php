<?php

declare(strict_types=1);

use App\Http\Controllers\Api\PublicDemoRequestController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API Routes
|--------------------------------------------------------------------------
|
| Stateless endpoints accessible by marketing sites (medvisit.lk Cloudflare Pages)
| and third-party integrations. Protected by rate limiting and CORS.
|
*/

Route::middleware('throttle:5,1')->group(function () {
    Route::post('/leads/request-demo', [PublicDemoRequestController::class, 'store'])
        ->name('api.leads.request_demo');
});
