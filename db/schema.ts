import { sql } from 'drizzle-orm';
import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const pins = sqliteTable('pins', {
  id: text('id').primaryKey(), // UUID
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
  failureReason: text('failure_reason'),
  status: text('status'),
  lastSyncedAt: text('last_synced_at'),
  lastFailedSyncAt: text('last_failed_sync_at'),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  address: text('address'),
  stateProvince: text('state_province'),
  postalCode: text('postal_code'),
  country: text('country'),
  description: text('description'),
  images: text('images'), // stored as JSON string: JSON.stringify(imagesArray)
  localImages: text('local_images'),
});

// Export pin to use as an interface in your app
export type Pin = typeof pins.$inferSelect;
