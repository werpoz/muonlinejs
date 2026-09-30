# ModulusCryptor of the newer MU clients (MAP\x01 / ATT\x01 files): only the
# ciphers needed here (RC6, 3-Way), ported from muonline-cs / the RC6 spec.
import struct

M = 0xFFFFFFFF
def rol(x, n): n &= 31; return ((x << n) | (x >> (32 - n))) & M if n else x & M
def ror(x, n): n &= 31; return ((x >> n) | (x << (32 - n))) & M if n else x & M

class RC6:
    R = 20
    def __init__(self, key):
        key = key[:16]
        P, Q = 0xB7E15163, 0x9E3779B9
        c = 4
        L = list(struct.unpack('<4I', key))
        t = 2 * self.R + 4
        S = [0] * t
        S[0] = P
        for i in range(1, t): S[i] = (S[i - 1] + Q) & M
        A = B = i = j = 0
        for _ in range(3 * max(c, t)):
            A = S[i] = rol((S[i] + A + B) & M, 3)
            B = L[j] = rol((L[j] + A + B) & M, (A + B) & 31)
            i = (i + 1) % t; j = (j + 1) % c
        self.S = S
    block = 16
    def encrypt_block(self, b):
        S, r = self.S, self.R
        A, B, C, D = struct.unpack('<4I', b)
        B = (B + S[0]) & M; D = (D + S[1]) & M
        for i in range(1, r + 1):
            t = rol((B * (2 * B + 1)) & M, 5); u = rol((D * (2 * D + 1)) & M, 5)
            A = (rol(A ^ t, u) + S[2 * i]) & M; C = (rol(C ^ u, t) + S[2 * i + 1]) & M
            A, B, C, D = B, C, D, A
        A = (A + S[2 * r + 2]) & M; C = (C + S[2 * r + 3]) & M
        return struct.pack('<4I', A, B, C, D)
    def decrypt_block(self, b):
        S, r = self.S, self.R
        A, B, C, D = struct.unpack('<4I', b)
        C = (C - S[2 * r + 3]) & M; A = (A - S[2 * r + 2]) & M
        for i in range(r, 0, -1):
            A, B, C, D = D, A, B, C
            u = rol((D * (2 * D + 1)) & M, 5); t = rol((B * (2 * B + 1)) & M, 5)
            C = ror((C - S[2 * i + 1]) & M, t) ^ u
            A = ror((A - S[2 * i]) & M, u) ^ t
        D = (D - S[1]) & M; B = (B - S[0]) & M
        return struct.pack('<4I', A, B, C, D)

def rev_bytes(x): return struct.unpack('<I', struct.pack('>I', x))[0]
def rev_bits(a):
    a = ((a & 0xAAAAAAAA) >> 1) | ((a & 0x55555555) << 1)
    a = ((a & 0xCCCCCCCC) >> 2) | ((a & 0x33333333) << 2)
    return (((a & 0xF0F0F0F0) >> 4) | ((a & 0x0F0F0F0F) << 4)) & M

def theta(a0, a1, a2):
    c = a0 ^ a1 ^ a2
    c = rol(c, 16) ^ rol(c, 8)
    b0 = ((a0 << 24) ^ (a2 >> 8) ^ (a1 << 8) ^ (a0 >> 24)) & M
    b1 = ((a1 << 24) ^ (a0 >> 8) ^ (a2 << 8) ^ (a1 >> 24)) & M
    return (a0 ^ c ^ b0) & M, (a1 ^ c ^ b1) & M, (a2 ^ c ^ (b0 >> 16) ^ (b1 << 16)) & M

def mu(a0, a1, a2):
    return rev_bits(a2), rev_bits(a1), rev_bits(a0)

def pi_gamma_pi(a0, a1, a2):
    b2 = rol(a2, 1); b0 = rol(a0, 22)
    n0 = rol(b0 ^ (a1 | (~b2 & M)), 1)
    n2 = rol(b2 ^ (b0 | (~a1 & M)), 22)
    n1 = a1 ^ (b2 | (~b0 & M))
    return n0 & M, n1 & M, n2 & M

