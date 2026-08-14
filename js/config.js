import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// URL e chave anon do seu projeto Supabase
const supabaseUrl = 'https://qcjbeivelpqiboibj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjanRiZWl2ZWxxb2xnYm9pcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODk4MjQsImV4cCI6MjEwMjI2NTgyNH0.Ou3NlfP-9LFgHNz_Tz--A9F20X4wKNj6U7mC4b66Ivk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const CONFIG = {
    NUMERO_WHATSAPP: '244933677628',
    ADMIN_SENHA: 'admin123',
    CACHE_KEY: 'aurora_catalogo_cache',
    CACHE_TTL: 60 * 60 * 1000 // 1 hora de cache
};