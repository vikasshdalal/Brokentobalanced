# Broken to Balanced — production result

Complete review production: **180 carousels, 1,080 PNGs, 1,080 editable HTML slides, 180 exact captions, and 180 accessibility sets containing all 1,080 supplied slide alternatives.** All 180 supplied copy hashes match. The original source JSON and all 16 original handoff files remain unchanged.

All 1,080 PNGs decode successfully, are exactly 1080×1350 in sRGB, and pass text-integrity, layout, clipping, overlap, safe-margin, font and contrast checks. The 5,400 recorded text/background pairs have contrast 15.9638898878:1. No final line is a single isolated word. **Zero current rendering defects.** Historical diagnostics and their repairs are retained separately.

Exact Playfair Display and Inter were loaded; actual browser font use and glyph coverage were verified. Thirteen fresh rerenders across all five layout families and difficult slides matched the exported PNGs byte for byte. Runtime font binaries are outside the deliverables; license texts, pinned URLs, source commit and checksums are included.

Independent agent visual review covered all 180 carousels / 1,080 slides on 18 contact sheets, all 180 covers on six sheets, and 13 selected full-size PNGs. Zero visual defects were observed within that scope. This is preview-scale inspection of the full library plus selected full-size checks, not a claim that every PNG was individually proofread at full size. Automated checks cover every slide.

The offline review interface passed browser checks for all 180 post views at 390px, exact captions and ordered accessibility text, all filters, search, clipboard and fallback, local links, and file-protocol filtering. No horizontal overflow, JavaScript errors, missing HTTP responses or external requests were found.

## Genuine remaining gates

- **Original approved logo is missing.** All exports use the explicitly permitted plain-text “Broken to Balanced” footer and carry `brand_status: provisional_wordmark`. Final brand approval remains blocked.
- **Owner editorial approval is pending for all 180 posts.** Nothing is approved for publication by these tests.
- **Founder attestation is pending for BTB-014, BTB-030, BTB-044, BTB-060, BTB-074, BTB-090, BTB-104, BTB-120, BTB-134, BTB-150, BTB-164 and BTB-180.**

No words were rewritten. IDs, dates, sequence, copy hashes, captions and supplied alternatives were preserved. No substitute logo, autobiography, performance results or private-case details were introduced.

## Outputs and reproduction

Review: `review/index.html`. Archive beside this directory: `../btb-180-day-v1-review.zip`. Machine summary: `qa/production-summary.json`. Archive checksum/CRC evidence is in the sibling `../btb-180-day-v1-archive-integrity.json`. The archive contains a per-file SHA-256 inventory, uses relative paths, and excludes font binaries, dependency directories and caches.

From the extracted package directory, with the recorded runtime and exact font dependencies available:

```sh
python3 renderer/prepare_fonts.py
sh renderer/run.sh validate:content
sh renderer/run.sh render:sample
sh renderer/run.sh render:all
sh renderer/run.sh qa:visuals
sh renderer/run.sh build:review
sh renderer/run.sh qa:review
sh renderer/run.sh package:exports
```

See README.md for workstation commands and runtime overrides. `render:all` preserves valid matching outputs and regenerates affected assets; all 180 posts remain review drafts. Font preparation downloads only pinned public font dependencies when absent and sends no project content.

Real independent subagents performed canonical content QA, logo/font dependency QA and deterministic rerender verification, review-interface QA, and full-library visual contact-sheet inspection. Their reports are included. The primary agent integrated the renderer and outputs and ran the final checks.

**No publishing, scheduling, spending, messages, account changes, external uploads, deployment or private-case-folder access occurred.** Founder attestation, owner approval, clinical/legal sufficiency and audience outcomes are separate from production QA.
