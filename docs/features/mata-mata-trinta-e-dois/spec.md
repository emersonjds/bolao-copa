# Começa o mata-mata: 32-avos + banner — Design

> Data: 2026-06-28 · Status: aprovado para plano

## Contexto

A fase de grupos terminou: todos os resultados estão setados no banco. Agora começa
o mata-mata. A primeira fase eliminatória da Copa 2026 (48 seleções) é a de **32-avos**
("Trinta e Dois" na UI, `fase = 'trinta-e-dois'`): 32 seleções = 24 (1º e 2º de cada um
dos 12 grupos) + os **8 melhores 3º colocados**.

As 16 partidas de `trinta-e-dois` **já existem no banco** com data, estádio e rótulos
oficiais do chaveamento FIFA 2026 (`mandante_label`/`visitante_label`), mas sem seleções
resolvidas (`mandante_id`/`visitante_id` = null). Ex. (de `supabase/seed.sql`):

```
2A  vs 2B            1E  vs 3A/B/C/D/F     1F vs 2C        1C vs 2F
...                  2E  vs 2I             1A vs 3C/E/F/H/I
1L  vs 3E/H/I/J/K    ...                   1G vs 3A/E/H/I/J
2K  vs 2L            1H  vs 2J             1B vs 3E/F/G/I/J
1J  vs 2H            1K  vs 3D/E/I/J/L     2D vs 2G
```

- `1X` = vencedor do grupo X · `2X` = vice do grupo X (resolução direta).
- `3W/X/Y/Z...` = um dos 3º colocados, definido pela **tabela oficial de combinação**
  dos 8 melhores 3º da Copa 2026 (a parte delicada deste trabalho).

A tela "Meus palpites → Palpitar" mostra abas por fase (`Fase de Grupos / Trinta e Dois /
Oitavas / ...`). Hoje a aba ativa por padrão é fixa em "Fase de Grupos".

## Objetivos

1. **Resolver** os 16 confrontos de 32-avos a partir da classificação real no banco e
   gravar as seleções nas partidas existentes.
2. **Destacar a fase atual**: a aba ativa por padrão passa a ser a fase mais avançada
   com jogo em aberto (agora: Trinta e Dois). Grupos continua clicável (vira histórico).
3. **Banner 1×** anunciando o início do mata-mata e a tabela completa de multiplicadores.
4. Cobertura SDD: unit + integração + E2E com evidência PNG.

## Não-objetivos

- Não alterar a mecânica de pontuação nem `peso_fase()` (32-avos segue ×1, conforme regra).
- Não criar UI de admin para inserir partidas (as de 32-avos já existem).
- Não resolver oitavas/quartas/etc. agora (só 32-avos).

## Parte 1 — Resolver confrontos das 32-avos

### 1.1 Script `scripts/gerar-trinta-e-dois.ts`
CLI one-off (Vitest/tsx, padrão dos `scripts/`), com núcleo testável em
`scripts/lib/`:

- **Lê a classificação** dos 12 grupos via a lógica de domínio existente
  (`src/features/grupos/lib/derivar-classificacao.ts` → `derivarClassificacao`), que já
  ordena por pontos → saldo → gols pró → nome. Fonte: partidas `fase='grupos'`
  encerradas, lidas do banco com `pg` (mesmo acesso de `scripts/backup.ts`/`test:db`).
- **Resolve rótulos diretos**: `1X`/`2X` → `linhas[0]`/`linhas[1]` do grupo X.
- **Resolve os 8 melhores 3º**:
  1. Coleta o `linhas[2]` (3º) de cada um dos 12 grupos.
  2. Ranqueia todos os 12 terceiros pelos critérios FIFA (pontos → saldo → gols pró →
     [critérios seguintes] ) e pega os **8 melhores**.
  3. Identifica **quais 8 grupos** classificaram seu 3º e usa a **tabela oficial de
     combinação FIFA 2026** (módulo `scripts/lib/melhores-terceiros-2026.ts`) para mapear
     cada slot `3W/X/Y/Z` → o grupo cujo 3º o ocupa. A tabela é encodada a partir da
     fonte oficial e validada por testes (todas as 495 = C(12,8) combinações resolvem
     sem conflito; cada slot recebe exatamente um grupo do seu conjunto de candidatos).
- **Confirmação humana**: imprime os 16 confrontos resolvidos (mandante x visitante,
  data, estádio) e exige confirmação antes de gravar.
- **Gravação idempotente**: `UPDATE partidas SET mandante_id, visitante_id WHERE
  fase='trinta-e-dois' AND mandante_label=$1 AND visitante_label=$2`. Reexecutar não
  duplica nada. Mantém `data_hora`/`estadio`/`rodada`.
- **Segurança de ambiente**: por padrão aponta para o banco local; `--prod` exige
  confirmação explícita (mesmo guard de `scripts/restore.ts`). O push para prod é
  rodado pelo desenvolvedor humano.

