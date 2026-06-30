# Mata-mata até a final: progressão de confrontos + avisos por fase — Design

> Data: 2026-06-29 · Status: aprovado para plano

## Contexto

As 32-avos (`trinta-e-dois`) já estão resolvidas no banco e em andamento (resolver +
CLI `pnpm trinta-e-dois`, entregues na branch anterior). Conforme cada rodada do
mata-mata encerra, a **próxima fase** precisa ter seus confrontos preenchidos a partir
dos vencedores/perdedores — até a final.

O seed (`supabase/seed.sql`) já contém **todas** as partidas do mata-mata com a topologia
oficial FIFA 2026 codificada em rótulos de **número de partida**:

```
oitavas        W74 vs W77 · W73 vs W75 · ... (vencedores das 32-avos, jogos 73–88)
quartas        W89 vs W90 · ...               (vencedores das oitavas, jogos 89–96)
semifinal      W97 vs W98 · W99 vs W100       (vencedores das quartas, jogos 97–100)
terceiro-lugar L101 vs L102                    (perdedores das semis)
final          W101 vs W102                    (vencedores das semis)
```

- `W{n}` = vencedor da partida número `n`. `L{n}` = perdedor da partida número `n`.
- Vencedor do mata-mata = maior placar; empate no tempo normal → `vencedor_penaltis`
  (pênaltis **não** pontuam, mas **definem** quem avança).
- As partidas das próximas fases já existem (data, estádio, rótulos); falta só resolver
  `mandante_id`/`visitante_id` quando a rodada anterior encerra.

## Objetivos

1. **Resolver** os confrontos de oitavas → quartas → semifinal → terceiro-lugar → final
   a partir dos resultados reais no banco, gravando as seleções nas partidas existentes.
   Um único comando idempotente preenche tudo que já é determinável.
2. **Avisar por fase**: quando cada fase do mata-mata libera (oitavas, quartas, semi,
   final), um modal de aviso aparece **uma vez** e o usuário **confirma** que viu —
   reforçando a mecânica de pontuação daquela fase (×2 nas oitavas/quartas, ×3 na
   semi/final).
3. Cobertura SDD: unit + integração (MSW) + E2E com evidência PNG.

## Não-objetivos

- **Não alterar** `peso_fase()`/`apurar_pontos()`. A multiplicação ×1/×2/×3 por fase já
  está implementada (migration 0015) e aplica automaticamente quando a partida encerra.
  "As pontuações mudam a partir das próximas fases" já é o comportamento atual.
- Não criar UI de admin para inserir partidas do mata-mata (já existem no seed).
- Não mexer na resolução das 32-avos (já entregue) nem nas regras de grupos.

## Parte 1 — Topologia do bracket (`scripts/lib/bracket-2026.ts`)

Módulo puro que codifica o **número oficial FIFA 2026** de cada partida do mata-mata,
chaveado por `(fase, mandanteLabel, visitanteLabel)` — a mesma fonte que gerou o seed.

```ts
export interface PartidaBracket {
  numero: number;          // 73..104 (número oficial FIFA 2026)
  fase: FaseMataMata;      // trinta-e-dois | oitavas | quartas | semifinal | terceiro-lugar | final
  mandanteLabel: string;   // "W74" | "L101" | "2A" | ...
  visitanteLabel: string;
}
export const BRACKET_2026: PartidaBracket[];
```

- Os números das 32-avos (73–88), oitavas (89–96), quartas (97–100), semis (101–102),
  3º lugar (103) e final (104) seguem a numeração oficial. A **ordem do seed** dentro de
  cada fase é a ordem dos números — verificada contra o bracket oficial pelo agent `back`.
- **Risco-chave** (mesmo das melhores-terceiros): número errado → confronto errado em
  prod. Mitigações: (a) teste estrutural exaustivo (todo `W{n}`/`L{n}` referenciado existe
  como partida número `n`; cada número aparece como referência no máximo uma vez na fase
  seguinte; a topologia forma uma árvore de eliminação simples válida — 16→8→4→2→1 + 3º);
  (b) cross-check `data_hora` crescente por número; (c) **confirmação humana** no CLI antes
  de gravar; (d) gravação default no local, `--prod` explícito rodado pelo humano.

## Parte 2 — Resolver de progressão (`scripts/lib/resolver-mata-mata.ts`)

Função pura, sem I/O:

```ts
export interface PartidaResultado {
  numero: number;
  fase: FaseMataMata;
  mandanteId: string | null;
  visitanteId: string | null;
  golsMandante: number | null;
  golsVisitante: number | null;
  vencedorPenaltis: string | null;
  status: StatusPartida;
}
export interface ConfrontoResolvido {
  fase: FaseMataMata; mandanteLabel: string; visitanteLabel: string;
  mandanteId: string; visitanteId: string;
}
export function resolverMataMata(partidas: PartidaResultado[]): ConfrontoResolvido[];
```

- `vencedor(p)` / `perdedor(p)`: se a partida número `n` está **encerrada** com seleções,
  vencedor = maior placar; empate → `vencedorPenaltis`; perdedor = o outro lado.
  Partida sem resultado → `n` ainda indeterminado.
- Para cada partida **ainda não resolvida** (`mandanteId`/`visitanteId` null) das fases
  oitavas→final, tenta resolver `W{n}`/`L{n}` via o vencedor/perdedor de `n`. Só inclui no
  retorno os confrontos em que **ambos** os lados ficaram determinados. Idempotente:
  partidas já resolvidas são ignoradas.
- Rótulo `W{n}`/`L{n}` parseado com regex simples; número casado contra `BRACKET_2026`.

## Parte 3 — CLI (`scripts/gerar-mata-mata.ts`)

Espelha `gerar-trinta-e-dois.ts` (mesma guarda de ambiente e confirmação):

