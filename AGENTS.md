# Project Agent Guidance

## Product Direction

This is Albert Yang's Toronto-based Software Engineer portfolio. The redesign should feel like a calm, memorable illustrated place that showcases craft and outcomes, not a generic resume template, SaaS landing page, or animation demo.

Use the supplied visual references as inspiration, with the top-right reference as the strongest influence: atmospheric blue space, editorial typography, organic illustrated layers, and a clear sense of place. The site's original identity is Toronto at different times of day, not a European countryside, windmill, ship, or generic landscape.

## Visual Requirements

- Use an original 2D illustrated Toronto skyline as the hero anchor.
- Include tasteful Toronto cues such as the CN Tower, downtown layers, lakefront, water, trees, or a restrained streetcar/ferry detail.
- Keep the mood warm, hand-painted, lightly textured, editorial, and restful. Avoid generic gradients, stock photography, glossy 3D, and excessive cards or pills.
- A custom scrollbar is welcome as progressive enhancement. It should be a small, cute 2D treatment that matches the scene, while native scrolling remains intact and usable.
- Fonts may be changed when the current pairing does not support the visual direction. Keep typography distinctive and readable, and update all font preload/declaration/variable references consistently.

## Skyline Time States

The hero scene must respond to the visitor's browser-local time with complete art-directed states for:

- Dawn
- Midday
- Dusk
- Night

Use local browser time, not a server timezone. Document the chosen boundaries. Change the palette, lighting, sky object, silhouettes, water, and window lights coherently. Read the time once at startup and refresh only at a low frequency if needed to cross a boundary. Do not run a needless continuous timer or rerender the whole scene.

JavaScript-disabled and reduced-motion fallbacks must still be complete and intentional. Browser tests should mock representative times instead of waiting for real time to pass.

## Rendering And Performance

Prefer lightweight SVG, Canvas, or DOM/CSS for the illustrated scene. Three.js and GLB assets are not sacred. Remove them when they do not earn their cost, but make the decision using both visual quality and measurements.

When comparing approaches:

- Establish a current-page baseline before replacing major rendering code.
- Use Lighthouse or `pnpm audit:lighthouse` for desktop and mobile audits.
- Use Playwright or browser throttling for slow-network and CPU-constrained checks.
- Inspect production build output, transferred bytes, long tasks, LCP, CLS, and total blocking time.
- Pause off-screen animation and reduce work on mobile and low-power devices.
- Do not let decorative artwork block text, navigation, or contact links.

Prefer the option with the best combined result for atmosphere, accessibility, maintainability, and first-visit performance. Record major rendering decisions in the final handoff.

Set an explicit performance budget after measuring the baseline. At minimum, the selected implementation must materially improve the current first-visit experience. Protect fast HTML and text rendering, keep decorative work non-blocking, and track LCP, CLS, total blocking time, transferred bytes, long tasks, and the largest JavaScript/assets contributors during iteration.

## Quality Plan

- Define centralized color, typography, spacing, texture, and time-state tokens before styling individual sections. Dawn, midday, dusk, and night need intentional contrast and composition.
- Establish one clear sentence describing what Albert builds and the problems he solves. Emphasize outcomes and readable experience history over a technology-logo wall.
- Use a small set of signature motions: scroll-linked skyline depth parallax, a subtle flowing Lake Ontario foreground, window lights, and restrained copy reveals. Keep the portfolio calm, pause off-screen work, and provide complete reduced-motion alternatives.
- Add micro-interactions to meaningful links, buttons, navigation, and experience outcomes. Support hover, focus, active, and touch states without relying on generic scale effects or hover-only meaning.
- Consider atmospheric details such as cloud and bird layers, occasional streetcar or ferry movement, a rare CN Tower beacon pulse at night, a warm sun/moon reflection path across Lake Ontario, a skills constellation, and a themed custom scrollbar thumb. Use only the details that improve the story without creating noise.
- Under `prefers-reduced-motion: reduce`, show complete static time-of-day artwork, remove parallax and flowing-water motion, use immediate or simple opacity transitions for copy, and preserve all interaction affordances.
- Put local-time-to-skyline-state selection in a small typed, testable function with documented boundaries. Test representative and boundary times directly rather than coupling correctness to animation timing.
- Review screenshots covering desktop, tablet, mobile, dawn, midday, dusk, night, reduced motion, and no-JavaScript or failed-artwork fallback.
- After the rendering decision, remove dead components, model files, preload tags, unused scripts, Tailwind dependencies, and obsolete CSS. Do not leave the old 3D architecture behind just in case.

## Responsive Design

Responsive composition is part of the design, not a final CSS pass.

- Design intentionally for phone, tablet, laptop, and wide desktop widths.
- Re-compose or crop skyline layers rather than merely shrinking the desktop scene.
- Keep landmarks, headline, CTA, experience content, and contact paths legible.
- Prevent horizontal overflow.
- Keep touch scrolling native and comfortable.
- Pointer and parallax effects must be optional and must not interfere with swipe gestures or tap targets.
- Treat scrollbar styling as optional on touch devices and browsers without reliable support.

