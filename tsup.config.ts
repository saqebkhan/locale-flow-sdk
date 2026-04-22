import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
