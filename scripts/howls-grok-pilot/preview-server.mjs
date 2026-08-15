import {createReadStream, existsSync, statSync} from "node:fs";
import {createServer} from "node:http";
import path from "node:path";

const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1];
};
const root = path.resolve(valueAfter("--root", process.cwd()));
const port = Number(valueAfter("--port", "3200"));
const videoRelative = "final/howls_moving_castle_watchmatch_30s.mp4";
const sheetRelative = "contact-sheet/final-layout-contact-sheet.png";

const mime = (filePath) => {
  if (filePath.endsWith(".mp4")) return "video/mp4";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
};

const sendFile = (request, response, relativePath) => {
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`) || !existsSync(filePath)) {
    response.writeHead(404).end("Not found");
    return;
  }
  const size = statSync(filePath).size;
  const range = request.headers.range;
  if (range && filePath.endsWith(".mp4")) {
    const match = /bytes=(\d*)-(\d*)/u.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    response.writeHead(206, {
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Type": mime(filePath),
    });
    createReadStream(filePath, {start, end}).pipe(response);
    return;
  }
  response.writeHead(200, {"Content-Length": size, "Content-Type": mime(filePath)});
  createReadStream(filePath).pipe(response);
};

createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  if (url.pathname === "/video.mp4") return sendFile(request, response, videoRelative);
  if (url.pathname === "/contact-sheet.png") return sendFile(request, response, sheetRelative);
  if (url.pathname === "/report.json") return sendFile(request, response, "howls_grok_pilot_report.json");
  if (url.pathname !== "/") {
    response.writeHead(404).end("Not found");
    return;
  }
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WatchMatch 하울 Grok 파일럿</title><style>body{margin:0;background:#05030a;color:#fff;font-family:Arial,'Malgun Gothic',sans-serif}main{max-width:1100px;margin:auto;padding:32px}h1{font-size:clamp(28px,5vw,48px)}p{color:#c4b5d4;line-height:1.6}.grid{display:grid;grid-template-columns:minmax(280px,430px) 1fr;gap:28px;align-items:start}video,img{width:100%;border-radius:22px;border:1px solid #39264d;background:#000}a{color:#d8b4fe}@media(max-width:800px){.grid{grid-template-columns:1fr}}</style><main><h1>하울의 움직이는 성 · Grok CLI 30초 파일럿</h1><p>실제 영화 이미지·영상·음성이나 OpenRouter를 사용하지 않은 비공식 무스포 추천 샘플입니다.</p><div class="grid"><video controls playsinline preload="metadata" src="/video.mp4"></video><section><img src="/contact-sheet.png" alt="파일럿 장면 접촉 시트"><p><a href="/video.mp4" download>MP4 다운로드</a> · <a href="/report.json">검증 보고서</a></p></section></div></main></html>`;
  response.writeHead(200, {"Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(html)});
  response.end(html);
}).listen(port, "127.0.0.1", () => {
  console.log(`Howls Grok pilot preview: http://127.0.0.1:${port}/`);
});
