/**
 * Reusable motion configuration and animation variants for MedVisit.
 * Calm, smooth, premium healthcare SaaS transitions.
 * Fully respects reduced-motion preferences.
 */

export const EASING = [0.16, 1, 0.3, 1] as const; // Premium spring-like easeOut
export const DURATION_FAST = 0.2;
export const DURATION_NORMAL = 0.3;
export const DURATION_SLOW = 0.45;

export const createStaggerContainer = (staggerDelay = 0.06, delayChildren = 0.02, reducedMotion = false) => ({
    hidden: { opacity: reducedMotion ? 1 : 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: reducedMotion ? 0 : staggerDelay,
            delayChildren: reducedMotion ? 0 : delayChildren,
        },
    },
});

export const createFadeInUp = (distance = 12, duration = DURATION_NORMAL, reducedMotion = false) => ({
    hidden: {
        opacity: 0,
        y: reducedMotion ? 0 : distance,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: reducedMotion ? 0.01 : duration,
            ease: EASING,
        },
    },
});

export const createFadeInScale = (fromScale = 0.96, duration = DURATION_NORMAL, reducedMotion = false) => ({
    hidden: {
        opacity: 0,
        scale: reducedMotion ? 1 : fromScale,
    },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: reducedMotion ? 0.01 : duration,
            ease: EASING,
        },
    },
});

export const modalBackdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalPanelVariants = (reducedMotion = false) => ({
    hidden: {
        opacity: 0,
        scale: reducedMotion ? 1 : 0.96,
        y: reducedMotion ? 0 : 8,
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            damping: 28,
            stiffness: 350,
        },
    },
    exit: {
        opacity: 0,
        scale: reducedMotion ? 1 : 0.96,
        y: reducedMotion ? 0 : 6,
        transition: { duration: 0.15, ease: EASING },
    },
});
