import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'main.ts',
  output: {
    dir: '.',
    format: 'cjs',
    exports: 'auto',
  },
  plugins: [nodeResolve(), typescript()],
  external: ['obsidian', 'child_process'],
};
