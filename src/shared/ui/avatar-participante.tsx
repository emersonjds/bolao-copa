"use client";

import { useState } from "react";

interface AvatarParticipanteProps {
  nome: string;
  avatarUrl?: string | null;
  /** Tamanho em pixels. Padrão: 36. */
  tamanho?: number;
  className?: string;
}

// Quatro opções de cor selecionadas por hash simples do nome.
const COLOR_OPTIONS = [
  "bg-brand-100 text-brand-700",
  "bg-brand-200 text-brand-800",
  "bg-gold-300/30 text-gold-700",
  "bg-secondary text-brand-700",
] as const;

function getColorClasses(nome: string): string {
  const hash = nome.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLOR_OPTIONS[hash % COLOR_OPTIONS.length];
}

function getInitials(nome: string): string {
  const trimmed = nome.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return (parts[0][0] ?? "?").toUpperCase();
  }
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  const initials = (first + last).toUpperCase();
  return initials || "?";
}

/**
 * Avatar circular de participante: exibe foto de perfil ou iniciais do nome.
 * Suporta URLs externas (Google/OAuth) via <img> com fallback para iniciais
 * em caso de erro de carregamento.
 */
export function AvatarParticipante({
  nome,
  avatarUrl,
  tamanho = 36,
  className = "",
}: AvatarParticipanteProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = !!avatarUrl && !imgFailed;
  const initials = getInitials(nome);
  const colorClasses = getColorClasses(nome);
  const fontSize = Math.round(tamanho * 0.38);

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions
      <img
        src={avatarUrl}
        alt={nome}
        width={tamanho}
        height={tamanho}
        onError={() => setImgFailed(true)}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: tamanho, height: tamanho }}
      />
    );
  }

  return (
    <span
      aria-label={nome}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none ${colorClasses} ${className}`}
      style={{ width: tamanho, height: tamanho, fontSize }}
    >
      {initials}
    </span>
  );
}
