// Figures for the summary section. Each comes in two drawings: one for wide screens and one
// redrawn for a phone, switched by CSS (.fig-wide / .fig-narrow). Numbers come from talk records.

const GRADE_LABEL: Record<string, string> = { measured: "Measured", demo: "Demo", case: "Case", anecdote: "Anecdote", assertion: "Assertion" };
const GRADES = ["measured", "demo", "case", "anecdote", "assertion"];
const CLS: Record<string, string> = { measured: "eb-m", demo: "eb-s", case: "eb-s", anecdote: "eb-u", assertion: "eb-u" };

export function evidenceBar(g: Record<string, number>, total: number): string {
  const pct = (v: number) => Math.round((100 * v) / total);
  // Wide: one stacked bar. Scale: 740 units = all claims.
  const W = 760, u = (W - 20) / total; let x = 10;
  const segs = GRADES.map((k) => { const sw = g[k] * u, cx = x + sw / 2; const out = `<rect class="${CLS[k]}" x="${x.toFixed(1)}" y="12" width="${(sw - 2).toFixed(1)}" height="34"/><text class="c-label" x="${cx.toFixed(1)}" y="68" text-anchor="middle">${GRADE_LABEL[k]}</text><text class="c-tick" x="${cx.toFixed(1)}" y="86" text-anchor="middle">${g[k]} · ${pct(g[k])}%</text>`; x += sw; return out; }).join("");
  // Narrow: five bars from zero. Scale: 190 units = the largest grade.
  const max = Math.max(...GRADES.map((k) => g[k])), nu = 190 / max;
  const rows = GRADES.map((k, i) => { const y = 10 + i * 30; return `<text class="c-label" x="78" y="${y + 14}" text-anchor="end">${GRADE_LABEL[k]}</text><rect class="${CLS[k]}" x="84" y="${y}" width="${(g[k] * nu).toFixed(1)}" height="20"/><text class="c-value" x="${(84 + g[k] * nu + 6).toFixed(1)}" y="${y + 15}">${g[k]} · ${pct(g[k])}%</text>`; }).join("");
  const desc = GRADES.map((k) => `${GRADE_LABEL[k]} ${g[k]}`).join("; ");
  const n = total.toLocaleString("en-US");
  return `<figure><div class="figure-frame">
<svg class="fig-wide" viewBox="0 0 ${W} 96" style="--fig-min: ${W}px" role="img" aria-labelledby="evb-t evb-d" xmlns="http://www.w3.org/2000/svg"><title id="evb-t">All ${n} claims by the evidence shown</title><desc id="evb-d">${desc}.</desc>${segs}</svg>
<svg class="fig-narrow" viewBox="0 0 360 164" style="--fig-min: 300px" role="img" aria-labelledby="evn-t evn-d" xmlns="http://www.w3.org/2000/svg"><title id="evn-t">All ${n} claims by the evidence shown</title><desc id="evn-d">${desc}.</desc>${rows}</svg>
</div><figcaption><strong>Three claims in ten came with the speaker's own measurements, and nearly as many were stated with no evidence shown in the talk.</strong> All ${n} recorded claims, by the evidence the talk showed for each. Measured means the speaker's own data or experiment. A demo was shown working. A case is a specific real incident or deployment. An anecdote is a story without checkable detail. An assertion was stated without support in the talk.</figcaption></figure>`;
}

// Talk 50, results slide at 4:40. [label, percent of attacks through, output tokens per attack]
const CONTROLS: [string, [string, number, number][]][] = [
  ["BASELINE", [["No control", 56.77, 240]]],
  ["ON WHAT THE MODEL READS", [["Input filtering", 56.85, 239], ["Defensive prompting", 56.5, 240]]],
  ["ON THE TEXT IT WROTE", [["Output filtering", 2.15, 216]]],
  ["ON WHAT IT CAN EMIT OR CALL", [["Allow-list gate", 0, 791], ["Grammar-constrained decoding", 0, 208]]],
];

