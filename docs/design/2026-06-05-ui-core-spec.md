# UI Core Spec — Bolão da Copa 2026

**Data:** 2026-06-05
**Autor:** PIXEL (UX/UI)
**Status:** aprovado para implementação
**Escopo:** 6 telas núcleo + decisões transversais de navegação e bandeiras

---

## Índice

0. Decisões transversais (bandeiras, navegação, tokens)
1. Dashboard — `/`
2. Palpites — `/palpites`
3. Ranking — `/ranking`
4. Calendário — `/calendario`
5. Regras e Pontuação — `/regras`
6. Admin — `/admin`
   A. Referência de componentes compartilhados

---

## 0. Decisões transversais

### 0.1 Bandeiras das seleções

#### Problema

O campo `Selecao.codigo` é o código FIFA de 3 letras (BRA, ARG, USA, FRA…). Precisamos renderizar a bandeira correspondente num static export sem dependência de API em runtime.

#### Opções avaliadas

| Opção                                          | Prós                                                                                       | Contras                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Emoji de bandeira (via regional indicators)    | Zero dependência, nativo                                                                   | Renderização inconsistente entre OS/browser; impossível controlar tamanho/forma; algumas versões Android exibem letras em vez de bandeira |
| Imagens SVG estáticas (pasta `/public/flags/`) | Controle total, zero CSS extra                                                             | Precisa commitar 48+ arquivos SVG; manutenção manual                                                                                      |
| `flag-icons` (npm, CSS sprites SVG)            | SVG consistente, escalável, ~43 KB CSS, mantido ativamente, funciona 100% em static export | Requer mapeamento FIFA-3 → ISO-2; 1 dependência                                                                                           |

#### Recomendacao: `flag-icons`

Instalar: `pnpm add flag-icons`

Importar uma vez no layout ou no componente raiz:

```
import "flag-icons/css/flag-icons.min.css";
```

Uso: `<span className="fi fi-br" />` (sempre ISO-2 minúsculo)

O mapeamento FIFA-3 → ISO-2 fica em `src/shared/lib/fifa-flags.ts` como um `Record<string, string>` estático, exportado como `FIFA_TO_ISO2`. A função auxiliar `getFlagCode(codigoFifa: string): string` retorna o código de 2 letras ou cai para `"xx"` (bandeira genérica) se não encontrar.

#### Mapa FIFA-3 para ISO-2 — Copa 2026 (fase de grupos confirmada)

O arquivo `fifa-flags.ts` deve conter ao menos:

```
ARG→AR  AUS→AU  BEL→BE  BRA→BR  CAN→CA  CMR→CM
COL→CO  CRC→CR  CRO→HR  DEN→DK  ECU→EC  EGY→EG
ENG→GB-ENG  ESP→ES  FRA→FR  GER→DE  GHA→GH
HND→HN  IRI→IR  JAP→JP  KOR→KR  MAR→MA  MEX→MX
NGA→NG  NED→NL  PAR→PY  PER→PE  POR→PT  QAT→QA
ROU→RO  RSA→ZA  SAU→SA  SCO→GB-SCO  SEN→SN
SRB→RS  SUI→CH  TUN→TN  URU→UY  USA→US  VEN→VE
WAL→GB-WLS  ...
```

Nota: para seleções britânicas (ENG, SCO, WAL), `flag-icons` aceita `fi fi-gb-eng`, `fi fi-gb-sct`, `fi fi-gb-wls`.

#### Componente FlagIcon

```
Componente: FlagIcon
Props: { codigoFifa: string; tamanho?: "sm" | "md" | "lg" }
Tamanhos: sm = 24px, md = 32px, lg = 40px
Forma: rounded-full com ring-1 ring-border/50
Fallback (código desconhecido ou mata-mata não definido): ícone `Shield` (lucide) preenchido com bg-muted text-muted-foreground
```

---

### 0.2 Navegação — Bottom Nav

#### Situação atual

4 itens: Início / Palpites / Ranking / Regras.

#### Decisao: manter 4 itens; Calendário é acessado via Dashboard

Justificativa: 5 itens a 375px reduz cada target para ~75px de largura — viável tecnicamente, mas a tab "Regras" seria removida ou substituída, e Regras é a primeira consulta de um novo participante. 5 itens também exige labels ultracurtas.

A solução mais simples e limpa: **o Calendário vive em `/calendario` mas não aparece no bottom nav**. O acesso primário é um link "Ver agenda completa" na seção de próximos jogos do Dashboard. O histórico de navegação (botão voltar) funciona naturalmente.

Se em sprints futuros o time quiser promover Calendário ao bottom nav, substituir "Regras" e mover regras para o menu de ajuda/info no TopBar (ícone "?").

#### Bottom Nav final (sem mudança estrutural)

```
[  Início  ] [  Palpites  ] [  Ranking  ] [  Regras  ]
LayoutDash     Target          Trophy        BookOpen
```

**Admin** (is_admin = true): uma 5ª tab "Admin" (ícone `ShieldCheck`) aparece **somente** para admins, empurrando os outros 4 para menor largura. Aceitável pois admin é usuário único e avançado.

---

### 0.3 Tokens do design system

```
Cor primária (verde-floresta):  bg-brand-800 = #1B4332
Cor de destaque (verde-gramado): brand-500 = #2d6a4f (tertiary nos tokens)
Dourado-troféu:                 bg-gold-500 / text-gold-400 / text-gold-500
Texto principal:                text-foreground
Texto secundário:               text-muted-foreground
Fundo de card:                  bg-card border border-border
Raio padrão:                    rounded-2xl (= var(--radius) = 0.875rem)
Raio interno (badges):          rounded-xl / rounded-lg
```

**Tipografia:**

- Títulos de tela (h1): `font-display text-2xl font-bold text-foreground`
- Títulos de seção (h2): `font-display text-lg font-bold text-foreground`
- Corpo: `font-sans text-sm text-foreground`
- Subtítulo / descrição: `text-sm text-muted-foreground`
- Labels de placar/ranking: `font-mono font-bold`
- Badges pequenos: `text-[11px] font-semibold uppercase tracking-wide`

**Espaçamento de página:** `px-4 py-5 space-y-6` (mobile); `sm:px-6`; `lg:max-w-2xl lg:mx-auto`

