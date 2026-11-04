/**
 * Zero-dependency, pure TypeScript QR Code (Model 2) Generator.
 * Encodes text into Byte Mode (ISO-8859-1 / UTF-8) with Reed-Solomon Error Correction
 * and outputs crisp SVG markup or a boolean matrix.
 */

// Error Correction Levels
export type QrEccLevel = 'L' | 'M' | 'Q' | 'H';

// QR Code Version Capacity table (Byte mode) for ECC levels L, M, Q, H
// Versions 1 to 10 cover up to 271 bytes, perfect for URLs.
interface VersionInfo {
  version: number;
  totalCodewords: number;
  eccCodewordsPerBlock: Record<QrEccLevel, number>;
  numBlocks: Record<QrEccLevel, number>;
  capacityBytes: Record<QrEccLevel, number>;
  alignmentPatterns: number[];
}

const VERSION_TABLE: VersionInfo[] = [
  { version: 1, totalCodewords: 26, eccCodewordsPerBlock: { L: 7, M: 10, Q: 13, H: 17 }, numBlocks: { L: 1, M: 1, Q: 1, H: 1 }, capacityBytes: { L: 19, M: 16, Q: 13, H: 9 }, alignmentPatterns: [] },
  { version: 2, totalCodewords: 44, eccCodewordsPerBlock: { L: 10, M: 16, Q: 22, H: 28 }, numBlocks: { L: 1, M: 1, Q: 1, H: 1 }, capacityBytes: { L: 34, M: 28, Q: 22, H: 16 }, alignmentPatterns: [6, 18] },
  { version: 3, totalCodewords: 70, eccCodewordsPerBlock: { L: 15, M: 26, Q: 18, H: 22 }, numBlocks: { L: 1, M: 1, Q: 2, H: 2 }, capacityBytes: { L: 55, M: 44, Q: 34, H: 26 }, alignmentPatterns: [6, 22] },
  { version: 4, totalCodewords: 100, eccCodewordsPerBlock: { L: 20, M: 18, Q: 26, H: 16 }, numBlocks: { L: 1, M: 2, Q: 2, H: 4 }, capacityBytes: { L: 80, M: 64, Q: 48, H: 36 }, alignmentPatterns: [6, 26] },
  { version: 5, totalCodewords: 134, eccCodewordsPerBlock: { L: 26, M: 24, Q: 18, H: 22 }, numBlocks: { L: 1, M: 2, Q: 4, H: 4 }, capacityBytes: { L: 108, M: 86, Q: 62, H: 46 }, alignmentPatterns: [6, 30] },
  { version: 6, totalCodewords: 172, eccCodewordsPerBlock: { L: 18, M: 16, Q: 24, H: 28 }, numBlocks: { L: 2, M: 4, Q: 4, H: 4 }, capacityBytes: { L: 136, M: 108, Q: 76, H: 60 }, alignmentPatterns: [6, 34] },
  { version: 7, totalCodewords: 196, eccCodewordsPerBlock: { L: 20, M: 18, Q: 18, H: 26 }, numBlocks: { L: 2, M: 4, Q: 6, H: 5 }, capacityBytes: { L: 156, M: 124, Q: 88, H: 66 }, alignmentPatterns: [6, 22, 38] },
  { version: 8, totalCodewords: 242, eccCodewordsPerBlock: { L: 24, M: 22, Q: 22, H: 26 }, numBlocks: { L: 2, M: 4, Q: 6, H: 6 }, capacityBytes: { L: 194, M: 154, Q: 110, H: 86 }, alignmentPatterns: [6, 24, 42] },
  { version: 9, totalCodewords: 292, eccCodewordsPerBlock: { L: 30, M: 22, Q: 20, H: 24 }, numBlocks: { L: 2, M: 5, Q: 8, H: 8 }, capacityBytes: { L: 232, M: 182, Q: 132, H: 100 }, alignmentPatterns: [6, 26, 46] },
  { version: 10, totalCodewords: 346, eccCodewordsPerBlock: { L: 18, M: 26, Q: 24, H: 28 }, numBlocks: { L: 4, M: 5, Q: 8, H: 8 }, capacityBytes: { L: 274, M: 216, Q: 154, H: 122 }, alignmentPatterns: [6, 28, 50] }
];

