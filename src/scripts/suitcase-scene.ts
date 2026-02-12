import { registerSlots, reportProgress } from './loading-coordinator';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GUI from 'lil-gui';
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

gsap.registerPlugin(ScrollTrigger);

const suitcaseSlotStart = registerSlots(1);

initSuitcaseScene();

function initSuitcaseScene() {
    const canvas = document.getElementById(
        'suitcase-canvas',
    ) as HTMLCanvasElement | null;
    const wrapperEl = document.getElementById('suitcase-scene');
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

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 100);
    camera.position.set(-0.7, 1.6, 4.0);
    camera.lookAt(0, 0, 0);

    // ── Lighting (matches hero & tech stack) ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9cf6fb, 0.4);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // ── Model container ──
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // ── Sizing ──
    let loadedModel: THREE.Group | null = null;

    function applyBreakpoint(bp: Breakpoint) {
        if (bp === 'mobile') {
            modelGroup.scale.setScalar(0.108);
            modelGroup.position.set(1.5, 0.1, 0);
            modelGroup.rotation.set(-0.1715, -0.771, 0.0084);
        } else if (bp === 'tablet') {
            modelGroup.scale.setScalar(0.121);
            modelGroup.position.set(0.5, -0.099, -0.5);
            modelGroup.rotation.set(-0.221, -0.431, -0.051);
        } else if (bp === 'desktop') {
            modelGroup.scale.setScalar(0.038);
            modelGroup.position.set(0.2, 0, -0.099);
            modelGroup.rotation.set(-0.181, -0.461, -0.051);
        } else if (bp === 'desktop-xl') {
            modelGroup.scale.setScalar(0.037);
            modelGroup.position.set(0.1, 0.1, 0.1);
            modelGroup.rotation.set(-0.291, -0.531, -0.071);
        } else {
            // desktop-2xl (1920+)
            modelGroup.scale.setScalar(0.058);
            modelGroup.position.set(-0.5, 0.1, 0);
            modelGroup.rotation.set(-0.0415, -0.4115, -0.0715);
        }
    }

    function updateSize() {
        const bp = getBreakpoint(window.innerWidth);
        const canvasRect = canvas.getBoundingClientRect();

        renderer.setSize(canvasRect.width, canvasRect.height);
        camera.aspect = canvasRect.width / canvasRect.height;
        camera.updateProjectionMatrix();

        if (loadedModel) {
            applyBreakpoint(bp);
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
        '/models/suitcase.glb',
        (gltf) => {
            modelGroup.add(gltf.scene);
            loadedModel = modelGroup;

            applyBreakpoint(getBreakpoint(window.innerWidth));

            modelLoaded = true;

            reportProgress(suitcaseSlotStart, 1);
            setupSlideUpAnimation();
            setupDebugGUI();
        },
        (xhr) => {
            if (xhr.total) {
                // Cap at 0.95 — full 1.0 is reported after model setup
                reportProgress(
                    suitcaseSlotStart,
                    Math.min(xhr.loaded / xhr.total, 0.95),
                );
            }
        },
    );

    // ── Slide-up animation (syncs with experience heading reveal) ──
    function setupSlideUpAnimation() {
        const targetY = modelGroup.position.y;
        // Start 0.5 units below final position
        modelGroup.position.y = targetY - 0.5;

        gsap.to(modelGroup.position, {
            y: targetY,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: '#experience-heading',
                start: 'top 80%',
                toggleActions: 'play none none none',
            },
        });
    }

    // ── Debug GUI ──
    function setupDebugGUI() {
        const gui = new GUI({ title: 'Suitcase Scene' });

        const camFolder = gui.addFolder('Camera');
        camFolder
            .add(camera.position, 'x', -20, 20, 0.1)
            .name('X')
            .onChange(() => camera.lookAt(0, 0, 0));
        camFolder
            .add(camera.position, 'y', -20, 20, 0.1)
            .name('Y')
            .onChange(() => camera.lookAt(0, 0, 0));
        camFolder
            .add(camera.position, 'z', 1, 30, 0.1)
            .name('Z')
            .onChange(() => camera.lookAt(0, 0, 0));
        camFolder
            .add(camera, 'fov', 10, 120, 1)
            .name('FOV')
            .onChange(() => camera.updateProjectionMatrix());

        const modelFolder = gui.addFolder('Model');
        modelFolder
            .add(modelGroup.scale, 'x', 0.01, 1, 0.001)
            .name('Scale')
            .onChange((v: number) => {
                modelGroup.scale.setScalar(v);
            });
        modelFolder.add(modelGroup.position, 'x', -10, 10, 0.1).name('Pos X');
        modelFolder.add(modelGroup.position, 'y', -10, 10, 0.1).name('Pos Y');
        modelFolder.add(modelGroup.position, 'z', -10, 10, 0.1).name('Pos Z');
        modelFolder
            .add(modelGroup.rotation, 'x', -Math.PI, Math.PI, 0.01)
            .name('Rotation X');
        modelFolder
            .add(modelGroup.rotation, 'y', -Math.PI, Math.PI, 0.01)
            .name('Rotation Y');
        modelFolder
            .add(modelGroup.rotation, 'z', -Math.PI, Math.PI, 0.01)
            .name('Rotation Z');

        // ── Breakpoint info ──
        const bpInfo = { breakpoint: getBreakpoint(window.innerWidth) };
        const bpController = gui
            .add(bpInfo, 'breakpoint')
            .name('Breakpoint')
            .disable();
        window.addEventListener('resize', () => {
            bpInfo.breakpoint = getBreakpoint(window.innerWidth);
            bpController.updateDisplay();
        });

        gui.add(
            {
                log: () => {
                    const bp = getBreakpoint(window.innerWidth);
                    console.log(
                        `// Breakpoint: ${bp} (${window.innerWidth}px)`,
                    );
                    console.log(
                        `camera.position.set(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)});`,
                    );
                    console.log(`camera.fov = ${camera.fov};`);
                    console.log(
                        `modelGroup.scale.setScalar(${modelGroup.scale.x.toFixed(4)});`,
                    );
                    console.log(
                        `modelGroup.position.set(${modelGroup.position.x.toFixed(4)}, ${modelGroup.position.y.toFixed(4)}, ${modelGroup.position.z.toFixed(4)});`,
                    );
                    console.log(
                        `modelGroup.rotation.set(${modelGroup.rotation.x.toFixed(4)}, ${modelGroup.rotation.y.toFixed(4)}, ${modelGroup.rotation.z.toFixed(4)});`,
                    );
                },
            },
            'log',
        ).name('Log Values to Console');
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
