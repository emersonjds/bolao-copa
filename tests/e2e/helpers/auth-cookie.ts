import { Buffer } from "node:buffer";

/**
 * Constrói o(s) cookie(s) de sessão no formato do @supabase/ssr (o app usa
 * `createBrowserClient`, que persiste a sessão em COOKIE, não localStorage).
 *
 * Formato (ver node_modules/@supabase/ssr/dist/main/cookies.js):
 *   nome:  sb-<project-ref>-auth-token
 *   valor: "base64-" + base64url(JSON.stringify(session))
 *   chunk: se passar de 3180 chars, vira sb-...-auth-token.0, .1, ...
 */

const MAX_CHUNK_SIZE = 3180; // igual ao MAX_CHUNK_SIZE do @supabase/ssr

export interface CookiePair {
  name: string;
  value: string;
}

/** Extrai o project-ref de https://<ref>.supabase.co */
export function projectRefFromUrl(supabaseUrl: string): string {
  return new URL(supabaseUrl).hostname.split(".")[0];
}

export function buildSupabaseAuthCookies(supabaseUrl: string, session: unknown): CookiePair[] {
  const key = `sb-${projectRefFromUrl(supabaseUrl)}-auth-token`;
  const json = JSON.stringify(session);
  const value = `base64-${Buffer.from(json, "utf-8").toString("base64url")}`;

  // base64url só tem [A-Za-z0-9_-]; encodeURIComponent não expande, então o
  // comprimento bruto serve para decidir o chunking.
  if (value.length <= MAX_CHUNK_SIZE) {
    return [{ name: key, value }];
  }

  const chunks: CookiePair[] = [];
  for (let i = 0, pos = 0; pos < value.length; i += 1, pos += MAX_CHUNK_SIZE) {
    chunks.push({ name: `${key}.${i}`, value: value.slice(pos, pos + MAX_CHUNK_SIZE) });
  }
  return chunks;
}
