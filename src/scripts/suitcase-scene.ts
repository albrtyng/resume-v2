import { gltfLoader } from './shared-loader';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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

gsap.registerPlugin(ScrollTrigger);

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

    // ── Deferred model loading via IntersectionObserver ──
    let modelLoaded = false;

    canvas.style.opacity = '0';

    let loadObserver: IntersectionObserver;

    function setupLoadObserver() {
        loadObserver = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                loadObserver.disconnect();

                gltfLoader.load(
                    '/models/suitcase.glb',
                    (gltf) => {
                        modelGroup.add(gltf.scene);
                        loadedModel = modelGroup;

                        applyBreakpoint(getBreakpoint(window.innerWidth));

                        modelLoaded = true;

                        gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 0.6 });
                        setupSlideUpAnimation();
                    },
                );
            },
            { rootMargin: '0px 0px 200px 0px' },
        );
        loadObserver.observe(wrapperEl);
    }

    // Wait for hero to finish loading before competing for bandwidth
    window.addEventListener('models:hero-ready', setupLoadObserver, { once: true });

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
        loadObserver.disconnect();
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
