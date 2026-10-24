import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo?: Echo<'reverb'>;
    }
}

if (typeof window !== 'undefined') {
    window.Pusher = Pusher;
}

export interface EchoOptions {
    key?: string;
    host?: string;
    port?: number | string;
    scheme?: string;
    visitorToken?: string;
    authEndpoint?: string;
}

let echoInstance: Echo<'reverb'> | null = null;

export function getEcho(options?: EchoOptions): Echo<'reverb'> | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (echoInstance) {
        return echoInstance;
    }

    const reverbKey =
        options?.key ||
        import.meta.env.VITE_REVERB_APP_KEY ||
        'medvisit-reverb-key';
    const host =
        options?.host ||
        import.meta.env.VITE_REVERB_HOST ||
        window.location.hostname;
    const port =
        Number(options?.port || import.meta.env.VITE_REVERB_PORT || 8080);
    const scheme =
        options?.scheme ||
        import.meta.env.VITE_REVERB_SCHEME ||
        (window.location.protocol === 'https:' ? 'https' : 'http');
    const authEndpoint = options?.authEndpoint || '/support/broadcasting/auth';

    try {
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: reverbKey,
            wsHost: host,
            wsPort: port,
            wssPort: port,
            forceTLS: scheme === 'https',
            enabledTransports: ['ws', 'wss'],
            authEndpoint,
            auth: {
                headers: options?.visitorToken
                    ? { 'X-Visitor-Token': options.visitorToken }
                    : {},
            },
        });

        window.Echo = echoInstance;
        return echoInstance;
    } catch (e) {
        console.warn('[MedVisit Echo] Failed to initialize WebSocket connection:', e);
        return null;
    }
}
