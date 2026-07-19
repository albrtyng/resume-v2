import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.FOOTER_BASE_URL ?? 'http://127.0.0.1:4325/';
const outputDirectory = path.resolve(
    process.env.FOOTER_CAPTURE_DIR ?? 'test-results/footer-visuals',
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
            await page.evaluate(() => {
                document.documentElement.style.scrollBehavior = 'auto';
                window.scrollTo(0, document.documentElement.scrollHeight);
            });
            await page.waitForTimeout(400);
            await page.screenshot({
                path: path.join(
                    outputDirectory,
                    `footer-${viewport.name}-${state.name}.png`,
                ),
            });
            await context.close();
        }
    }
} finally {
    await browser.close();
}
