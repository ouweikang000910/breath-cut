import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
const folder = new URL('../public/engine/', import.meta.url);
await mkdir(folder, { recursive: true });
await copyFile(new URL('../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js', import.meta.url), new URL('ffmpeg-core.js', folder));
// Each hosted static asset stays below 25 MiB. Reassemble the engine in memory.
const wasm = await readFile(new URL('../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm', import.meta.url));
const midpoint = Math.ceil(wasm.length / 2);
await writeFile(new URL('core-1.bin', folder), wasm.subarray(0, midpoint));
await writeFile(new URL('core-2.bin', folder), wasm.subarray(midpoint));
console.log('Browser video engine prepared.');
