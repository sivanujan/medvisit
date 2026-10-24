<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'textlk' => [
        'mode' => env('TEXTLK_MODE', 'oauth'),
        'api_token' => env('TEXTLK_API_TOKEN'),
        'sender_id' => env('TEXTLK_SENDER_ID', 'MedVisit'),
        'api_url' => env('TEXTLK_API_URL', 'https://app.text.lk/api/v3'),
        'http_url' => env('TEXTLK_HTTP_URL', 'https://app.text.lk/api/http'),
    ],

    'whatsapp' => [
        'api_version' => env('WHATSAPP_API_VERSION', 'v25.0'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'business_account_id' => env('WHATSAPP_BUSINESS_ACCOUNT_ID'),
        'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
        'app_secret' => env('WHATSAPP_APP_SECRET'),
        'verify_token' => env('WHATSAPP_VERIFY_TOKEN'),
        'business_number' => env('WHATSAPP_BUSINESS_NUMBER'),
        'send_confirmation' => filter_var(env('WHATSAPP_SEND_CONFIRMATION', false), FILTER_VALIDATE_BOOLEAN),
    ],

    'paymentslk' => [
        'mode' => env('PAYMENTSLK_MODE', 'sandbox'),
        'secret_key' => env('PAYMENTSLK_SECRET_KEY'),
        'merchant_id' => env('PAYMENTSLK_MERCHANT_ID'),
        'webhook_secret' => env('PAYMENTSLK_WEBHOOK_SECRET'),
        'base_url' => env('PAYMENTSLK_BASE_URL', 'https://api.payments.lk'),
        'return_base_url' => env('PAYMENTSLK_RETURN_BASE_URL'),
    ],

    'turnstile' => [
        'site_key' => env('TURNSTILE_SITE_KEY', '1x00000000000000000000AA'),
        'secret_key' => env('TURNSTILE_SECRET_KEY', '1x0000000000000000000000000000000AA'),
    ],

    'openrouter' => [
        'api_key' => env('OPENROUTER_API_KEY'),
        'model' => env('OPENROUTER_MODEL', 'meta-llama/llama-3.3-70b-instruct:free'),
        'base_url' => env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
    ],

    'telegram' => [
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
        'chat_id' => env('TELEGRAM_CHAT_ID'),
    ],

];
