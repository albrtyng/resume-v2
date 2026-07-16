import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.SKYLINE_BASE_URL ?? 'http://127.0.0.1:4321/';
const outputDirectory = path.resolve(
    process.env.SKYLINE_CAPTURE_DIR ?? 'test-results/skyline-visuals',
);

const timeStates = [
    { name: 'dawn', hour: 6 },
    { name: 'midday', hour: 12 },
    { name: 'dusk', hour: 19 },
    { name: 'night', hour: 2 },
];

const viewports = [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch();

try {
    for (const viewport of viewports) {
        for (const state of timeStates) {
            const context = await browser.newContext({
                viewport: {
                    width: viewport.width,
                    height: viewport.height,
                },
                deviceScaleFactor: 1,
                timezoneId: 'America/Toronto',
                reducedMotion: 'no-preference',
            });
            const page = await context.newPage();
            const localHour = String(state.hour).padStart(2, '0');

            await page.clock.setFixedTime(
                new Date(`2026-07-14T${localHour}:00:00-04:00`),
            );
            await page.goto(baseURL, { waitUntil: 'networkidle' });
            await page.evaluate(() => document.fonts.ready);
            await page.addStyleTag({
                content: `
                    [data-streetcar] {
                        animation: none !important;
                        transform: translateX(520px) !important;
                    }

                    @media (max-width: 48rem) {
                        [data-streetcar] {
                            transform: translate(720px, -70px) !important;
                        }
                    }

                    [data-streetcar] * {
                        animation: none !important;
                    }

                    [data-harbour-ferry-route] {
                        animation: none !important;
                        transform: translateX(820px) !important;
                    }
                `,
            });

            const scene = page.locator('[data-skyline-scene]');
            await scene.waitFor({ state: 'visible' });

            const renderedState = await scene.getAttribute('data-time-state');
            if (renderedState !== state.name) {
                throw new Error(
                    `Expected ${state.name} at ${state.hour}:00, received ${renderedState ?? 'no state'}.`,
                );
            }

            const screenshotPath = path.join(
                outputDirectory,
                `${viewport.name}-${state.name}.png`,
            );
            await page.screenshot({
                path: screenshotPath,
                animations: 'disabled',
            });

            console.log(screenshotPath);

            const contact = page.locator('[data-contact-footer]');
            await contact.evaluate((element) =>
                element.scrollIntoView({ behavior: 'instant', block: 'start' }),
            );
            await page.waitForTimeout(450);
            const footerScreenshotPath = path.join(
                outputDirectory,
                `footer-${viewport.name}-${state.name}.png`,
            );
            await page.screenshot({
                path: footerScreenshotPath,
                animations: 'disabled',
            });
            console.log(footerScreenshotPath);

            const panorama = page.locator('[data-contact-panorama]');
            await panorama.evaluate((element) =>
                element.scrollIntoView({ behavior: 'instant', block: 'end' }),
            );
            await page.waitForTimeout(450);
            const waterfrontScreenshotPath = path.join(
                outputDirectory,
                `waterfront-${viewport.name}-${state.name}.png`,
            );
            await page.screenshot({
                path: waterfrontScreenshotPath,
                animations: 'disabled',
            });
            console.log(waterfrontScreenshotPath);

            await context.close();
        }

        const reducedContext = await browser.newContext({
            viewport: {
                width: viewport.width,
                height: viewport.height,
            },
            deviceScaleFactor: 1,
            timezoneId: 'America/Toronto',
            reducedMotion: 'reduce',
        });
        const reducedPage = await reducedContext.newPage();

        await reducedPage.clock.setFixedTime(
            new Date('2026-07-14T02:00:00-04:00'),
        );
        await reducedPage.goto(baseURL, { waitUntil: 'networkidle' });
        await reducedPage.evaluate(() => document.fonts.ready);
        await reducedPage.addStyleTag({
            content: `
                [data-harbour-ferry-route] {
                    animation: none !important;
                    transform: translateX(820px) !important;
                }
            `,
        });

        const reducedPanorama = reducedPage.locator('[data-contact-panorama]');
        await reducedPanorama.evaluate((element) =>
            element.scrollIntoView({ behavior: 'instant', block: 'end' }),
        );
        const reducedFooterScreenshotPath = path.join(
            outputDirectory,
            `footer-${viewport.name}-night-reduced.png`,
        );
        await reducedPage.screenshot({
            path: reducedFooterScreenshotPath,
            animations: 'disabled',
        });
        console.log(reducedFooterScreenshotPath);
        await reducedContext.close();

        const noJavaScriptContext = await browser.newContext({
            viewport: {
                width: viewport.width,
                height: viewport.height,
            },
            deviceScaleFactor: 1,
            timezoneId: 'America/Toronto',
            javaScriptEnabled: false,
        });
        const noJavaScriptPage = await noJavaScriptContext.newPage();

        await noJavaScriptPage.goto(baseURL, { waitUntil: 'networkidle' });
        await noJavaScriptPage.evaluate(() => document.fonts.ready);

        const noJavaScriptHeroPath = path.join(
            outputDirectory,
            `${viewport.name}-dusk-no-js.png`,
        );
        await noJavaScriptPage.screenshot({
            path: noJavaScriptHeroPath,
            animations: 'disabled',
        });
        console.log(noJavaScriptHeroPath);

        const noJavaScriptFooter = noJavaScriptPage.locator(
            '[data-contact-footer]',
        );
        await noJavaScriptFooter.evaluate((element) =>
            element.scrollIntoView({ behavior: 'instant', block: 'start' }),
        );
        const noJavaScriptFooterPath = path.join(
            outputDirectory,
            `footer-${viewport.name}-dusk-no-js.png`,
        );
        await noJavaScriptPage.screenshot({
            path: noJavaScriptFooterPath,
            animations: 'disabled',
        });
        console.log(noJavaScriptFooterPath);

        await noJavaScriptContext.close();
    }
} finally {
    await browser.close();
}
