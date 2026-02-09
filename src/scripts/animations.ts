import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
    lerp: 0.15,
    wheelMultiplier: 1.5,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Respect reduced motion preference
const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
).matches;

if (prefersReducedMotion) {
    // Show everything immediately
    gsap.set('.gsap-animated', { opacity: 1, y: 0, x: 0, yPercent: 0, clipPath: 'none' });
    gsap.set('#hero-with-albert-overlay', { display: 'none' });
    document.getElementById('hero-shutter')?.remove();
} else {
    initAnimations();
}

function initAnimations() {
    const ctx = gsap.context(() => {
        // ── Hero Animations ──

        // Shutter reveal — vertical bars slide up in staggered sequence
        gsap.to('.hero-shutter-bar', {
            yPercent: -100,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power3.inOut',
            onComplete: () => {
                document.getElementById('hero-shutter')?.remove();
            },
        });

        // Label + descriptor fade in
        gsap.fromTo('#hero-label',
            { opacity: 0, y: -10 },
            { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.9 },
        );

        gsap.fromTo('#hero-descriptor',
            { opacity: 0, y: -10 },
            { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.9 },
        );

        // SHIP — editorial slide-up
        gsap.fromTo('#hero-ship',
            { yPercent: 100, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 1.0 },
        );

        // FASTER — crisp left-to-right clip-path wipe
        gsap.fromTo('#hero-faster',
            { clipPath: 'inset(0 100% 0 0)' },
            { clipPath: 'inset(0 0% 0 0)', duration: 0.3, ease: 'power2.inOut', delay: 1.3 },
        );

        // WITH ALBERT — solid block slides up over image, then wipes L→R to reveal text
        const withAlbertTl = gsap.timeline({ delay: 1.7 });
        // Slide text and overlay up together
        withAlbertTl.fromTo('#hero-with-albert',
            { yPercent: 100, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },
            0,
        );
        withAlbertTl.fromTo('#hero-with-albert-overlay',
            { yPercent: 100 },
            { yPercent: 0, duration: 0.7, ease: 'power3.out' },
            0,
        );
        // Wipe overlay away L→R
        withAlbertTl.fromTo('#hero-with-albert-overlay',
            { clipPath: 'inset(0 0 0 0)' },
            { clipPath: 'inset(0 0 0 100%)', duration: 0.3, ease: 'power2.inOut' },
        );

        // Grid lines fade in
        gsap.to('#hero-grid', {
            opacity: 1,
            duration: 1,
            ease: 'power2.out',
            delay: 2.5,
        });

        // Scroll indicator
        gsap.to('#scroll-indicator', {
            opacity: 1,
            duration: 0.6,
            delay: 2.5,
            ease: 'power2.out',
        });

        gsap.to('#scroll-indicator svg', {
            y: 6,
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
        });

        // Hero parallax on scroll
        gsap.to('#hero-headline-area', {
            yPercent: -12,
            ease: 'none',
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true,
            },
        });

        gsap.to('#hero-with-albert-layer', {
            yPercent: -12,
            ease: 'none',
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true,
            },
        });

        gsap.to('#hero-with-albert-overlay-layer', {
            yPercent: -12,
            ease: 'none',
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true,
            },
        });

        gsap.to('#hero-top-bar', {
            yPercent: -8,
            ease: 'none',
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true,
            },
        });

        // ── Experience Animations ──

        // Section heading clip-path reveal
        gsap.to('#experience-heading', {
            clipPath: 'inset(0 0% 0 0)',
            opacity: 1,
            duration: 1,
            ease: 'power3.inOut',
            scrollTrigger: {
                trigger: '#experience-heading',
                start: 'top 80%',
                toggleActions: 'play none none none',
            },
        });

        // Cards fade up
        gsap.utils.toArray<HTMLElement>('.experience-card').forEach((card) => {
            gsap.to(card, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                },
            });

            // Bullets within each card
            const bullets = card.querySelectorAll('.experience-bullet');
            gsap.to(bullets, {
                opacity: 1,
                y: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 75%',
                    toggleActions: 'play none none none',
                },
            });
        });

        // Divider lines animate width
        gsap.utils
            .toArray<HTMLElement>('.experience-divider')
            .forEach((divider) => {
                gsap.to(divider, {
                    width: '100%',
                    duration: 0.8,
                    ease: 'power2.inOut',
                    scrollTrigger: {
                        trigger: divider,
                        start: 'top 85%',
                        toggleActions: 'play none none none',
                    },
                });
            });

        // ── Footer ──

        // Container fade-in
        gsap.to('#footer', {
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: '#footer',
                start: 'top bottom',
                toggleActions: 'play none none none',
            },
        });

        // Timeline 1: staggered fade-in left to right
        const fadeInTl = gsap.timeline({
            scrollTrigger: {
                trigger: '#footer',
                start: 'top 80%',
                toggleActions: 'play none none none',
            },
        });

        fadeInTl.to('.footer-word', {
            opacity: 1,
            x: 0,
            duration: 0.2,
            stagger: 0.1,
        });

        // Timeline 2: snap Create & Ship to y=0 after fade-in completes
        fadeInTl.to(
            '.footer-word-snap',
            {
                y: 0,
                duration: 0.1,
                stagger: 0.12,
            },
            '>',
        );

        // Footer links — staggered flip-up entry, chained after footer words
        const footerChars = gsap.utils.toArray<HTMLElement>(
            '#footer-links .flip-link-char-inner',
        );
        gsap.set(footerChars, { yPercent: 100 });

        fadeInTl.to(
            '#footer-links',
            {
                opacity: 1,
                y: 0,
                duration: 0.01,
            },
            '>',
        );

        fadeInTl.to(footerChars, {
            yPercent: 0,
            duration: 0.3,
            stagger: 0.03,
            ease: 'power1.inOut',
            onComplete: () => {
                footerChars.forEach((el) => el.style.removeProperty('transform'));
            },
        });

        // ── Responsive variants ──

        gsap.matchMedia({
            '(max-width: 639px)': () => {
                // On mobile, simplify: disable hero parallax
                const heroEl = document.getElementById('hero');
                ScrollTrigger.getAll()
                    .filter((st) => st.trigger === heroEl)
                    .forEach((st) => st.kill());
            },
        });
    });

    // Cleanup on page navigation (Astro view transitions)
    document.addEventListener('astro:before-swap', () => ctx.revert());
}
