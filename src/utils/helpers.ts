/**
 * Utility functions for margins, debug mode, and standalone detection.
 */
export const DEBUG_MODE = (() => {
    if (typeof window === 'undefined') return false;
    return window.location.search.includes('debug');
})();

export const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone
);

export const getTopMargin = () => {
    if (typeof window === 'undefined') return 50;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        return isStandalone ? 60 : 10;
    }
    return 50;
};

export const getSafeBottom = () =>
    parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'
    );