**Touch targets mínimos:** `min-h-11` (44px) em todos os elementos interativos.

---

## 1. Dashboard — `/`

### Propósito

Ponto de entrada. Responde: "Como estou no bolão? O que acontece agora?"

### Layout (mobile 375px)

```
┌─────────────────────────────────┐
│  TopBar (sticky, h-14)          │
├─────────────────────────────────┤
│  [HERO CARD — bg-brand-800]     │
│  Olá, {nome} ─────────────      │
│  Sua posição                    │
│  ── 5º lugar ──────────────     │
│  [Pontos totais] [Jogos pont.]  │
│  ─────────────── (grid 2 col)   │
├─────────────────────────────────┤
│  PRÓXIMO JOGO (destaque)        │
│  ┌──────────────────────────┐   │
│  │  BRA  2 × 1  ARG  [CTA] │   │
│  └──────────────────────────┘   │
├─────────────────────────────────┤
│  Próximos jogos        [Agenda] │
│  CardJogo × N                   │
│  [Ver agenda completa →]        │
├─────────────────────────────────┤
│  BottomNav (fixed, h-16)        │
└─────────────────────────────────┘
```

### Hierarquia de componentes

```
DashboardPage
├── HeroStats
│   ├── Saudação (p)
│   ├── Posição (span.font-mono.text-4xl.text-gold-400)
│   └── StatsGrid (dl.grid.grid-cols-2.gap-3)
│       ├── StatItem "Pontos totais"
│       └── StatItem "Jogos pontuados"
├── Section "próximo-jogo" (quando existe jogo hoje ou amanhã)
│   └── ProximoJogoDestaque (card diferenciado, borda dourada)
└── Section "próximos-jogos"
    ├── SectionHeader + Link "Ver agenda completa"
    └── ProximosJogos (componente existente)
```

### HeroStats

```
Wrapper: rounded-2xl bg-brand-800 p-5 text-white shadow-sm
Saudação: text-sm text-white/70  →  "Olá, {nome primerio nome}"
Título: font-display text-xl font-bold text-white  →  "Sua posição no bolão"
Posição: font-mono text-5xl font-bold leading-none text-gold-400  →  "5º"
Label posição: pb-1 text-sm text-white/70  →  "de {total} participantes"
StatsGrid: mt-5 grid grid-cols-2 gap-3

StatItem wrapper: rounded-xl bg-white/10 px-3 py-2.5
StatItem dt: text-[11px] uppercase tracking-wide text-white/60
StatItem dd: mt-0.5 font-mono text-xl font-bold text-white
```

**Dados exibidos** (vindos de `get_ranking()` filtrado pelo usuário logado):

- Posição: número inteiro
- "de {total} participantes"
- Pontos totais: número inteiro
- Jogos pontuados: número inteiro (partidas onde pontos > 0)

Removido da versão atual: "Taxa de acerto" — não está no modelo de dados, requer cálculo adicional, adiciona complexidade sem valor claro agora.

### ProximoJogoDestaque

Aparece somente quando existe partida com `status = "agendada"` com `dataHora` dentro das próximas 24h.

```
Wrapper: rounded-2xl border-2 border-gold-400 bg-card p-4 shadow-sm
Header: flex items-center justify-between
  Badge fase: rounded-md bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700
  Badge "Em breve": rounded-full bg-gold-500/15 px-2 py-0.5 text-[11px] font-semibold text-gold-600

Corpo (3 colunas): flex items-center gap-2
  Mandante: flex-1 flex flex-col items-center gap-1.5
    FlagIcon tamanho="lg" (40px)
    Nome: text-sm font-semibold text-foreground truncate
  Centro: flex flex-col items-center
    "vs": font-mono text-base font-bold text-muted-foreground
    Horário: text-[11px] text-muted-foreground
  Visitante: (espelho do mandante)

CTA: mt-4 h-11 w-full rounded-xl bg-brand-800 text-sm font-semibold text-white
  → "Dar palpite" (navega para /palpites com âncora do jogo)
  → Se palpite já salvo: bg-brand-100 text-brand-700 "Alterar palpite" (sem destaque forte)
  → Se travado: bg-muted text-muted-foreground cursor-not-allowed "Jogo iniciado"
```

### Link "Ver agenda completa"

```
Dentro de SectionHeader:
<Link href="/calendario" className="text-sm font-medium text-brand-600 hover:text-brand-800 underline-offset-2 hover:underline">
  Ver agenda completa
</Link>
```

Em mobile (< sm), o link aparece abaixo da lista de jogos como botão outline para maior área de toque:

```
<Link className="flex h-11 w-full items-center justify-center rounded-xl border border-brand-200 text-sm font-medium text-brand-700 hover:bg-brand-50">
  Ver agenda completa da Copa
</Link>
```

### Estados

| Estado        | Descrição                                            | UI                                                                                                                                                        |
| ------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loading`     | Carregando dados do ranking e partidas               | HeroStats: skeleton `animate-pulse rounded-2xl bg-muted h-40`; ProximosJogos: 3 skeletons h-36 (já implementado)                                          |
| `autenticado` | Dados carregados com sucesso                         | Layout completo descrito acima                                                                                                                            |
| `sem sessão`  | Usuário não logado                                   | HeroStats mostra card neutro "Faça login para ver sua posição" com CTA "Entrar com Google" (bg-brand-800); lista de jogos aparece normalmente (read-only) |
| `sem jogos`   | Nenhuma partida agendada (improvável mas necessário) | p.text-sm.text-muted-foreground "Nenhum jogo agendado por enquanto."                                                                                      |
| `erro`        | Falha na query                                       | p.text-sm.text-destructive "Não foi possível carregar os dados. Tente novamente." + botão "Tentar novamente"                                              |

### Responsividade

```
375px (2xsm): layout descrito acima, padding px-4
768px (md): layout em uma coluna com max-w-xl mx-auto px-6
1280px (lg): duas colunas: esquerda HeroStats + ProximoJogoDestaque; direita ProximosJogos
  → grid grid-cols-[1fr_360px] gap-6; coluna direita: position sticky top-20
