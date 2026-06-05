/**
 * MSW handler para GET /api/partidas
 *
 * Devolve os jogos do bolão. Substitui o backend que consultaria uma API de
 * fixtures da Copa. Quando o backend subir, basta remover este handler.
 */
import { http, HttpResponse } from "msw";
import { partidasFixture } from "../fixtures/partidas-fixture";

export const partidasHandlers = [
  http.get("/api/partidas", () => {
    return HttpResponse.json({ partidas: partidasFixture });
  }),
];
