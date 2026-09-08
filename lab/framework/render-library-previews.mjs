import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LIBRARY_TEMPLATES } from './library-templates.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = fileURLToPath(new URL('../../bin/press.mjs', import.meta.url));

function render(id) {
  const source = fileURLToPath(new URL(`../../example/compositions/${id}.json`, import.meta.url));
  const output = fileURLToPath(new URL(`./previews/${id}.png`, import.meta.url));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      cli, 'render', source, '--format', 'png', '--scale', '0.6875', '--out', output,
    ], { cwd: root, stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Preview ${id} failed (${signal || `exit ${code}`}).`));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1) throw new Error('Usage: pnpm library:previews [exact-template-id]');
  const selected = args.length
    ? LIBRARY_TEMPLATES.filter(item => item.spec.id === args[0])
    : LIBRARY_TEMPLATES;
  if (!selected.length) throw new Error(`Unknown library template: ${args[0]}`);
  // Use the canonical CLI sequentially, including its font and export checks.
  // A 1600px artboard at this scale produces an 1100px-wide thumbnail.
  for (const item of selected) await render(item.spec.id);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
