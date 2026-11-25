# [un]prompted 2 Breakdown

A talk-by-talk breakdown of [un]prompted 2, the AI security practitioner conference held 27 to 29 October 2026 in San Francisco, built from the conference's public recordings.

**Read it:** https://juliedavila.github.io/unprompted-2-breakdown/

For each of 87 sessions the page gives the thesis, each claim with the evidence the talk showed for it, the numbers, key slides, and an assessment of how far the evidence goes. A summary at the top reads across the talks: where speakers converged, where they disagreed, and where the evidence was thin.

## What this is and is not

This is a secondary source. It reports what speakers said and showed, and it has not been reviewed by the speakers or the organizers. Watch the talk before relying on a record; every claim links to its moment in the video.

The records were written by an AI model (Anthropic's Claude) from each talk's automatic captions and slide frames, then checked by script for completeness. No person reviewed each record before publication, so expect errors in individual records. The figures the summary relies on were checked a second time by the same AI system against the transcript or the slide. No talk's claims were checked against outside sources; the summary's notes on published research come from an Elicit literature search read at abstract level. The page's Method section has the detail and the known gaps.

## Corrections

If a record misstates your talk or your work, [open an issue](https://github.com/juliedavila/unprompted-2-breakdown/issues). It will be fixed, or the record removed if you prefer.

## What is in the repository

| Path | What it is |
|---|---|
| `index.html`, `img/` | The published page and its slide excerpts |
| `data/extractions/` | One JSON record per talk, the page's source of truth |
| `data/synthesis.html`, `data/gaps.html` | The summary and method text, drafted with Claude and edited after review |
| `scripts/` | The extraction brief given to the model, the two wording briefs, the validator, the tone check, and the page builder |

The builder inlines a stylesheet from [html-house-style](https://github.com/juliedavila/html-house-style) and expects it beside this repository.

## License

The written breakdown and the data are released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The scripts are MIT. See `LICENSE`.

Neither license covers the slide images or the talks. Those belong to their speakers and appear here as excerpts for commentary, each linked to its place in the recording. A speaker who wants their slides removed can open an issue.

## Rebuilding

The scripts are published as a record of method. They were run from a working folder that also held the transcripts and video frames, which are not redistributed here, so paths in them assume that layout (`extractions/`, `synthesis.html` and `gaps.html` at the root, frames under `corpus/`).
