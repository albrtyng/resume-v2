#!/usr/bin/env node

/**
 * Optimizes GLB models from models-src/ → public/models/
 *
 * Usage: node scripts/optimize-models.mjs
 *
 * - tech-stack.glb:  weld + quantize + draco  (uncompressed Blender export)
 * - All others:      already DRACO-compressed, copy as-is
 */

import { execSync } from 'node:child_process';
import { readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const SRC_DIR = 'models-src';
const OUT_DIR = 'public/models';
const CLI = 'npx gltf-transform';

const files = readdirSync(SRC_DIR).filter((f) => f.endsWith('.glb'));

function run(cmd) {
    console.log(`  $ ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
}

function sizeKB(path) {
    return (statSync(path).size / 1024).toFixed(0);
}

for (const file of files) {
    const src = join(SRC_DIR, file);
    const out = join(OUT_DIR, file);
    const name = basename(file, '.glb');
    const beforeKB = sizeKB(src);

    console.log(`\n── ${file} (${beforeKB} KB) ──`);

    if (name === 'tech-stack') {
        // Uncompressed Blender export — full pipeline
        // Order: weld → quantize → draco (quantize before draco so draco compresses quantized data)
        run(`${CLI} weld "${src}" "${out}"`);
        run(`${CLI} quantize "${out}" "${out}"`);
        run(`${CLI} draco "${out}" "${out}"`);
    } else {
        // Already DRACO-compressed — copy as-is
        copyFileSync(src, out);
        console.log('  (already optimized, copied as-is)');
    }

    const afterKB = sizeKB(out);
    console.log(`  → ${beforeKB} KB → ${afterKB} KB (${((1 - afterKB / beforeKB) * 100).toFixed(1)}% reduction)`);
}

console.log('\nDone!');
