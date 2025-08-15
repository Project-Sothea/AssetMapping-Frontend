import { pins, forms } from '~/db/schema';
import { Database } from './database.types';
import { offlineManager } from '@rnmapbox/maps';

type dbForm = Database['public']['Tables']['forms']['Row'];
type dbPin = Database['public']['Tables']['pins']['Row'];

//promote single source of truth

export type ReForm = dbForm;
export type RePin = dbPin;
export type InsertPin = Omit<dbPin, 'deleted_at' | 'created_at' | 'updated_at'>;
export type Pin = typeof pins.$inferSelect;
export type Form = typeof forms.$inferSelect;

export type LocalMetadata = {
  failureReason: string | null;
  status: string | null;
  lastSyncedAt: string | null;
  lastFailedSyncAt: string | null;
  localImages: string | null;
};

export type Localised<T> = T & LocalMetadata;

export type Delocalised<T extends LocalMetadata> = Omit<T, keyof LocalMetadata>;

export type UseCreatePackProps = Parameters<typeof offlineManager.createPack>[0];

export type CreateOfflinePackProps = Parameters<typeof offlineManager.createPack>[0];
