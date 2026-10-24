<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SupportConversation;
use App\Models\SupportMessage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SupportAiService
{
    /**
     * Generate an AI reply for a given conversation.
     *
     * @return array{content: string, needs_handoff: bool, handoff_reason: ?string}
     */
    public function generateReply(SupportConversation $conversation): array
    {
        $messages = $conversation->messages()
            ->orderBy('created_at', 'asc')
            ->take(12)
            ->get();

        $lastMessage = $messages->last();
        $lastText = $lastMessage ? mb_strtolower(trim($lastMessage->body)) : '';

        // Immediate check for explicit human request keywords
        if ($this->isExplicitHumanRequest($lastText)) {
            return [
                'content' => "I understand you'd like to speak with a human. I have notified our team right away! An agent will jump in shortly. If you're in a hurry, feel free to leave your WhatsApp number and we'll reach out directly.",
                'needs_handoff' => true,
                'handoff_reason' => 'user_requested_human',
            ];
        }

        $systemPrompt = $this->buildSystemPrompt($conversation);

        $chatPayload = [
            'model' => config('services.openrouter.model', 'deepseek/deepseek-chat'),
            'messages' => array_merge(
                [['role' => 'system', 'content' => $systemPrompt]],
                $messages->map(function (SupportMessage $m) {
                    $role = match ($m->sender_type) {
                        'ai' => 'assistant',
                        'admin' => 'assistant',
                        default => 'user',
                    };

                    return [
                        'role' => $role,
                        'content' => $m->body,
                    ];
                })->toArray()
            ),
            'max_tokens' => 450,
            'temperature' => 0.4,
        ];

        $apiKey = (string) config('services.openrouter.api_key');
        if (empty($apiKey)) {
            Log::warning('SupportAiService: OpenRouter API key missing.');

            return [
                'content' => 'Thank you for reaching out to MedVisit! Our support team has been notified and will reply shortly.',
                'needs_handoff' => true,
                'handoff_reason' => 'ai_service_unconfigured',
            ];
        }

        try {
            $response = Http::timeout(25)
                ->withHeaders([
                    'Authorization' => "Bearer {$apiKey}",
                    'Content-Type' => 'application/json',
                    'HTTP-Referer' => config('app.url', 'https://medvisit.lk'),
                    'X-Title' => 'MedVisit Support AI',
                ])
                ->post(rtrim(config('services.openrouter.base_url', 'https://openrouter.ai/api/v1'), '/').'/chat/completions', $chatPayload);

            if ($response->successful()) {
                $json = $response->json();
                $content = trim((string) ($json['choices'][0]['message']['content'] ?? ''));

                if (! empty($content)) {
                    $needsHandoff = str_contains($content, '[HANDOFF_REQUESTED]');
                    $cleanContent = trim(str_replace('[HANDOFF_REQUESTED]', '', $content));

                    return [
                        'content' => $cleanContent,
                        'needs_handoff' => $needsHandoff,
                        'handoff_reason' => $needsHandoff ? 'ai_initiated_handoff' : null,
                    ];
                }
            }

            Log::warning('SupportAiService OpenRouter error: '.$response->body());
        } catch (\Throwable $e) {
            Log::error('SupportAiService exception: '.$e->getMessage());
        }

        // Fallback if AI call fails
        return [
            'content' => "Thanks for messaging MedVisit! I'm forwarding your message to our human support team right now. We'll be with you in a moment.",
            'needs_handoff' => true,
            'handoff_reason' => 'api_error_fallback',
        ];
    }

    /**
     * Check if user message explicitly asks for a human or indicates urgency.
     */
    protected function isExplicitHumanRequest(string $text): bool
    {
        $patterns = [
            'talk to human',
            'speak with human',
            'real person',
            'human please',
            'call me',
            'phone number',
            'speak to an agent',
            'contact owner',
            'i want refund',
            'system down',
            'not working at all',
            'can i speak to someone',
        ];

        foreach ($patterns as $pattern) {
            if (str_contains($text, $pattern)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Build system prompt with domain knowledge and channel-specific context.
     */
    protected function buildSystemPrompt(SupportConversation $conversation): string
    {
        $isDashboard = $conversation->isDashboard();
        $clinicName = $conversation->tenant?->name ?? 'your clinic';

        $prompt = <<<'EOT'
You are the official MedVisit Support Assistant.
MedVisit is an intelligent Smart Clinic & OPD Token Management System designed specifically for healthcare clinics, OPDs, and dispensaries in Sri Lanka.

CORE KNOWLEDGE BASE:
- Pricing: LKR 5,000 per month (flat rate). Includes a 14-day free trial with zero credit card required.
- Key Capabilities:
  1. Live Patient Token Queue: Eliminates waiting room overcrowding, real-time token tracking.
  2. Thermal Token Printing: Supports standard ESC/POS 80mm and 58mm USB/LAN/Bluetooth receipt printers.
  3. Patient Notifications: Automated WhatsApp and SMS alerts keep patients updated so they don't have to wait inside the clinic.
  4. Doctor & Staff Dashboards: Doctor consultation screen, pharmacy dispension counter, reception check-in.
  5. Multi-Doctor & Multi-Counter: Full support for multiple doctors running parallel OPD sessions.
  6. Subdomain Access: Each clinic gets its own branded portal ({clinic}.medvisit.lk).
  7. High Reliability: Hosted on fast Singapore cloud infrastructure for sub-50ms latency across Sri Lanka.

STRICT BOUNDARIES:
- NEVER provide medical advice or drug prescriptions. MedVisit is practice management software only. If asked for medical advice, politely clarify: "MedVisit provides clinic queue software and cannot offer medical advice. Please consult a qualified doctor."
- NEVER reveal internal database details, customer passwords, or other clinics' private information.
- Keep responses friendly, concise, and helpful (2-4 short sentences or brief bullet points).
- If the user asks something you cannot answer, or asks for complex billing changes, custom integrations, or account cancellations, answer as best as possible and append "[HANDOFF_REQUESTED]" at the very end of your response so a human supervisor can assist.
EOT;

        if ($isDashboard) {
            $prompt .= "\n\nCONTEXT: The user is a logged-in clinic staff/doctor at '{$clinicName}'. Provide direct, step-by-step UI assistance (e.g., 'Go to Settings -> Doctors -> Add Doctor').";
        } else {
            $prompt .= "\n\nCONTEXT: The user is a visitor on the medvisit.lk website (prospective clinic owner/doctor). Be welcoming, emphasize how MedVisit saves receptionist time and eliminates queue chaos, and encourage them to try the 14-day free trial.";
        }

        return $prompt;
    }
}
