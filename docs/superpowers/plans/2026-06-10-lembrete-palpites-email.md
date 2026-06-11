# Lembrete diário de palpites por e-mail — Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um e-mail automático de manhã (09:00 BRT), só em dias com jogo e só para quem ainda não palpitou, levando à tela de palpites antes do primeiro apito.

**Architecture:** Lógica pura e testável em `scripts/lib/` (núcleo + template de e-mail), I/O isolado em `scripts/notificar.ts` (Supabase via `service_role` + SMTP do Gmail via `nodemailer`). Roda por GitHub Actions (cron) no repo privado de backup, que já tem o segredo da `service_role`. Anti-duplicata numa tabela `lembretes_enviados`.

**Tech Stack:** TypeScript (tsx), `@supabase/supabase-js` v2, `nodemailer`, Vitest, GitHub Actions, Postgres (migration).

**Spec:** `docs/superpowers/specs/2026-06-10-lembrete-palpites-email-design.md`

**Pré-requisitos de execução:** `supabase start` + `pnpm scenario:seed` (Tasks 1 e 5). Para o envio real: secrets `GMAIL_USER` + `GMAIL_APP_PASSWORD` (conta dedicada com Senha de app).

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `supabase/migrations/0020_lembretes_enviados.sql` (novo) | Tabela anti-duplicata + RLS + grant `service_role` |
| `scripts/lib/email-template.ts` (novo) | `renderLembrete()` puro → `{ assunto, html, texto }` (PT-BR, verde) |
| `scripts/lib/email-template.test.ts` (novo) | Testes do template |
| `scripts/lib/notificar-core.ts` (novo) | Puro: `jogosDeHoje`, `prazoDoDia`, `pendencias`, `enviarPendencias` (deps injetadas) |
| `scripts/lib/notificar-core.test.ts` (novo) | Testes do núcleo (borda de fuso, faltantes, orquestração com fakes) |
| `scripts/notificar.ts` (novo) | I/O: env, Supabase, SMTP, grava log; orquestra os puros. CLI `pnpm notificar [data] [--dry-run]` |
| `package.json` (modificar) | Dep `nodemailer` + `@types/nodemailer`; script `notificar` |
| Repo backup: `.github/workflows/lembrete.yml` (novo) | Cron 12:00 UTC + `workflow_dispatch` |
| `docs/PROJETO.md` (modificar) | Seção do lembrete no handbook |

Notas de contexto (verificadas no código atual):

- Colunas: `selecoes` (id, nome, codigo); `partidas` (id, data_hora, status, mandante_id, visitante_id, mandante_label, visitante_label, …); `participantes` (id, user_id, …); `palpites` (participante_id, partida_id, …); `profiles` (id, nome, …).
- `status` de partida: `agendada | ao-vivo | encerrada`. Só `agendada` ainda aceita palpite.
- E-mail do usuário mora em `auth.users` (não em `profiles`) — obtém-se com `admin.auth.admin.listUsers()` (mesmo padrão do `backup-core`).
- `dataBrtHoje(data?)` já existe em `scripts/lib/backup-schema.ts` (`America/Sao_Paulo`, `YYYY-MM-DD`) — reutilizar.
- `garantirEnvSupabase()` (`scripts/lib/env.ts`) carrega o `.env.test` localmente quando as vars do Supabase faltam — esse mesmo carregamento traz junto `GMAIL_USER`/`GMAIL_APP_PASSWORD` se você os colocar no `.env.test`.
- Testes de `scripts/lib/` levam `// @vitest-environment node` na 1ª linha; rodam no vitest principal (`include` cobre `scripts/**`) sem afetar o threshold de `src/**`.
- A nova tabela `lembretes_enviados` é operacional (não é dado do bolão) — o backup/restore das 7 tabelas **não** a inclui, e tudo bem.

---

### Task 1: Migration da tabela anti-duplicata

**Files:**
- Create: `supabase/migrations/0020_lembretes_enviados.sql`

- [ ] **Step 1: Criar a migration**

```sql
-- Lembretes diários enviados: 1 por participante por dia (anti-duplicata).
-- Escrita só pelo service_role (GitHub Actions). Invisível ao app (RLS sem policy).
create table if not exists public.lembretes_enviados (
  data            date not null,
  participante_id uuid not null references public.participantes (id) on delete cascade,
  enviado_em      timestamptz not null default now(),
  primary key (data, participante_id)
);

alter table public.lembretes_enviados enable row level security;

-- Grant explícito (padrão dos consertos 0008-0010 — grants não-confiáveis por default).
grant select, insert on public.lembretes_enviados to service_role;
```

