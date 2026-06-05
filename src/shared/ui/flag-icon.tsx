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
 * Usa a lib `flag-icons` (CSS importado em app/layout.tsx).
 * Quando o código é desconhecido ou ausente, exibe um ícone de escudo.
 */
export function FlagIcon({ codigoFifa, nome, tamanho = "md" }: FlagIconProps) {
  const iso = codigoFifa ? getFlagCode(codigoFifa) : "xx";
  const sizeClass = SIZE_CLASSES[tamanho];
  const label = nome ?? "Seleção a definir";

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border/40 ${sizeClass}`}
    >
      {iso !== "xx" ? (
        <span className={`fi fi-${iso} fis block h-full w-full`} />
      ) : (
        <Shield className="h-1/2 w-1/2 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  );
}
