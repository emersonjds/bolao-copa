<div align="center">

# ⚽ Bolão da Copa 2026

### Faça seus palpites na Copa do Mundo 2026 e dispute o ranking com os amigos 🏆

_Quanto mais perto da taça, mais cada palpite vale. Dá pra virar o bolão na final._

<br/>

<p align="center">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178c6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind-4-06b6d4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white" />
</p>

<p align="center">
  <img alt="Cobertura 100%" src="https://img.shields.io/badge/cobertura-100%25-22c55e?style=for-the-badge&logo=vitest&logoColor=white" />
  <img alt="Testes" src="https://img.shields.io/badge/testes-771_passando-22c55e?style=for-the-badge&logo=testinglibrary&logoColor=white" />
  <img alt="PT-BR" src="https://img.shields.io/badge/UI-PT--BR-009b3a?style=for-the-badge&logo=googletranslate&logoColor=white" />
  <img alt="Licença MIT" src="https://img.shields.io/badge/licença-MIT-3da639?style=for-the-badge&logo=opensourceinitiative&logoColor=white" />
</p>

</div>

---

## 📖 Sobre

SPA estática (Next.js, `output: "export"`) que conversa **direto com o Supabase** (Postgres + RLS + Auth Google), sem servidor próprio. É um bolão de palpites da Copa 2026 para grupos de amigos, com pontuação que cresce a cada fase e ranking ao vivo. **UI 100% em português.**

## ✨ Funcionalidades

- 🎯 **Palpites por placar** — trava no apito inicial de cada jogo
- 🔥 **Pontuação que escala por fase** — o mata-mata vale mais (dá pra virar no fim)
- 🏆 **Ranking ao vivo** com desempate justo (placares cravados → resultados certos)
- 📅 **Home inteligente** — mostra os jogos dos próximos 2 dias com partida
- 📜 **Histórico** de palpites com os pontos de cada jogo
- 💰 **Premiação transparente** — pote ao vivo, divisão 50/30/20 e inscrição via PIX (QR + copia e cola)
- 🛡️ **Área admin** pra lançar resultados (apuração automática no banco)
- 📱 **Mobile-first** e acessível

## 🎯 Como funciona a pontuação

