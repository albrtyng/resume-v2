import { getPageThemeColor } from '../../src/scripts/page-theme';
import {
    getNextSkylineState,
    getSkylineStateForHour,
} from '../../src/scripts/skyline/time-state';
import { expect, test, type Page } from '@playwright/test';

const localTimeScenarios = [
    { hour: 6, state: 'dawn' },
    { hour: 12, state: 'midday' },
    { hour: 19, state: 'dusk' },
    { hour: 2, state: 'night' },
] as const;

const seawallColors = {
    dawn: 'rgb(111, 130, 121)',
    midday: 'rgb(126, 145, 135)',
    dusk: 'rgb(76, 99, 89)',
    night: 'rgb(35, 58, 58)',
} as const;

const themeColors = {
    dawn: '#a7bdc8',
    midday: '#7fc4d6',
    dusk: '#668aa6',
    night: '#152941',
} as const;

const paperThemeColor = '#f2e7d2';
const footerThemeColors = {
    dawn: '#315b57',
    midday: '#3c6660',
    dusk: '#1d4540',
    night: '#122f38',
} as const;

const skylineBoundaryScenarios = [
    { hour: 4, state: 'night' },
    { hour: 5, state: 'dawn' },
    { hour: 7, state: 'dawn' },
    { hour: 8, state: 'midday' },
    { hour: 16, state: 'midday' },
    { hour: 17, state: 'dusk' },
    { hour: 20, state: 'dusk' },
    { hour: 21, state: 'night' },
] as const;

const contactLinks = {
    email: 'a[href="mailto:albertesyang@gmail.com"]',
    linkedin: 'a[href*="linkedin.com/in/albrtyng"]',
    github: 'a[href="https://github.com/albrtyng"]',
} as const;

const primaryLandmarks = ['cn-tower', 'rogers-centre'] as const;
const footerLandmarks = [
    'footer-cn-tower',
    'footer-rogers-centre',
    'footer-city-hall',
] as const;

async function gotoAtLocalHour(page: Page, hour: number) {
    await page.clock.setFixedTime(new Date(2026, 6, 14, hour, 0, 0));
    await page.goto('/');
}

async function waitForLayout(page: Page) {
    await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
    });
}

async function scrollSectionUnderHeader(page: Page, selector: string) {
    await page.locator(selector).evaluate((element) => {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(
            0,
            element.getBoundingClientRect().top + window.scrollY,
        );
    });
    await waitForLayout(page);
}

async function getSkylineOffsets(page: Page) {
    return page.locator('[data-skyline-scene]').evaluate((element) => ({
        x: Number.parseFloat(element.style.getPropertyValue('--scene-x')) || 0,
        y: Number.parseFloat(element.style.getPropertyValue('--scene-y')) || 0,
    }));
}

async function getFooterLandmarkLighting(page: Page) {
    const distantSkyline = page.locator('[data-distant-toronto-skyline]');
    await expect(distantSkyline).toBeAttached();

    return distantSkyline.evaluate((element) => {
        const readStyle = (selector: string) => {
            const target = element.querySelector(selector);
            if (!target)
                throw new Error(`Missing footer landmark: ${selector}`);

            const style = getComputedStyle(target);
            return {
                fill: style.fill,
                filter: style.filter,
                opacity: Number.parseFloat(style.opacity),
                stroke: style.stroke,
            };
        };

        const cityHall = element.querySelector(
            '[data-landmark="footer-city-hall"] .new-city-hall',
        );
        if (!cityHall) throw new Error('Missing footer City Hall');

        const cityHallGlowTargets = [
            cityHall,
            ...cityHall.querySelectorAll(
                '.new-city-hall__tower, .new-city-hall__window-bands, .new-city-hall__council-chamber',
            ),
        ].map((target) => getComputedStyle(target).filter);

        return {
            cityHall: {
                chamberWindow: readStyle(
                    '[data-landmark="footer-city-hall"] .new-city-hall__chamber-window',
                ),
                glowTargets: cityHallGlowTargets,
                windowBands: readStyle(
                    '[data-landmark="footer-city-hall"] .new-city-hall__window-bands',
                ),
            },
            cnTower: readStyle(
                '[data-landmark="footer-cn-tower"] .cn-tower__night-aura',
            ),
            rogersCentre: readStyle(
                '[data-landmark="footer-rogers-centre"] .rogers-centre__night-aura',
            ),
        };
    });
}

test('renders the main resume journey and accessible navigation', async ({
    page,
}) => {
    await page.goto('/');

    const hero = page.locator('#hero');
    const experience = page.locator('#experience');
    const capabilities = page.locator('#capabilities');
    const contact = page.locator('#contact');
    const siteHeader = page.locator('[data-site-header]');

    await expect(siteHeader.locator('.site-header__place')).toHaveCount(0);
    await expect(siteHeader).not.toContainText('Toronto · CA');

    await expect(hero).toBeVisible();
    await expect(hero).toContainText(/Albert Yang/i);
    await expect(hero).toContainText(/Software Engineer/i);
    await expect(hero).toContainText(/Toronto/i);
    await expect(hero.locator('.hero__text-link')).toBeVisible();
    const skyline = page.locator('[data-skyline-scene]');
    await expect(skyline).toBeVisible();

    for (const landmark of primaryLandmarks) {
        const landmarkGroup = skyline.locator(`[data-landmark="${landmark}"]`);
        await expect(landmarkGroup).toBeVisible();
        await expect(landmarkGroup).toBeInViewport();
    }
    await expect(skyline.locator('[data-landmark="city-hall"]')).toBeAttached();
    await expect(skyline.locator('[data-landmark="streetcar"]')).toBeAttached();
    await expect(skyline.locator('.ttc-streetcar__pantograph')).toHaveCount(0);
    await expect(
        skyline.locator('[data-streetcar-streetscape]'),
    ).toBeAttached();
    await expect(skyline.locator('[data-streetcar-occluders]')).toBeAttached();
    const streetcarRoad = skyline.locator('[data-streetcar-road]');
    await expect(streetcarRoad).toBeVisible();
    await expect(
        streetcarRoad.locator('.streetcar-streetscape__road-surface'),
    ).toHaveCount(1);
    const roadMarkers = streetcarRoad.locator(
        '.streetcar-streetscape__road-markers',
    );
    await expect(roadMarkers).toHaveCount(1);
    await expect(roadMarkers).toHaveCSS('stroke', 'rgb(247, 189, 106)');
    await expect(
        skyline.locator(
            '.streetcar-streetscape__background-brush, .streetcar-streetscape__foreground-brush',
        ),
    ).toHaveCount(0);
    await expect(
        skyline.locator('.streetcar-streetscape__building'),
    ).toHaveCount(6);
    const roadGeometry = await skyline.evaluate((element) => {
        const road = element.querySelector<SVGRectElement>(
            '.streetcar-streetscape__road-surface',
        );
        const streetcar =
            element.querySelector<SVGGElement>('[data-streetcar]');
        const markers = element.querySelector<SVGPathElement>(
            '.streetcar-streetscape__road-markers',
        );
        const rightLane = element.querySelector<SVGGElement>(
            '[data-streetcar-right-lane]',
        );
        const roadsideSkyline = element.querySelector<SVGGElement>(
            '[data-roadside-skyline]',
        );
        const foreground = element.querySelector<SVGGElement>(
            '[data-streetcar-occluders]',
        );
        const roadGroup = element.querySelector<SVGGElement>(
            '[data-streetcar-road]',
        );
        if (
            !road ||
            !streetcar ||
            !markers ||
            !rightLane ||
            !roadsideSkyline ||
            !foreground ||
            !roadGroup
        ) {
            return null;
        }

        const roadBounds = road.getBoundingClientRect();
        const streetcarBounds = streetcar.getBoundingClientRect();
        const markerBounds = markers.getBoundingClientRect();
        const roadsideSkylineBounds = roadsideSkyline.getBoundingClientRect();

        return {
            road: {
                left: roadBounds.left,
                right: roadBounds.right,
                top: roadBounds.top,
                bottom: roadBounds.bottom,
            },
            streetcar: {
                left: streetcarBounds.left,
                right: streetcarBounds.right,
                bottom: streetcarBounds.bottom,
            },
            markers: {
                top: markerBounds.top,
                bottom: markerBounds.bottom,
            },
            roadHeight: roadBounds.height,
            streetcarOnRightLane: streetcarBounds.bottom > markerBounds.bottom,
            roadsideGap: Math.abs(
                roadsideSkylineBounds.bottom - roadBounds.top,
            ),
            layerOrder: {
                roadBeforeStreetcar: Boolean(
                    roadGroup.compareDocumentPosition(streetcar) &
                    Node.DOCUMENT_POSITION_FOLLOWING,
                ),
                streetcarBeforeForeground: Boolean(
                    streetcar.compareDocumentPosition(foreground) &
                    Node.DOCUMENT_POSITION_FOLLOWING,
                ),
            },
            viewportWidth: document.documentElement.clientWidth,
        };
    });
    expect(roadGeometry).not.toBeNull();
    expect(roadGeometry!.road.left).toBeLessThanOrEqual(0);
    expect(roadGeometry!.road.right).toBeGreaterThanOrEqual(
        roadGeometry!.viewportWidth,
    );
    expect(roadGeometry!.streetcar.bottom).toBeGreaterThan(
        roadGeometry!.road.top,
    );
    expect(roadGeometry!.streetcar.bottom).toBeLessThanOrEqual(
        roadGeometry!.road.bottom,
    );
    expect(roadGeometry!.roadHeight).toBeLessThan(76);
    expect(roadGeometry!.streetcarOnRightLane).toBe(true);
    expect(roadGeometry!.roadsideGap).toBeLessThanOrEqual(1);
    expect(roadGeometry!.markers.top).toBeGreaterThanOrEqual(
        roadGeometry!.road.top,
    );
    expect(roadGeometry!.markers.bottom).toBeLessThanOrEqual(
        roadGeometry!.road.bottom,
    );
    expect(roadGeometry!.layerOrder).toEqual({
        roadBeforeStreetcar: true,
        streetcarBeforeForeground: true,
    });
    await expect(
        skyline.locator(
            '[data-tram-track], .street-track, .street-track__rails, .street-track__platform, .street-track__catenary',
        ),
    ).toHaveCount(0);
    await expect(skyline.locator('.skyline__quay')).toHaveCount(0);
    await expect(skyline.locator('.skyline__trees')).toHaveCount(0);
    await expect(
        skyline.locator(
            '.skyline__ferry, .skyline__building-reflections, .skyline__window-reflections, .skyline__celestial-reflection, [data-building-reflections], [data-light-reflections], [data-sky-reflection]',
        ),
    ).toHaveCount(0);
    await expect(skyline.locator('[data-rooftop-masts]')).toHaveCount(2);

    const disconnectedMasts = await skyline.evaluate((element) =>
        Array.from(
            element.querySelectorAll<SVGPathElement>('[data-rooftop-masts]'),
        ).flatMap((mastPath) => {
            if (mastPath.getClientRects().length === 0) return [];

            const layer = mastPath.closest<SVGGElement>(
                '.skyline__far, .skyline__mid',
            );
            const buildings = Array.from(
                layer?.querySelectorAll<SVGGeometryElement>(
                    '.skyline__far-buildings path, .skyline__mid-buildings path',
                ) ?? [],
            );
            const segments = Array.from(
                mastPath.getAttribute('d')?.matchAll(/M(\d+) (\d+)V(\d+)/g) ??
                    [],
            );

            return segments
                .filter(([, x, roofJoin]) => {
                    const join = new DOMPoint(Number(x), Number(roofJoin));
                    return !buildings.some((building) =>
                        building.isPointInFill(join),
                    );
                })
                .map((match) => match[0]);
        }),
    );
    expect(disconnectedMasts).toEqual([]);

    await expect(experience).toBeVisible();
    await expect(experience.getByRole('heading').first()).toBeVisible();
    await expect(experience).toContainText('Super.com');
    await expect(experience).toContainText(/Software Engineer II/i);

    await expect(capabilities).toBeVisible();
    await expect(capabilities.getByRole('heading').first()).toBeVisible();
    await expect(contact).toBeVisible();

    const navigation = page.getByRole('banner').getByRole('navigation');
    const journeyLinks = [
        {
            name: /work|experience/i,
            target: experience,
            hash: '#experience',
        },
        {
            name: /toolkit|capabilities/i,
            target: capabilities,
            hash: '#capabilities',
        },
        {
            name: /say hello|contact/i,
            target: contact,
            hash: '#contact',
        },
    ];

    for (const { name, target, hash } of journeyLinks) {
        const link = navigation.getByRole('link', { name });
        await expect(link).toHaveAttribute('href', hash);
        await link.click();
        await expect(page).toHaveURL(new RegExp(`${hash}$`));
        await expect(target).toBeInViewport();
    }

    await expect(contact.locator(contactLinks.email)).toBeVisible();
    await expect(contact.locator(contactLinks.linkedin)).toBeVisible();
    await expect(contact.locator(contactLinks.github)).toBeVisible();

    const panorama = contact.locator('[data-contact-panorama]');
    await expect(panorama).toHaveCSS('content-visibility', 'auto');
    expect(
        await panorama.evaluate(
            (element) => getComputedStyle(element).containIntrinsicSize,
        ),
    ).toContain('auto');
    await expect(contact).toHaveAccessibleName(/let’s make something useful/i);
    await expect(panorama).toHaveAttribute('aria-hidden', 'true');
    await expect(panorama.locator('[data-harbour-panorama]')).toBeAttached();
    await expect(
        panorama.locator('[data-distant-toronto-skyline]'),
    ).toBeAttached();
    for (const landmark of footerLandmarks) {
        await expect(
            panorama.locator(`[data-landmark="${landmark}"]`),
        ).toBeAttached();
    }
    await expect(panorama.locator('.harbour-panorama__beach')).toBeAttached();

    const bonfire = panorama.locator('[data-island-bonfire]');
    await expect(bonfire).toBeAttached();
    await expect(bonfire.locator('[data-bonfire-flames]')).toBeAttached();
    await expect(bonfire.locator('[data-bonfire-logs]')).toBeAttached();

    const footerFerry = panorama.locator('[data-harbour-ferry]');
    await expect(footerFerry).toBeAttached();
    await expect(
        footerFerry.locator('.harbour-ferry__hull-stack'),
    ).toBeAttached();
    await expect(footerFerry.locator('.harbour-ferry__wheelhouse')).toHaveCount(
        2,
    );
    await expect(footerFerry.locator('.harbour-ferry__lifeboat')).toHaveCount(
        2,
    );
    await expect(footerFerry.locator('.harbour-ferry__mast')).toHaveCount(2);
});

