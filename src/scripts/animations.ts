import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Respect reduced motion preference
const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
).matches;

if (prefersReducedMotion) {
    // Show everything immediately
    gsap.set('.gsap-animated', { opacity: 1, y: 0, x: 0, clipPath: 'none' });
} else {
    initAnimations();
}

function initAnimations() {
    const ctx = gsap.context(() => {
        // ── Hero Animations ──

        // Split name into characters
        const nameEl = document.getElementById('hero-name');
        if (nameEl) {
            const text = nameEl.textContent || '';
            nameEl.innerHTML = text
                .split('')
                .map(
                    (char) =>
                        `<span class="hero-char" style="display:inline-block; opacity:0; transform:translateY(30px);">${char === ' ' ? '&nbsp;' : char}</span>`,
                )
                .join('');

            gsap.to('.hero-char', {
                opacity: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.03,
                ease: 'power3.out',
                delay: 0.2,
            });
        }

        // Subtitle word reveal
        gsap.to('.hero-word', {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.15,
            ease: 'power2.out',
            delay: 0.8,
            onStart: function () {
                gsap.set('.hero-word', {
                    display: 'inline-block',
                    opacity: 0,
                    y: 20,
                    marginRight: '0.3em',
                });
            },
        });

        // Tagline fade in
        gsap.to('#hero-tagline', {
            opacity: 1,
            duration: 0.8,
            ease: 'power2.out',
            delay: 1.4,
        });

        // Scroll indicator
        gsap.to('#scroll-indicator', {
            opacity: 1,
            duration: 0.6,
            delay: 2,
            ease: 'power2.out',
        });

        gsap.to('#scroll-indicator svg', {
            y: 6,
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
        });

        // Hero background parallax on scroll
        gsap.to('#hero-bg', {
            yPercent: 30,
            opacity: 0.1,
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
            // ease: 'power2.out',
        });

        // Timeline 2: snap Create & Ship to y=0 after fade-in completes
        fadeInTl.to(
            '.footer-word-snap',
            {
                y: 0,
                duration: 0.1,
                stagger: 0.12,
                // ease: 'power4.out',
            },
            '>',
        );

        // Links stagger fade-up
        gsap.to('.footer-link', {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.12,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: '#footer',
                start: 'top bottom',
                toggleActions: 'play none none none',
            },
        });

        // ── Responsive variants ──

        gsap.matchMedia({
            '(max-width: 639px)': () => {
                // On mobile, simplify: disable parallax
                ScrollTrigger.getAll()
                    .filter(
                        (st) =>
                            st.trigger === document.getElementById('hero-bg'),
                    )
                    .forEach((st) => st.kill());
            },
        });
    });

    // Cleanup on page navigation (Astro view transitions)
    document.addEventListener('astro:before-swap', () => ctx.revert());
}
