/**
 * Read every file out of a ZIP, so one selected archive can carry a model and the files
 * it depends on.
 *
 * A browser cannot read a file the user did not pick, so an OBJ chosen on its own can
 * never reach its .mtl. Zipping the folder turns "pick three files" - which on iOS is
 * hidden behind a menu most people never find - into picking one.
 *
 * The central directory is read rather than scanning for local headers, because archives
 * written by Finder and the iOS Files app use data descriptors, which leave the sizes in
 * the local header set to zero.
 */

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_FILE_HEADER = 0x02014b50;

export async function listZipEntries(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  const end = findEndOfCentralDirectory(view, bytes.length);

  if (end === -1) {
    throw new Error('NOT_A_ZIP');
  }

  const count = view.getUint16(end + 10, true);
  const entries = [];
  let at = view.getUint32(end + 16, true);

  for (let index = 0; index < count && at + 46 <= bytes.length; index += 1) {
    if (view.getUint32(at, true) !== CENTRAL_FILE_HEADER) {
      break;
    }

    const method = view.getUint16(at + 10, true);
    const compressedSize = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localHeader = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));

    at += 46 + nameLength + extraLength + commentLength;

    // Directories and the metadata folders archivers add are not model files.
    if (name.endsWith('/') || name.startsWith('__MACOSX/') || name.split('/').pop().startsWith('.')) {
      continue;
    }

    entries.push({ name, method, compressedSize, localHeader });
  }

  const files = [];

  for (const entry of entries) {
    const data = await readEntryData(view, bytes, entry);

    if (data) {
      files.push({ name: entry.name, data });
    }
  }

  return files;
}

async function readEntryData(view, bytes, entry) {
  const at = entry.localHeader;

  if (view.getUint32(at, true) !== 0x04034b50) {
    return null;
  }

  const nameLength = view.getUint16(at + 26, true);
  const extraLength = view.getUint16(at + 28, true);
  const start = at + 30 + nameLength + extraLength;
  const payload = bytes.subarray(start, start + entry.compressedSize);

  if (entry.method === 0) {
    return payload.slice();
  }

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('UNZIP_UNSUPPORTED');
  }

  const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEndOfCentralDirectory(view, length) {
  // The record sits at the end, after a comment of up to 64KB.
  const earliest = Math.max(0, length - 0xffff - 22);

  for (let at = length - 22; at >= earliest; at -= 1) {
    if (view.getUint32(at, true) === END_OF_CENTRAL_DIRECTORY) {
      return at;
    }
  }

  return -1;
}
