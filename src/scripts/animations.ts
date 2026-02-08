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

// Block scrolling until loading is finished
lenis.stop();

if (prefersReducedMotion) {
    // Show everything immediately
    gsap.set('.gsap-animated', {
        opacity: 1,
        y: 0,
        x: 0,
        yPercent: 0,
        clipPath: 'none',
    });
    gsap.set('#hero-with-albert-overlay', { display: 'none' });
    document.getElementById('hero-shutter')?.remove();
    document.getElementById('hero-loader')?.remove();
    lenis.start();
} else {
    window.addEventListener('models:all-ready', () => initAnimations(), {
        once: true,
    });
}

function initAnimations() {
    // Fade out loading counter alongside shutter reveal
    gsap.to('#hero-loader', {
        yPercent: -50,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => document.getElementById('hero-loader')?.remove(),
    });

    const ctx = gsap.context(() => {
        // ── Header ──
        const header = document.getElementById('site-header');
        const headerBackdrop = document.getElementById('header-backdrop');
        const hero = document.getElementById('hero');

        if (header && headerBackdrop && hero) {
            // Edge case: page loaded already scrolled past hero
            if (window.scrollY > hero.offsetHeight - 80) {
                gsap.set(header, { opacity: 1 });
                header.classList.add('header-scrolled');
                gsap.set(headerBackdrop, { opacity: 1 });
                gsap.set('.header-word', { yPercent: 0 });
            } else {
                // Set all header words to hidden below their overflow containers
                gsap.set('.header-word', { yPercent: 100 });

                // Show header container at 1.7s (synced with WITH ALBERT)
                gsap.set(header, { opacity: 1, delay: 1.7 });

                // Phase 1: Bold labels + CTA flip up together
                gsap.to('.header-bold-wrap .header-word', {
                    yPercent: 0,
                    duration: 0.4,
                    ease: 'power3.out',
                    delay: 1.7,
                });

                // Phase 2: Normal/subtext flips up together
                gsap.to('.header-normal-wrap .header-word', {
                    yPercent: 0,
                    duration: 0.4,
                    ease: 'power3.out',
                    delay: 1.85,
                });
            }

            // Frosted glass toggle via ScrollTrigger
            ScrollTrigger.create({
                trigger: '#hero-ship',
                start: 'top top+=80',
                onEnter: () => {
                    header.classList.add('header-scrolled');
                    gsap.to(headerBackdrop, { opacity: 1, duration: 0.3 });
                },
                onLeaveBack: () => {
                    header.classList.remove('header-scrolled');
                    gsap.to(headerBackdrop, { opacity: 0, duration: 0.3 });
                },
            });
        }

        // ── Hero Animations ──

        // Shutter reveal — vertical bars slide up in staggered sequence
        gsap.to('.hero-shutter-bar', {
            yPercent: -100,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power3.inOut',
            onComplete: () => {
                document.getElementById('hero-shutter')?.remove();
                lenis.start();
            },
        });

        // SHIP — editorial slide-up
        gsap.set('#hero-ship', { opacity: 1, yPercent: 150 });
        gsap.to('#hero-ship', {
            yPercent: 0,
            duration: 0.5,
            ease: 'power3.out',
            delay: 1.0,
        });

        // FASTER — crisp left-to-right clip-path wipe
        gsap.fromTo(
            '#hero-faster',
            { clipPath: 'inset(0 100% 0 0)' },
            {
                clipPath: 'inset(0 0% 0 0)',
                duration: 0.4,
                ease: 'power2.inOut',
                delay: 1.4,
            },
        );

        // WITH ALBERT — solid block slides up over image, then wipes L→R to reveal text
        const withAlbertTl = gsap.timeline({ delay: 1.7 });
        // Slide text and overlay up together
        withAlbertTl.fromTo(
            '#hero-with-albert',
            { yPercent: 100, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },
            0,
        );
        withAlbertTl.fromTo(
            '#hero-with-albert-overlay',
            { yPercent: 100 },
            { yPercent: 0, duration: 0.7, ease: 'power3.out' },
            0,
        );
        // Wipe overlay away L→R
        withAlbertTl.fromTo(
            '#hero-with-albert-overlay',
            { clipPath: 'inset(0 0 0 0)' },
            {
                clipPath: 'inset(0 0 0 100%)',
                duration: 0.3,
                ease: 'power2.inOut',
            },
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

        // Cards parallax stacking — earlier cards scale down as next card scrolls over
        const cards = gsap.utils.toArray<HTMLElement>('.experience-card');
        cards.forEach((card, i) => {
            if (i === cards.length - 1) return; // last card doesn't scale
            const nextCard = cards[i + 1];
            const targetScale = 1 - (cards.length - i) * 0.05;
            gsap.to(card, {
                scale: targetScale,
                ease: 'none',
                scrollTrigger: {
                    trigger: nextCard,
                    start: 'top bottom',
                    end: 'top top',
                    scrub: true,
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

        // ── Section Divider ──
        const dividerChars = gsap.utils.toArray<HTMLElement>(
            '.section-divider-char-inner',
        );
        if (dividerChars.length) {
            // Shuffle indices and split into subgroups
            const shuffled = [...Array(dividerChars.length).keys()].sort(
                () => Math.random() - 0.5,
            );
            const groupCount = 5;
            const groups: HTMLElement[][] = Array.from(
                { length: groupCount },
                () => [],
            );
            shuffled.forEach((idx, i) => {
                groups[i % groupCount].push(dividerChars[idx]);
            });

            const dividerTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '.section-divider',
                    start: 'top bottom',
                    end: 'top top+=160',
                    scrub: true,
                },
            });

            // Each subgroup flips at a staggered offset
            groups.forEach((group, i) => {
                dividerTl.to(
                    group,
                    {
                        yPercent: -45,
                        duration: 1,
                        ease: 'none',
                    },
                    i * 0.15,
                );
            });
        }

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
                footerChars.forEach((el) =>
                    el.style.removeProperty('transform'),
                );
            },
        });
    });

    // Cleanup on page navigation (Astro view transitions)
    document.addEventListener('astro:before-swap', () => ctx.revert());
}
