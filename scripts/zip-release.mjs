import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { deflateRawSync, crc32 } from 'node:zlib';

const DIST_DIR = 'dist';
const OUT_FILE = join('release', 'nekoweb.zip');

/**
 * @param {number} value
 * @param {number} size
 */
function le(value, size) {
	const buffer = Buffer.alloc(size);
	if (size === 2) buffer.writeUInt16LE(value);
	else buffer.writeUInt32LE(value);
	return buffer;
}

/**
 * @param {Date} date
 */
function dosDateTime(date) {
	const year = Math.max(date.getFullYear(), 1980);
	const dosTime =
		(date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
	const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
	return { dosTime, dosDate };
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function walkFiles(dir) {
	const files = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) files.push(...await walkFiles(path));
		else if (entry.isFile()) files.push(path);
	}
	return files;
}

try {
	await stat(DIST_DIR);
} catch {
	console.error('No dist/ folder found. Run "npm run build" first, or use "npm run release".');
	process.exit(1);
}

const files = await walkFiles(DIST_DIR);
if (files.length === 0) {
	console.error('dist/ is empty. Run "npm run build" first, or use "npm run release".');
	process.exit(1);
}

const localChunks = [];
const centralChunks = [];
let offset = 0;

for (const filePath of files) {
	const source = await readFile(filePath);
	const name = relative(DIST_DIR, filePath).split('\\').join('/');
	const nameBytes = Buffer.from(name, 'utf8');
	const { mtime } = await stat(filePath);
	const { dosTime, dosDate } = dosDateTime(mtime);
	const checksum = crc32(source);

	const deflated = deflateRawSync(source);
	const useStore = deflated.length >= source.length;
	const payload = useStore ? source : deflated;
	const method = useStore ? 0 : 8;

	const localHeader = Buffer.concat([
		Buffer.from([0x50, 0x4b, 0x03, 0x04]),
		le(20, 2),
		le(0, 2),
		le(method, 2),
		le(dosTime, 2),
		le(dosDate, 2),
		le(checksum, 4),
		le(payload.length, 4),
		le(source.length, 4),
		le(nameBytes.length, 2),
		le(0, 2),
		nameBytes,
	]);

	localChunks.push(localHeader, payload);

	centralChunks.push(Buffer.concat([
		Buffer.from([0x50, 0x4b, 0x01, 0x02]),
		le(20, 2),
		le(20, 2),
		le(0, 2),
		le(method, 2),
		le(dosTime, 2),
		le(dosDate, 2),
		le(checksum, 4),
		le(payload.length, 4),
		le(source.length, 4),
		le(nameBytes.length, 2),
		le(0, 2),
		le(0, 2),
		le(0, 2),
		le(0, 2),
		le(0, 4),
		le(offset, 4),
		nameBytes,
	]));

	offset += localHeader.length + payload.length;
}

const centralDirectory = Buffer.concat(centralChunks);
const endRecord = Buffer.concat([
	Buffer.from([0x50, 0x4b, 0x05, 0x06]),
	le(0, 2),
	le(0, 2),
	le(files.length, 2),
	le(files.length, 2),
	le(centralDirectory.length, 4),
	le(offset, 4),
	le(0, 2),
]);

await mkdir('release', { recursive: true });
await writeFile(OUT_FILE, Buffer.concat([...localChunks, centralDirectory, endRecord]));

const sizeKb = Math.round((offset + centralDirectory.length + endRecord.length) / 1024);
console.log(`Wrote ${OUT_FILE} (${files.length} files, ${sizeKb} KB)`);
