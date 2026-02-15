import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
    vite: {
        plugins: [tailwindcss()],
        build: {
            rollupOptions: {
                output: {
                    manualChunks: {
                        'three-core': ['three'],
                        'gsap-core': ['gsap', 'gsap/ScrollTrigger'],
                        'lenis': ['lenis'],
                    },
                },
            },
        },
    },
});
