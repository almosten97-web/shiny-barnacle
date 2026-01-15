import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ootpxmlqinwwxdnpjbfo.supabase.co';
const supabaseAnonKey = 'sb_publishable_7Q0RfOo5SXfd6sFTYwk3YA_S4TcnLnZ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
