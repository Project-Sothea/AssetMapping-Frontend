/**
 * Pull Updates from Backend
 *
 * Fetches updated entities from backend and saves to local SQLite database
 * Used when WebSocket notifications indicate remote changes
 */

import { db } from '~/services/drizzleDb';
import { pins, forms } from '~/db/schema';
import { apiClient } from '~/services/apiClient';
import { sanitizePinForDb, sanitizeFormForDb } from '~/db/utils';
import { eq } from 'drizzle-orm';

/**
 * Pull a specific pin from backend and update local database
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

    // Update local database
    const sanitized = sanitizePinForDb(pinData);

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
 * Issue: the local image URIs pulled do not exist in the device
 */
export async function pullAllPins(): Promise<void> {
  try {
    console.log('🔄 Pulling all pins from backend');

    const response = await apiClient.fetchPins();

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch pins');
    }

    for (const pinData of response.data) {
      const sanitized = sanitizePinForDb(pinData);
      const existing = await db.select().from(pins).where(eq(pins.id, sanitized.id)).limit(1);

      if (existing.length > 0) {
        await db.update(pins).set(sanitized).where(eq(pins.id, sanitized.id));
      } else {
        await db.insert(pins).values(sanitized);
      }
    }

    console.log(`✅ Synced ${response.data.length} pins to local database`);
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