test('publishes a large social sharing preview', async ({ page }) => {
    await page.goto('/');

    const socialImageURL =
        'https://albertyang.ca/images/albert-yang-social-card.png';
    const socialImageAlt =
        'Albert Yang, Toronto Software Engineer, alongside an illustrated Toronto skyline at night.';

    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        socialImageURL,
    );
    await expect(
        page.locator('meta[property="og:image:width"]'),
    ).toHaveAttribute('content', '1200');
    await expect(
        page.locator('meta[property="og:image:height"]'),
    ).toHaveAttribute('content', '630');
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
        'content',
        socialImageAlt,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        'summary_large_image',
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
        'content',
        socialImageURL,
    );
});

test('publishes broad, truthful search metadata and availability', async ({
    page,
}) => {
    await page.goto('/');

    const title = 'Albert Yang | Software Engineer';
    const description =
        'Albert Yang is a Toronto-based Software Engineer II at Super.com with 6+ years of experience, open to remote roles and US relocation with visa sponsorship.';
    const canonicalURL = 'https://albertyang.ca/';

    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        description,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'max-image-preview:large',
    );
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
        'content',
        'Albert Yang',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        canonicalURL,
    );
    for (const property of ['og:title', 'twitter:title']) {
        await expect(
            page.locator(
                `meta[property="${property}"], meta[name="${property}"]`,
            ),
        ).toHaveAttribute('content', title);
    }
    for (const property of ['og:description', 'twitter:description']) {
        await expect(
            page.locator(
                `meta[property="${property}"], meta[name="${property}"]`,
            ),
        ).toHaveAttribute('content', description);
    }
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        'content',
        canonicalURL,
    );
    await expect(
        page.getByText(
            'Toronto-based · Open to remote roles and US relocation with visa sponsorship',
            { exact: true },
        ),
    ).toBeVisible();
});

test('publishes truthful profile structured data', async ({ page }) => {
    await page.goto('/');

    const structuredData = await page
        .locator('script[type="application/ld+json"]')
        .textContent();
    expect(structuredData).not.toBeNull();

    const structuredDataGraph = JSON.parse(structuredData ?? 'null');
    expect(structuredDataGraph).toMatchObject({
        '@context': 'https://schema.org',
        '@graph': expect.arrayContaining([
            expect.objectContaining({
                '@type': 'WebSite',
                '@id': 'https://albertyang.ca/#website',
                url: 'https://albertyang.ca/',
                name: 'Albert Yang',
                publisher: {
                    '@id': 'https://albertyang.ca/#albert-yang',
                },
            }),
            expect.objectContaining({
                '@type': 'ProfilePage',
                '@id': 'https://albertyang.ca/#profile-page',
                url: 'https://albertyang.ca/',
                isPartOf: {
                    '@id': 'https://albertyang.ca/#website',
                },
                mainEntity: {
                    '@id': 'https://albertyang.ca/#albert-yang',
                },
            }),
            expect.objectContaining({
                '@type': 'Person',
                '@id': 'https://albertyang.ca/#albert-yang',
                name: 'Albert Yang',
                jobTitle: 'Software Engineer II',
                worksFor: {
                    '@type': 'Organization',
                    name: 'Super.com',
                },
                homeLocation: {
                    '@type': 'Place',
                    name: 'Toronto, Ontario, Canada',
                },
                sameAs: [
                    'https://www.linkedin.com/in/albrtyng/',
                    'https://github.com/albrtyng',
                ],
            }),
        ]),
    });

    for (const entity of structuredDataGraph['@graph']) {
        expect(entity.description).toBe(
            'Albert Yang is a Toronto-based Software Engineer II at Super.com with 6+ years of experience, open to remote roles and US relocation with visa sponsorship.',
        );
    }
});

test('switches the header to the contact surface after Say hello scrolls', async ({
    page,
}) => {
    await page.goto('/');

    const header = page.locator('[data-site-header]');
    const contact = page.locator('#contact');
    const sayHello = header.getByRole('link', { name: /say hello/i });

    await expect(header).toHaveAttribute('data-header-surface', 'hero');
    await sayHello.click();

    await expect(page).toHaveURL(/#contact$/);
    await expect(header).toHaveAttribute('data-header-surface', 'contact');

    const alignment = await contact.evaluate((element) => {
        const siteHeader =
            document.querySelector<HTMLElement>('[data-site-header]');
        if (!siteHeader) return null;

        return {
            contactTop: element.getBoundingClientRect().top,
            headerProbe: siteHeader.getBoundingClientRect().height / 2,
        };
    });

    expect(alignment).not.toBeNull();
    expect(alignment!.contactTop).toBeLessThanOrEqual(alignment!.headerProbe);
    await expect(contact.locator(contactLinks.email)).toBeVisible();
});

test('paints the collapsed section header before navigation enhancement on direct hash visits', async ({
    page,
}) => {
    await page.clock.setFixedTime(new Date(2026, 6, 14, 12, 0, 0));

    for (const { hash, surface, color } of [
        { hash: '#experience', surface: 'paper', color: paperThemeColor },
        { hash: '#capabilities', surface: 'paper', color: paperThemeColor },
        {
            hash: '#contact',
            surface: 'contact',
            color: footerThemeColors.midday,
        },
    ] as const) {
        await page.goto(`/?initial=${hash.slice(1)}${hash}`);

        const header = page.locator('[data-site-header]');
        await expect(page.locator('html')).toHaveAttribute(
            'data-page-surface',
            surface,
        );
        await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
            'content',
            color,
        );
        await expect(header).toHaveAttribute('data-header-surface', surface);
        await expect(header).toHaveAttribute('data-navigation-ready', '');
        expect(await page.evaluate(() => window.scrollY), hash).toBeGreaterThan(
            0,
        );

        const states = await header.evaluate((element, initialSurface) => {
            const readState = () => {
                const style = getComputedStyle(element);
                const bounds = element.getBoundingClientRect();

                return {
                    background: style.backgroundColor,
                    borderRadius: style.borderRadius,
                    bounds: {
                        left: bounds.left,
                        right: bounds.right,
                        top: bounds.top,
                    },
                    foreground: style.color,
                    minHeight: style.minHeight,
                    surface: style
                        .getPropertyValue('--header-surface-background')
                        .trim(),
                    surfaceForeground: style
                        .getPropertyValue('--header-surface-foreground')
                        .trim(),
                    tint: style
                        .getPropertyValue('--header-surface-tint')
                        .trim(),
                };
            };

            (element as HTMLElement).style.transition = 'none';
            const enhanced = readState();
            document.documentElement.dataset.initialHeaderSurface =
                initialSurface;
            document.documentElement.toggleAttribute(
                'data-initial-header-collapsed',
                true,
            );
            element.setAttribute('data-header-surface', 'hero');
            element.removeAttribute('data-scrolled');
            element.removeAttribute('data-navigation-ready');

            return {
                enhanced,
                firstPaint: readState(),
            };
        }, surface);

        expect(states.firstPaint, hash).toEqual(states.enhanced);
    }
});

test('selects descendant anchor surfaces before deferred scripts load', async ({
    page,
}) => {
    await page.clock.setFixedTime(new Date(2026, 6, 14, 12, 0, 0));
    await page.route('**/*', async (route) => {
        if (route.request().resourceType() === 'script') {
            await route.abort();
            return;
        }

        await route.continue();
    });

    for (const { hash, surface, color } of [
        {
            hash: '#experience-title',
            surface: 'paper',
            color: paperThemeColor,
        },
        {
            hash: '#capabilities-title',
            surface: 'paper',
            color: paperThemeColor,
        },
        {
            hash: '#contact-title',
            surface: 'contact',
            color: footerThemeColors.midday,
        },
    ] as const) {
        await page.goto(`/?anchor=${hash.slice(1)}${hash}`);

        await expect(page.locator('html')).toHaveAttribute(
            'data-page-surface',
            surface,
        );
        await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
            'content',
            color,
        );
        await expect(page.locator('[data-site-header]')).not.toHaveAttribute(
            'data-navigation-ready',
        );
        const spacing = await page.locator(hash).evaluate((target) => {
            const header =
                document.querySelector<HTMLElement>('[data-site-header]');
            if (!header) return null;
            return (
                target.getBoundingClientRect().top -
                header.getBoundingClientRect().bottom
            );
        });
        expect(spacing).not.toBeNull();
        expect(spacing!).toBeGreaterThanOrEqual(16);
    }
});

test('persists the header and exact scroll position across reloads', async ({
    page,
}) => {
    await page.goto('/');
    await page.evaluate(() => {
        history.scrollRestoration = 'manual';
    });

    const header = page.locator('[data-site-header]');
    await scrollSectionUnderHeader(page, '#capabilities');
    await expect(header).toHaveAttribute('data-header-surface', 'paper');
    await expect(header).toHaveAttribute('data-scrolled', '');

    const restoredScrollY = await page.evaluate(() => window.scrollY);

    await expect
        .poll(() => page.evaluate(() => history.state?.portfolioHeader ?? null))
        .toEqual({
            collapsed: true,
            scrollY: restoredScrollY,
            surface: 'paper',
        });

    await page.reload();

    await expect(header).toHaveAttribute('data-header-surface', 'paper');
    await expect(header).toHaveAttribute('data-scrolled', '');
    await expect(page.locator('html')).toHaveAttribute(
        'data-page-surface',
        'paper',
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
        'content',
        paperThemeColor,
    );
    expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(
        restoredScrollY,
        0,
    );
});

test('clears restored hero hints after measuring the page', async ({
    page,
}) => {
    await page.goto('/');
    await page.evaluate(() => {
        history.scrollRestoration = 'manual';
        window.scrollTo(0, 100);
    });
    await expect(page.locator('[data-site-header]')).toHaveAttribute(
        'data-scrolled',
        '',
    );

    await page.reload();

    const root = page.locator('html');
    await expect(root).not.toHaveAttribute('data-initial-header-surface');
    await expect(root).not.toHaveAttribute('data-initial-header-scroll-y');
    await expect(root).not.toHaveAttribute('data-initial-header-collapsed');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('[data-site-header]')).not.toHaveAttribute(
        'data-scrolled',
    );
});

test('keeps the useful footer content fully visible in the sky at the true page end', async ({
    page,
}) => {
    await gotoAtLocalHour(page, 2);
    await waitForLayout(page);

    await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await waitForLayout(page);

    const layout = await page
        .locator('[data-contact-footer]')
        .evaluate((footer) => {
            const readBounds = (selector: string) => {
                const element = footer.querySelector<HTMLElement>(selector);
                if (!element) throw new Error(`Missing ${selector}`);

                const { bottom, left, right, top } =
                    element.getBoundingClientRect();

                return { bottom, left, right, top };
            };

            const siteHeader =
                document.querySelector<HTMLElement>('[data-site-header]');
            if (!siteHeader) throw new Error('Missing site header');

            return {
                elements: {
                    email: readBounds('.contact-footer__email'),
                    github: readBounds('a[href="https://github.com/albrtyng"]'),
                    heading: readBounds('#contact-title'),
                    linkedin: readBounds('a[href*="linkedin.com/in/albrtyng"]'),
                    supportingCopy: readBounds('.contact-footer__invitation p'),
                },
                headerBottom: siteHeader.getBoundingClientRect().bottom,
                maxScrollY:
                    document.documentElement.scrollHeight - window.innerHeight,
                meta: {
                    copyright: readBounds('.contact-footer__meta p:last-child'),
                    location: readBounds('.contact-footer__meta p:first-child'),
                },
                panorama: readBounds('[data-contact-panorama]'),
                scrollY: window.scrollY,
                skylineTop: readBounds('.distant-toronto-skyline__mainland')
                    .top,
                viewport: {
                    height: window.innerHeight,
                    width: window.innerWidth,
                },
            };
        });

    expect(Math.abs(layout.maxScrollY - layout.scrollY)).toBeLessThanOrEqual(1);

    const visibleSkyTop = Math.max(layout.headerBottom, layout.panorama.top);
    const visibleSkyBottom = layout.skylineTop;

    expect(
        visibleSkyBottom - visibleSkyTop,
        'The responsive crop should preserve enough usable sky for the contact content',
    ).toBeGreaterThan(0);

    for (const [name, bounds] of Object.entries(layout.elements)) {
        expect(
            bounds.top,
            `${name} should clear the fixed header`,
        ).toBeGreaterThanOrEqual(visibleSkyTop + 28);
        expect(
            bounds.bottom,
            `${name} should remain above the skyline`,
        ).toBeLessThanOrEqual(visibleSkyBottom - 12);
        expect(
            bounds.left,
            `${name} should remain inside the viewport`,
        ).toBeGreaterThanOrEqual(12);
        expect(
            bounds.right,
            `${name} should remain inside the viewport`,
        ).toBeLessThanOrEqual(layout.viewport.width - 12);
    }

    for (const [name, bounds] of Object.entries(layout.meta)) {
        expect(
            bounds.bottom,
            `${name} should sit near the bottom edge of the page`,
        ).toBeGreaterThanOrEqual(layout.viewport.height - 32);
        expect(
            bounds.bottom,
            `${name} should clear the bottom edge of the page`,
        ).toBeLessThanOrEqual(layout.viewport.height - 12);
    }

    expect(layout.meta.location.left).toBeGreaterThanOrEqual(12);
    expect(layout.meta.location.left).toBeLessThanOrEqual(
        layout.viewport.width * 0.08,
    );
    expect(layout.meta.copyright.right).toBeGreaterThanOrEqual(
        layout.viewport.width * 0.92,
    );
    expect(layout.meta.copyright.right).toBeLessThanOrEqual(
        layout.viewport.width - 12,
    );
    expect(layout.meta.location.right).toBeLessThan(layout.meta.copyright.left);
    expect(layout.elements.linkedin.right).toBeLessThan(
        layout.elements.github.left,
    );
});

