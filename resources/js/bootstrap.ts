import axios from 'axios';
import { router } from '@inertiajs/react';
import { initDemoLinkInterceptor } from './Support/demoLinkInterceptor';

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Global 413 (Payload Too Large) and friendly network error interceptor
window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 413) {
            const friendlyMsg =
                'This file is too large. Please choose an image under 20 MB.';
            if (typeof error.response.data === 'string' || !error.response.data) {
                error.response.data = { message: friendlyMsg };
            } else if (!error.response.data.message) {
                error.response.data.message = friendlyMsg;
            }
        }
        return Promise.reject(error);
    }
);

// Catch 413 on direct Inertia visits/posts as well
if (typeof window !== 'undefined') {
    router.on('invalid', (event: any) => {
        if (event?.detail?.response?.status === 413) {
            event.preventDefault();
            alert('This file is too large. Please choose an image under 20 MB.');
        }
    });
}

initDemoLinkInterceptor();

