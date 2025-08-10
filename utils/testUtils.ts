import { LocalMetadata, Pin, RePin } from './globalTypes';

export type LocalType = {
  id: string;
  body: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
  images: string | null;
} & LocalMetadata;

export type RemoteType = {
  id: string;
  body: string | null;
  updated_at: Date | null;
  deleted_at: Date | null;
  images: string[] | null;
};

export const makeLocalItem = (overrides: Partial<LocalType>): LocalType => ({
  id: 'default',
  body: null,
  updatedAt: '2024-01-01T00:00:00Z',
  deletedAt: null,
  failureReason: null,
  status: null,
  lastSyncedAt: null,
  lastFailedSyncAt: null,
  images: null,
  localImages: null,
  ...overrides,
});

export const makeRemoteItem = (overrides: Partial<RemoteType>): RemoteType => ({
  id: 'default',
  body: null,
  updated_at: new Date('2024-01-01T00:00:00Z'),
  deleted_at: null,
  images: null,
  ...overrides,
});

export const makePin = (overrides: Partial<Pin>): Pin => ({
  id: 'default',
  name: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  deletedAt: null,
  failureReason: null,
  status: null,
  lastSyncedAt: null,
  lastFailedSyncAt: null,
  lat: null,
  lng: null,
  type: null,
  address: null,
  stateProvince: null,
  postalCode: null,
  description: null,
  images: null,
  localImages: null,
  ...overrides,
});

export const makeRePin = (overrides: Partial<RePin>): RePin => ({
  id: 'default',
  name: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  description: null,
  images: null,
  lat: null,
  lng: null,
  type: null,
  address: null,
  state_province: null,
  postal_code: null,
  ...overrides,
});