```

---

## 2. Palpites — `/palpites`

### Propósito

Fazer e editar palpites de placar por jogo. Clareza sobre o estado de cada palpite (aberto/salvo/travado) é a prioridade zero.

### Layout (mobile 375px)

```
┌─────────────────────────────────┐
│  TopBar (sticky)                │
├─────────────────────────────────┤
│  h1 "Meus palpites"             │
│  p "Palpite trava no apito"     │
├─────────────────────────────────┤
│  [Filtro de fase — TabList]     │
│   Grupos │ Oitavas │ Quartas…   │
├─────────────────────────────────┤
│  Seção "Rodada 1 — 11 jun"      │  ← sticky date header
│  ┌──────────────────────────┐   │
│  │ CardPalpite (jogo 1)     │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ CardPalpite (jogo 2)     │   │
│  └──────────────────────────┘   │
│  Seção "Rodada 2 — 12 jun"      │
│  ...                            │
├─────────────────────────────────┤
│  [Botão Salvar — sticky bottom] │  ← só quando há alterações não salvas
│  BottomNav (fixed)              │
└─────────────────────────────────┘
```

### Hierarquia de componentes

```
PalpitesPage
├── LoginCTA (quando sem sessão)
└── PalpitesContent (quando autenticado)
    ├── PageHeader
    ├── FiltroFase (TabList horizontal com scroll)
    ├── ListaPalpites (scroll vertical)
    │   └── GrupoPorData × N (sections com sticky header de data)
    │       └── CardPalpite × N
    └── BotaoSalvar (sticky bottom, visível somente com alterações pendentes)
```

### FiltroFase

```
Wrapper: overflow-x-auto -mx-4 px-4 (scroll horizontal sem cortar bordas)
  → No-scrollbar: [&::-webkit-scrollbar]:hidden
Lista: flex gap-2 py-1 (não quebra linha)
Tab ativa: rounded-full bg-brand-800 px-4 py-1.5 text-sm font-semibold text-white
Tab inativa: rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground hover:border-brand-200 hover:text-foreground
```

Fases disponíveis como tabs: "Fase de Grupos" / "Oitavas" / "Quartas" / "Semis" / "Final".
A tab "Fase de Grupos" está sempre visível; as outras aparecem conforme as partidas existirem no banco.

### Sticky date header

```
Wrapper: sticky top-14 z-10 bg-background/95 backdrop-blur py-2 -mx-4 px-4
Texto: text-[13px] font-semibold text-muted-foreground uppercase tracking-wide
Exemplo: "Rodada 1 · Dom, 11 jun"
```

### CardPalpite

O card é o elemento central da tela. Três estados visuais distintos:

#### Estado ABERTO (pode editar)

```
Wrapper: rounded-2xl border border-border bg-card p-4 shadow-sm
  → Quando há alteração não salva: border-brand-400 ring-1 ring-brand-400/30

Header do card: flex items-center justify-between mb-3
  Badge fase/grupo: rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-brand-700
    → "Grupo A" / "Oitavas de Final"
  Horário: text-[11px] text-muted-foreground
    → "11 jun · 16h00" (horário local do usuário via Intl)

Corpo (3 colunas): flex items-center gap-2
  SelecaoComPalpite (mandante): flex-1 flex flex-col items-center gap-1.5
    FlagIcon tamanho="md" (32px)
    Nome: text-xs font-medium text-foreground text-center max-w-[80px] truncate
  InputsPlacar: flex-shrink-0 flex items-center gap-1.5
    Input mandante: w-12 h-11 text-center font-mono text-xl font-bold
      → border border-input rounded-xl bg-background text-foreground
      → focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 outline-none
      → type="number" min="0" max="20" inputMode="numeric"
    Separador: text-lg font-mono font-bold text-muted-foreground  →  "×"
    Input visitante: (espelho do input mandante)
  SelecaoComPalpite (visitante): (espelho do mandante)
```

Nota: a largura de 12 (48px) por input é apertada para 375px. O cálculo total da linha:

- px-4 × 2 = 32px
- FlagIcon × 2 = 64px (32px cada)
- Nome × 2 ≈ 80px (truncado)
- Inputs × 2 = 96px (48px cada) + separador 16px = 112px
- Gaps: 4 × 8px = 32px
- Total: 32 + 64 + 80 + 112 + 32 = 320px ✓ (cabe em 375px - 32px padding = 343px com folga)

Em telas `xsm` (425px+): aumentar inputs para `w-14 h-12 text-2xl`.

#### Estado SALVO (salvo, mas ainda pode editar antes do apito)

```
Wrapper: rounded-2xl border border-brand-200 bg-card p-4 shadow-sm

Badge de confirmação (canto superior direito do header):
  rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 flex items-center gap-1
  → ícone Check h-3 w-3
  → "Salvo"

Inputs: mantêm aparência editável (usuário pode corrigir até o apito)
```

#### Estado TRAVADO (partida iniciou ou encerrou)

```
Wrapper: rounded-2xl border border-border bg-card/60 p-4 opacity-80
  → Overlay interno: pointer-events-none (bloqueia interação)

Badge TRAVADO (header):
  rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground flex items-center gap-1
  → ícone Lock h-3 w-3
  → "Travado"

Inputs desabilitados:
  bg-muted border-transparent text-muted-foreground cursor-not-allowed
  disabled aria-disabled="true"

Quando encerrado e há placar oficial:
  → abaixo dos inputs, linha extra:
    "Resultado oficial: 2 × 1" (text-xs text-muted-foreground)
  → Pontos obtidos (badge):
    rounded-full bg-brand-800 px-2.5 py-0.5 font-mono text-sm font-bold text-gold-400
    → "5 pts" / "3 pts" / "1 pt" / "0 pts"
```

#### Estado RESULTADO (mata-mata, confronto ainda indefinido)

```
Wrapper: rounded-2xl border border-dashed border-border bg-muted/30 p-4
Conteúdo central:
  span text-sm text-muted-foreground text-center  →  "Classificados após os jogos de grupos"
Inputs: não exibidos (jogo sem seleções definidas)
```

### BotaoSalvar (sticky)

Visível somente quando `hasPendingChanges === true`.

```
Wrapper: fixed bottom-16 inset-x-0 px-4 pb-2 z-10
  → Gradient de fundo para separar visualmente: bg-gradient-to-t from-background via-background/95 to-transparent pt-4

Botão: h-12 w-full max-w-md mx-auto rounded-2xl bg-brand-800 font-semibold text-white shadow-lg
  → Texto padrão: "Salvar palpites"
  → Estado loading: spinner inline + "Salvando..."
  → Sucesso (1.5s): bg-brand-600 + ícone Check + "Palpites salvos!"

