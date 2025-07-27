import { pins } from '~/db/schema';
import { Database } from './database.types';

type dbForm = Database['public']['Tables']['forms']['Row'];
type dbPin = Database['public']['Tables']['pins']['Row'];

//promote single source of truth

export type Form = dbForm;
export type RePin = dbPin;
export type InsertPin = Omit<dbPin, 'deleted_at' | 'created_at' | 'updated_at'>;
export type Pin = typeof pins.$inferSelect;

export type LocalMetadata = {
  failureReason: string | null;
  status: string | null;
  lastSyncedAt: string | null;
  lastFailedSyncAt: string | null;
  localImages: string | null;
};

export type Localised<T> = T & LocalMetadata;

export type Delocalised<T extends LocalMetadata> = Omit<T, keyof LocalMetadata>;
