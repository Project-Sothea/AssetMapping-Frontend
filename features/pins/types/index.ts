import { pins } from '~/db/schema';

export type PinDB = typeof pins.$inferSelect;

// Pin represents the runtime application type with parsed images (string[])
// whereas PinDB has images as JSON strings for database storage
export type Pin = Omit<PinDB, 'images'> & { images: string[] };

export type PinValues = Omit<Pin, 'createdAt' | 'updatedAt' | 'version' | 'status'>;

export type PinUpdate = Partial<Pin>;