- [ ] **Step 2: Aplicar no banco local e verificar**

Pré-requisito: `supabase start` rodando.

Run: `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/0020_lembretes_enviados.sql`
Expected: `CREATE TABLE`, `ALTER TABLE`, `GRANT`.

Run: `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -tAc "select count(*) from lembretes_enviados"`
Expected: `0` (tabela existe, vazia).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0020_lembretes_enviados.sql
git commit -m "add lembretes_enviados anti-duplicate table"
```

---

### Task 2: Template do e-mail (`scripts/lib/email-template.ts`)

**Files:**
- Create: `scripts/lib/email-template.test.ts`
- Create: `scripts/lib/email-template.ts`

- [ ] **Step 1: Escrever os testes que falham**

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { renderLembrete } from "./email-template";

const DADOS = {
  nome: "Ana",
  jogos: [
    { mandante: "Brasil", visitante: "Sérvia", horaBrt: "16:00" },
    { mandante: "1A", visitante: "2B", horaBrt: "20:00" },
  ],
  prazo: "16:00",
  appUrl: "https://resenha-bolao-da-copa.netlify.app/palpites",
};

describe("renderLembrete", () => {
  it("monta assunto com a contagem de jogos", () => {
    expect(renderLembrete(DADOS).assunto).toContain("2");
  });

  it("inclui nome, jogos, prazo, botão e opt-out no HTML", () => {
    const { html } = renderLembrete(DADOS);
    expect(html).toContain("Ana");
    expect(html).toContain("Brasil");
    expect(html).toContain("Sérvia");
    expect(html).toContain("1A");
    expect(html).toContain("16:00");
    expect(html).toContain("https://resenha-bolao-da-copa.netlify.app/palpites");
    expect(html.toLowerCase()).toContain("responde");
  });

  it("gera versão texto puro com os jogos", () => {
    const { texto } = renderLembrete(DADOS);
    expect(texto).toContain("Brasil");
    expect(texto).toContain("Sérvia");
    expect(texto).toContain("/palpites");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run scripts/lib/email-template.test.ts`
Expected: FAIL — módulo `./email-template` não existe.

- [ ] **Step 3: Implementar**

```ts
export interface JogoEmail {
  mandante: string;
  visitante: string;
  horaBrt: string;
}

export interface DadosLembrete {
  nome: string;
  jogos: JogoEmail[];
  prazo: string;
  appUrl: string;
}

export interface EmailRenderizado {
  assunto: string;
  html: string;
  texto: string;
}

const VERDE = "#16a34a";

/** Monta o e-mail de lembrete (PT-BR, identidade verde do app). Função pura. */
export function renderLembrete(dados: DadosLembrete): EmailRenderizado {
  const n = dados.jogos.length;
  const assunto = `⚽ Bolão: você tem ${n} palpite${n > 1 ? "s" : ""} para hoje`;

  const linhasHtml = dados.jogos
    .map(
      (j) =>
        `<tr><td style="padding:6px 0;font-size:16px;color:#111827;">` +
        `${j.mandante} <span style="color:#6b7280;">×</span> ${j.visitante}` +
        `</td><td style="padding:6px 0;font-size:16px;color:#6b7280;text-align:right;">${j.horaBrt}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">
<tr><td style="background:${VERDE};padding:20px 24px;color:#ffffff;font-size:20px;font-weight:bold;">⚽ Resenha Bolão da Copa</td></tr>
<tr><td style="padding:24px;">
<p style="margin:0 0 12px;font-size:16px;color:#111827;">Fala, ${dados.nome}! 👋</p>
<p style="margin:0 0 16px;font-size:16px;color:#374151;">Os palpites de hoje já abriram e você ainda não palpitou em <b>${n}</b> jogo${n > 1 ? "s" : ""}:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin-bottom:16px;">${linhasHtml}</table>
<p style="margin:0 0 20px;font-size:14px;color:#b45309;">⏰ O primeiro jogo trava às <b>${dados.prazo}</b>. Não vacila!</p>
<a href="${dados.appUrl}" style="display:inline-block;background:${VERDE};color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:12px 24px;border-radius:8px;">Fazer meus palpites</a>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">Não quer mais estes lembretes? É só responder este e-mail.</td></tr>
</table></td></tr></table></body></html>`;

  const linhasTexto = dados.jogos.map((j) => `- ${j.mandante} x ${j.visitante} (${j.horaBrt})`).join("\n");
  const texto =
    `Fala, ${dados.nome}!\n\n` +
    `Os palpites de hoje abriram e você ainda não palpitou em ${n} jogo(s):\n${linhasTexto}\n\n` +
    `O primeiro jogo trava às ${dados.prazo}.\n\n` +
    `Faça seus palpites: ${dados.appUrl}\n\n` +
    `Não quer mais estes lembretes? Responde este e-mail.`;

  return { assunto, html, texto };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run scripts/lib/email-template.test.ts`
