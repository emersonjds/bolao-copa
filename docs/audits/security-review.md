# Auditoria de Segurança — Bolão da Copa 2026

> Origem: red team (defensivo, projeto próprio). Última revisão: 2026-06-07.
> Foco: vazamento de dados, RLS, segredos, auth. Há **testers reais em produção**.

## Status dos achados

| #   | Severidade | Achado                                                                                               | Status                                                                                                                          |
| --- | ---------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| C-1 | 🔴 Crítico | `profiles.is_admin` gravável por qualquer `authenticated` (auto-promoção a admin → fraude de placar) | ✅ Corrigido (migration `0016`, revoke/grant de coluna) + teste de regressão                                                    |
| A-1 | 🟠 Alto    | Open redirect em `/auth/callback` via `?next=`                                                       | ✅ Corrigido (`next` só aceita caminho interno)                                                                                 |
| A-2 | 🟠 Alto    | `signInDev`/senha de dev no bundle de produção                                                       | ✅ Corrigido (`signInDev` lança erro em produção)                                                                               |
| A-3 | 🟠 Alto    | Ausência de security headers                                                                         | ✅ Corrigido (`public/_headers`: CSP, HSTS, XFO, nosniff, Referrer/Permissions-Policy)                                          |
| M-2 | 🟡 Médio   | `peso_fase`/`bump_palpite_updated_at` sem `search_path`                                              | ✅ Corrigido (migration `0016`)                                                                                                 |
| M-1 | 🟡 Médio   | `is_admin` legível por todos os autenticados (enumeração de admins)                                  | ✅ Corrigido (migration `0018`: coluna `is_admin` não-legível pelo cliente; checagem via RPC `eh_admin` SECURITY DEFINER)       |
| M-3 | 🟡 Médio   | `palpites_select` sem filtro por `bolao_id` (bomba-relógio multi-bolão)                              | ⏳ Pendente (irrelevante com 1 bolão; documentar p/ quando houver vários)                                                       |
| M-4 | 🟡 Médio   | PostCSS < 8.5.10 (CVE)                                                                               | ✅ N/A — projeto já em `^8.5.15`                                                                                                |
| B-1 | 🔵 Baixo   | Convite sem uso único (link reutilizável)                                                            | ⏸️ Adiado (YAGNI: convites não são usados — entrada é por auto-inscrição no cadastro; implementar junto com o fluxo de convite) |

## O que está correto (não mexer)

- **Anti-cola em `palpites`**: policy de select + filtro por `participante_id` no fetcher — ninguém vê palpite alheio antes do apito.
- **Trava de horário** (`enforce_palpite_lock`, 0012): imutabilidade antes do bypass de apuração — ordem correta.
- **`service_role` nunca no frontend**: só `NEXT_PUBLIC_*` no bundle. Publishable key é pública por design (proteção real = RLS).
- **Funções SECURITY DEFINER** com `search_path` fixo (apurar_pontos, get_ranking, handle_new_user, peso_fase após 0016).

## Recomendações abertas (não urgentes)

1. **PITR** (Point-in-Time Recovery) no projeto de produção — rede de segurança contra migration destrutiva.
2. Ao implementar convites (hoje a entrada é por auto-inscrição), incluir uso único (B-1) e filtro por `bolao_id` em `palpites_select` (M-3) se houver múltiplos bolões.
3. Verificar a CSP num **deploy preview** antes de promover (única linha que pode afetar render: `script-src`).