- `pnpm mata-mata` → dry-run: lê partidas do mata-mata, imprime os confrontos resolvíveis
  agora (com nomes pt-BR, data, estádio) e o que ainda falta encerrar.
- `pnpm mata-mata --sim` → grava no local (`UPDATE ... WHERE fase=$ AND mandante_label=$
  AND visitante_label=$`). Idempotente.
- `--prod --sim` → exige digitar `GRAVAR` (guarda de `restore.ts`/`trinta-e-dois`).
- Roda quantas vezes precisar: preenche o que está pronto, ignora o resto. Sem novo schema.

## Parte 4 — Avisos por fase (UI)

Reusa **integralmente** a fila `AVISOS` + `ModalNovidades` + gate + `avisos_vistos`
(+ fallback localStorage anônimo). **Sem migration nova.**

- **Generalizar o gatilho**: `mata-mata-pronto.ts` vira `fase-pronta.ts` com
  `faseDefinida(fase: FaseMataMata): Promise<boolean>` (≥1 partida da fase com
  `mandante_id`/`visitante_id` não nulos). `mataMataDefinido` continua exportado como
  `faseDefinida("trinta-e-dois")` (compat). `Gatilho` ganha `"oitavas-definido"`,
  `"quartas-definido"`, `"semifinal-definido"`, `"final-definido"`; o `VERIFICAR_GATILHO`
  do gate mapeia cada um para `() => faseDefinida(fase)`.
- **4 novos avisos** na fila `AVISOS` (após `AVISO_MATA_MATA`), cada um com seu gatilho:
  - `AVISO_OITAVAS` (`oitavas-2026`, gatilho `oitavas-definido`): "Começaram as oitavas —
    agora cada acerto vale **×2**."
  - `AVISO_QUARTAS` (`quartas-2026`, gatilho `quartas-definido`): "Quartas valendo — segue
    o **×2**, não vacila."
  - `AVISO_SEMI` (`semifinal-2026`, gatilho `semifinal-definido`): "Semifinal! Agora é
    **×3** — dá pra virar o bolão."
  - `AVISO_FINAL` (`final-2026`, gatilho `final-definido`): "A final! Cravar o placar vale
    **15** pontos."
- Comportamento herdado: um modal por vez, na ordem da fila; só aparece depois que os
  confrontos da fase existem; fecha em "Bora!" e não reaparece (persistido por usuário ou
  localStorage). Trocar o `id` faz reaparecer para todos.

## Parte 5 — Pontuação

Nada a implementar. `peso_fase()` (0015) já multiplica a base 5/4/3/2/0:
grupos/32-avos/3º = ×1, oitavas/quartas = ×2, semi/final = ×3. Quando a partida encerra,
`apurar_pontos()` reapura com o peso. Testes E2E só **comprovam** o valor (ex.: cravar uma
oitava encerrada rende 10).

## Parte 6 — Testes (SDD, 3 camadas)

1. **Unit (Vitest)**
   - `bracket-2026`: topologia válida (toda referência `W{n}`/`L{n}` existe; árvore
     16→8→4→2→1 + 3º; números únicos por fase; `data_hora` crescente por número).
   - `resolver-mata-mata`: vencedor por placar; empate → `vencedorPenaltis`; perdedor →
     3º lugar; resolve só quando ambos os lados determinados; idempotência; cadeia completa
     (32-avos encerradas → resolve oitavas; oitavas encerradas → quartas; … → final).
   - gate de avisos: mostra o primeiro não visto cujo gatilho está pronto; fila com os
     novos avisos; degrada se Supabase/localStorage falham (estende cobertura existente).
2. **Integração (MSW)**: `faseDefinida` por fase e `avisos-fetcher` para os novos `aviso_id`
   (reusa fetcher; sem endpoint novo).
3. **E2E (Playwright) com evidência PNG** em `e2e/mata-mata-ate-final/evidencias/*.png`:
   - Cada fase liberada: aba da fase ativa com confrontos de seleções reais; o modal da
     fase aparece no 1º acesso, fecha em "Bora!", não reaparece após reload. (prints por
     passo)
   - Prova de pontuação: uma partida de oitavas encerrada com palpite cravado mostra 10
     pts (×2) no histórico/ranking.
   - Pré-requisito: estender `scenario:seed`/cenário E2E para resolver as fases via o núcleo
     da Parte 2 (não hard-coded), garantindo confrontos reais nas próximas fases.

## Arquivos afetados (estimativa)

- Novo: `scripts/lib/bracket-2026.ts` (+ teste), `scripts/lib/resolver-mata-mata.ts`
  (+ teste), `scripts/gerar-mata-mata.ts`; script `mata-mata` no `package.json`.
- Editar: `src/features/novidades/api/mata-mata-pronto.ts` → `fase-pronta.ts`
  (+ teste); `src/features/novidades/model/aviso-atual.ts` (4 avisos + gatilhos);
  `src/features/novidades/components/novidades-gate.tsx` (mapa de gatilhos) (+ teste).
- Editar: `scripts/scenario-e2e.ts` (resolver fases no cenário).
- Novo: `e2e/mata-mata-ate-final/*.spec.ts` + evidências PNG.
- Doc: este spec + `plan.md`.

## Riscos & mitigações

- **Numeração do bracket errada** → ver Parte 1 (teste estrutural + cross-check data_hora
  + verificação do agent `back` contra o bracket oficial + confirmação humana no CLI +
  gravação prod só pelo humano).
- **Fadiga de modal** (4 avisos) → fila já mostra um por vez, só quando a fase existe, e
  cada um só uma vez; copy curta e específica.
- **Resolver rodar cedo demais** → só resolve confrontos com ambos os lados determinados;
  dry-run por padrão; idempotente.