Expected: 3 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/email-template.ts scripts/lib/email-template.test.ts
git commit -m "add reminder email template"
```

---

### Task 3: Núcleo do lembrete (`scripts/lib/notificar-core.ts`)

**Files:**
- Create: `scripts/lib/notificar-core.test.ts`
- Create: `scripts/lib/notificar-core.ts`

- [ ] **Step 1: Escrever os testes que falham**

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  jogosDeHoje,
  prazoDoDia,
  pendencias,
  enviarPendencias,
  type Partida,
  type Pendencia,
} from "./notificar-core";

const SELECOES = [
  { id: "s-bra", nome: "Brasil", codigo: "BRA" },
  { id: "s-srb", nome: "Sérvia", codigo: "SRB" },
];

function partida(over: Partial<Partida>): Partida {
  return {
    id: "p1",
    data_hora: "2026-06-25T20:00:00Z",
    status: "agendada",
    mandante_id: "s-bra",
    visitante_id: "s-srb",
    mandante_label: null,
    visitante_label: null,
    ...over,
  };
}

const AGORA = new Date("2026-06-25T12:00:00Z"); // 09:00 BRT de 25/06

describe("jogosDeHoje", () => {
  it("pega só jogos agendados de hoje (BRT), resolve nomes e ordena", () => {
    const jogos = jogosDeHoje(
      [
        partida({ id: "hoje-tarde", data_hora: "2026-06-25T20:00:00Z" }), // 17:00 BRT 25/06
        partida({ id: "hoje-noite", data_hora: "2026-06-26T02:00:00Z" }), // 23:00 BRT 25/06 (borda)
        partida({ id: "ja-foi", status: "encerrada" }),
        partida({ id: "amanha", data_hora: "2026-06-26T20:00:00Z" }), // 17:00 BRT 26/06
      ],
      SELECOES,
      AGORA
    );
    expect(jogos.map((j) => j.id)).toEqual(["hoje-tarde", "hoje-noite"]);
    expect(jogos[0]).toMatchObject({ mandante: "Brasil", visitante: "Sérvia", horaBrt: "17:00" });
  });

  it("usa label quando não há seleção (mata-mata)", () => {
    const jogos = jogosDeHoje(
      [partida({ mandante_id: null, visitante_id: null, mandante_label: "1A", visitante_label: "2B" })],
      SELECOES,
      AGORA
    );
    expect(jogos[0]).toMatchObject({ mandante: "1A", visitante: "2B" });
  });

  it("dia sem jogo retorna vazio", () => {
    expect(jogosDeHoje([partida({ data_hora: "2026-07-01T20:00:00Z" })], SELECOES, AGORA)).toEqual([]);
  });
});

describe("prazoDoDia", () => {
  it("retorna o apito mais cedo", () => {
    const jogos = jogosDeHoje(
      [
        partida({ id: "noite", data_hora: "2026-06-26T02:00:00Z" }),
        partida({ id: "tarde", data_hora: "2026-06-25T20:00:00Z" }),
      ],
      SELECOES,
      AGORA
    );
    expect(prazoDoDia(jogos)).toBe("17:00");
  });
});

describe("pendencias", () => {
  it("inclui quem falta ≥1 palpite e ignora quem completou ou não tem e-mail", () => {
    const jogos = jogosDeHoje(
      [
        partida({ id: "j1", data_hora: "2026-06-25T20:00:00Z" }),
        partida({ id: "j2", data_hora: "2026-06-26T02:00:00Z" }),
      ],
      SELECOES,
      AGORA
    );
    const lista = pendencias(
      [
        { id: "part-falta", user_id: "u1" }, // só palpitou j1 → falta j2
        { id: "part-completo", user_id: "u2" }, // palpitou j1 e j2
        { id: "part-sem-email", user_id: "u3" }, // falta tudo, mas sem e-mail
      ],
      jogos,
      [
        { participante_id: "part-falta", partida_id: "j1" },
        { participante_id: "part-completo", partida_id: "j1" },
        { participante_id: "part-completo", partida_id: "j2" },
      ],
      [
        { user_id: "u1", nome: "Ana", email: "ana@x.com" },
        { user_id: "u2", nome: "Bia", email: "bia@x.com" },
        { user_id: "u3", nome: "Cau", email: "" },
      ]
    );
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ participanteId: "part-falta", email: "ana@x.com", nome: "Ana" });
    expect(lista[0].jogos.map((j) => j.id)).toEqual(["j2"]);
  });
});

describe("enviarPendencias", () => {
  function pendencia(id: string): Pendencia {
    return {
      participanteId: id,
      email: `${id}@x.com`,
      nome: id,
      jogos: [{ id: "j1", dataHora: "2026-06-25T20:00:00Z", mandante: "Brasil", visitante: "Sérvia", horaBrt: "17:00" }],
    };
  }

  it("pula já-enviados, envia o resto, registra só os enviados e segue após falha", async () => {
    const enviados: string[] = [];
    const registrados: string[] = [];
    const resumo = await enviarPendencias([pendencia("a"), pendencia("b"), pendencia("c")], {
      appUrl: "https://app/palpites",
      jaEnviado: (id) => id === "a", // 'a' já recebeu hoje
      enviar: async (para) => {
        if (para === "c@x.com") throw new Error("smtp caiu");
        enviados.push(para);
      },
      registrar: async (id) => {
        registrados.push(id);
      },
    });
    expect(enviados).toEqual(["b@x.com"]);
    expect(registrados).toEqual(["b"]); // 'a' pulado, 'c' falhou → não registra
    expect(resumo).toEqual({ enviados: 1, pulados: 1, falhas: 1 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run scripts/lib/notificar-core.test.ts`
