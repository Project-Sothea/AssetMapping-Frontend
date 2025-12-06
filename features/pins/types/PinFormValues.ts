import type { Pin } from '~/db/schema';

export type PinFormValues = Omit<Pin, 'createdAt' | 'updatedAt' | 'version' | 'status'>;
