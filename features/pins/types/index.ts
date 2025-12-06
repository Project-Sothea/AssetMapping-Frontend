import type { Pin } from '@assetmapping/shared-types';

// Form/UI-facing type where images are always an array for convenience
export type PinValues = Omit<Pin, 'createdAt' | 'updatedAt' | 'version' | 'status' | 'images'> & {
  images: string[];
};

export type PinUpdate = Partial<Pin>;
