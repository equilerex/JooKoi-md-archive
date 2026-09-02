module.exports = {
  displayName: 'api',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@shared/models$': '<rootDir>/../shared/src/models',
  },
  testMatch: ['**/?(*.)+(spec|test).?([mc])[jt]s?(x)'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'require', 'default'],
  },
  passWithNoTests: true,
  coverageDirectory: '../coverage/api',
};
