import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { registerSlots, reportProgress } from './loading-coordinator';

gsap.registerPlugin(ScrollTrigger);

// Detect mobile (<640px) for layout/perf adjustments
let isMobile = window.innerWidth < 640;
let modelScale = isMobile ? 0.85 : 1.2;
const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
).matches;

const shipSlotStart = registerSlots(2);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
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
        const wasMobile = isMobile;
        isMobile = window.innerWidth < 640;
        modelScale = isMobile ? 0.85 : 1.2;

        const rect = heroEl!.getBoundingClientRect();
        renderer.setSize(rect.width, rect.height);
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();

        if (loadedModel) {
            if (wasMobile !== isMobile) {
                comboGroup.scale.setScalar(modelScale);
                waterGroup.scale.setScalar(modelScale);
            }
            alignModelToGridLine(loadedModel);
        }
    }
    updateSize();

    // Align model's right bounding-box edge with the 1st grid line (12.5% from left).
    // Converts that screen-space position to world-space at the model's depth.
    function alignModelToGridLine(model: THREE.Group) {
        // First grid line from the right is at 87.5% from the left = NDC x of +0.75
        // (NDC goes from -1 on left to +1 on right: -1 + 2*0.875 = 0.75)
        const ndcX = isMobile ? 1.05 : 0.75;
        const targetWorld = new THREE.Vector3(ndcX, 0, 0).unproject(camera);
        // Unproject gives a point on the near plane ray; we need the X at z=0
        const dir = targetWorld.sub(camera.position).normalize();
        const t = -camera.position.z / dir.z;
        const worldX = camera.position.x + dir.x * t;

        // Temporarily set full scale to get accurate bounding box
        const savedScale = model.scale.clone();
        model.scale.setScalar(modelScale);

        const box = new THREE.Box3().setFromObject(model);
        const rightEdgeOffset = box.max.x - model.position.x;
        model.position.x = worldX - rightEdgeOffset;

        // Keep waterGroup aligned with the ship
        waterGroup.position.x = model.position.x;

        // Restore scale
        model.scale.copy(savedScale);
    }

    // ── Model containers (separated to avoid GSAP property conflicts) ──
    const scrollContainer = new THREE.Group(); // scroll parallax only
    const rockContainer = new THREE.Group(); // idle rocking (ship only)
    const waterGroup = new THREE.Group(); // water (no rocking)
    waterGroup.scale.setScalar(modelScale);
    waterGroup.rotation.y = Math.PI / 8;
    scrollContainer.add(rockContainer);
    scrollContainer.add(waterGroup);
    scrollContainer.add(keyLight);
    scrollContainer.add(fillLight);
    scene.add(scrollContainer);

    // ── Load model ──
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    let modelLoaded = false;

    // Water animation state
    let waterMesh: THREE.Mesh | null = null;
    let waterOrigPositions: Float32Array | null = null;
    const clock = new THREE.Clock();

    // Container for both models so they share scale/rotation/position
    const comboGroup = new THREE.Group();
    comboGroup.scale.setScalar(modelScale);
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

    // ── Loading (delegated to shared coordinator) ──
    function loadWithProgress(
        gltfLoader: GLTFLoader,
        url: string,
        slotIndex: number,
    ): Promise<import('three/addons/loaders/GLTFLoader.js').GLTF> {
        return new Promise((resolve, reject) => {
            gltfLoader.load(
                url,
                resolve,
                (xhr) => {
                    if (xhr.total) {
                        reportProgress(slotIndex, xhr.loaded / xhr.total);
                    }
                },
                reject,
            );
        });
    }

    // ── Parallel loading: ship + water ──
    Promise.all([
        loadWithProgress(loader, '/models/ship.glb', shipSlotStart),
        loadWithProgress(loader, '/models/ship-water.glb', shipSlotStart + 1),
    ]).then(([shipGltf, waterGltf]) => {
        // Add ship to combo group
        comboGroup.add(shipGltf.scene);

        // Process water meshes
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
            waterMesh = mesh;
            mesh.scale.setScalar(1.005);
            mesh.rotation.y = Math.PI / 6;
            mesh.position.y -= 0.5;
            const pos = mesh.geometry.attributes.position;
            waterOrigPositions = new Float32Array(pos.array);
            waterGroup.add(mesh);
        }

        // Align and mark ready
        loadedModel = comboGroup;
        alignModelToGridLine(comboGroup);
        modelLoaded = true;

        startAnimations();
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
