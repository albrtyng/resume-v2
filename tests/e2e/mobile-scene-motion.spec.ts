import { expect, test, type Locator } from '@playwright/test';

async function readAnimationTime(
    locator: Locator,
    animationName: string,
): Promise<number> {
    return locator.evaluate((element, expectedName) => {
        const animation = element
            .getAnimations()
            .find(
                (candidate) =>
                    candidate instanceof CSSAnimation &&
                    candidate.animationName === expectedName,
            );

        return Number(animation?.currentTime ?? 0);
    }, animationName);
}

test('keeps the compact skyline streetcar and water moving', async ({
    page,
    isMobile,
}) => {
    test.skip(!isMobile, 'This regression covers the compact touch layouts.');

    await page.goto('/');

    const scene = page.locator('[data-skyline-scene]');
    const streetcar = scene.locator('[data-streetcar]');
    const atmosphere = scene.locator('.skyline__horizon-haze');
    const water = scene.locator('.skyline__wave--two');

    await expect(scene).toHaveAttribute('data-motion', 'active');
    await expect(streetcar).toHaveCSS(
        'animation-name',
        'ttc-streetcar-journey-compact',
    );
    await expect(streetcar).toHaveCSS('animation-play-state', 'running');
    await expect(streetcar).toBeInViewport();
    await expect(atmosphere).toHaveCSS('animation-name', 'none');
    await expect(water).toHaveCSS('animation-play-state', 'running');

    const journey = await streetcar.evaluate((element) => {
        const animation = element
            .getAnimations()
            .find(
                (candidate) =>
                    candidate instanceof CSSAnimation &&
                    candidate.animationName === 'ttc-streetcar-journey-compact',
            );
        const keyframes =
            animation?.effect instanceof KeyframeEffect
                ? animation.effect.getKeyframes()
                : [];
        const timing = animation?.effect?.getComputedTiming();

        return {
            duration: timing?.duration ?? null,
            easing: timing?.easing ?? null,
            iterations: timing?.iterations ?? null,
            positions: keyframes.map((keyframe) => {
                const matrix = new DOMMatrixReadOnly(
                    String(keyframe.transform ?? 'none'),
                );
                return { x: matrix.m41, y: matrix.m42 };
            }),
        };
    });

    expect(journey.duration).toBe(32_000);
    expect(journey.easing).toBe('linear');
    expect(journey.iterations).toBe(Infinity);
    expect(journey.positions).toEqual([
        { x: 220, y: -70 },
        { x: 1120, y: -70 },
    ]);

    const firstStreetcarTime = await readAnimationTime(
        streetcar,
        'ttc-streetcar-journey-compact',
    );
    const firstWaterTransform = await water.evaluate(
        (element) => getComputedStyle(element).transform,
    );

    await page.waitForTimeout(250);

    expect(
        await readAnimationTime(streetcar, 'ttc-streetcar-journey-compact'),
    ).toBeGreaterThan(firstStreetcarTime + 20);
    expect(
        await water.evaluate((element) => getComputedStyle(element).transform),
    ).not.toBe(firstWaterTransform);

    await page.locator('#experience').scrollIntoViewIfNeeded();
    await expect(scene).toHaveAttribute('data-motion', 'paused');
    await expect(streetcar).toHaveCSS('animation-play-state', 'paused');
    await expect(atmosphere).toHaveCSS('animation-name', 'none');
    await expect(water).toHaveCSS('animation-play-state', 'paused');
});

