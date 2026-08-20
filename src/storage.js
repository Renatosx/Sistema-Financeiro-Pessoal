// Persistência na nuvem via Supabase — os dados ficam vinculados ao usuário
// logado e sincronizados entre qualquer aparelho/navegador.

import { supabase } from "./supabaseClient.js";

export async function loadKey(key, fallback) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return fallback;

  const { data, error } = await supabase
    .from("kv_store")
    .select("value")
    .eq("user_id", user.id)
    .eq("storage_key", key)
    .maybeSingle();

  if (error || !data) return fallback;
  return data.value;
}

export async function saveKey(key, value) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  const { error } = await supabase.from("kv_store").upsert(
    { user_id: user.id, storage_key: key, value, updated_at: new Date().toISOString() },
    { onConflict: "user_id,storage_key" }
  );
  if (error) console.error("erro ao salvar", key, error);
}
