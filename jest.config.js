module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '\\.e2e-spec\\.ts$'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  roots: ['<rootDir>/src/', '<rootDir>/libs/'],
  moduleNameMapper: {
    '^@nestjs/bullmq$': '<rootDir>/test/mocks/nest-bullmq.ts',
    '^cookie$': '<rootDir>/test/mocks/cookie.ts',
    '^@backend-foundation/authorization(|/.*)$':
      '<rootDir>/libs/authorization/src/$1',
    '^@backend-foundation/common(|/.*)$': '<rootDir>/libs/common/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@infra/(.*)$': '<rootDir>/src/infrastructure/$1',
  },
};
