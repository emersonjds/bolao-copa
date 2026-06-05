-- 0004_auth_autoinscricao.sql
-- Estende handle_new_user(): além de criar o profile, inscreve o novo usuário
-- no bolão padrão (UUID fixo da 0002), na MESMA transação do cadastro.
-- Atômico: a policy boloes_select exige ser participante, então a inscrição
-- precisa existir já no 1º login, senão o bolão padrão fica invisível na UI.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, nome, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.participantes (bolao_id, user_id)
  values ('00000000-0000-0000-0000-000000000b01', new.id)
  on conflict (bolao_id, user_id) do nothing;

  return new;
end;
$$;
