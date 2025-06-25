module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../'],
  testMatch: [
    '**/test/**/*.e2e-spec.ts',
    '**/e2e/**/*.spec.ts',
    '**/tests/e2e/**/*.e2e.spec.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/setup.ts', '<rootDir>/setup-e2e.ts'],
  testTimeout: 30000,
}; 