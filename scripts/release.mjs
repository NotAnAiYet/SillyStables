import { execFileSync, execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const CONSTS_PATH = 'src/consts.ts';
const LAST_UPDATED_RE = /^export const LAST_UPDATED = ".*";/m;

function lastUpdatedFromGit() {
	const date = execFileSync('git', ['log', '-1', '--format=%cd', '--date=short'], {
		encoding: 'utf8',
	}).trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		throw new Error(`Unexpected git date: ${date}`);
	}
	return date;
}

function run(command) {
	execSync(command, { stdio: 'inherit', shell: true });
}

const date = lastUpdatedFromGit();
const original = await readFile(CONSTS_PATH, 'utf8');
if (!LAST_UPDATED_RE.test(original)) {
	throw new Error('Could not find LAST_UPDATED in src/consts.ts');
}

const stamped = original.replace(LAST_UPDATED_RE, `export const LAST_UPDATED = "${date}";`);

try {
	if (stamped !== original) {
		await writeFile(CONSTS_PATH, stamped);
	}
	console.log(`LAST_UPDATED = ${date} (from git)`);
	run('astro build');
	run('node scripts/zip-release.mjs');
} finally {
	if (stamped !== original) {
		await writeFile(CONSTS_PATH, original);
	}
}
