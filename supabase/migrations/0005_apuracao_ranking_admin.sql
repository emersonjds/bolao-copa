-- =============================================================================
-- 0005 — apuração de pontos, ranking e área admin
--
-- Itens implementados (referência: design doc §3 e §6):
--   1. profiles.is_admin — controla acesso à área administrativa
--   2. Grant + RLS de UPDATE em partidas para admins (resultado + mata-mata)
--   3. Trigger apurar_pontos() — recomputa pontos ao encerrar/corrigir partida
--   4. get_ranking() — classificação agregada por participante
--   5. Leitura pública (anon) em selecoes e partidas para "explorar sem login"
-- =============================================================================

-- ============================================================= 1. is_admin
-- Bootstrap manual: após o 1º login do organizador, executar no banco:
--   UPDATE profiles SET is_admin = true WHERE id = '<uuid>';
-- Não há tela de promoção de admin neste ciclo (fora de escopo do MVP).
alter table public.profiles
  add column is_admin boolean not null default false;

-- ============================================================= 2. admin em partidas

-- Grant limitado às colunas que o admin precisa editar.
-- O RLS abaixo restringe este grant apenas a quem for is_admin — o grant
-- por si só não abre acesso; a policy de update precisa existir também.
grant update (
  gols_mandante,
  gols_visitante,
  status,
  vencedor_penaltis,
  mandante_id,
  visitante_id,
  mandante_label,
  visitante_label
) on table public.partidas to authenticated;

-- Policy de UPDATE: apenas admin pode alterar partidas.
-- A subquery em USING/WITH CHECK referencia somente auth.uid() (estável na
-- transação), então o planejador a eleva a parâmetro e não a reavalia por linha.
create policy "partidas_update_admin" on public.partidas
  for update to authenticated
  using (
    (select coalesce(p.is_admin, false)
       from public.profiles p
      where p.id = auth.uid())
  )
  with check (
    (select coalesce(p.is_admin, false)
       from public.profiles p
      where p.id = auth.uid())
  );

-- ============================================================= 3. apuração de pontos

