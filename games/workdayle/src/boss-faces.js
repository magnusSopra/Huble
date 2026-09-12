import * as THREE from 'three';
import { createHeadGeometry, getFaceCrop, getHeadProfile, headRing } from './boss-head.js';

export const BOSS_FACE_ASSETS = import.meta.glob('../assets/bosses/*.jpg', { eager: true, query: '?url', import: 'default' });
// Cache CPU pixels, never scene-owned textures: disposing an arena must not
// invalidate another head, or interrupt a replacement waiting for the same JPG.
const portraits = new Map();

export function bossSlug(boss = {}) {
  return String(boss.id || boss.slug || boss.name || 'boss')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function resolveBossPhoto(boss, assets = BOSS_FACE_ASSETS) {
  const filename = `${bossSlug(boss)}.jpg`;
  return Object.entries(assets).find(([path]) => path.replaceAll('\\', '/').split('/').pop() === filename)?.[1] ?? null;
}

function canvas2d(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not create the boss head texture canvas.');
  return { canvas, context };
}

function createHeadAtlas(image, profile, crop) {
  const { canvas: source, context } = canvas2d(512, Math.round(512 * crop.height / crop.width));
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, source.width, source.height);
  const photo = context.getImageData(0, 0, source.width, source.height).data;
  const sample = (x, y) => 4 * (Math.min(source.height - 1, Math.max(0, Math.round(y * (source.height - 1)))) * source.width
    + Math.min(source.width - 1, Math.max(0, Math.round(x * (source.width - 1)))));
  const cheek = sample(0.3, 0.66);
  const skin = [photo[cheek], photo[cheek + 1], photo[cheek + 2]];
  const hair = profile.hair.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16));
  const { canvas, context: atlasContext } = canvas2d(1024, 512);
  const atlas = atlasContext.createImageData(canvas.width, canvas.height);
  // Bake a cylindrical UV atlas using frontal projection. Thus a photograph pixel
  // has the same horizontal/vertical world scale; eyes and mouths never wrap twice.
  for (let y = 0; y < canvas.height; y++) {
    const v = y / (canvas.height - 1), ring = headRing(v);
    for (let x = 0; x < canvas.width; x++) {
      const angle = (x / (canvas.width - 1) - 0.5) * Math.PI * 2;
      const photoX = (Math.sin(angle) * ring + 1) / 2;
      const silhouette = ((photoX - 0.5) / 0.46) ** 2 + ((v - 0.48) / 0.55) ** 2;
      const blend = THREE.MathUtils.smoothstep(Math.cos(angle), 0.2, 0.65)
        * (1 - THREE.MathUtils.smoothstep(silhouette, 0.78, 1));
      const pixel = sample(photoX, v);
      const hairBlend = 1 - THREE.MathUtils.smoothstep(v, profile.hairline - 0.045, profile.hairline + 0.025);
      const target = 4 * (y * canvas.width + x);
      for (let channel = 0; channel < 3; channel++) {
        const base = skin[channel] * (1 - hairBlend) + hair[channel] * hairBlend;
        atlas.data[target + channel] = base * (1 - blend) + photo[pixel + channel] * blend;
      }
      atlas.data[target + 3] = 255;
    }
  }
  atlasContext.putImageData(atlas, 0, 0);
  return canvas;
}

function headTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.name = 'cropped-face-and-scalp-atlas';
  return texture;
}

function loadPortrait(url, profile, loader, timeout) {
  return new Promise((resolve, reject) => {
    let source, completed = false;
    const released = new WeakSet();
    const release = texture => {
      if (texture && !released.has(texture)) { released.add(texture); texture.dispose(); }
    };
    const fail = error => {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      release(source);
      reject(error);
    };
    const timer = setTimeout(() => fail(new Error(`Portrait loading timed out after ${timeout}ms: ${url}`)), timeout);
    try {
      source = loader.load(url, texture => {
        if (completed) { release(texture); return; }
        try {
          const image = texture.image;
          const crop = getFaceCrop(profile, image?.naturalWidth || image?.width, image?.naturalHeight || image?.height);
          const canvas = createHeadAtlas(image, profile, crop);
          completed = true;
          clearTimeout(timer);
          resolve({ canvas, crop });
        } catch (error) { fail(error); }
        finally { release(texture); }
      }, undefined, fail);
      if (completed) release(source);
    } catch (error) { fail(error); }
  });
}

export function createBossFace(boss, { assets = BOSS_FACE_ASSETS, loader, timeout = 12000 } = {}) {
  const slug = bossSlug(boss), profile = getHeadProfile(slug);
  const expectedPath = `/assets/bosses/${slug}.jpg`;
  const group = new THREE.Group();
  group.name = `head-surface-${slug}`;
  const material = new THREE.MeshStandardMaterial({ color: '#da62ac', roughness: 0.94, metalness: 0 });
  const mesh = new THREE.Mesh(createHeadGeometry(profile), material);
  mesh.name = `sculpted-head-${slug}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.visible = false;
  group.add(mesh);
  Object.assign(group.userData, { photoState: 'loading', expectedPath, placeholder: true });
  let settle, settled = false;
  const ready = new Promise(resolve => { settle = resolve; });
  const finish = state => {
    group.userData.photoState = state;
    if (!settled) { settled = true; settle(state); }
  };
  group.userData.cancelPending = () => {
    group.userData.disposed = true;
    finish('disposed');
  };
  const failed = (state, message, error) => {
    if (group.userData.disposed) return;
    console.warn(`Workdayle boss head: ${message} ${expectedPath}. Using the pink placeholder head.`, error ?? '');
    group.userData.photoError = error?.message || message;
    mesh.visible = true;
    finish(state);
  };
  const url = resolveBossPhoto(boss, assets);
  group.userData.photoUrl = url;
  if (!url) {
    failed('missing', 'missing');
  } else {
    const key = `${slug}:${url}`;
    let portrait = !loader && portraits.get(key);
    if (!portrait) {
      portrait = loadPortrait(url, profile, loader || new THREE.TextureLoader(), timeout);
      if (!loader) {
        portraits.set(key, portrait);
        portrait.catch(() => { if (portraits.get(key) === portrait) portraits.delete(key); });
      }
    }
    portrait.then(({ canvas, crop }) => {
      if (group.userData.disposed) return;
      mesh.geometry.dispose();
      mesh.geometry = createHeadGeometry(profile, crop.width / crop.height);
      material.map = headTexture(canvas);
      material.color.set('#c8c8c8');
      material.needsUpdate = true;
      Object.assign(group.userData, { crop, placeholder: false });
      mesh.visible = true;
      finish('ready');
    }).catch(error => failed('error', 'could not load', error));
  }
  return {
    group, mesh, ready,
    dispose() {
      if (group.userData.disposed) return;
      group.userData.cancelPending();
      mesh.geometry.dispose();
      material.map?.dispose();
      material.dispose();
      group.removeFromParent();
      group.clear();
    },
  };
}
