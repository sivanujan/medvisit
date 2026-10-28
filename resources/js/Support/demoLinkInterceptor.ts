/**
 * Intercept real-call, real-chat, and real-email links in the demo sandbox
 * to prevent visitors from opening external dialers, WhatsApp chats, or mail clients.
 */

export function showDemoToast(message: string = 'Calling is disabled in the demo') {
    if (typeof document === 'undefined') return;

    const existing = document.getElementById('demo-action-toast');
    if (existing) {
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'demo-action-toast';
    toast.setAttribute('role', 'alert');
    toast.className =
        'fixed bottom-6 right-6 z-[999999] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/95 text-white border border-amber-500/50 shadow-2xl backdrop-blur-md text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-200';
    toast.innerHTML = `
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold shrink-0">
            ⚠️
        </span>
        <div class="flex-1 text-slate-100">${message}</div>
        <button type="button" aria-label="Close" class="text-slate-400 hover:text-white ml-2 text-base font-bold">&times;</button>
    `;

    toast.querySelector('button')?.addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.isConnected) {
            toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px)';
            setTimeout(() => toast.remove(), 250);
        }
    }, 4000);
}

export function initDemoLinkInterceptor(): void {
    if (typeof window === 'undefined') return;

    // Attach click listener on capture phase to intercept before any other handler
    document.addEventListener(
        'click',
        (e: MouseEvent) => {
            const anchor = (e.target as HTMLElement)?.closest('a');
            if (!anchor) return;

            const href = anchor.getAttribute('href') || '';
            const hostname = window.location.hostname;
            const isDemo =
                hostname.startsWith('demo.') ||
                hostname.includes('demo') ||
                document.body.getAttribute('data-is-demo') === 'true' ||
                (window as any).__MEDVISIT_IS_DEMO__ === true;

            if (!isDemo) return;

            if (href.startsWith('tel:') || href.includes('wa.me') || href.includes('whatsapp.com') || href.startsWith('mailto:')) {
                e.preventDefault();
                e.stopPropagation();
                showDemoToast('Calling is disabled in the demo');
            }
        },
        true
    );
}
