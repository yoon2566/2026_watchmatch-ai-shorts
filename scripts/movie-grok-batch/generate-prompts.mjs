import {mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
import {movieBatch} from "./batch-catalog.mjs";

const runArg = process.argv.find((value) => value.startsWith("--run="));
if (!runArg) throw new Error("Usage: node generate-prompts.mjs --run=C:\\absolute\\run-directory");
const runDirectory = path.resolve(runArg.slice("--run=".length));

for (const work of movieBatch) {
  const workDirectory = path.join(runDirectory, work.slug);
  for (const folder of ["images", "clips", "logs", "prompts"]) await mkdir(path.join(workDirectory, folder), {recursive: true});
  for (let index = 0; index < work.scenes.length; index += 1) {
    const sceneNumber = String(index + 1).padStart(2, "0");
    const [imageBrief, motion] = work.scenes[index];
    const sourceMethod = index === 0
      ? `First call image_gen exactly once with aspect_ratio "9:16". Create this original source frame: ${imageBrief}. Vertical 9:16, cinematic, original production design, stable animation-friendly composition, no text.`
      : `Call image_edit exactly once using this canonical reference image: ${path.join(workDirectory, "images", "scene_01_source.jpg")}\n\nPreserve the same original visual language while creating this new vertical source frame: ${imageBrief}. Do not copy any named character or recognizable film design. No text.`;
    const imageToolName = index === 0 ? "generated" : "edited";
    const prompt = `Load the bundled imagine skill and execute the requested media generation now. Do not use web search or web fetch. Create an entirely original cinematic recommendation asset inspired only by broad genre themes. Do not copy any film frame, poster, logo, named character, actor likeness, costume, prop, recognizable location, or the visual style of any named studio or artist.\n\n${sourceMethod}\n\nThen call image_to_video exactly once using that ${imageToolName} image, prompt: "${motion}. Keep all original designs, geometry, lighting, and environment stable. Use restrained motion and one camera movement. No logos and no text.", duration 6, resolution_name "720p".\n\nAfter both tools succeed, use run_terminal_cmd only to copy the ${imageToolName} source image to ${path.join(workDirectory, "images", `scene_${sceneNumber}_source.jpg`)} and the generated video to ${path.join(workDirectory, "clips", `scene_${sceneNumber}_grok.mp4`)}. Verify both files exist and are non-empty. Return concise JSON with paths and tool parameters. Do not call another generation tool and do not retry a safety, quota, permission, or Zero Data Retention error.\n`;
    await writeFile(path.join(workDirectory, "prompts", `scene_${sceneNumber}.txt`), prompt, "utf8");
  }
}

await writeFile(path.join(runDirectory, "batch-manifest.json"), JSON.stringify({generatedAt: new Date().toISOString(), works: movieBatch}, null, 2), "utf8");
console.log(JSON.stringify({runDirectory, works: movieBatch.length, prompts: movieBatch.length * 5}));

