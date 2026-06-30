// Fallback para visitante anônimo (sem conta): marca o aviso como visto no
// localStorage. Logado usa o banco (avisos-fetcher).
const PREFIX = "aviso-visto";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // localStorage pode lançar (modo privado/bloqueado)
  }
}

export function avisoVistoLocal(avisoId: string): boolean {
  const s = storage();
  if (!s) return false;
  try {
    return s.getItem(`${PREFIX}:${avisoId}`) === "1";
  } catch {
    return false;
  }
}

export function marcarAvisoVistoLocal(avisoId: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(`${PREFIX}:${avisoId}`, "1");
  } catch {
    /* sem flag: o modal reaparece, mas não quebra */
  }
}
