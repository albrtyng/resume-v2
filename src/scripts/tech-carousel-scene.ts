import { gltfLoader } from './shared-loader';
import gsap from 'gsap';
import * as THREE from 'three';

type Breakpoint =
    | 'mobile'
    | 'tablet'
    | 'desktop'
    | 'desktop-xl'
    | 'desktop-2xl';

function getBreakpoint(width: number): Breakpoint {
    if (width < 640) return 'mobile';
    if (width < 1024) return 'tablet';
    if (width < 1440) return 'desktop';
    if (width < 1920) return 'desktop-xl';
    return 'desktop-2xl';
}

interface BreakpointConfig {
    topScale: number;
    bottomScale: number;
    topSpacing: number;
    bottomSpacing: number;
    topY: number;
    bottomY: number;
    frustumHeight: number;
    speed: number;
    topRepeats: number;
    bottomRepeats: number;
}

const BREAKPOINT_CONFIGS: Record<Breakpoint, BreakpointConfig> = {
    mobile: {
        topScale: 2.7,
        bottomScale: 2.2,
        topSpacing: 2.5,
        bottomSpacing: 3.5,
        topY: 0.9,
        bottomY: -1.2,
        frustumHeight: 10.0,
        speed: 1.5,
        topRepeats: 4,
        bottomRepeats: 2,
    },
    tablet: {
        topScale: 4.4,
        bottomScale: 3.2,
        topSpacing: 4.5,
        bottomSpacing: 5.5,
        topY: 2.6,
        bottomY: -1.3,
        frustumHeight: 12.0,
        speed: 1.3,
        topRepeats: 5,
        bottomRepeats: 2,
    },
    desktop: {
        topScale: 5.2,
        bottomScale: 3.0,
        topSpacing: 5.0,
        bottomSpacing: 4.5,
        topY: 2.7,
        bottomY: -1.4,
        frustumHeight: 14.0,
        speed: 1.3,
        topRepeats: 6,
        bottomRepeats: 3,
    },
    'desktop-xl': {
        topScale: 5.0,
        bottomScale: 3.2,
        topSpacing: 4.0,
        bottomSpacing: 2.5,
        topY: 3.0,
        bottomY: -1.4,
        frustumHeight: 15.0,
        speed: 1.6,
        topRepeats: 6,
        bottomRepeats: 3,
    },
    'desktop-2xl': {
        topScale: 6.8,
        bottomScale: 4.0,
        topSpacing: 6.0,
        bottomSpacing: 5.0,
        topY: 3.0,
        bottomY: -1.4,
        frustumHeight: 16.0,
        speed: 1.5,
        topRepeats: 6,
        bottomRepeats: 3,
    },
};

// Unique models (used for loading)
const TOP_ROW_UNIQUE = ['react', 'typescript', 'python'];
const BOTTOM_ROW_UNIQUE = ['docker', 'gitlab', 'openai', 'snowflake', 'sql', 'tailwind'];


const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
).matches;

initTechCarouselScene();