-- Função de apuração, chamada pelo trigger trg_apurar_pontos.
-- SECURITY DEFINER: roda como dono da função (superuser no Supabase), o que
--   (a) bypassa o RLS de palpites (select/update restrito ao próprio usuário), e
--   (b) contorna o column-grant que bloqueia authenticated de escrever `pontos`.
-- Idempotente: re-editar o resultado e salvar de novo recomputa todos os pontos
--   daquela partida, sobrescrevendo os valores anteriores.
--
-- enforce_palpite_lock libera o UPDATE que mexe só em `pontos`: ele verifica
--   que gols_mandante e gols_visitante do palpite não mudaram e retorna new
--   sem checar o horário do apito — caminho seguro para a apuração passar.
--
-- Regras de pontuação (tempo normal, 90'):
--   5 — placar exato
--   3 — resultado igual, NÃO empate, e saldo de gols igual (ex.: 3-1 chuta 4-2)
--   1 — só o resultado certo (vencedor OU empate certo com saldo diferente)
--   0 — errou o resultado
--
-- Decisão confirmada pelo dono: tier 3 exige vencedor; empate com saldo igual
--   mas placar diferente vale 1 (não 3). Ex.: real 0-0, chute 1-1 → 1 pt.
--
-- Pênaltis (mata-mata): o placar armazenado é sempre de tempo normal.
--   vencedor_penaltis é apenas exibição e não afeta pontos.
create or replace function public.apurar_pontos()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  saldo_real int;
  res_real   int;  -- 1 = mandante vence, 0 = empate, -1 = visitante vence
begin
  -- Guarda defensivo: o trigger WHEN já filtra, mas protege contra chamada direta.
  if new.status <> 'encerrada'
     or new.gols_mandante is null
     or new.gols_visitante is null then
    return new;
  end if;

  saldo_real := new.gols_mandante - new.gols_visitante;

  -- Evitamos sign() por retornar numeric no pg; expressão case é explicitamente int.
  res_real := case
    when saldo_real > 0 then  1
    when saldo_real < 0 then -1
    else 0
  end;

  update public.palpites pal
     set pontos = case
           -- 5 pts: placar exato (ambos os gols batem)
           when pal.gols_mandante = new.gols_mandante
            and pal.gols_visitante = new.gols_visitante
             then 5

           -- 3 pts: mesmo saldo de gols e há vencedor (não empate)
           -- Saldo igual implica mesmo vencedor, então não precisamos checar
           -- o sinal separadamente — a guarda res_real <> 0 exclui o empate.
           when (pal.gols_mandante - pal.gols_visitante) = saldo_real
            and res_real <> 0
             then 3

           -- 1 pt: só o resultado certo (vencedor ou empate com saldo diferente)
           when case
                  when pal.gols_mandante > pal.gols_visitante then  1
                  when pal.gols_mandante < pal.gols_visitante then -1
                  else 0
                end = res_real
             then 1

           -- 0 pts: resultado errado
           else 0
         end
   where pal.partida_id = new.id;

  return new;
end;
$$;

-- Trigger: dispara após qualquer UPDATE em partidas onde o estado final seja
-- 'encerrada' com placar completo. Cobre tanto a primeira vez (agendada →
-- encerrada) quanto correções posteriores de placar (reapuração idempotente).
create trigger trg_apurar_pontos
  after update on public.partidas
  for each row
  when (
    new.status = 'encerrada'
    and new.gols_mandante is not null
    and new.gols_visitante is not null
  )
  execute function public.apurar_pontos();

-- ============================================================= 4. ranking

-- Agrega pontos de todos os participantes do bolão padrão.
-- SECURITY DEFINER: lê palpites e perfis de todos sem depender do RLS do chamador
--   (palpites_select restringe a leitura cruzada antes do apito — anti-cola).
-- STABLE: resultado pode variar entre transações mas é constante dentro de uma.
-- UUID do bolão padrão fixo (definido na 0002; único bolão neste ciclo).
create or replace function public.get_ranking()
returns table (
  participante_id uuid,
  nome            text,
  avatar_url      text,
  pontos_totais   int,
  jogos_pontuados int
)
language sql
security definer stable
set search_path = public, pg_temp
as $$
  select
    pa.id                             as participante_id,
    pr.nome,
    pr.avatar_url,
    -- coalesce: participante sem nenhum palpite pontua 0, não null
    coalesce(sum(pi.pontos), 0)::int  as pontos_totais,
    -- count ignora null: conta apenas jogos que já foram apurados (pontos != null)
    count(pi.pontos)::int             as jogos_pontuados
  from      public.participantes pa
  join      public.profiles pr on pr.id = pa.user_id
  left join public.palpites  pi on pi.participante_id = pa.id
  where pa.bolao_id = '00000000-0000-0000-0000-000000000b01'
  group by pa.id, pr.nome, pr.avatar_url
  order by pontos_totais desc, jogos_pontuados desc;
$$;

-- Permite que usuários autenticados e anônimos consultem o ranking.
-- (pg 15 não garante EXECUTE para PUBLIC em funções novas por padrão.)
grant execute on function public.get_ranking() to authenticated, anon;

-- ============================================================= 5. leitura pública (anon)

-- selecoes e partidas são dados do torneio sem confidencialidade.
-- Precisamos de grant + policy: o grant autoriza a role a fazer a query;
-- a policy (RLS) filtra as linhas visíveis. Ambos são obrigatórios.
-- Motivação: mecânica "explorar sem login" descrita na §4 do design doc.
grant select on public.selecoes to anon;
grant select on public.partidas to anon;

create policy "selecoes_select_anon" on public.selecoes
  for select to anon using (true);

create policy "partidas_select_anon" on public.partidas
  for select to anon using (true);
