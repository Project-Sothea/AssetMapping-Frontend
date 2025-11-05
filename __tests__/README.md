# Frontend Test Suite

Quick test runner for priority tests.

## Run All Tests

```bash
npm test
```

## Run Specific Test Suites

```bash
# Unit tests only
npm test -- __tests__/unit

# Integration tests only
npm test -- __tests__/integration

# Specific test file
npm test -- __tests__/unit/db-utils.test.ts
```

## Test Coverage

```bash
npm test -- --coverage
```

## Watch Mode (Auto-run on changes)

```bash
npm test -- --watch
```

## Test Results

The test suite covers:

### ✅ Unit Tests

- **db-utils.test.ts** - Database sanitization and parsing
- **uri-utils.test.ts** - Image URI detection and filename generation

### ✅ Integration Tests

- **imageStorage.integration.test.ts** - File save/delete operations

### Priority Coverage

- ✅ Database sanitization
- ✅ Image storage operations
- ✅ URI validation
- ✅ Error handling

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test
```

Tests are configured to run with Jest and use mocked filesystem/database operations for speed and reliability.
