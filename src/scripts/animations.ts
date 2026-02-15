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

// Module is dynamically imported when models:hero-ready fires — initialize immediately.
initAnimations();

function wrapLine(el: Element): HTMLSpanElement {
    const inner = document.createElement('span');
    inner.style.display = 'block';
    while (el.firstChild) {
        inner.appendChild(el.firstChild);
    }
    (el as HTMLElement).style.overflow = 'hidden';
    el.appendChild(inner);
    return inner;
}

function setupExperienceCards() {
    const container = document.getElementById('experience-cards');
    const cards = container?.querySelectorAll('.experience-card');
    if (!container || !cards?.length) return;

    const header = document.getElementById('site-header');
    const headerHeight = header?.offsetHeight ?? 93;
    const firstCardGrid = container.querySelector('.experience-card-grid');
    const cardPaddingTop = firstCardGrid
        ? parseFloat(getComputedStyle(firstCardGrid).paddingTop)
        : 40;

    const firstCard = cards[0] as HTMLElement;
    const firstCompany = firstCard.querySelector('.experience-card-company');
    const companyHeight = firstCompany
        ? firstCompany.getBoundingClientRect().height
        : 60;
    const companyStyle = firstCompany ? getComputedStyle(firstCompany) : null;
    const companyMarginTop = companyStyle
        ? parseFloat(companyStyle.marginTop)
        : 0;

    const INITIAL_TOP = headerHeight;
    // Peek = grid padding-top + any margin above company + company heading height
    const PEEK_HEIGHT = Math.min(cardPaddingTop + companyMarginTop + companyHeight, 130);

    // Check if every card fits in its available viewport space with full stacking
    const STACK_BUFFER = 80; // guard against font-load shift + splitText reflow
    let canStack = true;
    cards.forEach((card, i) => {
        const el = card as HTMLElement;
        const availableSpace = window.innerHeight - (INITIAL_TOP + i * PEEK_HEIGHT);
        if (el.offsetHeight + STACK_BUFFER > availableSpace) canStack = false;
    });

    if (canStack) {
        // Standard stacking: CSS sticky with peeking headers
        cards.forEach((card, i) => {
            const el = card as HTMLElement;
            const top = INITIAL_TOP + i * PEEK_HEIGHT;
            el.style.top = `${top}px`;
            el.style.zIndex = `${i + 1}`;
        });

        // Equalize unstick points so all cards unstick simultaneously.
        const stuckBottoms: number[] = [];
        cards.forEach((card, i) => {
            const el = card as HTMLElement;
            const assignedTop = INITIAL_TOP + i * PEEK_HEIGHT;
            stuckBottoms.push(assignedTop + el.offsetHeight);
        });
        const maxStuckBottom = Math.max(...stuckBottoms);

        cards.forEach((card, i) => {
            const el = card as HTMLElement;
            const mb = maxStuckBottom - stuckBottoms[i];
            el.style.marginBottom = `${mb}px`;
        });

        // Padding gives the last card enough time to be read before the section scrolls off.
        const paddingBottom = 160;
        container.style.paddingBottom = `${paddingBottom}px`;
    } else {
        // Small viewport: sequential pinning with smooth exit
        cards.forEach((card, i) => {
            const el = card as HTMLElement;
            el.style.position = 'relative';
            el.style.zIndex = `${i + 1}`;

            // Only add exit animation for non-last cards
            if (i < cards.length - 1) {
                const tl = gsap.timeline();
                // Slide up + fade out immediately on scroll
                tl.to(el, {
                    yPercent: -10,
                    opacity: 0,
                    duration: 1,
                    ease: 'power2.in',
                });

                ScrollTrigger.create({
                    trigger: el,
                    start: `top ${INITIAL_TOP}`,
                    end: () => `+=${el.offsetHeight}`,
                    pin: true,
                    pinSpacing: true,
                    animation: tl,
                    scrub: 0.3,
                });
            } else {
                // Last card: just pin, no exit animation needed
                ScrollTrigger.create({
                    trigger: el,
                    start: `top ${INITIAL_TOP}`,
                    end: () => `+=${el.offsetHeight}`,
                    pin: true,
                    pinSpacing: true,
                });
            }
        });
    }
}

function initAnimations() {
    // Scroll to top while shutter still covers the screen
    window.scrollTo(0, 0);

    // Fade out loading counter alongside shutter reveal
    gsap.to('#hero-loader', {
        yPercent: -50,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => document.getElementById('hero-loader')?.remove(),
    });
    setupExperienceCards();

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
                document.body.style.overflow = '';
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
            { yPercent: 100, visibility: 'visible' },
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

        // Divider lines animate width
        gsap.utils
            .toArray<HTMLElement>('.experience-separator')
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

        // Card text reveal animations
        const experienceCards = gsap.utils.toArray<HTMLElement>('.experience-card');
        experienceCards.forEach((card) => {
            const company = card.querySelector('.experience-card-company');
            const role = card.querySelector('.experience-card-role');
            const bullets = card.querySelectorAll('.experience-card-bullets li');
            const cta = card.querySelector('.experience-card-cta');
            const indices = card.querySelectorAll('.experience-card-index');

            // Wrap company, role, index in line-level containers
            const companyLine = company ? wrapLine(company) : null;
            const roleLine = role ? wrapLine(role) : null;
            const indexLines: HTMLSpanElement[] = [];
            indices.forEach((idx) => indexLines.push(wrapLine(idx)));

            // Set initial state
            const allLines = [...indexLines, companyLine, roleLine].filter(Boolean) as HTMLSpanElement[];
            gsap.set(allLines, { yPercent: 100 });
            gsap.set(bullets, { opacity: 0, y: 20 });
            if (cta) gsap.set(cta, { opacity: 0, y: 10 });

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: card,
                    start: 'top 75%',
                    toggleActions: 'play none none none',
                },
            });

            // Index lines
            if (indexLines.length) {
                tl.to(indexLines, {
                    yPercent: 0,
                    duration: 0.5,
                    stagger: 0.1,
                    ease: 'power3.out',
                }, 0);
            }

            // Company line
            if (companyLine) {
                tl.to(companyLine, {
                    yPercent: 0,
                    duration: 0.5,
                    ease: 'power3.out',
                }, 0);
            }

            // Role line (slight delay)
            if (roleLine) {
                tl.to(roleLine, {
                    yPercent: 0,
                    duration: 0.4,
                    ease: 'power3.out',
                }, 0.15);
            }

            // Bullets stagger
            tl.to(bullets, {
                opacity: 1,
                y: 0,
                duration: 0.4,
                stagger: 0.08,
                ease: 'power2.out',
            }, 0.3);

            // CTA
            if (cta) {
                tl.to(cta, {
                    opacity: 1,
                    y: 0,
                    duration: 0.3,
                    ease: 'power2.out',
                }, 0.5);
            }
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

        // Timeline: words → links → ticker
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

        // Snap "make" & "something" to y=0 after fade-in completes
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

        fadeInTl.to('#footer-links', { opacity: 1, y: 0, duration: 0.01 }, '>');

        fadeInTl.to(footerChars, {
            yPercent: 0,
            duration: 0.3,
            stagger: 0.03,
            ease: 'power1.inOut',
            onComplete: () => {
                footerChars.forEach((el) => el.style.removeProperty('transform'));
            },
        });

        // Ticker entrance: slide up then infinite scroll starts
        fadeInTl.to('.footer-ticker', {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
        }, '>-0.2');
    });

    // Cleanup on page navigation (Astro view transitions)
    document.addEventListener('astro:before-swap', () => ctx.revert());
}