Transição: animate-in slide-in-from-bottom duration-200 (framer-motion ou CSS)
```

### Estados da página

| Estado                           | UI                                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `loading`                        | Filtro de fase: skeleton strip h-9; 4 cards skeleton h-40 animate-pulse                                                 |
| `sem sessão`                     | LoginCTA centralizado (já implementado)                                                                                 |
| `autenticado, sem jogos abertos` | Estado vazio: ícone Target bg-brand-50, texto "Nenhum jogo aberto para palpite no momento.", link "Ver agenda completa" |
| `erro`                           | texto-destructive + botão "Tentar novamente"                                                                            |
| `todos travados`                 | lista read-only com todos os cards no estado TRAVADO; sem BotaoSalvar                                                   |
| `salvando`                       | botão em loading; inputs desabilitados temporariamente; toast.loading()                                                 |
| `salvo com sucesso`              | toast.success("Palpites salvos!"); badge "Salvo" por card; BotaoSalvar some                                             |
| `erro ao salvar`                 | toast.error("Erro ao salvar. Tente novamente."); botão volta ao estado normal                                           |

### Responsividade

```
375px: layout descrito acima
768px (md): max-w-xl mx-auto; cards levemente maiores; inputs w-14
1280px (lg): duas colunas — FiltroFase fixo à esquerda (sidebar); lista à direita
```

---

## 3. Ranking — `/ranking`

### Propósito

"Quem está ganhando o bolão?" Motivação competitiva. O usuário logado deve se identificar instantaneamente.

### Layout (mobile 375px)

```
┌─────────────────────────────────┐
│  TopBar (sticky)                │
├─────────────────────────────────┤
│  h1 "Ranking"                   │
│  p "Classificação do bolão"     │
├─────────────────────────────────┤
│  [Pódio top-3 — card especial]  │
│    2º     1º     3º             │
│   [ava]  [ava]  [ava]           │
│   Nome   Nome   Nome            │
│   pts    pts    pts             │
├─────────────────────────────────┤
│  [Minha posição — banner fixo]  │  ← só quando usuário não está no top-3
├─────────────────────────────────┤
│  Lista (4º em diante)           │
│  ┌──────────────────────────┐   │
│  │ 4 [ava] Nome     120 pts │   │
│  └──────────────────────────┘   │
│  ...                            │
├─────────────────────────────────┤
│  BottomNav (fixed)              │
└─────────────────────────────────┘
```

### Hierarquia de componentes

```
RankingPage
├── PageHeader
├── Podio (posições 1-2-3)
│   └── PodioItem × 3
├── MinhaPosiçãoBanner (condicional — só quando fora do top-3)
└── ListaRanking (posições 4+)
    └── ItemRanking × N
```

### Podio

```
Wrapper: rounded-2xl bg-gradient-to-b from-brand-800 to-brand-900 p-5 text-white shadow-sm
Layout: flex items-end justify-center gap-4
  → Ordem visual: 2º | 1º | 3º (o líder é mais alto)

PodioItem (1º lugar):
  Container: flex flex-col items-center gap-1.5
  Avatar: h-16 w-16 rounded-full ring-3 ring-gold-400 overflow-hidden
    → Foto (img) ou iniciais (span.bg-brand-600.font-semibold.text-white)
  Badge posição: -mt-2 h-6 w-6 rounded-full bg-gold-400 text-[11px] font-bold text-brand-950 flex items-center justify-center → "1"
  Nome: text-sm font-semibold text-white truncate max-w-[72px] text-center
  Pontos: font-mono text-base font-bold text-gold-300
  Coluna (barra decorativa): mt-2 w-16 rounded-t-xl bg-white/20 → h-12 (1º), h-8 (2º), h-4 (3º)

PodioItem (2º e 3º): versão menor
  Avatar: h-12 w-12 ring-2 ring-white/40
  Badge posição: bg-white/20 text-white/80
  Pontos: text-sm text-white/80
```

### MinhaPosiçãoBanner

Aparece abaixo do pódio, fixo (não sticky), quando o usuário logado está na posição 4 ou abaixo.

```
Wrapper: rounded-2xl border-2 border-brand-300 bg-brand-50 p-3 flex items-center gap-3
Posição: font-mono text-2xl font-bold text-brand-800 w-8 text-center  →  "7º"
Avatar: h-10 w-10 rounded-full ring-2 ring-brand-300
Info: flex flex-col flex-1
  Nome: text-sm font-semibold text-brand-800  →  "Você"
  Pontos: text-xs text-brand-600 font-mono  →  "87 pontos · 12 jogos pontuados"
Label: rounded-full bg-brand-800 px-2 py-0.5 text-[10px] font-semibold text-white  →  "Sua posição"
```

### ItemRanking (4º em diante)

```
Wrapper: flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm
  → Usuário logado: border-brand-200 bg-brand-50/50

Posição: font-mono text-sm font-bold text-muted-foreground w-6 shrink-0 text-right
Avatar: h-9 w-9 rounded-full bg-brand-100 ring-1 ring-brand-200 shrink-0
  → Foto (img) ou iniciais (span.font-semibold.text-brand-700.text-xs)
Info: flex flex-col flex-1 min-w-0
  Nome: text-sm font-semibold text-foreground truncate
  Detalhe: text-xs text-muted-foreground  →  "{jogos_pontuados} jogos pontuados"
Pontos: font-mono text-sm font-bold text-foreground shrink-0
  → "87 pts"
