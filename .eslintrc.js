module.exports = {
  root: true,
  extends: [
    '@typescript-eslint/recommended',
    'eslint:recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // Import boundaries enforcement
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../../../*', '../../apps/*', '../apps/*'],
            message: 'Packages cannot import from apps directory',
          },
          {
            group: ['**/dist/*', '**/build/*'],
            message: 'Do not import from build directories, use package exports',
          }
        ],
      },
    ],
    
    // TypeScript strict rules
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    
    // Complexity limits
    'complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-lines-per-function': ['error', 50],
    
    // General code quality
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  overrides: [
    {
      files: ['*.test.ts', '*.spec.ts'],
      rules: {
        'max-lines-per-function': 'off', // Allow longer test functions
      },
    },
    {
      files: ['apps/backend/**/*'],
      rules: {
        'no-console': 'off', // Allow console in backend
      },
    },
  ],
};