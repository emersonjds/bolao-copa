"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { getFlagCode } from "@/shared/lib/fifa-flags";

interface FlagIconProps {
  codigoFifa?: string | null;
  nome?: string;
  tamanho?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<FlagIconProps["tamanho"]>, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

/**
 * Exibe a bandeira de uma seleção a partir do código FIFA-3.
 * Usa o SVG do flagcdn.com (consistente em todo dispositivo, sem depender do
 * CSS do flag-icons — que conflita com o loader de SVG do projeto). Em código
 * desconhecido, ausente, ou falha de carregamento, mostra um ícone de escudo.
 */
export function FlagIcon({ codigoFifa, nome, tamanho = "md" }: FlagIconProps) {
  const [erro, setErro] = useState(false);
  const iso = codigoFifa ? getFlagCode(codigoFifa) : "xx";
  const sizeClass = SIZE_CLASSES[tamanho];
  const label = nome ?? "Seleção a definir";

  const mostraEscudo = iso === "xx" || erro;

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-black/10 ${sizeClass}`}
    >
      {mostraEscudo ? (
        <Shield className="h-1/2 w-1/2 text-muted-foreground" aria-hidden="true" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions -- bandeira externa em static export com fallback de erro
        <img
          src={`https://flagcdn.com/${iso}.svg`}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setErro(true)}
        />
      )}
    </span>
  );
}
