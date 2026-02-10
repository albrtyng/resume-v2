import { registerSlots, reportProgress } from './loading-coordinator';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GUI from 'lil-gui';
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

gsap.registerPlugin(ScrollTrigger);

let isMobile = window.innerWidth < 640;
const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
).matches;

const techSlotStart = registerSlots(1);

initTechStackScene();

function initTechStackScene() {
    const canvas = document.getElementById(
        'tech-stack-canvas',
    ) as HTMLCanvasElement | null;
    const wrapperEl = document.getElementById('tech-stack');
    const textEl = document.getElementById('tech-stack-text');
    if (!canvas || !wrapperEl || !textEl) return;

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
    renderer.setScissorTest(true);

    // ── Scene ──
    const scene = new THREE.Scene();

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 100);
    camera.position.set(-0.70, 1.60, 4.00);
    camera.lookAt(0, 0, 0);

    // ── Lighting (matches hero) ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9cf6fb, 0.4);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // ── Model container ──
    const modelGroup = new THREE.Group();
    let modelScale = isMobile ? 0.15 : 0.09;
    modelGroup.scale.setScalar(modelScale);
    modelGroup.rotation.y = 0.4084;
    scene.add(modelGroup);

    // ── Sizing ──
    let loadedModel: THREE.Group | null = null;

    function updateSize() {
        const wasMobile = isMobile;
        isMobile = window.innerWidth < 640;
        modelScale = isMobile ? 0.15 : 0.09;

        const wrapperRect = wrapperEl.getBoundingClientRect();
        renderer.setSize(wrapperRect.width, wrapperRect.height, false);

        camera.aspect = wrapperRect.width / wrapperRect.height;
        camera.updateProjectionMatrix();

        // Viewport & scissor cover the full section
        const dpr = renderer.getPixelRatio();
        renderer.setViewport(
            0,
            0,
            wrapperRect.width * dpr,
            wrapperRect.height * dpr,
        );
        renderer.setScissor(
            0,
            0,
            wrapperRect.width * dpr,
            wrapperRect.height * dpr,
        );

        if (loadedModel) {
            if (wasMobile !== isMobile) {
                modelGroup.scale.setScalar(modelScale);
            }
            alignModel(loadedModel);
        }
    }
    updateSize();

    function alignModel(model: THREE.Group) {
        model.scale.setScalar(modelScale);
        // Reset position before computing alignment
        model.position.set(0, 0, 0);

        // Compute bounding box to center the model vertically
        const box = new THREE.Box3().setFromObject(model);
        const boxCenter = box.getCenter(new THREE.Vector3());

        // Vertically center at camera's lookAt Y (0)
        model.position.y = -boxCenter.y;

        // Horizontal alignment: left-aligned on desktop, centered on mobile
        const ndcX = isMobile ? -0.2 : -0.9;
        const targetWorld = new THREE.Vector3(ndcX, 0, 0).unproject(camera);
        const dir = targetWorld.sub(camera.position).normalize();
        const t = -camera.position.z / dir.z;
        const worldX = camera.position.x + dir.x * t;

        // Recompute box after vertical adjustment
        const box2 = new THREE.Box3().setFromObject(model);
        if (isMobile) {
            const center = (box2.min.x + box2.max.x) / 2;
            model.position.x = worldX - center;
        } else {
            const leftEdgeOffset = box2.min.x;
            model.position.x = worldX - leftEdgeOffset;
        }
    }

    // ── Load model ──
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    let modelLoaded = false;

    loader.load(
        '/models/tech-stack.glb',
        (gltf) => {
            modelGroup.add(gltf.scene);
            loadedModel = modelGroup;
            modelGroup.position.set(-1.40, -0.30, 0.00);
            modelLoaded = true;

            reportProgress(techSlotStart, 1);
            setupDebugGUI();
            startAnimations();
        },
        (xhr) => {
            if (xhr.total) {
                reportProgress(techSlotStart, xhr.loaded / xhr.total);
            }
        },
    );

    // ── Debug GUI ──
    function setupDebugGUI() {
        const gui = new GUI({ title: 'Tech Stack Scene' });

        const camFolder = gui.addFolder('Camera');
        camFolder.add(camera.position, 'x', -20, 20, 0.1).name('X').onChange(() => camera.lookAt(0, 0, 0));
        camFolder.add(camera.position, 'y', -20, 20, 0.1).name('Y').onChange(() => camera.lookAt(0, 0, 0));
        camFolder.add(camera.position, 'z', 1, 30, 0.1).name('Z').onChange(() => camera.lookAt(0, 0, 0));
        camFolder.add(camera, 'fov', 10, 120, 1).name('FOV').onChange(() => camera.updateProjectionMatrix());

        const modelFolder = gui.addFolder('Model');
        const scaleCtrl = { scale: modelScale };
        modelFolder.add(scaleCtrl, 'scale', 0.05, 1, 0.01).name('Scale').onChange((v: number) => {
            modelScale = v;
            modelGroup.scale.setScalar(v);
        });
        modelFolder.add(modelGroup.position, 'x', -10, 10, 0.1).name('Pos X');
        modelFolder.add(modelGroup.position, 'y', -10, 10, 0.1).name('Pos Y');
        modelFolder.add(modelGroup.position, 'z', -10, 10, 0.1).name('Pos Z');
        modelFolder.add(modelGroup.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Rotation Y');

        // Log values button
        gui.add({ log: () => {
            console.log(`camera.position.set(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)});`);
            console.log(`camera.fov = ${camera.fov};`);
            console.log(`modelScale = ${modelScale};`);
            console.log(`modelGroup.position.set(${modelGroup.position.x.toFixed(2)}, ${modelGroup.position.y.toFixed(2)}, ${modelGroup.position.z.toFixed(2)});`);
            console.log(`modelGroup.rotation.y = ${modelGroup.rotation.y.toFixed(4)};`);
        }}, 'log').name('Log Values to Console');
    }

    // ── Animations ──
    function startAnimations() {
        if (prefersReducedMotion) return;
        // Parallax removed — will be re-added after positioning is verified
    }

    // ── Render loop ──
    let isVisible = false;

    function render() {
        if (isVisible && modelLoaded) {
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
    observer.observe(wrapperEl);

    // ── Resize handler ──
    const onResize = () => updateSize();
    window.addEventListener('resize', onResize);

    // ── Cleanup on Astro page navigation ──
    document.addEventListener('astro:before-swap', () => {
        observer.disconnect();
        window.removeEventListener('resize', onResize);

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
