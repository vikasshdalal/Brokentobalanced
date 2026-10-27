# Broken to Balanced — complete review production

This is a local, unpublished review package. All 180 supplied six-slide carousels are represented. The plain-text name “Broken to Balanced” is the permitted provisional footer because no approved original logo binary exists in the selected project. It is not an invented replacement mark.

Open `review/index.html` for offline browsing, filters, exact captions, accessibility text, and links to every slide and editable source. `review/posts/BTB-001.html` through `BTB-180.html` show all six slides in order. The PNG review interface works without the fonts or any remote service. Directly opening editable slide HTML requires the exact fonts to be installed; otherwise use the local renderer server below, which serves runtime fonts.

## Deliverables and approval gates

- 180 post directories, containing 1,080 carousel PNGs at 1080×1350, 1,080 editable HTML slides, 180 exact caption files, and 180 alt-text JSON sets containing all 1,080 supplied alternatives.
- 180 per-post manifests, a root run manifest, per-slide QA records and aggregate reports, 180 post review pages, six cover contact sheets and 18 sheets covering every slide.
- No actual performance results have been added. Editorial dates and stable IDs are preserved. Dates are planning metadata only and do not appear on artwork.
- All posts require owner editorial approval. The twelve founder posts retain their supplied attestation flags. Automated QA and agent visual inspection do not grant either approval.
- Final brand approval remains blocked by the missing original approved logo. Exact Playfair Display and Inter were loaded and verified during rendering. Font binaries are deliberately absent from this package.

See `qa/blockers.json`, `qa/manual-review.md`, `qa/independent-visual-review.json`, and `qa/production-summary.json` for the actual verification evidence and review limits. `qa/independent-assets-audit.json` records the initial absence of exact local fonts and their subsequent resolution through the pinned OFL runtime source.

## Reproduce with the recorded runtime

Commands below are run from the project root. They work with the bundled Node runtime on this workstation. `renderer/run.sh` also supports `BTB_NODE`, `BTB_NODE_MODULES`, and `BTB_BROWSER` overrides on another machine. Dependency versions and browser version are recorded in `renderer/runtime-lock.json`; package versions are pinned in `renderer/package.json`. Do not ship dependencies or font binaries in a deliverable archive.

```sh
python3 output/btb-180-day-v1/renderer/prepare_fonts.py
sh output/btb-180-day-v1/renderer/run.sh validate:content
sh output/btb-180-day-v1/renderer/run.sh render:sample
sh output/btb-180-day-v1/renderer/run.sh render:all
sh output/btb-180-day-v1/renderer/run.sh qa:visuals
sh output/btb-180-day-v1/renderer/run.sh build:review
sh output/btb-180-day-v1/renderer/run.sh qa:review
sh output/btb-180-day-v1/renderer/run.sh package:exports
```

From an extracted archive, run the same commands as `sh renderer/run.sh <command>` inside the extracted package directory. `python3 renderer/prepare_fonts.py` reuses matching temporary files or downloads only the two pinned font dependencies from Google's official font repository. It sends no project content. Both use SIL Open Font License 1.1. URLs, checksums, source commit and license text are in `renderer/licenses/`. Set `BTB_HEADING_FONT` and `BTB_BODY_FONT` if the runtime font paths differ. No font is silently substituted; missing or mismatched exact runtime files stop rendering.

To serve editable sources and the review interface locally:

```sh
sh output/btb-180-day-v1/renderer/run.sh serve
```

Open `http://127.0.0.1:8000/review/index.html`. Stop the server with Ctrl-C. It binds only to loopback. It contains no upload, scheduling, account login, analytics or publishing capability. For independent source-package QA on the original project: `python3 output/btb-180-day-v1/renderer/independent_audit.py`.

## Rendering and QA contract

`renderer/input/BTB_180_Day_Content.json` is a byte-identical snapshot of the authoritative source. The canonical file in the project is unchanged. No text rewriting, extra slides or metadata dates were introduced. Text is escaped into editable DOM nodes, not drawn by an image model. Captions equal `caption_ready_to_copy` without an added newline; alt text preserves the six supplied values and order.

The layout uses 92px side margins, 88px top label position, main text inside a fixed region, restrained decorative rules, and a consistent footer. Cover type starts at 92px; body at 62px. Deterministic adjustments within 76–92px for covers and 54–62px for body avoid isolated final words without changing copy. Main text uses only the charcoal/off-white pair. Exact sRGB contrast is calculated from the rendered colours. Each browser page waits for font loading; Chrome's actual platform-font report verifies the family used for the copy. Font cmap coverage is checked independently.

`render:all` checks source hashes before work, records exact DOM text and character bounds, detects overlap/clipping, renders at device scale 1 in sRGB, and writes a checkpoint after each completed post. Matching PNG hashes and render keys permit reuse; it still rechecks DOM geometry and text. A slide is tried at most twice; a failure records its ID and diagnostics. A rerun resumes valid unchanged outputs. Artwork has no timestamp, animation or random state.

`qa:visuals` decodes every PNG, checks its exact dimensions, colour space, output hash, editable-source hash, canonical text, captions, alternatives, geometry and font evidence. `qa:review` verifies actual local links and browser controls. `package:exports` repeats applicable checks and writes the relative-path ZIP and a sibling archive-integrity JSON. It excludes font binaries, caches and dependency directories. The archive includes `file-inventory.json` with per-file hashes; archive checksum is outside the archive to avoid a self-reference.

## Editorial changes and boundaries

The exact input copy and hashes were preserved. `editorial-proposals.md` records whether any changes were proposed. Approved future copy changes must start in canonical JSON, retain stable IDs, recalculate hashes, and regenerate all dependent outputs. Never revise an image alone.

No private case folders were accessed. No publishing, scheduling, spending, messages, account changes, external uploads, deployment or paid generation occurred. Public font dependency downloads and a local loopback review server were the only network-related production operations.
