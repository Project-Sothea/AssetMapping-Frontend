# Code Quality Guidelines

**Last Updated:** October 18, 2025

## Core Principles

### 1. DRY (Don't Repeat Yourself)
- **No code duplication**: Extract shared logic into utilities, base classes, or factories
- **Single source of truth**: One place for each concept (e.g., field mappings, conversions)
- **Before adding code**: Check if similar logic exists elsewhere
- **Threshold**: If used 3+ times, extract it

### 2. Minimal Lines of Code (LOC)
- **Target**: Reduce LOC while maintaining readability
- **Refactoring metrics**: Aim for 20-30% reduction in duplicated code
- **Quality > Quantity**: But concise code is usually better code
- **Delete obsolete code**: Remove unused imports, functions, comments

### 3. Type Safety First
- **Strict TypeScript**: Enable strict mode, avoid `any`
- **Explicit types**: For function parameters, return values, and complex objects
- **Type inference**: Use where it improves readability (e.g., const assignments)
- **Shared types**: Define in `shared/types/` for cross-cutting concerns

## Code Organization

### File Structure
```
/project-root
├── app/                    # Expo Router screens
├── apis/                   # Backend API clients
├── db/                     # Database schemas
│   └── schema/            # Modular schema definitions
├── features/              # Feature-specific logic
├── services/              # Business logic & repositories
├── shared/                # Shared utilities & types
│   ├── components/       # Reusable UI components
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Utility functions
├── hooks/                 # Custom React hooks
├── providers/            # React context providers
├── utils/                # Legacy utils (migrate to shared/)
└── docs/                 # Documentation
    ├── guides/           # User-facing guides
    ├── development/      # Developer reference
    └── archive/          # Historical context
```

### Naming Conventions

#### Files
- **Components**: PascalCase (e.g., `MapView.tsx`)
- **Utilities**: camelCase (e.g., `caseConversion.ts`)
- **Types**: PascalCase (e.g., `FormTypes.ts`)
- **Hooks**: camelCase starting with `use` (e.g., `useRemoteToLocalSync.ts`)

#### Variables & Functions
- **camelCase**: For variables, functions, methods
- **PascalCase**: For classes, types, interfaces, React components
- **UPPER_SNAKE_CASE**: For constants only
- **Descriptive names**: `getUserById` not `getUser`, `isFormValid` not `check`

#### Database Fields
- **SQLite (code)**: camelCase (e.g., `createdAt`)
- **PostgreSQL (code)**: snake_case (e.g., `created_at`)
- **Conversion**: Use `shared/utils/caseConversion.ts` helpers

## Architecture Patterns

### 1. Repository Pattern
```typescript
// Base repository with shared methods
abstract class BaseLocalRepository<T> {
  abstract getAll(): Promise<T[]>;
  abstract getById(id: string): Promise<T | null>;
  abstract create(data: T): Promise<T>;
  // ... common methods
}

// Specific repositories extend base
class DrizzlePinRepo extends BaseLocalRepository<Pin> {
  // Only pin-specific logic here
}
```

### 2. Factory Pattern
```typescript
// Generic factory for similar APIs
function createSupabaseAPI<T>(config: APIConfig) {
  return {
    getAll: () => supabase.from(config.table).select(),
    getById: (id) => supabase.from(config.table).select().eq('id', id),
    // ... shared methods
  };
}

// Usage
const pinAPI = createSupabaseAPI({ table: 'pins', schema: pinSchema });
```

### 3. Utility Extraction
- **Location**: `shared/utils/`
- **When**: Logic used in 3+ places
- **Documentation**: Full JSDoc with examples
- **Testing**: Unit tests for all utilities

## Documentation Standards

### File Headers
```typescript
/**
 * @fileoverview Brief description of what this file does
 * @module path/to/module
 */
```