class ThreeWay:
    block = 12
    def __init__(self, key):
        k = [struct.unpack('>I', key[4 * i:4 * i + 4])[0] for i in range(3)]
        k = list(theta(*k)); k = list(mu(*k))
        self.k = [rev_bytes(x) for x in k]
    def decrypt_block(self, b):
        a0, a1, a2 = struct.unpack('<3I', b)
        k = self.k; rc = 0xB1B1
        a0, a1, a2 = mu(a0, a1, a2)
        for _ in range(11):
            a0 ^= k[0] ^ ((rc << 16) & M); a1 ^= k[1]; a2 ^= k[2] ^ rc
            a0, a1, a2 = theta(a0, a1, a2); a0, a1, a2 = pi_gamma_pi(a0, a1, a2)
            rc <<= 1
            if rc & 0x10000: rc ^= 0x11011
        a0 ^= k[0] ^ ((rc << 16) & M); a1 ^= k[1]; a2 ^= k[2] ^ rc
        a0, a1, a2 = theta(a0, a1, a2); a0, a1, a2 = mu(a0, a1, a2)
        return struct.pack('<3I', a0 & M, a1 & M, a2 & M)

class TEA:
    # BouncyCastle TeaEngine: 32 rounds, big-endian words
    block = 8
    DELTA = 0x9E3779B9
    def __init__(self, key):
        self.k = struct.unpack('>4I', key[:16])
    def decrypt_block(self, b):
        v0, v1 = struct.unpack('>2I', b)
        a, bb, c, d = self.k
        s = (self.DELTA * 32) & M
        for _ in range(32):
            v1 = (v1 - ((((v0 << 4) + c) & M) ^ ((v0 + s) & M) ^ (((v0 >> 5) + d) & M))) & M
            v0 = (v0 - ((((v1 << 4) + a) & M) ^ ((v1 + s) & M) ^ (((v1 >> 5) + bb) & M))) & M
            s = (s - self.DELTA) & M
        return struct.pack('>2I', v0, v1)

GOST_SBOX = [
    4, 10, 9, 2, 13, 8, 0, 14, 6, 11, 1, 12, 7, 15, 5, 3,
    14, 11, 4, 12, 6, 13, 15, 10, 2, 3, 8, 1, 0, 7, 5, 9,
    5, 8, 1, 13, 10, 3, 4, 2, 14, 15, 12, 7, 6, 0, 9, 11,
    7, 13, 10, 1, 0, 8, 9, 15, 14, 4, 6, 12, 11, 2, 5, 3,
    6, 12, 7, 1, 5, 15, 13, 8, 4, 10, 9, 14, 0, 3, 11, 2,
    4, 11, 10, 0, 7, 2, 1, 13, 3, 6, 8, 5, 9, 12, 15, 14,
    13, 11, 4, 1, 3, 15, 5, 9, 0, 10, 14, 7, 6, 8, 2, 12,
    1, 15, 13, 0, 5, 7, 10, 4, 9, 2, 3, 14, 6, 11, 8, 12,
]

class GOST:
    # BouncyCastle Gost28147Engine (little-endian words) with the S-box of the client
    block = 8
    def __init__(self, key):
        self.k = struct.unpack('<8I', key[:32])
    @staticmethod
    def step(n1, key):
        cm = (key + n1) & M
        om = 0
        for i in range(8):
            om |= GOST_SBOX[16 * i + ((cm >> (4 * i)) & 0xF)] << (4 * i)
        return rol(om, 11)
    def decrypt_block(self, b):
        n1, n2 = struct.unpack('<2I', b)
        k = self.k
        for j in range(8):
            n1, n2 = n2 ^ self.step(n1, k[j]), n1
        for r in range(3):
            for j in range(7, -1, -1):
                if r == 2 and j == 0:
                    break
                n1, n2 = n2 ^ self.step(n1, k[j]), n1
        n2 = n2 ^ self.step(n1, k[0])
        return struct.pack('<2I', n1 & M, n2 & M)

