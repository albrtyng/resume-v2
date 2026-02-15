import {
    BoxGeometry,
    EdgesGeometry,
    LineSegments,
    LineBasicMaterial,
    Scene,
} from 'three';

/**
 * Creates a wireframe box placeholder and adds it to the scene.
 * Returns a `remove()` function that fades out and disposes.
 */
export function createPlaceholder(
    scene: Scene,
    options?: { animate?: boolean },
) {
    const geo = new BoxGeometry(1, 1, 1);
    const edges = new EdgesGeometry(geo);
    const mat = new LineBasicMaterial({ color: 0x8888aa, transparent: true, opacity: 0.35 });
    const wireframe = new LineSegments(edges, mat);

    scene.add(wireframe);

    const shouldAnimate = options?.animate ?? false;
    let animId: number | null = null;

    if (shouldAnimate) {
        function tick() {
            wireframe.rotation.y += 0.008;
            wireframe.rotation.x += 0.003;
            animId = requestAnimationFrame(tick);
        }
        animId = requestAnimationFrame(tick);
    }

    return {
        mesh: wireframe,
        remove(onDone?: () => void) {
            if (animId !== null) cancelAnimationFrame(animId);

            // Fade out over 300ms
            const start = performance.now();
            const duration = 300;
            const startOpacity = mat.opacity;

            function fade() {
                const t = Math.min((performance.now() - start) / duration, 1);
                mat.opacity = startOpacity * (1 - t);

                if (t < 1) {
                    requestAnimationFrame(fade);
                } else {
                    scene.remove(wireframe);
                    geo.dispose();
                    edges.dispose();
                    mat.dispose();
                    onDone?.();
                }
            }
            requestAnimationFrame(fade);
        },
    };
}
