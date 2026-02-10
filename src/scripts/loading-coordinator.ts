import gsap from 'gsap';

// Shared loading progress coordinator.
// Both scene scripts import this module — Vite deduplicates the import so
// they share the same singleton state.

let totalSlots = 0;
const slotProgress: number[] = [];
let dispatched = false;

const loaderText = document.getElementById('hero-loader-text');
const progress = { value: 0 };

/** Register N loading slots. Returns the starting slot index. */
export function registerSlots(count: number): number {
    const start = totalSlots;
    for (let i = 0; i < count; i++) {
        slotProgress.push(0);
    }
    totalSlots += count;
    return start;
}

/** Report 0-1 progress for a given slot. */
export function reportProgress(slotIndex: number, fraction: number) {
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

    // Check if all slots are complete (fire only once)
    if (!dispatched && slotProgress.every((p) => p >= 1)) {
        dispatched = true;
        // Small delay to let the counter tween finish at 100%
        gsap.delayedCall(0.35, () => {
            window.dispatchEvent(new Event('models:all-ready'));
        });
    }
}
