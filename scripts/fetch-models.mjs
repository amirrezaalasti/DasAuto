// Downloads the real 3D models listed in src/data/models.json from Sketchfab and
// optimises them into public/models/<id>.glb.
//
//   SKETCHFAB_TOKEN=... npm run models          (or put the token in .env.local)
//   npm run models -- golf id3                   only these vehicles
//
// The token is on https://sketchfab.com/settings/password ("API Token").

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const models = JSON.parse(readFileSync(join(root, 'src/data/models.json'), 'utf8'));
const cache = join(root, '.cache/models');
const out = join(root, 'public/models');
mkdirSync(cache, { recursive: true });
mkdirSync(out, { recursive: true });

function token() {
  const fromEnv = process.env.SKETCHFAB_TOKEN ?? process.env.SK_API_KEY;
  if (fromEnv) return fromEnv.trim();
  const env = join(root, '.env.local');
  if (existsSync(env)) {
    const m = readFileSync(env, 'utf8').match(/^(?:SKETCHFAB_TOKEN|SK_API_KEY)=(.+)$/m);
    if (m) return m[1].trim().replace(/^['"]|['"]$/g, '');
  }
  console.error('Set SKETCHFAB_TOKEN (env or .env.local). Find it at https://sketchfab.com/settings/password');
  process.exit(1);
}

/** fetch with retries: Sketchfab's API and CDN time out now and then. */
async function get(url, init, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status < 500 || i === tries) return res;
    } catch (err) {
      if (i === tries) throw err;
    }
    await new Promise((r) => setTimeout(r, 2000 * i));
  }
}

async function download(url, file) {
  const res = await get(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

/** Finds the .gltf/.glb inside an extracted archive. */
function findScene(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      const hit = findScene(p);
      if (hit) return hit;
    } else if (/\.(gltf|glb)$/i.test(name)) return p;
  }
  return null;
}

const auth = { Authorization: `Token ${token()}` };
const wanted = process.argv.slice(2);

const failed = [];
for (const [id, m] of Object.entries(models)) {
  if (wanted.length && !wanted.includes(id)) continue;
  try {
    await fetchModel(id, m);
  } catch (err) {
    console.error(`  ✗ ${id}: ${err.message}`);
    failed.push(id);
  }
}
// The atlas only lists cars whose real model is present.
const available = readdirSync(out)
  .filter((f) => f.endsWith('.glb') && existsSync(join(out, f.replace(/\.glb$/, '.json'))))
  .map((f) => f.replace(/\.glb$/, ''))
  .sort();
writeFileSync(join(root, 'src/data/available.json'), JSON.stringify(available) + '\n');
console.log(`\nAvailable: ${available.join(', ')}`);

if (failed.length) {
  console.error(`\nFailed: ${failed.join(' ')} — run again with: npm run models -- ${failed.join(' ')}`);
  process.exitCode = 1;
}

async function fetchModel(id, m) {
  console.log(`\n▸ ${id}: ${m.title} by ${m.author}`);

  const res = await get(`https://api.sketchfab.com/v3/models/${m.uid}/download`, { headers: auth });
  if (!res.ok) {
    throw new Error(`download API ${res.status}: ${await res.text()}`);
  }
  const links = await res.json();

  let scene;
  if (links.glb) {
    scene = join(cache, `${id}.glb`);
    await download(links.glb.url, scene);
  } else {
    const zip = join(cache, `${id}.zip`);
    const dir = join(cache, id);
    await download(links.gltf.url, zip);
    rmSync(dir, { recursive: true, force: true });
    execFileSync('unzip', ['-q', '-o', zip, '-d', dir]);
    scene = findScene(dir);
  }
  if (!scene) {
    throw new Error('no glTF scene in archive');
  }

  // Shrink textures, re-encode them as WebP, then compress geometry. The all-in-one `optimize`
  // command is avoided on purpose: it merges look-alike materials and drops their names, which
  // the atlas needs to tell paint, glass and tyres apart.
  const tmp = join(cache, `${id}.tmp.glb`);
  const run = (...args) => execFileSync('npx', ['gltf-transform', ...args], { stdio: ['ignore', 'ignore', 'inherit'], cwd: root });
  run('resize', scene, tmp, '--width', '2048', '--height', '2048');
  run('webp', tmp, tmp);
  run('meshopt', tmp, join(out, `${id}.glb`));
  rmSync(tmp, { force: true });
  const meta = { title: m.title, author: m.author, license: m.license, url: `https://sketchfab.com/3d-models/${m.uid}`, ...(m.yaw !== undefined && { yaw: m.yaw }), ...(m.flip && { flip: true }) };
  writeFileSync(join(out, `${id}.json`), JSON.stringify(meta, null, 2) + '\n');
  console.log(`  ✓ public/models/${id}.glb (${(statSync(join(out, `${id}.glb`)).size / 1e6).toFixed(1)} MB)`);
}
