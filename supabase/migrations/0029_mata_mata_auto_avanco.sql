-- =============================================================================
-- 0029 — coluna numero + trigger de auto-avanço do mata-mata
--
-- numero (smallint, nullable): identifica cada jogo do mata-mata (73–104).
-- Grupos ficam null. O único índice garante que cada numero aparece 1×.
--
-- A trigger avancar_mata_mata() dispara após UPDATE de qualquer partida:
-- ao encerrar um jogo N, busca partidas com mandante_label='WN' / 'LN' e
-- preenche mandante_id/visitante_id com o vencedor/perdedor.
-- Espelha apurar_pontos(): security definer, search_path seguro.
-- =============================================================================

alter table public.partidas add column numero smallint;

-- ===================================================== backfill (73–104)
-- Deriva de BRACKET_2026 (scripts/lib/bracket-2026.ts); casamento por
-- (fase, mandante_label, visitante_label) que já existem no banco.
update public.partidas p
   set numero = v.numero
  from (values
    ('trinta-e-dois', '2A',           '2B',           73),
    ('trinta-e-dois', '1E',           '3A/B/C/D/F',   74),
    ('trinta-e-dois', '1F',           '2C',           75),
    ('trinta-e-dois', '1C',           '2F',           76),
    ('trinta-e-dois', '1I',           '3C/D/F/G/H',   77),
    ('trinta-e-dois', '2E',           '2I',           78),
    ('trinta-e-dois', '1A',           '3C/E/F/H/I',   79),
    ('trinta-e-dois', '1L',           '3E/H/I/J/K',   80),
    ('trinta-e-dois', '1D',           '3B/E/F/I/J',   81),
    ('trinta-e-dois', '1G',           '3A/E/H/I/J',   82),
    ('trinta-e-dois', '2K',           '2L',           83),
    ('trinta-e-dois', '1H',           '2J',           84),
    ('trinta-e-dois', '1B',           '3E/F/G/I/J',   85),
    ('trinta-e-dois', '1J',           '2H',           86),
    ('trinta-e-dois', '1K',           '3D/E/I/J/L',   87),
    ('trinta-e-dois', '2D',           '2G',           88),
    ('oitavas',       'W74',          'W77',          89),
    ('oitavas',       'W73',          'W75',          90),
    ('oitavas',       'W76',          'W78',          91),
    ('oitavas',       'W79',          'W80',          92),
    ('oitavas',       'W83',          'W84',          93),
    ('oitavas',       'W81',          'W82',          94),
    ('oitavas',       'W86',          'W88',          95),
    ('oitavas',       'W85',          'W87',          96),
    ('quartas',       'W89',          'W90',          97),
    ('quartas',       'W93',          'W94',          98),
    ('quartas',       'W91',          'W92',          99),
    ('quartas',       'W95',          'W96',          100),
    ('semifinal',     'W97',          'W98',          101),
    ('semifinal',     'W99',          'W100',         102),
    ('terceiro-lugar','L101',         'L102',         103),
    ('final',         'W101',         'W102',         104)
  ) v(fase, ml, vl, numero)
 where p.fase             = v.fase
   and p.mandante_label   = v.ml
   and p.visitante_label  = v.vl;

create unique index partidas_numero_uidx on public.partidas (numero) where numero is not null;

-- ================================================ função de auto-avanço
create or replace function public.avancar_mata_mata()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  venc uuid;
  perd uuid;
begin
  if new.status <> 'encerrada' or new.numero is null
     or new.gols_mandante is null or new.gols_visitante is null then
    return new;
  end if;

  if new.gols_mandante = new.gols_visitante
     and new.vencedor_penaltis is not null
     and new.vencedor_penaltis is distinct from new.mandante_id
     and new.vencedor_penaltis is distinct from new.visitante_id then
    raise exception 'vencedor_penaltis (%) nao e mandante nem visitante da partida %', new.vencedor_penaltis, new.id;
  end if;

  venc := case
    when new.gols_mandante > new.gols_visitante then new.mandante_id
    when new.gols_visitante > new.gols_mandante then new.visitante_id
    else new.vencedor_penaltis
  end;

  -- empate sem vencedor_penaltis preenchido: aguarda correção
  if venc is null then return new; end if;

  perd := case when venc = new.mandante_id then new.visitante_id else new.mandante_id end;

  update public.partidas set mandante_id = venc where mandante_label = 'W'||new.numero;
  update public.partidas set visitante_id = venc where visitante_label = 'W'||new.numero;
  update public.partidas set mandante_id = perd where mandante_label = 'L'||new.numero;
  update public.partidas set visitante_id = perd where visitante_label = 'L'||new.numero;

  return new;
end; $$;

drop trigger if exists trg_avancar_mata_mata on public.partidas;
create trigger trg_avancar_mata_mata
  after update on public.partidas
  for each row
  when (new.status = 'encerrada' and new.numero is not null)
  execute function public.avancar_mata_mata();
