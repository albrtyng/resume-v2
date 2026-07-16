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

async function getDesktopProfileCloudCoverage(page: Page, padding: number) {
    return page
        .locator('[data-profile-shape]')
        .evaluate((element, minimumPadding) => {
            const cloud = element.querySelector<SVGSVGElement>(
                '[data-profile-cloud]',
            );
            const ground = element.querySelector<SVGSVGElement>(
                '[data-profile-ground]',
            );
            const body = cloud?.querySelector<SVGGeometryElement>(
                '.hero__facts-cloud-body',
            );
            const matrix = body?.getScreenCTM();

            if (!cloud || !ground || !body || !matrix) return null;

            const inverseMatrix = matrix.inverse();
            const textLines = Array.from(
                element.querySelectorAll<HTMLElement>(
                    '.hero__facts dt, .hero__facts dd',
                ),
            ).flatMap((textElement) => {
                const range = document.createRange();
                range.selectNodeContents(textElement);
                const text = textElement.textContent?.trim() ?? '';

                return Array.from(range.getClientRects()).map(
                    (bounds, lineIndex) => {
                        const ySamples = [0.35, 0.5, 0.65].map(
                            (ratio) => bounds.top + bounds.height * ratio,
                        );
                        const probes = [
                            ...ySamples.map((y) => ({
                                edge: 'left',
                                x: bounds.left - minimumPadding,
                                y,
                            })),
                            ...ySamples.map((y) => ({
                                edge: 'right',
                                x: bounds.right + minimumPadding,
                                y,
                            })),
                        ].map((probe) => ({
                            ...probe,
                            covered: body.isPointInFill(
                                new DOMPoint(probe.x, probe.y).matrixTransform(
                                    inverseMatrix,
                                ),
                            ),
                        }));

                        return {
                            label: `${textElement.tagName.toLowerCase()} "${text}", line ${lineIndex + 1}`,
                            probes,
                        };
                    },
                );
            });

            return {
                cloudDisplay: getComputedStyle(cloud).display,
                groundDisplay: getComputedStyle(ground).display,
                textLines,
            };
        }, padding);
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
        const streetcar = element.querySelector<SVGGElement>('[data-streetcar]');
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
            streetcarOnRightLane:
                streetcarBounds.bottom > markerBounds.bottom,
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
                mastPath
                    .getAttribute('d')
                    ?.matchAll(/M(\d+) (\d+)V(\d+)/g) ?? [],
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

    const panorama = contact.locator('[data-contact-panorama]');
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

test('uses the hero contrast pane only when the skyline can rise behind the copy', async ({
    page,
}) => {
    await gotoAtLocalHour(page, 12);
    await waitForLayout(page);

    const hero = page.locator('#hero');
    const copyPanel = hero.locator('[data-hero-copy-panel]');
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
        const actionGroup =
            element.querySelector<HTMLElement>('.hero__actions');
        const primaryLink = element.querySelector<HTMLElement>(
            '.hero__primary-link',
        );
        const textLink = element.querySelector<HTMLElement>('.hero__text-link');
        const copyElements = [
            element.querySelector<HTMLElement>('.hero__eyebrow'),
            element.querySelector<HTMLElement>('.hero__title'),
            element.querySelector<HTMLElement>('.hero__statement'),
            actionGroup,
        ];

        if (
            !panel ||
            !actionGroup ||
            !primaryLink ||
            !textLink ||
            copyElements.some((candidate) => !candidate)
        ) {
            return null;
        }

        const panelBounds = panel.getBoundingClientRect();
        const panelStyle = getComputedStyle(panel);
        const actionSurfaceStyle = getComputedStyle(actionGroup, '::before');
        const primaryStyle = getComputedStyle(primaryLink);
        const textStyle = getComputedStyle(textLink);
        const copyBounds = copyElements.map((candidate) =>
            candidate!.getBoundingClientRect(),
        );
        const backdropFilter =
            panelStyle.backdropFilter ||
            panelStyle.getPropertyValue('-webkit-backdrop-filter');

        return {
            supportsBackdropFilter:
                CSS.supports('backdrop-filter', 'blur(1px)') ||
                CSS.supports('-webkit-backdrop-filter', 'blur(1px)'),
            backgroundImage: panelStyle.backgroundImage,
            backdropFilter,
            clipPath: panelStyle.clipPath,
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
    expect(pane!.clipPath).toBe('none');

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

    expect(pane!.controls.primaryBorderStyle).toBe('solid');
    expect(pane!.controls.primaryBorderWidth).toBeGreaterThanOrEqual(1);
    expect(pane!.controls.textBorderStyle).toBe('solid');
    expect(pane!.controls.textBorderWidth).toBeGreaterThanOrEqual(1);
    await expect(
        primaryAction.locator('.marker-outline__stroke'),
    ).toBeAttached();
    await expect(textAction).toBeVisible();
});

test('adapts the static profile backing to the hero composition', async ({
    page,
}) => {
    await gotoAtLocalHour(page, 12);
    await waitForLayout(page);

    const hero = page.locator('#hero');
    const profileShape = hero.locator('[data-profile-shape]');
    const profileCloud = profileShape.locator('[data-profile-cloud]');
    const profileGround = profileShape.locator('[data-profile-ground]');

    await expect(profileShape).toHaveCount(1);
    await expect(profileShape).toContainText('Software Engineer II');
    await expect(profileCloud).toBeAttached();
    await expect(profileGround).toBeAttached();
    await expect(profileCloud).toHaveCSS('animation-name', 'none');
    await expect(profileGround).toHaveCSS('animation-name', 'none');

    const viewportWidth = page.viewportSize()?.width ?? 0;
    const usesBottomProfile = viewportWidth <= 72 * 16;

    if (usesBottomProfile) {
        await expect(profileCloud).toBeHidden();
        await expect(profileGround).toBeVisible();
    } else {
        await expect(profileCloud).toBeVisible();
        await expect(profileGround).toBeHidden();
    }

    const profileBackingGeometry = await profileShape.evaluate((element) => {
        const facts = element.querySelector<HTMLElement>('.hero__facts');
        const backing = Array.from(
            element.querySelectorAll<SVGSVGElement>(
                '[data-profile-cloud], [data-profile-ground]',
            ),
        ).find((candidate) => getComputedStyle(candidate).display !== 'none');
        const body = backing?.querySelector<SVGGeometryElement>(
            '.hero__facts-cloud-body, .hero__facts-ground-body',
        );
        const matrix = body?.getScreenCTM();

        if (!facts || !backing || !body || !matrix) return null;

        const factsBounds = facts.getBoundingClientRect();
        const backingBounds = body.getBoundingClientRect();
        const inverseMatrix = matrix.inverse();
        const rootFontSize = Number.parseFloat(
            getComputedStyle(document.documentElement).fontSize,
        );
        const compactProfile = window.innerWidth <= 72 * rootFontSize;
        const textClearance = compactProfile ? 2 : 12;
        const textEdgeChecks = Array.from(
            facts.querySelectorAll<HTMLElement>('dt, dd'),
        ).flatMap((textElement) => {
            const range = document.createRange();
            range.selectNodeContents(textElement);
            const textLabel = textElement.textContent?.trim() ?? '';

            return Array.from(range.getClientRects()).flatMap(
                (bounds, lineIndex) => {
                    const centerY = bounds.top + bounds.height / 2;
                    return [
                        {
                            edge: 'left',
                            label: `${textElement.tagName.toLowerCase()} "${textLabel}", line ${lineIndex + 1}`,
                            x: bounds.left - textClearance,
                            y: centerY,
                        },
                        {
                            edge: 'right',
                            label: `${textElement.tagName.toLowerCase()} "${textLabel}", line ${lineIndex + 1}`,
                            x: bounds.right + textClearance,
                            y: centerY,
                        },
                    ];
                },
            );
        });

        return {
            backing: {
                top: backingBounds.top,
                right: backingBounds.right,
                bottom: backingBounds.bottom,
                left: backingBounds.left,
            },
            facts: {
                top: factsBounds.top,
                right: factsBounds.right,
                bottom: factsBounds.bottom,
                left: factsBounds.left,
            },
            uncoveredTextEdges: textEdgeChecks
                .filter(
                    ({ x, y }) =>
                        !body.isPointInFill(
                            new DOMPoint(x, y).matrixTransform(inverseMatrix),
                        ),
                )
                .map(({ edge, label }) => `${label} ${edge}`),
            viewportWidth: document.documentElement.clientWidth,
        };
    });

    expect(profileBackingGeometry).not.toBeNull();
    expect(profileBackingGeometry!.backing.left).toBeGreaterThanOrEqual(0);
    expect(profileBackingGeometry!.backing.right).toBeLessThanOrEqual(
        profileBackingGeometry!.viewportWidth,
    );
    expect(profileBackingGeometry!.backing.left).toBeLessThanOrEqual(
        profileBackingGeometry!.facts.left - 4,
    );
    expect(profileBackingGeometry!.backing.right).toBeGreaterThanOrEqual(
        profileBackingGeometry!.facts.right + 4,
    );
    expect(profileBackingGeometry!.backing.top).toBeLessThanOrEqual(
        profileBackingGeometry!.facts.top - 4,
    );
    expect(profileBackingGeometry!.backing.bottom).toBeGreaterThanOrEqual(
        profileBackingGeometry!.facts.bottom + 4,
    );
    expect(profileBackingGeometry!.uncoveredTextEdges).toEqual([]);

    const profilePosition = await profileShape.evaluate((element) => {
        const style = getComputedStyle(element);
        const hero = element.closest<HTMLElement>('#hero');
        if (!hero) return null;

        const bounds = element.getBoundingClientRect();
        const heroBounds = hero.getBoundingClientRect();
        const rootFontSize = Number.parseFloat(
            getComputedStyle(document.documentElement).fontSize,
        );
        const compact = window.innerWidth <= 72 * rootFontSize;
        const phone = window.innerWidth <= 48 * rootFontSize;
        const narrowPhone = window.innerWidth <= 25 * rootFontSize;

        return {
            position: style.position,
            topInset: bounds.top - heroBounds.top,
            rightInset: heroBounds.right - bounds.right,
            bottomInset: heroBounds.bottom - bounds.bottom,
            leftInset: bounds.left - heroBounds.left,
            expectedTop: Math.min(
                Math.max(9 * rootFontSize, window.innerHeight * 0.17),
                12 * rootFontSize,
            ),
            expectedBottom:
                (phone ? 5.75 : 6.5) * rootFontSize +
                (compact
                    ? Math.max(0, heroBounds.height - window.innerHeight)
                    : 0),
            expectedGutter: narrowPhone
                ? 1.15 * rootFontSize
                : Math.min(
                      Math.max(1.15 * rootFontSize, window.innerWidth * 0.048),
                      5.75 * rootFontSize,
                  ),
            compact,
            phone,
        };
    });

    expect(profilePosition).not.toBeNull();
    expect(profilePosition!.position).toBe('absolute');
    expect(profilePosition!.rightInset).toBeCloseTo(
        profilePosition!.expectedGutter,
        0,
    );

    if (profilePosition!.compact) {
        expect(profilePosition!.bottomInset).toBeCloseTo(
            profilePosition!.expectedBottom,
            0,
        );
        if (profilePosition!.phone) {
            expect(profilePosition!.leftInset).toBeCloseTo(
                profilePosition!.expectedGutter,
                0,
            );
        }
    } else {
        expect(profilePosition!.topInset).toBeCloseTo(
            profilePosition!.expectedTop,
            0,
        );
    }
});

test('keeps profile text stable when critical fonts arrive late', async ({
    page,
}) => {
    test.skip(
        Boolean(test.info().project.use.isMobile),
        'Font loading behavior is viewport-independent and is covered once.',
    );

    await page.route('**/fonts/GeneralSans-*.woff2', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.continue();
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const profile = page.locator('[data-profile-shape]');
    const getTextGeometry = () =>
        profile.locator('dt, dd').evaluateAll((elements) =>
            elements.map((element) => {
                const bounds = element.getBoundingClientRect();
                return {
                    left: bounds.left,
                    top: bounds.top,
                    width: bounds.width,
                    height: bounds.height,
                };
            }),
        );

    const initialGeometry = await getTextGeometry();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(100);

    expect(await getTextGeometry()).toEqual(initialGeometry);
});

test('keeps every desktop profile line comfortably inside the cloud fill', async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'chromium',
        'Desktop cloud breakpoints are sampled explicitly in Chromium.',
    );

    const minimumPadding = 12;
    const desktopViewports = [
        { label: 'just above the 72rem breakpoint', width: 1153, height: 900 },
        { label: 'standard desktop', width: 1440, height: 900 },
        { label: 'wide desktop', width: 1920, height: 1080 },
    ] as const;

    for (const viewport of desktopViewports) {
        await page.setViewportSize(viewport);
        await gotoAtLocalHour(page, 12);
        await waitForLayout(page);

        const coverage = await getDesktopProfileCloudCoverage(
            page,
            minimumPadding,
        );

        expect(coverage, viewport.label).not.toBeNull();
        expect(coverage!.cloudDisplay, viewport.label).not.toBe('none');
        expect(coverage!.groundDisplay, viewport.label).toBe('none');
        expect(
            coverage!.textLines.length,
            viewport.label,
        ).toBeGreaterThanOrEqual(4);

        const uncoveredProbes = coverage!.textLines.flatMap((line) =>
            line.probes
                .filter(({ covered }) => !covered)
                .map(
                    ({ edge }) =>
                        `${line.label} ${edge} edge lacks ${minimumPadding}px padding`,
                ),
        );

        expect(uncoveredProbes, viewport.label).toEqual([]);

        const perspectiveRightEdges = coverage!.textLines
            .filter(({ label }) => label.includes('working globally'))
            .flatMap(({ probes }) =>
                probes.filter(({ edge }) => edge === 'right'),
            );

        expect(
            perspectiveRightEdges.length,
            `${viewport.label}: Perspective value right-edge probes`,
        ).toBeGreaterThan(0);
        expect(
            perspectiveRightEdges.every(({ covered }) => covered),
            `${viewport.label}: "working globally" needs visible cloud padding`,
        ).toBe(true);
    }
});

test('separates narrow-phone profile and local-light surfaces at short heights', async ({
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
            const profile = hero.querySelector<HTMLElement>(
                '[data-profile-shape]',
            );
            const facts = profile?.querySelector<HTMLElement>('.hero__facts');
            const groundBody = profile?.querySelector<SVGGeometryElement>(
                '.hero__facts-ground-body',
            );
            const note = hero.querySelector<HTMLElement>('.hero__scene-note');

            if (!profile || !facts || !groundBody || !note) return null;

            const factsBounds = facts.getBoundingClientRect();
            const profileBounds = groundBody.getBoundingClientRect();
            const noteBounds = note.getBoundingClientRect();
            const noteSurfaceStyle = getComputedStyle(note, '::before');
            const noteSurface = {
                top: noteBounds.top + Number.parseFloat(noteSurfaceStyle.top),
                right:
                    noteBounds.right -
                    Number.parseFloat(noteSurfaceStyle.right),
                bottom:
                    noteBounds.bottom -
                    Number.parseFloat(noteSurfaceStyle.bottom),
                left:
                    noteBounds.left + Number.parseFloat(noteSurfaceStyle.left),
            };

            return {
                facts: {
                    top: factsBounds.top,
                    right: factsBounds.right,
                    bottom: factsBounds.bottom,
                    left: factsBounds.left,
                },
                profile: {
                    top: profileBounds.top,
                    right: profileBounds.right,
                    bottom: profileBounds.bottom,
                    left: profileBounds.left,
                },
                note: noteSurface,
                viewportWidth: document.documentElement.clientWidth,
            };
        });

        expect(geometry, `profile geometry at 320×${height}`).not.toBeNull();
        expect(
            geometry!.profile.left,
            `profile left edge at 320×${height}`,
        ).toBeGreaterThanOrEqual(0);
        expect(
            geometry!.profile.right,
            `profile right edge at 320×${height}`,
        ).toBeLessThanOrEqual(geometry!.viewportWidth);
        expect(
            geometry!.profile.right,
            `profile content clearance at 320×${height}`,
        ).toBeGreaterThanOrEqual(geometry!.facts.right + 4);
        expect(
            geometry!.note.left,
            `local-light left edge at 320×${height}`,
        ).toBeGreaterThanOrEqual(0);
        expect(
            geometry!.note.right,
            `local-light right edge at 320×${height}`,
        ).toBeLessThanOrEqual(geometry!.viewportWidth);
        expect(
            geometry!.note.top - geometry!.profile.bottom,
            `profile/local-light gap at 320×${height}`,
        ).toBeGreaterThanOrEqual(4);

        const sectionWidths = await page
            .locator('#hero, #contact')
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

test('draws the irregular control outline for pointer and keyboard users', async ({
    page,
    isMobile,
}) => {
    await page.goto('/');

    const explore = page.getByRole('link', { name: /explore my work/i });
    const sayHello = page.getByRole('link', { name: /say hello/i });

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
    }

    await page.locator('body').click({ position: { x: 1, y: 1 } });
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
    await expectDrawn(sayHello);

    await page.keyboard.press('Tab');
    await expect(explore).toBeFocused();
    await expectDrawn(explore);
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
        await expect(root).toHaveAttribute('data-time-state', 'midday');
        await expect(root).toHaveCSS('--sky-base', '#7fc4d6');
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
        const scene = page.locator('[data-skyline-scene]');
        await expect(control.locator('.hero__time-label:visible')).toHaveText(
            'Midday',
        );
        await expect(control).toHaveAttribute(
            'aria-label',
            'Current lighting: Midday. Show Dusk.',
        );

        for (const state of ['dusk', 'night', 'dawn', 'midday'] as const) {
            await control.click();
            await expect(scene).toHaveAttribute('data-time-state', state);
            await expect(page.locator('html')).toHaveAttribute(
                'data-time-state',
                state,
            );
            await expect(
                control.locator('.hero__time-label:visible'),
            ).toHaveText(
                state[0].toUpperCase() + state.slice(1),
            );
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
        expect(await beacon.evaluate((element) => getComputedStyle(element).filter)).not.toBe(
            'none',
        );

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

    test('keeps the deterministic dusk fallback and contact paths usable', async ({
        page,
    }) => {
        await page.goto('/');

        const hero = page.locator('#hero');
        const scene = page.locator('[data-skyline-scene]');
        const contact = page.locator('#contact');

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
        await expect(
            contact.locator('[data-footer-sky-object]'),
        ).toBeAttached();

        const panorama = contact.locator('[data-contact-panorama]');
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
