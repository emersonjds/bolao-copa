// Marca, por usuário, que a pessoa já viu e entendeu o aviso de palpite
// antecipado — para o modal só aparecer na primeira vez.
const PREFIX = "palpite-antecipado-confirmado";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // localStorage pode lançar (modo privado/bloqueado)
  }
}

export function jaConfirmouAntecipado(userId: string): boolean {
  const s = storage();
  if (!s) return false;
  try {
    return s.getItem(`${PREFIX}:${userId}`) === "1";
  } catch {
    return false;
  }
}

export function marcarConfirmouAntecipado(userId: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(`${PREFIX}:${userId}`, "1");
  } catch {
    /* sem flag: o modal reaparece, mas não quebra */
  }
}
