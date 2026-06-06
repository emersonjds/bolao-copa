import { http, HttpResponse } from "msw";

/**
 * Builders de handlers MSW para a REST/RPC do Supabase. Use com `server.use(...)`
 * dentro de cada teste para simular o cenário desejado.
 *
 * Endpoints do Supabase:
 *   - Tabela:  GET/POST/PATCH/DELETE  *​/rest/v1/<tabela>
 *   - RPC:     POST                   *​/rest/v1/rpc/<funcao>
 *
 * supabase-js lê o corpo JSON de erro quando o status é >= 400 e expõe em
 * `error.message` — por isso os builders de erro devolvem { code, message, ... }.
 */

type HttpMethod = "get" | "post" | "patch" | "delete";

/** GET de lista: devolve um array de linhas (formato cru do banco, snake_case). */
export function restList(tabela: string, rows: unknown[]) {
  return http.get(`*/rest/v1/${tabela}`, () => HttpResponse.json(rows));
}

/** GET com `.single()`: devolve um único objeto (PostgREST object response). */
export function restSingle(tabela: string, row: unknown) {
  return http.get(`*/rest/v1/${tabela}`, () => HttpResponse.json(row));
}

/** Escrita (upsert/insert/update/delete) bem-sucedida; corpo opcional. */
export function restWrite(
  tabela: string,
  opts: { method?: HttpMethod; response?: unknown; status?: number } = {}
) {
  const { method = "post", response = null, status = method === "patch" ? 204 : 201 } = opts;
  return http[method](`*/rest/v1/${tabela}`, () =>
    response === null ? new HttpResponse(null, { status }) : HttpResponse.json(response, { status })
  );
}

/** Erro de tabela (ex.: 403 permission denied, 400 RLS). */
export function restError(
  tabela: string,
  opts: { method?: HttpMethod; status?: number; code?: string; message?: string } = {}
) {
  const { method = "get", status = 400, code = "ERRO", message = "erro simulado" } = opts;
  return http[method](`*/rest/v1/${tabela}`, () =>
    HttpResponse.json({ code, message, details: null, hint: null }, { status })
  );
}

/** RPC bem-sucedida: devolve o que a função retornaria (array ou escalar). */
export function rpc(funcao: string, data: unknown) {
  return http.post(`*/rest/v1/rpc/${funcao}`, () => HttpResponse.json(data));
}

/** RPC com erro (ex.: PGRST202 função inexistente). */
export function rpcError(
  funcao: string,
  opts: { status?: number; code?: string; message?: string } = {}
) {
  const { status = 400, code = "PGRST202", message = "função não encontrada" } = opts;
  return http.post(`*/rest/v1/rpc/${funcao}`, () =>
    HttpResponse.json({ code, message, details: null, hint: null }, { status })
  );
}

/** Auth: GET /auth/v1/user devolvendo um usuário (para testar caminhos logados). */
export function authUser(user: unknown) {
  return http.get(`*/auth/v1/user`, () => HttpResponse.json(user));
}
