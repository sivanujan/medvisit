<?php

declare(strict_types=1);

namespace App\Mail\Enums;

enum MailSenderType: string
{
    case Verify = 'verify';
    case Notifications = 'notifications';
    case Hello = 'hello';
}
