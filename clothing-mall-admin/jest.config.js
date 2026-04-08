module.exports = {
  moduleFileExtensions: ['js', 'jsx', 'json', 'vue'],
  transform: {
    '^.+\\.vue$': 'vue-jest',
    '.+\\.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$':
      'jest-transform-stub',
    '^.+\\.jsx?$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  snapshotSerializers: ['jest-serializer-vue'],
  testMatch: [
    '**/tests/**/*.spec.(js|jsx|ts|tsx)',
    '**/__tests__/*.(js|jsx|ts|tsx)'
  ],
  collectCoverageFrom: [
    'src/utils/**/*.{js,vue}',
    '!src/utils/auth.js',
    '!src/utils/request.js',
    'src/components/**/*.{js,vue}'
  ],
  coverageDirectory: '<rootDir>/tests/coverage',
  coverageReporters: [
    'lcov',
    'text-summary',
    'html'
  ],
  testURL: 'http://localhost/',
  setupFiles: ['<rootDir>/tests/setup.js'],
  verbose: true
}
