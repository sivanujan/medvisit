<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\SampleMailFactory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class EmailPreviewController extends Controller
{
    /**
     * Display the email template preview dashboard.
     */
    public function index(Request $request): Response
    {
        $allTemplates = SampleMailFactory::allTemplates();
        $selectedKey = (string) $request->query('template', 'auth_registration_otp');

        if (! array_key_exists($selectedKey, $allTemplates)) {
            $selectedKey = 'auth_registration_otp';
        }

        $templateList = [];
        foreach ($allTemplates as $key => $info) {
            $templateList[] = array_merge(['key' => $key], $info);
        }

        // Group templates by category
        $categories = [];
        foreach ($templateList as $item) {
            $cat = $item['category'];
            $categories[$cat][] = $item;
        }

        $currentUser = Auth::user();

        return Inertia::render('SuperAdmin/EmailPreviews/Index', [
            'templates' => $templateList,
            'categories' => $categories,
            'selectedKey' => $selectedKey,
            'selectedTemplate' => array_merge(['key' => $selectedKey], $allTemplates[$selectedKey]),
            'currentUserEmail' => $currentUser?->email ?? 'admin@medvisit.lk',
            'mailConfig' => [
                'mailer' => config('mail.default', 'smtp'),
                'logo_url' => config('medvisit.mail.logo_url'),
                'has_logo_env' => ! empty(config('medvisit.mail.logo_url')),
            ],
        ]);
    }

    /**
     * Render the selected email template inside an iframe.
     */
    public function renderPreview(Request $request): HttpResponse
    {
        $templateKey = (string) $request->query('template', 'auth_registration_otp');
        $mode = (string) $request->query('mode', 'html'); // 'html' or 'text'
        $isDark = $request->boolean('dark', false);

        $allTemplates = SampleMailFactory::allTemplates();
        if (! array_key_exists($templateKey, $allTemplates)) {
            return response('Email template not found', 404);
        }

        try {
            $mailable = SampleMailFactory::create($templateKey);

            if ($mode === 'text') {
                if (method_exists($mailable, 'textView')) {
                    $content = $mailable->content();
                    $textOutput = view($mailable->textView(), $content->with)->render();
                } else {
                    $textOutput = strip_tags($mailable->render());
                }

                return response($textOutput, 200, [
                    'Content-Type' => 'text/plain; charset=utf-8',
                    'X-Frame-Options' => 'SAMEORIGIN',
                ]);
            }

            // HTML Mode
            $renderedHtml = $mailable->render();

            if ($isDark) {
                // Inject dark mode simulation CSS into the rendered HTML head
                $darkModeOverride = <<<'CSS'
                <style type="text/css">
                    body, .bg-body { background-color: #0F172A !important; }
                    .content-card { background-color: #1E293B !important; border-color: #334155 !important; }
                    h1, h2, h3, .text-main, strong { color: #F8FAFC !important; }
                    p, .text-body { color: #CBD5E1 !important; }
                    .info-box { background-color: #0F172A !important; border-color: #334155 !important; }
                    .info-box td { color: #E2E8F0 !important; border-color: #334155 !important; }
                    .footer-text { color: #94A3B8 !important; }
                </style>
CSS;
                $renderedHtml = str_replace('</head>', $darkModeOverride.'</head>', $renderedHtml);
            }

            return response($renderedHtml, 200, [
                'Content-Type' => 'text/html; charset=utf-8',
                'X-Frame-Options' => 'SAMEORIGIN',
            ]);
        } catch (Throwable $e) {
            $errorHtml = '<div style="font-family: sans-serif; padding: 24px; color: #DC2626; background: #FEF2F2; border-radius: 8px;">'
                .'<h3 style="margin-top:0;">Error Rendering Email Preview</h3>'
                .'<p><strong>'.htmlspecialchars($e->getMessage()).'</strong></p>'
                .'<pre style="font-size: 12px; color: #7F1D1D; overflow: auto;">'.htmlspecialchars($e->getTraceAsString()).'</pre>'
                .'</div>';

            return response($errorHtml, 500, ['Content-Type' => 'text/html; charset=utf-8']);
        }
    }

    /**
     * Dispatch a test email with mock data to the administrator.
     */
    public function sendTest(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'template' => ['required', 'string'],
            'recipient_email' => ['nullable', 'email'],
        ]);

        $templateKey = $validated['template'];
        $allTemplates = SampleMailFactory::allTemplates();

        if (! array_key_exists($templateKey, $allTemplates)) {
            return back()->with('error', 'Invalid email template selected.');
        }

        $recipientEmail = ! empty($validated['recipient_email'])
            ? $validated['recipient_email']
            : (Auth::user()?->email ?? 'admin@medvisit.lk');

        try {
            $mailable = SampleMailFactory::create($templateKey);
            Mail::to($recipientEmail)->send($mailable);

            $templateName = $allTemplates[$templateKey]['name'];

            return back()->with('success', "Test email '{$templateName}' successfully dispatched to {$recipientEmail}.");
        } catch (Throwable $e) {
            return back()->with('error', "Failed to send test email: {$e->getMessage()}");
        }
    }
}
