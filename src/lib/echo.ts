import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

window.Pusher = Pusher;

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const authUrl = apiUrl.replace(/\/v1\/?$/, '') + '/broadcasting/auth';

/**
 * Creates a fresh Echo instance with the CURRENT auth token from localStorage.
 * This must be called every time you need to subscribe to private channels,
 * because ES modules are cached and the token at module-load time may be stale.
 */
export function createEcho(): Echo<any> {
    const token = localStorage.getItem('sf_token');

    return new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
        wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: authUrl,
        auth: {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        },
    });
}

// Legacy export for backward compatibility (still evaluates token at import time)
export const echo = createEcho();