test('keeps compact footer ferry, water, and bonfire motion visibility-aware', async ({
    page,
    isMobile,
}) => {
    test.skip(!isMobile, 'This regression covers the compact touch layouts.');

    await page.goto('/');

    const footer = page.locator('[data-contact-footer]');
    const panorama = footer.locator('[data-contact-panorama]');
    const ferry = panorama.locator('[data-harbour-ferry-route]');
    const ferryReflection = panorama.locator(
        '[data-footer-ferry-reflection-route]',
    );
    const farWave = panorama.locator('.harbour-panorama__wave--far');
    const nearWave = panorama.locator('.harbour-panorama__wave--near');
    const flame = panorama.locator('[data-bonfire-flame="outer"]');
    const bonfireReflection = panorama.locator(
        '[data-footer-reflection-for="footer-bonfire"]',
    );
    const usesCompactFerry = (page.viewportSize()?.width ?? 0) <= 45 * 16;
    const ferryAnimationName = usesCompactFerry
        ? 'harbour-ferry-crossing-compact'
        : 'harbour-ferry-crossing';

    await panorama.scrollIntoViewIfNeeded();
    await expect(footer).toHaveAttribute('data-contact-motion', 'full');
    await expect(footer).toHaveAttribute('data-contact-active', '');
    await expect(ferry).toHaveCSS('animation-name', ferryAnimationName);
    await expect(ferry).toHaveCSS('animation-play-state', 'running');
    await expect(ferryReflection).toHaveCSS(
        'animation-name',
        ferryAnimationName,
    );
    await expect(ferryReflection).toHaveCSS(
        'animation-play-state',
        'running',
    );
    await expect(farWave).toHaveCSS('animation-play-state', 'running');
    await expect(nearWave).toHaveCSS('animation-play-state', 'running');
    await expect(flame).toHaveCSS(
        'animation-name',
        'island-bonfire-flame-outer',
    );
    await expect(flame).toHaveCSS('animation-play-state', 'running');
    await expect(bonfireReflection).toHaveCSS(
        'animation-play-state',
        'running',
    );

    const firstFerryTime = await readAnimationTime(ferry, ferryAnimationName);
    const firstFerryReflectionTime = await readAnimationTime(
        ferryReflection,
        ferryAnimationName,
    );
    const firstWaveTime = await readAnimationTime(farWave, 'harbour-wave-far');
    const firstFlameTime = await readAnimationTime(
        flame,
        'island-bonfire-flame-outer',
    );

    await page.waitForTimeout(250);

    expect(await readAnimationTime(ferry, ferryAnimationName)).toBeGreaterThan(
        firstFerryTime + 20,
    );
    expect(
        await readAnimationTime(ferryReflection, ferryAnimationName),
    ).toBeGreaterThan(firstFerryReflectionTime + 20);
    expect(
        await readAnimationTime(farWave, 'harbour-wave-far'),
    ).toBeGreaterThan(firstWaveTime + 20);
    expect(
        await readAnimationTime(flame, 'island-bonfire-flame-outer'),
    ).toBeGreaterThan(firstFlameTime + 20);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(footer).not.toHaveAttribute('data-contact-active', '');
    await expect(ferry).toHaveCSS('animation-play-state', 'paused');
    await expect(ferryReflection).toHaveCSS(
        'animation-play-state',
        'paused',
    );
    await expect(farWave).toHaveCSS('animation-play-state', 'paused');
    await expect(nearWave).toHaveCSS('animation-play-state', 'paused');
    await expect(flame).toHaveCSS('animation-play-state', 'paused');
    await expect(bonfireReflection).toHaveCSS(
        'animation-play-state',
        'paused',
    );
});

test('does not treat slow-update mobile as a static-motion preference', async ({
    page,
    isMobile,
}) => {
    test.skip(!isMobile, 'This regression covers the compact touch layouts.');

    await page.addInitScript(() => {
        const nativeMatchMedia = window.matchMedia.bind(window);

        window.matchMedia = (query: string) => {
            if (query !== '(update: slow)') return nativeMatchMedia(query);

            return {
                matches: true,
                media: query,
                onchange: null,
                addListener: () => undefined,
                removeListener: () => undefined,
                addEventListener: () => undefined,
                removeEventListener: () => undefined,
                dispatchEvent: () => false,
            } as MediaQueryList;
        };
    });

    await page.goto('/');
    expect(
        await page.evaluate(() => window.matchMedia('(update: slow)').matches),
    ).toBe(true);

    const scene = page.locator('[data-skyline-scene]');
    const streetcar = scene.locator('[data-streetcar]');
    await expect(scene).toHaveAttribute('data-motion', 'active');
    await expect(streetcar).toHaveCSS(
        'animation-name',
        'ttc-streetcar-journey-compact',
    );
    await expect(streetcar).toHaveCSS('animation-play-state', 'running');

    const footer = page.locator('[data-contact-footer]');
    const panorama = footer.locator('[data-contact-panorama]');
    await panorama.scrollIntoViewIfNeeded();
    await expect(footer).toHaveAttribute('data-contact-motion', 'full');
    await expect(footer).toHaveAttribute('data-contact-active', '');
    await expect(panorama.locator('[data-harbour-ferry-route]')).toHaveCSS(
        'animation-play-state',
        'running',
    );
    await expect(panorama.locator('[data-bonfire-flame="outer"]')).toHaveCSS(
        'animation-play-state',
        'running',
    );
});
