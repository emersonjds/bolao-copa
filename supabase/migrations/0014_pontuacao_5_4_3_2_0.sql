-- =============================================================================
-- 0014 — nova mecânica de pontuação 5/4/3/2/0
--
-- Substitui a regra anterior (5/3/1/0 com tier de saldo de gols, definida na
-- 0005) pela mecânica oficial confirmada pelo dono. O "placar cravado" agora
-- vale diferente para vitória e empate, e o tier de saldo de gols deixa de
-- existir — acertar o vencedor vale o mesmo independentemente do saldo.
--
-- Regras de pontuação (tempo normal, 90'):
--   5 — cravou o placar de uma VITÓRIA (ambos os gols batem e há vencedor)
--   4 — cravou o placar de um EMPATE (ambos os gols batem e é empate)
--   3 — acertou quem ganhou, placar errado
--   2 — acertou que foi empate, placar errado
--   0 — errou o resultado
--
-- Pênaltis (mata-mata): o placar armazenado é sempre de tempo normal.
--   vencedor_penaltis é apenas exibição e não afeta pontos.
-- =============================================================================

-- ============================================================= apuração de pontos

-- Mantemos a mesma assinatura/trigger da 0005 (trg_apurar_pontos já existe e
-- continua válido); só trocamos o corpo da função com create or replace.
-- SECURITY DEFINER e idempotência permanecem como antes: re-editar o resultado
-- recomputa todos os pontos da partida, sobrescrevendo os valores anteriores.
create or replace function public.apurar_pontos()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  res_real int;  -- 1 = mandante vence, 0 = empate, -1 = visitante vence
begin
  -- Guarda defensivo: o trigger WHEN já filtra, mas protege contra chamada direta.
  if new.status <> 'encerrada'
     or new.gols_mandante is null
     or new.gols_visitante is null then
    return new;
  end if;

  res_real := case
    when new.gols_mandante > new.gols_visitante then  1
    when new.gols_mandante < new.gols_visitante then -1
    else 0
  end;

  update public.palpites pal
     set pontos = case
           -- placar exato: 5 se foi vitória, 4 se foi empate
           when pal.gols_mandante = new.gols_mandante
            and pal.gols_visitante = new.gols_visitante
             then case when res_real = 0 then 4 else 5 end

           -- resultado certo, placar errado: 3 se foi vitória, 2 se foi empate
           when case
                  when pal.gols_mandante > pal.gols_visitante then  1
                  when pal.gols_mandante < pal.gols_visitante then -1
                  else 0
                end = res_real
             then case when res_real = 0 then 2 else 3 end

           -- 0 pts: resultado errado
           else 0
         end
   where pal.partida_id = new.id;

  return new;
end;
$$;

-- ============================================================= backfill

-- Reapuração de partidas já encerradas sob a regra antiga. Set-based, idempotente
-- e seguro mesmo quando não há nenhuma partida encerrada (no-op).
update public.palpites pal
   set pontos = case
         when pal.gols_mandante = pt.gols_mandante
          and pal.gols_visitante = pt.gols_visitante
           then case when pt.gols_mandante = pt.gols_visitante then 4 else 5 end
         when case
                when pal.gols_mandante > pal.gols_visitante then  1
                when pal.gols_mandante < pal.gols_visitante then -1
                else 0
              end =
              case
                when pt.gols_mandante > pt.gols_visitante then  1
                when pt.gols_mandante < pt.gols_visitante then -1
                else 0
              end
           then case when pt.gols_mandante = pt.gols_visitante then 2 else 3 end
         else 0
       end
  from public.partidas pt
 where pt.id = pal.partida_id
   and pt.status = 'encerrada'
   and pt.gols_mandante is not null
   and pt.gols_visitante is not null;
