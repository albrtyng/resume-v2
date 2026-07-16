let cleanupContact: (() => void) | undefined;

export function initContactMotion(): () => void {
    const footer = document.querySelector<HTMLElement>('[data-contact-footer]');
    const panorama = footer?.querySelector<HTMLElement>(
        '[data-contact-panorama]',
    );

    if (!footer || !panorama) return () => {};

    const reducedMotionQuery = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
    );
    let observer: IntersectionObserver | undefined;
    let isIntersecting = false;

    const syncPlayback = () => {
        footer.toggleAttribute(
            'data-contact-active',
            footer.dataset.contactMotion === 'full' &&
                isIntersecting &&
                !document.hidden,
        );
    };

    const configure = () => {
        observer?.disconnect();
        observer = undefined;
        isIntersecting = false;
        footer.removeAttribute('data-contact-active');

        const canAnimate =
            !reducedMotionQuery.matches && 'IntersectionObserver' in window;

        footer.dataset.contactMotion = canAnimate ? 'full' : 'static';

        if (!canAnimate) return;

        observer = new IntersectionObserver(
            ([entry]) => {
                isIntersecting = entry.isIntersecting;
                syncPlayback();
            },
            { rootMargin: '10% 0px', threshold: 0.01 },
        );
        observer.observe(panorama);
    };

    configure();
    reducedMotionQuery.addEventListener('change', configure);
    document.addEventListener('visibilitychange', syncPlayback);

    return () => {
        observer?.disconnect();
        reducedMotionQuery.removeEventListener('change', configure);
        document.removeEventListener('visibilitychange', syncPlayback);
        footer.removeAttribute('data-contact-active');
        footer.removeAttribute('data-contact-motion');
    };
}

function startContactMotion() {
    cleanupContact?.();
    cleanupContact = initContactMotion();
}

startContactMotion();
document.addEventListener('astro:page-load', startContactMotion);
document.addEventListener('astro:before-swap', () => {
    cleanupContact?.();
    cleanupContact = undefined;
});
