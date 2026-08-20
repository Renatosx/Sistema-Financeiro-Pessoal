// Persistência local no navegador (localStorage).
// Os dados ficam salvos neste dispositivo/navegador, sem precisar de servidor.

export async function loadKey(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function saveKey(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("erro ao salvar", key, e);
  }
}
