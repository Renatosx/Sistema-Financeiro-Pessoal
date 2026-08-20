import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Faltam as variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY. " +
      "Configure-as no arquivo .env.local (desenvolvimento) ou nas Environment Variables do projeto na Vercel (produção)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
