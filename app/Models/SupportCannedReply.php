<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupportCannedReply extends Model
{
    use HasFactory;

    protected $table = 'support_canned_replies';

    protected $fillable = [
        'title',
        'body',
    ];
}
