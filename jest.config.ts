// jest.config.ts
import nextJest from 'next/jest';
const createJestConfig = nextJest({ dir: './' });
export default createJestConfig({
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
});
