"use client";

import { Medal } from "lucide-react";
import { AvatarParticipante } from "@/shared/ui/avatar-participante";
import { useDestaqueDia } from "../api/queries";

interface DestaqueDiaCardProps {
  /** Dia específico (ISO `YYYY-MM-DD`); omitido = dia apurado mais recente. */
  dia?: string;
  className?: string;
}

/** Hoje em BRT, no formato ISO, para comparar com o dia do destaque. */
function hojeBrtISO(deslocamentoDias = 0): string {
  const base = new Date(Date.now() + deslocamentoDias * 24 * 60 * 60 * 1000);
  return base.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Rótulo amigável do dia: "Hoje", "Ontem" ou "Ter · 30 jun". */
function rotuloDia(diaISO: string): string {
  // Meio-dia UTC evita desvio de fuso ao formatar só a data.
  const data = new Date(`${diaISO}T12:00:00Z`);
  const dia = data.toLocaleDateString("pt-BR", { day: "numeric", timeZone: "UTC" });
  const mes = data
    .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
    .replace(".", "");
  const dataCurta = `${dia} ${mes}`;
  if (diaISO === hojeBrtISO(0)) return `Hoje · ${dataCurta}`;
  if (diaISO === hojeBrtISO(-1)) return `Ontem · ${dataCurta}`;
  const semana = data
    .toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })
    .replace(".", "");
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)} · ${dataCurta}`;
}

export function DestaqueDiaCard({ dia, className }: DestaqueDiaCardProps) {
  const { data, isLoading } = useDestaqueDia(dia);

  if (isLoading) {
    return (
      <div
        className={`h-24 animate-pulse rounded-2xl bg-muted ${className ?? ""}`}
        aria-busy="true"
      />
    );
  }

  if (!data || data.length === 0) return null;

  const varios = data.length > 1;

  return (
    <section
      className={`rounded-2xl border-2 border-gold-400 bg-brand-800 p-4 text-white shadow-sm ${className ?? ""}`}
      aria-label="Craque do dia"
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-400/20 text-gold-400">
          <Medal className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-gold-400 uppercase">
            {varios ? "Craques do dia" : "Craque do dia"}
          </p>
          <p className="text-sm font-bold text-white">{rotuloDia(data[0].dia)}</p>
        </div>
      </header>

      <ul className="space-y-2">
        {data.map((destaque) => (
          <li key={destaque.participanteId} className="flex items-center gap-3">
            <AvatarParticipante nome={destaque.nome} avatarUrl={destaque.avatarUrl} tamanho={36} />
            <span className="flex-1 truncate text-sm font-semibold text-white">
              {destaque.nome}
            </span>
            <span className="font-mono text-sm font-bold text-gold-400">
              {destaque.pontosDia} {destaque.pontosDia === 1 ? "pt" : "pts"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
