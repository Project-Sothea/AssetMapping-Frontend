import type { Form } from '@assetmapping/shared-types';

export type FormValues = Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'status'>;

export type FormUpdate = Partial<Form>;
