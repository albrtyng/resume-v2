let cleanupReveals: (() => void) | undefined;

export function initRevealMotion(): () => void {
    const elements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-reveal]'),
    );

    if (!elements.length) return () => {};

    const root = document.documentElement;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;

    const revealAll = () => {
        elements.forEach((element) => element.classList.add('is-revealed'));
    };

    const observe = () => {
        observer?.disconnect();

        if (motionQuery.matches || !('IntersectionObserver' in window)) {
            root.removeAttribute('data-motion-ready');
            revealAll();
            return;
        }

        root.setAttribute('data-motion-ready', 'true');
        observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    (entry.target as HTMLElement).classList.add('is-revealed');
                    observer?.unobserve(entry.target);
                });
            },
            { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
        );
        elements.forEach((element) => observer?.observe(element));
    };

    observe();
    motionQuery.addEventListener('change', observe);

    return () => {
        observer?.disconnect();
        motionQuery.removeEventListener('change', observe);
        root.removeAttribute('data-motion-ready');
    };
}

function startRevealMotion() {
    cleanupReveals?.();
    cleanupReveals = initRevealMotion();
}

startRevealMotion();
document.addEventListener('astro:page-load', startRevealMotion);
document.addEventListener('astro:before-swap', () => {
    cleanupReveals?.();
    cleanupReveals = undefined;
});
