let cleanupExperienceHighlights: (() => void) | undefined;

const HIGHLIGHT_STAGGER_MS = 90;

export function initExperienceHighlightMotion(): () => void {
    const section = document.querySelector<HTMLElement>('#experience');
    const highlights = Array.from(
        section?.querySelectorAll<HTMLElement>('[data-experience-highlight]') ??
            [],
    );

    if (!section || !highlights.length) return () => {};

    const reducedMotionQuery = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
    );
    const highlightOrder = new Map(
        highlights.map((highlight, index) => [highlight, index]),
    );
    const pendingTimers = new Set<number>();
    let observer: IntersectionObserver | undefined;

    const clearTimers = () => {
        pendingTimers.forEach((timer) => window.clearTimeout(timer));
        pendingTimers.clear();
    };

    const showAll = () => {
        highlights.forEach((highlight) =>
            highlight.classList.add('is-underlined'),
        );
    };

    const configure = () => {
        observer?.disconnect();
        observer = undefined;
        clearTimers();

        const canAnimate =
            !reducedMotionQuery.matches && 'IntersectionObserver' in window;

        section.dataset.experienceHighlightMotion = canAnimate
            ? 'full'
            : 'static';

        if (!canAnimate) {
            showAll();
            return;
        }

        highlights.forEach((highlight) =>
            highlight.classList.remove('is-underlined'),
        );

        observer = new IntersectionObserver(
            (entries) => {
                const enteringHighlights = entries
                    .filter((entry) => entry.isIntersecting)
                    .map((entry) => entry.target as HTMLElement)
                    .sort(
                        (a, b) =>
                            (highlightOrder.get(a) ?? 0) -
                            (highlightOrder.get(b) ?? 0),
                    );

                enteringHighlights.forEach((highlight, index) => {
                    observer?.unobserve(highlight);
                    const timer = window.setTimeout(() => {
                        highlight.classList.add('is-underlined');
                        pendingTimers.delete(timer);
                    }, index * HIGHLIGHT_STAGGER_MS);
                    pendingTimers.add(timer);
                });
            },
            { rootMargin: '0px 0px -8% 0px', threshold: 0.2 },
        );

        highlights.forEach((highlight) => observer?.observe(highlight));
    };

    configure();
    reducedMotionQuery.addEventListener('change', configure);

    return () => {
        observer?.disconnect();
        clearTimers();
        reducedMotionQuery.removeEventListener('change', configure);
        section.removeAttribute('data-experience-highlight-motion');
    };
}

function startExperienceHighlightMotion() {
    cleanupExperienceHighlights?.();
    cleanupExperienceHighlights = initExperienceHighlightMotion();
}

startExperienceHighlightMotion();
document.addEventListener('astro:page-load', startExperienceHighlightMotion);
document.addEventListener('astro:before-swap', () => {
    cleanupExperienceHighlights?.();
    cleanupExperienceHighlights = undefined;
});