test('expands the complete contact scene with collapsed mobile browser chrome', async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'chromium',
        'The dynamic mobile viewport is simulated explicitly in Chromium.',
    );

    await page.setViewportSize({ height: 568, width: 320 });
    await gotoAtLocalHour(page, 2);

    const heights = await page
        .locator('[data-contact-footer]')
        .evaluate((footer) => {
            const viewportUnit = getComputedStyle(footer)
                .getPropertyValue('--contact-viewport-height')
                .trim();
            footer.style.setProperty('--contact-viewport-height', '760px');
            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo(0, document.documentElement.scrollHeight);

            const panorama = footer.querySelector<HTMLElement>(
                '[data-contact-panorama]',
            );
            const skyField = footer.querySelector<HTMLElement>(
                '.contact-footer__sky-field',
            );
            const header = document.querySelector<HTMLElement>(
                '[data-site-header]',
            );
            if (!panorama || !skyField || !header) return null;

            return {
                footer: footer.getBoundingClientRect().height,
                footerTop: footer.getBoundingClientRect().top,
                headerTop: header.getBoundingClientRect().top,
                panorama: panorama.getBoundingClientRect().height,
                skyField: skyField.getBoundingClientRect().height,
                viewportUnit,
            };
        });

    expect(heights).not.toBeNull();
    expect(heights!.viewportUnit).toBe('100dvh');
    expect(heights!.footer).toBe(760);
    expect(heights!.panorama).toBe(760);
    expect(heights!.skyField).toBe(760);
    expect(heights!.footerTop).toBeLessThanOrEqual(heights!.headerTop);
});

test('keeps a resting gap below the compact header on short phones', async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'chromium',
        'The short-phone footer crop is sampled explicitly in Chromium.',
    );

    await page.setViewportSize({ height: 568, width: 320 });
    await gotoAtLocalHour(page, 2);
    await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await waitForLayout(page);

    const layout = await page
        .locator('[data-contact-footer]')
        .evaluate((footer) => {
            const header =
                document.querySelector<HTMLElement>('[data-site-header]');
            const copy = footer.querySelector<HTMLElement>(
                '[data-contact-copy]',
            );
            const skyline = footer.querySelector<SVGGraphicsElement>(
                '.distant-toronto-skyline__mainland',
            );
            if (!header || !copy || !skyline) return null;

            const headerBounds = header.getBoundingClientRect();
            const copyBounds = copy.getBoundingClientRect();
            const skylineBounds = skyline.getBoundingClientRect();

            return {
                copyBottom: copyBounds.bottom,
                copyTop: copyBounds.top,
                headerBottom: headerBounds.bottom,
                headerShadow: getComputedStyle(header).boxShadow,
                skylineTop: skylineBounds.top,
                profileLinkGap: (() => {
                    const linkedin = footer.querySelector<HTMLElement>(
                        'a[href*="linkedin.com/in/albrtyng"]',
                    );
                    const github = footer.querySelector<HTMLElement>(
                        'a[href="https://github.com/albrtyng"]',
                    );
                    if (!linkedin || !github) return null;
                    return (
                        github.getBoundingClientRect().left -
                        linkedin.getBoundingClientRect().right
                    );
                })(),
            };
        });

    expect(layout).not.toBeNull();
    expect(layout!.copyTop - layout!.headerBottom).toBeGreaterThanOrEqual(28);
    expect(layout!.skylineTop - layout!.copyBottom).toBeGreaterThanOrEqual(12);
    expect(layout!.profileLinkGap).not.toBeNull();
    expect(layout!.profileLinkGap!).toBeGreaterThan(0);
    expect(layout!.headerShadow).toBe('none');
});

test('uses a panel-free contact stack with AA contrast in every sky state', async ({
    page,
}) => {
    test.skip(
        (page.viewportSize()?.width ?? 0) < 64 * 16,
        'Colour tokens are viewport-independent; responsive geometry is covered separately.',
    );

    for (const { hour, state } of localTimeScenarios) {
        await gotoAtLocalHour(page, hour);
        await waitForLayout(page);

        const treatment = await page
            .locator('[data-contact-footer]')
            .evaluate((footer) => {
                const copy = footer.querySelector<HTMLElement>(
                    '[data-contact-copy]',
                );
                const email = footer.querySelector<HTMLElement>(
                    '.contact-footer__email',
                );
                const heading =
                    footer.querySelector<HTMLElement>('#contact-title');
                const linkedin = footer.querySelector<HTMLElement>(
                    'a[href*="linkedin.com/in/albrtyng"]',
                );

                if (!copy || !email || !heading || !linkedin) {
                    throw new Error('Missing footer contact content');
                }

                const parseRgb = (value: string) => {
                    const channels = value.match(/[\d.]+/g)?.slice(0, 3);
                    if (!channels || channels.length !== 3) {
                        throw new Error(`Unable to parse colour: ${value}`);
                    }

                    return channels.map(Number);
                };
                const luminance = (value: string) => {
                    const channels = parseRgb(value).map((channel) => {
                        const normalized = channel / 255;
                        return normalized <= 0.04045
                            ? normalized / 12.92
                            : ((normalized + 0.055) / 1.055) ** 2.4;
                    });

                    return (
                        0.2126 * channels[0]! +
                        0.7152 * channels[1]! +
                        0.0722 * channels[2]!
                    );
                };
                const contrast = (foreground: string, background: string) => {
                    const foregroundLuminance = luminance(foreground);
                    const backgroundLuminance = luminance(background);
                    const lighter = Math.max(
                        foregroundLuminance,
                        backgroundLuminance,
                    );
                    const darker = Math.min(
                        foregroundLuminance,
                        backgroundLuminance,
                    );

                    return (lighter + 0.05) / (darker + 0.05);
                };
                const footerBackground =
                    getComputedStyle(footer).backgroundColor;
                const copySurface = getComputedStyle(copy, '::before');
                const emailBounds = email.getBoundingClientRect();
                const linkedinBounds = linkedin.getBoundingClientRect();

                return {
                    contrast: contrast(
                        getComputedStyle(heading).color,
                        footerBackground,
                    ),
                    emailBottom: emailBounds.bottom,
                    linkedinTop: linkedinBounds.top,
                    panel: {
                        backdropFilter: copySurface.backdropFilter,
                        backgroundColor: copySurface.backgroundColor,
                        content: copySurface.content,
                    },
                };
            });

        expect(
            treatment.panel,
            `${state} should not render a glass panel`,
        ).toEqual({
            backdropFilter: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0)',
            content: 'none',
        });
        expect(
            treatment.linkedinTop,
            `${state} LinkedIn placement`,
        ).toBeGreaterThanOrEqual(treatment.emailBottom + 4);
        expect(
            treatment.contrast,
            `${state} footer contrast`,
        ).toBeGreaterThanOrEqual(4.5);
    }
});

test('keeps the hero header translucent and the local-light note safely in view', async ({
    page,
}) => {
    await gotoAtLocalHour(page, 12);
    await waitForLayout(page);

    const header = page.locator('[data-site-header]');
    const note = page.locator('.hero__scene-note');

    const headerSurface = await header.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
            backgroundColor: style.backgroundColor,
            backdropFilter: style.backdropFilter,
            dividerContent: getComputedStyle(element, '::after').content,
            height: element.getBoundingClientRect().height,
            viewportWidth: window.innerWidth,
        };
    });

    expect(headerSurface.backdropFilter).toContain('blur(20px)');
    expect(headerSurface.backgroundColor).toMatch(/\/(?:\s*)0\./);
    expect(headerSurface.dividerContent).toBe('none');
    expect(headerSurface.height).toBeLessThanOrEqual(
        headerSurface.viewportWidth <= 48 * 16 ? 68 : 72,
    );

    const noteBounds = await note.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return {
            top: bounds.top,
            bottom: bounds.bottom,
            viewportHeight: window.innerHeight,
        };
    });

    expect(noteBounds.top).toBeGreaterThanOrEqual(0);
    expect(
        noteBounds.viewportHeight - noteBounds.bottom,
    ).toBeGreaterThanOrEqual(24);
});

test('springs the frosted header into a centered pill after scrolling and restores it at the top', async ({
    page,
}) => {
    await gotoAtLocalHour(page, 12);
    await waitForLayout(page);

    const header = page.locator('[data-site-header]');
    const readHeaderTreatment = () =>
        header.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const durationSeconds = style.transitionDuration
                .split(',')
                .map((duration) => duration.trim())
                .map((duration) =>
                    duration.endsWith('ms')
                        ? Number.parseFloat(duration) / 1000
                        : Number.parseFloat(duration),
                );

            return {
                backdropFilter: style.backdropFilter,
                backgroundColor: style.backgroundColor,
                borderColor: style.borderTopColor,
                borderRadius: Number.parseFloat(style.borderTopLeftRadius),
                boxShadow: style.boxShadow,
                height: bounds.height,
                left: bounds.left,
                maxTransitionDuration: Math.max(...durationSeconds),
                right: bounds.right,
                springTiming: style.transitionTimingFunction,
                top: bounds.top,
                viewportWidth: document.documentElement.clientWidth,
                width: bounds.width,
            };
        });

    await expect(header).not.toHaveAttribute('data-scrolled', '');
    const expanded = await readHeaderTreatment();

    expect(expanded.left).toBeLessThanOrEqual(1);
    expect(expanded.viewportWidth - expanded.right).toBeLessThanOrEqual(1);
    expect(expanded.borderRadius).toBeLessThanOrEqual(1);
    expect(expanded.boxShadow).toBe('none');
    expect(expanded.top).toBeLessThanOrEqual(1);

    await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, 1);
    });
    await expect(header).toHaveAttribute('data-scrolled', '');

    await page.evaluate(() => window.scrollTo(0, 180));
    await page.waitForTimeout(800);

    const collapsed = await readHeaderTreatment();
    const rightMargin = collapsed.viewportWidth - collapsed.right;

    expect(collapsed.left).toBeGreaterThanOrEqual(8);
    expect(rightMargin).toBeGreaterThanOrEqual(8);
    expect(Math.abs(collapsed.left - rightMargin)).toBeLessThanOrEqual(1);
    expect(collapsed.width).toBeLessThan(
        expanded.width - Math.min(24, expanded.width * 0.04),
    );
    expect(collapsed.borderRadius).toBeGreaterThanOrEqual(
        collapsed.height / 2 - 1,
    );
    expect(collapsed.top).toBeGreaterThanOrEqual(8);
    expect(collapsed.backdropFilter).toBe(expanded.backdropFilter);
    expect(collapsed.backgroundColor).toBe(expanded.backgroundColor);
    expect(collapsed.borderColor).not.toBe(expanded.borderColor);
    expect(collapsed.boxShadow).toBe('none');
    expect(collapsed.springTiming).toContain('linear(');
    expect(collapsed.maxTransitionDuration).toBeGreaterThanOrEqual(0.6);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header).not.toHaveAttribute('data-scrolled', '');
    await page.waitForTimeout(800);

    const restored = await readHeaderTreatment();
    expect(restored.left).toBeLessThanOrEqual(1);
    expect(restored.viewportWidth - restored.right).toBeLessThanOrEqual(1);
    expect(restored.width).toBeCloseTo(expanded.width, 0);
    expect(restored.borderRadius).toBeLessThanOrEqual(1);
    expect(restored.boxShadow).toBe('none');
    expect(restored.top).toBeLessThanOrEqual(1);
});

test('keeps the midday celestial clear of the fixed header across desktop crops', async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'chromium',
        'Desktop celestial clearance is sampled explicitly in Chromium.',
    );

    const desktopViewports = [
        { height: 549, label: 'short desktop', width: 1024 },
        { height: 720, label: 'standard desktop', width: 1280 },
        { height: 945, label: 'wide desktop', width: 1728 },
    ] as const;

    for (const viewport of desktopViewports) {
        await page.setViewportSize(viewport);
        await gotoAtLocalHour(page, 12);
        await waitForLayout(page);

        const clearance = await page.locator('#hero').evaluate((hero) => {
            const header =
                document.querySelector<HTMLElement>('[data-site-header]');
            const halo = hero.querySelector<SVGGraphicsElement>(
                '.skyline__celestial .celestial-disc__halo',
            );
            if (!header || !halo) return null;

            return (
                halo.getBoundingClientRect().top -
                header.getBoundingClientRect().bottom
            );
        });

        expect(clearance, viewport.label).not.toBeNull();
        expect(
            clearance,
            `${viewport.label}: the celestial halo needs breathing room below the header`,
        ).toBeGreaterThanOrEqual(20);
    }
});

test('vertically centers the hero copy panel in short desktop viewports', async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'chromium',
        'Short desktop panel geometry is sampled explicitly in Chromium.',
    );

    const shortDesktopViewports = [
        { height: 549, label: 'short laptop', width: 1024 },
        { height: 720, label: 'standard laptop', width: 1280 },
    ] as const;

    for (const viewport of shortDesktopViewports) {
        await page.setViewportSize(viewport);
        await gotoAtLocalHour(page, 12);
        await waitForLayout(page);

        const geometry = await page.locator('#hero').evaluate((hero) => {
            const header =
                document.querySelector<HTMLElement>('[data-site-header]');
            const panel = hero.querySelector<HTMLElement>(
                '[data-hero-copy-panel]',
            );
            if (!header || !panel) return null;

            const headerBounds = header.getBoundingClientRect();
            const panelBounds = panel.getBoundingClientRect();

            return {
                headerBottom: headerBounds.bottom,
                panel: {
                    bottom: panelBounds.bottom,
                    center: panelBounds.top + panelBounds.height / 2,
                    top: panelBounds.top,
                },
                viewportHeight: window.innerHeight,
            };
        });

        expect(geometry, viewport.label).not.toBeNull();
        expect(
            Math.abs(geometry!.panel.center - geometry!.viewportHeight / 2),
            `${viewport.label}: panel center should align with the viewport center`,
        ).toBeLessThanOrEqual(18);
        expect(
            geometry!.panel.top - geometry!.headerBottom,
            `${viewport.label}: panel should clear the fixed header`,
        ).toBeGreaterThanOrEqual(12);
        expect(
            geometry!.viewportHeight - geometry!.panel.bottom,
            `${viewport.label}: panel should remain fully visible`,
        ).toBeGreaterThanOrEqual(12);
    }
});

