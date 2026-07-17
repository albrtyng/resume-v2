import {
    getMillisecondsUntilNextSkylineBoundary,
    getNextSkylineState,
    getSkylineState,
    SKYLINE_THEME_COLORS,
    type SkylineState,
} from './time-state';

type Cleanup = () => void;

const sceneCleanups = new WeakMap<HTMLElement, Cleanup>();
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const BOUNDARY_SETTLE_DELAY_MS = 50;

const TIME_STATE_NAMES: Record<SkylineState, string> = {
    dawn: 'Dawn',
    midday: 'Midday',
    dusk: 'Dusk',
    night: 'Night',
};

const TIME_LABELS: Record<SkylineState, string> = {
    dawn: 'An illustrated Toronto skyline with the CN Tower, Rogers Centre, New City Hall, and a red streetcar beside Lake Ontario at dawn.',
    midday: 'An illustrated Toronto skyline with the CN Tower, Rogers Centre, New City Hall, and a red streetcar beside Lake Ontario at midday.',
    dusk: 'An illustrated Toronto skyline with the CN Tower, Rogers Centre, New City Hall, and a red streetcar beside Lake Ontario at dusk.',
    night: 'An illustrated Toronto skyline with the CN Tower, Rogers Centre, New City Hall, and a red streetcar beside Lake Ontario at night.',
};

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}

function findScene(scope: ParentNode): HTMLElement | null {
    if (scope instanceof HTMLElement && scope.matches('[data-skyline-scene]')) {
        return scope;
    }

    return scope.querySelector<HTMLElement>('[data-skyline-scene]');
}

/**
 * Progressively enhance the first skyline scene in `scope`.
 *
 * The scene receives restrained, scroll-derived `--scene-x` and `--scene-y`
 * values for its depth layers. The returned function removes every observer,
 * timer, listener, and animation frame created by this enhancement.
 */
