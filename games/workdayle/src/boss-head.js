import * as THREE from 'three';

// Crops and nose landmarks are calibrated to the supplied photos, in source pixels.
// Resizing a photo without changing its framing preserves the normalized mapping.
export const HEAD_PROFILES = {
  jill_guldhav: { source: [440, 325], crop: [172, 17, 106, 153], nose: [0.50, 0.64], skin: '#b67f59', hair: '#29221f', hairline: 0.66 },
  sander_thomassen: { source: [440, 325], crop: [174, 10, 116, 174], nose: [0.48, 0.60], skin: '#c69475', hair: '#49392c', hairline: 0.27 },
  alf_gilroy: { source: [440, 325], crop: [153, 27, 124, 179], nose: [0.48, 0.63], skin: '#c69572', hair: '#9a897a', hairline: 0 },
  kjell_rusti: { source: [2000, 1339], crop: [635, 56, 620, 812], nose: [0.44, 0.62], skin: '#d0b19e', hair: '#8b827b', hairline: 0.32 },
};

export function getHeadProfile(slug) {
  return HEAD_PROFILES[slug] ?? { source: [1, 1], crop: [0, 0, 1, 1], nose: [0.5, 0.62], skin: '#cf9d7c', hair: '#514238', hairline: 0.3 };
}

export function getFaceCrop(profile, imageWidth, imageHeight) {
  if (![imageWidth, imageHeight].every(n => Number.isFinite(n) && n > 0)) {
    throw new RangeError('Head photographs must have positive, finite dimensions.');
  }
  const [x, y, width, height] = profile.crop;
  return {
    x: x / profile.source[0] * imageWidth,
    y: y / profile.source[1] * imageHeight,
    width: width / profile.source[0] * imageWidth,
    height: height / profile.source[1] * imageHeight,
  };
}

export function headRing(v) {
  return Math.pow(Math.max(0, Math.sin(v * Math.PI)), 0.55) * (1 - 0.12 * THREE.MathUtils.smoothstep(v, 0.6, 1));
}

export function createHeadGeometry(profile, aspect = profile.crop[2] / profile.crop[3]) {
  const width = 0.56;
  const height = width / aspect;
  const columns = 64, rows = 48;
  const positions = [], uvs = [], indices = [];
  const bump = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2));
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    const ring = row === rows ? 0 : headRing(v);
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const angle = (u - 0.5) * Math.PI * 2;
      const nx = Math.sin(angle) * ring;
      const x = nx * width / 2;
      const y = (0.5 - v) * height;
      const front = Math.max(0, Math.cos(angle)) ** 4 * ring;
      const noseX = (profile.nose[0] - 0.5) * width;
      const noseY = (0.5 - profile.nose[1]) * height;
      let z = Math.cos(angle) * ring * width * 0.43;
      // Sculpt the surface itself: no nose overlay, second face shell, or decal plane.
      z += front * (
        0.072 * bump(x, y, noseX, noseY, 0.050, 0.070)
        + 0.026 * bump(x, y, noseX, noseY + 0.065, 0.028, 0.090)
        + 0.025 * bump(x, y, -0.13, -0.04, 0.080, 0.075)
        + 0.025 * bump(x, y, 0.13, -0.04, 0.080, 0.075)
        + 0.018 * bump(x, y, 0, -height * 0.32, 0.10, 0.055)
        - 0.014 * bump(x, y, -0.10, height * 0.05, 0.055, 0.035)
        - 0.014 * bump(x, y, 0.10, height * 0.05, 0.055, 0.035)
      );
      positions.push(x, y, z);
      uvs.push(u, 1 - v);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column, b = a + columns + 1;
        if (row > 0) indices.push(a, b, a + 1);
        if (row < rows - 1) indices.push(b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  const seam = new THREE.Vector3();
  for (let row = 0; row <= rows; row++) {
    const first = row * (columns + 1), last = first + columns;
    if (row === 0 || row === rows) {
      for (let column = 0; column <= columns; column++) normals.setXYZ(first + column, 0, row === 0 ? 1 : -1, 0);
    } else {
      seam.set(normals.getX(first) + normals.getX(last), normals.getY(first) + normals.getY(last), normals.getZ(first) + normals.getZ(last)).normalize();
      normals.setXYZ(first, seam.x, seam.y, seam.z);
      normals.setXYZ(last, seam.x, seam.y, seam.z);
    }
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = 'closed-sculpted-boss-head';
  geometry.userData = { width, height, aspect, columns, rows };
  return geometry;
}
