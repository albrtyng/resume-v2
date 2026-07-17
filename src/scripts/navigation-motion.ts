let cleanupNavigation: (() => void) | undefined;

type HeaderSurface = 'hero' | 'paper' | 'contact';

interface SurfaceSection {
    element: HTMLElement;
    surface: HeaderSurface;
}

function setupNavigationMotion(): () => void {
    const header = document.querySelector<HTMLElement>(
        '[data-site-header], #site-header',
    );

    if (!header) return () => {};

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
    let activeSurface: HeaderSurface = 'hero';

    const getSurfaceAtHeader = (): HeaderSurface => {
        const headerBounds = header.getBoundingClientRect();
        const probeY = Math.max(headerBounds.top + headerBounds.height / 2, 1);
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

        let surface: HeaderSurface = 'hero';

        for (const section of surfaceSections) {
            const bounds = section.element.getBoundingClientRect();

            if (bounds.top <= probeY) surface = section.surface;
            if (bounds.top <= probeY && bounds.bottom > probeY) break;
        }

        return surface;
    };

    const updateNavigationState = () => {
        frame = 0;
        header.toggleAttribute('data-scrolled', window.scrollY > 0);

        const nextSurface = getSurfaceAtHeader();

        if (nextSurface !== activeSurface) {
            activeSurface = nextSurface;
            header.dataset.headerSurface = nextSurface;
        }
    };

    const scheduleUpdate = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(updateNavigationState);
    };

    activeSurface = getSurfaceAtHeader();
    header.dataset.headerSurface = activeSurface;
    updateNavigationState();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    return () => {
        window.removeEventListener('scroll', scheduleUpdate);
        window.removeEventListener('resize', scheduleUpdate);
        window.cancelAnimationFrame(frame);
        header.removeAttribute('data-scrolled');
        header.dataset.headerSurface = 'hero';
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
