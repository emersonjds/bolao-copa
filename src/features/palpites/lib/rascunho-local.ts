import type { PlacarLocal } from "../components/card-palpite";

const PREFIX = "palpite-rascunho";

function chave(userId: string, partidaId: string): string {
  return `${PREFIX}:${userId}:${partidaId}`;
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // localStorage pode lançar (modo privado/bloqueado)
  }
}

export function salvarRascunho(userId: string, partidaId: string, placar: PlacarLocal): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(chave(userId, partidaId), JSON.stringify(placar));
  } catch {
    /* cota cheia / bloqueado: rascunho é best-effort */
  }
}

export function lerRascunho(userId: string, partidaId: string): PlacarLocal | undefined {
  const s = storage();
  if (!s) return undefined;
  const cru = s.getItem(chave(userId, partidaId));
  if (!cru) return undefined;
  try {
    const obj = JSON.parse(cru) as unknown;
    if (
      typeof obj === "object" &&
      obj !== null &&
      typeof (obj as PlacarLocal).mandante === "string" &&
      typeof (obj as PlacarLocal).visitante === "string"
    ) {
      return obj as PlacarLocal;
    }
    return undefined;
  } catch {
    return undefined; // JSON corrompido
  }
}

export function limparRascunho(userId: string, partidaId: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(chave(userId, partidaId));
  } catch {
    /* ignore */
  }
}
