import {
    Mesh,
    MeshBasicMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
} from 'three';
import type { Object3D } from 'three';

/** Swap MeshStandardMaterial → MeshBasicMaterial (unlit). */
export function downgradeToBasic(root: Object3D) {
    root.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
        const replaced = materials.map((mat) => {
            if (!(mat instanceof MeshStandardMaterial)) return mat;
            const basic = new MeshBasicMaterial({
                color: mat.color,
                map: mat.map,
                transparent: mat.transparent,
                opacity: mat.opacity,
                side: mat.side,
            });
            mat.dispose();
            return basic;
        });
        child.material = Array.isArray(child.material) ? replaced : replaced[0];
    });
}

/** Swap MeshStandardMaterial → MeshPhongMaterial (simpler lit). */
export function downgradeToPhong(root: Object3D) {
    root.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
        const replaced = materials.map((mat) => {
            if (!(mat instanceof MeshStandardMaterial)) return mat;
            const phong = new MeshPhongMaterial({
                color: mat.color,
                map: mat.map,
                emissive: mat.emissive,
                emissiveMap: mat.emissiveMap,
                transparent: mat.transparent,
                opacity: mat.opacity,
                side: mat.side,
            });
            mat.dispose();
            return phong;
        });
        child.material = Array.isArray(child.material) ? replaced : replaced[0];
    });
}