// Galois Field GF(256) tables for Reed-Solomon encoding
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d; // Primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
  }
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

// Compute Reed-Solomon error correction generator polynomial
function getRsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMultiply(poly[j], factor);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

// Compute Reed-Solomon remainder (ECC codewords)
function computeReedSolomon(data: Uint8Array, eccCount: number): Uint8Array {
  const genPoly = getRsGeneratorPoly(eccCount);
  const remainder = new Uint8Array(eccCount);

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[eccCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < eccCount; j++) {
        remainder[j] ^= gfMultiply(genPoly[j], factor);
      }
    }
  }

  return remainder;
}

// Bit buffer helper
class BitBuffer {
  private bits: number[] = [];

  public put(val: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((val >>> i) & 1);
    }
  }

  public getBits(): number[] {
    return this.bits;
  }

  public toByteArray(): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(this.bits.length / 8));
    for (let i = 0; i < this.bits.length; i++) {
      bytes[Math.floor(i / 8)] |= this.bits[i] << (7 - (i % 8));
    }
    return bytes;
  }
}

/**
 * Encodes text into QR matrix.
 */
export function generateQrMatrix(text: string, eccLevel: QrEccLevel = 'M'): boolean[][] {
  const utf8Bytes = Buffer.from(text, 'utf-8');

  // Find lowest suitable version
  let targetVersion: VersionInfo | undefined;
  for (const v of VERSION_TABLE) {
    if (utf8Bytes.length <= v.capacityBytes[eccLevel]) {
      targetVersion = v;
      break;
    }
  }

  if (!targetVersion) {
    // Fall back to version 10 if exceeds
    targetVersion = VERSION_TABLE[VERSION_TABLE.length - 1];
  }

  const version = targetVersion.version;
  const size = 17 + 4 * version;

  // 1. Data Encoding in Byte Mode (mode indicator 0100)
  const bb = new BitBuffer();
  bb.put(0b0100, 4); // Byte mode
  const countBits = version <= 9 ? 8 : 16;
  bb.put(utf8Bytes.length, countBits);
  for (let i = 0; i < utf8Bytes.length; i++) {
    bb.put(utf8Bytes[i], 8);
  }

  // Terminator (up to 4 zeroes)
  const totalDataBits = (targetVersion.capacityBytes[eccLevel] + 4) * 8; // approx target data capacity
  const numDataCodewords = targetVersion.totalCodewords - (targetVersion.eccCodewordsPerBlock[eccLevel] * targetVersion.numBlocks[eccLevel]);
  const maxBits = numDataCodewords * 8;

  const termLength = Math.min(4, maxBits - bb.getBits().length);
  if (termLength > 0) {
    bb.put(0, termLength);
  }

  // Pad to byte boundary
  while (bb.getBits().length % 8 !== 0) {
    bb.put(0, 1);
  }

  // Pad bytes (alternating 0xEC and 0x11)
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bb.getBits().length < maxBits) {
    bb.put(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataCodewords = bb.toByteArray().slice(0, numDataCodewords);

  // 2. Error Correction Codewords computation
  const eccPerBlock = targetVersion.eccCodewordsPerBlock[eccLevel];
  const numBlocks = targetVersion.numBlocks[eccLevel];
  const blockSize = Math.floor(numDataCodewords / numBlocks);

  const dataBlocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];

  let offset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const curBlockSize = blockSize + (b >= numBlocks - (numDataCodewords % numBlocks) ? 1 : 0);
    const blockData = dataCodewords.slice(offset, offset + curBlockSize);
    dataBlocks.push(blockData);
    eccBlocks.push(computeReedSolomon(blockData, eccPerBlock));
    offset += curBlockSize;
  }

  // Interleave data codewords
  const finalCodewords: number[] = [];
  const maxBlockLen = Math.max(...dataBlocks.map((d) => d.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b].length) {
        finalCodewords.push(dataBlocks[b][i]);
      }
    }
  }

  // Interleave ECC codewords
  for (let i = 0; i < eccPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < eccBlocks[b].length) {
        finalCodewords.push(eccBlocks[b][i]);
      }
    }
  }

  // 3. Grid Initialization
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );

  // Finder patterns at top-left, top-right, bottom-left
  const placeFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr < 0 || mr >= size || mc < 0 || mc >= size) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[mr][mc] = true;
          } else {
            matrix[mr][mc] = false;
          }
        } else {
          matrix[mr][mc] = false; // separator
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Alignment patterns
  const alignCoords = targetVersion.alignmentPatterns;
  if (alignCoords.length > 0) {
    for (const r of alignCoords) {
      for (const c of alignCoords) {
        // Skip if overlapping finder patterns
        if (
          (r <= 8 && c <= 8) ||
          (r <= 8 && c >= size - 8) ||
          (r >= size - 8 && c <= 8)
        ) {
          continue;
        }
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            matrix[r + dr][c + dc] = isBorder || isCenter;
          }
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  matrix[size - 8][8] = true;

  // Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = 0; i < 8; i++) {
    if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = false;
    if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = false;
  }

  // 4. Place Data Codewords in zigzag layout
  const allBits: number[] = [];
  for (const byte of finalCodewords) {
    for (let bit = 7; bit >= 0; bit--) {
      allBits.push((byte >>> bit) & 1);
    }
  }

  let bitIdx = 0;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column

    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const col of [right, right - 1]) {
        if (matrix[row][col] === null) {
          const bitVal = bitIdx < allBits.length ? allBits[bitIdx] : 0;
          bitIdx++;

          // Apply Mask Pattern 0: (row + col) % 2 === 0
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = (bitVal === 1) !== mask;
        }
      }
    }
    upward = !upward;
  }

  // 5. Place Format Information (Mask 0, Level M = 00 + 000 = 00000 -> 101010000010010)
  // Mask pattern 0 (000), ECC Level M (00): format bits with BCH: 101010000010010
  // Standard format string for (M, mask 0): 0b101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  // Top-left
  matrix[8][0] = formatBits[0] === 1;
  matrix[8][1] = formatBits[1] === 1;
  matrix[8][2] = formatBits[2] === 1;
  matrix[8][3] = formatBits[3] === 1;
  matrix[8][4] = formatBits[4] === 1;
  matrix[8][5] = formatBits[5] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  matrix[5][8] = formatBits[9] === 1;
  matrix[4][8] = formatBits[10] === 1;
  matrix[3][8] = formatBits[11] === 1;
  matrix[2][8] = formatBits[12] === 1;
  matrix[1][8] = formatBits[13] === 1;
  matrix[0][8] = formatBits[14] === 1;

  // Split copy at bottom-left and top-right
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatBits[i] === 1;
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = formatBits[7 + i] === 1;
  }

  return matrix.map((row) => row.map((cell) => cell ?? false));
}

/**
 * Generate a standalone, lightweight SVG string for the QR Code.
 */
export function generateQrSvg(
  text: string,
  options?: {
    size?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): string {
  const matrix = generateQrMatrix(text);
  const matrixSize = matrix.length;
  const margin = options?.margin ?? 2;
  const totalSize = matrixSize + margin * 2;
  const targetPx = options?.size ?? 180;
  const darkColor = options?.darkColor ?? 'currentColor';
  const lightColor = options?.lightColor ?? 'transparent';

  let pathData = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        pathData += `M${c + margin},${r + margin}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${targetPx}" height="${targetPx}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="${lightColor}" />
  <path d="${pathData.trim()}" fill="${darkColor}" />
</svg>`;
}
