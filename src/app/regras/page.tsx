import { Lock } from "lucide-react";

interface RegraItem {
  pontos: number;
  titulo: string;
  descricao: string;
  pontosClasses: string;
  itemClasses: string;
  tituloClasses: string;
  descricaoClasses: string;
  badgeMaximo?: true;
}

const REGRAS: RegraItem[] = [
  {
    pontos: 5,
    titulo: "Cravou o placar da vitória",
    descricao: "Acertou o placar exato de um jogo que teve vencedor.",
    pontosClasses: "bg-brand-800 text-gold-400",
    itemClasses: "border-brand-200 bg-brand-50",
    tituloClasses: "text-brand-800",
    descricaoClasses: "text-brand-700",
    badgeMaximo: true,
  },
  {
    pontos: 4,
    titulo: "Cravou o placar do empate",
    descricao: "Acertou o placar exato de um jogo que terminou empatado.",
    pontosClasses: "bg-brand-800 text-gold-400",
    itemClasses: "border-brand-200 bg-brand-50",
    tituloClasses: "text-brand-800",
    descricaoClasses: "text-brand-700",
  },
  {
    pontos: 3,
    titulo: "Acertou quem ganhou",
    descricao: "Apostou no vencedor certo, mas errou o placar.",
    pontosClasses: "bg-brand-800 text-gold-400",
    itemClasses: "border-border bg-card",
    tituloClasses: "text-foreground",
    descricaoClasses: "text-muted-foreground",
  },
  {
    pontos: 2,
    titulo: "Acertou que foi empate",
    descricao: "Apostou em empate e deu empate, mas errou o placar.",
    pontosClasses: "bg-brand-600 text-white",
    itemClasses: "border-border bg-card",
    tituloClasses: "text-foreground",
    descricaoClasses: "text-muted-foreground",
  },
  {
    pontos: 0,
    titulo: "Errou o resultado",
    descricao: "Não acertou quem venceu nem que o jogo seria empate.",
    pontosClasses: "bg-muted text-muted-foreground",
    itemClasses: "border-border bg-card",
    tituloClasses: "text-foreground",
    descricaoClasses: "text-muted-foreground",
  },
];

interface PalpiteExemplo {
  palpite: string;
  pontos: number;
  descricao: string;
}

interface ExemploPartida {
  resultado: string;
  palpites: PalpiteExemplo[];
}

const EXEMPLOS: ExemploPartida[] = [
  {
    resultado: "México 2 × 0",
    palpites: [
      { palpite: "2 × 0", pontos: 5, descricao: "cravou o placar da vitória" },
      { palpite: "1 × 0", pontos: 3, descricao: "acertou o vencedor, placar errado" },
      { palpite: "1 × 1", pontos: 0, descricao: "errou — apostou em empate" },
      { palpite: "0 × 2", pontos: 0, descricao: "errou — apostou no outro time" },
    ],
  },
  {
    resultado: "Empate 2 × 2",
    palpites: [
      { palpite: "2 × 2", pontos: 4, descricao: "cravou o placar do empate" },
      { palpite: "1 × 1", pontos: 2, descricao: "acertou o empate, placar errado" },
      { palpite: "2 × 1", pontos: 0, descricao: "errou — apostou em vencedor" },
    ],
  },
];

interface MultiplicadorFase {
  fase: string;
  multiplicador: string;
  exemplo: string;
  destaque?: true;
}

const MULTIPLICADORES: MultiplicadorFase[] = [
  {
    fase: "Fase de grupos e 32-avos",
    multiplicador: "×1",
    exemplo: "cravar a vitória = 5 pts",
  },
  {
    fase: "Oitavas e quartas",
    multiplicador: "×2",
    exemplo: "cravar a vitória = 10 pts",
  },
  {
    fase: "Semifinal e final",
    multiplicador: "×3",
    exemplo: "cravar a vitória = 15 pts",
    destaque: true,
  },
];

function getPalpiteBadgeClasses(pontos: number): string {
  if (pontos >= 3) return "bg-brand-800 text-gold-400";
  if (pontos > 0) return "bg-brand-600 text-white";
  return "bg-muted text-muted-foreground";
}

