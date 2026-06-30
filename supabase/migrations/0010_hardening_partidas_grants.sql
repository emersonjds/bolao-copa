-- Hardening de defense-in-depth em `partidas`.
--
-- O default privilege do Supabase (`alter default privileges ... grant all`)
-- concedeu INSERT/UPDATE de TODAS as colunas a `authenticated`. O grant de
-- coluna da 0005 foi somado por cima, sem substituir — então a blindagem de
-- coluna pretendida ("admin só edita 8 colunas") nunca esteve ativa.
--
-- A RLS já é o portão real (partidas_update_admin exige is_admin; não há policy
-- de INSERT, então insert por authenticated é negado de qualquer forma). Esta
-- migration apenas alinha os GRANTS à intenção original: authenticated não
-- insere partidas e só pode atualizar as colunas que o admin de fato edita.
-- service_role (apuração/seed) ignora estes grants.

-- Tira o INSERT amplo: criar partidas é tarefa de seed/service_role, nunca do app.
revoke insert on table public.partidas from authenticated;

-- Reduz o UPDATE às colunas do admin (id, created_at e afins ficam de fora).
revoke update on table public.partidas from authenticated;

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
