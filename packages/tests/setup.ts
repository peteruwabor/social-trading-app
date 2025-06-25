// Global test setup for E2E tests
import { Test } from '@nestjs/testing';

// Global test timeout
jest.setTimeout(30000);

// Global beforeAll and afterAll hooks can be added here
beforeAll(async () => {
  // Setup global test environment
  console.log('Setting up E2E test environment...');
});

afterAll(async () => {
  // Cleanup global test environment
  console.log('Cleaning up E2E test environment...');
}); 