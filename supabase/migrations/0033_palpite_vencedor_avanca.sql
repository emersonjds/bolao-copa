-- =============================================================================
-- 0033 — coluna vencedor_avanca em palpites (mata-mata: quem o palpiteiro acha
-- que passa quando o palpite é empate). Nullable; só preenchida nesse caso.
-- Grants de palpites são column-level (0009/0026): a coluna precisa de grant
-- explícito de insert/update, senão o upsert do app falha.
-- =============================================================================

alter table public.palpites
  add column vencedor_avanca uuid references public.selecoes (id);

grant insert (vencedor_avanca) on table public.palpites to authenticated;
grant update (vencedor_avanca) on table public.palpites to authenticated;

-- Integridade: quando preenchida, deve ser uma das duas seleções da partida.
create or replace function public.validar_vencedor_avanca()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m uuid;
  v uuid;
begin
  if new.vencedor_avanca is null then
    return new;
  end if;
  select mandante_id, visitante_id into m, v
    from public.partidas where id = new.partida_id;
  if new.vencedor_avanca is distinct from m
     and new.vencedor_avanca is distinct from v then
    raise exception 'vencedor_avanca (%) nao e mandante nem visitante da partida %',
      new.vencedor_avanca, new.partida_id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_validar_vencedor_avanca on public.palpites;
create trigger trg_validar_vencedor_avanca
  before insert or update on public.palpites
  for each row execute function public.validar_vencedor_avanca();
