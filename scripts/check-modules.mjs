import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function collectJavaScriptFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectJavaScriptFiles(fullPath);
    }
    return /\.(mjs|js)$/.test(entry.name) ? [fullPath] : [];
  });
}

const moduleFiles = [...collectJavaScriptFiles('src'), ...collectJavaScriptFiles('scripts')];

for (const file of moduleFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log(`Checked ${moduleFiles.length} JavaScript modules.`);
