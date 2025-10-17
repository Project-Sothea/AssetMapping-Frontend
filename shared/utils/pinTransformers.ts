import { Pin } from '~/db/schema';
import { RePin } from '~/utils/globalTypes';
import { convertKeysToCamel, convertKeysToSnake } from '~/utils/dataShapes';

/**
 * Form values for pin creation/editing (UI layer)
 */
export interface PinFormValues {
  id: string;
  lat: number | null;
  lng: number | null;
  type: string | null;
  name: string | null;
  address: string | null;
  cityVillage: string | null; // camelCase in forms
  description: string | null;
  localImages?: string[] | null;
}

/**
 * Centralized transformations for Pin data
 */
export class PinTransformers {
  /**
   * Convert pin form values (camelCase) to database schema (snake_case)
   */
  static pinToDb(pin: PinFormValues): Partial<Pin> {
    const { cityVillage, localImages, ...rest } = pin;
    return {
      ...rest,
      city_village: cityVillage,
      // Don't include localImages in this transform, handled separately
    };
  }

  /**
   * Convert database pin (snake_case) to form pin values (camelCase)
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
   * Convert local Pin to remote RePin (snake_case)
   */
  static localToRemote(pin: Pin): RePin {
    return convertKeysToSnake(pin) as RePin;
  }

  /**
   * Convert remote RePin to local Pin (camelCase)
   */
  static remoteToLocal(rePin: RePin): Pin {
    return convertKeysToCamel(rePin) as Pin;
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
