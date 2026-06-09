/* eslint-disable no-console -- script de CLI: o output no terminal é o objetivo */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * Converte o walkthrough gravado (demo/walkthrough.webm) para .mp4 (h264) —
 * formato que embeda em PowerPoint/Keynote. Roda como passo do `pnpm demo`.
 * Sem ffmpeg instalado, apenas mantém o .webm e sai sem erro.
 */

const ENTRADA = "demo/walkthrough.webm";
const SAIDA = "demo/walkthrough.mp4";

const temFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
if (!temFfmpeg) {
  console.log(
    "ℹ ffmpeg não encontrado — mantendo só o .webm (brew install ffmpeg para gerar .mp4)."
  );
  process.exit(0);
}
if (!existsSync(ENTRADA)) {
  console.log(`ℹ ${ENTRADA} não existe — nada a converter.`);
  process.exit(0);
}

const resultado = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    ENTRADA,
    // Sobe para ~2x a largura mobile (nitidez em projetor) mantendo proporção.
    "-vf",
    "scale=780:-2:flags=lanczos",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "20",
    "-movflags",
    "+faststart",
    SAIDA,
  ],
  { stdio: "inherit" }
);

if (resultado.status !== 0) {
  console.error("✖ falha ao converter para .mp4");
  process.exit(resultado.status ?? 1);
}
console.log(`✓ vídeo pronto: ${SAIDA}`);
