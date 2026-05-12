import { runA } from './a.js';

async function main(): Promise<string> {
  return runA();
}

main().catch(() => {
  process.exit(1);
});
