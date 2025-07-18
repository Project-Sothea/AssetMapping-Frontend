import { Database } from './database.types';

type dbForm = Database['public']['Tables']['forms']['Row'];
type dbPin = Database['public']['Tables']['pins']['Row'];

//promote single source of truth

export type Form = dbForm;
export type Pin = dbPin;