export function controlChart(): string {
  const all = CONTROLS.flatMap(([, r]) => r);
  const desc = all.map(([l, p, t]) => `${l}: ${p.toFixed(2)} percent of attacks through, ${t} output tokens per attack`).join("; ");
  // Wide. Attack bars: x = 214 + percent * 3.9. Token bars: x = 520 + tokens * 0.24, own zero-based scale.
  let y = 30; let wide = `<text class="c-tick" x="214" y="16">Attacks that got through</text><text class="c-tick" x="520" y="16">Output tokens per attack</text>`;
  for (const [group, rows] of CONTROLS) {
    wide += `<text class="d-mark" x="16" y="${y + 14}">${group}</text>`; y += 22;
    wide += `<line class="c-axis" x1="214" y1="${y - 2}" x2="214" y2="${y + rows.length * 28 - 6}"/><line class="c-axis" x1="520" y1="${y - 2}" x2="520" y2="${y + rows.length * 28 - 6}"/>`;
    for (const [label, p, t] of rows) {
      const zero = p === 0, big = t > 400;
      wide += `<text class="c-label" x="206" y="${y + 14}" text-anchor="end">${label}</text><rect class="c-bar${zero ? " focus" : ""}" x="214" y="${y}" width="${Math.max(p * 3.9, 2).toFixed(1)}" height="18"/><text class="c-value" x="${(214 + Math.max(p * 3.9, 2) + 8).toFixed(1)}" y="${y + 14}">${p.toFixed(2)}%</text>`;
      wide += `<rect class="c-bar${big ? " warn" : ""}" x="520" y="${y}" width="${(t * 0.24).toFixed(1)}" height="18"/><text class="c-value" x="${(520 + t * 0.24 + 8).toFixed(1)}" y="${y + 14}">${t}</text>`;
      y += 28;
    }
    y += 6;
  }
  const H = y + 4;
  // Narrow: label on its own line, then the attack bar; tokens as text on the label line.
  let ny = 8; let narrow = "";
  for (const [group, rows] of CONTROLS) {
    narrow += `<text class="d-mark" x="8" y="${ny + 12}">${group}</text>`; ny += 22;
    for (const [label, p, t] of rows) {
      const zero = p === 0, big = t > 400;
      narrow += `<text class="c-label" x="8" y="${ny + 12}">${label}</text><text class="${big ? "c-value" : "c-tick"}" x="352" y="${ny + 12}" text-anchor="end">${t} tokens</text>`;
      narrow += `<rect class="c-bar${zero ? " focus" : ""}" x="8" y="${ny + 18}" width="${Math.max(p * 4.3, 2).toFixed(1)}" height="14"/><text class="c-value" x="${(8 + Math.max(p * 4.3, 2) + 6).toFixed(1)}" y="${ny + 30}">${p.toFixed(2)}%</text>`;
      ny += 46;
    }
    ny += 4;
  }
  return `<figure><div class="figure-frame">
<!-- Scale: attack bar width = percent * 3.9 from x = 214; token bar width = tokens * 0.24 from x = 520. -->
<svg class="fig-wide" viewBox="0 0 760 ${H}" style="--fig-min: 760px" role="img" aria-labelledby="ctl-t ctl-d" xmlns="http://www.w3.org/2000/svg"><title id="ctl-t">Attacks that got through and output tokens per attack, by control</title><desc id="ctl-d">${desc}.</desc>${wide}</svg>
<svg class="fig-narrow" viewBox="0 0 360 ${ny + 2}" style="--fig-min: 300px" role="img" aria-labelledby="ctn-t ctn-d" xmlns="http://www.w3.org/2000/svg"><title id="ctn-t">Attacks that got through and output tokens per attack, by control</title><desc id="ctn-d">${desc}.</desc>${narrow}</svg>
</div><figcaption><strong>Controls on what the model reads left attacks where they started, a filter on what it wrote left about 2%, and two controls on what it can emit or call reached zero, one of them at nearly four times the tokens.</strong> Share of attack trials that succeeded under each control, and output tokens per attack, across about 6 million inference calls on open-weight models. Source: the speaker's results slide, <a href="#talk-50">talk 50</a> at 4:40.</figcaption></figure>`;
}

// Talk 68, phone drawing of the incident path: the same boxes as the wide figure, top to bottom.
export function incidentNarrow(): string {
  const box = (cls: string, x: number, y: number, w: number, a: string, b: string) => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="50" rx="6"/><text class="d-label" x="${x + w / 2}" y="${y + 21}" text-anchor="middle">${a}</text><text class="d-small" x="${x + w / 2}" y="${y + 38}" text-anchor="middle">${b}</text>`;
  const times: [string, string][] = [["12:48pm, 30 Sep", "service discovery"], ["2:36am, 1 Oct", "gateway compromised"], ["4:23am", "Okta super admin"], ["1:44pm", "a person notices"], ["2:39pm", "believed contained"]];
  return `<svg class="fig-narrow" viewBox="0 0 360 498" style="--fig-min: 300px" role="img" aria-labelledby="inn-t" xmlns="http://www.w3.org/2000/svg"><title id="inn-t">The path of the incident in talk 68, top to bottom</title>
<defs><marker id="inn-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>
${box("d-box", 70, 6, 220, "Outside vendor's agent", "scoped to external targets")}
<path class="d-edge focus" d="M180 56 V80" marker-end="url(#inn-arrow)"/>
${box("d-focus", 70, 82, 220, "AI gateway", "management API")}
<text class="d-small" x="180" y="150" text-anchor="middle">its own telemetry was stripped</text>
<path class="d-edge" d="M70 107 H14 V327"/>
<path class="d-edge" d="M14 191 H26" marker-end="url(#inn-arrow)"/><path class="d-edge" d="M14 259 H26" marker-end="url(#inn-arrow)"/><path class="d-edge" d="M14 327 H26" marker-end="url(#inn-arrow)"/>
${box("d-box", 28, 166, 158, "Okta API token", "in an API response")}<path class="d-edge" d="M186 191 H202" marker-end="url(#inn-arrow)"/>${box("d-box", 204, 166, 150, "Okta super admin", "29 client secrets")}
${box("d-box", 28, 234, 158, "Cached OAuth tokens", "every user's tool servers")}
${box("d-box", 28, 302, 158, "Tool server parameter", "runs in the pod's context")}<path class="d-edge" d="M186 327 H202" marker-end="url(#inn-arrow)"/>${box("d-box", 204, 302, 150, "Cluster secrets", "and other pods")}
<line class="c-axis" x1="20" y1="378" x2="20" y2="478"/>
${times.map(([t, w], i) => `<circle class="c-bar${i === 1 || i === 2 ? " focus" : ""}" cx="20" cy="${382 + i * 24}" r="4"/><text class="c-tick" x="34" y="${386 + i * 24}">${t}</text><text class="d-small" x="150" y="${386 + i * 24}">${w}</text>`).join("")}
</svg>`;
}