Expected: FAIL — módulo `./notificar-core` não existe.

- [ ] **Step 3: Implementar**

```ts
import { dataBrtHoje } from "./backup-schema";
import { renderLembrete } from "./email-template";

export interface Selecao {
  id: string;
  nome: string;
  codigo: string;
}
export interface Partida {
  id: string;
  data_hora: string;
  status: string;
  mandante_id: string | null;
  visitante_id: string | null;
  mandante_label: string | null;
  visitante_label: string | null;
}
export interface Participante {
  id: string;
  user_id: string;
}
export interface Palpite {
  participante_id: string;
  partida_id: string;
}
export interface Perfil {
  user_id: string;
  nome: string;
  email: string;
}
export interface JogoView {
  id: string;
  dataHora: string;
  mandante: string;
  visitante: string;
  horaBrt: string;
}
export interface Pendencia {
  participanteId: string;
  email: string;
  nome: string;
  jogos: JogoView[];
}

/** "HH:MM" no fuso do bolão (America/Sao_Paulo, 24h). */
function horaBrt(dataHora: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dataHora));
}

function nomeLado(selecaoId: string | null, label: string | null, porId: Map<string, string>): string {
  if (selecaoId) return porId.get(selecaoId) ?? label ?? "A definir";
  return label ?? "A definir";
}

/** Jogos AGENDADOS cuja data BRT é hoje, com nomes resolvidos e ordenados pelo apito. */
export function jogosDeHoje(partidas: Partida[], selecoes: Selecao[], agora = new Date()): JogoView[] {
  const hoje = dataBrtHoje(agora);
  const porId = new Map(selecoes.map((s) => [s.id, s.nome]));
  return partidas
    .filter((p) => p.status === "agendada" && dataBrtHoje(new Date(p.data_hora)) === hoje)
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    .map((p) => ({
      id: p.id,
      dataHora: p.data_hora,
      mandante: nomeLado(p.mandante_id, p.mandante_label, porId),
      visitante: nomeLado(p.visitante_id, p.visitante_label, porId),
      horaBrt: horaBrt(p.data_hora),
    }));
}

/** Apito mais cedo (o primeiro a travar) entre os jogos. "" se não houver. */
export function prazoDoDia(jogos: JogoView[]): string {
  if (jogos.length === 0) return "";
  return [...jogos].sort((a, b) => a.dataHora.localeCompare(b.dataHora))[0].horaBrt;
}

/** Para cada participante, os jogos de hoje sem palpite. Só entra quem falta ≥1 e tem e-mail. */
export function pendencias(
  participantes: Participante[],
  jogosHoje: JogoView[],
  palpites: Palpite[],
  perfis: Perfil[]
): Pendencia[] {
  const temPalpite = new Set(palpites.map((p) => `${p.participante_id}:${p.partida_id}`));
  const perfilPorUser = new Map(perfis.map((p) => [p.user_id, p]));
  const lista: Pendencia[] = [];
  for (const part of participantes) {
    const faltantes = jogosHoje.filter((j) => !temPalpite.has(`${part.id}:${j.id}`));
    if (faltantes.length === 0) continue;
    const perfil = perfilPorUser.get(part.user_id);
    if (!perfil || !perfil.email) continue;
    lista.push({ participanteId: part.id, email: perfil.email, nome: perfil.nome, jogos: faltantes });
  }
  return lista;
}

export interface EnvioDeps {
  appUrl: string;
  jaEnviado: (participanteId: string) => boolean;
  enviar: (para: string, assunto: string, html: string, texto: string) => Promise<void>;
  registrar: (participanteId: string) => Promise<void>;
}
export interface ResumoEnvio {
  enviados: number;
  pulados: number;
  falhas: number;
}

/** Envia cada pendência (pulando já-enviados), registra só os enviados, e segue após falha. */
export async function enviarPendencias(lista: Pendencia[], deps: EnvioDeps): Promise<ResumoEnvio> {
  const resumo: ResumoEnvio = { enviados: 0, pulados: 0, falhas: 0 };
  for (const p of lista) {
    if (deps.jaEnviado(p.participanteId)) {
      resumo.pulados++;
      continue;
    }
    const { assunto, html, texto } = renderLembrete({
      nome: p.nome,
      jogos: p.jogos,
      prazo: prazoDoDia(p.jogos),
      appUrl: deps.appUrl,
    });
    try {
      await deps.enviar(p.email, assunto, html, texto);
      await deps.registrar(p.participanteId);
      resumo.enviados++;
    } catch {
      resumo.falhas++;
    }
  }
  return resumo;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run scripts/lib/notificar-core.test.ts`
