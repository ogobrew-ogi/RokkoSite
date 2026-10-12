#!/usr/bin/env node
/*
 * One-off migration: rewrite <img src="images/N.webp"> and
 * data-bg="images/N.webp" to use the new AVIF/WebP/JPEG triad produced by
 * build-images.mjs. Only touches the real-photo .webp refs (trips 1-5);
 * the images/17-34.svg placeholders for trips 6-11 are untouched until
 * real photos replace them.
 *
 * Run once: node tools/migrate-to-picture.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const FILES = ['index.html', 'index-bg.html', 'excursions.html', 'excursions-bg.html'];

for (const file of FILES) {
    let html = readFileSync(file, 'utf8');
    let count = 0;

    // <div class="exc-banner" data-bg="images/N.webp"> -> data-bg="images/N"
    html = html.replace(/data-bg="images\/(\d+)\.webp"/g, (_, n) => {
        count++;
        return `data-bg="images/${n}"`;
    });

    // <img ... src="images/N.webp" ...> -> <picture><source avif><source webp><img src=".jpg"></picture>
    html = html.replace(
        /^([ \t]*)<img([\s\S]*?)src="images\/(\d+)\.webp"([\s\S]*?)>/gm,
        (_, indent, prefix, n, suffix) => {
            count++;
            suffix = suffix.replace('width="1920" height="1080"', 'width="1600" height="900"');
            return (
                `${indent}<picture>\n` +
                `${indent}    <source srcset="images/${n}.avif" type="image/avif">\n` +
                `${indent}    <source srcset="images/${n}.webp" type="image/webp">\n` +
                `${indent}    <img${prefix}src="images/${n}.jpg"${suffix}>\n` +
                `${indent}</picture>`
            );
        }
    );

    writeFileSync(file, html, 'utf8');
    console.log(`${file}: ${count} reference(s) migrated`);
}
