// ESLint config for Expo JS + TS: https://docs.expo.dev/guides/linting/
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['.expo/', 'coverage/'],
  settings: {
    'import/resolver': {
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    },
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.{js,jsx,ts,tsx}', '**/*.{test,spec}.{js,jsx,ts,tsx}'],
      env: { jest: true },
    },
    {
      files: ['*.config.js', '.*rc.js'],
      env: { node: true },
    },
  ],
};