export default function RegrasPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground">Regras e pontuação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Como cada palpite vira pontos no ranking — e por que o mata-mata vale mais.
        </p>
      </header>

      <section aria-labelledby="titulo-pontuacao">
        <h2 id="titulo-pontuacao" className="mb-1 font-display text-base font-bold text-foreground">
          Pontuação base
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Estes são os pontos na fase de grupos. No mata-mata eles são multiplicados (veja abaixo).
        </p>
        <ul className="space-y-2">
          {REGRAS.map((regra) => (
            <li
              key={regra.pontos}
              className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm ${regra.itemClasses}`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-base font-bold ${regra.pontosClasses}`}
              >
                {regra.pontos}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${regra.tituloClasses}`}>{regra.titulo}</p>
                <p className={`text-xs ${regra.descricaoClasses}`}>{regra.descricao}</p>
              </div>
              {regra.badgeMaximo && (
                <span className="self-start rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-bold text-brand-950">
                  Máximo
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-multiplicador">
        <h2
          id="titulo-multiplicador"
          className="mb-1 font-display text-base font-bold text-foreground"
        >
          Multiplicador por fase
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Quanto mais perto da taça, mais cada palpite vale. Dá pra virar o bolão na reta final!
        </p>
        <ul className="space-y-2">
          {MULTIPLICADORES.map((item) => (
            <li
              key={item.fase}
              className={`flex items-center gap-3 rounded-2xl border p-4 shadow-sm ${
                item.destaque ? "border-gold-400 bg-brand-50" : "border-border bg-card"
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-base font-bold ${
                  item.destaque ? "bg-brand-800 text-gold-400" : "bg-brand-100 text-brand-800"
                }`}
              >
                {item.multiplicador}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{item.fase}</p>
                <p className="text-xs text-muted-foreground">{item.exemplo}</p>
              </div>
              {item.destaque && (
                <span className="self-start rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-bold text-brand-950">
                  Decisão
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          O 3º lugar conta como fase inicial (×1). O multiplicador vale para todas as faixas de
          pontos da partida (placar cravado, vencedor certo e empate certo).
        </p>
      </section>

      <section aria-labelledby="titulo-exemplos">
        <h2 id="titulo-exemplos" className="mb-1 font-display text-base font-bold text-foreground">
          Exemplos
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Pontos da fase de grupos (×1). No mata-mata, multiplique pelo peso da fase.
        </p>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
          {EXEMPLOS.map((exemplo) => (
            <div key={exemplo.resultado} className="p-4">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-brand-100 px-2 py-1 font-mono text-sm font-bold text-brand-800">
                  {exemplo.resultado}
                </span>
                <span className="text-xs text-muted-foreground">resultado real</span>
              </div>
              <ul className="space-y-2">
                {exemplo.palpites.map((item) => (
                  <li key={item.palpite} className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-brand-50 px-2 py-0.5 font-mono text-xs font-bold text-brand-700">
                      {item.palpite}
                    </span>
                    <span aria-hidden="true" className="text-xs text-muted-foreground">
                      =
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-xs font-bold ${getPalpiteBadgeClasses(item.pontos)}`}
                    >
                      {item.pontos} {item.pontos === 1 ? "pt" : "pts"}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.descricao}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          Palpite trava no apito
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
          Você pode alterar seu palpite quantas vezes quiser até o apito inicial da partida. Depois
          disso, ele fica travado e não pode ser mudado.
        </p>
      </div>

      <section
        aria-labelledby="titulo-desempate"
        className="rounded-2xl border border-border bg-muted/50 p-4"
      >
        <h2 id="titulo-desempate" className="text-sm font-semibold text-foreground">
          Desempate no ranking
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Quando dois participantes têm os mesmos pontos, decide nesta ordem:
        </p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-muted-foreground">
          <li>Maior número de placares cravados (acertou o placar exato)</li>
          <li>Maior número de resultados certos (acertou o vencedor ou o empate)</li>
          <li>Ordem alfabética (critério de último recurso)</li>
        </ol>
      </section>

      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold">Prorrogação e pênaltis não contam.</span> Vale só o placar
          do tempo normal (90 min). Se o jogo empatar e for decidido na prorrogação ou nos pênaltis,
          para o bolão ele continua <span className="font-semibold">empate</span> — quem palpitou
          empate pontua, quem palpitou vitória de um dos times erra.
          <br />
          <span className="font-semibold">Exemplo:</span> 1×1 que a França vence nos pênaltis conta
          como empate 1×1, não importa quem avançou.
        </p>
      </div>
    </div>
  );
}
