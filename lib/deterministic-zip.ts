import { createHash } from 'crypto';

interface ZipEntry {
  path: string;
  content: string;
}

function crc32(input: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

export function buildDeterministicZip(entries: ZipEntry[]): Buffer {
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
  const files = sorted.map((e) => ({ ...e, bytes: Buffer.from(e.content, 'utf8') }));

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.path, 'utf8');
    const crc = crc32(file.bytes);

    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.bytes.length),
      u32(file.bytes.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    ]);

    localParts.push(localHeader, file.bytes);

    const centralHeader = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.bytes.length),
      u32(file.bytes.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);

    centralParts.push(centralHeader);
    offset += localHeader.length + file.bytes.length;
  }

  const central = Buffer.concat(centralParts);
  const local = Buffer.concat(localParts);

  const eocd = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(local.length),
    u16(0),
  ]);

  return Buffer.concat([local, central, eocd]);
}

export function deterministicManifest(files: Array<{ path: string; content: string }>): { version: string; generatedAt: string; files: Array<{ path: string; sha256: string; bytes: number }> } {
  const generatedAt = '1970-01-01T00:00:00.000Z';
  return {
    version: '1.0.0',
    generatedAt,
    files: [...files]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((f) => ({
        path: f.path,
        sha256: createHash('sha256').update(f.content, 'utf8').digest('hex'),
        bytes: Buffer.byteLength(f.content, 'utf8'),
      })),
  };
}
