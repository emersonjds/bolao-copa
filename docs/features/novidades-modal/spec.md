# Spec — Modal de novidades (one-time)

**Data:** 2026-06-12 · **Status:** aprovado

## Objetivo

Avisar os participantes, **uma única vez**, sobre o que entrou agora no app (palpite antecipado +
Grupos da Copa). Ao fechar, não aparece mais. Funciona também para quem **já está logado** (a flag
é por um `aviso_id` novo, então ninguém tem ainda → todos veem uma vez).

## Decisões aprovadas

- **Público:** todo mundo que acessa (logado ou não).
- **Conteúdo:** as duas novidades (palpite antecipado + Grupos da Copa).
- **Persistência:** por conta no **banco** (`avisos_vistos`). Anônimo não tem conta → **fallback
  localStorage** (por dispositivo). _Edge aceitável:_ ver anônimo e depois logar pode mostrar +1×.

## Arquitetura

Nova slice `src/features/novidades/`:

```
src/features/novidades/
├── model/aviso-atual.ts          # id + conteúdo do anúncio atual (versionado)
├── lib/aviso-local.ts            # fallback localStorage (anônimo) + teste
├── api/
│   ├── avisos-fetcher.ts         # avisoFoiVisto / marcarAvisoVisto (Supabase) + teste MSW
│   └── ...
├── components/
│   ├── modal-novidades.tsx       # UI do modal + teste
│   └── novidades-gate.tsx        # decide mostrar/esconder (auth → banco|local)
└── index.ts                      # export: NovidadesGate
```

### Banco — migration `0022_avisos_vistos`

```sql
create table public.avisos_vistos (
  user_id  uuid not null references auth.users(id) on delete cascade,
  aviso_id text not null,
  visto_em timestamptz not null default now(),
  primary key (user_id, aviso_id)
);
alter table public.avisos_vistos enable row level security;
-- usuário lê/marca só os próprios
create policy avisos_vistos_select_own ... using (user_id = auth.uid());
create policy avisos_vistos_insert_own ... with check (user_id = auth.uid());
grant select, insert on public.avisos_vistos to authenticated;
```

### Gate (decisão)

`novidades-gate.tsx` (`"use client"`, montado no `app-shell`):

1. No mount, lê a sessão definitiva via `supabase.auth.getSession()` (evita o flash `null` do
   `useSupabaseUser`, que não distingue "carregando" de "anônimo").
2. **Logado:** `avisoFoiVisto(userId, AVISO.id)` no banco → se não visto, abre.
3. **Anônimo:** `avisoVistoLocal(AVISO.id)` no localStorage → se não visto, abre.
4. Fechar → marca (banco se logado, localStorage se anônimo) e fecha. Erros de marcação são
   **silenciosos** (aviso não é crítico; pior caso reaparece).

### Conteúdo (`aviso-atual.ts`)

`id: "novidades-2026-06"`; itens: 🎯 Palpite antecipado (salva de verdade, ajusta até o apito) ·
🏆 Grupos da Copa (classificação + histórico na aba Copa). Botão "Bora!".

## Montagem sem regressão

`AppShell` (Server Component) renderiza `<NovidadesGate />` (client) — widget importando feature
(layer abaixo, OK no FSD). O modal overlaya qualquer tela.

## Impacto nos E2E existentes (importante)

O modal aparece em **todo 1º acesso** → o backdrop cobriria cliques e quebraria os 87 E2E atuais.
Mitigação:

- **Projetos públicos** (`desktop-chrome`, `mobile-chrome`): `storageState` semente
  (`tests/e2e/seed-public.json`) com `aviso-visto:<id>` no localStorage → modal suprimido.
- **Autenticado:** `auth.setup` marca o aviso como visto no banco para o usuário de teste.
- **Spec dedicado** (`novidades.spec.ts`): projeto próprio sem semente (contexto limpo) → o modal
  aparece e é validado.

## Testes (regra SDD)

- **Unit:** `aviso-local.test.ts` (visto/marcar + guarda de storage); `aviso-atual` (sanidade do id/itens).
- **Integração MSW:** `avisos-fetcher.test.ts` (não visto → false; visto → true; marcar faz upsert).
- **Componente:** `modal-novidades.test.tsx` (título + itens, "Bora!" e Esc chamam onFechar).
- **E2E Playwright (com prints):** `novidades.spec.ts` — anônimo vê o modal no 1º acesso, fecha,
  reload → não volta. Evidências em `e2e/novidades-modal/evidencias/`.

## Não-objetivos (YAGNI)

Central de notificações; múltiplos avisos simultâneos; sincronizar localStorage↔banco no login.
