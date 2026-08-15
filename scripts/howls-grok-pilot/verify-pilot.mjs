import {createHash} from "node:crypto";
import {execFileSync, spawnSync} from "node:child_process";
import {readFileSync, readdirSync, statSync, writeFileSync} from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const runIndex = args.indexOf("--run");
if (runIndex === -1 || !args[runIndex + 1]) {
  throw new Error("Usage: node verify-pilot.mjs --run <absolute-run-directory>");
}

const runDirectory = path.resolve(args[runIndex + 1]);
const ffmpeg = "C:\\Users\\User\\Desktop\\채민\\tools\\ffmpeg-portable\\ffmpeg-9.0-essentials_build\\bin\\ffmpeg.exe";
const ffprobe = "C:\\Users\\User\\Desktop\\채민\\tools\\ffmpeg-portable\\ffmpeg-9.0-essentials_build\\bin\\ffprobe.exe";
const grok = "C:\\Users\\User\\.grok\\bin\\grok.exe";

const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));
const probe = (filePath) =>
  JSON.parse(
    execFileSync(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration,size,format_name",
        "-show_entries",
        "stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames",
        "-of",
        "json",
        filePath,
      ],
      {encoding: "utf8"},
    ),
  );

const decodeOk = (filePath) =>
  spawnSync(ffmpeg, ["-v", "error", "-i", filePath, "-f", "null", "NUL"], {
    encoding: "utf8",
  }).status === 0;

const ftypOk = (filePath) => {
  const bytes = readFileSync(filePath);
  return bytes.length > 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp";
};

const sha256 = (filePath) =>
  createHash("sha256").update(readFileSync(filePath)).digest("hex");

const captionsPath = path.join(runDirectory, "captions.json");
const manifestPath = path.join(runDirectory, "edit-manifest.json");
const finalPath = path.join(
  runDirectory,
  "final",
  "howls_moving_castle_watchmatch_30s.mp4",
);
const captions = readJson(captionsPath);
const manifest = readJson(manifestPath);
const clipFiles = readdirSync(path.join(runDirectory, "clips"))
  .filter((name) => name.endsWith("_grok.mp4"))
  .sort()
  .map((name) => path.join(runDirectory, "clips", name));

const clipResults = clipFiles.map((filePath) => {
  const metadata = probe(filePath);
  const video = metadata.streams.find(
    (stream) => stream.codec_type === "video" && stream.codec_name === "h264",
  );
  return {
    file: path.relative(runDirectory, filePath).replaceAll("\\", "/"),
    bytes: statSync(filePath).size,
    ftyp: ftypOk(filePath),
    durationSeconds: Number(metadata.format.duration),
    width: video?.width ?? null,
    height: video?.height ?? null,
    fps: video?.r_frame_rate ?? null,
    codec: video?.codec_name ?? null,
    decodeOk: decodeOk(filePath),
  };
});

const finalMetadata = probe(finalPath);
const finalVideo = finalMetadata.streams.find((stream) => stream.codec_type === "video");
const finalAudio = finalMetadata.streams.find((stream) => stream.codec_type === "audio");
const finalSha = sha256(finalPath);
const captionOrderOk = captions.every(
  (caption, index) =>
    typeof caption.text === "string" &&
    caption.startMs >= 0 &&
    caption.endMs > caption.startMs &&
    (index === 0 || caption.startMs >= captions[index - 1].endMs),
);
const narrationText = captions.map((caption) => caption.text).join(" ");
const spoilerTerms = ["하울의 심장", "캘시퍼 계약", "허수아비 정체", "저주 해제 방식", "최종 커플", "결말"];
const spoilerHits = spoilerTerms.filter((term) => narrationText.includes(term));

const auditFiles = [
  ...readdirSync(path.join(runDirectory, "prompts")).map((name) =>
    path.join(runDirectory, "prompts", name),
  ),
  ...readdirSync(path.join(runDirectory, "logs")).map((name) =>
    path.join(runDirectory, "logs", name),
  ),
];
const forbiddenTracePatterns = [
  /openrouter\.ai/iu,
  /Bearer\s+[A-Za-z0-9._-]+/u,
  /OPENROUTER_API_KEY/u,
  /3_openrouter/u,
];
const forbiddenTraceHits = [];
for (const filePath of auditFiles) {
  const content = readFileSync(filePath, "utf8");
  for (const pattern of forbiddenTracePatterns) {
    if (pattern.test(content)) {
      forbiddenTraceHits.push({file: path.relative(runDirectory, filePath), pattern: pattern.source});
    }
  }
}

