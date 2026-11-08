/**
 * scripts/bump-version.mjs — 打包前把客户端 patch 版本号 +1
 *
 * 同步更新四处版本号:package.json / package-lock.json(顶层与 packages."" 两处) /
 * src-tauri/tauri.conf.json / src-tauri/Cargo.toml(Cargo.lock 由 cargo 在构建时
 * 自动跟进)。用法:`npm run package`。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const pkgPath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');
const confPath = path.join(root, 'src-tauri/tauri.conf.json');
const cargoPath = path.join(root, 'src-tauri/Cargo.toml');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
const [major, minor, patch] = version.split('.').map(Number);
const next = `${major}.${minor}.${patch + 1}`;

const bumpJson = (p, v) => {
  const text = readFileSync(p, 'utf8');
  const re = new RegExp(`("version"\\s*:\\s*")${version.replace(/\./g, '\\.')}(")`);
  if (!re.test(text)) throw new Error(`package.json 版本号不匹配: ${v}`);
  writeFileSync(p, text.replace(re, `$1${next}$2`));
};
const bumpCargo = (p) => {
  const text = readFileSync(p, 'utf8');
  const re = new RegExp(`^(version\\s*=\\s*")${version.replace(/\./g, '\\.')}(")`, 'm');
  if (!re.test(text)) throw new Error(`Cargo.toml 版本号不匹配: ${version}`);
  writeFileSync(p, text.replace(re, `$1${next}$2`));
};
// lockfile 顶层与根包条目各有一处 version 字段(纯信息字段,但漂移会误导)。
const bumpLock = (p) => {
  const lock = JSON.parse(readFileSync(p, 'utf8'));
  lock.version = next;
  if (lock.packages?.['']) {
    lock.packages[''].version = next;
  }
  writeFileSync(p, `${JSON.stringify(lock, null, 2)}\n`);
};

bumpJson(pkgPath, version);
bumpLock(lockPath);
bumpJson(confPath, version);
bumpCargo(cargoPath);
console.log(`[bump-version] ${version} → ${next}`);
