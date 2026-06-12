# Spec — Palpites antecipados persistentes

**Data:** 2026-06-12 · **Status:** aprovado

## Problema

Participantes relataram fazer palpites para os jogos do dia seguinte e "não salvar".
**Causa raiz:** havia **duas** travas. (1) No cliente, jogos `futuro` guardavam o placar só no
`localStorage` (rascunho) e o botão só gravava os `liberado` (de hoje). (2) **No servidor**, a
migration `0019_palpite_janela_dia` impunha uma **borda inferior**: o palpite só era aceito a
partir da meia-noite BRT do dia do jogo, recusando o antecipado com `palpite_nao_liberado` — a
"mecânica palpite dia a dia". O antecipado se perdia ao trocar de aparelho / não voltar no dia.

> **Correção da premissa (descoberta pelo E2E Playwright):** uma versão anterior desta spec dizia
> que o servidor só travava no apito e que "nenhuma migration era necessária". **Estava errado** —
> a 0019 bloqueava o antecipado. Os testes unitários não pegaram (mockam `salvarPalpite`); o
> Playwright pegou (POST 400 `palpite_nao_liberado`). **Decisão do dono:** liberar o palpite
> antecipado, relaxando a regra do servidor (migration `0021`). "Dia a dia" passa a ser só
> organização visual no cliente.

## Objetivo

Palpite antecipado **salva de verdade no servidor**, continua **ajustável até o apito**, e a pessoa
**entende** isso na primeira vez (modal).

**Decisões aprovadas:** janela mantida (hoje + amanhã); um **botão Salvar único** grava hoje +
antecipados de uma vez; **modal de confirmação na 1ª vez**.

**Não-objetivos (YAGNI):** ampliar a janela além de amanhã (segue hoje + amanhã); mexer no
`notificar.ts` (melhora de tabela por consequência, sem alterar o script).

## Mudanças

### Servidor

0. **Migration `0021_palpite_libera_antecipado`**: redefine `enforce_palpite_lock()` removendo a
   borda inferior (a regra da 0019). Mantém imutabilidade de `participante_id`/`partida_id`, o
   bypass da apuração (gols inalterados) e a **borda superior** (trava no apito). A função
   `janela_palpite_inicio` / coluna `janela_inicio` continuam existindo (o cliente usa para agrupar
   por dia). ⚠️ Aplicar no Supabase de produção (`supabase db push`) — há testers reais.

### Cliente

1. **Predicado de salvável** (`palpites-content.tsx`): de `estadoPalpite === "liberado"` para
   `!== "encerrado"` (inclui `futuro`). Afeta `hasPendingChanges` e a coleta de `pendentes` no save.
2. **`handleSalvar`**: grava todos os pendentes (hoje + antecipados) via o `salvarPalpite` já
   existente. Se houver pelo menos um antecipado **e** o usuário ainda não confirmou o aviso →
   abre o modal **antes** de gravar; ao confirmar, marca o flag e grava. Toast: "Palpites salvos!".
3. **Botão** (`botao-salvar.tsx`): texto "Salvar palpites" (era "Salvar palpites de hoje").
4. **Modal** (`modal-confirmar-antecipado.tsx`, novo): "Palpite antecipado — esses serão os usados
   quando o jogo começar, a não ser que você ajuste no dia; pode mudar até o apito." Ações:
   `[Voltar]` / `[Entendi, salvar]`. `role="dialog"`, `aria-modal`, fecha no ESC e no backdrop
   (botão com `aria-label="Fechar"`).
5. **Flag "já viu o modal"** (`confirmacao-antecipado.ts`, novo): `localStorage` por usuário —
   `jaConfirmouAntecipado(userId)` / `marcarConfirmouAntecipado(userId)`, com guarda contra
   `localStorage` bloqueado (mesmo padrão de `rascunho-local.ts`).
6. **Card futuro** (`card-palpite.tsx`): refletir que o antecipado agora **salva** — badge "Salvo"
   quando há palpite no servidor; texto inferior: salvo → "Palpite salvo · ajuste até o jogo";
   preenchido não salvo → "Toque em Salvar"; vazio → "Você pode já deixar pronto". Badge de dia
   passa de "Libera amanhã" → **"Amanhã"** (não trava mais; é só o dia). O rascunho local permanece
   como rede de segurança para placar **incompleto**.

## Fluxo

```
digita placar (futuro) → rascunho local (segurança p/ incompleto)
clica "Salvar palpites"
  ├─ pendentes inclui antecipado e nunca confirmou → MODAL
  │     └─ "Entendi, salvar" → marca flag → grava todos no servidor
  └─ senão → grava todos no servidor
grava → invalida useMeusPalpites → card mostra "Salvo" → limpa rascunho dos gravados
ajuste posterior (até o apito) → novo "pendente" → salva por cima (upsert)
```

## Riscos

| Risco                                    | Mitigação                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Servidor recusar o antecipado (0019)     | Resolvido pela migration `0021` (remove a borda inferior); validado por E2E (POST 200). |
| Reverter "dia a dia" reduzir engajamento | Decisão consciente do dono; a organização hoje+amanhã segue no cliente.                 |
| Pessoa achar que "travou" o palpite      | Modal explica que é ajustável até o apito; card diz "ajuste até o jogo".                |
| `localStorage` indisponível (flag)       | Guardado; sem flag o modal reaparece (degradação aceitável, não quebra).                |
| Regressão no save de hoje                | Mesmo caminho de gravação; só amplia o conjunto de pendentes.                           |

## Bônus (sem código novo)

Com o antecipado salvo no servidor, o lembrete por e-mail (`notificar.ts`, que cobra "quem ainda
não palpitou nos jogos de hoje") deixa de cobrar quem já deixou o palpite pronto — fica mais correto.

## Testes

- `confirmacao-antecipado.test.ts`: flag ja/marcar + guarda de storage.
- `modal-confirmar-antecipado.test.tsx`: render, confirmar, cancelar.
- `palpites-content.test.tsx`: salvar inclui jogo `futuro`; 1ª vez abre modal e só grava ao
  confirmar; 2ª vez grava direto. Texto do botão "Salvar palpites".
- **E2E Playwright** (`tests/e2e/palpites.spec.ts`): fluxo real autenticado — preenche antecipado,
  modal de 1ª vez, grava no servidor (POST 200), card vira "Salvo", 2ª gravação sem modal. Prints
  de evidência em [`e2e/palpites-antecipados/evidencias/`](../../../e2e/palpites-antecipados/).
- `pnpm type-check` · `pnpm lint` · `pnpm test:run` · `pnpm format:check` verdes.