export function initSkylineMotion(scope: ParentNode = document): Cleanup {
    const scene = findScene(scope);
    if (!scene) return () => undefined;
    const sceneElement = scene;

    sceneCleanups.get(scene)?.();

    const accessibleTimeLabel = scene.querySelector<HTMLElement>(
        '[data-skyline-time-label]',
    );
    const timeControl = document.querySelector<HTMLButtonElement>(
        '[data-time-control]',
    );
    const scrollSurface = scene.parentElement ?? scene;
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const rootElement = document.documentElement;
    const themeColor = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]',
    );
    const previousSceneTimeState = scene.dataset.timeState;
    const previousDocumentTimeState = rootElement.dataset.timeState;
    const previousThemeColor = themeColor?.getAttribute('content') ?? null;
    const previousMotionState = scene.dataset.motion;
    const previousAccessibleTimeLabelText =
        accessibleTimeLabel?.textContent ?? null;
    const previousTimeControlAriaLabel =
        timeControl?.getAttribute('aria-label') ?? null;
    const previousTimeControlTitle = timeControl?.getAttribute('title') ?? null;
    const previousTimeControlDisabled = timeControl?.disabled ?? null;
    const previousSceneAriaLabel = scene.getAttribute('aria-label');
    const shouldUpdateSceneAriaLabel =
        scene.getAttribute('role') === 'img' ||
        scene.hasAttribute('aria-label');

    let disposed = false;
    let isIntersecting = false;
    let boundaryTimer = 0;
    let animationFrame = 0;
    let selectedTimeState: SkylineState | null = null;

    let targetScrollProgress = 0;
    let currentScrollProgress = 0;
    let shouldMeasureScroll = true;

    const isMotionActive = () =>
        !reducedMotionQuery.matches && isIntersecting && !document.hidden;

    const cancelMotionFrame = () => {
        if (!animationFrame) return;
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
    };

    const clearMotionProperties = () => {
        scene.style.removeProperty('--scene-x');
        scene.style.removeProperty('--scene-y');
    };

    const paintMotion = () => {
        animationFrame = 0;
        if (!isMotionActive()) return;

        if (shouldMeasureScroll) {
            const bounds = scrollSurface.getBoundingClientRect();
            targetScrollProgress = clamp(
                -bounds.top / Math.max(bounds.height, 1),
                0,
                1,
            );
            shouldMeasureScroll = false;
        }

        const easing = 0.14;
        currentScrollProgress +=
            (targetScrollProgress - currentScrollProgress) * easing;

        scene.style.setProperty(
            '--scene-x',
            `${(currentScrollProgress * 8).toFixed(2)}px`,
        );
        scene.style.setProperty(
            '--scene-y',
            `${(currentScrollProgress * 28).toFixed(2)}px`,
        );

        const isSettled =
            Math.abs(targetScrollProgress - currentScrollProgress) < 0.001;

        if (!isSettled) {
            animationFrame = requestAnimationFrame(paintMotion);
        }
    };

    const requestMotionFrame = () => {
        if (!animationFrame && isMotionActive()) {
            animationFrame = requestAnimationFrame(paintMotion);
        }
    };

    const queueScrollMeasurement = () => {
        if (!isMotionActive()) return;
        shouldMeasureScroll = true;
        requestMotionFrame();
    };

    const syncMotionState = () => {
        if (reducedMotionQuery.matches) {
            scene.dataset.motion = 'reduced';
            cancelMotionFrame();
            clearMotionProperties();
            return;
        }

        if (isMotionActive()) {
            scene.dataset.motion = 'active';
            queueScrollMeasurement();
            requestMotionFrame();
        } else {
            scene.dataset.motion = 'paused';
            cancelMotionFrame();
        }
    };

    const scheduleNextBoundary = (from: Date) => {
        window.clearTimeout(boundaryTimer);
        const delay =
            getMillisecondsUntilNextSkylineBoundary(from) +
            BOUNDARY_SETTLE_DELAY_MS;
        boundaryTimer = window.setTimeout(refreshTimeState, delay);
    };

    function applyTimeState(state: SkylineState) {
        sceneElement.dataset.timeState = state;
        rootElement.dataset.timeState = state;
        themeColor?.setAttribute('content', SKYLINE_THEME_COLORS[state]);
        if (accessibleTimeLabel) {
            accessibleTimeLabel.textContent = TIME_LABELS[state];
        }
        if (shouldUpdateSceneAriaLabel) {
            sceneElement.setAttribute('aria-label', TIME_LABELS[state]);
        }
        if (timeControl) {
            const nextState = getNextSkylineState(state);
            timeControl.setAttribute(
                'aria-label',
                `Current lighting: ${TIME_STATE_NAMES[state]}. Show ${TIME_STATE_NAMES[nextState]}.`,
            );
            timeControl.title = `Show ${TIME_STATE_NAMES[nextState]} lighting`;
        }
    }

    function refreshTimeState() {
        if (disposed || selectedTimeState) return;
        const now = new Date();
        applyTimeState(getSkylineState(now));
        scheduleNextBoundary(now);
    }

    const handleTimeControlClick = () => {
        const currentState =
            selectedTimeState ?? getSkylineState(new Date());
        selectedTimeState = getNextSkylineState(currentState);
        window.clearTimeout(boundaryTimer);
        applyTimeState(selectedTimeState);
    };

    const handleVisibilityChange = () => {
        if (!document.hidden) refreshTimeState();
        syncMotionState();
    };

    const handleReducedMotionChange = () => syncMotionState();

    const observer =
        'IntersectionObserver' in window
            ? new IntersectionObserver(
                  ([entry]) => {
                      isIntersecting = Boolean(entry?.isIntersecting);
                      syncMotionState();
                  },
                  { threshold: 0.01 },
              )
            : null;

    if (observer) {
        observer.observe(scene);
    } else {
        isIntersecting = true;
    }

    window.addEventListener('scroll', queueScrollMeasurement, {
        passive: true,
    });
    window.addEventListener('resize', queueScrollMeasurement, {
        passive: true,
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (timeControl) timeControl.disabled = false;
    timeControl?.addEventListener('click', handleTimeControlClick);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    let cleanup: Cleanup = () => undefined;
    const handleBeforeSwap = () => cleanup();
    document.addEventListener('astro:before-swap', handleBeforeSwap, {
        once: true,
    });

    cleanup = () => {
        if (disposed) return;
        disposed = true;

        window.clearTimeout(boundaryTimer);
        cancelMotionFrame();
        observer?.disconnect();
        window.removeEventListener('scroll', queueScrollMeasurement);
        window.removeEventListener('resize', queueScrollMeasurement);
        document.removeEventListener(
            'visibilitychange',
            handleVisibilityChange,
        );
        timeControl?.removeEventListener('click', handleTimeControlClick);
        document.removeEventListener('astro:before-swap', handleBeforeSwap);
        reducedMotionQuery.removeEventListener(
            'change',
            handleReducedMotionChange,
        );
        clearMotionProperties();

        if (previousSceneTimeState === undefined) {
            delete scene.dataset.timeState;
        } else {
            scene.dataset.timeState = previousSceneTimeState;
        }

        if (previousDocumentTimeState === undefined) {
            delete rootElement.dataset.timeState;
        } else {
            rootElement.dataset.timeState = previousDocumentTimeState;
        }

        if (themeColor) {
            if (previousThemeColor === null) {
                themeColor.removeAttribute('content');
            } else {
                themeColor.setAttribute('content', previousThemeColor);
            }
        }

        if (previousMotionState === undefined) {
            delete scene.dataset.motion;
        } else {
            scene.dataset.motion = previousMotionState;
        }

        if (accessibleTimeLabel) {
            accessibleTimeLabel.textContent = previousAccessibleTimeLabelText;
        }
        if (timeControl) {
            if (previousTimeControlDisabled !== null) {
                timeControl.disabled = previousTimeControlDisabled;
            }
            if (previousTimeControlAriaLabel === null) {
                timeControl.removeAttribute('aria-label');
            } else {
                timeControl.setAttribute(
                    'aria-label',
                    previousTimeControlAriaLabel,
                );
            }
            if (previousTimeControlTitle === null) {
                timeControl.removeAttribute('title');
            } else {
                timeControl.setAttribute('title', previousTimeControlTitle);
            }
        }
        if (previousSceneAriaLabel === null) {
            scene.removeAttribute('aria-label');
        } else {
            scene.setAttribute('aria-label', previousSceneAriaLabel);
        }

        if (sceneCleanups.get(scene) === cleanup) {
            sceneCleanups.delete(scene);
        }
    };

    refreshTimeState();
    syncMotionState();
    sceneCleanups.set(scene, cleanup);

    return cleanup;
}