Expected: 6 testes PASS.

Run: `pnpm type-check`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/notificar-core.ts scripts/lib/notificar-core.test.ts
git commit -m "add reminder core logic"
```

---

### Task 4: CLI do lembrete (`scripts/notificar.ts`)

**Files:**
- Create: `scripts/notificar.ts`
- Modify: `package.json` (dep `nodemailer` + `@types/nodemailer`; script `notificar`)

- [ ] **Step 1: Instalar a dependência**

Run: `pnpm add nodemailer && pnpm add -D @types/nodemailer`
Expected: instala `nodemailer` (deps) e `@types/nodemailer` (devDeps).

- [ ] **Step 2: Criar o CLI**

```ts
/* eslint-disable no-console -- script de CLI: o output no terminal é o objetivo */
/**
 * Lembrete diário de palpites por e-mail. Só envia em dia com jogo, só para quem
 * ainda não palpitou nos jogos de hoje. Leitura + envio (não altera dados do bolão).
 *
 * Uso:
 *   pnpm notificar                 (hoje, envia de verdade)
 *   pnpm notificar 2026-06-11      (simula "hoje" como 11/06 — útil pra testar)
 *   pnpm notificar 2026-06-11 --dry-run   (calcula e mostra, NÃO envia nem grava)
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (local: .env.test),
 *      GMAIL_USER, GMAIL_APP_PASSWORD (Senha de app da conta dedicada).
 * Spec: docs/superpowers/specs/2026-06-10-lembrete-palpites-email-design.md
 */
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { garantirEnvSupabase } from "./lib/env";
import {
  jogosDeHoje,
  pendencias,
  enviarPendencias,
  type Partida,
  type Participante,
  type Palpite,
  type Perfil,
  type Selecao,
} from "./lib/notificar-core";