```

### Estados

| Estado           | UI                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------- |
| `loading`        | Pódio: skeleton rounded-2xl h-40 animate-pulse; Lista: 5 itens skeleton h-14        |
| `vazio`          | ícone Trophy bg-gold-500/15; "O ranking aparece após o primeiro resultado apurado." |
| `erro`           | text-destructive + botão "Tentar novamente"                                         |
| `sem sessão`     | Ranking visível (read-only); MinhaPosiçãoBanner não aparece                         |
| `1 participante` | Pódio mostra só o líder centralizado; sem lista abaixo                              |

### Responsividade

```
375px: layout descrito acima
768px: max-w-lg mx-auto; pódio com avatares maiores (h-20 para 1º)
1280px: ranking em duas colunas — pódio à esquerda fixo; lista à direita com scroll
```

---

## 4. Calendário — `/calendario`

### Propósito

Visão da agenda completa da Copa. "Quando é o próximo jogo do Brasil? Que jogos têm hoje?"

### Decisao de UX: agenda vertical agrupada por dia com seletor de semana

**Por que não grade de calendário mensal:**
Em mobile (375px), uma grade mensal com 104 jogos distribuídos em 39 dias torna cada célula minúscula e não communica horário/times. A agenda vertical é o padrão que o usuário já conhece (Google Calendar no modo "Agenda", WhatsApp Business, apps de esporte).

**Estrutura escolhida:**

1. **Seletor de semana** no topo: 7 colunas de dias (Dom→Sab), cada dia mostra número + dia da semana, o dia ativo é selecionado (pill verde). Scroll horizontal para semanas futuras.
2. **Lista vertical** com `sticky` header de data para cada dia com jogos.
3. **Destaque visual** para "Hoje" no seletor e no header da lista.

### Layout (mobile 375px)

```
┌─────────────────────────────────┐
│  TopBar (sticky)                │
├─────────────────────────────────┤
│  h1 "Agenda da Copa"            │
│  p "Copa do Mundo · Jun-Jul 2026"│
├─────────────────────────────────┤
│  [SeletorSemana — sticky]       │
│   ← Qui Sex SAB DOM seg ter qua →│
│      11  12  13  14  15  16  17  │
├─────────────────────────────────┤
│  [sticky] SAB, 13 JUN · Grupo A │
│  ┌──────────────────────────┐   │
│  │  16h00  BRA × ARG  Grup │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │  19h00  FRA × GER  Grup │   │
│  └──────────────────────────┘   │
│  [sticky] DOM, 14 JUN · Grupo B │
│  ...                            │
├─────────────────────────────────┤
│  BottomNav (fixed)              │
└─────────────────────────────────┘
```

### Hierarquia de componentes

```
CalendarioPage
├── PageHeader
├── SeletorSemana (sticky top-14 z-10)
│   ├── BotaoSemanaAnterior (<)
│   ├── DiaItem × 7 (scroll horizontal)
│   └── BotaoProximaSemana (>)
└── AgendaList
    └── GrupoDia × N (um por dia com jogos)
        ├── HeaderDia (sticky)
        └── ItemJogo × N
```

### SeletorSemana

```
Wrapper: sticky top-14 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2
Layout: flex items-center gap-1
Botões de navegação: h-8 w-8 rounded-full border border-border flex items-center justify-center
  → ícone ChevronLeft / ChevronRight h-4 w-4 text-muted-foreground

Lista de dias: flex-1 flex justify-between overflow-x-auto [&::-webkit-scrollbar]:hidden
DiaItem:
  Container: flex flex-col items-center gap-0.5 min-w-[40px] cursor-pointer
  Dia semana: text-[10px] uppercase text-muted-foreground  →  "SAB"
  Número: h-8 w-8 flex items-center justify-center rounded-full font-mono text-sm font-medium
    → Inativo: text-foreground hover:bg-muted
    → Ativo (selecionado): bg-brand-800 text-white
    → Hoje (não selecionado): text-brand-700 font-bold ring-1 ring-brand-300
    → Com jogos: ponto indicador abaixo do número (h-1 w-1 rounded-full bg-brand-400)
```

### HeaderDia (sticky dentro da lista)

```
Position: sticky top-[calc(3.5rem+48px)] z-5 (below SeletorSemana)
Wrapper: bg-background/90 backdrop-blur py-1.5 -mx-4 px-4
Texto: flex items-center gap-2
  Data: text-[13px] font-bold text-foreground uppercase  →  "SAB, 13 JUN"
  Contador: rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700
    → "{n} jogo{s}"
  Badge HOJE: rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-white → "Hoje"
    (somente no dia atual)
```

### ItemJogo

Item compacto — sem necessidade de inputs (só leitura). CTA contextual para palpitar.

```
Wrapper: rounded-xl border border-border bg-card px-3 py-3 flex items-center gap-3 shadow-sm
  → Jogo ao vivo: border-destructive/40 bg-destructive/5

Horário: font-mono text-sm font-bold text-muted-foreground w-12 shrink-0  →  "16h00"
  → Ao vivo: text-destructive animate-pulse ou ponto vermelho pulsante

Confronto: flex-1 flex items-center gap-1.5 min-w-0
  Mandante: flex items-center gap-1 flex-1 justify-end
    Nome: text-xs font-medium text-foreground truncate text-right
    FlagIcon tamanho="sm" (24px)
  VS/Placar: px-2 font-mono text-sm font-bold text-muted-foreground shrink-0
    → Agendado: "×" em muted
    → Ao vivo / encerrado: "2 × 1" (placar real)
  Visitante: flex items-center gap-1 flex-1
    FlagIcon tamanho="sm" (24px)
    Nome: text-xs font-medium text-foreground truncate

Badge fase: rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 shrink-0
  → "Gr.A" / "R32" / "Oitav."

CTA ícone (somente para jogos agendados, usuário logado):
  Link href="/palpites#{partida.id}"
  h-9 w-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0
  → ícone Target h-4 w-4 text-brand-700
  → aria-label="Dar palpite para {mandante} vs {visitante}"
  → Se já tem palpite: bg-brand-100 ícone Check text-brand-700
```

### Filtro rápido de fase (opcional, secundário)

Abaixo do seletor de semana, só visible quando o usuário está no mata-mata:

```
overflow-x-auto flex gap-2 px-4 py-1
Chips: rounded-full border px-3 py-1 text-xs font-medium
  → Ativo: bg-brand-800 text-white border-brand-800
  → Inativo: border-border text-muted-foreground hover:border-brand-200
