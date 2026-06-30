# Testes E2E (Playwright)

Testes de tela rodando contra o app real (`pnpm dev` em `localhost:3000`, subido
automaticamente pelo `webServer` do `playwright.config.ts`).

Projetos:

- `setup` — cria a sessão de teste (storageState) para os specs autenticados.
- `desktop-chrome` / `mobile-chrome` (Pixel 7) — specs públicos (sem login).
- `authenticated` — specs logados, reaproveitam o storageState do `setup`.

```bash
pnpm test:e2e            # roda tudo
pnpm test:e2e:ui         # modo interativo
```

**Todos os dados vêm do Supabase real — não há MSW no app.** Partidas via
`supabase.from("partidas")`, ranking/destaque via RPCs (`get_ranking` /
`get_destaque_rodada`). Como o conteúdo depende do seed, os testes públicos
checam estrutura e seleções presentes no seed do torneio, não números voláteis.

## Cobertura

| Arquivo              | Login | O que cobre                                                                  |
| -------------------- | ----- | ---------------------------------------------------------------------------- |
| `smoke.spec.ts`      | não   | Carregamento das telas públicas sem erro de JS; marca; ausência do sino      |
| `navegacao.spec.ts`  | não   | Bottom-nav entre abas, `aria-current`, ausência da aba Admin, 375px          |
| `home.spec.ts`       | não   | Card de login (HeroStats sem sessão), próximos jogos, atalhos para a agenda  |
| `calendario.spec.ts` | não   | Conteúdo da agenda, seletor de semana, filtro por dia (vazio + toggle)       |
| `palpites.spec.ts`   | sim   | Salvar **e editar** palpite (regressão do grant `42501`, migrations 0011/12) |

## Convenções

- Seletores por papel/acessibilidade (`getByRole`/`getByText`). **Nada de CSS frágil.**
- Textos da UI são **PT-BR**.
- Nunca clicar no botão "Entrar com Google" — dispara redirect OAuth real.
- Bug real encontrado por um teste novo: **não relaxar o teste**. Marcar com
  `test.fixme` + comentário descrevendo rota/passo/evidência e seguir.

---

## Sessão autenticada (`palpites.spec.ts`)

Login real é **Google OAuth** (não automatizável). Em vez disso, `auth.setup.ts`
cria a sessão **direto pela API do Supabase** e grava os cookies em
`tests/e2e/.auth/user.json` (gitignored). O app usa `@supabase/ssr`, que persiste
a sessão em **COOKIE** `sb-<ref>-auth-token` (`base64-` + base64url do JSON,
chunkado) — ver `helpers/auth-cookie.ts`.

Fluxo do setup:

1. `service_role` garante o usuário de teste — o trigger `handle_new_user` cria
   `profile` + `participante` no bolão padrão automaticamente;
2. login e-mail/senha (client anon) → sessão real;
3. cookies gravados no `storageState` que o projeto `authenticated` consome.

Ao fim do spec, o usuário de teste é **deletado** (FKs `on delete cascade`
removem participante + palpites — não polui o bolão real).

### Como rodar

Defina no `.env.local` (NUNCA commitar — está no `.gitignore`):

```bash
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
# opcionais (têm default): E2E_TEST_EMAIL, E2E_TEST_PASSWORD
```

Sem a `service_role`, `auth.setup.ts` e `palpites.spec.ts` **se auto-pulam** — o
resto do `pnpm test:e2e` roda normal. Ideal: usar um projeto/branch Supabase de
teste, não o de produção.

### Ainda sem spec (pendentes)

| Fluxo                              | Tela          |
| ---------------------------------- | ------------- |
| Posição pessoal (HeroStats)        | `/`           |
| "Minha posição" e destaque pessoal | `/ranking`    |
| CTA de palpite dentro da agenda    | `/calendario` |
| Menu do usuário e logout           | TopBar        |
| Painel administrativo (`is_admin`) | `/admin`      |