## Content And Accessibility

- Preserve factual content from `src/data/experience.ts`.
- Do not invent employers, metrics, projects, awards, or personal claims.
- Current key facts include Albert Yang, Software Engineer II at Super.com, Canada-based/global work, 6+ years of experience, and the existing quantified work outcomes.
- Preserve working email and LinkedIn contact paths.
- Use semantic HTML, meaningful image alternatives, visible keyboard focus, and WCAG AA contrast.
- Honor `prefers-reduced-motion` before initializing animation systems.
- Ensure the page remains useful when decorative animation fails or is disabled.
- Do not expose agent prompts, implementation notes, or placeholder copy in the UI.

## Codebase Conventions

- Framework: Astro 5 with TypeScript.
- Existing motion libraries: GSAP and Lenis. Reuse them when appropriate; do not add abstractions without a clear benefit.
- Keep content in data files when the project already does so.
- Keep changes focused and remove obsolete assets, preloads, scripts, and dependencies when replacing an old visual system.
- Do not manually edit generated `dist/` output.
- Keep the existing project formatting conventions. Do not mass-format unrelated files as part of a feature.

## Architecture And Code Quality

- Follow Astro, TypeScript, and browser-platform best practices. Do not vibe-code the architecture or optimize for the fewest files.
- Keep distinct responsibilities in distinct components: layout, header/navigation, hero, skyline artwork, experience, capabilities, footer, and other meaningful page sections should not become one monolithic Astro component.
- Every meaningful component should live in its own folder with the Astro component and colocated SCSS file, for example `src/components/Hero/Hero.astro` and `src/components/Hero/Hero.scss`. Avoid a flat component directory paired with one global section stylesheet.
- Keep page composition in `src/pages/index.astro`, content in data modules, structure in Astro components, global tokens in stylesheets, and animation/rendering behavior in focused scripts or modules.
- Give each meaningful component ownership of its animation behavior in a distinct focused module: skyline/time-state animation, experience/copy reveals, navigation micro-interactions, and footer/contact motion should not be bundled together. Shared utilities should handle only genuinely shared concerns such as reduced-motion detection, visibility pausing, and cleanup.
- Keep page-level animation orchestration limited to lifecycle and coordination. Do not create one monolithic animation file, a global selector maze, or cross-component animation code with unclear ownership.
- Prefer Astro's server-rendered HTML and progressive enhancement. Use client-side islands or browser scripts only where interaction requires them; do not turn the whole page into a client-rendered app.
- Use typed component props and rendering data. Keep browser-only APIs inside the appropriate client lifecycle and provide non-JavaScript fallbacks.
- Keep components cohesive and interfaces small. Avoid premature design-system abstractions, generic wrappers, duplicated markup, and clever indirection that hides the page structure.
- Clean up event listeners, observers, animation handles, and rendering resources when components or pages are replaced.
- Before finalizing, review whether every component has one clear responsibility and refactor monolithic or tangled code before visual polish.

## Styling Rules

- Do not use Tailwind for the redesign. Migrate away from the current Tailwind usage and remove the Tailwind dependency, Vite plugin, imports, and obsolete configuration when they are no longer needed.
- Do not use inline `style` attributes for layout, colors, typography, animation, or responsive behavior. Put styles in component-scoped Astro `<style>` blocks, dedicated CSS files, or CSS modules where that is the clearest boundary.
- Prefer external SCSS files or partials over substantive Astro `<style>` blocks. Keep Astro files focused on semantic structure and typed props. If SCSS is not available, add the smallest appropriate `sass` dependency and configure it using Astro/Vite conventions.
- Prefer meaningful class-based selectors. Use IDs for anchors, accessibility relationships, or narrowly scoped JavaScript hooks, not as the styling architecture.
- Keep selector specificity sane: shallow selectors, deliberate naming, limited nesting, and no giant global cascade that makes components interdependent.
- Keep global design tokens and reset rules centralized, while keeping section-specific styling close to the component that owns it.

## Verification

Run these commands before declaring work complete:

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```

`pnpm test:e2e` runs Chromium, mobile Chromium, and tablet Chromium checks. Cover the main journey, contact links, reduced motion, local-time skyline states, and horizontal overflow as the implementation evolves.

Use `pnpm audit:lighthouse` against a local production-like server when assessing performance-sensitive rendering decisions. Capture screenshots at desktop and mobile widths and inspect them for composition, contrast, overflow, hierarchy, and missing visual states.

Do not add Jest solely for this project. Add unit tests only when a real unit-test need emerges; browser behavior belongs in the existing Playwright setup.

## Working Style

Treat requests as outcomes rather than rigid implementation checklists. Inspect the existing page, form a visual hypothesis, implement a coherent version, test it in a real browser, and iterate on the largest quality problems. Do not stop at the first passing build if the result is visually generic, poorly composed, inaccessible, or slow.

Make routine implementation decisions independently. Ask for clarification only when a missing personal fact would materially change the content. Preserve truthful content and working paths, but feel free to change architecture, typography, illustration technique, animation, and information hierarchy when that improves the finished experience.
