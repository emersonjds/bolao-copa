import { dataBrtHoje } from "./backup-schema";
import { renderLembrete } from "./email-template";

export interface Selecao {
  id: string;
  nome: string;
  codigo: string;
}
export interface Partida {
  id: string;
  data_hora: string;
  status: string;
  mandante_id: string | null;
  visitante_id: string | null;
  mandante_label: string | null;
  visitante_label: string | null;
}
export interface Participante {
  id: string;
  user_id: string;
}
export interface Palpite {
  participante_id: string;
  partida_id: string;
}
export interface Perfil {
  user_id: string;
  nome: string;
  email: string;
}
export interface JogoView {
  id: string;
  dataHora: string;
  mandante: string;
  visitante: string;
  horaBrt: string;
}
export interface Pendencia {
  participanteId: string;
  email: string;
  nome: string;
  jogos: JogoView[];
}

/** "HH:MM" no fuso do bolão (America/Sao_Paulo, 24h). */
function horaBrt(dataHora: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dataHora));
}

function nomeLado(selecaoId: string | null, label: string | null, porId: Map<string, string>): string {
  if (selecaoId) return porId.get(selecaoId) ?? label ?? "A definir";
  return label ?? "A definir";
}

/** Jogos AGENDADOS cuja data BRT é hoje, com nomes resolvidos e ordenados pelo apito. */
export function jogosDeHoje(partidas: Partida[], selecoes: Selecao[], agora = new Date()): JogoView[] {
  const hoje = dataBrtHoje(agora);
  const porId = new Map(selecoes.map((s) => [s.id, s.nome]));
  return partidas
    .filter((p) => p.status === "agendada" && dataBrtHoje(new Date(p.data_hora)) === hoje)
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    .map((p) => ({
      id: p.id,
      dataHora: p.data_hora,
      mandante: nomeLado(p.mandante_id, p.mandante_label, porId),
      visitante: nomeLado(p.visitante_id, p.visitante_label, porId),
      horaBrt: horaBrt(p.data_hora),
    }));
}

/** Apito mais cedo (o primeiro a travar) entre os jogos. "" se não houver. */
export function prazoDoDia(jogos: JogoView[]): string {
  if (jogos.length === 0) return "";
  return [...jogos].sort((a, b) => a.dataHora.localeCompare(b.dataHora))[0].horaBrt;
}

/** Para cada participante, os jogos de hoje sem palpite. Só entra quem falta ≥1 e tem e-mail. */
export function pendencias(
  participantes: Participante[],
  jogosHoje: JogoView[],
  palpites: Palpite[],
  perfis: Perfil[]
): Pendencia[] {
  const temPalpite = new Set(palpites.map((p) => `${p.participante_id}:${p.partida_id}`));
  const perfilPorUser = new Map(perfis.map((p) => [p.user_id, p]));
  const lista: Pendencia[] = [];
  for (const part of participantes) {
    const faltantes = jogosHoje.filter((j) => !temPalpite.has(`${part.id}:${j.id}`));
    if (faltantes.length === 0) continue;
    const perfil = perfilPorUser.get(part.user_id);
    if (!perfil || !perfil.email) continue;
    lista.push({ participanteId: part.id, email: perfil.email, nome: perfil.nome, jogos: faltantes });
  }
  return lista;
}

export interface EnvioDeps {
  appUrl: string;
  jaEnviado: (participanteId: string) => boolean;
  enviar: (para: string, assunto: string, html: string, texto: string) => Promise<void>;
  registrar: (participanteId: string) => Promise<void>;
}
export interface ResumoEnvio {
  enviados: number;
  pulados: number;
  falhas: number;
}

/** Envia cada pendência (pulando já-enviados), registra só os enviados, e segue após falha. */
export async function enviarPendencias(lista: Pendencia[], deps: EnvioDeps): Promise<ResumoEnvio> {
  const resumo: ResumoEnvio = { enviados: 0, pulados: 0, falhas: 0 };
  for (const p of lista) {
    if (deps.jaEnviado(p.participanteId)) {
      resumo.pulados++;
      continue;
    }
    const { assunto, html, texto } = renderLembrete({
      nome: p.nome,
      jogos: p.jogos,
      prazo: prazoDoDia(p.jogos),
      appUrl: deps.appUrl,
    });
    try {
      await deps.enviar(p.email, assunto, html, texto);
      await deps.registrar(p.participanteId);
      resumo.enviados++;
    } catch {
      resumo.falhas++;
    }
  }
  return resumo;
}
