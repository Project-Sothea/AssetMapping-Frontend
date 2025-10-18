# Documentation Index

**Last Updated:** October 18, 2025

## Quick Navigation

### 📚 For Users & Developers
- **[Schema Management Guide](guides/SCHEMA_MANAGEMENT_WITH_DRIZZLE.md)** - How to manage database schemas
- **[Testing Guide](guides/TESTING_GUIDE.md)** - How to write and run tests
- **[Backend Integration](guides/BACKEND_INTEGRATION_GUIDE.md)** - Connecting to Supabase

### 🛠️ For Development Reference
- **[Code Quality Guidelines](development/CODE_QUALITY_GUIDELINES.md)** ⭐ **START HERE**
- **[Next Tasks](development/NEXT_TASKS.md)** - Current and upcoming work
- **[Refactoring Strategy](development/REFACTORING.md)** - How we reduce code duplication
- **[Soft Delete Pattern](development/SOFT_DELETE_PATTERN.md)** - How deleted records work

### 📦 Archive (Historical Context)
- Phase completion summaries
- Migration records
- Fixed bugs documentation

---

## Documentation Structure

```
docs/
├── README.md                          # This file
├── guides/                            # User-facing guides
│   ├── SCHEMA_MANAGEMENT_WITH_DRIZZLE.md
│   ├── TESTING_GUIDE.md
│   └── BACKEND_INTEGRATION_GUIDE.md
├── development/                       # Developer reference
│   ├── CODE_QUALITY_GUIDELINES.md    # ⭐ Core standards
│   ├── NEXT_TASKS.md                 # Current work
│   ├── REFACTORING.md
│   └── SOFT_DELETE_PATTERN.md
└── archive/                           # Historical records
    ├── PHASE1_COMPLETE.md
    ├── PHASE2_COMPLETE.md
    ├── QUEUE_INTEGRATION_SUMMARY.md
    ├── DRIZZLE_SCHEMA_SETUP_COMPLETE.md
    └── UTILITY_EXTRACTION_COMPLETE.md
```

---

## Code-Specific Documentation

Some documentation lives with the code it describes:

- `services/sync/README.md` - Sync architecture overview
- `services/sync/queue/HELPERS_EXPLAINED.md` - Queue helper functions
- `services/sync/queue/PRACTICAL_EXAMPLE.md` - Queue usage examples
- `services/sync/__tests__/README.md` - Testing strategy

---

## Quick Reference Commands

### Database Management
```bash
# SQLite (Local)
npm run db:generate    # Generate migrations from schema changes
npm run db:push        # Apply migrations to local database
npm run db:studio      # Open visual database browser

# PostgreSQL (Supabase)
npm run db:pg:generate # Generate migrations for Supabase
npm run db:pg:push     # Apply migrations to Supabase
npm run db:pg:pull     # Pull current schema from Supabase
npm run db:pg:studio   # Open visual browser for Supabase
```

### Testing
```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage report
npm test -- utils.test.ts   # Run specific test file
```

### Development
```bash
npm start                   # Start Expo dev server
npx expo run:ios            # Run on iOS simulator
npx expo run:android        # Run on Android emulator
```

---

## Key Principles

When working on this codebase:

1. **Read [Code Quality Guidelines](development/CODE_QUALITY_GUIDELINES.md) first**
2. **Check [Next Tasks](development/NEXT_TASKS.md) for current priorities**
3. **Follow DRY principle** - No code duplication
4. **Keep it minimal** - Less code is better code
5. **Type everything** - No `any` types
6. **Document utilities** - Full JSDoc with examples
7. **Test utilities** - 100% coverage for shared code

---

## Getting Started

### First Time Setup
1. Read [Code Quality Guidelines](development/CODE_QUALITY_GUIDELINES.md)
2. Review [Schema Management Guide](guides/SCHEMA_MANAGEMENT_WITH_DRIZZLE.md)
3. Check [Next Tasks](development/NEXT_TASKS.md) for current work
4. Set up environment variables (see Backend Integration guide)

### Making Changes
1. Check if similar code exists (avoid duplication)
2. Extract utilities if used 3+ times
3. Follow naming conventions (see Code Quality Guidelines)
4. Write tests for new utilities
5. Document with JSDoc
6. Run tests before committing

### Before Committing
- [ ] No duplicated code
- [ ] All types explicit
- [ ] Functions < 50 lines
- [ ] Files < 300 lines
- [ ] Utilities documented
- [ ] Tests passing
- [ ] No console.logs
- [ ] Imports organized

---

## Contributing

When adding new documentation:

- **User guides** → `docs/guides/`
- **Developer reference** → `docs/development/`
- **Historical records** → `docs/archive/`
- **Code-specific docs** → Keep with the code

Keep documentation:
- **Concise** - Get to the point quickly
- **Practical** - Include examples and commands
- **Current** - Update dates and status
- **Organized** - Use consistent structure

---

## Questions?

- Check existing docs first
- Review code quality guidelines
- Look at similar implementations in codebase
- Ask for clarification with specific context