Opções: "Todos" / "Grupos" / "R32" / "Oitavas" / "Quartas" / "Semis" / "Final"
```

### Estados

| Estado          | UI                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `loading`       | SeletorSemana: 7 skeletons h-8 w-8 animate-pulse; 3 ItemJogo skeletons h-14                         |
| `dia sem jogos` | Ao selecionar dia sem jogo: "Nenhum jogo neste dia." text-sm text-muted-foreground py-8 text-center |
| `erro`          | text-destructive + "Tentar novamente"                                                               |
| `data passada`  | ItemJogo mostra placar real se encerrado; sem CTA de palpite; opacidade reduzida (opacity-70)       |

### Responsividade

```
375px: layout descrito acima
768px: SeletorSemana mostra 14 dias (2 semanas) visíveis; ItemJogo com mais detalhes
1280px: layout de duas colunas — SeletorSemana vira sidebar calendário mensal (grade real); direita mantém a lista
```

---

## 5. Regras e Pontuação — `/regras`

### Propósito

Tirar dúvidas sobre como pontuar. Deve ser completamente self-explanatory, sem precisar de suporte.

### Layout (mobile 375px)

```
┌─────────────────────────────────┐
│  TopBar (sticky)                │
├─────────────────────────────────┤
│  h1 "Regras e pontuação"        │
│  p "Como cada palpite vira pontos"│
├─────────────────────────────────┤
│  [Tabela de pontuação]          │
│  ┌──────────────────────────┐   │
│  │ [5] Placar exato         │   │
│  │ [3] Vencedor + saldo     │   │
│  │ [1] Só o vencedor/empate │   │
│  │ [0] Errou                │   │
│  └──────────────────────────┘   │
├─────────────────────────────────┤
│  [Exemplos ilustrativos]        │
├─────────────────────────────────┤
│  [Dica: trava do palpite]       │
├─────────────────────────────────┤
│  [Desempate no ranking]         │
├─────────────────────────────────┤
│  [Nota sobre pênaltis]          │
├─────────────────────────────────┤
│  BottomNav (fixed)              │
└─────────────────────────────────┘
```

### Tabela de pontuação (refinamento do existente)

A estrutura de lista atual está correta. Refinamentos:

```
Lista: space-y-2

Item "Placar exato":
  Wrapper: flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 shadow-sm
  Badge: h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-brand-800 font-mono text-base font-bold text-gold-400
    → "5"
  Texto:
    p.text-sm.font-semibold.text-brand-800  →  "Placar exato"
    p.text-xs.text-brand-700  →  "Acertou o número de gols dos dois times."
  Badge destaque: ml-auto self-start rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-bold text-brand-950
    → "Máximo"

Item "Vencedor + saldo de gols":
  Wrapper: border-border bg-card (neutro)
  Badge: bg-brand-800 text-gold-400  →  "3"
  Texto: "Vencedor + saldo de gols" / "Quem venceu e por quanto — não vale em empates."

Item "Só o vencedor ou empate certo":
  Badge: bg-brand-600 text-white  →  "1"
  Texto: "Só o vencedor — ou o empate certo" / "Acertou quem ganhou (ou que empataria), mas não o placar exato."

Item "Errou":
  Badge: bg-muted text-muted-foreground  →  "0"
  Texto: "Errou" / "Não acertou o resultado da partida."
```

### Exemplos ilustrativos

Seção com 2-3 exemplos concretos para tirar dúvidas de borda.

```
h2: font-display text-base font-bold text-foreground  →  "Exemplos"
Wrapper: rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm

Exemplo individual:
  Header: flex items-center gap-2 mb-2
    Badge resultado oficial: rounded-md bg-brand-100 px-2 py-1 font-mono text-sm font-bold text-brand-800
      →  "Brasil 2 × 1 Argentina"
  Lista de sub-exemplos (bullets visuais):
    Item: flex items-center gap-2
      → Palpite: "2 × 1" (fundo brand-50 rounded-lg px-2 py-0.5 font-mono text-xs font-bold text-brand-700)
      → "="
      → Badge pontos: rounded-full bg-brand-800 px-2 py-0.5 font-mono text-xs font-bold text-gold-400 → "5 pts"
      → Texto: text-xs text-muted-foreground → "placar exato"
```

**Exemplos a incluir:**

1. Resultado real: Brasil 2×1 Argentina
   - Palpite 2×1 → 5 pts (placar exato)
   - Palpite 2×0 → 3 pts (vencedor + saldo: Brasil ganhou por 2, o palpite foi vitória do Brasil por 2 — ATENÇÃO: saldo = gols_mandante - gols_visitante. 2-1=1, 2-0=2. São saldos diferentes → apenas 1 pt, não 3)

   Corrijo o exemplo: Resultado real 2×1 (saldo +1 para Brasil)
   - Palpite 3×2 → 3 pts (vencedor certo + saldo +1 igual)
   - Palpite 1×0 → 1 pt (vencedor certo mas saldo diferente: +1 vs +1... aguarde, 3-2=+1, 1-0=+1, então seria 3 pts)

   Melhor exemplo: Resultado 3×1 (saldo +2)
   - Palpite 3×1 → 5 pts
   - Palpite 2×0 → 3 pts (Brasil venceu, saldo +2 = saldo +2)
   - Palpite 1×0 → 1 pt (Brasil venceu, saldo diferente)
   - Palpite 1×2 → 0 pts

2. Resultado real: Empate 1×1
   - Palpite 1×1 → 5 pts
   - Palpite 0×0 → 1 pt (acertou o empate, não o placar; tier de 3 pts não se aplica a empates)
   - Palpite 2×1 → 0 pts

### Dica: trava do palpite

```
Wrapper: rounded-2xl bg-amber-50 border border-amber-200 p-4
Ícone: Lock h-4 w-4 text-amber-600 (inline no título)
Título: text-sm font-semibold text-amber-800  →  "Palpite trava no apito"
Texto: text-xs leading-relaxed text-amber-700
  →  "Você pode alterar seu palpite quantas vezes quiser até o apito inicial da partida. Depois disso, ele fica travado e não pode ser mudado."
```

### Critério de desempate no ranking

```
Wrapper: rounded-2xl bg-muted/50 border border-border p-4
Título: text-sm font-semibold text-foreground  →  "Desempate no ranking"
Conteúdo: ol.list-decimal.list-inside.space-y-1.text-xs.text-muted-foreground
  → 1. Maior número de placares exatos (5 pts)
  → 2. Maior número de acertos de vencedor (1 pt ou mais)
  → 3. Ordem alfabética (critério de último recurso)