test('uses the hero contrast pane only when the skyline can rise behind the copy', async ({
    page,
}) => {
    await gotoAtLocalHour(page, 12);
    await waitForLayout(page);

    const hero = page.locator('#hero');
    const copyPanel = hero.locator('[data-hero-copy-panel]');
    const copyPanelOutline = hero.locator('[data-hero-copy-outline]');
    const actions = hero.locator('.hero__actions');
    const primaryAction = actions.getByRole('link', {
        name: /explore my work/i,
    });
    const textAction = actions.getByRole('link', { name: /get in touch/i });
    const viewport = page.viewportSize();
    const usesOpenSkyCopy =
        Boolean(viewport) &&
        viewport!.width >= 40 * 16 &&
        viewport!.width <= 72 * 16 &&
        viewport!.height >= 50 * 16;
    const usesFeatheredContrast =
        Boolean(viewport) &&
        viewport!.width > 72 * 16 &&
        viewport!.height >= 50 * 16;

    await expect(copyPanel).toHaveCount(1);
    await expect(copyPanelOutline).toBeAttached();

    if (usesOpenSkyCopy) {
        await expect(copyPanel).toBeHidden();
        await expect(primaryAction).toBeVisible();
        await expect(textAction).toBeVisible();
        return;
    }

    await expect(copyPanel).toBeVisible();

    const pane = await hero.evaluate((element) => {
        const panel = element.querySelector<HTMLElement>(
            '[data-hero-copy-panel]',
        );
        const outline = element.querySelector<SVGSVGElement>(
            '[data-hero-copy-outline]',
        );
        const actionGroup =
            element.querySelector<HTMLElement>('.hero__actions');
        const primaryLink = element.querySelector<HTMLElement>(
            '.hero__primary-link',
        );
        const textLink = element.querySelector<HTMLElement>('.hero__text-link');
        const celestial =
            element.querySelector<SVGGraphicsElement>('[data-sky-object]');
        const tower = element.querySelector<SVGGraphicsElement>(
            '[data-landmark="cn-tower"]',
        );
        const copyElements = [
            element.querySelector<HTMLElement>('.hero__eyebrow'),
            element.querySelector<HTMLElement>('.hero__title'),
            element.querySelector<HTMLElement>('.hero__statement'),
            actionGroup,
        ];

        if (
            !panel ||
            !outline ||
            !actionGroup ||
            !primaryLink ||
            !textLink ||
            !celestial ||
            !tower ||
            copyElements.some((candidate) => !candidate)
        ) {
            return null;
        }

        const panelBounds = panel.getBoundingClientRect();
        const outlineBounds = outline.getBoundingClientRect();
        const panelStyle = getComputedStyle(panel);
        const outlineStyle = getComputedStyle(outline);
        const outlinePath = outline
            .querySelector<SVGPathElement>('path')
            ?.getAttribute('d');
        const actionSurfaceStyle = getComputedStyle(actionGroup, '::before');
        const primaryStyle = getComputedStyle(primaryLink);
        const textStyle = getComputedStyle(textLink);
        const copyBounds = copyElements.map((candidate) =>
            candidate!.getBoundingClientRect(),
        );
        const celestialBounds = celestial.getBoundingClientRect();
        const towerBounds = tower.getBoundingClientRect();
        const backdropFilter =
            panelStyle.backdropFilter ||
            panelStyle.getPropertyValue('-webkit-backdrop-filter');
        const priorPanelStyles = {
            pointerEvents: panel.style.pointerEvents,
            zIndex: panel.style.zIndex,
        };
        panel.style.pointerEvents = 'auto';
        panel.style.zIndex = '999';

        const panelContainsPoint = (x: number, y: number) => {
            const hit = document.elementFromPoint(x, y);
            return hit === panel || Boolean(hit && panel.contains(hit));
        };
        const atPanelRatio = (x: number, y: number) => ({
            x: panelBounds.left + panelBounds.width * x,
            y: panelBounds.top + panelBounds.height * y,
        });
        const linkCoverage = [primaryLink, textLink].map((link) => {
            const bounds = link.getBoundingClientRect();
            return panelContainsPoint(
                bounds.left + bounds.width / 2,
                bounds.top + bounds.height / 2,
            );
        });
        const textCoverage = copyElements.slice(0, 3).flatMap((copyElement) => {
            const range = document.createRange();
            range.selectNodeContents(copyElement!);

            return Array.from(range.getClientRects()).flatMap((bounds) => [
                panelContainsPoint(bounds.left + 2, bounds.top + 2),
                panelContainsPoint(bounds.right - 2, bounds.bottom - 2),
            ]);
        });
        const topRight = atPanelRatio(0.86, 0.16);
        const bottomLeft = atPanelRatio(0.18, 0.86);
        const cutout = atPanelRatio(0.86, 0.86);
        const coverage = {
            bottomLeft: panelContainsPoint(bottomLeft.x, bottomLeft.y),
            celestial: panelContainsPoint(
                celestialBounds.left + celestialBounds.width / 2,
                celestialBounds.top + celestialBounds.height / 2,
            ),
            cutout: panelContainsPoint(cutout.x, cutout.y),
            links: linkCoverage,
            text: textCoverage,
            topRight: panelContainsPoint(topRight.x, topRight.y),
            towerTip: panelContainsPoint(
                towerBounds.left + towerBounds.width / 2,
                towerBounds.top + Math.min(12, towerBounds.height * 0.08),
            ),
        };

        panel.style.pointerEvents = priorPanelStyles.pointerEvents;
        panel.style.zIndex = priorPanelStyles.zIndex;

        return {
            supportsBackdropFilter:
                CSS.supports('backdrop-filter', 'blur(1px)') ||
                CSS.supports('-webkit-backdrop-filter', 'blur(1px)'),
            backgroundImage: panelStyle.backgroundImage,
            backdropFilter,
            borderRadius: panelStyle.borderRadius,
            clipPath: panelStyle.clipPath,
            coverage,
            outlinePath,
            outline: {
                bottom: outlineBounds.bottom,
                clipsWithPanel: panel.contains(outline),
                left: outlineBounds.left,
                overflow: outlineStyle.overflow,
                right: outlineBounds.right,
                top: outlineBounds.top,
            },
            panel: {
                top: panelBounds.top,
                right: panelBounds.right,
                bottom: panelBounds.bottom,
                left: panelBounds.left,
            },
            copy: {
                top: Math.min(...copyBounds.map(({ top }) => top)),
                right: Math.max(...copyBounds.map(({ right }) => right)),
                bottom: Math.max(...copyBounds.map(({ bottom }) => bottom)),
                left: Math.min(...copyBounds.map(({ left }) => left)),
            },
            actionSurface: {
                backdropFilter:
                    actionSurfaceStyle.backdropFilter ||
                    actionSurfaceStyle.getPropertyValue(
                        '-webkit-backdrop-filter',
                    ),
                clipPath: actionSurfaceStyle.clipPath,
                content: actionSurfaceStyle.content,
            },
            controls: {
                primaryBorderStyle: primaryStyle.borderTopStyle,
                primaryBorderWidth: Number.parseFloat(
                    primaryStyle.borderTopWidth,
                ),
                textBorderStyle: textStyle.borderBottomStyle,
                textBorderWidth: Number.parseFloat(textStyle.borderBottomWidth),
            },
        };
    });

    expect(pane).not.toBeNull();
    expect(pane!.panel.top).toBeLessThan(pane!.copy.top);
    expect(pane!.panel.right).toBeGreaterThanOrEqual(pane!.copy.right);
    expect(pane!.panel.bottom).toBeGreaterThan(pane!.copy.bottom);
    expect(pane!.panel.left).toBeLessThanOrEqual(pane!.copy.left);
    expect(pane!.clipPath).toContain('polygon');
    expect(Number.parseFloat(pane!.borderRadius)).toBeGreaterThan(0);
    expect(pane!.outlinePath).toBeTruthy();
    expect(pane!.outlinePath).not.toContain('C');
    expect(pane!.outlinePath?.match(/Q/g)).toHaveLength(6);
    expect(pane!.outline.clipsWithPanel).toBe(false);
    expect(pane!.outline.overflow).toBe('visible');
    expect(pane!.outline.top).toBeLessThan(pane!.panel.top);
    expect(pane!.outline.right).toBeGreaterThan(pane!.panel.right);
    expect(pane!.outline.bottom).toBeGreaterThan(pane!.panel.bottom);
    expect(pane!.outline.left).toBeLessThan(pane!.panel.left);
    expect(pane!.coverage.topRight).toBe(true);
    expect(pane!.coverage.bottomLeft).toBe(true);
    expect(pane!.coverage.cutout).toBe(false);
    expect(pane!.coverage.links).toEqual([true, true]);
    expect(pane!.coverage.text.every(Boolean)).toBe(true);
    expect(pane!.coverage.celestial).toBe(false);
    expect(pane!.coverage.towerTip).toBe(false);

    if (usesFeatheredContrast) {
        expect(pane!.backgroundImage).toContain('linear-gradient');
        expect(pane!.backdropFilter).toBe('none');
    } else if (pane!.supportsBackdropFilter) {
        const blur = pane!.backdropFilter.match(/blur\(\s*([\d.]+)px\s*\)/);

        expect(pane!.backdropFilter).not.toBe('none');
        expect(blur).not.toBeNull();
        expect(Number.parseFloat(blur![1])).toBeGreaterThanOrEqual(4);
    }

    expect(pane!.actionSurface.content).toBe('none');
    expect(pane!.actionSurface.clipPath).toBe('none');
    expect(pane!.actionSurface.backdropFilter).toBe('none');

    expect(pane!.controls.primaryBorderStyle).toBe('none');
    expect(pane!.controls.primaryBorderWidth).toBe(0);
    expect(pane!.controls.textBorderStyle).toBe('solid');
    expect(pane!.controls.textBorderWidth).toBeGreaterThanOrEqual(1);
    await expect(
        primaryAction.locator('.marker-outline__stroke'),
    ).toBeAttached();
    await expect(textAction).toBeVisible();
});

test('keeps the full CN Tower beacon inside the mobile panel cutout', async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'chromium',
        'The mobile beacon clearance viewports are sampled explicitly in Chromium.',
    );

    await page.emulateMedia({ reducedMotion: 'reduce' });

    for (const viewport of [
        { height: 568, width: 320 },
        { height: 667, width: 320 },
        { height: 844, width: 390 },
    ]) {
        await page.setViewportSize(viewport);
        await gotoAtLocalHour(page, 2);
        await waitForLayout(page);

        const clearance = await page.locator('#hero').evaluate((hero) => {
            const panel = hero.querySelector<HTMLElement>(
                '[data-hero-copy-panel]',
            );
            const beacon = hero.querySelector<SVGGraphicsElement>(
                '[data-landmark="cn-tower"] [data-beacon]',
            );
            if (!panel || !beacon) return null;

            const panelBounds = panel.getBoundingClientRect();
            const beaconBounds = beacon.getBoundingClientRect();
            const center = {
                x: beaconBounds.left + beaconBounds.width / 2,
                y: beaconBounds.top + beaconBounds.height / 2,
            };
            const probes = [
                { edge: 'center', x: center.x, y: center.y },
                { edge: 'top', x: center.x, y: beaconBounds.top + 1 },
                {
                    edge: 'right',
                    x: beaconBounds.right - 1,
                    y: center.y,
                },
                {
                    edge: 'bottom',
                    x: center.x,
                    y: beaconBounds.bottom - 1,
                },
                { edge: 'left', x: beaconBounds.left + 1, y: center.y },
            ];
            const priorPanelStyles = {
                pointerEvents: panel.style.pointerEvents,
                zIndex: panel.style.zIndex,
            };

            panel.style.pointerEvents = 'auto';
            panel.style.zIndex = '999';

            const occludedEdges = probes.flatMap(({ edge, x, y }) => {
                const hit = document.elementFromPoint(x, y);
                return hit === panel || Boolean(hit && panel.contains(hit))
                    ? [edge]
                    : [];
            });

            panel.style.pointerEvents = priorPanelStyles.pointerEvents;
            panel.style.zIndex = priorPanelStyles.zIndex;

            return {
                beacon: {
                    bottom: beaconBounds.bottom,
                    left: beaconBounds.left,
                    right: beaconBounds.right,
                    top: beaconBounds.top,
                },
                occludedEdges,
                panel: {
                    bottom: panelBounds.bottom,
                    left: panelBounds.left,
                    right: panelBounds.right,
                    top: panelBounds.top,
                },
                viewportWidth: document.documentElement.clientWidth,
            };
        });

        expect(
            clearance,
            `${viewport.width}×${viewport.height}`,
        ).not.toBeNull();
        expect(
            clearance!.occludedEdges,
            `${viewport.width}×${viewport.height}: beacon edges hidden by the copy panel`,
        ).toEqual([]);
        expect(clearance!.beacon.left).toBeGreaterThanOrEqual(0);
        expect(clearance!.beacon.right).toBeLessThanOrEqual(
            clearance!.viewportWidth,
        );
    }
});

test('moves current profile facts into the experience intro without decorative backing', async ({
    page,
}) => {
    await page.goto('/');

    const hero = page.locator('#hero');
    const experience = page.locator('#experience');
    const profile = experience.locator('[data-experience-profile]');
    const summary = experience.locator('.experience__summary');

    await expect(hero.locator('[data-profile-shape]')).toHaveCount(0);
    await expect(hero.locator('[data-profile-cloud]')).toHaveCount(0);
    await expect(hero.locator('[data-profile-ground]')).toHaveCount(0);
    await expect(hero.locator('.hero__facts')).toHaveCount(0);

    await expect(profile).toBeVisible();
    await expect(profile).toHaveAccessibleName('Current profile');
    await expect(profile).toContainText('Now');
    await expect(profile).toContainText('Software Engineer II · Super.com');
    await expect(profile).toContainText('Perspective');
    await expect(profile).toContainText(
        '6+ years · Canada-based, working globally',
    );
    await expect(profile.locator('svg')).toHaveCount(0);
    await expect(summary).toBeVisible();

    const placement = await experience.evaluate((element) => {
        const profile = element.querySelector<HTMLElement>(
            '[data-experience-profile]',
        );
        const summary = element.querySelector<HTMLElement>(
            '.experience__summary',
        );
        if (!profile || !summary) return null;

        const profileBounds = profile.getBoundingClientRect();
        const summaryBounds = summary.getBoundingClientRect();

        return {
            profileBottom: profileBounds.bottom,
            profileBeforeSummary: Boolean(
                profile.compareDocumentPosition(summary) &
                Node.DOCUMENT_POSITION_FOLLOWING,
            ),
            summaryTop: summaryBounds.top,
        };
    });

    expect(placement).not.toBeNull();
    expect(placement!.profileBeforeSummary).toBe(true);
    expect(placement!.profileBottom).toBeLessThanOrEqual(placement!.summaryTop);
});

