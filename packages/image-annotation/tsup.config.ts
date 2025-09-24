import { defineConfig } from 'tsup';

export default defineConfig((options) => {
  const env = options.env?.NODE_ENV;
  return {
    treeshake: true,
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    clean: true,
    dts: env === 'production',
    minify: env === 'production',
    outDir: 'dist',
    sourcemap: env === 'development',
    outExtension({ format }) {
      return {
        js: format === 'esm' ? '.js' : '.cjs',
      };
    },
  };
});
