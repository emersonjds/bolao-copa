import { atribuirTerceiros, type Grupo, type SlotTerceiro } from "./melhores-terceiros-2026";
import type { ClassificacaoGrupo } from "@/features/grupos";

export interface ConfrontoResolvido {
  mandanteLabel: string;
  visitanteLabel: string;
  mandanteId: string;
  visitanteId: string;
}

// 16 confrontos do trinta-e-dois, na ordem do seed.sql (linhas 129-144).
const PARES_ROTULO: ReadonlyArray<[string, string]> = [
  ["2A", "2B"],
  ["1E", "3A/B/C/D/F"],
  ["1F", "2C"],
  ["1C", "2F"],
  ["1I", "3C/D/F/G/H"],
  ["2E", "2I"],
  ["1A", "3C/E/F/H/I"],
  ["1L", "3E/H/I/J/K"],
  ["1D", "3B/E/F/I/J"],
  ["1G", "3A/E/H/I/J"],
  ["2K", "2L"],
  ["1H", "2J"],
  ["1B", "3E/F/G/I/J"],
  ["1J", "2H"],
  ["1K", "3D/E/I/J/L"],
  ["2D", "2G"],
];

/**
 * Retorna as letras dos 8 grupos com melhores 3ºs colocados,
 * ordenados por pontos → saldo de gols → gols pró → nome (desempate).
 * Ignora grupos não finalizados ou sem 3º colocado.
 */
export function ranquearTerceiros(classificacao: ClassificacaoGrupo[]): Grupo[] {
  return classificacao
    .filter((g) => g.finalizado && g.linhas.length >= 3)
    .map((g) => ({ grupo: g.grupo as Grupo, terceiro: g.linhas[2] }))
    .sort(
      (a, b) =>
        b.terceiro.pontos - a.terceiro.pontos ||
        b.terceiro.saldoGols - a.terceiro.saldoGols ||
        b.terceiro.golsPro - a.terceiro.golsPro ||
        a.terceiro.selecao.nome.localeCompare(b.terceiro.selecao.nome, "pt-BR")
    )
    .slice(0, 8)
    .map((entry) => entry.grupo);
}

/**
 * Resolve os 16 confrontos do trinta-e-dois a partir da classificação dos grupos.
 * Lança se algum grupo não estiver finalizado ou não tiver 1º/2º/3º colocado.
 */
export function resolverTrintaEDois(classificacao: ClassificacaoGrupo[]): ConfrontoResolvido[] {
  const mapa = new Map<Grupo, ClassificacaoGrupo>();
  for (const grupo of classificacao) {
    if (!grupo.finalizado) {
      throw new Error(`Grupo ${grupo.grupo} ainda não finalizado`);
    }
    if (grupo.linhas.length < 3) {
      throw new Error(`Grupo ${grupo.grupo}: precisa de pelo menos 3 seleções classificadas`);
    }
    mapa.set(grupo.grupo as Grupo, grupo);
  }

  const top8 = ranquearTerceiros(classificacao);
  const slots = atribuirTerceiros(top8);

  // Resolve o id da seleção a partir do rótulo ("1X", "2X" ou "3…").
  // Para "3…", parceiro é o rótulo "1X" do adversário no par — identifica o slot FIFA.
  function selecaoId(rotulo: string, parceiro: string): string {
    const posicao = rotulo[0];

    if (posicao === "1") {
      const g = mapa.get(rotulo[1] as Grupo);
      if (!g) throw new Error(`Grupo ${rotulo[1]} não encontrado na classificação`);
      return g.linhas[0].selecao.id;
    }
    if (posicao === "2") {
      const g = mapa.get(rotulo[1] as Grupo);
      if (!g) throw new Error(`Grupo ${rotulo[1]} não encontrado na classificação`);
      return g.linhas[1].selecao.id;
    }

    // ponytail: slot "1X" do parceiro identifica qual grupo 3º ocupa esta vaga (Anexo C FIFA)
    const grupoDoTerceiro = slots[parceiro as SlotTerceiro];
    const g = mapa.get(grupoDoTerceiro);
    if (!g) throw new Error(`Grupo ${grupoDoTerceiro} não encontrado para slot ${parceiro}`);
    return g.linhas[2].selecao.id;
  }

  return PARES_ROTULO.map(([mandanteLabel, visitanteLabel]) => ({
    mandanteLabel,
    visitanteLabel,
    mandanteId: selecaoId(mandanteLabel, visitanteLabel),
    visitanteId: selecaoId(visitanteLabel, mandanteLabel),
  }));
}
