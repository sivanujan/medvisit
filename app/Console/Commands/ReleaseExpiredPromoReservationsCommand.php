<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Billing\PromoCodeService;
use Illuminate\Console\Command;

class ReleaseExpiredPromoReservationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'promo:release-expired-reservations';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Release expired promo code reservations older than 30 minutes';

    /**
     * Execute the console command.
     */
    public function handle(PromoCodeService $promoService): int
    {
        $count = $promoService->releaseExpiredReservations();
        $this->info("Released {$count} expired promo code reservation(s).");

        return Command::SUCCESS;
    }
}
