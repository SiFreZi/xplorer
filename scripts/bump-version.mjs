// Increment the patch version of the Xplorer desktop app before a build.
//
// Bumps "version" in apps/src-tauri/tauri.conf.json (which drives the installer
// name and product version) and keeps the [package] version in Cargo.toml in
// sync. Uses targeted regex replacements so the rest of each file's formatting
// is preserved. Run with:  node scripts/bump-version.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tauriConfPath = join(root, 'apps/src-tauri/tauri.conf.json');
const cargoPath = join(root, 'apps/src-tauri/Cargo.toml');

const tauriConf = readFileSync(tauriConfPath, 'utf8');
const match = tauriConf.match(/"version":\s*"(\d+)\.(\d+)\.(\d+)"/);
if (!match) {
  console.error('bump-version: could not find a "version": "x.y.z" field in tauri.conf.json');
  process.exit(1);
}

const [major, minor, patch] = [Number(match[1]), Number(match[2]), Number(match[3])];
const current = `${major}.${minor}.${patch}`;
const next = `${major}.${minor}.${patch + 1}`;

writeFileSync(
  tauriConfPath,
  tauriConf.replace(/("version":\s*")\d+\.\d+\.\d+(")/, `$1${next}$2`),
);

// Keep the [package] version in Cargo.toml aligned (^version at line start only,
// so dependency `version = "..."` entries are left untouched).
const cargo = readFileSync(cargoPath, 'utf8');
writeFileSync(cargoPath, cargo.replace(/^version = "\d+\.\d+\.\d+"/m, `version = "${next}"`));

console.log(`bump-version: ${current} -> ${next}`);
