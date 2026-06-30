-- Lista de participantes do Bolão da Copa (para conferência de pagamentos).
-- Cole no SQL Editor do Supabase (projeto de PROD) e clique em "Run".
-- Dá pra exportar o resultado em CSV pelo botão de download do editor.
--
-- Mostra: nome, e-mail e a data em que a pessoa entrou no bolão. Ordenado por nome.

select
  row_number() over (order by p.nome) as "#",
  p.nome                              as participante,
  u.email,
  (pa.created_at at time zone 'America/Sao_Paulo')::date as entrou_em
from public.participantes pa
join public.profiles p on p.id = pa.user_id
join auth.users u on u.id = pa.user_id
order by p.nome;

-- Total de participantes (rode separado se quiser só o número):
-- select count(*) as total from public.participantes;
