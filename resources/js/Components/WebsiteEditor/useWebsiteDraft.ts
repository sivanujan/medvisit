import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import type { SiteLook, SiteSection } from '@/Components/ClinicSite/types';

export interface ChecklistItem {
    key: string;
    label: string;
    ok: boolean;
    blocking: boolean;
    hint: string;
}

export interface SiteStatus {
    is_published: boolean;
    published_at: string | null;
    change_count: number;
    checklist: ChecklistItem[];
}

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface Snapshot {
    sections: SiteSection[];
    look: SiteLook;
}

const AUTOSAVE_MS = 900;
const HISTORY_LIMIT = 50;

/**
 * Draft state for the website editor: every change is autosaved to the draft (never the
 * live site), the last changes can be undone, and leaving with unsaved edits asks first.
 */
export function useWebsiteDraft(initial: Snapshot, initialStatus: SiteStatus) {
    const [state, setState] = useState<Snapshot>(initial);
    const [status, setStatus] = useState<SiteStatus>(initialStatus);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const history = useRef<Snapshot[]>([]);
    const timer = useRef<number>();
    const latest = useRef(state);
    latest.current = state;

    const save = useCallback(async (snap: Snapshot) => {
        setSaveState('saving');
        try {
            const { data } = await axios.put('/website/sections', { sections: snap.sections, look: snap.look }, {
                headers: { Accept: 'application/json' },
            });
            setStatus(data.status);
            setSavedAt(data.saved_at);
            setSaveState('saved');
        } catch {
            setSaveState('error');
        }
    }, []);

    const schedule = useCallback(() => {
        setSaveState('pending');
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => save(latest.current), AUTOSAVE_MS);
    }, [save]);

    const lastKey = useRef<string | null>(null);
    const lastTime = useRef(0);

    /**
     * Apply a change and remember the previous state for Undo. Rapid edits with the same
     * `mergeKey` (typing in one field) become a single undo step.
     */
    const update = useCallback(
        (fn: (prev: Snapshot) => Snapshot, mergeKey?: string) => {
            const now = Date.now();
            const merge = !!mergeKey && mergeKey === lastKey.current && now - lastTime.current < 1500;
            lastKey.current = mergeKey ?? null;
            lastTime.current = now;
            setState((prev) => {
                if (!merge) history.current = [...history.current.slice(-HISTORY_LIMIT + 1), prev];
                return fn(prev);
            });
            schedule();
        },
        [schedule],
    );

    const undo = useCallback(() => {
        const prev = history.current.pop();
        if (!prev) return;
        setState(prev);
        schedule();
    }, [schedule]);

    const flush = useCallback(async () => {
        window.clearTimeout(timer.current);
        await save(latest.current);
    }, [save]);

    // Unsaved-change guard: browser close/reload and in-app navigation.
    const dirty = saveState === 'pending' || saveState === 'saving' || saveState === 'error';
    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        const removeRouterGuard = router.on('before', (event) => {
            const url = event.detail.visit.url;
            if (url.pathname === window.location.pathname) return;
            if (!window.confirm('Your latest changes are still saving. Leave anyway?')) event.preventDefault();
        });
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            removeRouterGuard();
        };
    }, [dirty]);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    return {
        sections: state.sections,
        look: state.look,
        status,
        setStatus,
        saveState,
        savedAt,
        update,
        undo,
        canUndo: history.current.length > 0,
        flush,
    };
}