const APP_URL = "https://resenha-bolao-da-copa.netlify.app/palpites";
const REMETENTE = "Resenha Bolão da Copa";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dataArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
  // "hoje" às 09:00 BRT (12:00 UTC) do dia escolhido, ou agora.
  const agora = dataArg ? new Date(`${dataArg}T12:00:00Z`) : new Date();

  const { url, serviceKey } = garantirEnvSupabase();
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) dados (tudo pequeno: nada passa de 1000 linhas aqui)
  const [selecoes, partidas, participantes, perfis, authUsers] = await Promise.all([
    admin.from("selecoes").select("id,nome,codigo").then(unwrap<Selecao>("selecoes")),
    admin
      .from("partidas")
      .select("id,data_hora,status,mandante_id,visitante_id,mandante_label,visitante_label")
      .then(unwrap<Partida>("partidas")),
    admin.from("participantes").select("id,user_id").then(unwrap<Participante>("participantes")),
    admin.from("profiles").select("id,nome").then(unwrap<{ id: string; nome: string }>("profiles")),
    listarEmails(admin),
  ]);

  const jogos = jogosDeHoje(partidas, selecoes, agora);
  if (jogos.length === 0) {
    console.log("📭 Sem jogos hoje — nada a enviar.");
    return;
  }

  const emailPorId = new Map(authUsers.map((u) => [u.id, u.email]));
  const perfisCompletos: Perfil[] = perfis.map((p) => ({
    user_id: p.id,
    nome: p.nome,
    email: emailPorId.get(p.id) ?? "",
  }));

  const idsHoje = jogos.map((j) => j.id);
  const palpites = await admin
    .from("palpites")
    .select("participante_id,partida_id")
    .in("partida_id", idsHoje)
    .then(unwrap<Palpite>("palpites"));

  const lista = pendencias(participantes, jogos, palpites, perfisCompletos);
  console.log(`→ ${jogos.length} jogo(s) hoje · ${lista.length} participante(s) com palpite pendente`);

  if (dryRun) {
    for (const p of lista) {
      console.log(`  [dry-run] ${p.nome} <${p.email}> — ${p.jogos.length} jogo(s)`);
    }
    console.log("\n🧪 dry-run: nada foi enviado.");
    return;
  }

  // 2) anti-duplicata: quem já recebeu hoje
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    throw new Error("Defina GMAIL_USER e GMAIL_APP_PASSWORD (Senha de app da conta dedicada).");
  }
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
  const enviadosHoje = await admin
    .from("lembretes_enviados")
    .select("participante_id")
    .eq("data", hoje)
    .then(unwrap<{ participante_id: string }>("lembretes_enviados"));
  const jaEnviadoSet = new Set(enviadosHoje.map((r) => r.participante_id));

  const transporte = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  });

  const resumo = await enviarPendencias(lista, {
    appUrl: APP_URL,
    jaEnviado: (id) => jaEnviadoSet.has(id),
    enviar: async (para, assunto, html, texto) => {
      await transporte.sendMail({ from: `"${REMETENTE}" <${gmailUser}>`, to: para, subject: assunto, html, text: texto });
    },
    registrar: async (id) => {
      const { error } = await admin.from("lembretes_enviados").insert({ data: hoje, participante_id: id });
      if (error) throw new Error(`registrar ${id}: ${error.message}`);
    },
  });

  console.log(`\n✅ enviados ${resumo.enviados} · pulados ${resumo.pulados} · falhas ${resumo.falhas}`);
}

/** Desempacota { data, error } do supabase-js, com erro claro por tabela. */
function unwrap<T>(rotulo: string) {
  return ({ data, error }: { data: unknown; error: { message: string } | null }): T[] => {
    if (error) throw new Error(`Falha ao ler ${rotulo}: ${error.message}`);
    return (data as T[]) ?? [];
  };
}

/** id + e-mail de todas as contas (paginado), como no backup-core. */
async function listarEmails(
  admin: ReturnType<typeof createClient>
): Promise<{ id: string; email: string }[]> {
  const usuarios: { id: string; email: string }[] = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw new Error(`Falha ao listar auth.users: ${error.message}`);
    for (const u of data.users) usuarios.push({ id: u.id, email: u.email ?? "" });
    if (data.users.length < 1000) break;
  }
  return usuarios;
}

main().catch((erro: Error) => {
  console.error("❌", erro.message);
  process.exit(1);
});
```

- [ ] **Step 3: Registrar o script no package.json**

Em `package.json`, logo após `"backup": "tsx scripts/backup.ts",` (ou junto dos demais scripts de cenário), adicionar:

```json
    "notificar": "tsx scripts/notificar.ts",