A base de cada jogo (tempo normal de 90' — **pênalti não conta**):

| Acerto                                        | Pontos (base) |
| :-------------------------------------------- | :-----------: |
| 🎯 Cravou o placar de uma **vitória**         |     **5**     |
| 🤝 Cravou o placar de um **empate**           |     **4**     |
| ✅ Acertou **quem ganhou** (placar errado)    |     **3**     |
| ➖ Acertou que foi **empate** (placar errado) |     **2**     |
| ❌ Errou o resultado                          |     **0**     |

…multiplicada pelo **peso da fase**:

| Fase                        | Multiplicador | Cravar a vitória vale |
| :-------------------------- | :-----------: | :-------------------: |
| Grupos · 32-avos · 3º lugar |    **×1**     |           5           |
| Oitavas · Quartas           |    **×2**     |          10           |
| **Semifinal · Final**       |    **×3**     |       **15** 🏅       |

## 🛠️ Stack

|            |                                                                  |
| :--------- | :--------------------------------------------------------------- |
| **Front**  | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 |
| **Dados**  | Supabase (Postgres + RLS + Auth) · TanStack Query v5             |
| **Forms**  | React Hook Form + Zod                                            |
| **Testes** | Vitest · Testing Library · MSW · Playwright · pgTAP-style (pg)   |
| **Deploy** | Netlify (static export)                                          |

## 🚀 Rodando localmente (via Docker)

> Pré-requisitos: **Node 20+**, **pnpm 10**, **Docker** e a **CLI do Supabase**.

```bash
pnpm install
supabase start                 # Postgres + APIs do Supabase no Docker (migrations + seed)
cp .env.test.example .env.test # preencha com os valores de `supabase status`
pnpm scenario:seed             # popula um cenário de teste (5 contas, todas as fases)
pnpm dev:local                 # http://localhost:3000 apontando pro Supabase LOCAL
```

|                     |                                                                                                                                                       |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔑 **Login em dev** | O login real é Google OAuth (não roda local). Na aba **Palpites**, use o botão **"Logar em dev"** (só em desenvolvimento) — senha `Senha-Demo-2026!`. |
| 🔍 **Ver o banco**  | Supabase Studio em `http://127.0.0.1:54323` ou DBeaver/psql em `127.0.0.1:54322` (`postgres`/`postgres`).                                             |

## 🧪 Testes & cobertura

**Cobertura de 100%** em linhas, funções, statements e branches. A suíte se divide em três camadas, todas passando:

| Camada                    | Comando         | O que cobre                                                                                                      | Testes |
| :------------------------ | :-------------- | :--------------------------------------------------------------------------------------------------------------- | :----: |
| 🧩 Unitários e integração | `pnpm test:run` | Componentes, hooks e fetchers (com o Supabase mockado via MSW), regras de derivação e integridade do PIX (CRC16) |  658   |
| 🗄️ Banco de dados         | `pnpm test:db`  | Regra de pontuação, RLS e grants, e critério de desempate, rodando no Postgres local                             |   29   |
| 🎭 Ponta a ponta (E2E)    | `pnpm test:e2e` | Telas de cada fase, ranking, fluxo de palpite, premiação e regras no navegador real (Playwright)                 |   84   |

```bash
pnpm test:coverage   # gera o relatório de cobertura
```

> O `test:db` e o `test:e2e` precisam de `supabase start` e `pnpm scenario:seed` rodados antes.

## 🔒 Segurança (Blue Spec)

A segurança do projeto passou por um ciclo completo de _hardening_ guiado pelo **Blue Spec**, organizado em cinco fases: `charter → detect → plan → harden → verify`. Na prática: o **charter** define os princípios invioláveis, o **detect** varre o código atrás de riscos, o **plan** transforma cada risco num plano de defesa, o **harden** aplica a correção e o **verify** confere cada controle contra o código que de fato foi aplicado.

O charter ([`.bluespec/memory/charter.md`](.bluespec/memory/charter.md)) fixa **7 princípios de segurança**:

- 🔑 Segredos nunca vivem no código nem no histórico do git.
- 🛡️ A RLS do Postgres é a fronteira de autorização (o app fala direto com o banco usando uma chave pública).
- 🧮 A apuração e a pontuação são verdade do servidor, jamais do cliente.
- ⏱️ O palpite respeita a janela de tempo e fica imutável depois do lock.
- ✅ Todo input externo é validado no servidor antes de virar estado persistido.
- 🔒 Funções do banco rodam com privilégio mínimo e `search_path` fixo.
- 👤 Dados pessoais dos participantes ficam restritos a quem precisa vê-los.

### O que o Blue Spec cobriu

Foram **12 riscos** encontrados, corrigidos e verificados:

| Risco                                                         | Correção aplicada                                    | Onde                   |
| :------------------------------------------------------------ | :--------------------------------------------------- | :--------------------- |
| `eh_admin(uuid)` permitia enumerar contas admin               | Função sem parâmetro, checando só o `auth.uid()`     | migration `0023`       |
| Gols de palpite e de partida sem `CHECK` de range             | Constraint de `0` a `99` imposta no servidor         | migration `0024`       |
| Ranking somava pontos de partida revertida para não encerrada | `get_ranking()` agrega apenas jogos encerrados       | migration `0025`       |
| `updated_at` de palpite era falsificável pelo cliente         | `UPDATE` reconcedido só nas colunas de gols          | migration `0026`       |
| Funções de janela do palpite sem `search_path` fixo           | `set search_path = public, pg_temp`                  | migration `0027`       |
| `connect-src` da CSP usava o curinga `*.supabase.co`          | Fixado no host concreto do projeto (REST e socket)   | `public/_headers`      |
| `nodemailer` com CVE de SSRF e leitura de arquivo             | Atualizado para `^9.0.1`, com `audit --prod` limpo   | `package.json`         |
| `postcss` transitivo com CVE de XSS em _build-time_           | `pnpm.overrides` força a versão `>= 8.5.10`          | `package.json`         |
| `SENHA_DEV` podia vazar no bundle de produção                 | Movida para dentro do guard de `NODE_ENV`            | `dev-login-button.tsx` |
| Chave publishable local fixada no `package.json`              | `dev:local` usa apenas o `.env.development.local`    | `package.json`         |
| MCP `serena` sem pin de versão (supply chain de dev)          | Referência fixada na tag `v1.5.3`                    | `.mcp.json`            |
| CI não tinha varredura de dependências                        | Workflow roda `pnpm audit --prod --audit-level high` | `.github/workflows`    |

E **4 riscos residuais**, assumidos de forma consciente e registrados em [`.bluespec/memory/verify.md`](.bluespec/memory/verify.md):

- **CSP com `script-src 'unsafe-inline'`** _(bloqueado)_. O static export do Next emite scripts inline de hidratação. Mitigado pelo `connect-src` fixado, por headers fortes e pela ausência de _sinks_ de XSS no código.
- **Cookie de sessão acessível ao JavaScript** _(bloqueado)_. Limitação do static export, que não tem servidor para emitir um cookie `HttpOnly`. Mitigado pela CSP e pelos headers.
- **`undici` transitivo com CVE** _(aceito)_. Presente só em dev e teste, fora da árvore de produção (`audit --prod` limpo). Coberto pelo novo CI de auditoria.
- **Signup aberto sem convite** _(decisão do dono)_. Intencional na fase de validação privada. Será fechado com token de convite ao fim da validação.

## 📜 Scripts

| Comando              | O que faz                                    |
| :------------------- | :------------------------------------------- |
| `pnpm dev:local`     | Dev server apontando pro Supabase local      |
| `pnpm build`         | Build estático (gera `out/`)                 |
| `pnpm validate`      | type-check + lint + format + testes          |
| `pnpm scenario:seed` | (Re)cria o cenário de teste no banco local   |
| `pnpm scenario:open` | Abre um Chrome já logado numa conta de teste |

## 🗂️ Arquitetura

**Feature-Sliced Design**: cada camada só importa das camadas abaixo dela.

```
src/   app → widgets → features → entities → shared
```

Backend é Supabase: schema, RLS e RPCs versionados em `supabase/migrations/`.

## 📚 Documentação

| Doc                                         | Para quê                                                              |
| :------------------------------------------ | :-------------------------------------------------------------------- |
| 📘 [`docs/PROJETO.md`](docs/PROJETO.md)     | **Handbook** — leia primeiro (visão geral, regras, ambientes, testes) |
| 🗺️ [`docs/README.md`](docs/README.md)       | Índice de toda a documentação                                         |
| 🔒 [`docs/audits/`](docs/audits/)           | Auditorias de segurança e performance                                 |
| 🛡️ [`.bluespec/memory/`](.bluespec/memory/) | Charter, plano e verificação do _hardening_ Blue Spec                 |
| 📐 [`CLAUDE.md`](CLAUDE.md)                 | Regras de desenvolvimento do projeto                                  |

## ☁️ Deploy

Netlify estático: build com `pnpm build` e publish em `out/`. Os headers de segurança e de cache ficam em `public/_headers`.

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE).

<div align="center">

<br/>

**Curtiu o projeto? Deixa uma ⭐, ajuda demais!**

</div>
