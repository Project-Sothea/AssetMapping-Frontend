# Schema Management Guide: SQLite + Supabase with Drizzle ORM

## The Problem

You have **two databases** with **similar but different schemas**:

1. **SQLite (Local)** - On device, offline-first
   - Has extra columns: `status`, `failure_reason`, `last_synced_at`, `local_images`
   - Used by: React Native app
2. **PostgreSQL (Supabase Remote)** - In cloud, shared
   - Core columns only: `id`, `name`, `lat`, `lng`, `updated_at`
   - Used by: Multiple devices, web dashboard

**Challenge**: How do you manage both schemas efficiently without duplication?

---

## Current Approach (What You're Doing Now)

### Schema Files

**Local Schema** (`db/schema.ts`):

```typescript
export const pins = sqliteTable('pins', {
  id: text('id').primaryKey(),
  name: text('name'),
  lat: real('lat'),
  lng: real('lng'),

  // LOCAL-ONLY FIELDS ↓
  status: text('status'),
  failure_reason: text('failure_reason'),
  last_synced_at: text('last_synced_at'),
  local_images: text('local_images'), // JSON array

  updated_at: text('updated_at'),
});
```

**Remote Schema** (Supabase Dashboard - SQL Editor):

```sql
CREATE TABLE pins (
  id TEXT PRIMARY KEY,
  name TEXT,
  lat REAL,
  lng REAL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
  -- NO local-only fields
);
```

### Problems with Current Approach ❌

1. **Schema drift** - Two separate schema definitions get out of sync
2. **Manual SQL** - Supabase schema managed in dashboard, not version controlled
3. **Type mismatch** - TypeScript types don't match Supabase reality
4. **Migration hell** - Changes need to be applied twice (local + remote)

---

## Solution 1: Single Source of Truth (Recommended)

Use **Drizzle ORM for both databases**, with schema inheritance for local-only fields.

### Architecture

```
┌──────────────────────────────────────────────────────┐
│            db/schema/                                 │
├──────────────────────────────────────────────────────┤
│                                                       │
│  shared.ts         ← Core schema (both databases)    │
│  ├─ pins (base)                                      │
│  └─ forms (base)                                     │
│                                                       │
│  local.ts          ← SQLite extensions               │
│  ├─ pins (+ status, failure_reason, etc.)           │
│  └─ sync_queue                                       │
│                                                       │
│  remote.ts         ← PostgreSQL (Supabase)           │
│  ├─ pins (base only)                                 │
│  └─ forms (base only)                                │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Implementation

#### Step 1: Create Shared Schema

**File: `db/schema/shared.ts`**

```typescript
/**
 * Shared schema - Core fields present in BOTH local and remote
 */

// Pin base fields (both SQLite and PostgreSQL)
export const pinBaseFields = {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
} as const;

// Form base fields (both SQLite and PostgreSQL)
export const formBaseFields = {
  id: text('id').primaryKey(),
  pin_id: text('pin_id').notNull(),
  title: text('title').notNull(),
  data: text('data').notNull(), // JSON
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
} as const;

// Shared types
export type PinBase = {
  id: string;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
};

export type FormBase = {
  id: string;
  pin_id: string;
  title: string;
  data: string; // JSON
  created_at: string;
  updated_at: string;
};
```

#### Step 2: Create Local Schema (SQLite)

**File: `db/schema/local.ts`**

```typescript
/**
 * Local SQLite schema - Extends shared with offline-first fields
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { pinBaseFields, formBaseFields } from './shared';

// Local pins (SQLite) - Extended with sync fields
export const pins = sqliteTable('pins', {
  ...pinBaseFields,

  // LOCAL-ONLY FIELDS ↓
  status: text('status', { enum: ['synced', 'pending', 'failed'] }).default('pending'),
  failure_reason: text('failure_reason'),
  last_synced_at: text('last_synced_at'),
  last_failed_sync_at: text('last_failed_sync_at'),
  local_images: text('local_images'), // JSON array of local URIs
});

// Local forms (SQLite) - Extended with sync fields
export const forms = sqliteTable('forms', {
  ...formBaseFields,

  // LOCAL-ONLY FIELDS ↓
  status: text('status', { enum: ['synced', 'pending', 'failed'] }).default('pending'),
  failure_reason: text('failure_reason'),
  last_synced_at: text('last_synced_at'),
  last_failed_sync_at: text('last_failed_sync_at'),
});

// Local-only table (sync queue)
export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  operation: text('operation').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  idempotencyKey: text('idempotency_key').unique().notNull(),
  payload: text('payload').notNull(),
  status: text('status').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  lastError: text('last_error'),
  lastAttemptAt: text('last_attempt_at'),
  sequenceNumber: integer('sequence_number'),
  dependsOn: text('depends_on'),
  deviceId: text('device_id'),
  createdAt: text('created_at').notNull(),
});

// Local types (includes sync fields)
export type LocalPin = typeof pins.$inferSelect;
export type LocalForm = typeof forms.$inferSelect;
```

#### Step 3: Create Remote Schema (PostgreSQL)

**File: `db/schema/remote.ts`**

```typescript
/**
 * Remote PostgreSQL schema (Supabase) - Base fields only
 */

import { pgTable, text, real, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pinBaseFields, formBaseFields } from './shared';

// Remote pins (PostgreSQL) - Base fields only
export const pins = pgTable('pins', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  // NO local-only fields here
});

// Remote forms (PostgreSQL) - Base fields only
export const forms = pgTable('forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  pin_id: uuid('pin_id').notNull(),
  title: text('title').notNull(),
  data: text('data').notNull(), // JSON
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  // NO local-only fields here
});

