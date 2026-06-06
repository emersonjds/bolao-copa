import { http, HttpResponse } from "msw";
import { partidasFixture } from "../fixtures/partidas-fixture";

export const partidasHandlers = [
  http.get("/api/partidas", () => {
    return HttpResponse.json({ partidas: partidasFixture });
  }),
];
