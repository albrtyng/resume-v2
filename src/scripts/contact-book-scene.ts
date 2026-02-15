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

const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
).matches;

initContactBookScene();

function initContactBookScene() {
    const canvas = document.getElementById(
        'contact-book-canvas',
    ) as HTMLCanvasElement | null;
    const footerEl = document.getElementById('footer');
    if (!canvas || !footerEl) return;

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
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    // ── Lighting ──
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
    let normalizedScale = 1.0;
    function applyBreakpoint(bp: Breakpoint) {
        if (bp === 'mobile') {
            modelGroup.scale.setScalar(normalizedScale * 1.64);
            modelGroup.position.set(2, 0.486, 0);
        } else if (bp === 'tablet') {
            modelGroup.scale.setScalar(normalizedScale * 1.64);
            modelGroup.position.set(1.541, 0.483, 0);
        } else if (bp === 'desktop') {
            modelGroup.scale.setScalar(normalizedScale * 0.82);
            modelGroup.position.set(1.7, 0.2, 0);
        } else if (bp === 'desktop-xl') {
            modelGroup.scale.setScalar(normalizedScale * 1.4);
            modelGroup.position.set(0.3, 0, 0);
        } else {
            // desktop-2xl (1920+)
            modelGroup.scale.setScalar(normalizedScale * 1.8);
            modelGroup.position.set(2.911, 0.206, 0);
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
                    '/models/contact-book.glb',
                    (gltf) => {
                        const box = new THREE.Box3().setFromObject(gltf.scene);
                        const center = box.getCenter(new THREE.Vector3());
                        const size = box.getSize(new THREE.Vector3());

                        gltf.scene.position.sub(center);

                        const maxDim = Math.max(size.x, size.y, size.z);
                        normalizedScale = maxDim > 0 ? 1.0 / maxDim : 1.0;

                        modelGroup.add(gltf.scene);
                        loadedModel = modelGroup;

                        applyBreakpoint(getBreakpoint(window.innerWidth));

                        modelLoaded = true;

                        renderer.render(scene, camera);

                        gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 0.6 });
                    },
                    undefined,
                    (error) => {
                        console.error('Failed to load contact-book model:', error);
                    },
                );
            },
            { rootMargin: '0px 0px 200px 0px' },
        );
        loadObserver.observe(footerEl);
    }

    // Hero is already ready (this script is dynamically imported after models:hero-ready)
    setupLoadObserver();

    // ── IntersectionObserver — pause when off-screen ──
    let isVisible = false;

    // ── Gyroscope animation ──
    let animationId: number;
    const clock = new THREE.Clock();

    function animate() {
        animationId = requestAnimationFrame(animate);

        if (!isVisible || !modelLoaded || prefersReducedMotion) return;

        const t = clock.getElapsedTime();

        // Gyroscopic tumble: different frequencies per axis create a precessing loop
        modelGroup.rotation.x = Math.sin(t * 0.7) * 0.6;
        modelGroup.rotation.y = t * 0.8; // continuous primary spin
        modelGroup.rotation.z = Math.cos(t * 0.5) * 0.4;

        renderer.render(scene, camera);
    }
    animate();

    const observer = new IntersectionObserver(
        ([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible) updateSize();
        },
        { threshold: 0 },
    );
    observer.observe(footerEl);

    // ── Resize handler ──
    const onResize = () => updateSize();
    window.addEventListener('resize', onResize);

    // ── Cleanup on Astro page navigation ──
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
