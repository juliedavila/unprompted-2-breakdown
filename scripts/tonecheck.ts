// Pre-publish check: judgment fields must describe the talk, never the speaker's motive or competence.
// Usage: bun tonecheck.ts   (exit 1 when any record trips a term)
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
const ROOT = dirname(Bun.main);
const TERMS = /\b(self-serving|sales pitch|vendor pitch|a pitch|pitch(es|ed)? (for|from)|marketing (talk|claim|exercise|material)|hype[sd]?|positioning|spin|overs(ell|old|elling)|overclaim\w*|oversta\w+|padd(ed|ing)|sloppy|naive(ly)?|lazy|misleading|dishonest|disingenuous|cherry-?pick\w*|thin(ly)?|weak(ly)?|fluff|little value|vendor-flavored|self-promot\w+|buzzword\w*|hand-?wav\w+|admits?|admitted|insists?|insisted|concedes?|interrupting|hobby|boasts?|brags?|merely|meta\.json|key_frames|the extractor|the validator|the brief)\b|\bt\d{5}\.jpg|(^|[.;] )I (used|recorded|could|did|left|kept)\b/i;
const fields = (r: any): [string, string][] => [
  ...(r.critique ?? []).map((x: string, i: number) => [`critique[${i}]`, x] as [string, string]),
  ["signal.reason", r.signal?.reason ?? ""], ["summary", r.summary ?? ""], ["thesis", r.thesis ?? ""],
  ...(r.takeaways ?? []).map((x: string, i: number) => [`takeaways[${i}]`, x] as [string, string]),
  ...(r.caveats ?? []).map((x: string, i: number) => [`caveats[${i}]`, x] as [string, string]),
  ...(r.key_frames ?? []).map((k: any, i: number) => [`key_frames[${i}]`, k.caption] as [string, string]),
  ...(r.claims ?? []).map((c: any, i: number) => [`claims[${i}].evidence`, c.evidence] as [string, string]),
];
let hits = 0;
for (const f of readdirSync(join(ROOT, "extractions")).filter((f) => f.endsWith(".json")).sort()) {
  const r = JSON.parse(readFileSync(join(ROOT, "extractions", f), "utf8"));
  for (const [name, text] of fields(r)) { const m = text.match(TERMS); if (m) { hits++; const i = m.index!; console.log(`${r.nn} ${name}: "${m[0]}" … ${text.slice(Math.max(0, i - 60), i + 70).replace(/\s+/g, " ")}`); } }
}
console.log(`${hits} flagged`);
process.exit(hits ? 1 : 0);
