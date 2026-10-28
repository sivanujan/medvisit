<?php

declare(strict_types=1);

use App\Models\SupportConversation;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('support.conversation.{publicId}', function ($user, string $publicId) {
    if ($user->hasRole('super_admin')) {
        return true;
    }

    $conversation = SupportConversation::where('public_id', $publicId)->first();
    if (! $conversation) {
        return false;
    }

    $effectiveTenantId = $user->tenant_id ?? (function_exists('tenant') && tenant('id') ? tenant('id') : null);

    return (int) $conversation->user_id === (int) $user->id
        && (empty($conversation->tenant_id) || $conversation->tenant_id === $effectiveTenantId);
});

Broadcast::channel('support.inbox', function ($user) {
    return $user->hasRole('super_admin');
});
