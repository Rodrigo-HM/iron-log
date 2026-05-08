import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gjyfttaymjefvzulrbia.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OBxYCENySXBBEnbN4gwdJA_9CZZlqrv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
