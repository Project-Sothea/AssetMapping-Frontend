import { pins, forms } from '~/db/schema';
import { Database } from './database.types';
import { offlineManager } from '@rnmapbox/maps';

//promote single source of truth
export type ReForm = Database['public']['Tables']['forms']['Row'];
export type RePin = Database['public']['Tables']['pins']['Row'];
export type Pin = typeof pins.$inferSelect;
export type Form = typeof forms.$inferSelect;

export type UseCreatePackProps = Parameters<typeof offlineManager.createPack>[0];

export type CreateOfflinePackProps = Parameters<typeof offlineManager.createPack>[0];
