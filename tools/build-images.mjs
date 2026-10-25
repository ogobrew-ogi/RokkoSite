#!/usr/bin/env node
/*
 * Image pipeline for the ROKKO/LAZUR site.
 *
 * Reads a raw photo per numbered slot from images/source/<n>.<ext>
 * (falls back to the current images/<n>.webp if no source file exists yet —
 * covers trips 1-16 which only ever existed as a single .webp).
 * Writes images/<n>.avif + images/<n>.webp + images/<n>.jpg, cropped/resized
 * per the slot's role (banner = wide 16:9, photo = 4:3 pair).
 *
 * Usage:
 *   npm run images            # build every slot listed in SLOTS below
 *   npm run images -- 17 20   # build only these numbers
 */

import sharp from 'sharp';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const IMAGES_DIR = path.join(ROOT, 'images');
const SOURCE_DIR = path.join(IMAGES_DIR, 'source');

const SIZES = {
    banner: { width: 1600, height: 900 },
    photo: { width: 800, height: 600 },
};

// 9 trips total: 1 = hero, then banner/photo/photo per trip (trips 1-5 on
// the homepage, 6-9 on the "More trips" page).
const SLOTS = {
    1: 'banner', // hero image, same wide crop as a banner
    2: 'banner', 3: 'photo', 4: 'photo',
    5: 'banner', 6: 'photo', 7: 'photo',
    8: 'banner', 9: 'photo', 10: 'photo',
    11: 'banner', 12: 'photo', 13: 'photo',
    14: 'banner', 15: 'photo', 16: 'photo',
    17: 'banner', 18: 'photo', 19: 'photo',
    20: 'banner', 21: 'photo', 22: 'photo',
    23: 'banner', 24: 'photo', 25: 'photo',
    26: 'banner', 27: 'photo', 28: 'photo',
};

const SOURCE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff'];

function findSource(n) {
    for (const ext of SOURCE_EXTS) {
        const p = path.join(SOURCE_DIR, `${n}${ext}`);
        if (existsSync(p)) return p;
    }
    // Fallback: the live site's existing single-webp (trips 1-16 today).
    const legacy = path.join(IMAGES_DIR, `${n}.webp`);
    if (existsSync(legacy)) return legacy;
    return null;
}

async function buildOne(n, role) {
    const src = findSource(n);
    if (!src) {
        console.log(`  [skip] ${n} — no source found (drop images/source/${n}.jpg to fill it in)`);
        return 'skip';
    }

    const { width, height } = SIZES[role];
    // Read into a buffer (not sharp(path)) so the legacy fallback — which can
    // be the same file as the .webp output — isn't held open as an input file.
    const inputBuffer = readFileSync(src);
    const base = sharp(inputBuffer).resize(width, height, { fit: 'cover', position: 'centre' });

    const outAvif = path.join(IMAGES_DIR, `${n}.avif`);
    const outWebp = path.join(IMAGES_DIR, `${n}.webp`);
    const outJpg = path.join(IMAGES_DIR, `${n}.jpg`);

    await Promise.all([
        base.clone().avif({ quality: 55, effort: 4 }).toFile(outAvif),
        base.clone().webp({ quality: 78 }).toFile(outWebp),
        base.clone().jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(outJpg),
    ]);

    console.log(`  [ok]   ${n} (${role}, ${width}x${height}) <- ${path.relative(ROOT, src)}`);
    return 'ok';
}

async function main() {
    mkdirSync(SOURCE_DIR, { recursive: true });

    const requested = process.argv.slice(2).map(Number).filter(Number.isFinite);
    const targets = requested.length ? requested : Object.keys(SLOTS).map(Number);

    console.log(`Building ${targets.length} image slot(s)...\n`);

    let ok = 0, skipped = 0;
    for (const n of targets) {
        const role = SLOTS[n];
        if (!role) {
            console.log(`  [skip] ${n} — not a known slot (edit SLOTS in tools/build-images.mjs)`);
            continue;
        }
        const result = await buildOne(n, role);
        if (result === 'ok') ok++; else skipped++;
    }

    console.log(`\nDone: ${ok} built, ${skipped} skipped.`);
    if (skipped > 0) {
        console.log(`Drop the missing raw photos into images/source/<number>.jpg (or .png/.webp) and rerun.`);
    }
}

main();
