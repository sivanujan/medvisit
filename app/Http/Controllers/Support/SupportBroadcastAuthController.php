<?php

declare(strict_types=1);

namespace App\Http\Controllers\Support;

use App\Http\Controllers\Controller;
use App\Models\SupportConversation;
use App\Services\SupportChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Pusher\Pusher;

class SupportBroadcastAuthController extends Controller
{
    public function __construct(
        protected SupportChatService $chatService,
    ) {}

    /**
     * Authenticate private channels for guests, clinic users, and admins.
     */
    public function authenticate(Request $request): Response|JsonResponse
    {
        $channelName = (string) $request->input('channel_name');
        $socketId = (string) $request->input('socket_id');

        if (empty($channelName) || empty($socketId)) {
            return response()->json(['error' => 'Missing channel_name or socket_id'], 400);
        }

        $user = $request->user();
        $isAuthorized = false;

        $cleanChannel = (string) preg_replace('/^private-/', '', $channelName);

        if ($cleanChannel === 'support.inbox') {
            if ($user && $user->hasRole('super_admin')) {
                $isAuthorized = true;
            }
        } elseif (str_starts_with($cleanChannel, 'support.conversation.')) {
            $publicId = substr($cleanChannel, strlen('support.conversation.'));
            $conversation = SupportConversation::where('public_id', $publicId)->first();

            if ($conversation) {
                $visitorToken = $request->cookie('support_visitor_token')
                    ?: $request->header('X-Visitor-Token')
                    ?: $request->input('visitor_token');

                $isAuthorized = $this->chatService->authorizeConversation($conversation, $user, $visitorToken);
            }
        }

        if (! $isAuthorized) {
            return response()->json(['error' => 'Unauthorized channel access'], 403);
        }

        $reverbKey = (string) (config('broadcasting.connections.reverb.key') ?? config('reverb.apps.apps.0.key'));
        $reverbSecret = (string) (config('broadcasting.connections.reverb.secret') ?? config('reverb.apps.apps.0.secret'));
        $reverbAppId = (string) (config('broadcasting.connections.reverb.app_id') ?? config('reverb.apps.apps.0.app_id'));

        $pusher = new Pusher($reverbKey, $reverbSecret, $reverbAppId);
        $auth = $pusher->authorizeChannel($channelName, $socketId);

        return response($auth, 200, ['Content-Type' => 'application/json']);
    }
}
