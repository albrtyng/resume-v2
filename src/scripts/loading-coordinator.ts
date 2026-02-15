import gsap from 'gsap';

// Loading progress coordinator for critical (hero) assets only.
// Below-fold scenes no longer register here — they lazy-load independently.

let totalSlots = 0;
const slotProgress: number[] = [];
let dispatched = false;

const loaderText = document.getElementById('hero-loader-text');
const progress = { value: 0 };

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
    const overall = (sum / totalSlots) * 100;

    gsap.to(progress, {
        value: overall,
        duration: 0.3,
        ease: 'power1.out',
        onUpdate: () => {
            if (loaderText) loaderText.textContent = `${Math.round(progress.value)}%`;
        },
    });

    // Check if all critical slots are complete (fire only once)
    if (!dispatched && slotProgress.every((p) => p >= 1)) {
        dispatched = true;
        // Small delay to let the counter tween finish at 100%
        gsap.delayedCall(0.35, () => {
            window.dispatchEvent(new Event('models:hero-ready'));
        });
    }
}
