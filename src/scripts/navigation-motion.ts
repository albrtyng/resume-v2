import {
    getPageThemeColor,
    PAGE_SURFACE_BY_HASH,
    type PageSurface,
} from './page-theme';
import { type SkylineState } from './skyline/time-state';

let cleanupNavigation: (() => void) | undefined;

interface SurfaceSection {
    element: HTMLElement;
    surface: PageSurface;
}

function setupNavigationMotion(): () => void {
    const header = document.querySelector<HTMLElement>(
        '[data-site-header], #site-header',
    );

    if (!header) return () => {};

    const root = document.documentElement;
    const themeColor = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]',
    );
    const hashSurface = PAGE_SURFACE_BY_HASH[window.location.hash];

    if (!root.dataset.initialHeaderSurface && hashSurface) {
        root.dataset.initialHeaderSurface = hashSurface;
        root.toggleAttribute('data-initial-header-collapsed', true);
    }

    const initialSurfaceValue = root.dataset.initialHeaderSurface;
    const initialSurface: PageSurface | undefined = [
        'hero',
        'paper',
        'contact',
    ].includes(initialSurfaceValue ?? '')
        ? (initialSurfaceValue as PageSurface)
        : undefined;
    const initialCollapsed = root.hasAttribute('data-initial-header-collapsed');
    const initialScrollY = Number.parseFloat(
        root.dataset.initialHeaderScrollY ?? '',
    );

    if (!hashSurface && initialScrollY > 0 && window.scrollY === 0) {
        window.scrollTo(0, initialScrollY);
    }

    const surfaceSections: SurfaceSection[] = [
        {
            element: document.querySelector<HTMLElement>('#hero'),
            surface: 'hero',
        },
        {
            element: document.querySelector<HTMLElement>('#experience'),
            surface: 'paper',
        },
        {
            element: document.querySelector<HTMLElement>('#capabilities'),
            surface: 'paper',
        },
        {
            element: document.querySelector<HTMLElement>('#contact'),
            surface: 'contact',
        },
    ].filter((section): section is SurfaceSection => section.element !== null);

    let frame = 0;
    let hasInitialState = Boolean(initialSurface);
    let hasPaintedInitialState = false;
    let activeSurface: PageSurface = 'hero';
    let persistedCollapsed: boolean | undefined;
    let persistedSurface: PageSurface | undefined;

    const syncPageSurface = (surface: PageSurface) => {
        root.dataset.pageSurface = surface;
        themeColor?.setAttribute(
            'content',
            getPageThemeColor(
                (root.dataset.timeState ?? 'dusk') as SkylineState,
                surface,
            ),
        );
    };

    const getSurfaceAtHeader = (): PageSurface => {
        // Browser chrome sits above the page, so it must not switch until the
        // incoming surface reaches the visual viewport edge.
        const probeY = 0;
        const contactSection = surfaceSections.find(
            (section) => section.surface === 'contact',
        );
        const isAtPageEnd =
            window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight - 2;

        // Short final sections cannot always scroll far enough to physically pass
        // beneath the header. At the document end, treat a visible contact scene
        // as current so the navigation still belongs to the closing surface.
        if (
            isAtPageEnd &&
            contactSection &&
            contactSection.element.getBoundingClientRect().top <
                window.innerHeight
        ) {
            return 'contact';
        }

        let surface: PageSurface = 'hero';

        for (const section of surfaceSections) {
            const bounds = section.element.getBoundingClientRect();

            if (bounds.top <= probeY) surface = section.surface;
            if (bounds.top <= probeY && bounds.bottom > probeY) break;
        }

        return surface;
    };

    const persistNavigationState = (
        surface: PageSurface,
        collapsed: boolean,
    ) => {
        const currentState =
            history.state &&
            typeof history.state === 'object' &&
            !Array.isArray(history.state)
                ? history.state
                : {};

        history.replaceState(
            {
                ...currentState,
                portfolioHeader: {
                    collapsed,
                    scrollY: window.scrollY,
                    surface,
                },
            },
            '',
        );
        persistedSurface = surface;
        persistedCollapsed = collapsed;
    };

    const clearInitialHeaderState = () => {
        hasInitialState = false;
        root.removeAttribute('data-initial-header-surface');
        root.removeAttribute('data-initial-header-collapsed');
        root.removeAttribute('data-initial-header-scroll-y');
        header.toggleAttribute('data-navigation-ready', true);
    };

    const updateNavigationState = () => {
        frame = 0;
        const detectedSurface = getSurfaceAtHeader();
        const detectedCollapsed = window.scrollY > 0;
        const holdInitialState = hasInitialState && !hasPaintedInitialState;

        if (holdInitialState) {
            hasPaintedInitialState = true;
        } else if (hasInitialState) {
            clearInitialHeaderState();
        }

        const nextCollapsed =
            hasInitialState && initialSurface
                ? initialCollapsed
                : detectedCollapsed;

        header.toggleAttribute('data-scrolled', nextCollapsed);

        const nextSurface =
            hasInitialState && initialSurface
                ? initialSurface
                : detectedSurface;

        if (nextSurface !== activeSurface) {
            activeSurface = nextSurface;
            header.dataset.headerSurface = nextSurface;
            syncPageSurface(nextSurface);
        }

        if (
            nextSurface !== persistedSurface ||
            nextCollapsed !== persistedCollapsed
        ) {
            persistNavigationState(nextSurface, nextCollapsed);
        }

        if (!hasInitialState) {
            header.toggleAttribute('data-navigation-ready', true);
        }
        if (holdInitialState) scheduleUpdate();
    };

    const scheduleUpdate = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(updateNavigationState);
    };

    const persistCurrentNavigationState = () => {
        persistNavigationState(getSurfaceAtHeader(), window.scrollY > 0);
    };

    const handleHashChange = () => {
        clearInitialHeaderState();
        scheduleUpdate();
    };

    updateNavigationState();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('scrollend', persistCurrentNavigationState, {
        passive: true,
    });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('pagehide', persistCurrentNavigationState);

    return () => {
        window.removeEventListener('scroll', scheduleUpdate);
        window.removeEventListener('scrollend', persistCurrentNavigationState);
        window.removeEventListener('resize', scheduleUpdate);
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('pagehide', persistCurrentNavigationState);
        window.cancelAnimationFrame(frame);
        header.removeAttribute('data-scrolled');
        header.removeAttribute('data-navigation-ready');
        header.dataset.headerSurface = 'hero';
        syncPageSurface('hero');
    };
}

export function initNavigationMotion(): () => void {
    cleanupNavigation?.();
    cleanupNavigation = setupNavigationMotion();
    return cleanupNavigation;
}

initNavigationMotion();
document.addEventListener('astro:page-load', initNavigationMotion);
document.addEventListener('astro:before-swap', () => {
    cleanupNavigation?.();
    cleanupNavigation = undefined;
});
