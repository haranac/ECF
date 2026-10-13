import { createClient } from '@supabase/supabase-js'

// Reemplaza con tu URL y tu Anon Key de Supabase
const SUPABASE_URL = 'https://irapnxcltsrwsdfjbpcj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_9GF5-py8aAUj5d2G5AlOEw_PxSYYL7A'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)