test('keeps the short-phone local-light control clear after removing hero facts', async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'chromium',
        'The narrow-phone dimensions are set explicitly in Chromium.',
    );

    await page.clock.setFixedTime(new Date(2026, 6, 14, 12, 0, 0));

    for (const height of [667, 568]) {
        await page.setViewportSize({ width: 320, height });
        await page.goto('/');
        await waitForLayout(page);

        const geometry = await page.locator('#hero').evaluate((hero) => {
            const note = hero.querySelector<HTMLElement>('.hero__scene-note');
            if (!note) return null;

            const noteBounds = note.getBoundingClientRect();
            const noteSurfaceStyle = getComputedStyle(note, '::before');

            return {
                hasProfileShape: Boolean(
                    hero.querySelector('[data-profile-shape]'),
                ),
                note: {
                    left:
                        noteBounds.left +
                        Number.parseFloat(noteSurfaceStyle.left),
                    right:
                        noteBounds.right -
                        Number.parseFloat(noteSurfaceStyle.right),
                },
                viewportWidth: document.documentElement.clientWidth,
            };
        });

        expect(geometry, `hero geometry at 320×${height}`).not.toBeNull();
        expect(geometry!.hasProfileShape).toBe(false);
        expect(geometry!.note.left).toBeGreaterThanOrEqual(0);
        expect(geometry!.note.right).toBeLessThanOrEqual(
            geometry!.viewportWidth,
        );

        const sectionWidths = await page
            .locator('#hero, #experience, #contact')
            .evaluateAll((sections) =>
                sections.map((section) => ({
                    clientWidth: section.clientWidth,
                    id: section.id,
                    scrollWidth: section.scrollWidth,
                })),
            );

        for (const section of sectionWidths) {
            expect(
                section.scrollWidth,
                `#${section.id} section overflow at 320×${height}`,
            ).toBeLessThanOrEqual(section.clientWidth + 1);
        }
    }
});

test('draws the open chalk control outline for pointer and keyboard users', async ({
    page,
    isMobile,
}) => {
    await page.goto('/');

    const explore = page.getByRole('link', { name: /explore my work/i });
    const work = page.getByRole('link', { name: /^work$/i });
    const toolkit = page.getByRole('link', { name: /^toolkit$/i });
    const sayHello = page.getByRole('link', { name: /say hello/i });
    const brand = page.getByRole('link', {
        name: /AY Albert Yang, back to top/i,
    });
    const skipLink = page.getByRole('link', { name: /skip to experience/i });

    const expectDrawn = async (control: typeof explore) => {
        const stroke = control.locator('.marker-outline__stroke');
        await expect(stroke).toHaveCSS('opacity', '1');
        await expect
            .poll(() =>
                stroke.evaluate((element) =>
                    Number.parseFloat(
                        getComputedStyle(element).strokeDashoffset,
                    ),
                ),
            )
            .toBeLessThanOrEqual(0.01);
    };

    if (!isMobile) {
        await explore.hover();
        await expectDrawn(explore);

        for (const navigationLink of [work, toolkit]) {
            await navigationLink.hover();
            await expectDrawn(navigationLink);
        }

        const exploreStroke = explore.locator('.marker-outline__stroke');
        await page.mouse.move(1, 1);
        await expect(exploreStroke).toHaveCSS('animation-name', 'none');
        await expect
            .poll(() =>
                exploreStroke.evaluate((element) =>
                    Number.parseFloat(
                        getComputedStyle(element).strokeDashoffset,
                    ),
                ),
            )
            .toBeGreaterThanOrEqual(1.34);

        await explore.hover();
        await expect(exploreStroke).toHaveCSS(
            'animation-name',
            'marker-outline-draw',
        );
        await expect(exploreStroke).toHaveCSS('animation-fill-mode', 'both');
        await expect
            .poll(() =>
                exploreStroke.evaluate((element) =>
                    Number.parseFloat(
                        getComputedStyle(element).strokeDasharray,
                    ),
                ),
            )
            .toBeGreaterThanOrEqual(1.34);
        await expectDrawn(explore);

        await page.mouse.down();
        await expect
            .poll(() =>
                explore.evaluate(
                    (element) => getComputedStyle(element).transform,
                ),
            )
            .not.toBe('none');
        await page.mouse.up();
    }

    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(brand).toBeFocused();
    await expectDrawn(brand);

    await page.keyboard.press('Tab');
    await expect(work).toBeFocused();
    await expectDrawn(work);

    await page.keyboard.press('Tab');
    await expect(toolkit).toBeFocused();
    await expectDrawn(toolkit);

    await page.keyboard.press('Tab');
    await expect(sayHello).toBeFocused();
    await expectDrawn(sayHello);

    await page.keyboard.press('Tab');
    await expect(explore).toBeFocused();
    await expectDrawn(explore);

    for (const control of [explore, work, toolkit, sayHello]) {
        await expect(control).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(control).toHaveCSS('border-top-style', 'none');
    }

    for (const navigationLink of [work, toolkit]) {
        expect(
            await navigationLink.evaluate(
                (element) => getComputedStyle(element, '::after').content,
            ),
        ).toBe('none');
    }

    const outlineGeometry = await explore
        .locator('.marker-outline__stroke')
        .evaluate((element) => {
            const path = element as SVGPathElement;
            const start = path.getPointAtLength(0);
            const end = path.getPointAtLength(path.getTotalLength());

            return {
                endpointGap: Math.hypot(end.x - start.x, end.y - start.y),
                end: { x: end.x, y: end.y },
                start: { x: start.x, y: start.y },
                strokeWidth: Number.parseFloat(
                    getComputedStyle(path).strokeWidth,
                ),
            };
        });
    expect(outlineGeometry.endpointGap).toBeGreaterThan(15);
    expect(outlineGeometry.start.x).toBeGreaterThan(95);
    expect(outlineGeometry.start.y).toBeLessThan(10);
    expect(outlineGeometry.end.x).toBeLessThan(outlineGeometry.start.x - 25);
    expect(outlineGeometry.end.y).toBeGreaterThan(outlineGeometry.start.y + 4);
    expect(outlineGeometry.strokeWidth).toBeGreaterThanOrEqual(2);
    await expect(explore.locator('.marker-outline__texture')).toHaveCount(0);

    const outlineClearance = await explore.evaluate((element) => {
        const outline = element.querySelector<SVGSVGElement>('.marker-outline');
        if (!outline) return null;

        const controlBounds = element.getBoundingClientRect();
        const outlineBounds = outline.getBoundingClientRect();

        return {
            left: controlBounds.left - outlineBounds.left,
            right: outlineBounds.right - controlBounds.right,
        };
    });
    expect(outlineClearance).not.toBeNull();
    expect(outlineClearance!.left).toBeGreaterThanOrEqual(7);
    expect(outlineClearance!.right).toBeGreaterThanOrEqual(7);
});

test('keeps skyline depth tied to scrolling instead of pointer movement', async ({
    page,
}) => {
    await page.goto('/');

    const scene = page.locator('[data-skyline-scene]');
    await expect(scene).toHaveAttribute('data-motion', 'active');
    await waitForLayout(page);

    const initialOffsets = await getSkylineOffsets(page);

    await page.mouse.move(24, 24);
    await page.mouse.move(
        Math.max((page.viewportSize()?.width ?? 320) - 24, 24),
        Math.max((page.viewportSize()?.height ?? 640) - 24, 24),
    );
    await waitForLayout(page);

    expect(await getSkylineOffsets(page)).toEqual(initialOffsets);

    await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, 240);
    });

    await expect
        .poll(async () => (await getSkylineOffsets(page)).y)
        .toBeGreaterThan(initialOffsets.y + 0.5);
    expect((await getSkylineOffsets(page)).x).toBeGreaterThan(initialOffsets.x);
});

test('keeps atmospheric loops continuous and pauses them off-screen', async ({
    page,
    isMobile,
}) => {
    test.skip(isMobile, 'Compact scenes intentionally omit moving clouds.');

    await gotoAtLocalHour(page, 12);

    const scene = page.locator('[data-skyline-scene]');
    await expect(scene).toHaveAttribute('data-motion', 'active');

    const clouds = await scene
        .locator('.skyline__cloud')
        .evaluateAll((elements) =>
            elements.map((element) => {
                const animation = element
                    .getAnimations()
                    .find((candidate) => candidate instanceof CSSAnimation);
                const keyframes =
                    animation?.effect instanceof KeyframeEffect
                        ? animation.effect.getKeyframes()
                        : [];
                const bounds = (element as SVGGraphicsElement).getBBox();
                const endpointX = keyframes.map(
                    (keyframe) =>
                        new DOMMatrixReadOnly(String(keyframe.transform)).m41,
                );
                const timing = animation?.effect?.getComputedTiming();

                return {
                    name:
                        animation instanceof CSSAnimation
                            ? animation.animationName
                            : null,
                    duration: timing?.duration ?? null,
                    easing: timing?.easing ?? null,
                    iterations: timing?.iterations ?? null,
                    playState: animation?.playState ?? null,
                    leftEndpoints: endpointX.map((x) => x + bounds.x),
                    rightEndpoints: endpointX.map(
                        (x) => x + bounds.x + bounds.width,
                    ),
                };
            }),
        );

    expect(clouds).toHaveLength(4);
    expect(new Set(clouds.map(({ name }) => name)).size).toBe(4);
    expect(new Set(clouds.map(({ duration }) => duration)).size).toBe(4);
    for (const cloud of clouds) {
        expect(cloud.playState).toBe('running');
        expect(cloud.easing).toBe('linear');
        expect(cloud.iterations).toBe(Infinity);
        expect(Math.min(...cloud.rightEndpoints)).toBeLessThan(0);
        expect(Math.max(...cloud.leftEndpoints)).toBeGreaterThan(1600);
    }

    const cloudBoundarySamples = await scene
        .locator('.skyline__cloud')
        .evaluateAll((elements) =>
            elements.map((element) => {
                const animation = element
                    .getAnimations()
                    .find((candidate) => candidate instanceof CSSAnimation);
                const duration = Number(
                    animation?.effect?.getComputedTiming().duration ?? 0,
                );
                const delay = Number(animation?.effect?.getTiming().delay ?? 0);
                const originalTime = animation?.currentTime ?? 0;
                const isVisible = () => {
                    const bounds = element.getBoundingClientRect();
                    return bounds.right > 0 && bounds.left < window.innerWidth;
                };
                const samples = [1, 2].map((iteration) => {
                    if (!animation || duration <= 0) {
                        return { beforeVisible: true, afterVisible: true };
                    }

                    const boundaryTime = duration * iteration + delay;
                    animation.currentTime = boundaryTime - 1;
                    const beforeVisible = isVisible();
                    animation.currentTime = boundaryTime + 1;
                    const afterVisible = isVisible();

                    return { beforeVisible, afterVisible };
                });

                if (animation) animation.currentTime = originalTime;
                return samples;
            }),
        );

    for (const cloudSamples of cloudBoundarySamples) {
        expect(cloudSamples).toHaveLength(2);
        for (const sample of cloudSamples) {
            expect(sample.beforeVisible).toBe(false);
            expect(sample.afterVisible).toBe(false);
        }
    }

    const atmosphereAnimationNames = await scene
        .locator('.skyline__horizon-haze, .skyline__horizon-brush')
        .evaluateAll((elements) =>
            elements.map((element) => getComputedStyle(element).animationName),
        );
    expect(atmosphereAnimationNames).toEqual(['none', 'none']);

    const fogAnimationNames = await scene
        .locator('.skyline__fog-band')
        .evaluateAll((elements) =>
            elements.map((element) => getComputedStyle(element).animationName),
        );
    expect(fogAnimationNames).toEqual(['none', 'none', 'none']);

    await scrollSectionUnderHeader(page, '#experience');
    await expect(scene).toHaveAttribute('data-motion', 'paused');
    await expect
        .poll(() =>
            scene.evaluate((element) =>
                element
                    .getAnimations({ subtree: true })
                    .filter(
                        (animation) =>
                            animation instanceof CSSAnimation &&
                            /^cloud-/.test(animation.animationName),
                    )
                    .every((animation) => animation.playState === 'paused'),
            ),
        )
        .toBe(true);
});

test('matches the fixed header surface to the section beneath it', async ({
    page,
}) => {
    await page.goto('/');

    const header = page.locator('[data-site-header]');

    await expect(header).toHaveAttribute('data-header-surface', 'hero');

    for (const { selector, surface } of [
        { selector: '#experience', surface: 'paper' },
        { selector: '#capabilities', surface: 'paper' },
        { selector: '#contact', surface: 'contact' },
    ] as const) {
        await scrollSectionUnderHeader(page, selector);
        await expect(header).toHaveAttribute('data-header-surface', surface);
    }
});

test('draws each experience highlight when it enters the viewport', async ({
    page,
}) => {
    await page.goto('/');

    const experience = page.locator('#experience');
    const highlights = experience.locator('[data-experience-highlight]');
    const finalHighlight = highlights.last();

    await expect(highlights).toHaveCount(12);
    await expect(experience).toHaveAttribute(
        'data-experience-highlight-motion',
        'full',
    );
    await expect(finalHighlight).not.toHaveClass(/is-underlined/);

    await finalHighlight.scrollIntoViewIfNeeded();

    await expect(finalHighlight).toHaveClass(/is-underlined/);
    await expect
        .poll(() =>
            finalHighlight.evaluate((element) =>
                Number.parseFloat(getComputedStyle(element).backgroundSize),
            ),
        )
        .toBe(100);
});

