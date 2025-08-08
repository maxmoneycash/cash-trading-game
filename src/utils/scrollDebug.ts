/**
 * Scroll debugging utilities
 */

export interface ScrollInfo {
    elementId: string;
    scrollTop: number;
    scrollLeft: number;
    scrollHeight: number;
    scrollWidth: number;
    clientHeight: number;
    clientWidth: number;
    canScrollVertically: boolean;
    canScrollHorizontally: boolean;
    scrollPercentageY: number;
    scrollPercentageX: number;
}

/**
 * Test if an element can scroll
 */
export const canScroll = (element: HTMLElement): { vertical: boolean; horizontal: boolean } => {
    return {
        vertical: element.scrollHeight > element.clientHeight,
        horizontal: element.scrollWidth > element.clientWidth
    };
};

/**
 * Get detailed scroll information for an element
 */
export const getScrollInfo = (element: HTMLElement, elementId: string): ScrollInfo => {
    const scrollCapability = canScroll(element);

    return {
        elementId,
        scrollTop: element.scrollTop,
        scrollLeft: element.scrollLeft,
        scrollHeight: element.scrollHeight,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth,
        canScrollVertically: scrollCapability.vertical,
        canScrollHorizontally: scrollCapability.horizontal,
        scrollPercentageY: scrollCapability.vertical
            ? (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100
            : 0,
        scrollPercentageX: scrollCapability.horizontal
            ? (element.scrollLeft / (element.scrollWidth - element.clientWidth)) * 100
            : 0
    };
};

/**
 * Create a visual scroll indicator
 */
export const createScrollIndicator = (scrollInfo: ScrollInfo): string => {
    const verticalBar = scrollInfo.canScrollVertically
        ? `▓${'░'.repeat(9)}`.substring(0, 10 - Math.floor(scrollInfo.scrollPercentageY / 10))
        : 'No V-Scroll';

    return `${scrollInfo.elementId}: ${verticalBar} ${Math.round(scrollInfo.scrollPercentageY)}%`;
};

/**
 * Log scroll debug info to console
 */
export const logScrollDebug = (element: HTMLElement, elementId: string) => {
    const info = getScrollInfo(element, elementId);
    console.group(`📜 Scroll Debug: ${elementId}`);
    console.log('Can Scroll:', {
        vertical: info.canScrollVertically,
        horizontal: info.canScrollHorizontally
    });
    console.log('Dimensions:', {
        scrollHeight: info.scrollHeight,
        clientHeight: info.clientHeight,
        scrollWidth: info.scrollWidth,
        clientWidth: info.clientWidth
    });
    console.log('Position:', {
        scrollTop: info.scrollTop,
        scrollLeft: info.scrollLeft,
        percentageY: `${Math.round(info.scrollPercentageY)}%`,
        percentageX: `${Math.round(info.scrollPercentageX)}%`
    });
    console.log('Visual:', createScrollIndicator(info));
    console.groupEnd();

    return info;
};

/**
 * Test scrolling programmatically
 */
export const testScroll = (element: HTMLElement, direction: 'up' | 'down' | 'left' | 'right', amount: number = 100) => {
    const before = getScrollInfo(element, 'test');

    switch (direction) {
        case 'down':
            element.scrollTop += amount;
            break;
        case 'up':
            element.scrollTop -= amount;
            break;
        case 'right':
            element.scrollLeft += amount;
            break;
        case 'left':
            element.scrollLeft -= amount;
            break;
    }

    const after = getScrollInfo(element, 'test');

    console.log(`🧪 Scroll Test (${direction} ${amount}px):`, {
        before: { top: before.scrollTop, left: before.scrollLeft },
        after: { top: after.scrollTop, left: after.scrollLeft },
        changed: before.scrollTop !== after.scrollTop || before.scrollLeft !== after.scrollLeft
    });

    return after;
}; 
