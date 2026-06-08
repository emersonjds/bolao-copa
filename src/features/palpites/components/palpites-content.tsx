"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { usePartidas } from "@/features/partidas";
import { useSupabaseUser } from "@/shared/lib/supabase";
import { useMeusPalpites, useSalvarPalpite } from "../api/queries";
import { traduzirErroSalvar } from "../lib/traduzir-erro-salvar";
import { estadoPalpite, filtrarHojeEProximoDia } from "../lib/estado-palpite";
import { lerRascunho, salvarRascunho, limparRascunho } from "../lib/rascunho-local";
import { useRefetchNaBorda } from "../api/use-refetch-na-borda";
import type { FaseCopa } from "@/entities/partida";
import { FiltroFase } from "./filtro-fase";
import { ListaPalpites } from "./lista-palpites";
import { BotaoSalvar } from "./botao-salvar";
import { SeletorVista, type VistaPalpites } from "./seletor-vista";
import { HistoricoContent } from "./historico-content";
import type { PlacarLocal } from "./card-palpite";

const ORDEM_FASES: FaseCopa[] = [
  "grupos",
  "trinta-e-dois",
  "oitavas",
  "quartas",
  "semifinal",
  "terceiro-lugar",
  "final",
];

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

  const [vista, setVista] = useState<VistaPalpites>("palpitar");
  const [faseSelecionada, setFaseSelecionada] = useState<FaseCopa>("grupos");
  const [placaresLocais, setPlacaresLocais] = useState<Record<string, PlacarLocal>>({});
  const [isSaving, setIsSaving] = useState(false);

  const userId = useSupabaseUser()?.id ?? null;
  // Instante de referência reativo: a borda (meia-noite / apito) atualiza este
  // estado, fazendo a derivação de estados dos jogos reagir sem polling.
  const [agora, setAgora] = useState<number>(() => Date.now());
  const onBorda = useCallback(() => {
    setAgora(Date.now());
    void refetch();
  }, [refetch]);
  useRefetchNaBorda(partidas ?? [], onBorda);

  const isLoading = isLoadingPartidas || isPendingPalpites;

  // "Fase de Grupos" sempre visível; outras apenas se houver partidas nelas
  const fasesDisponiveis: FaseCopa[] = ORDEM_FASES.filter(
    (fase) => fase === "grupos" || (partidas ?? []).some((p) => p.fase === fase)
  );

  // Aba "Palpitar": jogos liberados hoje + o próximo dia (mecânica dia a dia).
  const partidasFiltradas = filtrarHojeEProximoDia(
    (partidas ?? []).filter((p) => p.fase === faseSelecionada),
    agora
  );

  // Hidrata rascunhos locais dos jogos futuros visíveis (uma vez por partida).
  // Rastreia os ids já hidratados num ref para só processar partidas novas.
  const partidasHidratadas = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!userId) return;
    const futuras = (partidas ?? []).filter((p) => estadoPalpite(p, agora) === "futuro");
    const novos: Record<string, PlacarLocal> = {};
    for (const partida of futuras) {
      if (partidasHidratadas.current.has(partida.id)) continue;
      partidasHidratadas.current.add(partida.id);
      const rascunho = lerRascunho(userId, partida.id);
      if (rascunho) novos[partida.id] = rascunho;
    }
    if (Object.keys(novos).length === 0) return;
    // Hidratação única do localStorage (store externo) após o load assíncrono das
    // partidas; só roda para partidas ainda não hidratadas (guardadas no ref).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlacaresLocais((prev) => ({ ...prev, ...novos }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, partidas]);

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

  // Só os jogos liberados (de hoje) contam como pendência salvável.
  const hasPendingChanges = (partidas ?? []).some(
    (p) => estadoPalpite(p, agora) === "liberado" && ehPendente(p.id)
  );

  function handleChangePlacar(
    partidaId: string,
    campo: "mandante" | "visitante",
    valor: string
  ): void {
    let valorNormalizado: string;
    if (valor === "") {
      valorNormalizado = "";
    } else {
      const num = parseInt(valor, 10);
      valorNormalizado = isNaN(num) ? "" : String(Math.min(20, Math.max(0, num)));
    }

    const anterior = placaresLocais[partidaId] ?? { mandante: "", visitante: "" };
    const atualizado: PlacarLocal = { ...anterior, [campo]: valorNormalizado };
    setPlacaresLocais((prev) => ({ ...prev, [partidaId]: atualizado }));

    // Jogos futuros: persiste o rascunho no localStorage para sobreviver a reloads.
    const partida = (partidas ?? []).find((p) => p.id === partidaId);
    if (userId && partida && estadoPalpite(partida, agora) === "futuro") {
      salvarRascunho(userId, partidaId, atualizado);
    }
  }

  async function handleSalvar(): Promise<void> {
    const pendentes = (partidas ?? []).filter(
      (p) => estadoPalpite(p, agora) === "liberado" && ehPendente(p.id)
    );

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

      // Limpa qualquer rascunho local das partidas já gravadas no servidor.
      for (const p of pendentes) {
        if (userId) limparRascunho(userId, p.id);
      }

      toast.success("Palpites de hoje salvos!", { id: toastId });
    } catch (err) {
      const bruto = err instanceof Error ? err.message : "";
      const { tipo, texto } = traduzirErroSalvar(bruto);
      if (tipo === "lock") {
        // Trava de horário: aviso amigável, não erro. Recarrega as partidas
        // para os cards dos jogos que já começaram aparecerem como "Travado".
        toast.warning(texto, { id: toastId });
        void refetch();
      } else {
        toast.error(texto, { id: toastId });
      }
    } finally {
      setIsSaving(false);
    }
  }

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

  return (
    <div className="space-y-4">
      <SeletorVista vista={vista} onSelect={setVista} />

      {vista === "palpitar" ? (
        <>
          <FiltroFase
            fases={fasesDisponiveis}
            faseSelecionada={faseSelecionada}
            onSelect={setFaseSelecionada}
          />

          <ListaPalpites
            agora={agora}
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
      ) : (
        <HistoricoContent partidas={partidas ?? []} meusPalpites={meusPalpites ?? []} />
      )}
    </div>
  );
}
