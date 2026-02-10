import { registerSlots, reportProgress } from './loading-coordinator';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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
    const camera = new THREE.PerspectiveCamera(isMobile ? 100 : 20, 1, 0.1, 100);
    camera.position.set(-0.70, 1.60, isMobile ? 6.60 : 4.00);
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
    let modelScale = isMobile ? 0.40 : 0.09;
    modelGroup.scale.setScalar(modelScale);
    if (isMobile) {
        modelGroup.rotation.set(-0.18, 0.77, 0.21);
    } else {
        modelGroup.rotation.set(0, 0.41, 0);
    }
    scene.add(modelGroup);

    // ── Sizing ──
    let loadedModel: THREE.Group | null = null;

    function applyBreakpoint() {
        modelScale = isMobile ? 0.40 : 0.09;
        camera.fov = isMobile ? 100 : 20;
        camera.position.set(-0.70, 1.60, isMobile ? 6.60 : 4.00);
        camera.lookAt(0, 0, 0);

        modelGroup.scale.setScalar(modelScale);
        if (isMobile) {
            modelGroup.rotation.set(-0.18, 0.77, 0.21);
            modelGroup.position.set(-6.10, -0.40, 0.00);
        } else {
            modelGroup.rotation.set(0, 0.41, 0);
            modelGroup.position.set(-1.40, -0.30, 0.00);
        }
    }

    function updateSize() {
        const wasMobile = isMobile;
        isMobile = window.innerWidth < 640;

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

        if (loadedModel && wasMobile !== isMobile) {
            applyBreakpoint();
        }
    }
    updateSize();

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
            applyBreakpoint();
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

    // ── Debug GUI (dev only) ──
    function setupDebugGUI() {
        if (!import.meta.env.DEV) return;
        import('lil-gui').then(({ default: GUI }) => {
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
            modelFolder.add(modelGroup.rotation, 'x', -Math.PI, Math.PI, 0.01).name('Rotation X');
            modelFolder.add(modelGroup.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Rotation Y');
            modelFolder.add(modelGroup.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Rotation Z');

            gui.add({ log: () => {
                console.log(`camera.position.set(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)});`);
                console.log(`camera.fov = ${camera.fov};`);
                console.log(`modelScale = ${modelScale};`);
                console.log(`modelGroup.position.set(${modelGroup.position.x.toFixed(2)}, ${modelGroup.position.y.toFixed(2)}, ${modelGroup.position.z.toFixed(2)});`);
                console.log(`modelGroup.rotation.set(${modelGroup.rotation.x.toFixed(4)}, ${modelGroup.rotation.y.toFixed(4)}, ${modelGroup.rotation.z.toFixed(4)});`);
            }}, 'log').name('Log Values to Console');
        });
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
