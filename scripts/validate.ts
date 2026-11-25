// Validates extraction records against the schema in EXTRACTION_BRIEF.md.
// Usage: bun validate.ts <file.json> [more files]   |   bun validate.ts --all
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = dirname(Bun.main);
const TAGS = new Set([
  "agent-authz-identity", "sandboxing-isolation", "prompt-injection", "agent-memory-context",
  "coding-agent-security", "mcp-tools-skills", "guardrails-runtime-controls", "governance-policy",
  "ai-soc-detection-response", "vuln-discovery-exploit", "autonomous-offense",
  "appsec-secure-development", "evals-benchmarks-metrics", "model-internals",
  "supply-chain-model-integrity", "cryptography-formal-methods", "privacy-confidential-compute",
  "threat-intel-in-the-wild", "fraud-scams-abuse", "org-adoption-culture", "law-policy-society",
]);
const FORMATS = new Set(["talk", "lightning", "debate", "panel", "opening", "closing"]);
const GRADES = new Set(["measured", "demo", "case", "anecdote", "assertion"]);
const SOURCES = new Set(["said", "slide", "both"]);
const KINDS = new Set(["tool", "paper", "dataset", "cve", "standard", "product", "benchmark", "repo"]);
const STR_ARRAYS = ["argument", "slide_only", "demos", "offense", "defense", "takeaways", "limits", "critique", "qa", "tags", "caveats"];
const TS = /^\d{1,3}:\d{2}$/;

function check(file: string): string[] {
  const e: string[] = [];
  let r: any;
  try { r = JSON.parse(readFileSync(file, "utf8")); } catch (err) { return [`not valid JSON: ${err}`]; }
  const stem = basename(file, ".json");
  const str = (k: string, min = 1) => { if (typeof r[k] !== "string" || r[k].trim().length < min) e.push(`${k}: missing or too short`); };
  ["nn", "id", "url", "title", "thesis"].forEach((k) => str(k));
  str("summary", 400);
  if (`${r.nn}-${r.id}` !== stem) e.push(`nn/id (${r.nn}-${r.id}) do not match filename ${stem}`);
  if (!FORMATS.has(r.format)) e.push(`format: ${r.format}`);
  if (typeof r.duration_min !== "number") e.push("duration_min: not a number");
  if (!Array.isArray(r.speakers) || r.speakers.length === 0 || r.speakers.some((s: any) => !s?.name || typeof s.affiliation !== "string")) e.push("speakers: need [{name, affiliation}]");
  for (const k of STR_ARRAYS) if (!Array.isArray(r[k]) || r[k].some((x: any) => typeof x !== "string")) e.push(`${k}: must be an array of strings`);
  if (Array.isArray(r.tags)) {
    if (r.tags.length < 1 || r.tags.length > 4) e.push("tags: need 1 to 4");
    for (const t of r.tags) if (!TAGS.has(t)) e.push(`tags: unknown tag ${t}`);
  }
  const lightning = r.format === "lightning" || r.format === "opening" || r.format === "closing";
  if (Array.isArray(r.argument) && r.argument.length < (lightning ? 1 : 3)) e.push("argument: too few steps");
  if (Array.isArray(r.takeaways) && r.takeaways.length < (lightning ? 1 : 3)) e.push("takeaways: too few");
  if (!Array.isArray(r.claims) || r.claims.length < (lightning ? 2 : 6)) e.push("claims: too few");
  else r.claims.forEach((c: any, i: number) => {
    if (!c.claim || typeof c.evidence !== "string") e.push(`claims[${i}]: claim/evidence`);
    if (!GRADES.has(c.grade)) e.push(`claims[${i}].grade: ${c.grade}`);
    if (!SOURCES.has(c.source)) e.push(`claims[${i}].source: ${c.source}`);
    if (!TS.test(c.t ?? "")) e.push(`claims[${i}].t: ${c.t}`);
  });
  for (const [k, need] of [["numbers", ["figure", "meaning"]], ["frameworks", ["name", "description"]], ["artifacts", ["name", "kind", "note"]], ["quotes", ["text", "speaker"]], ["key_frames", ["file", "caption"]]] as const) {
    if (!Array.isArray(r[k])) { e.push(`${k}: must be an array`); continue; }
    r[k].forEach((x: any, i: number) => need.forEach((n) => { if (typeof x?.[n] !== "string" || !x[n]) e.push(`${k}[${i}].${n}: missing`); }));
  }
  (r.artifacts ?? []).forEach?.((a: any, i: number) => { if (!KINDS.has(a.kind)) e.push(`artifacts[${i}].kind: ${a.kind}`); });
  const framesDir = join(ROOT, "corpus", stem, "frames");
  const hasFrames = existsSync(framesDir) && readdirSync(framesDir).length > 0;
  if (Array.isArray(r.key_frames)) {
    if (hasFrames && r.key_frames.length < 1) e.push("key_frames: none chosen though frames exist");
    for (const f of r.key_frames) if (f?.file && !existsSync(join(framesDir, f.file)) && !existsSync(join(ROOT, "site", "img", `${r.nn}-${f.file}`))) e.push(`key_frames: ${f.file} not in frames/ or the site archive`);
  }
  if (typeof r.signal?.score !== "number" || r.signal.score < 1 || r.signal.score > 5 || !r.signal.reason) e.push("signal: need {score 1-5, reason}");
  return e;
}

const args = process.argv.slice(2);
const files = args[0] === "--all"
  ? readdirSync(join(ROOT, "extractions")).filter((f) => f.endsWith(".json")).sort().map((f) => join(ROOT, "extractions", f))
  : args;
if (files.length === 0) { console.log("usage: bun validate.ts <file.json>... | --all"); process.exit(2); }
let bad = 0;
for (const f of files) {
  const errs = check(f);
  if (errs.length) { bad++; console.log(`FAIL ${basename(f)}\n  - ${errs.join("\n  - ")}`); }
  else console.log(`ok   ${basename(f)}`);
}
console.log(`${files.length - bad}/${files.length} valid`);
process.exit(bad ? 1 : 0);
