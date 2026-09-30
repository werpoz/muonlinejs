// LEA-256 (KISA block cipher, 128-bit blocks) in ECB mode: the BMD files of
// version 15 of the newer clients are encrypted with it.

const DELTA = [
  0xc3efe9db, 0x44626b02, 0x79e27c8a, 0x78df30ec, 0x715ea49e, 0xc785da0a, 0xe04ef22a,
  0xe5c40957,
];

const ROUNDS = 32;

const rol = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;
const ror = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

// the key of the MU client (BMD files)
export const BMD_LEA_KEY = new Uint8Array([
  0xcc, 0x50, 0x45, 0x13, 0xc2, 0xa6, 0x57, 0x4e, 0xd6, 0x9a, 0x45, 0x89, 0xbf, 0x2f, 0xbc,
  0xd9, 0x39, 0xb3, 0xb3, 0xbd, 0x50, 0xbd, 0xcc, 0xb6, 0x85, 0x46, 0xd1, 0xd6, 0x16, 0x54,
  0xe0, 0x87,
]);

// round keys of a 256-bit key: 32 rounds of 6 words
function keySchedule(key: Uint8Array): Uint32Array[] {
  const dv = new DataView(key.buffer, key.byteOffset, 32);
  const t = new Uint32Array(8);
  for (let i = 0; i < 8; i++) t[i] = dv.getUint32(i * 4, true);

  const roundKeys: Uint32Array[] = [];
  const shifts = [1, 3, 6, 11, 13, 17];
  for (let i = 0; i < ROUNDS; i++) {
    const delta = DELTA[i % 8];
    const rk = new Uint32Array(6);
    for (let j = 0; j < 6; j++) {
      const index = (6 * i + j) % 8;
      t[index] = rol((t[index] + rol(delta, (i + j) % 32)) >>> 0, shifts[j]);
      rk[j] = t[index];
    }
    roundKeys.push(rk);
  }
  return roundKeys;
}

const schedules = new WeakMap<Uint8Array, Uint32Array[]>();

// decrypts the whole 16-byte blocks of data (a shorter tail stays as it is)
export function leaDecryptEcb(data: Uint8Array, key: Uint8Array = BMD_LEA_KEY): Uint8Array {
  let rks = schedules.get(key);
  if (!rks) {
    rks = keySchedule(key);
    schedules.set(key, rks);
  }

  const out = new Uint8Array(data);
  const dv = new DataView(out.buffer, out.byteOffset, out.byteLength);
  const blocks = Math.floor(out.byteLength / 16);

  for (let b = 0; b < blocks; b++) {
    const o = b * 16;
    let x0 = dv.getUint32(o, true);
    let x1 = dv.getUint32(o + 4, true);
    let x2 = dv.getUint32(o + 8, true);
    let x3 = dv.getUint32(o + 12, true);

    for (let i = ROUNDS - 1; i >= 0; i--) {
      const rk = rks[i];
      const n0 = x3;
      const n1 = ((((ror(x0, 9) - ((n0 ^ rk[0]) >>> 0)) >>> 0) ^ rk[1]) >>> 0);
      const n2 = ((((rol(x1, 5) - ((n1 ^ rk[2]) >>> 0)) >>> 0) ^ rk[3]) >>> 0);
      const n3 = ((((rol(x2, 3) - ((n2 ^ rk[4]) >>> 0)) >>> 0) ^ rk[5]) >>> 0);
      x0 = n0;
      x1 = n1;
      x2 = n2;
      x3 = n3;
    }

    dv.setUint32(o, x0, true);
    dv.setUint32(o + 4, x1, true);
    dv.setUint32(o + 8, x2, true);
    dv.setUint32(o + 12, x3, true);
  }
  return out;
}

// encryption, only to check the implementation against the test vector
export function leaEncryptBlock(block: Uint8Array, key: Uint8Array): Uint8Array {
  const rks = keySchedule(key);
  const out = new Uint8Array(block);
  const dv = new DataView(out.buffer);
  let x0 = dv.getUint32(0, true);
  let x1 = dv.getUint32(4, true);
  let x2 = dv.getUint32(8, true);
  let x3 = dv.getUint32(12, true);
  for (let i = 0; i < ROUNDS; i++) {
    const rk = rks[i];
    const n0 = rol((((x0 ^ rk[0]) >>> 0) + ((x1 ^ rk[1]) >>> 0)) >>> 0, 9);
    const n1 = ror((((x1 ^ rk[2]) >>> 0) + ((x2 ^ rk[3]) >>> 0)) >>> 0, 5);
    const n2 = ror((((x2 ^ rk[4]) >>> 0) + ((x3 ^ rk[5]) >>> 0)) >>> 0, 3);
    x3 = x0;
    x0 = n0;
    x1 = n1;
    x2 = n2;
  }
  dv.setUint32(0, x0, true);
  dv.setUint32(4, x1, true);
  dv.setUint32(8, x2, true);
  dv.setUint32(12, x3, true);
  return out;
}
