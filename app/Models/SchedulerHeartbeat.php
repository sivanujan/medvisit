<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class SchedulerHeartbeat extends Model
{
    protected $primaryKey = 'command';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'command',
        'last_started_at',
        'last_finished_at',
        'duration_ms',
        'status',
        'last_output',
    ];

    protected $casts = [
        'last_started_at' => 'datetime',
        'last_finished_at' => 'datetime',
        'duration_ms' => 'integer',
    ];

    public static function ping(): self
    {
        return self::updateOrCreate(
            ['command' => 'schedule:heartbeat'],
            [
                'last_started_at' => Carbon::now(),
                'last_finished_at' => Carbon::now(),
                'duration_ms' => 5,
                'status' => 'success',
                'last_output' => 'Heartbeat ok',
            ]
        );
    }
}
