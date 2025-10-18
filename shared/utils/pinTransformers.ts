import { Pin } from '~/db/schema';
import { RePin } from '~/utils/globalTypes';

/**
 * Form values for pin creation/editing (UI layer)
 * Currently maps between UI (camelCase) and database (snake_case) formats.
 *
 * TODO: After running SQLite migration to camelCase, this can be simplified.
 */
export interface PinFormValues {
  id: string;
  lat: number | null;
  lng: number | null;
  type: string | null;
  name: string | null;
  address: string | null;
  cityVillage: string | null;
  description: string | null;
  localImages?: string[] | null;
}

/**
 * Centralized transformations for Pin data
 */
export class PinTransformers {
  /**
   * Convert pin form values to database schema.
   * UI uses camelCase, local SQLite still uses snake_case (until migration applied).
   */
  static pinToDb(pin: PinFormValues): Partial<Pin> {
    const { cityVillage, localImages, ...rest } = pin;
    return {
      ...rest,
      city_village: cityVillage,
      // localImages is handled separately in the service layer
    };
  }

  /**
   * Convert database pin to form pin values.
   * Parse localImages from JSON string if present.
   */
  static dbToPin(pin: Pin): PinFormValues {
    return {
      id: pin.id,
      lat: pin.lat,
      lng: pin.lng,
      type: pin.type,
      name: pin.name,
      address: pin.address,
      cityVillage: pin.city_village,
      description: pin.description,
      localImages: pin.localImages ? JSON.parse(pin.localImages) : null,
    };
  }

  /**
   * Convert local Pin (SQLite, snake_case) to remote RePin (PostgreSQL, camelCase).
   */
  static localToRemote(pin: Pin): RePin {
    const { failureReason, status, lastSyncedAt, lastFailedSyncAt, localImages, ...rest } = pin;

    // Convert snake_case fields to camelCase for remote PostgreSQL
    return {
      ...rest,
      createdAt: pin.createdAt,
      updatedAt: pin.updatedAt,
      deletedAt: pin.deletedAt,
      cityVillage: pin.city_village, // snake_case → camelCase
    } as RePin;
  }

  /**
   * Convert remote RePin (PostgreSQL, camelCase) to local Pin (SQLite, snake_case).
   */
  static remoteToLocal(rePin: RePin): Pin {
    return {
      ...rePin,
      // Convert camelCase from remote to snake_case for local
      createdAt: rePin.createdAt,
      updatedAt: rePin.updatedAt,
      deletedAt: rePin.deletedAt,
      city_village: rePin.cityVillage, // camelCase → snake_case
      // Add local-only fields
      failureReason: null,
      status: 'synced',
      lastSyncedAt: new Date().toISOString(),
      lastFailedSyncAt: null,
      localImages: null,
    } as Pin;
  }

  /**
   * Generate sync metadata fields
   */
  static getSyncFields(status: 'dirty' | 'synced') {
    const now = new Date().toISOString();
    return {
      updatedAt: now,
      status,
      lastSyncedAt: status === 'synced' ? now : null,
      lastFailedSyncAt: null,
      failureReason: null,
    };
  }

  /**
   * Generate creation metadata fields
   */
  static getCreationFields() {
    const now = new Date().toISOString();
    return {
      createdAt: now,
      updatedAt: now,
      status: 'dirty' as const,
      lastSyncedAt: null,
      deletedAt: null,
      lastFailedSyncAt: null,
      failureReason: null,
    };
  }
}
