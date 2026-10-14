import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('site');
const output = resolve('docs/.vitepress/dist');
if (!existsSync(resolve(source, 'index.html')) || !existsSync(resolve(source, 'games.json'))) {
  throw new Error('Missing portal source files');
}
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(source, output, { recursive: true });
writeFileSync(resolve(output, '.nojekyll'), '');
console.log('Navigation portal built:', output);
