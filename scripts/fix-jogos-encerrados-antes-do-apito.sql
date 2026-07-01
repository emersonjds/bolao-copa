-- Correção cirúrgica (rodar UMA vez, como superuser — SQL Editor do Supabase).
-- Contexto: BEL×SEN (jogo 82) e USA×BIH (jogo 81) foram marcados 'encerrada'
-- com placar ANTES do apito. Isso: (a) sumiu com eles da tela de palpite,
-- (b) apurou pontos com resultado que não aconteceu, (c) avançou BEL e USA
-- para as oitavas #94. Este script desfaz os três efeitos.
--
-- Ordem importa: limpar pontos e reverter só disparam trigger nenhum
-- (apuração/avanço só rodam quando status='encerrada').

begin;

-- 1) zera os pontos falsos (só o motor SECURITY DEFINER escreve `pontos`;
--    por isso roda no SQL Editor, não pelo app).
update public.palpites
   set pontos = null
 where partida_id in (
   '4d11c794-7136-45e4-8d42-28d39412abf5',  -- BEL×SEN (82)
   '70208ac3-8781-4b35-a0b2-7a2ade360517'   -- USA×BIH (81)
 );

-- 2) reverte os jogos para agendada, sem placar.
update public.partidas
   set status = 'agendada',
       gols_mandante = null,
       gols_visitante = null,
       vencedor_penaltis = null
 where id in (
   '4d11c794-7136-45e4-8d42-28d39412abf5',
   '70208ac3-8781-4b35-a0b2-7a2ade360517'
 );

-- 3) desfaz o auto-avanço: a vaga das oitavas #94 volta a "a definir".
update public.partidas set mandante_id  = null where mandante_label  = 'W81';  -- era USA
update public.partidas set visitante_id = null where visitante_label = 'W82';  -- era BEL

-- Conferência (deve voltar 0 linhas na 1ª; #94 com null×null na 2ª):
-- select id from public.partidas
--  where status='encerrada' and data_hora > now();
-- select numero, mandante_id, visitante_id from public.partidas where numero = 94;

commit;
