import { Database } from './database.types';

type dbForm = Database['public']['Tables']['forms']['Row'];
type dbPin = Database['public']['Tables']['pins']['Row'];

//promote single source of truth

export type Form = dbForm;
export type RePin = dbPin;
export type InsertPin = Omit<dbPin, 'deleted_at' | 'created_at' | 'updated_at'>;
