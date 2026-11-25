// Writes site/img/NN-file.jpg for every key frame cited by a record: cropped to the slide pane
// when the frame is the composite layout (camera left, slide right, black bars), else whole.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
const ROOT = dirname(Bun.main);
let comp = 0, whole = 0, miss = 0;
for (const f of readdirSync(join(ROOT, "extractions")).filter((f) => f.endsWith(".json")).sort()) {
  const r = JSON.parse(readFileSync(join(ROOT, "extractions", f), "utf8")), dir = `${r.nn}-${r.id}`;
  for (const k of r.key_frames ?? []) {
    const src = [join(ROOT, "corpus", dir, "frames", k.file), join(ROOT, "frames-pass1", dir, k.file), join(ROOT, "site", "img-full", `${r.nn}-${k.file}`)].find(existsSync);
    const out = join(ROOT, "site", "img", `${r.nn}-${k.file}`);
    if (!src) { miss++; console.log("MISSING", dir, k.file); continue; }
    const sig = spawnSync("ffmpeg", ["-loglevel", "error", "-i", src, "-vf", "scale=128:72,format=gray", "-frames:v", "1", "-f", "rawvideo", "-"], { maxBuffer: 1 << 20 }).stdout as Buffer;
    let top = 0, bot = 0, left = 0;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 128; x++) { top += sig[y * 128 + x]; bot += sig[(71 - y) * 128 + x]; }
    const bars = top / 640 < 6 && bot / 640 < 6;
    const vf = bars ? "crop=iw*0.70:ih*0.72:iw*0.30:ih*0.135,scale='min(1100,iw)':-2" : "scale='min(1100,iw)':-2";
    spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", src, "-vf", vf, "-q:v", "5", out]);
    bars ? comp++ : whole++;
  }
}
console.log(`cropped ${comp}, whole ${whole}, missing ${miss}`);
