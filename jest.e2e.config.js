module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src/'],
  testEnvironment: 'node',
  testRegex: '[\\\\/]tests[\\\\/].*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@backend-foundation/authorization(|/.*)$':
      '<rootDir>/libs/authorization/src/$1',
    '^@backend-foundation/common(|/.*)$': '<rootDir>/libs/common/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@infra/(.*)$': '<rootDir>/src/infrastructure/$1',
  },
};
