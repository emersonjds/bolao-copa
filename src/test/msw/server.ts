import { setupServer } from "msw/node";

/**
 * Servidor MSW usado SOMENTE nos testes (Vitest). O app em produção fala direto
 * com o Supabase — aqui interceptamos a REST/RPC do Supabase para simular
 * entrada/saída de dados e cobrir todos os cenários (sucesso, vazio, erro).
 *
 * Sem handlers padrão: cada teste declara o que precisa com `server.use(...)`.
 * `onUnhandledRequest: "error"` (em vitest.setup) garante rigor — nenhuma
 * chamada de rede passa sem ser explicitamente simulada.
 */
export const server = setupServer();
