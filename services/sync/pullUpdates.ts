/**
 * Pull Updates from Backend
 *
 * Fetches updated entities from backend and saves to local SQLite database
 * Downloads remote images to local storage for offline access
 */

import { db } from '~/services/drizzleDb';
import { pins, forms } from '~/db/schema';
import { apiClient } from '~/services/apiClient';
import { sanitizePinForDb, sanitizeFormForDb } from '~/db/utils';
import { eq } from 'drizzle-orm';
import { ImageManager } from '~/services/images/ImageManager';
import { parseJsonArray } from '~/shared/utils/parsing';

/**
 * Pull a specific pin from backend and update local database
 * Downloads remote images to local storage for offline access
 */
export async function pullPinUpdate(pinId: string): Promise<void> {
  try {
    console.log(`🔄 Pulling pin update from backend: ${pinId}`);

    // Fetch all pins from backend (API doesn't have single pin endpoint yet)
    const response = await apiClient.fetchPins();

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch pins');
    }

    // Find the specific pin
    const pinData = response.data.find((p: any) => p.id === pinId);

    if (!pinData) {
      console.warn(`⚠️ Pin ${pinId} not found in backend response`);
      return;
    }

    // Download remote images to local storage for offline access
    const remoteUrls = parseJsonArray(pinData.images as string);
    let localImagePaths: string[] = [];

    if (remoteUrls.length > 0) {
      console.log(`📥 Downloading ${remoteUrls.length} images for offline use...`);
      try {
        const result = await ImageManager.saveImages(pinId, remoteUrls);
        localImagePaths = result.success;
        console.log(`✅ Downloaded ${result.success.length} images successfully`);
        if (result.fail.length > 0) {
          console.warn(`⚠️ Failed to download ${result.fail.length} images`);
        }
      } catch (error) {
        console.error('❌ Failed to download images:', error);
        // Continue with pin sync even if images fail
      }
    }

    const sanitized = sanitizePinForDb({
      ...pinData,
      localImages:
        localImagePaths.length > 0 ? JSON.stringify(localImagePaths) : pinData.localImages,
    });

    // Check if pin exists locally
    const existing = await db.select().from(pins).where(eq(pins.id, pinId)).limit(1);

    if (existing.length > 0) {
      // Update existing pin
      await db.update(pins).set(sanitized).where(eq(pins.id, pinId));
      console.log(`✅ Updated local pin: ${pinId}`);
    } else {
      // Insert new pin
      await db.insert(pins).values(sanitized);
      console.log(`✅ Inserted new local pin: ${pinId}`);
    }
  } catch (error) {
    console.error(`❌ Failed to pull pin update: ${error}`);
    throw error;
  }
}

/**
 * Pull a specific form from backend and update local database
 */
export async function pullFormUpdate(formId: string): Promise<void> {
  try {
    console.log(`🔄 Pulling form update from backend: ${formId}`);

    // Fetch all forms from backend
    const response = await apiClient.fetchForms();

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch forms');
    }

    // Find the specific form
    const formData = response.data.find((f: any) => f.id === formId);

    if (!formData) {
      console.warn(`⚠️ Form ${formId} not found in backend response`);
      return;
    }

    // Update local database
    const sanitized = sanitizeFormForDb(formData);

    // Check if form exists locally
    const existing = await db.select().from(forms).where(eq(forms.id, formId)).limit(1);

    if (existing.length > 0) {
      // Update existing form
      await db.update(forms).set(sanitized).where(eq(forms.id, formId));
      console.log(`✅ Updated local form: ${formId}`);
    } else {
      // Insert new form
      await db.insert(forms).values(sanitized);
      console.log(`✅ Inserted new local form: ${formId}`);
    }
  } catch (error) {
    console.error(`❌ Failed to pull form update: ${error}`);
    throw error;
  }
}

/**
 * Pull all pins from backend and sync to local database
 * Downloads remote images to local storage for offline access
 */
export async function pullAllPins(): Promise<void> {
  try {
    console.log('🔄 Pulling all pins from backend');

    const response = await apiClient.fetchPins();

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch pins');
    }

    let successCount = 0;

    for (const pinData of response.data) {
      try {
        // Download remote images to local storage for offline access
        const remoteUrls = parseJsonArray(pinData.images as string);
        let localImagePaths: string[] = [];

        if (remoteUrls.length > 0) {
          try {
            const result = await ImageManager.saveImages(pinData.id as string, remoteUrls);
            localImagePaths = result.success;
            if (result.fail.length > 0) {
              console.warn(`⚠️ Pin ${pinData.id}: Failed to download ${result.fail.length} images`);
            }
          } catch (error) {
            console.error(`❌ Pin ${pinData.id}: Failed to download images:`, error);
            // Continue with pin sync even if images fail
          }
        }

        const sanitized = sanitizePinForDb({
          ...pinData,
          localImages:
            localImagePaths.length > 0 ? JSON.stringify(localImagePaths) : pinData.localImages,
        });

        const existing = await db.select().from(pins).where(eq(pins.id, sanitized.id)).limit(1);

        if (existing.length > 0) {
          await db.update(pins).set(sanitized).where(eq(pins.id, sanitized.id));
        } else {
          await db.insert(pins).values(sanitized);
        }

        successCount++;
      } catch (pinError) {
        console.error(`❌ Failed to process pin ${pinData.id}:`, pinError);
        // Continue with other pins
      }
    }

    console.log(`✅ Synced ${successCount}/${response.data.length} pins to local database`);
  } catch (error) {
    console.error(`❌ Failed to pull all pins: ${error}`);
    throw error;
  }
}

/**
 * Pull all forms from backend and sync to local database
 */
export async function pullAllForms(): Promise<void> {
  try {
    console.log('🔄 Pulling all forms from backend');

    const response = await apiClient.fetchForms();

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch forms');
    }

    for (const formData of response.data) {
      const sanitized = sanitizeFormForDb(formData);
      const existing = await db.select().from(forms).where(eq(forms.id, sanitized.id)).limit(1);

      if (existing.length > 0) {
        await db.update(forms).set(sanitized).where(eq(forms.id, sanitized.id));
      } else {
        await db.insert(forms).values(sanitized);
      }
    }

    console.log(`✅ Synced ${response.data.length} forms to local database`);
  } catch (error) {
    console.error(`❌ Failed to pull all forms: ${error}`);
    throw error;
  }
}