### Function Documentation
```typescript
/**
 * Converts an object's keys from camelCase to snake_case
 * 
 * @param obj - The object to convert
 * @param options - Conversion options (depth, exclusions)
 * @returns New object with snake_case keys
 * 
 * @example
 * ```typescript
 * toSnakeCase({ firstName: 'John' }) // { first_name: 'John' }
 * ```
 */
function toSnakeCase(obj: Record<string, any>, options?: ConversionOptions) {
  // ...
}
```

### Complex Logic
- **Inline comments**: Explain *why*, not *what*
- **Block comments**: For algorithms or business logic
- **TODO comments**: With ticket number or date
  ```typescript
  // TODO(2025-10-18): Refactor when API v2 launches
  ```

## Testing Requirements

### Coverage
- **Utilities**: 100% coverage required
- **Services**: 80% coverage minimum
- **Components**: Test critical paths
- **E2E**: Test happy paths only

### Test Structure
```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {});
    it('should handle edge case', () => {});
    it('should throw on invalid input', () => {});
  });
});
```

### Mocking
- **Prefer**: Minimal mocking, test real behavior
- **Mock**: External APIs, database calls, file I/O
- **Avoid**: Over-mocking (makes tests brittle)

## Performance Guidelines

### Database
- **Batch operations**: Use bulk inserts/updates when possible
- **Indexes**: Add for frequently queried fields
- **Lazy loading**: Don't fetch related data unless needed
- **Connection pooling**: Use for remote databases

### React
- **Memoization**: Use `useMemo`/`useCallback` for expensive operations
- **Virtual lists**: For long lists (use FlashList, not FlatList)
- **Code splitting**: Lazy load screens/components
- **Image optimization**: Use appropriate sizes, caching

### Bundle Size
- **Tree shaking**: Use named imports
- **Dependencies**: Audit regularly, remove unused
- **Dynamic imports**: For large libraries used conditionally

## Code Review Checklist

Before committing:
- [ ] No duplicated code (checked for similar logic)
- [ ] All types explicit (no `any`, minimal inference)
- [ ] Functions < 50 lines (extracted if longer)
- [ ] Files < 300 lines (split if longer)
- [ ] All utilities documented (JSDoc with examples)
- [ ] All utilities tested (unit tests pass)
- [ ] No console.logs (use proper logging)
- [ ] No commented code (delete or uncomment)
- [ ] Imports organized (third-party, local, types)
- [ ] Naming consistent (follows conventions)

## Migration Guidelines

### From Legacy to Shared
1. **Identify**: Find duplicated logic
2. **Extract**: Move to `shared/utils/`
3. **Document**: Add JSDoc
4. **Test**: Create unit tests
5. **Refactor**: Update all call sites
6. **Verify**: All tests pass
7. **Delete**: Remove old duplicated code

### Database Schema Changes
1. **Update schema**: `db/schema/sqlite.ts` or `postgresql.ts`
2. **Generate migration**: `npm run db:generate` or `db:pg:generate`
3. **Review migration**: Check SQL is correct
4. **Test locally**: `npm run db:push`
5. **Test remote**: `npm run db:pg:push` (after review)
6. **Update types**: Regenerate if using Drizzle Studio

## Common Anti-Patterns to Avoid

❌ **Don't do this:**
```typescript
// Duplicated conversion logic
const snake = { first_name: obj.firstName, last_name: obj.lastName };

// Inline field mappings
if (field === 'firstName') return 'first_name';

// Magic strings
supabase.from('pins').select();

// Untyped functions
function process(data: any) { }
```

✅ **Do this instead:**
```typescript
// Use utility
const snake = toSnakeCase(obj);

// Use field mapping
const dbField = FIELD_MAPPINGS[field];

// Use constant
const TABLES = { PINS: 'pins' } as const;
supabase.from(TABLES.PINS).select();

// Explicit types
function process<T extends BaseEntity>(data: T): ProcessedEntity { }
```

## References
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
