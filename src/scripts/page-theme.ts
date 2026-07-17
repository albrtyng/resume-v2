import { SKYLINE_THEME_COLORS, type SkylineState } from './skyline/time-state';

export type PageSurface = 'hero' | 'paper' | 'contact';

/** Public fragment targets that should receive a non-hero first paint. */
export const PAGE_SURFACE_BY_HASH: Readonly<Record<string, PageSurface>> = {
    '#experience': 'paper',
    '#experience-title': 'paper',
    '#capabilities': 'paper',
    '#capabilities-title': 'paper',
    '#contact': 'contact',
    '#contact-title': 'contact',
};

/** Keep these browser-edge colors aligned with `styles/_tokens.scss`. */
const PAPER_THEME_COLOR = '#f2e7d2';

const FOOTER_THEME_COLORS = {
    dawn: '#315b57',
    midday: '#3c6660',
    dusk: '#1d4540',
    night: '#122f38',
} as const satisfies Record<SkylineState, string>;

export const PAGE_THEME_COLORS = {
    hero: SKYLINE_THEME_COLORS,
    paper: PAPER_THEME_COLOR,
    contact: FOOTER_THEME_COLORS,
} as const;

/** Resolve the browser chrome color for the visible page surface. */
export function getPageThemeColor(
    state: SkylineState,
    surface: PageSurface,
): string {
    if (surface === 'paper') return PAGE_THEME_COLORS.paper;
    return PAGE_THEME_COLORS[surface][state];
}
