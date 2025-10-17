import { PinService } from '~/features/pins/services/PinService';
import { FormService } from '~/features/forms/services/FormService';
import { getLocalPinRepo, getLocalFormRepo } from './sync/syncService';

// Singleton instances
let pinServiceInstance: PinService | null = null;
let formServiceInstance: FormService | null = null;

/**
 * Get or create PinService instance
 */
export function getPinService(): PinService {
  if (!pinServiceInstance) {
    pinServiceInstance = new PinService(getLocalPinRepo());
  }
  return pinServiceInstance;
}

/**
 * Get or create FormService instance
 */
export function getFormService(): FormService {
  if (!formServiceInstance) {
    formServiceInstance = new FormService(getLocalFormRepo());
  }
  return formServiceInstance;
}

/**
 * Reset services (useful for testing)
 */
export function resetServices(): void {
  pinServiceInstance = null;
  formServiceInstance = null;
}
