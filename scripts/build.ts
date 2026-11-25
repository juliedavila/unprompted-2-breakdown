// Builds site/index.html from extractions/*.json, synthesis.html and gaps.html.
// Images come from crop.ts (run it first when key frames change). Usage: bun build.ts
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = dirname(Bun.main);
const KIT = join(process.env.HOME!, "Projects/html-house-style/html-house-style/base.css");
const SITE = join(ROOT, "site");
mkdirSync(join(SITE, "img"), { recursive: true });

const esc = (s: unknown) => String(s ?? "").replace(/(\d) percent\b/g, "$1%").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const secs = (t: string) => { const [m, s] = (t || "0:00").split(":").map(Number); return (m || 0) * 60 + (s || 0); };
const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

const TAG_LABEL: Record<string, string> = {
  "agent-authz-identity": "Agent identity and authorization", "sandboxing-isolation": "Sandboxing and isolation",
  "prompt-injection": "Prompt injection", "agent-memory-context": "Agent memory and context",
  "coding-agent-security": "Coding agent security", "mcp-tools-skills": "MCP, tools and skills",
  "guardrails-runtime-controls": "Guardrails and runtime controls", "governance-policy": "Governance and policy",
  "ai-soc-detection-response": "AI in the SOC", "vuln-discovery-exploit": "Vulnerability discovery and exploitation",
  "autonomous-offense": "Autonomous offense", "appsec-secure-development": "AppSec and secure development",
  "evals-benchmarks-metrics": "Evals, benchmarks and metrics", "model-internals": "Model internals",
  "supply-chain-model-integrity": "Supply chain and model integrity", "cryptography-formal-methods": "Cryptography and formal methods",
  "privacy-confidential-compute": "Privacy and confidential compute", "threat-intel-in-the-wild": "Threats seen in the wild",
  "fraud-scams-abuse": "Fraud, scams and abuse", "org-adoption-culture": "Adoption and culture", "law-policy-society": "Law, policy and society",
};
const GRADE_LABEL: Record<string, string> = { measured: "Measured", demo: "Demo", case: "Case", anecdote: "Anecdote", assertion: "Assertion" };
const GRADES = ["measured", "demo", "case", "anecdote", "assertion"];
const SIGNAL_WORD: Record<number, string> = { 5: "New result, strong evidence", 4: "Specific and well evidenced", 3: "Useful, lighter on evidence", 2: "Position or overview", 1: "Informal session" };
const KIND_LABEL: Record<string, string> = { tool: "Tools", repo: "Repositories", benchmark: "Benchmarks", dataset: "Datasets", paper: "Papers", standard: "Standards and specifications" };

type Rec = any;
const recs: Rec[] = readdirSync(join(ROOT, "extractions")).filter((f) => f.endsWith(".json")).sort()
  .flatMap((f) => { try { return [JSON.parse(readFileSync(join(ROOT, "extractions", f), "utf8"))]; } catch { console.log("SKIP unparsable " + f); return []; } });

