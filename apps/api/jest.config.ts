export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^../../prisma/prisma.service$': '<rootDir>/prisma/prisma.service.ts',
    '^@starium-orchestra/budget-exercise-calendar$':
      '<rootDir>/../../../packages/budget-exercise-calendar/dist/index.js',
  },
};
