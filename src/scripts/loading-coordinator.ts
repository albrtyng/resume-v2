// Loading progress coordinator for critical (hero) assets only.
// Below-fold scenes no longer register here — they lazy-load independently.

let totalSlots = 0;
const slotProgress: number[] = [];
let dispatched = false;

const loaderText = document.getElementById('hero-loader-text');

// Vanilla tween state (replaces GSAP)
let displayValue = 0;
let targetValue = 0;
let tweenActive = false;

function tweenProgress() {
    const diff = targetValue - displayValue;
    if (Math.abs(diff) < 0.5) {
        displayValue = targetValue;
        if (loaderText) loaderText.textContent = `${Math.round(displayValue)}%`;
        tweenActive = false;
        return;
    }
    // Ease-out: close ~70% of remaining gap each frame (~equivalent to power1.out over 0.3s)
    displayValue += diff * 0.15;
    if (loaderText) loaderText.textContent = `${Math.round(displayValue)}%`;
    tweenActive = true;
    requestAnimationFrame(tweenProgress);
}

/** Register N critical loading slots. Returns the starting slot index. */
export function registerCriticalSlots(count: number): number {
    const start = totalSlots;
    for (let i = 0; i < count; i++) {
        slotProgress.push(0);
    }
    totalSlots += count;
    return start;
}

/** Report 0-1 progress for a given critical slot. */
export function reportCriticalProgress(slotIndex: number, fraction: number) {
    slotProgress[slotIndex] = fraction;

    const sum = slotProgress.reduce((a, b) => a + b, 0);
    targetValue = (sum / totalSlots) * 100;

    if (!tweenActive) {
        tweenActive = true;
        requestAnimationFrame(tweenProgress);
    }

    // Check if all critical slots are complete (fire only once)
    if (!dispatched && slotProgress.every((p) => p >= 1)) {
        dispatched = true;
        // Small delay to let the counter finish at 100%
        setTimeout(() => {
            window.dispatchEvent(new Event('models:hero-ready'));
        }, 350);
    }
}