```

- [ ] **Step 4: Verificar manualmente (dry-run contra o local)**

Pré-requisito: `supabase start` + `pnpm scenario:seed`.

Run: `pnpm notificar 2026-06-11 --dry-run`
Expected: `→ N jogo(s) hoje · M participante(s) com palpite pendente`, lista `[dry-run] Nome <email> — K jogo(s)`, e `🧪 dry-run: nada foi enviado.` (11/06 é o 1º dia da Copa no cenário).

Run: `pnpm notificar 2026-06-10 --dry-run`
Expected: `📭 Sem jogos hoje — nada a enviar.` (a Copa começa 11/06).

- [ ] **Step 5: Verificações e commit**

Run: `pnpm type-check && pnpm lint`
Expected: sem erros (o `eslint-disable no-console` cobre os logs).

```bash
git add scripts/notificar.ts package.json pnpm-lock.yaml
git commit -m "add daily palpite reminder CLI"
```

---

### Task 5: Workflow no repo privado de backup

**Files (no clone `…/projects/backup-bolao-da-copa`):**
- Create: `.github/workflows/lembrete.yml`

- [ ] **Step 1: Criar o workflow**

```yaml
name: lembrete-palpites

on:
  schedule:
    - cron: "0 12 * * *" # 12:00 UTC = 09:00 BRT (manhã do dia do jogo)
  workflow_dispatch:

jobs:
  lembrete:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: emersonjds/bolao-copa
          path: app

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: app/pnpm-lock.yaml

      - run: pnpm install --frozen-lockfile
        working-directory: app

      - name: enviar os lembretes do dia
        run: pnpm exec tsx scripts/notificar.ts
        working-directory: app
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GMAIL_USER: ${{ secrets.GMAIL_USER }}
          GMAIL_APP_PASSWORD: ${{ secrets.GMAIL_APP_PASSWORD }}
```

- [ ] **Step 2: Commitar (SEM push — o push é do humano)**

```bash
cd /Users/emerson/Documents/workspace/projects/backup-bolao-da-copa
git add .github/workflows/lembrete.yml
git commit -m "add daily palpite reminder workflow"
```

Expected: commit criado. **NÃO dar `git push`** — avisar que o push, os secrets `GMAIL_USER`/`GMAIL_APP_PASSWORD` e o `supabase db push` (migration 0020) são passos manuais do organizador.

---

### Task 6: Documentação no handbook + validação final

**Files:**
- Modify: `docs/PROJETO.md` (§4)

- [ ] **Step 1: Adicionar o lembrete ao §4 do handbook**

Em `docs/PROJETO.md`, logo após o bullet do backup diário (seção `## 4. Backend / dados (Supabase)`), adicionar:

```markdown
- **Lembrete diário de palpites (e-mail):** todo dia 09:00 BRT (GitHub Actions no
  repo `backup-bolao-da-copa`) um e-mail só pra quem ainda não palpitou nos jogos
  do dia, via SMTP do Gmail (`nodemailer`, conta `Resenha Bolão da Copa`). Núcleo
  testável em `scripts/lib/notificar-core.ts`/`email-template.ts`; CLI
  `pnpm notificar [data] [--dry-run]` (`scripts/notificar.ts`). Anti-duplicata na
  tabela `lembretes_enviados` (migration 0020). Spec:
  `docs/superpowers/specs/2026-06-10-lembrete-palpites-email-design.md`.
```

- [ ] **Step 2: Validação final**

Run: `pnpm validate`
Expected: tudo verde (type-check + lint + format:check + testes; +9 testes novos de `scripts/lib`).

Run: `pnpm test:db`
Expected: 32 testes PASS (a migration 0020 não muda os testes existentes).

- [ ] **Step 3: Commit**

```bash
git add docs/PROJETO.md
git commit -m "document daily palpite reminder in handbook"
```

---

## Passos manuais do organizador (depois da implementação)

1. **Secrets** no repo `backup-bolao-da-copa` (Settings → Secrets → Actions): `GMAIL_USER` (`resenhabolaodacopa@…`) e `GMAIL_APP_PASSWORD` (as 16 letras).
2. **Migration em prod:** `supabase db push` (cria `lembretes_enviados`).
3. **Push** dos dois repos.
4. **Actions → lembrete-palpites → Run workflow** para validar o primeiro envio (de manhã, num dia com jogo). Fora de dia de jogo, ele só loga "sem jogos hoje".
