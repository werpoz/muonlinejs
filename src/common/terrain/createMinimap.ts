import type { Vector3 } from '../../libs/babylon/exports';
import { TERRAIN_SIZE, TWFlags } from './consts';
import { TERRAIN_INDEX } from './utils';

const BRIGHTNESS = 1.5;

// no second texture on the tile
const NO_LAYER = 255;

// Average color (0-1 RGB) of a texture from its pixels (3 floats each)
export function averageColor(pixels: Float32Array): [number, number, number] {
  const sum = [0, 0, 0];
  const count = pixels.length / 3;
  for (let i = 0; i < pixels.length; i += 3) {
    sum[0] += pixels[i];
    sum[1] += pixels[i + 1];
    sum[2] += pixels[i + 2];
  }
  return [sum[0] / count, sum[1] / count, sum[2] / count];
}

// Map image of 256x256 (one pixel per tile, row y, column x) made from the
// terrain like it's drawn: tile textures blended by alpha and the light
// map. Tiles where nobody can walk are darker, holes are transparent.
export function createMinimap(
  mapping: { layer1: Uint8Array; layer2: Uint8Array; alpha: Uint8Array },
  textureColors: [number, number, number][],
  light: Vector3[],
  attributes: Uint16Array | Uint8Array | number[]
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(TERRAIN_SIZE * TERRAIN_SIZE * 4);

  for (let y = 0; y < TERRAIN_SIZE; y++) {
    for (let x = 0; x < TERRAIN_SIZE; x++) {
      const i = TERRAIN_INDEX(x, y);
      const flags = attributes[i];
      const out = i * 4;

      if (flags & TWFlags.NoGround) continue;

      const c1 = textureColors[mapping.layer1[i]] ?? [0, 0, 0];
      const c2 =
        mapping.layer2[i] === NO_LAYER ? c1 : (textureColors[mapping.layer2[i]] ?? c1);
      const a = mapping.alpha[i] / 255;
      const l = light[i];
      // the light map is dark for a small image: brighter
      const blocked = (flags & TWFlags.NoMove ? 0.45 : 1) * BRIGHTNESS;

      pixels[out] = 255 * (c1[0] * (1 - a) + c2[0] * a) * (l?.x ?? 1) * blocked;
      pixels[out + 1] = 255 * (c1[1] * (1 - a) + c2[1] * a) * (l?.y ?? 1) * blocked;
      pixels[out + 2] = 255 * (c1[2] * (1 - a) + c2[2] * a) * (l?.z ?? 1) * blocked;
      pixels[out + 3] = 255;
    }
  }

  return pixels;
}