test('renders the island waterfront and applies responsive scene motion', async ({
    page,
}) => {
    await page.goto('/');

    const footer = page.locator('[data-contact-footer]');
    const panorama = footer.locator('[data-contact-panorama]');
    const ferry = panorama.locator('[data-harbour-ferry]');
    const ferryRoute = panorama.locator('[data-harbour-ferry-route]');
    const distantSkyline = panorama.locator('[data-distant-toronto-skyline]');
    const beach = panorama.locator('.harbour-panorama__beach');
    const bonfire = panorama.locator('[data-island-bonfire]');
    const bonfireFlame = bonfire.locator('[data-bonfire-flame="outer"]');
    const footerCnTower = distantSkyline.locator(
        '[data-landmark="footer-cn-tower"]',
    );
    const footerSkyObject = panorama.locator('[data-footer-sky-object]');

    const usesCompactComposition = (page.viewportSize()?.width ?? 0) <= 45 * 16;
    const crossingName = usesCompactComposition
        ? 'harbour-ferry-crossing-compact'
        : 'harbour-ferry-crossing';

    await expect(footer).toHaveAttribute('data-contact-motion', 'full');
    await expect(footer).not.toHaveAttribute('data-contact-active', '');
    await expect(ferryRoute).toHaveCSS('animation-play-state', 'paused');

    await expect(bonfireFlame).toHaveCSS(
        'animation-name',
        'island-bonfire-flame-outer',
    );
    await expect(bonfireFlame).toHaveCSS('animation-play-state', 'paused');

    await panorama.scrollIntoViewIfNeeded();
    await expect(panorama).toBeVisible();
    await expect(panorama).toHaveAttribute('aria-hidden', 'true');
    await expect(ferry).toBeAttached();
    await expect(distantSkyline).toBeAttached();
    await expect(beach).toBeAttached();
    await expect(bonfire).toBeAttached();
    await expect(footerCnTower).toBeInViewport();
    await expect(footerSkyObject).toBeInViewport();
    await expect(ferry).toBeInViewport();
    await expect(bonfire).toBeInViewport();
    for (const landmark of footerLandmarks) {
        await expect(
            distantSkyline.locator(`[data-landmark="${landmark}"]`),
        ).toBeAttached();
    }

    await expect(footer).toHaveAttribute('data-contact-motion', 'full');
    await expect(footer).toHaveAttribute('data-contact-active', '');
    await expect(ferryRoute).toHaveCSS('animation-name', crossingName);

    const landmarkGeometry = await panorama.evaluate((element) => {
        const svg = element.querySelector<SVGSVGElement>(
            '[data-harbour-panorama]',
        );
        const skyObject = element.querySelector<SVGGraphicsElement>(
            '[data-footer-sky-object]',
        );
        const tower = element.querySelector<SVGGraphicsElement>(
            '[data-landmark="footer-cn-tower"]',
        );
        const mainland = element.querySelector<SVGGraphicsElement>(
            '.distant-toronto-skyline__mainland',
        );

        if (!svg || !skyObject || !tower || !mainland) return null;

        const panoramaBounds = element.getBoundingClientRect();
        const skyBounds = skyObject.getBoundingClientRect();
        const towerBounds = tower.getBoundingClientRect();
        const mainlandBounds = mainland.getBoundingClientRect();

        return {
            viewBoxHeight: svg.viewBox.baseVal.height,
            panoramaTop: panoramaBounds.top,
            panoramaBottom: panoramaBounds.bottom,
            skyTop: skyBounds.top,
            skyBottom: skyBounds.bottom,
            towerTop: towerBounds.top,
            towerBottom: towerBounds.bottom,
            mainlandTop: mainlandBounds.top,
        };
    });

    expect(landmarkGeometry).not.toBeNull();
    expect(landmarkGeometry?.viewBoxHeight).toBe(600);
    expect(landmarkGeometry!.skyTop).toBeGreaterThanOrEqual(
        landmarkGeometry!.panoramaTop - 1,
    );
    expect(landmarkGeometry!.skyBottom).toBeLessThan(
        landmarkGeometry!.mainlandTop,
    );
    expect(landmarkGeometry!.skyBottom).toBeLessThanOrEqual(
        landmarkGeometry!.panoramaBottom,
    );
    expect(landmarkGeometry!.towerTop).toBeLessThan(
        landmarkGeometry!.towerBottom,
    );
    expect(
        Math.abs(landmarkGeometry!.towerBottom - landmarkGeometry!.mainlandTop),
    ).toBeLessThanOrEqual(24);

    await expect(bonfireFlame).toHaveCSS(
        'animation-name',
        'island-bonfire-flame-outer',
    );
    await expect(bonfireFlame).toHaveCSS('animation-play-state', 'running');

    const crossing = await ferryRoute.evaluate((element, expectedName) => {
        const animation = element
            .getAnimations()
            .find(
                (candidate) =>
                    candidate instanceof CSSAnimation &&
                    candidate.animationName === expectedName,
            );
        const keyframes =
            animation?.effect instanceof KeyframeEffect
                ? animation.effect.getKeyframes()
                : [];

        const timing = animation?.effect?.getComputedTiming();

        return {
            playState: animation?.playState ?? null,
            duration: timing?.duration ?? null,
            easing: timing?.easing ?? null,
            iterations: timing?.iterations ?? null,
            offsets: keyframes.map((keyframe) => keyframe.offset),
            transforms: keyframes.map((keyframe) => keyframe.transform),
        };
    }, crossingName);

    expect(crossing.playState).toBe('running');
    expect(crossing.duration).toEqual(expect.any(Number));
    expect(Number(crossing.duration)).toBeGreaterThan(0);
    expect(crossing.easing).toBe('linear');
    expect(crossing.iterations).toBe(Infinity);
    expect(crossing.offsets).toEqual([0, 1]);
    expect(crossing.transforms.at(0)).toContain(
        usesCompactComposition ? '390px' : '-500px',
    );
    expect(crossing.transforms.at(-1)).toContain(
        usesCompactComposition ? '1180px' : '1480px',
    );

    const getCrossingTime = () =>
        ferryRoute.evaluate((element, expectedName) => {
            const animation = element
                .getAnimations()
                .find(
                    (candidate) =>
                        candidate instanceof CSSAnimation &&
                        candidate.animationName === expectedName,
                );

            return Number(animation?.currentTime ?? 0);
        }, crossingName);
    const firstCrossingTime = await getCrossingTime();

    await expect.poll(getCrossingTime).toBeGreaterThan(firstCrossingTime + 20);
});

test.describe('skyline time states', () => {
    test.skip(
        ({ isMobile }) => Boolean(isMobile),
        'Time-state behavior is viewport-independent and is covered once.',
    );

    test('maps representative hours to art-directed states', () => {
        for (const { hour, state } of localTimeScenarios) {
            expect(getSkylineStateForHour(hour)).toBe(state);
        }
    });

    test('changes state at the documented hour boundaries', () => {
        for (const { hour, state } of skylineBoundaryScenarios) {
            expect(getSkylineStateForHour(hour)).toBe(state);
        }
    });

    test('cycles through each art-directed state in order', () => {
        expect(getNextSkylineState('dawn')).toBe('midday');
        expect(getNextSkylineState('midday')).toBe('dusk');
        expect(getNextSkylineState('dusk')).toBe('night');
        expect(getNextSkylineState('night')).toBe('dawn');
    });

    test('resolves browser colors from time and page surface', () => {
        for (const { state } of localTimeScenarios) {
            expect(getPageThemeColor(state, 'hero')).toBe(themeColors[state]);
            expect(getPageThemeColor(state, 'paper')).toBe(paperThemeColor);
            expect(getPageThemeColor(state, 'contact')).toBe(
                footerThemeColors[state],
            );
        }
    });

    test('keeps browser chrome aligned with the visible surface', async ({
        page,
    }) => {
        await gotoAtLocalHour(page, 12);

        const root = page.locator('html');
        const themeColor = page.locator('meta[name="theme-color"]');
        await expect(root).toHaveAttribute('data-page-surface', 'hero');
        await expect(themeColor).toHaveAttribute('content', themeColors.midday);

        await scrollSectionUnderHeader(page, '#experience');
        await expect(root).toHaveAttribute('data-page-surface', 'paper');
        await expect(themeColor).toHaveAttribute('content', paperThemeColor);

        await page.locator('[data-time-control]').evaluate((control) => {
            (control as HTMLButtonElement).click();
        });
        await expect(root).toHaveAttribute('data-time-state', 'dusk');
        await expect(themeColor).toHaveAttribute('content', paperThemeColor);

        await scrollSectionUnderHeader(page, '#contact');
        await expect(root).toHaveAttribute('data-page-surface', 'contact');
        await expect(themeColor).toHaveAttribute(
            'content',
            footerThemeColors.dusk,
        );

        await scrollSectionUnderHeader(page, '#hero');
        await expect(root).toHaveAttribute('data-page-surface', 'hero');
        await expect(themeColor).toHaveAttribute('content', themeColors.dusk);
    });

    test('sets local lighting before deferred page scripts load', async ({
        page,
    }) => {
        await page.clock.setFixedTime(new Date(2026, 6, 14, 12, 0, 0));
        await page.route('**/*', async (route) => {
            if (route.request().resourceType() === 'script') {
                await route.abort();
                return;
            }

            await route.continue();
        });

        await page.goto('/');

        const root = page.locator('html');
        await expect(root).toHaveAttribute('data-js', 'true');
        await expect(root).toHaveAttribute('data-time-state', 'midday');
        await expect(root).toHaveCSS('--sky-base', '#7fc4d6');
        await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
            'content',
            themeColors.midday,
        );
        await expect(page.locator('.hero__time-label:visible')).toHaveText(
            'Midday',
        );
        await expect(page.locator('.hero__copy')).not.toHaveAttribute(
            'data-reveal',
        );

        // The scene's deferred enhancement did not run, proving the head
        // bootstrap selected the palette independently before first paint.
        await expect(page.locator('[data-skyline-scene]')).toHaveAttribute(
            'data-time-state',
            'dusk',
        );
    });

    test('cycles lighting on click and restores local time on refresh', async ({
        page,
    }) => {
        await gotoAtLocalHour(page, 12);

        const control = page.locator('[data-time-control]');
        const header = page.locator('[data-site-header]');
        const hero = page.locator('#hero');
        const scene = page.locator('[data-skyline-scene]');
        await expect(header).not.toHaveAttribute('data-scrolled', '');
        const paletteTransitions = await page.evaluate(() => {
            const getBackgroundTransition = (element: Element) => {
                const style = getComputedStyle(element);
                const properties = style.transitionProperty.split(', ');
                const durations = style.transitionDuration.split(', ');
                const index = properties.indexOf('background-color');

                return durations[index % durations.length];
            };

            const header = document.querySelector('[data-site-header]');
            const hero = document.querySelector('#hero');
            if (!header || !hero) throw new Error('Missing palette surfaces');

            return {
                header: getBackgroundTransition(header),
                hero: getBackgroundTransition(hero),
            };
        });

        expect(paletteTransitions.header).toEqual(paletteTransitions.hero);
        expect(paletteTransitions.hero).toBe('0.9s');
        await expect(header).toHaveCSS('backdrop-filter', /blur\(20px\)/);
        await expect(control.locator('.hero__time-label:visible')).toHaveText(
            'Midday',
        );
        await expect(control).toHaveAttribute(
            'aria-label',
            'Current lighting: Midday. Show Dusk.',
        );

        for (const state of ['dusk', 'night', 'dawn', 'midday'] as const) {
            await control.click();
            await expect(header, state).toHaveCSS(
                'backdrop-filter',
                /blur\(20px\)/,
            );
            await expect(hero, state).toHaveCSS('transition-duration', /0\.9s/);
            await expect(scene).toHaveAttribute('data-time-state', state);
            await expect(page.locator('html')).toHaveAttribute(
                'data-time-state',
                state,
            );
            await expect(
                page.locator('meta[name="theme-color"]'),
            ).toHaveAttribute('content', themeColors[state]);
            await expect(
                control.locator('.hero__time-label:visible'),
            ).toHaveText(state[0].toUpperCase() + state.slice(1));
        }

        await control.click();
        await expect(scene).toHaveAttribute('data-time-state', 'dusk');
        await page.reload();
        await expect(scene).toHaveAttribute('data-time-state', 'midday');
        await expect(control.locator('.hero__time-label:visible')).toHaveText(
            'Midday',
        );
    });

    for (const { hour, state } of localTimeScenarios) {
        test(`applies the ${state} scene at local hour ${hour}`, async ({
            page,
        }) => {
            await gotoAtLocalHour(page, hour);

            await expect(page.locator('html')).toHaveAttribute(
                'data-time-state',
                state,
            );

            const scene = page.locator('[data-skyline-scene]');
            await expect(scene).toBeVisible();
            await expect(scene).toHaveAttribute('data-time-state', state);
            await expect(scene.locator('[data-sky-object]')).toBeAttached();
            await expect(scene.locator('[data-stars]')).toBeAttached();
            await expect(scene.locator('[data-window-lights]')).toBeAttached();
            await expect(
                scene.locator('.streetcar-streetscape__foreground-foundation'),
            ).toHaveCSS('fill', seawallColors[state]);
            const beacon = scene.locator('[data-beacon]');
            await expect(beacon).toBeVisible();
            await expect(beacon).toHaveCSS('animation-name', 'beacon');
            const beaconAnimation = await beacon.evaluate((element) => {
                const animation = element
                    .getAnimations()
                    .find(
                        (candidate) =>
                            candidate instanceof CSSAnimation &&
                            candidate.animationName === 'beacon',
                    );
                const timing = animation?.effect?.getComputedTiming();

                return {
                    duration: timing?.duration ?? null,
                    iterations: timing?.iterations ?? null,
                    filter: getComputedStyle(element).filter,
                };
            });
            expect(beaconAnimation.duration).toBe(5_000);
            expect(beaconAnimation.iterations).toBe(Infinity);
            expect(beaconAnimation.filter).not.toBe('none');
            for (const landmark of [
                ...primaryLandmarks,
                'city-hall',
                'streetcar',
            ] as const) {
                await expect(
                    scene.locator(`[data-landmark="${landmark}"]`),
                ).toBeAttached();
            }

            if (state === 'night') {
                await expect(
                    scene.locator('.ttc-streetcar__night-light-pool'),
                ).toHaveCSS('opacity', '0.26');
                await expect(scene.locator('.ttc-streetcar__lights')).toHaveCSS(
                    'opacity',
                    '1',
                );
                expect(
                    await scene
                        .locator('.ttc-streetcar__lights')
                        .evaluate(
                            (element) => getComputedStyle(element).filter,
                        ),
                ).not.toBe('none');
            }
        });
    }

    test('uses the same cratered, opaque moon above the stars in both night scenes', async ({
        page,
    }) => {
        await gotoAtLocalHour(page, 2);

        const heroMoon = page.locator('[data-sky-object]');
        const footerMoon = page.locator('[data-footer-sky-object]');

        for (const moon of [heroMoon, footerMoon]) {
            await expect(moon).toHaveAttribute(
                'data-celestial-disc',
                'cratered',
            );
            await expect(moon.locator('[data-celestial-halo]')).toHaveCount(1);
            await expect(moon.locator('[data-celestial-core]')).toHaveCount(1);
            await expect(moon.locator('[data-moon-craters]')).toHaveCount(1);
            await expect(moon.locator('[data-moon-mark]')).toHaveCount(3);
            await expect(moon.locator('[data-celestial-core]')).toHaveCSS(
                'opacity',
                '1',
            );
            await expect(moon.locator('[data-moon-craters]')).toHaveCSS(
                'opacity',
                '0.22',
            );
        }

        const readMoonTreatment = (
            moon: typeof heroMoon,
            starsSelector: string,
        ) =>
            moon.evaluate((element, selector) => {
                const halo = element.querySelector('[data-celestial-halo]');
                const core = element.querySelector('[data-celestial-core]');
                const craters = element.querySelector('[data-moon-craters]');
                const stars = element.closest('svg')?.querySelector(selector);
                if (!halo || !core || !craters || !stars) return null;

                const haloStyle = getComputedStyle(halo);
                const coreStyle = getComputedStyle(core);
                const craterStyle = getComputedStyle(craters);

                return {
                    core: {
                        fill: coreStyle.fill,
                        opacity: coreStyle.opacity,
                    },
                    craters: {
                        fill: craterStyle.fill,
                        opacity: craterStyle.opacity,
                    },
                    halo: {
                        fill: haloStyle.fill,
                        opacity: haloStyle.opacity,
                    },
                    starsPaintBeforeMoon: Boolean(
                        stars.compareDocumentPosition(element) &
                        Node.DOCUMENT_POSITION_FOLLOWING,
                    ),
                };
            }, starsSelector);

        const heroTreatment = await readMoonTreatment(
            heroMoon,
            '.skyline__stars',
        );
        const footerTreatment = await readMoonTreatment(
            footerMoon,
            '.harbour-panorama__stars',
        );

        expect(heroTreatment).not.toBeNull();
        expect(heroTreatment).toEqual(footerTreatment);
        expect(heroTreatment?.starsPaintBeforeMoon).toBe(true);

        await gotoAtLocalHour(page, 12);
        await expect(heroMoon.locator('[data-moon-craters]')).toHaveCSS(
            'opacity',
            '0',
        );
        await expect(footerMoon.locator('[data-moon-craters]')).toHaveCSS(
            'opacity',
            '0',
        );
    });

    test('gives the footer landmarks distinct night glows', async ({
        page,
    }) => {
        await gotoAtLocalHour(page, 2);

        const lighting = await getFooterLandmarkLighting(page);

        expect(lighting.cnTower.opacity).toBeGreaterThan(0.2);
        expect(lighting.cnTower.filter).toContain('drop-shadow');
        expect(lighting.cnTower.stroke).toMatch(/rgb\(57,\s*127,\s*209\)/);

        expect(lighting.rogersCentre.opacity).toBeGreaterThan(0.2);
        expect(lighting.rogersCentre.filter).toContain('drop-shadow');
        expect(lighting.rogersCentre.stroke).toMatch(
            /rgb\(155,\s*115,\s*235\)/,
        );

        expect(
            lighting.cityHall.glowTargets.some((filter) =>
                filter.includes('drop-shadow'),
            ),
        ).toBe(true);
        expect(lighting.cityHall.windowBands.opacity).toBeGreaterThan(0.5);

        const warmAccent = [
            lighting.cityHall.windowBands.stroke,
            lighting.cityHall.chamberWindow.fill,
        ].some((color) => {
            const channels = color.match(/-?[\d.]+/g)?.map(Number) ?? [];

            if (color.startsWith('oklab')) {
                const [lightness = 0, greenRed = 0, blueYellow = 0] = channels;

                return lightness > 0.7 && greenRed > -0.02 && blueYellow > 0.03;
            }

            const [red = 0, green = 0, blue = 0] = channels;
            const scale = Math.max(red, green, blue) <= 1 ? 255 : 1;

            return red * scale > 180 && red >= green && green > blue;
        });
        expect(
            warmAccent,
            JSON.stringify({
                chamber: lighting.cityHall.chamberWindow.fill,
                windows: lighting.cityHall.windowBands.stroke,
            }),
        ).toBe(true);
    });

    test('keeps footer landmark night glows off at midday', async ({
        page,
    }) => {
        await gotoAtLocalHour(page, 12);

        const lighting = await getFooterLandmarkLighting(page);

        expect(lighting.cnTower.opacity).toBeLessThanOrEqual(0.05);
        expect(lighting.cnTower.filter).toBe('none');
        expect(lighting.rogersCentre.opacity).toBeLessThanOrEqual(0.05);
        expect(lighting.rogersCentre.filter).toBe('none');
        expect(lighting.cityHall.glowTargets).toEqual(
            lighting.cityHall.glowTargets.map(() => 'none'),
        );
    });
});