```

Nota para o implementador: o critério de desempate não está implementado na função `get_ranking()` ainda. Este spec define a regra que a UI deve exibir para o usuário; a implementação no banco é responsabilidade da feature de ranking.

### Nota sobre pênaltis

```
Wrapper: rounded-2xl bg-muted/30 border border-dashed border-border p-3
Texto: text-xs text-muted-foreground leading-relaxed
  →  "Prorrogação e pênaltis: vale apenas o placar do tempo normal (90 min). No mata-mata, se o jogo for decidido nos pênaltis, o resultado para pontuação é empate no tempo normal — independentemente de quem avançou."
```

---

## 6. Admin — `/admin`

### Propósito

Ferramenta interna do administrador para inserir resultados, marcar partidas como encerradas e definir confrontos do mata-mata. Protegida por `is_admin = true`. Design funcional e direto — sem enfeites, sem ambiguidade.

### Proteção de rota

Sem sessão → redireciona para `/` com toast.error("Acesso restrito.")
Com sessão, `is_admin = false` → mesma mensagem
Com sessão, `is_admin = true` → exibe a tela

### Layout (mobile 375px)

```
┌─────────────────────────────────┐
│  TopBar (sticky) + badge "ADMIN"│
├─────────────────────────────────┤
│  h1 "Painel admin"              │
│  p "Inserção de resultados"     │
├─────────────────────────────────┤
│  [FiltroStatus — tabs]          │
│   Pendentes │ Encerradas        │
├─────────────────────────────────┤
│  [FiltroFase — chips scroll]    │
├─────────────────────────────────┤
│  Lista de partidas              │
│  ┌──────────────────────────┐   │
│  │ CardAdmin (partida)      │   │
│  └──────────────────────────┘   │
├─────────────────────────────────┤
│  BottomNav (com tab Admin)      │
└─────────────────────────────────┘
```

### TopBar com badge Admin

O TopBar recebe um badge adicional ao lado do nome do app quando `is_admin`:

```
Adicionar ao lado esquerdo após o nome:
  rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide
  → "ADMIN"
```

### FiltroStatus

```
Wrapper: flex gap-2
Tab "Pendentes" / "Encerradas":
  → Ativo: rounded-full bg-brand-800 px-4 py-1.5 text-sm font-semibold text-white
  → Inativo: rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground
```

"Pendentes" = partidas com status `agendada` ou `ao-vivo`.
"Encerradas" = partidas com status `encerrada`.

### CardAdmin

O card de resultado é o elemento central. Dois modos: **edição inline** e **confirmado**.

#### Partida agendada — modo de edição

```
Wrapper: rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3

Header: flex items-center justify-between
  Info jogo: flex flex-col
    p.text-[11px].text-muted-foreground  →  "Qui, 11 jun · 16h00 · Grupo A"
    p.text-sm.font-semibold.text-foreground  →  "Brasil × Argentina"
  StatusPill (componente existente)

Confronto com inputs: flex items-center gap-3
  SelecaoAdmin (mandante): flex items-center gap-2 flex-1
    FlagIcon tamanho="sm"
    span.text-sm.font-medium.text-foreground.truncate  →  "Brasil"
  InputResultado (mandante):
    w-14 h-11 text-center font-mono text-xl font-bold
    rounded-xl border border-input bg-background
    focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40
    type="number" min="0" max="20" inputMode="numeric" placeholder="–"
  span.font-mono.text-lg.font-bold.text-muted-foreground  →  "×"
  InputResultado (visitante): (espelho)
  SelecaoAdmin (visitante): (espelho, items-end)

Checkbox "Encerrada":
  flex items-center gap-2 mt-1
  input type="checkbox" className="h-5 w-5 rounded border-border accent-brand-800"
  label.text-sm.font-medium.text-foreground  →  "Marcar como encerrada"

  → Quando checked: adiciona borda-verde ao card e mostra campo de pênaltis (mata-mata)

Campo pênaltis (só mata-mata + encerrada + placar empatado):
  Wrapper: rounded-xl bg-muted/50 p-3 space-y-2
  p.text-xs.font-semibold.text-muted-foreground  →  "Vencedor nos pênaltis (só exibição)"
  RadioGroup horizontal: flex gap-3
    RadioItem: label flex items-center gap-1.5 text-sm
      → "Brasil" | "Argentina"

Botão salvar: h-11 w-full rounded-xl bg-brand-800 text-sm font-semibold text-white
  → "Salvar resultado"
  → Loading: spinner + "Salvando..."
  → Sucesso: bg-brand-100 text-brand-700 + ícone Check + "Resultado salvo!"
  → Erro: toast.error() + botão volta ao normal
```

#### Partida encerrada — modo compacto

```
Wrapper: rounded-2xl border border-brand-200 bg-brand-50/50 p-3 shadow-sm
Layout: flex items-center gap-3
  Info: flex-1 flex flex-col
    p.text-xs.text-muted-foreground  →  "11 jun · Grupo A"
    p.text-sm.font-semibold.text-foreground  →  "Brasil 2 × 1 Argentina"
  BadgeEncerrada: rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700
    → "Encerrada"
  BotaoEditar: h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center
    → ícone Pencil h-4 w-4 text-muted-foreground
    → aria-label="Editar resultado de Brasil × Argentina"
    → Ao clicar: expande para modo de edição inline
```

#### Partida mata-mata sem times definidos

```
Wrapper: rounded-2xl border border-dashed border-border bg-muted/20 p-4

Header: flex items-center justify-between
  p.text-[11px].text-muted-foreground  →  "Oitavas · 30 jun · 16h00"
  StatusPill status="agendada"

Confronto: flex items-center gap-3
  PlaceholderTime (mandante): flex-1 flex flex-col items-center gap-1
    div.h-8.w-8.rounded-full.bg-muted.border.border-dashed.border-border
    p.text-xs.text-muted-foreground.text-center  →  "{mandante_label}" (ex: "Venc. Grupo A")
  span.font-mono.text-muted-foreground  →  "×"
  PlaceholderTime (visitante): (espelho)

Botão "Definir confronto": h-11 w-full rounded-xl border border-brand-300 bg-brand-50 text-sm font-medium text-brand-700
  → Abre Sheet/Drawer com select de seleções para mandante e visitante
```

### Sheet/Drawer "Definir confronto" (mata-mata)

Usa componente `Sheet` do shadcn/ui, abre pelo bottom (mobile-first).

```
SheetContent (bottom): rounded-t-3xl p-6 space-y-4
SheetTitle: font-display text-lg font-bold  →  "Definir confronto"
SheetDescription: text-sm text-muted-foreground
  →  "{fase} · {data e hora}"

