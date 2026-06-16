import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/html.ts',
    'src/markdown.ts',
    'src/preact.ts',
    'src/react.ts',
    'src/solid.ts',
    'src/svelte.ts',
    'src/vue.ts',
  ],
  format: ['esm'],
  sourcemap: false,
  dts: { build: true },
  fixedExtension: false,
})