test('keeps night reflections aligned with their sources at every responsive crop', async ({
    page,
}) => {
    await gotoAtLocalHour(page, 2);
    await waitForLayout(page);

    const scene = page.locator('[data-skyline-scene]');
    const alignment = await scene.evaluate((element) =>
        [
            'celestial',
            'rogers-centre',
            'cn-tower',
            'city-hall',
            'foreground-west-workshop',
            'foreground-west-row',
            'foreground-corner-store',
            'foreground-east-loft',
            'foreground-east-terrace',
            'foreground-east-workshop',
        ].map((name) => {
            const source = element.querySelector<SVGCircleElement>(
                `[data-reflection-source-anchor="${name}"]`,
            );
            const reflection = element.querySelector<SVGCircleElement>(
                `[data-reflection-water-anchor="${name}"]`,
            );

            if (!source || !reflection) {
                return { name, missing: true };
            }

            const sourceBounds = source.getBoundingClientRect();
            const reflectionBounds = reflection.getBoundingClientRect();
            const sourceScreenX = sourceBounds.left + sourceBounds.width / 2;
            const reflectionScreenX =
                reflectionBounds.left + reflectionBounds.width / 2;

            return {
                name,
                missing: false,
                delta: Math.abs(sourceScreenX - reflectionScreenX),
            };
        }),
    );

    expect(alignment).toHaveLength(10);
    for (const result of alignment) {
        expect(result.missing, result.name).toBe(false);
        expect(result.delta, result.name).toBeLessThan(0.75);
    }

    await expect(
        scene.locator(
            '[data-reflection-for="cn-tower"] .lake-reflections__highlight',
        ),
    ).toHaveCSS('opacity', '0.78');
    await expect(
        scene.locator(
            '[data-reflection-for="rogers-centre"] .lake-reflections__highlight',
        ),
    ).toHaveCSS('opacity', '0.66');
    await expect(
        scene.locator(
            '[data-reflection-for="city-hall"] .lake-reflections__highlight',
        ),
    ).toHaveCSS('opacity', '0.62');
    expect(
        Number(
            await scene
                .locator(
                    '[data-reflection-for="celestial"] .lake-reflections__celestial-core',
                )
                .evaluate((element) => getComputedStyle(element).opacity),
        ),
    ).toBeGreaterThan(0.65);
    await expect(
        scene.locator('[data-reflection-for="foreground-east-loft"]'),
    ).toHaveCSS('opacity', '1');
    await expect(
        scene.locator(
            '[data-reflection-for="streetcar"], [data-reflection-source-anchor="streetcar"], [data-reflection-water-anchor="streetcar"]',
        ),
    ).toHaveCount(0);
});

test('keeps footer harbour reflections aligned at every responsive crop', async ({
    page,
}) => {
    await gotoAtLocalHour(page, 2);

    const panorama = page.locator('[data-contact-panorama]');
    await panorama.scrollIntoViewIfNeeded();
    await waitForLayout(page);

    const alignment = await panorama.evaluate((element) =>
        [
            'footer-celestial',
            'footer-rogers-centre',
            'footer-cn-tower',
            'footer-city-hall',
            'footer-city-lights',
            'footer-bonfire',
        ].map((name) => {
            const source = element.querySelector<SVGCircleElement>(
                `[data-footer-reflection-source-anchor="${name}"]`,
            );
            const reflection = element.querySelector<SVGCircleElement>(
                `[data-footer-reflection-water-anchor="${name}"]`,
            );

            if (!source || !reflection) {
                return { name, missing: true };
            }

            const sourceBounds = source.getBoundingClientRect();
            const reflectionBounds = reflection.getBoundingClientRect();
            const sourceScreenX = sourceBounds.left + sourceBounds.width / 2;
            const reflectionScreenX =
                reflectionBounds.left + reflectionBounds.width / 2;

            return {
                name,
                missing: false,
                delta: Math.abs(sourceScreenX - reflectionScreenX),
            };
        }),
    );

    expect(alignment).toHaveLength(6);
    for (const result of alignment) {
        expect(result.missing, result.name).toBe(false);
        expect(result.delta, result.name).toBeLessThan(0.75);
    }

    await expect(
        panorama.locator('[data-footer-reflection-for="footer-cn-tower"]'),
    ).toHaveCSS('opacity', '0.72');
    await expect(
        panorama.locator('[data-footer-reflection-for="footer-rogers-centre"]'),
    ).toHaveCSS('opacity', '0.62');
    await expect(
        panorama.locator('[data-footer-reflection-for="footer-city-hall"]'),
    ).toHaveCSS('opacity', '0.72');
    await expect(
        panorama.locator('.harbour-reflections__celestial-core'),
    ).toHaveCSS('opacity', '0.58');
    const bonfireOpacity = await panorama
        .locator('[data-footer-reflection-for="footer-bonfire"]')
        .evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).opacity),
        );
    expect(bonfireOpacity).toBeGreaterThanOrEqual(0.58);
    expect(bonfireOpacity).toBeLessThanOrEqual(0.76);
});

test('keeps the lit footer ferry reflection synchronized across the harbour', async ({
    page,
}) => {
    await gotoAtLocalHour(page, 2);

    const panorama = page.locator('[data-contact-panorama]');
    await panorama.scrollIntoViewIfNeeded();
    await waitForLayout(page);

    const readFerryAlignment = () =>
        panorama.evaluate((element) => {
            const sourceAnchor = element.querySelector<SVGCircleElement>(
                '[data-footer-reflection-source-anchor="footer-ferry"]',
            );
            const reflectionAnchor = element.querySelector<SVGCircleElement>(
                '[data-footer-reflection-water-anchor="footer-ferry"]',
            );
            const source = element.querySelector<SVGGElement>(
                '[data-harbour-ferry-route]',
            );
            const reflection = element.querySelector<SVGGElement>(
                '[data-footer-ferry-reflection-route]',
            );

            if (!sourceAnchor || !reflectionAnchor || !source || !reflection) {
                return null;
            }

            const sourceBounds = sourceAnchor.getBoundingClientRect();
            const reflectionBounds = reflectionAnchor.getBoundingClientRect();
            const sourceX = sourceBounds.left + sourceBounds.width / 2;
            const reflectionX =
                reflectionBounds.left + reflectionBounds.width / 2;
            const sourceAnimation = source
                .getAnimations()
                .find((animation) => animation instanceof CSSAnimation);
            const reflectionAnimation = reflection
                .getAnimations()
                .find((animation) => animation instanceof CSSAnimation);

            return {
                delta: Math.abs(sourceX - reflectionX),
                reflectionX,
                sourceX,
                timelineDelta: Math.abs(
                    Number(sourceAnimation?.currentTime ?? 0) -
                        Number(reflectionAnimation?.currentTime ?? 0),
                ),
            };
        });

    const first = await readFerryAlignment();
    expect(first).not.toBeNull();
    expect(first!.delta).toBeLessThan(1);
    expect(first!.timelineDelta).toBeLessThan(20);

    await page.waitForTimeout(300);

    const second = await readFerryAlignment();
    expect(second).not.toBeNull();
    expect(second!.delta).toBeLessThan(1);
    expect(second!.timelineDelta).toBeLessThan(20);
    expect(Math.abs(second!.sourceX - first!.sourceX)).toBeGreaterThan(3);
    expect(Math.abs(second!.reflectionX - first!.reflectionX)).toBeGreaterThan(
        3,
    );
    await expect(
        panorama.locator('.harbour-reflections__ferry-lights'),
    ).toHaveCSS('opacity', '0.58');
});

