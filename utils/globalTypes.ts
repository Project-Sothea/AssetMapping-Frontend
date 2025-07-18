import { Database } from './database.types';

type dbForm = Database['public']['Tables']['forms']['Row'];
type dbPin = Database['public']['Tables']['pins']['Row'];

//promote single source of truth

export type Form = dbForm;
export type Pin = Omit<dbPin, 'created_at' | 'updated_at' | 'deleted_at' | 'metadata'>;

export type CreatePin = Omit<Pin, 'id'>;
