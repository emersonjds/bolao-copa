const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/**
 * Resolve um path de API (`/api/...`) para URL absoluta.
 *
 * Sem `NEXT_PUBLIC_API_URL` (padrão), devolve o path relativo — que o MSW
 * intercepta no browser. Quando o backend real subir, defina
 * `NEXT_PUBLIC_API_URL` apontando para o BFF e desligue o MSW com
 * `NEXT_PUBLIC_ENABLE_MSW=false`; nenhum código de fetch precisa mudar.
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