Formulário:
  Label + Select "Mandante":
    Combobox ou select nativo com lista de todas as seleções (alfabética)
    → Mostra FlagIcon + nome ao selecionar
  Label + Select "Visitante": (idem)

  Botão: h-12 w-full rounded-2xl bg-brand-800 font-semibold text-white
    →  "Confirmar confronto"
  BotaoCancelar: h-10 w-full text-sm text-muted-foreground
    →  "Cancelar"
```

### Estados da página Admin

| Estado                    | UI                                                                         |
| ------------------------- | -------------------------------------------------------------------------- |
| `loading`                 | 3 cards skeleton h-32 animate-pulse                                        |
| `lista vazia (pendentes)` | "Nenhuma partida pendente." text-sm text-muted-foreground py-8 text-center |
| `salvando resultado`      | Botão loading; campo encerrada desabilitado temporariamente                |
| `resultado salvo`         | Toast "Resultado salvo! Pontos apurados automaticamente." (info)           |
| `erro ao salvar`          | Toast.error + botão volta ao normal; campos mantêm valores                 |
| `acesso negado`           | Redirecionamento automático; toast.error("Acesso restrito.")               |

### Responsividade Admin

```
375px: layout descrito acima (single column, edição inline)
768px: cards em grid de 2 colunas (duas partidas por linha)
1280px: grid de 3 colunas; Sheet vira Dialog centralizado (não bottom sheet)
```

---

## A. Componentes compartilhados — referência

### A.1 StatusPill (existente, sem mudança)

```
agendada: bg-muted text-muted-foreground  →  "Agendado"
ao-vivo: bg-destructive/10 text-destructive + ponto pulsante  →  "Ao vivo"
encerrada: bg-brand-100 text-brand-700  →  "Encerrado"
```

### A.2 LoginCTA

```
Wrapper: rounded-2xl border border-brand-200 bg-brand-50 px-6 py-10 flex flex-col items-center gap-4 text-center
Ícone: Trophy h-10 w-10 text-brand-600
Título: font-display text-lg font-bold text-brand-800  →  "Entre para competir"
Descrição: text-sm text-brand-600 max-w-xs
  →  "Faça login para salvar seus palpites e aparecer no ranking."
Botão Google: h-12 w-full max-w-xs rounded-2xl bg-brand-800 text-sm font-semibold text-white flex items-center justify-center gap-2
  → Logo Google (SVG inline 20px) + "Entrar com Google"
```

### A.3 FlagIcon (novo)

```
Tamanhos:
  sm: h-6 w-6 fi (24px)
  md: h-8 w-8 fi (32px)
  lg: h-10 w-10 fi (40px)

Wrapper: rounded-full overflow-hidden ring-1 ring-border/40 shrink-0 bg-muted
  → fi fi-{iso2} object-cover w-full h-full

Fallback (código desconhecido ou mata-mata):
  Wrapper bg-muted ring-border
  Shield h-4 w-4 text-muted-foreground (centrado)
```

### A.4 AvatarParticipante

```
Prioridade: foto (img com next/image) → iniciais geradas do nome → ícone genérico
Iniciais: primeiras letras do primeiro e último nome, maiúsculas
Cor de fundo para iniciais: baseada em hash do nome (5 opções: brand-100, brand-200, gold-300/20, secondary, muted)
```

### A.5 Skeleton pattern

```
Base: rounded-{radius do elemento que substitui} bg-muted animate-pulse
Usar aria-busy="true" no container pai durante loading
Usar aria-hidden="true" nos elementos skeleton
```

---

## Checklist de acessibilidade (WCAG 2.2 AA)

- [ ] Todos os inputs de placar com `<label>` associado ou `aria-label` descritivo (ex: "Gols do Brasil")
- [ ] StatusPill: não depender só de cor — texto + ícone juntos
- [ ] Cards de palpite travados: `aria-disabled="true"` + `disabled` nos inputs
- [ ] Modal/Sheet de confronto: foco aprisionado dentro, `role="dialog"`, `aria-labelledby`
- [ ] FlagIcon: `role="img"` + `aria-label="{nome do país}"`
- [ ] SeletorSemana: botões de dia com `aria-pressed` ou `aria-selected`; dia atual com `aria-current="date"`
- [ ] Contraste: dourado (`gold-400 #E6B53F`) sobre `brand-800 (#1B4332)` → ratio ~5.2:1 ✓
- [ ] Links "Ver agenda" e CTAs: min 44×44px de área de toque
- [ ] Toast (Sonner): `role="status"` (success/info) ou `role="alert"` (error)

---

## Resumo das decisões-chave

| Decisão               | Escolha                                                                                       | Justificativa                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Bandeiras             | `flag-icons` npm + mapeamento FIFA→ISO2 em `shared/lib/fifa-flags.ts`                         | SVG consistente, zero runtime, funciona em static export, ~43KB CSS                                    |
| Calendário no nav     | Fora do bottom nav; acessado via Dashboard ("Ver agenda completa")                            | Mantém bottom nav em 4 itens limpos; Calendário é funcionalidade de descoberta, não de ação frequente  |
| Admin no nav          | 5ª tab condicional (`is_admin`) no bottom nav                                                 | Um único usuário admin; aparência condicional evita poluir a nav para todos                            |
| Layout de palpites    | Cards por jogo com inputs inline; agrupados por rodada                                        | Evita navegação em múltiplas telas; scroll vertical natural no mobile                                  |
| Calendário UX         | Agenda vertical + seletor de semana horizontal                                                | Grade mensal é ilegível em mobile com 104 jogos em 39 dias; agenda respeita o modelo mental do usuário |
| Placar de empate      | Empate exato = 5 pts; empate "certo mas errado" = 1 pt; tier de 3 pts não se aplica a empates | Conforme spec aprovado do backend (§6 do MVP spec)                                                     |
| Pênaltis              | Não afetam pontuação; campo `vencedor_penaltis` é só para exibição                            | Decisão já tomada no spec de backend                                                                   |
| Critério de desempate | Maior nº de placares exatos → maior nº de acertos → ordem alfabética                          | Precisa ser implementado no `get_ranking()` no backend                                                 |
