import * as THREE from 'three';

/** Visible world-space dimensions at a given depth from a perspective camera. */
export function getVisibleSize(
    camera: THREE.PerspectiveCamera,
    modelDepth = 0,
): { width: number; height: number } {
    const distance = Math.abs(camera.position.z - modelDepth);
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const height = 2 * distance * Math.tan(fovRad / 2);
    const width = height * camera.aspect;
    return { width, height };
}

/** Scale factor so a model covers `coverageFraction` of the frustum's visible height. */
export function computeFrustumScale(
    camera: THREE.PerspectiveCamera,
    rawModelHeight: number,
    coverageFraction: number,
    modelDepth = 0,
): number {
    const { height } = getVisibleSize(camera, modelDepth);
    return (height * coverageFraction) / rawModelHeight;
}