// Affiliations sometimes carry the extractor's note on where the affiliation came from; that note is not for readers.
const PROVENANCE = /\s*\((?=[^)]*\b(stated|slide|said|describes|described|introduced|surname|badge|inferred|own remarks|per the|from his|from her|title slide|no slide)\b)[^)]*\)?/gi;
const aff = (s: string) => (s || "").replace(PROVENANCE, "").replace(/\s+\($/, "").trim();
const who = (r: Rec) => (r.speakers ?? []).map((s: any) => aff(s.affiliation) ? `${s.name} (${aff(s.affiliation)})` : s.name).join(", ");
const whoShort = (r: Rec) => (r.speakers ?? []).map((s: any) => s.name).join(", ");
const tlink = (r: Rec, t: string) => t ? `<a class="ts" href="${esc(r.url)}&amp;t=${secs(t)}s" target="_blank" rel="noopener">${esc(t)}</a>` : "";
const list = (title: string, items: string[]) => items?.length ? `<h4>${title}</h4><ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
const hasImg = (r: Rec, k: any) => existsSync(join(SITE, "img", `${r.nn}-${k.file}`));
const counts = (r: Rec) => Object.fromEntries(GRADES.map((g) => [g, (r.claims ?? []).filter((c: any) => c.grade === g).length])) as Record<string, number>;
const maxClaims = Math.max(...recs.map((r) => (r.claims ?? []).length));

// A small stacked bar: measured | demo + case | anecdote + assertion, on a scale shared by every row.
function miniBar(r: Rec): string {
  const c = counts(r), n = (r.claims ?? []).length, W = 150, u = W / maxClaims;
  const parts = [["m", c.measured], ["s", c.demo + c.case], ["u", c.anecdote + c.assertion]] as const;
  let x = 0; const rects = parts.map(([k, v]) => { const w = v * u; const out = v ? `<rect class="eb-${k}" x="${x.toFixed(1)}" y="2" width="${Math.max(w - 1, 1).toFixed(1)}" height="12"/>` : ""; x += w; return out; }).join("");
  const label = `${n} claims: ${c.measured} measured, ${c.demo + c.case} demo or case, ${c.anecdote + c.assertion} anecdote or assertion`;
  return `<svg class="eb" viewBox="0 0 ${W} 16" width="${W}" height="16" role="img" aria-label="${label}"><title>${label}</title>${rects}</svg>`;
}

function talk(r: Rec): string {
  const sc = r.signal?.score ?? 0;
  const claims = (r.claims ?? []).map((c: any) =>
    `<tr><td>${esc(c.claim)}</td><td>${esc(c.evidence)}</td><td><span class="chip g-${esc(c.grade)}">${GRADE_LABEL[c.grade] ?? esc(c.grade)}</span></td><td class="num">${tlink(r, c.t)}</td></tr>`).join("");
  const numbers = (r.numbers ?? []).map((n: any) => `<tr><th scope="row" class="fig">${esc(n.figure)}</th><td>${esc(n.meaning)}</td><td class="num">${tlink(r, n.t)}</td></tr>`).join("");
  const frames = (r.key_frames ?? []).filter((k: any) => hasImg(r, k)).map((k: any) => { const t = mmss(parseInt(k.file.slice(1), 10)); return `<figure class="slide"><a href="img/${r.nn}-${esc(k.file)}" target="_blank" rel="noopener"><img loading="lazy" src="img/${r.nn}-${esc(k.file)}" alt="Slide at ${t}"></a><figcaption>${esc(k.caption)} ${tlink(r, t)}</figcaption></figure>`; }).join("");
  const frameworks = (r.frameworks ?? []).map((f: any) => `<li><strong>${esc(f.name)}.</strong> ${esc(f.description)}</li>`).join("");
  const artifacts = (r.artifacts ?? []).map((a: any) => `<li><strong>${esc(a.name)}</strong> <span class="chip">${esc(a.kind)}</span> ${esc(a.note)}${a.url ? ` <span class="url">${esc(a.url)}</span>` : ""}</li>`).join("");
  const quotes = (r.quotes ?? []).map((q: any) => `<blockquote><p>${esc(q.text)}</p><footer>${esc(q.speaker)} ${tlink(r, q.t)}</footer></blockquote>`).join("");
  const discount = (r.limits?.length || r.critique?.length) ? `<h4>How far the evidence goes</h4>${r.critique?.length ? `<p class="sub2">This breakdown's assessment</p><ul>${r.critique.map((x: string) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${r.limits?.length ? `<p class="sub2">Limits the speaker acknowledged</p><ul>${r.limits.map((x: string) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}` : "";
  const rest = [
    r.argument?.length ? `<h4>The argument</h4><ol>${r.argument.map((x: string) => `<li>${esc(x)}</li>`).join("")}</ol>` : "",
    frameworks ? `<h4>Frameworks and models</h4><ul>${frameworks}</ul>` : "",
    artifacts ? `<h4>Tools, papers and other artifacts</h4><ul>${artifacts}</ul>` : "",
    list("Attacks and failure modes", r.offense), list("Defenses and controls", r.defense), list("Demos", r.demos),
    list("On the slides, not said aloud", r.slide_only), quotes ? `<h4>Quotes</h4>${quotes}` : "", list("Q&amp;A", r.qa), list("Notes on this record", r.caveats),
  ].join("");
  return `<article class="entry talk" id="talk-${r.nn}" data-nn="${r.nn}">
  <h3><span class="nn">${r.nn}</span> ${esc(r.title)}</h3>
  <p class="byline">${esc(who(r))} · ${esc(r.format)} · ${r.duration_min} min · <a href="${esc(r.url)}" target="_blank" rel="noopener">Watch</a></p>
  <p class="sig"><span class="signal s${sc}" title="Signal ${sc} of 5">${"●".repeat(sc)}${"○".repeat(5 - sc)}</span> <strong>${SIGNAL_WORD[sc] ?? ""}.</strong> ${esc(r.signal?.reason)}</p>
  <p class="answer"><span class="lead">The talk's thesis:</span> ${esc(r.thesis)}</p>
  <p class="tags">${(r.tags ?? []).map((t: string) => `<span class="chip">${esc(TAG_LABEL[t] ?? t)}</span>`).join(" ")}</p>
  <details><summary>Full breakdown: ${(r.claims ?? []).length} claims, ${(r.numbers ?? []).length} numbers, ${(r.key_frames ?? []).filter((k: any) => hasImg(r, k)).length} slides</summary><div class="body">
    <p>${esc(r.summary)}</p>
    ${list("What to do with it (this breakdown's reading)", r.takeaways)}
    ${discount}
    ${claims ? `<h4>Claims and evidence</h4><div class="table-wrap"><table><thead><tr><th scope="col">Claim</th><th scope="col">Evidence shown</th><th scope="col">Grade</th><th scope="col">At</th></tr></thead><tbody>${claims}</tbody></table></div>` : ""}
    ${frames ? `<h4>Key slides</h4><div class="slides">${frames}</div>` : ""}
    ${numbers ? `<h4>Numbers</h4><div class="table-wrap"><table><thead><tr><th scope="col">Figure</th><th scope="col">What it measures</th><th scope="col">At</th></tr></thead><tbody>${numbers}</tbody></table></div>` : ""}
    ${rest ? `<details class="record"><summary>The full record: argument, frameworks, tools, attacks, defenses, demos, quotes, Q&amp;A, caveats</summary><div class="body">${rest}</div></details>` : ""}
  </div></details>
</article>`;
}

// Filter attributes shared by an index row and its entry.
const fattrs = (r: Rec) => { const search = [r.title, who(r), r.thesis, r.summary, ...(r.tags ?? []), ...(r.artifacts ?? []).map((a: any) => a.name), ...(r.frameworks ?? []).map((f: any) => f.name)].join(" ").toLowerCase(); return `data-signal="${r.signal?.score ?? 0}" data-tags="${esc((r.tags ?? []).join(" "))}" data-search="${esc(search)}"`; };

const indexRows = recs.map((r) => { const c = counts(r), n = (r.claims ?? []).length, sc = r.signal?.score ?? 0;
  return `<tr class="irow" data-nn="${r.nn}" data-min="${r.duration_min}" data-sig="${sc}" data-measured="${n ? (c.measured / n).toFixed(3) : 0}" data-title="${esc(r.title.toLowerCase())}" ${fattrs(r)}><td class="num">${r.nn}</td><th scope="row"><a href="#talk-${r.nn}">${esc(r.title)}</a><br><span class="sub">${esc(whoShort(r))}</span></th><td class="num">${r.duration_min}</td><td><span class="signal s${sc}" title="Signal ${sc} of 5: ${SIGNAL_WORD[sc]}">${"●".repeat(sc)}${"○".repeat(5 - sc)}</span></td><td>${miniBar(r)}</td></tr>`; }).join("");

// Tools and papers: grouped by kind, duplicate names merged.
const byKind = new Map<string, Map<string, { name: string; notes: string[]; url: string; talks: string[] }>>();
for (const r of recs) for (const a of r.artifacts ?? []) {
  if (!KIND_LABEL[a.kind]) continue;
  const g = byKind.get(a.kind) ?? byKind.set(a.kind, new Map()).get(a.kind)!;
  const key = a.name.toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").trim();
  const e = g.get(key) ?? g.set(key, { name: a.name, notes: [], url: "", talks: [] }).get(key)!;
  if (!e.notes.length) e.notes.push(a.note); if (a.url && !e.url) e.url = a.url; if (!e.talks.includes(r.nn)) e.talks.push(r.nn);
}
let artCount = 0;
const artGroups = Object.keys(KIND_LABEL).filter((k) => byKind.has(k)).map((k) => { const items = [...byKind.get(k)!.values()].sort((a, b) => a.name.localeCompare(b.name)); artCount += items.length;
  return `<details class="kind"><summary>${KIND_LABEL[k]} (${items.length})</summary><div class="body"><div class="table-wrap"><table><thead><tr><th scope="col">Name</th><th scope="col">What it is, as the talk used it</th><th scope="col">Talks</th></tr></thead><tbody>${items.map((e) => `<tr><th scope="row">${esc(e.name)}</th><td>${esc(e.notes[0])}${e.url ? ` <span class="url">${esc(e.url)}</span>` : ""}</td><td class="talkrefs">${e.talks.map((t) => `<a href="#talk-${t}">${t}</a>`).join(" ")}</td></tr>`).join("")}</tbody></table></div></div></details>`; }).join("");

const tagCounts = new Map<string, number>();
for (const r of recs) for (const t of r.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
const tagChips = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `<button type="button" data-tag="${t}" aria-pressed="false">${esc(TAG_LABEL[t] ?? t)} <span class="n">${n}</span></button>`).join("");

// Corpus statistics, substituted into synthesis.html so the page's totals cannot drift from the records.
const cl = recs.flatMap((r) => r.claims ?? []), nCl = cl.length;
const g = Object.fromEntries(GRADES.map((k) => [k, cl.filter((c: any) => c.grade === k).length])) as Record<string, number>;
const pct = (v: number) => Math.round(100 * v / nCl);
const noM = recs.filter((r) => r.format === "talk" && !(r.claims ?? []).some((c: any) => c.grade === "measured")).length;
const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen"];
const top = recs.filter((r) => (r.signal?.score ?? 0) >= 4).length;
function evidenceBar(): string {
  const W = 760, x0 = 10, w = W - 20, u = w / nCl; let x = x0;
  const cls: Record<string, string> = { measured: "eb-m", demo: "eb-s", case: "eb-s", anecdote: "eb-u", assertion: "eb-u" };
  const segs = GRADES.map((k) => { const sw = g[k] * u, cx = x + sw / 2; const out = `<rect class="${cls[k]}" x="${x.toFixed(1)}" y="12" width="${(sw - 2).toFixed(1)}" height="34"/><text class="c-label" x="${cx.toFixed(1)}" y="68" text-anchor="middle">${GRADE_LABEL[k]}</text><text class="c-tick" x="${cx.toFixed(1)}" y="86" text-anchor="middle">${g[k]} · ${pct(g[k])}%</text>`; x += sw; return out; }).join("");
  return `<figure><div class="figure-frame"><svg viewBox="0 0 ${W} 96" style="--fig-min: ${W}px" role="img" aria-labelledby="evb-t evb-d" xmlns="http://www.w3.org/2000/svg"><title id="evb-t">All ${nCl} claims by the evidence shown</title><desc id="evb-d">${GRADES.map((k) => `${GRADE_LABEL[k]} ${g[k]}`).join("; ")}.</desc>${segs}</svg></div><figcaption><strong>Three claims in ten came with the speaker's own measurements, and nearly as many were stated with no evidence shown in the talk.</strong> All ${nCl} recorded claims, by the evidence the talk showed for each. Measured means the speaker's own data or experiment. A case is a specific real incident or deployment. An assertion was stated without support.</figcaption></figure>`;
}
const sub: Record<string, string> = { CLAIMS: String(nCl), SESSIONS: String(recs.length), TOP: String(top), NO_MEASURED: words[noM] ?? String(noM), EVIDENCE_BAR: evidenceBar() };
const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => sub[k] ?? `[missing ${k}]`);

const synthesis = fill(readFileSync(join(ROOT, "synthesis.html"), "utf8"));
const synthToc = [...synthesis.matchAll(/<h2 id="([^"]+)"[^>]*>(.*?)<\/h2>/g)].map((m) => `<li><a href="#${m[1]}">${m[2].replace(/<[^>]+>/g, "")}</a></li>`).join("");
const gaps = fill(readFileSync(join(ROOT, "gaps.html"), "utf8"));
const totalMin = recs.reduce((s, r) => s + (r.duration_min || 0), 0);
const imgCount = recs.reduce((s, r) => s + (r.key_frames ?? []).filter((k: any) => hasImg(r, k)).length, 0);

const css = readFileSync(KIT, "utf8");
const extra = `
.page { padding-left: max(var(--gutter), env(safe-area-inset-left, 0px)); padding-right: max(var(--gutter), env(safe-area-inset-right, 0px)); }
.prose > #talk-list, .prose > .talk, .prose > .kind { max-width: none; }
.talk h3 .nn { font: 600 var(--fs-sm) var(--font-mono); color: var(--fg-subtle); margin-right: var(--s2); }
.talk .byline, .talk .sig, .talk .tags { font: 400 var(--fs-sm)/1.5 var(--font-ui); color: var(--fg-muted); margin-top: var(--s2); }
.talk .sig strong { color: var(--fg); }
.talk .answer { font-size: var(--fs-base); margin-top: var(--s3); }
.talk > details { max-width: none; }
.talk details .body > * { max-width: var(--measure); }
.talk details .body > .table-wrap, .talk details .body > .slides, .talk details .body > details { max-width: none; }
.talk details h4 { font: 650 var(--fs-xs) var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent-2); margin-top: var(--s5); }
.talk .sub2 { font: 600 var(--fs-sm) var(--font-ui); color: var(--fg-muted); margin-top: var(--s3); }
.signal { font-family: var(--font-mono); letter-spacing: 1px; color: var(--accent); white-space: nowrap; }
.signal.s1, .signal.s2 { color: var(--fg-subtle); }
.slides { display: grid; gap: var(--s4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr)); margin-top: var(--s3); }
figure.slide { margin: 0; }
figure.slide img { display: block; width: 100%; height: auto; border: 1px solid var(--hairline); border-radius: var(--radius-sm); background: var(--sunken); }
figure.slide figcaption { font: 400 var(--fs-sm)/1.45 var(--font-ui); color: var(--fg-muted); margin-top: var(--s2); }
a.ts { font-family: var(--font-mono); font-size: var(--fs-xs); white-space: nowrap; }
.url { font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--fg-subtle); overflow-wrap: anywhere; }
th.fig { font-family: var(--font-mono); white-space: normal; min-width: 9ch; }
.sub { font-weight: 400; color: var(--fg-muted); font-size: var(--fs-sm); }
/* Evidence grades: one accent for measured, neutral for shown, the warn tint for unsupported. */
.chip.g-measured { background: var(--accent-bg); color: var(--accent); }
.chip.g-demo, .chip.g-case { background: var(--sunken); color: var(--fg-muted); }
.chip.g-anecdote, .chip.g-assertion { background: var(--warn-bg); color: var(--warn); }
svg .eb-m { fill: var(--accent); } svg .eb-s { fill: var(--fg-subtle); } svg .eb-u { fill: var(--warn); }
svg.eb { display: block; }
.key { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin: 0 4px 0 10px; vertical-align: baseline; }
.key.m { background: var(--accent); } .key.s { background: var(--fg-subtle); } .key.u { background: var(--warn); }
.legend { font: 400 var(--fs-sm)/1.6 var(--font-ui); color: var(--fg-muted); max-width: none; }
.filter .chips button .n { font-weight: 400; color: var(--fg-subtle); margin-left: 2px; }
.filter .chips { flex: 1 1 100%; }
.talk[hidden], .irow[hidden] { display: none; }
.index-wrap { max-height: min(70vh, 640px); overflow-y: auto; }
.index-wrap thead th { position: sticky; top: 0; background: var(--surface); z-index: 1; }
.index-wrap th button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
.index-wrap th button[aria-sort]::after { content: " ▾"; } .index-wrap th button[aria-sort="ascending"]::after { content: " ▴"; }
.talkrefs a { margin-right: 6px; white-space: nowrap; }
details.kind, details.record { margin-top: var(--s4); }
.trail td:nth-child(2) { white-space: normal; min-width: 12ch; }
.talk .answer .lead { font: 600 var(--fs-sm) var(--font-ui); color: var(--fg-muted); }
.lit-h { font: 650 var(--fs-xs) var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent-2); margin-top: var(--s5); }
ul.lit { font: 400 var(--fs-sm)/1.55 var(--font-ui); color: var(--fg-muted); padding-left: 1.1em; }
ul.lit li + li { margin-top: var(--s2); }
ul.lit .venue { color: var(--fg-subtle); }
ul.lit .venue::before { content: "("; } ul.lit .venue::after { content: ")"; }
`;

const html = `<title>[un]prompted 2 Breakdown</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${css}
${extra}
</style>
<div class="page">
  <header class="masthead">
    <div class="kicker">Conference breakdown · [un]prompted 2, October 2026</div>
    <h1>What [un]prompted 2 claimed, and what backed it</h1>
    <p class="dek">Every available session of the AI security practitioner conference, broken down from its recording: the thesis, each claim with the evidence shown, the numbers, the slides and an assessment.</p>
    <div class="meta"><span>${recs.length} sessions</span><span>${Math.round(totalMin / 60)} hours of video</span><span>${nCl} graded claims</span><span>${imgCount} slides</span><span>Records written by an AI model from the recordings, 25 Nov 2026; see <a href="#method">Method</a></span></div>
  </header>
  <main>
    <div class="with-toc">
      <nav class="toc" aria-label="Contents">
        <details open>
          <summary>Contents</summary>
          <ol>
            ${synthToc}
            <li><a href="#talks">Every talk</a></li>
            <li class="annex-start"><a href="#artifacts">Tools, benchmarks and papers named</a></li>
            <li><a href="#method">Method and gaps</a></li>
          </ol>
        </details>
      </nav>
      <div class="prose">
        ${synthesis}

        <h2 id="talks">Every talk</h2>
        <p>The index shows all ${recs.length} sessions on one scale; choose a column heading to sort it. Below it, each talk has an entry with its claims table, slides and assessment. The filters narrow both.</p>
        <div class="filter" role="search" aria-label="Filter the talks">
          <div class="field"><label for="talk-q">Search talks</label><input id="talk-q" type="search" autocomplete="off" placeholder="speaker, tool, topic"></div>
          <div class="field"><label for="talk-sig">Minimum signal</label><select id="talk-sig"><option value="1">Any</option><option value="3">3 and up</option><option value="4">4 and up</option><option value="5">5 only</option></select></div>
          <div class="chips" role="group" aria-label="Topic">${tagChips}</div>
        </div>
        <p class="legend"><strong>Signal</strong> is this breakdown's judgment of the evidence shown, from 5 (a new result with strong evidence) through 4 (specific and well evidenced), 3 (useful, lighter on evidence) and 2 (a position or overview talk) to 1 (an informal session, such as closing remarks or a show-and-tell). It rates how much checkable evidence the recording holds, and says nothing about the speaker or the work beyond the talk. <strong>Evidence bars</strong> count each talk's claims: <span class="key m"></span>measured by the speaker <span class="key s"></span>shown as a demo or a specific case <span class="key u"></span>anecdote or assertion.</p>
        <p class="filter-sentence" id="talk-sentence" aria-live="polite">All ${recs.length} talks</p>
        <p class="filter-empty" id="talk-empty" hidden>No talks match. Clear a filter to see more.</p>
        <div class="table-wrap index-wrap wide"><table id="talk-index">
          <thead><tr><th scope="col"><button type="button" data-sort="nn" aria-sort="ascending">#</button></th><th scope="col"><button type="button" data-sort="title">Talk</button></th><th scope="col"><button type="button" data-sort="min">Min</button></th><th scope="col"><button type="button" data-sort="sig">Signal</button></th><th scope="col"><button type="button" data-sort="measured">Claims, by evidence shown</button></th></tr></thead>
          <tbody>${indexRows}</tbody>
        </table></div>
        <div id="talk-list">
        ${recs.map((r) => talk(r).replace(`data-nn="${r.nn}">`, `data-nn="${r.nn}" ${fattrs(r)}>`)).join("\n")}
        </div>

        <hr class="mark">
        <h2 id="artifacts" class="annex">Tools, benchmarks and papers named</h2>
        <p>The ${artCount} tools, repositories, benchmarks, datasets, papers and standards that speakers released or relied on, as named on slides. The records do not separate what was released at the conference from earlier work a speaker cited, so check the talk. An address appears only where a slide or the speaker gave one.</p>
        ${artGroups}

        <h2 id="method" class="annex">Method and gaps</h2>
        ${gaps}
      </div>
    </div>
  </main>