test('keeps the ferry stationary between contact-hash first paint and motion startup', async ({
    page,
}) => {
    await page.goto('/#contact');

    const footer = page.locator('[data-contact-footer]');
    const panorama = footer.locator('[data-contact-panorama]');

    await expect(footer).toHaveAttribute('data-contact-motion', 'full');
    await expect(footer).toHaveAttribute('data-contact-active', '');

    const continuity = await panorama.evaluate((element) => {
        const scene = element.querySelector<SVGSVGElement>(
            '[data-harbour-panorama]',
        );
        const source = element.querySelector<SVGGElement>(
            '[data-harbour-ferry-route]',
        );
        const reflection = element.querySelector<SVGGElement>(
            '[data-footer-ferry-reflection-route]',
        );
        const footer = element.closest<HTMLElement>('[data-contact-footer]');
        if (!scene || !source || !reflection || !footer) return null;

        const readTranslateX = (target: Element) =>
            new DOMMatrixReadOnly(getComputedStyle(target).transform).m41;
        const prepareAnimationStart = (target: Element) => {
            const animation = target
                .getAnimations()
                .find((candidate) => candidate instanceof CSSAnimation);
            if (!animation) return false;

            animation.pause();
            animation.currentTime = 0;
            return true;
        };

        const hasSourceAnimation = prepareAnimationStart(source);
        const hasReflectionAnimation = prepareAnimationStart(reflection);
        const animated = {
            reflection: readTranslateX(reflection),
            source: readTranslateX(source),
        };

        footer.removeAttribute('data-contact-motion');

        const fallback = {
            reflection: readTranslateX(reflection),
            source: readTranslateX(source),
        };

        return {
            animated,
            expectedFallbackX: Number.parseFloat(
                getComputedStyle(scene).getPropertyValue(
                    '--harbour-ferry-start-x',
                ),
            ),
            fallback,
            hasReflectionAnimation,
            hasSourceAnimation,
        };
    });

    expect(continuity).not.toBeNull();
    expect(continuity!.hasSourceAnimation).toBe(true);
    expect(continuity!.hasReflectionAnimation).toBe(true);
    expect(continuity!.fallback.source).toBeCloseTo(
        continuity!.expectedFallbackX,
        1,
    );
    expect(continuity!.fallback.reflection).toBeCloseTo(
        continuity!.expectedFallbackX,
        1,
    );
    expect(
        Math.abs(continuity!.fallback.source - continuity!.animated.source),
    ).toBeLessThanOrEqual(0.75);
    expect(
        Math.abs(
            continuity!.fallback.reflection - continuity!.animated.reflection,
        ),
    ).toBeLessThanOrEqual(0.75);
});

test('keeps animated wave lines stationary between contact-hash first paint and motion startup', async ({
    page,
}) => {
    await page.goto('/#contact');

    const footer = page.locator('[data-contact-footer]');
    const panorama = footer.locator('[data-contact-panorama]');

    await expect(footer).toHaveAttribute('data-contact-motion', 'full');
    await expect(footer).toHaveAttribute('data-contact-active', '');

    const continuity = await panorama.evaluate((element) => {
        const footer = element.closest<HTMLElement>('[data-contact-footer]');
        const waves = Array.from(
            element.querySelectorAll<SVGPathElement>(
                '.harbour-panorama__wave--far, .harbour-panorama__wave--near',
            ),
        );
        if (!footer || waves.length !== 2) return null;

        const readTranslateX = (target: Element) =>
            new DOMMatrixReadOnly(getComputedStyle(target).transform).m41;
        const animated = waves.map((wave) => {
            const animation = wave
                .getAnimations()
                .find((candidate) => candidate instanceof CSSAnimation);

            if (animation) {
                animation.pause();
                animation.currentTime = 0;
            }

            return {
                className: wave.getAttribute('class'),
                hasAnimation: Boolean(animation),
                translateX: readTranslateX(wave),
            };
        });

        footer.removeAttribute('data-contact-motion');

        return animated.map((wave, index) => ({
            ...wave,
            fallbackTranslateX: readTranslateX(waves[index]),
        }));
    });

    expect(continuity).not.toBeNull();
    expect(continuity).toHaveLength(2);

    for (const wave of continuity!) {
        expect(wave.hasAnimation, wave.className ?? 'wave').toBe(true);
        expect(
            Math.abs(wave.fallbackTranslateX - wave.translateX),
            wave.className ?? 'wave',
        ).toBeLessThanOrEqual(0.1);
    }
});

test.describe('with reduced motion', () => {
    test('renders a complete static skyline and readable content', async ({
        page,
    }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await gotoAtLocalHour(page, 2);

        expect(
            await page.evaluate(
                () =>
                    window.matchMedia('(prefers-reduced-motion: reduce)')
                        .matches,
            ),
        ).toBe(true);

        const scene = page.locator('[data-skyline-scene]');
        const header = page.locator('[data-site-header]');
        await expect(header).toHaveAttribute('data-header-surface', 'hero');
        await expect(scene).toBeVisible();
        await expect(scene).toHaveAttribute('data-time-state', 'night');
        await expect(scene).toHaveAttribute('data-motion', 'reduced');
        await expect(scene.locator('[data-sky-object]')).toBeAttached();
        await expect(scene.locator('[data-stars]')).toBeAttached();
        await expect(scene.locator('[data-window-lights]')).toBeAttached();
        const beacon = scene.locator('[data-beacon]');
        await expect(beacon).toBeVisible();
        await expect(beacon).toHaveCSS('animation-name', 'none');
        expect(
            await beacon.evaluate(
                (element) => getComputedStyle(element).filter,
            ),
        ).not.toBe('none');

        const streetcar = scene.locator('[data-streetcar]');
        await expect(streetcar).toHaveCSS('animation-name', 'none');
        await expect(streetcar).toBeInViewport();
        await expect(
            streetcar.locator('.ttc-streetcar__night-light-pool'),
        ).toHaveCSS('opacity', '0.26');
        await expect(streetcar.locator('.ttc-streetcar__lights')).toHaveCSS(
            'opacity',
            '1',
        );

        const runningAnimations = await scene.evaluate((element) =>
            element
                .getAnimations({ subtree: true })
                .filter((animation) => animation.playState === 'running')
                .map((animation) => animation.id || '(unnamed)'),
        );
        expect(runningAnimations).toEqual([]);

        const sayHello = page.getByRole('link', { name: /say hello/i });
        for (
            let step = 0;
            step < 8 &&
            !(await sayHello.evaluate(
                (element) => element === document.activeElement,
            ));
            step += 1
        ) {
            await page.keyboard.press('Tab');
        }
        await expect(sayHello).toBeFocused();
        const staticMarker = sayHello.locator('.marker-outline__stroke');
        await expect(staticMarker).toHaveCSS('opacity', '1');
        await expect(staticMarker).toHaveCSS('transition-duration', '0s');
        expect(
            await staticMarker.evaluate((element) =>
                Number.parseFloat(getComputedStyle(element).strokeDashoffset),
            ),
        ).toBeLessThanOrEqual(0.01);

        await expect(page.locator('#experience')).toBeVisible();
        const experience = page.locator('#experience');
        const staticHighlights = experience.locator(
            '[data-experience-highlight]',
        );
        await expect(experience).toHaveAttribute(
            'data-experience-highlight-motion',
            'static',
        );
        await expect(staticHighlights.first()).toHaveClass(/is-underlined/);
        await expect(staticHighlights.first()).toHaveCSS(
            'transition-duration',
            '0s',
        );
        await expect(page.locator('#capabilities')).toBeVisible();
        await expect(
            page.locator('#contact').locator(contactLinks.email),
        ).toBeVisible();

        await scrollSectionUnderHeader(page, '#experience');
        await expect(header).toHaveAttribute('data-header-surface', 'paper');
        await scrollSectionUnderHeader(page, '#capabilities');
        await expect(header).toHaveAttribute('data-header-surface', 'paper');

        const footer = page.locator('[data-contact-footer]');
        const panorama = footer.locator('[data-contact-panorama]');
        const bonfire = panorama.locator('[data-island-bonfire]');
        const staticFerry = panorama.locator('[data-harbour-ferry]');
        await panorama.scrollIntoViewIfNeeded();
        await expect(header).toHaveAttribute('data-header-surface', 'contact');
        await expect(footer).toHaveAttribute('data-contact-motion', 'static');
        await expect(footer).not.toHaveAttribute('data-contact-active', '');
        await expect(
            panorama.locator('[data-distant-toronto-skyline]'),
        ).toBeAttached();
        await expect(
            panorama.locator('.harbour-panorama__beach'),
        ).toBeAttached();
        await expect(staticFerry).toBeAttached();
        await expect(staticFerry).toBeInViewport();
        await expect(bonfire).toBeAttached();
        await expect(panorama.locator('[data-harbour-ferry-route]')).toHaveCSS(
            'animation-name',
            'none',
        );
        await expect(
            panorama.locator('[data-footer-ferry-reflection-route]'),
        ).toHaveCSS('animation-name', 'none');
        await expect(
            panorama.locator('[data-footer-reflection-for="footer-bonfire"]'),
        ).toHaveCSS('animation-name', 'none');
        await expect(bonfire.locator('[data-bonfire-flame="outer"]')).toHaveCSS(
            'animation-name',
            'none',
        );
        expect(
            await panorama.evaluate((element) =>
                element
                    .getAnimations({ subtree: true })
                    .filter((animation) => animation.playState === 'running')
                    .map((animation) => animation.id || '(unnamed)'),
            ),
        ).toEqual([]);
    });
});

test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('keeps descendant anchor targets clear of the fixed header', async ({
        page,
    }) => {
        for (const hash of [
            '#experience-title',
            '#capabilities-title',
            '#contact-title',
        ]) {
            await page.goto(`/?no-js-anchor=${hash.slice(1)}${hash}`);

            const spacing = await page.locator(hash).evaluate((target) => {
                const header =
                    document.querySelector<HTMLElement>('[data-site-header]');
                if (!header) return null;
                return (
                    target.getBoundingClientRect().top -
                    header.getBoundingClientRect().bottom
                );
            });
            expect(spacing).not.toBeNull();
            expect(spacing!).toBeGreaterThanOrEqual(16);
        }
    });

    test('keeps the deterministic dusk fallback and contact paths usable', async ({
        page,
    }) => {
        await page.goto('/');

        const hero = page.locator('#hero');
        const scene = page.locator('[data-skyline-scene]');
        const contact = page.locator('#contact');

        await expect(page.locator('html')).not.toHaveAttribute('data-js');
        await expect(hero).toBeVisible();
        await expect(hero).toContainText(/Albert Yang/i);
        await expect(scene).toBeVisible();
        await expect(scene).toHaveAttribute('data-time-state', 'dusk');
        await expect(scene.locator('[data-sky-object]')).toBeAttached();
        await expect(scene.locator('[data-stars]')).toBeAttached();
        await expect(scene.locator('[data-window-lights]')).toBeAttached();
        await expect(
            scene.locator('[data-streetcar-streetscape]'),
        ).toBeAttached();
        await expect(
            scene.locator(
                '[data-tram-track], .street-track, .street-track__platform',
            ),
        ).toHaveCount(0);

        await expect(page.locator('#experience')).toBeVisible();
        await expect(page.locator('#capabilities')).toBeVisible();
        await expect(contact).toBeVisible();
        await expect(contact.locator(contactLinks.email)).toBeVisible();
        await expect(contact.locator(contactLinks.linkedin)).toBeVisible();
        await expect(contact.locator(contactLinks.github)).toBeVisible();
        await expect(
            contact.locator('[data-footer-sky-object]'),
        ).toBeAttached();

        const panorama = contact.locator('[data-contact-panorama]');
        await expect(panorama).toHaveCSS('content-visibility', 'visible');
        const staticFerry = panorama.locator('[data-harbour-ferry]');
        await panorama.scrollIntoViewIfNeeded();
        await expect(panorama).toHaveAttribute('aria-hidden', 'true');
        await expect(
            panorama.locator('[data-distant-toronto-skyline]'),
        ).toBeAttached();
        await expect(
            panorama.locator('.harbour-panorama__beach'),
        ).toBeAttached();
        await expect(staticFerry).toBeAttached();
        await expect(staticFerry).toBeInViewport();
        await expect(panorama.locator('[data-island-bonfire]')).toBeAttached();
        await expect(panorama.locator('[data-harbour-ferry-route]')).toHaveCSS(
            'animation-name',
            'none',
        );
        await expect(
            panorama.locator('[data-footer-ferry-reflection-route]'),
        ).toHaveCSS('animation-name', 'none');
        await expect(
            panorama.locator('[data-bonfire-flame="outer"]'),
        ).toHaveCSS('animation-name', 'none');
        await expect(contact).not.toHaveAttribute('data-contact-active', '');
    });
});

test('keeps core content available on a constrained first visit', async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'chromium',
        'The constrained-load check is viewport-independent and uses Chromium CDP.',
    );

    const session = await page.context().newCDPSession(page);

    await session.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 400,
        downloadThroughput: (750 * 1024) / 8,
        uploadThroughput: (250 * 1024) / 8,
        connectionType: 'cellular3g',
    });
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    try {
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        await expect(page.getByRole('heading', { level: 1 })).toContainText(
            'Albert Yang',
        );
        await expect(page.locator('[data-skyline-scene]')).toBeVisible();
        await expect(page.locator('#experience')).toContainText('Super.com');
        await expect(
            page.locator('#contact').locator(contactLinks.email),
        ).toBeAttached();
        await expect(
            page.locator('#contact').locator(contactLinks.linkedin),
        ).toBeAttached();
    } finally {
        await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        await session.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: 0,
            downloadThroughput: -1,
            uploadThroughput: -1,
        });
    }
});

test('does not introduce horizontal overflow', async ({ page }) => {
    await page.goto('/');

    const samples: Array<{
        overflow: number;
        position: string;
        sectionClientWidth: number;
        sectionScrollWidth: number;
        viewportWidth: number;
    }> = [];

    for (const selector of [
        '#hero',
        '#experience',
        '#capabilities',
        '#contact',
    ]) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        await waitForLayout(page);

        samples.push(
            await page.evaluate((position) => {
                const root = document.documentElement;
                const viewportWidth = root.clientWidth;
                const section = document.querySelector<HTMLElement>(position);

                if (!section) {
                    throw new Error(`Missing section ${position}`);
                }

                return {
                    overflow:
                        Math.max(root.scrollWidth, document.body.scrollWidth) -
                        viewportWidth,
                    position,
                    sectionClientWidth: section.clientWidth,
                    sectionScrollWidth: section.scrollWidth,
                    viewportWidth,
                };
            }, selector),
        );
    }

    const largestOverflow = samples.reduce((largest, sample) =>
        sample.overflow > largest.overflow ? sample : largest,
    );

    expect(
        largestOverflow.overflow,
        `Horizontal overflow at ${largestOverflow.position} with a ${largestOverflow.viewportWidth}px viewport`,
    ).toBeLessThanOrEqual(1);

    for (const sample of samples.filter(
        ({ position, viewportWidth }) =>
            viewportWidth <= 430 && ['#hero', '#contact'].includes(position),
    )) {
        expect(
            sample.sectionScrollWidth,
            `${sample.position} section overflow with a ${sample.viewportWidth}px viewport`,
        ).toBeLessThanOrEqual(sample.sectionClientWidth + 1);
    }
});
