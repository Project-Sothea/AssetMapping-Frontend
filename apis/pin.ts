import { eq, sql } from 'drizzle-orm';
import { pins } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import { supabase } from '~/services/supabase';
import { InsertPin, RePin } from '~/utils/globalTypes';

export const create = async (pin: InsertPin) => {
  try {
    const { error } = await supabase.from('pins').insert(pin);
    if (error) {
      console.error('supabase error:', error.message);
    }
  } catch (err) {
    console.error('Non-Supabase Error:', err);
  }
};

export const fetchAll = async () => {
  try {
    const { data, error } = await supabase.from('pins').select('*');
    if (error) {
      console.error('supabase error:', error.message);
      return [];
    }
    return data;
  } catch (err) {
    console.error('Non-Supabase Error:', err);
    return [];
  }
};

export const fetchAllActive = async () => {
  try {
    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .filter('deleted_at', 'is', null);
    if (error) {
      console.error('supabase error:', error.message);
      return [];
    }
    return data;
  } catch (err) {
    console.error('Non-Supabase Error:', err);
    return [];
  }
};

export const update = async (pin: RePin) => {
  try {
    const { error } = await supabase
      .from('pins')
      .update({
        name: pin.name,
        description: pin.description,
        address: pin.address,
        state_province: pin.state_province,
        postal_code: pin.postal_code,
        country: pin.country,
        updated_at: Date(),
      })
      .eq('id', pin.id);

    if (error) throw error;
  } catch (e) {
    console.error(e);
  }
};

export const upsertAll = async (pins: RePin[]) => {
  try {
    const { error } = await supabase.from('pins').upsert(pins, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to update pins:', e);
    throw new Error('error in upserting to remote DB');
  }
};

//local apis

export const insertLocal = async (data: any) => {
  console.log(data);
  try {
    await db.insert(pins).values(data);
  } catch (e) {
    console.error('Failed to insert pin:', e);
  }
};

export const markSynced = async (pinId: string) => {
  await db
    .update(pins)
    .set({
      status: sql.raw(`CASE 
        WHEN ${pins.deletedAt.name} IS NOT NULL THEN 'deleted' 
        ELSE 'synced' 
        END`),
      lastSyncedAt: new Date().toISOString(),
      failureReason: null, // clear any previous error
    })
    .where(eq(pins.id, pinId));
};

export const markPublicURIs = async (success: string[] | null, pinId: string) => {
  if (!success || success.length === 0) {
    return;
  }

  const stringified = JSON.stringify(success);

  await db
    .update(pins)
    .set({
      images: stringified,
    })
    .where(eq(pins.id, pinId));
};