function initTechCarouselScene() {
    const canvas = document.getElementById(
        'tech-carousel-canvas',
    ) as HTMLCanvasElement | null;
    const wrapperEl = document.getElementById('tech-carousel');
    if (!canvas || !wrapperEl) return;

    // ── Renderer ──
    const isHighPerf = window.innerWidth >= 1024;
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: isHighPerf,
    });
    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, isHighPerf ? 2 : 1.5),
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // ── Scene ──
    const scene = new THREE.Scene();

    // ── Orthographic Camera ──
    let currentConfig = BREAKPOINT_CONFIGS[getBreakpoint(window.innerWidth)];
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const halfH = currentConfig.frustumHeight / 2;
    const camera = new THREE.OrthographicCamera(
        -halfH * aspect,
        halfH * aspect,
        halfH,
        -halfH,
        0.1,
        100,
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9cf6fb, 0.4);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // ── Row containers ──
    const topRowGroup = new THREE.Group();
    const bottomRowGroup = new THREE.Group();
    scene.add(topRowGroup);
    scene.add(bottomRowGroup);

    // Track normalized scales per model
    const normalizedScales: Map<string, number> = new Map();

    // Three sets per row for seamless full-width coverage
    const topSets: THREE.Group[] = [];
    const bottomSets: THREE.Group[] = [];

    let topStripWidth = 0;
    let bottomStripWidth = 0;
    let topModelCount = 0;

    // Store loaded model scenes for rebuilding on resize
    const loadedModels: Map<string, THREE.Group> = new Map();
    let allModelsLoaded = false;

    // ── Build / rebuild rows from loaded models ──
    function buildRows() {
        topRowGroup.clear();
        bottomRowGroup.clear();
        topSets.length = 0;
        bottomSets.length = 0;

        const config = currentConfig;

        // Build repeated model sequences based on breakpoint config
        const topModels = Array(config.topRepeats).fill(TOP_ROW_UNIQUE).flat();
        const bottomModels = Array(config.bottomRepeats).fill(BOTTOM_ROW_UNIQUE).flat();

        // Top row — 3 identical sets placed side by side
        // Sets at [-2W, -W, 0] so leftward coverage is maintained as group scrolls right
        topStripWidth = topModels.length * config.topSpacing;
        topModelCount = topModels.length;
        for (let s = 0; s < 3; s++) {
            const set =
                s === 0
                    ? buildSet(topModels, config.topScale, config.topSpacing)
                    : topSets[0].clone();
            set.position.x = -2 * topStripWidth + s * topStripWidth;
            topRowGroup.add(set);
            topSets.push(set);
        }
        topRowGroup.position.y = config.topY;
        topRowGroup.position.x = 0;

        // Bottom row — 3 identical sets placed side by side
        bottomStripWidth = bottomModels.length * config.bottomSpacing;
        for (let s = 0; s < 3; s++) {
            const set =
                s === 0
                    ? buildSet(
                          bottomModels,
                          config.bottomScale,
                          config.bottomSpacing,
                      )
                    : bottomSets[0].clone();
            set.position.x = -bottomStripWidth + s * bottomStripWidth;
            bottomRowGroup.add(set);
            bottomSets.push(set);
        }
        bottomRowGroup.position.y = config.bottomY;
        bottomRowGroup.position.x = 0;
    }

    function buildSet(
        modelNames: string[],
        scaleFactor: number,
        spacing: number,
    ): THREE.Group {
        const set = new THREE.Group();
        modelNames.forEach((name, i) => {
            const original = loadedModels.get(name);
            if (!original) return;

            const container = new THREE.Group();
            const clone = original.clone();
            container.add(clone);

            const normScale = normalizedScales.get(name) ?? 1.0;
            container.scale.setScalar(normScale * scaleFactor);
            container.position.x = i * spacing;

            set.add(container);
        });
        return set;
    }

    // ── Sizing ──
    function applyConfig() {
        const bp = getBreakpoint(window.innerWidth);
        currentConfig = BREAKPOINT_CONFIGS[bp];
        const config = currentConfig;

        const canvasRect = canvas.getBoundingClientRect();
        renderer.setSize(canvasRect.width, canvasRect.height);

        const newAspect = canvasRect.width / canvasRect.height;
        const newHalfH = config.frustumHeight / 2;
        camera.left = -newHalfH * newAspect;
        camera.right = newHalfH * newAspect;
        camera.top = newHalfH;
        camera.bottom = -newHalfH;
        camera.updateProjectionMatrix();

        if (allModelsLoaded) {
            buildRows();
        }
    }
    applyConfig();

    // ── Deferred model loading via IntersectionObserver ──
    canvas.style.opacity = '0';

    let loadObserver: IntersectionObserver;

    function setupLoadObserver() {
        loadObserver = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                loadObserver.disconnect();

                const allModelNames = [...TOP_ROW_UNIQUE, ...BOTTOM_ROW_UNIQUE];

                const loadPromises = allModelNames.map((name) => {
                    return new Promise<{ name: string; scene: THREE.Group }>((resolve) => {
                        gltfLoader.load(
                            `/models/${name}.glb`,
                            (gltf) => {
                                const box = new THREE.Box3().setFromObject(gltf.scene);
                                const center = box.getCenter(new THREE.Vector3());
                                const size = box.getSize(new THREE.Vector3());
                                gltf.scene.position.sub(center);

                                const maxDim = Math.max(size.x, size.y, size.z);
                                const normScale = maxDim > 0 ? 1.0 / maxDim : 1.0;
                                normalizedScales.set(name, normScale);

                                resolve({ name, scene: gltf.scene });
                            },
                            undefined,
                            (error) => {
                                console.error(`Failed to load ${name} model:`, error);
                                resolve({ name, scene: new THREE.Group() });
                            },
                        );
                    });
                });

                Promise.all(loadPromises).then((results) => {
                    for (const { name, scene: modelScene } of results) {
                        loadedModels.set(name, modelScene);
                    }
                    allModelsLoaded = true;
                    buildRows();
                    renderer.render(scene, camera);
                    gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 0.6 });
                });
            },
            { rootMargin: '0px 0px 200px 0px' },
        );
        loadObserver.observe(wrapperEl);
    }

    // Wait for hero to finish loading before competing for bandwidth
    window.addEventListener('models:hero-ready', setupLoadObserver, { once: true });

    // ── Animation ──
    let isVisible = false;
    let animationId: number;
    const clock = new THREE.Clock();

    function animate() {
        animationId = requestAnimationFrame(animate);

        if (!isVisible || !allModelsLoaded) return;

        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();
        const config = currentConfig;

        if (!prefersReducedMotion) {
            // Scroll top row left-to-right (positive X direction)
            topRowGroup.position.x += config.speed * delta;
            // Modulo wrap: when we've moved one full strip width, snap back
            if (topRowGroup.position.x >= topStripWidth) {
                topRowGroup.position.x %= topStripWidth;
            }

            // Scroll bottom row right-to-left (negative X direction)
            bottomRowGroup.position.x -= config.speed * delta;
            if (bottomRowGroup.position.x <= -bottomStripWidth) {
                bottomRowGroup.position.x =
                    -(-bottomRowGroup.position.x % bottomStripWidth);
            }

            // Gyroscopic rotation on each model
            for (const set of topSets) rotateModels(set, elapsed, 0);
            for (const set of bottomSets)
                rotateModels(set, elapsed, topModelCount);
        }

        renderer.render(scene, camera);
    }

    function rotateModels(
        set: THREE.Group | null,
        time: number,
        indexOffset: number,
    ) {
        if (!set) return;
        set.children.forEach((container, i) => {
            const offset = (i + indexOffset) * 1.2;
            container.rotation.x = Math.sin(time * 0.7 + offset) * 0.4;
            container.rotation.y = time * 0.8 + offset;
            container.rotation.z = Math.cos(time * 0.5 + offset) * 0.3;
        });
    }

    animate();

    // ── IntersectionObserver ──
    const observer = new IntersectionObserver(
        ([entry]) => {
            isVisible = entry.isIntersecting;
        },
        { threshold: 0 },
    );
    observer.observe(wrapperEl);

    // ── Resize handler ──
    const onResize = () => applyConfig();
    window.addEventListener('resize', onResize);

    // ── Cleanup ──
    document.addEventListener('astro:before-swap', () => {
        loadObserver.disconnect();
        observer.disconnect();
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(animationId);

        scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry?.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach((m) => m.dispose());
                } else {
                    child.material?.dispose();
                }
            }
        });
        renderer.dispose();
    });
}
