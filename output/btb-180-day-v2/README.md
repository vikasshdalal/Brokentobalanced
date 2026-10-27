# Broken to Balanced — v2 review production

This is a presentation-only revision of the existing exact-copy package. The original 180-day inputs, IDs, dates, wording, punctuation, captions, safety caveats, copy hashes, approval flags and previous v1 outputs are preserved. No strategy restart or copy revision is part of this output.

Open `review/index.html` for the local offline gallery. Open `proofs/index.html` for actual v1/A/B comparisons, the complete BTB-001 reference, representative layouts, phone previews and crop stress tests. The gallery uses local PNGs and works without fonts or an external service. Clipboard selection is available when normal copying is restricted.

## Presentation changes

Warm ivory (#F3EEE6) is the default practical/reassuring surface, paired with charcoal openings and selected source distinctions. Bronze (#6C5134) carries meaningful accent lettering on ivory; sand (#C2A57B) is meaningful lettering only on charcoal. Each background choice has a recorded reason. The system does not alternate colours by slide number. The BTB-001 reference follows the six explicit v2 directions.

Messages start earlier, typically around y300–350, with exact source-slice sentence blocks and restrained emphasis. Playfair Display and Inter remain the only artwork fonts. A one-line brand signature and folio replace v1's full-width footer rule and stacked brand/handle. `Visual_Design_Overrides_v2.json` records the new tokens and all 1,080 slide decisions without changing Brand_Config.json.

## Scenes and approval gates

No approved local scene assets or verified generation entitlement meeting the no-additional-spend condition were available. No scene was generated or purchased. Requested C posts therefore have complete B fallbacks with their reason recorded. There are zero completed scene-led carousels and no pretend C proof images. The exploratory twelve-post assignment has four requested A, four B and four C; effective assignments are four A/eight B/zero C, so the three-way comparison is not fully prepared. All audience actuals remain null.

The original approved logo binary is still missing. The permitted plain-text “Broken to Balanced” signature is explicitly provisional. All 180 posts require owner editorial approval; the twelve founder-attestation gates remain pending. Production QA and agent visual inspection grant none of those approvals.

## Exact outputs and evidence

Each primary post has six 1080×1350 sRGB PNGs, six editable HTML sources, the exact caption, the six unchanged source accessibility values in `alt-text-source.json`, the same delivery values in `alt-text.json`, and a manifest linking copy hashes, actual font/layout/colour choices, output hashes, treatment/fallback status and approval gates.

Proof PNGs are separate from the target of 1,080 primary PNGs. See `manifest.json`, `proofs/proof-manifest.json`, `qa/production-summary.json`, and `FINAL_REPORT.md` for actual counts and completed checks. `qa/blockers.json` separates current rendering defects from missing assets and owner approvals. `qa/visual-inspection.md` records the actual scope of visual review.

## Reproduction commands

From the project root on this workstation:

```sh
sh output/btb-180-day-v2/renderer/run.sh validate:content
sh output/btb-180-day-v2/renderer/run.sh design:prepare
sh output/btb-180-day-v2/renderer/run.sh render:sample
sh output/btb-180-day-v2/renderer/run.sh proofs:build
sh output/btb-180-day-v2/renderer/run.sh render:all
sh output/btb-180-day-v2/renderer/run.sh qa:visuals
sh output/btb-180-day-v2/renderer/run.sh build:review
sh output/btb-180-day-v2/renderer/run.sh qa:review
sh output/btb-180-day-v2/renderer/run.sh package:exports
```

From an extracted output directory, use `sh renderer/run.sh <command>`. The core renderer is the evolved v1 implementation, retaining its local server, schema/hash validation, pinned dependency/runtime handling, deterministic browser screenshots, resumable output hashes and bounded retries. The new presentation and measurement modules support exact source-span typography. `renderer/runtime-lock.json` records actual Node, browser, library and font versions/hashes. `renderer/package.json` pins the same existing Playwright and Sharp dependencies; no dependency folder is distributed.

Use `BTB_NODE`, `BTB_NODE_MODULES` and `BTB_BROWSER` to point to an equivalent installed runtime. Exact runtime fonts remain outside the package. `python3 renderer/prepare_fonts.py` reuses matching files or fetches only pinned public OFL font dependencies when absent; it sends no project content. Set `BTB_HEADING_FONT` and `BTB_BODY_FONT` when paths differ. License texts and font source provenance are included, but no font binaries. Missing or mismatched exact fonts stop the renderer.

To open editable sources with the pinned fonts, run `sh renderer/run.sh serve`, then visit `http://127.0.0.1:8000/review/index.html`. Direct file viewing of editable HTML may lack the runtime font endpoint; the PNG review gallery itself remains offline-capable. Stop the loopback server with Ctrl-C.

The optional comparison-proof command reads existing v1 PNGs in the sibling `btb-180-day-v1` directory. An extracted v2 archive can rerender all primary v2 outputs without that sibling; the proof builder reuses the supplied actual comparison when the sibling is absent, or regenerates it when the original v1 PNGs are available. It never creates a missing-comparison placeholder. Original-workspace preservation checks report separately when the original workspace is absent.

## Boundaries

No publishing, scheduling, account changes, messages, spending, external uploads, deployment, private-folder access, or performance fabrication is part of this renderer. No image-model lettering, substitute logo, founder documentary scene, synthetic person, new autobiography or rewritten content was introduced.
