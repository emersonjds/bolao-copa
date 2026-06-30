-- ============================================================================
-- RESET CIRÚRGICO PARA TESTES  —  Bolão da Copa
-- ============================================================================
-- Use durante a fase de VALIDAÇÃO (testando com algumas pessoas reais).
-- Limpa só o ESTADO DE JOGO e MANTÉM as contas/login dos testers:
--   • apaga todos os palpites (e os pontos, que são coluna do palpite);
--   • volta todas as partidas pro estado inicial (sem placar, "agendada").
--
-- NÃO toca em: contas de login (auth.users), profiles, participantes,
-- seleções, o bolão, nem os jogos em si. Os testers continuam logados.
--
-- COMO USAR: cole no SQL Editor do Supabase e rode. Roda como postgres
-- (ignora RLS), então funciona independente de quem está logado.
--
-- ⚠️ NÃO é uma migration — fica FORA de supabase/migrations/ de propósito,
--    pra nunca rodar sozinho no `supabase db push`. É manual e deliberado.
-- ⚠️ Para "zerar tudo de verdade" (inclusive contas) seria `db reset --linked`,
--    que NÃO se deve usar com testers dentro.
-- ============================================================================

-- 1) apaga todos os palpites (os pontos vão junto)
delete from public.palpites;

-- 2) volta as partidas pro estado inicial (sem resultado)
update public.partidas
set gols_mandante     = null,
    gols_visitante    = null,
    status            = 'agendada',
    vencedor_penaltis = null;

-- Dica: se quiser manter os palpites e só re-testar a APURAÇÃO de pontos,
-- comente a linha do `delete from public.palpites;` acima e rode só o update.
