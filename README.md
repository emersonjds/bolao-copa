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
  <img alt="Cobertura 100%" src="https://img.shields.io/badge/cobertura-100%25_linhas-22c55e?style=flat-square" />
  <img alt="Testes" src="https://img.shields.io/badge/testes-620_verdes-22c55e?style=flat-square" />
  <img alt="PT-BR" src="https://img.shields.io/badge/UI-PT--BR-009b3a?style=flat-square" />
  <img alt="Licença MIT" src="https://img.shields.io/badge/licença-MIT-green?style=flat-square" />
</p>

</div>

---

## 📖 Sobre

SPA estática (Next.js, `output: "export"`) que conversa **direto com o Supabase** (Postgres + RLS + Auth Google) — sem servidor próprio. Um bolão de palpites da Copa 2026 pra grupos de amigos, com pontuação que cresce a cada fase e ranking ao vivo. **UI 100% em português.**

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

Três camadas, todas verdes — **100% de linhas e funções**:

| Camada               | Comando         | Cobre                                                                 | Testes |
| :------------------- | :-------------- | :-------------------------------------------------------------------- | :----: |
| 🧩 Unit / integração | `pnpm test:run` | componentes, hooks, fetchers (MSW) e integridade do PIX (CRC16)       |  507   |
| 🗄️ Banco             | `pnpm test:db`  | regra de pontos, RLS/grants e desempate (Postgres local)              |   29   |
| 🎭 E2E               | `pnpm test:e2e` | telas fase a fase, ranking, palpitar, premiação e regras (Playwright) |   84   |

```bash
pnpm test:coverage   # relatório de cobertura
```

> `test:db` e `test:e2e` exigem `supabase start` + `pnpm scenario:seed` antes.

## 📜 Scripts

| Comando              | O que faz                                    |
| :------------------- | :------------------------------------------- |
| `pnpm dev:local`     | Dev server apontando pro Supabase local      |
| `pnpm build`         | Build estático (gera `out/`)                 |
| `pnpm validate`      | type-check + lint + format + testes          |
| `pnpm scenario:seed` | (Re)cria o cenário de teste no banco local   |
| `pnpm scenario:open` | Abre um Chrome já logado numa conta de teste |

## 🗂️ Arquitetura

**Feature-Sliced Design** — import só de camadas abaixo:

```
src/   app → widgets → features → entities → shared
```

Backend é Supabase: schema, RLS e RPCs versionados em `supabase/migrations/`.

## 📚 Documentação

| Doc                                     | Para quê                                                              |
| :-------------------------------------- | :-------------------------------------------------------------------- |
| 📘 [`docs/PROJETO.md`](docs/PROJETO.md) | **Handbook** — leia primeiro (visão geral, regras, ambientes, testes) |
| 🗺️ [`docs/README.md`](docs/README.md)   | Índice de toda a documentação                                         |
| 🔒 [`docs/audits/`](docs/audits/)       | Auditorias de segurança e performance                                 |
| 📐 [`CLAUDE.md`](CLAUDE.md)             | Regras de desenvolvimento do projeto                                  |

## ☁️ Deploy

Netlify estático — build `pnpm build`, publish `out/`. Security e cache headers em `public/_headers`.

## 📄 Licença

Distribuído sob a licença **MIT** — veja [LICENSE](LICENSE).

<div align="center">

<br/>

**Curtiu o projeto? Deixa uma ⭐ — ajuda demais!**

</div>