CIPHERS = {0: TEA, 1: ThreeWay, 4: RC6, 7: GOST}

def block_decrypt(cipher, data):
    bs = cipher.block
    return b''.join(cipher.decrypt_block(data[i:i + bs]) for i in range(0, len(data), bs))

def modulus_decrypt(src):
    buf = bytearray(src)
    key1 = b'webzen#@!01webzen#@!01webzen#@!0'
    alg1, alg2 = buf[1] & 7, buf[0] & 7
    size = len(buf); data_size = size - 34
    c = CIPHERS[alg1](key1)
    block_size = 1024 - (1024 % c.block)
    if data_size > 4 * block_size:
        idx = 2 + (data_size >> 1)
        buf[idx:idx + block_size] = block_decrypt(c, bytes(buf[idx:idx + block_size]))
    if data_size > block_size:
        idx = size - block_size
        buf[idx:idx + block_size] = block_decrypt(c, bytes(buf[idx:idx + block_size]))
        idx = 2
        buf[idx:idx + block_size] = block_decrypt(c, bytes(buf[idx:idx + block_size]))
    key2 = bytes(buf[2:34])
    c = CIPHERS[alg2](key2)
    bsz = data_size - (data_size % c.block)
    if bsz > 0:
        buf[34:34 + bsz] = block_decrypt(c, bytes(buf[34:34 + bsz]))
    return bytes(buf[34:])

XOR_KEY = bytes([0xD1, 0x73, 0x52, 0xF6, 0xD2, 0x9A, 0xCB, 0x27, 0x3E, 0xAF, 0x59, 0x31, 0x37, 0xB3, 0xE7, 0xA2])
def encrypt_map_file(src):
    out = bytearray(len(src)); key = 0x5E
    for i, b in enumerate(src):
        out[i] = ((b + key) & 0xFF) ^ XOR_KEY[i % 16]
        key = (out[i] + 0x3D) & 0xFF
    return bytes(out)

if __name__ == '__main__' and len(__import__('sys').argv) == 1:
    # RC6 test vector (zero key, zero block)
    print('rc6', RC6(bytes(16)).encrypt_block(bytes(16)).hex(), 'expected 8fc3a53656b1f778c129df4e9848a41e')
    print('rc6 dec', RC6(bytes(16)).decrypt_block(RC6(bytes(16)).encrypt_block(b'0123456789abcdef')))


# Usage (the terrain of a map of a newer client, e.g. World12 of Blood Castle 1):
#   python3 tools/modulusCryptor.py map Data/World12/EncTerrain12.map public/game-assets/World12/EncTerrain12.map
#   python3 tools/modulusCryptor.py att <TerrainData hex of OpenMU> <map number + 1> public/game-assets/World12/EncTerrain12.att
# .map: MAP\x01 files are decrypted and written with the old XOR encryption
# that the client reads. .att: built from the TerrainData of the map in the
# OpenMU database (config."GameMapDefinition"), which is already decrypted
# (its ATT\x01 files use MARS, not ported).
def main(argv):
    kind = argv[1]
    if kind == 'map':
        raw = open(argv[2], 'rb').read()
        plain = modulus_decrypt(raw[4:]) if raw[:4] == b'MAP\x01' else None
        if plain is None:
            raise SystemExit('not a MAP\\x01 file')
        open(argv[3], 'wb').write(encrypt_map_file(plain))
    elif kind == 'att':
        td = bytes.fromhex(open(argv[2]).read().strip())
        bux = bytes([0xFC, 0xCF, 0xAB])
        plain = bytes([0, int(argv[3]), 255, 255]) + td[3:]
        buxed = bytes(b ^ bux[i % 3] for i, b in enumerate(plain))
        open(argv[4], 'wb').write(encrypt_map_file(buxed))

if __name__ == '__main__' and len(__import__('sys').argv) > 1:
    main(__import__('sys').argv)