### 1.2 Empates de critério
Se dois 3º empatam em todos os critérios objetivos (improvável no cenário de teste,
todos os jogos têm placar), o desempate final segue o critério estável já usado no
projeto (ordem alfabética do nome) — documentado, não é critério de prêmio.

## Parte 2 — Trinta e Dois em destaque (UI)

Em `src/features/palpites/components/palpites-content.tsx`:

- `faseSelecionada` passa de `useState<FaseCopa>("grupos")` para
  `useState<FaseCopa | null>(null)`.
- Deriva a **fase atual padrão**: a última fase em `fasesDisponiveis` (ordem cronológica)
  que tenha ao menos uma partida com `status !== 'encerrada'`; senão a última disponível;
  senão `"grupos"`.
- Fase efetiva = `faseSelecionada ?? faseAtual`. Passada para `FiltroFase` e para o
  filtro de partidas. Clicar numa aba seta `faseSelecionada` (não é sobrescrito por
  load). Sem `useEffect` novo.

Resultado: com grupos todos encerrados e 32-avos em aberto, abre em "Trinta e Dois";
grupos seguem acessíveis (histórico). Quando vierem oitavas, o padrão avança sozinho.

## Parte 3 — Banner do mata-mata (1×)

Reusa o padrão `src/features/novidades/` (tabela `avisos_vistos`, modal, gate, fallback
localStorage para anônimo). Sem migration nova.

- **Fila de avisos**: o gate passa de um único `AVISO_ATUAL` para uma **lista ordenada**
  `AVISOS: Aviso[]` e renderiza o **primeiro ainda não visto**. Evita dois modais
  sobrepostos para um usuário novo (mostra novidades, depois o do mata-mata, um por vez).
  Ao fechar um, reavalia e mostra o próximo não visto.
- **Novo aviso** `id: "mata-mata-2026-06"`:
  - Título: começou o mata-mata.
  - Itens: (a) eliminatória começou — 32-avos abertos pra palpite; (b) tabela de
    multiplicador por fase: grupos/32-avos/3º **×1**, oitavas/quartas **×2**,
    semi/final **×3** (cravar a final = 15). Texto honesto: 32-avos ainda é ×1, o peso
    sobe a partir das oitavas.
- Mantém o aviso `novidades-2026-06` existente intacto.

## Parte 4 — Testes (SDD, 3 camadas)

1. **Unit (Vitest)**
   - `melhores-terceiros-2026`: as 495 combinações resolvem; cada slot recebe grupo
     candidato válido; ranqueamento dos 12 terceiros.
   - resolução de rótulos `1X`/`2X`/`3...` → seleção a partir de classificação mockada.
   - `palpites-content`: fase padrão = fase atual (grupos encerrados → 32-avos); clique
     em aba sobrepõe o padrão.
   - gate de avisos: mostra primeiro não visto; fila com dois avisos; degrada se
     localStorage/Supabase falham (reusa cobertura existente).
2. **Integração (MSW)**: gate + `avisos-fetcher` para o novo `aviso_id` (reusa fetcher;
   sem novo endpoint).
3. **E2E (Playwright) com evidência PNG** em `e2e/mata-mata/evidencias/*.png`:
   - `mata-mata.spec.ts`: abre Palpites → aba "Trinta e Dois" ativa por padrão, com
     confrontos de seleções reais; preenche e salva um palpite. (prints por passo)
   - banner: aparece no 1º acesso, fecha em "Bora!" (ou CTA), não reaparece após reload.
   - Pré-requisito: estender o `scenario:seed`/cenário E2E para ter as 32-avos resolvidas
     (rodar o núcleo do script da Parte 1 no banco local de teste).

## Riscos & mitigações

- **Tabela dos 8 melhores 3º incorreta** → confronto errado em prod. Mitigação: encodar
  da fonte oficial + teste exaustivo das 495 combinações + **confirmação humana** dos 16
  confrontos antes de gravar + gravação só em local; prod é rodada pelo humano.
- **Classificação divergente do esperado** → a derivação reusa a lógica já testada do
  app; a impressão de conferência mostra a classificação por grupo junto dos confrontos.
- **Banner duplo** → resolvido pela fila (um modal por vez).

## Arquivos afetados (estimativa)

- Novo: `scripts/gerar-trinta-e-dois.ts`, `scripts/lib/melhores-terceiros-2026.ts`
  (+ testes), `scripts/lib/resolver-trinta-e-dois.ts` (+ testes).
- Novo: aviso do mata-mata no modelo de avisos + ajuste do gate para fila (+ testes).
- Editar: `src/features/palpites/components/palpites-content.tsx` (+ teste).
- Novo: `tests/e2e/mata-mata.spec.ts`; ajuste do cenário E2E para resolver 32-avos.
- Doc: este spec.
```
