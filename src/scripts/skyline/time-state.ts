/** The four complete, art-directed variants of the Toronto skyline. */
export type SkylineState = 'dawn' | 'midday' | 'dusk' | 'night';

/**
 * Browser-local start hours for each skyline state.
 *
 * - Dawn: 05:00–07:59
 * - Midday: 08:00–16:59
 * - Dusk: 17:00–20:59
 * - Night: 21:00–04:59
 */
export const SKYLINE_STATE_BOUNDARIES = {
    dawn: 5,
    midday: 8,
    dusk: 17,
    night: 21,
} as const satisfies Record<SkylineState, number>;

export const SKYLINE_STATE_SEQUENCE: readonly SkylineState[] = [
    'dawn',
    'midday',
    'dusk',
    'night',
];

/**
 * Browser-chrome colors for each skyline state.
 * Keep these values aligned with `--sky-base` in `styles/_tokens.scss`.
 */
export const SKYLINE_THEME_COLORS = {
    dawn: '#a7bdc8',
    midday: '#7fc4d6',
    dusk: '#668aa6',
    night: '#152941',
} as const satisfies Record<SkylineState, string>;

/**
 * Build the tiny blocking bootstrap used in the document head.
 *
 * A first request does not include the browser's timezone, so the server
 * cannot select a trustworthy local state. This script shares the tested
 * boundaries above and updates the root element before the page can paint.
 */
export function getSkylineStateBootstrapScript(): string {
    const { dawn, midday, dusk, night } = SKYLINE_STATE_BOUNDARIES;
    const themeColors = JSON.stringify(SKYLINE_THEME_COLORS);

    return `(function(){var hour=new Date().getHours();var state=hour>=${night}||hour<${dawn}?'night':hour<${midday}?'dawn':hour<${dusk}?'midday':'dusk';document.documentElement.dataset.timeState=state;var themeColor=document.querySelector('meta[name="theme-color"]');if(themeColor)themeColor.content=${themeColors}[state];})();`;
}

/** Return the next art-directed state in the interactive lighting cycle. */
export function getNextSkylineState(state: SkylineState): SkylineState {
    const stateIndex = SKYLINE_STATE_SEQUENCE.indexOf(state);
    if (stateIndex < 0) return SKYLINE_STATE_SEQUENCE[0];

    return SKYLINE_STATE_SEQUENCE[
        (stateIndex + 1) % SKYLINE_STATE_SEQUENCE.length
    ];
}

/**
 * Resolve a whole local-clock hour (0–23) to its art-directed skyline state.
 * This function is intentionally pure so boundary behavior can be tested
 * without mocking timers or the browser clock.
 */
export function getSkylineStateForHour(hour: number): SkylineState {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
        throw new RangeError(
            'Skyline hour must be a whole number from 0 to 23.',
        );
    }

    if (
        hour >= SKYLINE_STATE_BOUNDARIES.night ||
        hour < SKYLINE_STATE_BOUNDARIES.dawn
    ) {
        return 'night';
    }

    if (hour < SKYLINE_STATE_BOUNDARIES.midday) {
        return 'dawn';
    }

    if (hour < SKYLINE_STATE_BOUNDARIES.dusk) {
        return 'midday';
    }

    return 'dusk';
}

/** Resolve a Date using its browser-local hour (never a server or UTC hour). */
export function getSkylineState(date: Date = new Date()): SkylineState {
    return getSkylineStateForHour(date.getHours());
}

/**
 * Return the delay until the next local skyline boundary.
 * Constructing the target as a local Date keeps daylight-saving transitions
 * correct for a long-lived browser tab.
 */
export function getMillisecondsUntilNextSkylineBoundary(
    date: Date = new Date(),
): number {
    const hour = date.getHours();
    getSkylineStateForHour(hour);

    const nextBoundary = new Date(date);

    if (hour < SKYLINE_STATE_BOUNDARIES.dawn) {
        nextBoundary.setHours(SKYLINE_STATE_BOUNDARIES.dawn, 0, 0, 0);
    } else if (hour < SKYLINE_STATE_BOUNDARIES.midday) {
        nextBoundary.setHours(SKYLINE_STATE_BOUNDARIES.midday, 0, 0, 0);
    } else if (hour < SKYLINE_STATE_BOUNDARIES.dusk) {
        nextBoundary.setHours(SKYLINE_STATE_BOUNDARIES.dusk, 0, 0, 0);
    } else if (hour < SKYLINE_STATE_BOUNDARIES.night) {
        nextBoundary.setHours(SKYLINE_STATE_BOUNDARIES.night, 0, 0, 0);
    } else {
        nextBoundary.setDate(nextBoundary.getDate() + 1);
        nextBoundary.setHours(SKYLINE_STATE_BOUNDARIES.dawn, 0, 0, 0);
    }

    return Math.max(0, nextBoundary.getTime() - date.getTime());
}
