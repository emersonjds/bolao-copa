# Testes E2E (Playwright)

Testes de tela rodando contra o app real (`pnpm dev` em `localhost:3000`, subido
automaticamente pelo `webServer` do `playwright.config.ts`). Dois projetos:
`desktop-chrome` e `mobile-chrome` (Pixel 7).

```bash
pnpm test:e2e            # roda tudo (desktop + mobile)
pnpm test:e2e --ui      # modo interativo
```

Dados das partidas vêm do **MSW** (`src/mocks/`), então a Agenda e a lista de
"Próximos jogos" são determinísticas. O ranking e o destaque da rodada batem no
Supabase real (RPCs `get_ranking` / `get_destaque_rodada`) — por isso os testes
públicos não asseguram conteúdo de ranking, apenas que a tela carrega.

## Cobertura atual (sem login)

| Arquivo              | O que cobre                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `smoke.spec.ts`      | Carregamento de `/`, `/calendario`, `/ranking`, `/regras`, `/palpites` sem erro de console; marca; ausência do sino |
| `navegacao.spec.ts`  | Navegação real pela bottom-nav entre abas, `aria-current`, ausência da aba Admin, responsividade 375px              |
| `home.spec.ts`       | Card de login (HeroStats sem sessão), lista de próximos jogos (MSW), atalhos para a agenda                          |
| `calendario.spec.ts` | Conteúdo da agenda, seletor de semana, filtro por dia (estado vazio + toggle)                                       |

## Convenções

- Seletores por papel/acessibilidade (`getByRole`/`getByText`). **Nada de CSS frágil.**
- Textos da UI são **PT-BR**.
- Nunca clicar no botão "Entrar com Google" — dispara redirect OAuth real.
- Bug real encontrado por um teste novo: **não relaxar o teste**. Marcar com
  `test.fixme` + comentário descrevendo rota/passo/evidência e seguir.

---

## Fluxos que exigem sessão autenticada (PENDENTES)

Login é via **Google OAuth (Supabase)**. **Não automatizamos o fluxo do Google**
(captcha, 2FA, ToS do provedor, fragilidade). Estes fluxos ficam pendentes até
existir uma estratégia de sessão:

| Fluxo                                | Tela          | Por que precisa de auth                                            |
| ------------------------------------ | ------------- | ------------------------------------------------------------------ |
| Fazer/editar palpite e salvar        | `/palpites`   | `PalpitesContent` só renderiza com `user`; senão mostra `LoginCTA` |
| Posição pessoal no bolão (HeroStats) | `/`           | "Sua posição no bolão" depende de `user` + `meuParticipanteId`     |
| "Minha posição" e destaque pessoal   | `/ranking`    | Banner/realce do participante logado precisa de sessão             |
| CTA de palpite dentro da agenda      | `/calendario` | `mostrarCta` na `AgendaList` só com `user`                         |
| Menu do usuário e logout             | TopBar        | `UserMenu` retorna `null` sem sessão                               |
| Painel administrativo                | `/admin`      | Redireciona sem sessão; exige `is_admin = true`                    |

### Estratégia recomendada: `storageState` com usuário de teste

Não dá para passar pela tela do Google, mas dá para **criar a sessão Supabase
direto pela API** (e-mail/senha) e persistir o estado de auth em disco. O
Supabase guarda a sessão no `localStorage` (chave `sb-<ref>-auth-token`), que o
Playwright sabe serializar via `storageState`.

Passos:

1. **Criar usuários de teste no Supabase** (Dashboard → Authentication, ou via
   service role num script de seed), idealmente num projeto/branch de teste
   separado do de produção:
   - um participante comum (palpites, ranking);
   - um com `profiles.is_admin = true` (rota `/admin`).
     Habilitar o provider **Email/Password** nesse projeto de teste (o app usa
     Google em produção, mas para o E2E o login programático por senha é o caminho).

2. **Global setup** (`tests/e2e/global-setup.ts`, registrado em
   `globalSetup` no `playwright.config.ts`) que faz login via
   `@supabase/supabase-js` e grava o estado:

   ```ts
   import { chromium } from "@playwright/test";
   import { createClient } from "@supabase/supabase-js";

   export default async function globalSetup() {
     const supabase = createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
     );
     const { data, error } = await supabase.auth.signInWithPassword({
       email: process.env.E2E_USER_EMAIL!,
       password: process.env.E2E_USER_PASSWORD!,
     });
     if (error) throw error;

     // Injeta a sessão no localStorage na origem do app e salva o storageState.
     const browser = await chromium.launch();
     const page = await browser.newPage();
     await page.goto("http://localhost:3000");
     await page.evaluate((session) => {
       const ref = new URL(import.meta.env?.NEXT_PUBLIC_SUPABASE_URL ?? "").host.split(".")[0];
       localStorage.setItem(
         `sb-${ref}-auth-token`,
         JSON.stringify({ currentSession: session, expiresAt: session!.expires_at })
       );
     }, data.session);
     await page.context().storageState({ path: "tests/e2e/.auth/user.json" });
     await browser.close();
   }
   ```

   > A forma exata da chave e do payload do `sb-...-auth-token` deve ser
   > confirmada inspecionando o `localStorage` após um login real — o snippet
   > acima é o esqueleto da abordagem, não código pronto.

3. **Projeto autenticado** no `playwright.config.ts` que reaproveita o estado:

   ```ts
   { name: "auth-chrome", use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/user.json" } }
   ```

   Specs autenticados (ex.: `palpites.auth.spec.ts`) rodam só nesse projeto.

4. **Segredos**: `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` via env (CI secret),
   nunca commitados. Adicionar `tests/e2e/.auth/` ao `.gitignore`.

### Alternativa (sem rede): mock de sessão no client

Para testes que só precisam da UI logada (sem dados reais), interceptar/forçar o
estado de auth do app — por exemplo um flag `NEXT_PUBLIC_E2E_AUTH` que injeta um
`user` fake no `AuthProvider`, ou `page.route` nos endpoints do Supabase. Mais
rápido e estável, porém exige um pequeno gancho no código de produção e não
exercita as RPCs reais.

**Recomendação:** começar pelo `storageState` com usuário de teste real (cobre o
caminho de verdade); usar o mock só se o flakiness do backend de teste atrapalhar.
