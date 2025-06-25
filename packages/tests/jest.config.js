module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../'],
  testMatch: [
    '**/tests/unit/**/*.spec.ts',
    '**/tests/e2e/**/*.spec.ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleDirectories: ['node_modules', '<rootDir>/../'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 10000,
  moduleNameMapper: {
    '^@gioat/(.*)$': '<rootDir>/../$1/src',
    '^@/(.*)$': '<rootDir>/../api/src/$1',
  },
  collectCoverageFrom: [
    'packages/api/src/**/*.ts',
    '!packages/api/src/**/*.spec.ts',
    '!packages/api/src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}; 