import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  vue: true,
  typescript: {
    tsconfigRootDir: import.meta.dirname,
  },
  ignores: [
    '**/dist/**',
    '**/.output/**',
    '**/.wxt/**',
    '**/.astro/**',
    '**/.turbo/**',
    'design/**',
    '**/*.md',
  ],
})
