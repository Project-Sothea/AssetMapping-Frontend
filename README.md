# Asset Mapping Frontend

React Native (Expo) app for offline-first asset mapping with Mapbox integration.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
# Add backend API URL to .env:
# EXPO_PUBLIC_API_URL=http://localhost:3000

# Start development server
npm start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## Prerequisites

- Node.js 18+
- Backend server running (see [Backend Setup](../AssetMapping-Backend/docs/SETUP.md))
- iOS Simulator or Android Emulator
- Expo CLI (`npm install -g expo-cli`)

## Key Features

- 📍 Pin-based asset mapping with Mapbox
- 📝 Dynamic forms with field validation
- 🔄 Offline-first with background sync
- 📦 Offline map pack downloads
- 🗃️ Dual database: SQLite (local) + PostgreSQL (via Backend API)
- 🔐 Idempotent sync operations via backend
- 📊 Event streaming and audit logging

## Tech Stack

- **React Native** + Expo Router
- **TypeScript** (strict mode)
- **Mapbox** for maps
- **Drizzle ORM** for type-safe database
- **Backend API** for sync operations (Express.js)
- **Supabase** for database (via backend)
- **React Query** for API state
- **Jest** for testing

## Project Structure

```
├── app/                # Expo Router screens
├── apis/               # Backend API clients
├── db/schema/          # Database schemas (SQLite + PostgreSQL)
├── features/           # Feature-specific logic
├── services/           # Business logic & repositories
├── shared/             # Shared utilities, types, components
├── hooks/              # Custom React hooks
├── providers/          # React context providers
└── docs/               # Documentation
```

## Documentation

📚 **[Full Documentation](docs/README.md)**

## Common Commands

### Testing

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage
```

### Database (Local SQLite)

```bash
npm run db:generate         # Generate migrations
npm run db:push             # Apply migrations
npm run db:studio           # Open database browser
```

### Database (Supabase PostgreSQL)

```bash
npm run db:pg:generate      # Generate migrations
npm run db:pg:push          # Apply migrations to Supabase
npm run db:pg:pull          # Pull schema from Supabase
npm run db:pg:studio        # Open Supabase browser
```

## Environment Setup

Create `.env` file:

```env
# Required
EXPO_PUBLIC_MAPBOX_KEY=your_mapbox_token

# For database management (optional)
SUPABASE_DB_URL=postgresql://user:pass@host:6543/database
```

Get Mapbox token: https://account.mapbox.com/access-tokens/  
Get Supabase URL: Dashboard → Settings → Database → Connection string (Transaction mode)

## Development Principles

1. **DRY** - No code duplication, extract to `shared/utils/`
2. **Type Safe** - Strict TypeScript, no `any`
3. **Minimal** - Less code is better code
4. **Tested** - Utilities have 100% coverage
5. **Documented** - JSDoc on all utilities

See [Code Quality Guidelines](docs/development/CODE_QUALITY_GUIDELINES.md) for details.

## Architecture

### Offline-First Sync

- Local-first: All operations on SQLite first
- Background sync: Queue-based sync to Supabase
- Conflict resolution: Last-write-wins with timestamps
- Retry logic: Exponential backoff for failures

### Database Strategy

- **SQLite** (local): Full schema with sync metadata
- **PostgreSQL** (Supabase): Core tables only, no local-only fields
- **Drizzle ORM**: Single source of truth for schemas
- **Type safety**: Auto-generated types from schema

### Repository Pattern

- `BaseLocalRepository` - Shared local DB operations
- `BaseRemoteRepository` - Shared remote API operations
- Entity-specific repos extend bases
- Consistent CRUD interface

## Contributing

1. Read [Code Quality Guidelines](docs/development/CODE_QUALITY_GUIDELINES.md)
2. Check [Next Tasks](docs/development/NEXT_TASKS.md) for current work
3. Follow the checklist before committing:
   - [ ] No duplicated code
   - [ ] All types explicit
   - [ ] Functions < 50 lines
   - [ ] Utilities documented & tested
   - [ ] Tests passing

## License

[Add license information]

## Support

[Add support information]