</div>
<script>
(() => {
  document.documentElement.classList.remove("no-js");
  const talks = [...document.querySelectorAll(".talk")], rows = [...document.querySelectorAll(".irow")], q = document.getElementById("talk-q"), sig = document.getElementById("talk-sig");
  const chips = [...document.querySelectorAll(".filter .chips button")], sentence = document.getElementById("talk-sentence"), empty = document.getElementById("talk-empty");
  let tag = "";
  function apply() {
    const words = q.value.toLowerCase().trim().split(/\\s+/).filter(Boolean), min = +sig.value; let n = 0;
    const ok = (t) => +t.dataset.signal >= min && (!tag || t.dataset.tags.split(" ").includes(tag)) && words.every((w) => t.dataset.search.includes(w));
    for (const t of talks) { const v = ok(t); t.hidden = !v; if (v) n++; }
    for (const r of rows) r.hidden = !ok(r);
    const parts = []; if (tag) parts.push(chips.find((c) => c.dataset.tag === tag).firstChild.textContent.trim());
    if (min > 1) parts.push("signal " + min + " and up"); if (words.length) parts.push('matching "' + q.value.trim() + '"');
    sentence.textContent = parts.length ? n + " of " + talks.length + " talks: " + parts.join(", ") : "All " + talks.length + " talks";
    empty.hidden = n > 0;
  }
  function clear() { tag = ""; q.value = ""; sig.value = "1"; chips.forEach((x) => x.setAttribute("aria-pressed", "false")); apply(); }
  chips.forEach((c) => c.addEventListener("click", () => { tag = tag === c.dataset.tag ? "" : c.dataset.tag; chips.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.tag === tag))); apply(); }));
  q.addEventListener("input", apply); sig.addEventListener("change", apply);
  function reveal() { const id = location.hash.slice(1); const el = id && document.getElementById(id); if (el && el.classList.contains("talk") && el.hidden) { clear(); el.scrollIntoView(); } }
  addEventListener("hashchange", reveal); reveal();
  const tbody = document.querySelector("#talk-index tbody"), sorters = [...document.querySelectorAll("#talk-index th button")];
  sorters.forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.sort, text = k === "title" || k === "nn", was = b.getAttribute("aria-sort");
    const dir = was ? (was === "ascending" ? -1 : 1) : (text ? 1 : -1);
    sorters.forEach((x) => x.removeAttribute("aria-sort")); b.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
    [...tbody.children].sort((a, c) => dir * (text ? a.dataset[k].localeCompare(c.dataset[k]) : (+a.dataset[k] - +c.dataset[k]) || a.dataset.nn.localeCompare(c.dataset.nn))).forEach((r) => tbody.appendChild(r));
  }));
  const links = [...document.querySelectorAll(".toc a")], secs = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) links.forEach((a) => a.getAttribute("href") === "#" + e.target.id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")); }, { rootMargin: "0px 0px -70% 0px" }); secs.forEach((s) => io.observe(s)); }
})();
</script>
`;
writeFileSync(join(SITE, "index.html"), html);
// A standalone copy for static hosting (GitHub Pages): same content with a document wrapper.
{
  const i = html.indexOf('<div class="page">');
  const head = html.slice(0, i).replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "");
  const pages = join(ROOT, "pages"); mkdirSync(pages, { recursive: true });
  writeFileSync(join(pages, "index.html"), '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="description" content="Every available session of [un]prompted 2 (October 2026), broken down from its recording: thesis, claims graded by the evidence shown, numbers, slides and an assessment.">\n' + head + '</head>\n<body class="doc">\n' + html.slice(i) + '</body>\n</html>\n');
}
console.log(`built ${recs.length} talks, ${imgCount} images, ${(html.length / 1024).toFixed(0)} KB html, ${top} scored 4+, ${artCount} artifacts, ${nCl} claims`, JSON.stringify(g));
