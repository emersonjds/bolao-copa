import { cn } from "@/shared/lib/utils";
import { FlagIcon } from "@/shared/ui/flag-icon";
import { nomeCurtoSelecao } from "@/shared/lib/selecao-nomes-pt";
import type { ClassificacaoGrupo, LinhaClassificacao } from "../lib/derivar-classificacao";

interface TabelaGrupoProps {
  classificacao: ClassificacaoGrupo;
}

type Zona = "classificado" | "repescagem" | "eliminado";

// Copa 2026: top-2 avançam direto; os 8 melhores 3ºs também — por isso o 3º é
// repescagem provável, não classificação garantida.
function zonaDaPosicao(posicao: number): Zona {
  if (posicao <= 2) return "classificado";
  if (posicao === 3) return "repescagem";
  return "eliminado";
}

// A borda-esquerda é o canal de status na linha. Largura uniforme por tabela
// (todas as linhas compartilham `finalizado`), então não há desalinhamento; ao
// encerrar o grupo ela engrossa e satura, sinalizando status confirmado.
function classesZona(zona: Zona, finalizado: boolean): string {
  const largura = finalizado ? "border-l-4" : "border-l-[3px]";
  if (zona === "eliminado") {
    return cn(largura, "border-l-transparent", finalizado ? "opacity-50" : "opacity-60");
  }
  if (zona === "classificado") {
    return cn(
      largura,
      finalizado ? "border-l-brand-500 bg-brand-50/50" : "border-l-brand-300 bg-brand-50/30"
    );
  }
  return cn(
    largura,
    finalizado ? "border-l-amber-400 bg-amber-50/50" : "border-l-amber-300 bg-amber-50/30"
  );
}

function celulaNumero(valor: number, comSinal = false): string {
  if (comSinal && valor > 0) return `+${valor}`;
  return String(valor);
}

function LinhaTabela({ linha, finalizado }: { linha: LinhaClassificacao; finalizado: boolean }) {
  const zona = zonaDaPosicao(linha.posicao);
  const confirmado = finalizado && zona !== "eliminado";

  return (
    <tr className={cn("border-b border-border last:border-b-0", classesZona(zona, finalizado))}>
      <td className="py-2 pr-1 pl-2 text-center font-mono text-sm font-bold text-muted-foreground">
        {linha.posicao}
      </td>
      <th scope="row" className="w-full max-w-0 py-2 pr-2 text-left font-normal">
        <span className="flex min-w-0 items-center gap-2">
          <FlagIcon codigoFifa={linha.selecao.codigo} nome={linha.selecao.nome} tamanho="sm" />
          <span
            title={linha.selecao.nome}
            className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
          >
            {nomeCurtoSelecao(linha.selecao.codigo, linha.selecao.nome)}
          </span>
          {confirmado && (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  zona === "classificado" ? "bg-brand-500" : "bg-amber-400"
                )}
              />
              <span className="sr-only">
                {zona === "classificado" ? "Classificado" : "Repescagem"}
              </span>
            </>
          )}
        </span>
      </th>
      <td className="px-1 py-2 text-center font-mono text-sm text-muted-foreground">
        {linha.jogos}
      </td>
      <td className="hidden px-1 py-2 text-center font-mono text-sm text-muted-foreground sm:table-cell">
        {linha.vitorias}
      </td>
      <td className="hidden px-1 py-2 text-center font-mono text-sm text-muted-foreground sm:table-cell">
        {linha.empates}
      </td>
      <td className="hidden px-1 py-2 text-center font-mono text-sm text-muted-foreground sm:table-cell">
        {linha.derrotas}
      </td>
      <td className="hidden px-1 py-2 text-center font-mono text-sm text-muted-foreground md:table-cell">
        {linha.golsPro}
      </td>
      <td className="hidden px-1 py-2 text-center font-mono text-sm text-muted-foreground md:table-cell">
        {linha.golsContra}
      </td>
      <td className="px-1 py-2 text-center font-mono text-sm text-foreground">
        {celulaNumero(linha.saldoGols, true)}
      </td>
      <td className="px-2 py-2 text-center font-mono text-sm font-bold text-brand-800">
        {linha.pontos}
      </td>
    </tr>
  );
}

export function TabelaGrupo({ classificacao }: TabelaGrupoProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full border-collapse">
        <caption className="sr-only">Classificação do grupo {classificacao.grupo}</caption>
        <thead>
          <tr className="border-b border-border bg-muted/50 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <th scope="col" className="py-2 pr-1 pl-2 text-center font-semibold">
              #
            </th>
            <th scope="col" className="py-2 pr-2 text-left font-semibold">
              Seleção
            </th>
            <th scope="col" className="px-1 py-2 text-center font-semibold" title="Jogos">
              J
            </th>
            <th
              scope="col"
              className="hidden px-1 py-2 text-center font-semibold sm:table-cell"
              title="Vitórias"
            >
              V
            </th>
            <th
              scope="col"
              className="hidden px-1 py-2 text-center font-semibold sm:table-cell"
              title="Empates"
            >
              E
            </th>
            <th
              scope="col"
              className="hidden px-1 py-2 text-center font-semibold sm:table-cell"
              title="Derrotas"
            >
              D
            </th>
            <th
              scope="col"
              className="hidden px-1 py-2 text-center font-semibold md:table-cell"
              title="Gols pró"
            >
              GP
            </th>
            <th
              scope="col"
              className="hidden px-1 py-2 text-center font-semibold md:table-cell"
              title="Gols contra"
            >
              GC
            </th>
            <th scope="col" className="px-1 py-2 text-center font-semibold" title="Saldo de gols">
              SG
            </th>
            <th scope="col" className="px-2 py-2 text-center font-semibold" title="Pontos">
              P
            </th>
          </tr>
        </thead>
        <tbody>
          {classificacao.linhas.map((linha) => (
            <LinhaTabela
              key={linha.selecao.id}
              linha={linha}
              finalizado={classificacao.finalizado}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