// Remote types (no sync fields)
export type RemotePin = typeof pins.$inferSelect;
export type RemoteForm = typeof forms.$inferSelect;
```

#### Step 4: Update Drizzle Configs

**File: `drizzle.config.ts`** (for local SQLite)

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema/local.ts', // ← Use local schema
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
```

**File: `drizzle.config.remote.ts`** (NEW - for Supabase)

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema/remote.ts', // ← Use remote schema
  out: './drizzle-remote',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_DATABASE_URL!, // Get from Supabase dashboard
  },
} satisfies Config;
```

#### Step 5: Add Scripts to package.json

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",

    "db:remote:generate": "drizzle-kit generate --config=drizzle.config.remote.ts",
    "db:remote:push": "drizzle-kit push --config=drizzle.config.remote.ts",
    "db:remote:studio": "drizzle-kit studio --config=drizzle.config.remote.ts"
  }
}
```

---

## Usage Examples

### Syncing Data (Strip Local Fields)

**Before syncing to Supabase:**

```typescript
import { LocalPin } from '~/db/schema/local';
import { RemotePin } from '~/db/schema/remote';
import * as PinsAPI from '~/apis/Pins';

async function syncPinToRemote(localPin: LocalPin): Promise<void> {
  // Strip local-only fields
  const {
    status,
    failure_reason,
    last_synced_at,
    last_failed_sync_at,
    local_images,
    ...remotePin
  } = localPin;

  // Now remotePin only has shared fields
  await PinsAPI.upsertOne(remotePin);
}
```

### Type Safety

```typescript
import { PinBase } from '~/db/schema/shared';
import { LocalPin } from '~/db/schema/local';
import { RemotePin } from '~/db/schema/remote';

// Shared function (works with both)
function validatePin(pin: PinBase): boolean {
  return pin.lat >= -90 && pin.lat <= 90;
}

// Local-only function
function markAsSynced(pin: LocalPin): LocalPin {
  return { ...pin, status: 'synced', last_synced_at: new Date().toISOString() };
}

// Remote-only function
function publishToSupabase(pin: RemotePin): Promise<void> {
  // Only has fields that exist in Supabase
  return supabase.from('pins').insert(pin);
}
```

---

## Migration Workflow

### Adding a New Field

**Scenario**: Add `category` field to pins

1. **Update shared schema** (if field is in both databases):

```typescript
// db/schema/shared.ts
export const pinBaseFields = {
  // ... existing fields
  category: text('category'), // ← NEW
};
```

2. **Generate local migration**:

```bash
npm run db:generate
# Creates drizzle/0013_add_pin_category.sql
```

3. **Generate remote migration**:

```bash
npm run db:remote:generate
# Creates drizzle-remote/0001_add_pin_category.sql
```

4. **Apply migrations**:

```bash
# Local (auto-applies on app restart)
# Remote (manual push to Supabase)
npm run db:remote:push
```

### Adding a Local-Only Field

**Scenario**: Add `offline_edits_count` to track local changes

1. **Update local schema only**:

```typescript
// db/schema/local.ts
export const pins = sqliteTable('pins', {
  ...pinBaseFields,

  // LOCAL-ONLY FIELDS
  status: text('status'),
  offline_edits_count: integer('offline_edits_count').default(0), // ← NEW
});
```

2. **Generate local migration only**:

```bash
npm run db:generate
```

3. **No remote migration needed!**

---

## Benefits of This Approach ✅

1. **Single Source of Truth**: Shared schema prevents drift
2. **Type Safety**: TypeScript knows which fields exist where
3. **Version Control**: Both schemas in Git, not just local
4. **Automated Migrations**: Drizzle generates SQL for both databases
5. **Clear Separation**: Easy to see what's local vs remote
6. **DRY Principle**: Shared fields defined once, reused everywhere

---

## Alternative: Supabase CLI (Simpler)

If you want to keep it simple, use **Supabase CLI** to pull remote schema:

```bash
# Install Supabase CLI
npm install -D supabase

# Login
npx supabase login

# Link project
npx supabase link --project-ref your-project-ref

# Pull remote schema
npx supabase db pull

# This generates types automatically!
# → supabase/types/database.types.ts
```

Then in your code:

```typescript
import { Database } from '~/supabase/types/database.types';

type RemotePin = Database['public']['Tables']['pins']['Row'];
type LocalPin = RemotePin & {
  status: 'synced' | 'pending' | 'failed';
  failure_reason?: string;
  last_synced_at?: string;
};
```

**Pros**: Simple, auto-updates from Supabase  
**Cons**: Local schema not version controlled, less Drizzle integration

---

## My Recommendation

For your use case:

**Start with Alternative (Supabase CLI)**:

- Simpler setup
- Auto-syncs types from Supabase
- Less configuration

**Upgrade to Solution 1 later** if you need:

- Full version control of both schemas
- Complex migrations across both databases
- Stronger type safety guarantees

---

## Summary

### Option A: Drizzle for Both (Complex, Powerful)

- ✅ Full control over both schemas
- ✅ Unified migration system
- ✅ Version controlled
- ❌ More setup required

### Option B: Supabase CLI (Simple, Pragmatic)

- ✅ Quick setup
- ✅ Auto-syncs from Supabase
- ✅ Less code to maintain
- ❌ Remote schema not version controlled

**Choose Option B for now, upgrade to A if needed later.**

Want me to help set up either approach? 🚀
