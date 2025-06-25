import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oadlvwudppmesgkbhlkm.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZGx2d3VkcHBtZXNna2JobGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMDg1MDgsImV4cCI6MjA2NTU4NDUwOH0.5IXMPfZfg2Wl2tc0-EJdPIl3qx62XSVaSHSdRoCYvE4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
