# Next Tasks

**Created:** October 18, 2025  
**Status:** Ready for Phase C

## Immediate Tasks

### 1. Schema Sync Decision

**Decision needed:** Compare pulled schema vs local schema, then choose action:

- **Option A: Compare schemas**

  ```bash
  # Review what's in Supabase vs local
  cat drizzle/postgresql/schema.ts
  cat db/schema/postgresql.ts
  # Compare differences
  ```

- **Option B: Push local schema to Supabase**

  ```bash
  npm run db:pg:push
  ```

  - This will update Supabase to match `db/schema/postgresql.ts`
  - Review changes before confirming
  - Recommended if local schema is the source of truth

- **Option C: Pull and merge**
  - Use pulled schema if Supabase has the canonical schema
  - Update `db/schema/postgresql.ts` to match
  - Then regenerate migrations

**Context:** Connection test successful. Supabase has 3 tables, 69 columns, 1 foreign key. Local schema defines 2 tables (pins, forms) without sync_queue.

---

### 2. Phase C: Repository Refactoring

**Goal:** Reduce ~150 LOC through base classes

#### Tasks:

1. **Create base repositories**

   - `services/sync/repositories/BaseLocalRepository.ts`
     - Common methods: `getAll`, `getById`, `create`, `update`, `delete`, `bulkInsert`
     - Generic type parameter for entity type
     - Drizzle ORM integration
   - `services/sync/repositories/BaseRemoteRepository.ts`
     - Common methods: `getAll`, `getById`, `create`, `update`, `delete`, `batchUpsert`
     - Generic type parameter for entity type
     - Supabase integration
     - Error handling & retry logic

2. **Refactor existing repositories**

   - `DrizzlePinRepo` extends `BaseLocalRepository<Pin>`
   - `DrizzleFormRepo` extends `BaseLocalRepository<Form>`
   - `SupabasePinRepo` extends `BaseRemoteRepository<Pin>`
   - `SupabaseFormRepo` extends `BaseRemoteRepository<Form>`
   - Remove duplicated methods
   - Keep only entity-specific logic

3. **Testing**
   - Update repository tests
   - Verify all CRUD operations work
   - Test error handling

**Estimated Impact:**

- Before: ~600 LOC across 4 repositories
- After: ~450 LOC (2 base classes + 4 specific repos)
- Reduction: ~150 LOC
- Benefits: Consistent patterns, easier maintenance

---

### 3. Phase D: API Layer Factory

**Goal:** Reduce ~150 LOC through factory pattern

#### Tasks:

1. **Create API factory**

   - `shared/api/supabaseApi.ts`
   - `createSupabaseAPI<T>(config: APIConfig)` function
   - Extract common patterns from Forms and Pins APIs
   - Support for: filtering, sorting, pagination, relationships

2. **Refactor API files**

   - `apis/Forms/index.ts` - Use factory
   - `apis/Pins/index.ts` - Use factory
   - Keep only form/pin-specific logic
   - Remove duplicated Supabase calls

3. **Testing**
   - Test factory with mock config
   - Verify API calls still work
   - Test error handling

**Estimated Impact:**

- Before: ~400 LOC in API files
- After: ~250 LOC (factory + 2 API files)
- Reduction: ~150 LOC

---

### 4. Phase E: Final Code Quality

**Goal:** Polish and optimize

#### Tasks:

1. **Type definitions**

   - Add `DatabaseEntity` base interface
   - Add `LocalEntity` interface (with local-only fields)
   - Add `CaseConversionOptions` type
   - Export from `shared/types/`

2. **Naming consistency**

   - Review all function names
   - Ensure camelCase for functions
   - Ensure PascalCase for types/components
   - Update any inconsistencies

3. **Documentation**

   - Add JSDoc to all public functions
   - Update README with new structure
   - Remove obsolete TODOs
   - Add examples where helpful

4. **Final testing**
   - Run all test suites
   - Fix any failing tests
   - Verify app builds and runs
   - Test sync functionality end-to-end

**Final Target:**

- Total LOC reduction: ~420 lines
- Maintainability: 10x improvement
- Type safety: 100% (no `any` types)
- Test coverage: 80%+ for critical paths

---

## Decision Points

### Schema Strategy

- [ ] Compared Supabase schema vs local schema
- [ ] Decided: Push local → Supabase OR Pull Supabase → local
- [ ] Applied schema changes
- [ ] Verified schema sync working

### Repository Pattern

- [ ] Created base repository classes
- [ ] Refactored all 4 repositories
- [ ] Tests passing

### API Factory

- [ ] Created factory function
- [ ] Refactored API files
- [ ] Tests passing

### Code Quality

- [ ] All types explicit
- [ ] All utilities documented
- [ ] No duplicated code
- [ ] All tests passing

---

## Reference Commands

### Database Management

```bash
# SQLite (Local)
npm run db:generate    # Generate migrations
npm run db:push        # Apply migrations
npm run db:studio      # Open Drizzle Studio

# PostgreSQL (Supabase)
npm run db:pg:generate # Generate migrations
npm run db:pg:push     # Apply migrations
npm run db:pg:pull     # Pull current schema
npm run db:pg:studio   # Open Drizzle Studio
```

### Testing

```bash
npm test               # Run all tests
npm test -- --coverage # With coverage report
```

### Development

```bash
npm start              # Start Expo dev server
npx expo run:ios       # Run on iOS simulator
npx expo run:android   # Run on Android emulator
```

---

## Notes

- All schema files are in `db/schema/` (shared, sqlite, postgresql)
- Utility functions are in `shared/utils/`
- Code quality guidelines are in `docs/development/CODE_QUALITY_GUIDELINES.md`
- Keep this file updated as tasks progress