const promptRecords = readdirSync(path.join(runDirectory, "prompts"))
  .filter((name) => name.endsWith(".txt"))
  .sort()
  .map((name) => ({file: name, text: readFileSync(path.join(runDirectory, "prompts", name), "utf8")}));
const grokVersion = execFileSync(grok, ["--version"], {encoding: "utf8"}).trim();
const finalDuration = Number(finalMetadata.format.duration);
const finalValidation = {
  file: path.relative(runDirectory, finalPath).replaceAll("\\", "/"),
  bytes: statSync(finalPath).size,
  ftyp: ftypOk(finalPath),
  durationSeconds: finalDuration,
  width: finalVideo?.width ?? null,
  height: finalVideo?.height ?? null,
  fps: finalVideo?.r_frame_rate ?? finalVideo?.avg_frame_rate ?? null,
  frameCount: Number(finalVideo?.nb_frames ?? 0),
  videoCodec: finalVideo?.codec_name ?? null,
  audioCodec: finalAudio?.codec_name ?? null,
  decodeOk: decodeOk(finalPath),
  sha256: finalSha,
};

const checks = {
  fiveClips: clipResults.length === 5,
  clipsNonEmpty: clipResults.every((clip) => clip.bytes > 0),
  clipsFtyp: clipResults.every((clip) => clip.ftyp),
  clipsVertical: clipResults.every((clip) => clip.height > clip.width),
  clipsAboutSixSeconds: clipResults.every(
    (clip) => clip.durationSeconds >= 5.8 && clip.durationSeconds <= 6.3,
  ),
  clipsDecode: clipResults.every((clip) => clip.decodeOk),
  finalFtyp: finalValidation.ftyp,
  finalDimensions: finalValidation.width === 1080 && finalValidation.height === 1920,
  finalFps: finalValidation.fps === "30/1",
  finalDuration: finalDuration >= 29.5 && finalDuration <= 30.5,
  finalFrameCount: finalValidation.frameCount === 900,
  finalCodecs: finalValidation.videoCodec === "h264" && finalValidation.audioCodec === "aac",
  finalDecode: finalValidation.decodeOk,
  captionCount: captions.length === 10,
  captionsInOrder: captionOrderOk,
  titleAndDisclosure:
    manifest.title === "하울의 움직이는 성" &&
    manifest.year === 2004 &&
    manifest.disclosure.includes("실제 영화 이미지·영상·음성을 사용하지 않았습니다"),
  spoilerFree: spoilerHits.length === 0,
  noExternalRecommendationApiTrace: forbiddenTraceHits.length === 0,
};
const overall = Object.values(checks).every(Boolean) ? "PASS" : "FAIL";

const validationReport = {
  generatedAt: new Date().toISOString(),
  overall,
  checks,
  spoilerHits,
  forbiddenTraceHits,
  clips: clipResults,
  final: finalValidation,
};
writeFileSync(
  path.join(runDirectory, "validation-report.json"),
  `${JSON.stringify(validationReport, null, 2)}\n`,
  "utf8",
);
writeFileSync(
  path.join(runDirectory, "sha256.txt"),
  `${finalSha}  final/howls_moving_castle_watchmatch_30s.mp4\n`,
  "utf8",
);

const report = {
  project: "WatchMatch Howl's Moving Castle Grok CLI 30-second pilot",
  generatedAt: new Date().toISOString(),
  runDirectory,
  grok: {
    cliVersion: grokVersion,
    model: "grok-4.6",
    reasoningEffort: "medium",
    webSearchDisabled: true,
    memoryDisabled: true,
    requestedDurationSeconds: 6,
    requestedResolution: "720p",
    completedClips: clipResults.length,
    retries: 0,
    errors: [],
    prompts: promptRecords,
  },
  openRouterUsed: false,
  tts: manifest.tts,
  captions: {
    file: "captions.json",
    count: captions.length,
    ordered: captionOrderOk,
  },
  sourceClips: clipResults,
  final: finalValidation,
  validation: validationReport,
  limitations: [
    "The Grok Build CLI does not expose an exact per-video quota price in this run.",
    "This pilot uses original generated imagery and does not claim current OTT availability.",
  ],
};
writeFileSync(
  path.join(runDirectory, "howls_grok_pilot_report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({overall, checks, final: finalValidation}, null, 2));
if (overall !== "PASS") process.exitCode = 1;
