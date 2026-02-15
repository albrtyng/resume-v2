import { registerCriticalSlots, reportCriticalProgress } from './loading-coordinator';
import { gltfLoader } from './shared-loader';
import { computeFrustumScale } from './frustum-scale';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

// Detect mobile (<640px) for perf adjustments (antialias, pixelRatio)
let isMobile = window.innerWidth < 640;

// Viewport-responsive tuning: interpolate between mobile and desktop targets
const NARROW_W = 375; // mobile baseline
const WIDE_W = 1536; // 2xl breakpoint

const NARROW_COVERAGE = 0.35; // smaller on mobile
const WIDE_COVERAGE = 0.52; // full size at 2xl

const GRID_LINE_NDC_X = 0.75; // right-edge target on desktop (87.5% from left)

let viewportT = 0; // 0 = mobile, 1 = desktop 2xl
let shipCoverage = WIDE_COVERAGE;

let rawModelHeight = 1; // measured after model loads
let modelScale = 1; // recomputed on every resize
const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
).matches;

// Only 1 critical slot — the ship hull. Water loads in background.
const shipSlotStart = registerCriticalSlots(1);

initShipScene();

function initShipScene() {
    const canvas = document.getElementById(
        'hero-ship-canvas',
    ) as HTMLCanvasElement | null;
    const heroEl = document.getElementById('hero');
    if (!canvas || !heroEl) return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !isMobile,
    });
    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2),
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // ── Scene ──
    const scene = new THREE.Scene();

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.25, 8);
    camera.lookAt(0, -0.75, 0);

    // ── Lighting ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 8, 5);

    const fillLight = new THREE.DirectionalLight(0x9cf6fb, 0.4);
    fillLight.position.set(-3, 2, -2);

    // ── Sizing ──
    let loadedModel: THREE.Group | null = null;

    function updateSize() {
        isMobile = window.innerWidth < 640;

        // Interpolate coverage based on viewport width (0 = mobile, 1 = 2xl)
        viewportT = Math.min(Math.max((window.innerWidth - NARROW_W) / (WIDE_W - NARROW_W), 0), 1);
        shipCoverage = NARROW_COVERAGE + (WIDE_COVERAGE - NARROW_COVERAGE) * viewportT;

        const rect = heroEl!.getBoundingClientRect();
        renderer.setSize(rect.width, rect.height);
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();

        if (loadedModel) {
            modelScale = computeFrustumScale(camera, rawModelHeight, shipCoverage);
            comboGroup.scale.setScalar(modelScale);
            waterGroup.scale.setScalar(modelScale);
            alignModelToGridLine(loadedModel);
        }
    }
    updateSize();

    // Convert an NDC x value to world-space x at z=0.
    function ndcToWorldX(ndcX: number): number {
        const target = new THREE.Vector3(ndcX, 0, 0).unproject(camera);
        const dir = target.sub(camera.position).normalize();
        const dist = -camera.position.z / dir.z;
        return camera.position.x + dir.x * dist;
    }

    // Position the model between centered (mobile) and right-aligned (desktop).
    function alignModelToGridLine(model: THREE.Group) {
        const box = new THREE.Box3().setFromObject(model);
        const centerOffset = (box.max.x + box.min.x) / 2 - model.position.x;
        const rightEdgeOffset = box.max.x - model.position.x;

        // Centered: model center at viewport center
        const centeredX = ndcToWorldX(0) - centerOffset;
        // Right-aligned: model right edge at grid line
        const rightAlignedX = ndcToWorldX(GRID_LINE_NDC_X) - rightEdgeOffset;

        // Blend from centered (t=0) to right-aligned (t=1)
        model.position.x = centeredX + (rightAlignedX - centeredX) * viewportT;

        waterGroup.position.x = model.position.x;
    }

    // ── Model containers (separated to avoid GSAP property conflicts) ──
    const scrollContainer = new THREE.Group(); // scroll parallax only
    const rockContainer = new THREE.Group(); // idle rocking (ship only)
    const waterGroup = new THREE.Group(); // water (no rocking)
    waterGroup.rotation.y = Math.PI / 8;
    scrollContainer.add(rockContainer);
    scrollContainer.add(waterGroup);
    scrollContainer.add(keyLight);
    scrollContainer.add(fillLight);
    scene.add(scrollContainer);

    // ── Load model ──
    let modelLoaded = false;

    // Water animation state
    let waterMesh: THREE.Mesh | null = null;
    let waterOrigPositions: Float32Array | null = null;
    const clock = new THREE.Clock();

    // Container for both models so they share scale/rotation/position
    const comboGroup = new THREE.Group();
    comboGroup.rotation.y = Math.PI / 8;
    rockContainer.add(comboGroup);

    function startAnimations() {
        if (prefersReducedMotion) return;

        // ── Idle animation — ocean rocking (ship only) ──
        gsap.to(rockContainer.position, {
            y: 0.25,
            duration: 2,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
        });

        gsap.to(rockContainer.rotation, {
            x: 0.06,
            z: 0.05,
            duration: 2,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
        });

        // ── Scroll parallax — match hero text layers ──
        gsap.to(scrollContainer.position, {
            y: -1.5,
            ease: 'none',
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true,
            },
        });
    }

    // ── Loading helper ──
    function loadWithProgress(
        url: string,
        slotIndex: number,
    ): Promise<import('three/addons/loaders/GLTFLoader.js').GLTF> {
        return new Promise((resolve, reject) => {
            gltfLoader.load(
                url,
                resolve,
                (xhr) => {
                    if (xhr.total) {
                        reportCriticalProgress(
                            slotIndex,
                            Math.min(xhr.loaded / xhr.total, 0.95),
                        );
                    }
                },
                reject,
            );
        });
    }

    // Check if we should skip water (slow connections)
    function shouldSkipWater(): boolean {
        const conn = (navigator as any).connection;
        if (!conn) return false;
        if (conn.saveData) return true;
        const ect = conn.effectiveType;
        return ect === '2g' || ect === 'slow-2g';
    }

    // ── Phase 1: Load ship (critical) ──
    loadWithProgress('/models/ship.glb', shipSlotStart).then((shipGltf) => {
        comboGroup.add(shipGltf.scene);

        // Measure unscaled bounding box
        comboGroup.scale.setScalar(1);
        const rawBox = new THREE.Box3().setFromObject(comboGroup);
        rawModelHeight = rawBox.max.y - rawBox.min.y;

        // Compute and apply frustum-relative scale
        modelScale = computeFrustumScale(camera, rawModelHeight, shipCoverage);
        comboGroup.scale.setScalar(modelScale);
        waterGroup.scale.setScalar(modelScale);

        // Align and mark ready
        loadedModel = comboGroup;
        alignModelToGridLine(comboGroup);
        modelLoaded = true;

        // Report critical completion — page can now reveal
        reportCriticalProgress(shipSlotStart, 1);

        startAnimations();

        // ── Phase 2: Load water ──
        if (!shouldSkipWater()) {
            gltfLoader.load('/models/ship-water.glb', (waterGltf) => {
                const waterMeshes: THREE.Mesh[] = [];
                waterGltf.scene.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        const mat = child.material as THREE.MeshStandardMaterial;
                        if (mat.name === 'Water') {
                            waterMeshes.push(child);
                        }
                    }
                });

                for (const mesh of waterMeshes) {
                    const mat = mesh.material as THREE.MeshStandardMaterial;
                    mat.color.set(0x3b82f6);
                    mat.transparent = true;
                    mat.opacity = 0;
                    waterMesh = mesh;
                    mesh.scale.setScalar(1.005);
                    mesh.rotation.y = Math.PI / 6;
                    mesh.position.y -= 0.5;
                    const pos = mesh.geometry.attributes.position;
                    waterOrigPositions = new Float32Array(pos.array);
                    waterGroup.add(mesh);

                    // Fade water in
                    gsap.to(mat, {
                        opacity: 1,
                        duration: 1.2,
                        ease: 'power2.out',
                    });
                }
            });
        }
    });

    // ── Render loop ──
    let isVisible = true;

    function render() {
        if (isVisible && modelLoaded) {
            // Animate water vertices
            if (waterMesh && waterOrigPositions && !prefersReducedMotion) {
                const time = clock.getElapsedTime();
                const pos = waterMesh.geometry.attributes.position;
                const arr = pos.array as Float32Array;

                for (let i = 0; i < pos.count; i++) {
                    const ox = waterOrigPositions[i * 3];
                    const oz = waterOrigPositions[i * 3 + 2];

                    // Layer sine waves at different frequencies for natural motion
                    arr[i * 3 + 1] =
                        waterOrigPositions[i * 3 + 1] +
                        Math.sin(ox * 2 + time * 2.0) * 0.12 +
                        Math.sin(oz * 1.5 + time * 1.5) * 0.08 +
                        Math.sin((ox + oz) * 3 + time * 2.5) * 0.05;
                }

                pos.needsUpdate = true;
            }

            renderer.render(scene, camera);
        }
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // ── IntersectionObserver — pause when off-screen ──
    const observer = new IntersectionObserver(
        ([entry]) => {
            isVisible = entry.isIntersecting;
        },
        { threshold: 0 },
    );
    observer.observe(heroEl);

    // ── Resize handler ──
    const onResize = () => updateSize();
    window.addEventListener('resize', onResize);

    // ── Cleanup on Astro page navigation ──
    document.addEventListener('astro:before-swap', () => {
        observer.disconnect();
        window.removeEventListener('resize', onResize);

        // Dispose three.js resources
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
