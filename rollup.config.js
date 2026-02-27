// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
   input: 'src/index.ts',
   output: [
      {
         file: './module/fantastic-depths.js',
         format: 'es',
         sourcemap: true,               // <-- map for the unminified bundle
      },
      {
         file: './module/fantastic-depths.min.js',
         format: 'es',
         sourcemap: true,               // <-- map for the minified bundle
         plugins: [terser()],
      },
   ],
   plugins: [typescript()],
};