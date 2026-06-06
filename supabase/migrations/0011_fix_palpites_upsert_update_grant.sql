-- BUG (Postgres 42501 "permission denied for table palpites" no UPDATE):
-- o app salva palpite com upsert -> POST /palpites?on_conflict=participante_id,partida_id,
-- que o PostgREST traduz para INSERT ... ON CONFLICT DO UPDATE. Ao contrário do
-- que o comentário em palpites-fetcher.ts assumia, o PostgREST inclui TODAS as
-- colunas do corpo no SET do DO UPDATE — inclusive participante_id e partida_id
-- (não exclui as colunas de conflito). Como o GRANT de UPDATE (0001/0009) só
-- cobria (gols_mandante, gols_visitante, updated_at), o caminho de atualização
-- (editar um palpite já existente) falhava; criar um palpite novo (INSERT) passava.
--
-- Correção: incluir participante_id e partida_id no GRANT de UPDATE. Para que
-- isso NÃO permita realocar/forjar palpite de outro usuário, a policy de update
-- (que na 0001 só tinha USING) ganha WITH CHECK: a linha resultante precisa
-- continuar pertencendo ao próprio usuário. Assim:
--   - USING       bloqueia editar linha que não é sua (checa a linha ANTIGA);
--   - WITH CHECK  bloqueia gravar a linha com participante_id de outro (linha NOVA).
-- `pontos` segue blindado: fora de qualquer GRANT de escrita (só service_role escreve).
-- A trava de horário (trg_palpite_lock) continua valendo no servidor.

grant update (participante_id, partida_id, gols_mandante, gols_visitante, updated_at)
  on table public.palpites to authenticated;

drop policy if exists "palpites_update_own" on public.palpites;

create policy "palpites_update_own" on public.palpites
  for update to authenticated
  using (
    exists (
      select 1 from public.participantes p
      where p.id = palpites.participante_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.participantes p
      where p.id = palpites.participante_id and p.user_id = auth.uid()
    )
  );
