"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { usePartidas } from "@/features/partidas";
import { useMeusPalpites, useSalvarPalpite } from "../api/queries";
import type { FaseCopa, Partida } from "@/entities/partida";
import { FiltroFase } from "./filtro-fase";
import { ListaPalpites } from "./lista-palpites";
import { BotaoSalvar } from "./botao-salvar";
import type { PlacarLocal } from "./card-palpite";

// Fases na ordem de exibição das tabs
const ORDEM_FASES: FaseCopa[] = [
  "grupos",
  "trinta-e-dois",
  "oitavas",
  "quartas",
  "semifinal",
  "terceiro-lugar",
  "final",
];

/** Regra de trava (client-side): agendada E ainda no futuro → pode editar. */
function estaEmJogo(partida: Partida): boolean {
  return partida.status !== "agendada" || new Date(partida.dataHora) <= new Date();
}

/**
 * Conteúdo principal da tela de palpites (renderizado apenas quando autenticado).
 *
 * Gerencia o estado local dos placares e coordena a gravação via
 * useSalvarPalpite(). Importa usePartidas lateralmente dentro da camada
 * features porque o componente orquestra duas features distintas; idealmente
 * deveria viver em widgets/ em uma refatoração futura de FSD estrito.
 */
export function PalpitesContent() {
  const { data: partidas, isLoading: isLoadingPartidas, isError, refetch } = usePartidas();
  const { data: meusPalpites, isPending: isPendingPalpites } = useMeusPalpites();
  const { mutateAsync: salvarPalpite } = useSalvarPalpite();

  const [faseSelecionada, setFaseSelecionada] = useState<FaseCopa>("grupos");
  const [placaresLocais, setPlacaresLocais] = useState<Record<string, PlacarLocal>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = isLoadingPartidas || isPendingPalpites;

  // "Fase de Grupos" sempre visível; outras apenas se houver partidas nelas
  const fasesDisponiveis: FaseCopa[] = ORDEM_FASES.filter(
    (fase) => fase === "grupos" || (partidas ?? []).some((p) => p.fase === fase)
  );

  const partidasFiltradas = (partidas ?? []).filter((p) => p.fase === faseSelecionada);

  /**
   * Um palpite é "pendente" quando placarLocal existe, ambos os campos estão
   * preenchidos e os valores diferem do palpite salvo no servidor (ou não há
   * palpite salvo). Palpites incompletos (um campo vazio) não são pendentes.
   */
  function ehPendente(partidaId: string): boolean {
    const local = placaresLocais[partidaId];
    if (!local) return false;
    if (local.mandante === "" || local.visitante === "") return false;
    const salvo = (meusPalpites ?? []).find((p) => p.partidaId === partidaId);
    if (!salvo) return true;
    return (
      local.mandante !== String(salvo.golsMandante) ||
      local.visitante !== String(salvo.golsVisitante)
    );
  }

  // Verifica pendências em TODAS as fases para não perder alterações ao trocar tab
  const hasPendingChanges = (partidas ?? []).some((p) => !estaEmJogo(p) && ehPendente(p.id));

  function handleChangePlacar(
    partidaId: string,
    campo: "mandante" | "visitante",
    valor: string
  ): void {
    setPlacaresLocais((prev) => {
      let valorNormalizado: string;
      if (valor === "") {
        valorNormalizado = "";
      } else {
        const num = parseInt(valor, 10);
        valorNormalizado = isNaN(num) ? "" : String(Math.min(20, Math.max(0, num)));
      }
      const anterior = prev[partidaId] ?? { mandante: "", visitante: "" };
      return { ...prev, [partidaId]: { ...anterior, [campo]: valorNormalizado } };
    });
  }

  async function handleSalvar(): Promise<void> {
    // Coleta todos os palpites pendentes válidos em TODAS as fases
    const pendentes = (partidas ?? []).filter((p) => !estaEmJogo(p) && ehPendente(p.id));

    if (pendentes.length === 0) return;

    setIsSaving(true);
    const toastId = toast.loading("Salvando palpites...");

    try {
      await Promise.all(
        pendentes.map((p) => {
          const local = placaresLocais[p.id];
          return salvarPalpite({
            partidaId: p.id,
            golsMandante: parseInt(local.mandante, 10),
            golsVisitante: parseInt(local.visitante, 10),
          });
        })
      );

      // Limpa o estado local das partidas salvas; o badge "Salvo" passa a
      // derivar do palpiteSalvo retornado pelo refetch de useMeusPalpites
      setPlacaresLocais((prev) => {
        const next = { ...prev };
        for (const p of pendentes) {
          delete next[p.id];
        }
        return next;
      });

      toast.success("Palpites salvos!", { id: toastId });
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Tente novamente.";
      toast.error(`Erro ao salvar. ${mensagem}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-9 animate-pulse rounded-full bg-muted" aria-hidden="true" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden="true" />
        ))}
      </div>
    );
  }

  // ── Erro ao carregar partidas ──────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-destructive">
          Não foi possível carregar os jogos. Tente novamente.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="min-h-11 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // ── Nenhuma partida cadastrada ─────────────────────────────────────────────
  if (!partidas || partidas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700"
          aria-hidden="true"
        >
          <Target className="h-6 w-6" />
        </span>
        <p className="text-sm text-muted-foreground">Nenhum jogo aberto para palpite no momento.</p>
      </div>
    );
  }

  // ── Conteúdo principal ─────────────────────────────────────────────────────
  return (
    <>
      <FiltroFase
        fases={fasesDisponiveis}
        faseSelecionada={faseSelecionada}
        onSelect={setFaseSelecionada}
      />

      <ListaPalpites
        partidas={partidasFiltradas}
        meusPalpites={meusPalpites ?? []}
        placaresLocais={placaresLocais}
        onChangePlacar={handleChangePlacar}
        isSaving={isSaving}
      />

      <BotaoSalvar
        hasPendingChanges={hasPendingChanges}
        isSaving={isSaving}
        onSalvar={() => void handleSalvar()}
      />
    </>
  );
}
