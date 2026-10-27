# Broken to Balanced — Codex visual-production prompt v2
## Editorial warmth, deliberate typography, and selective visual storytelling

**Revision:** 2.0 · **Prepared:** 27 October 2026  
**Use:** Execute this prompt inside the existing Broken to Balanced project with the original 180-day package available. This is a replacement production brief, not a new content strategy. It does not claim that any revised images already exist.

---

# EXECUTION PROMPT

## 1. Mission: redesign the presentation, not the story

Act as the production designer and implementation owner for Broken to Balanced. Refine the existing carousel renderer and produce the complete supplied content library using the visual system below.

The output is **180 original, six-slide, text-first Instagram carousels: 1,080 primary PNGs at 1080 × 1350 pixels**, with editable sources, exact captions, accessibility text, a local review gallery, and verifiable QA. Additional comparison proofs are separate and must not inflate that production count.

The design must feel emotionally perceptive, grounded, warm, and recognisably consistent. It must not feel like either a corporate report or a generic AI motivational page.

The existing drafts have worthwhile foundations: charcoal, restrained gold, readable text, a serif cover, and a calm voice. Fix their weaknesses: an excessive empty gap above the message, repetitive centred-in-the-page paragraphs, weak variation between slide roles, and an over-formal footer. Do not eliminate all whitespace or fill space with decoration.

**Creative decision:** retain the established brand; add a warm-paper treatment, improve hierarchy and semantic line breaks, and use occasional relevant scenes only when they add meaning. Do not create a different background scene for every sentence. All slides remain text-first; scenes are optional supporting illustrations, not a shift to image-led storytelling.

Keep the existing audience and editorial goals: men and fathers rebuilding after separation, divorce, relationship difficulty, and major setbacks; emotionally honest recognition plus a useful next step; growth through relevance and usefulness, without blame or performed recovery. The million-follower ambition is not a forecast, production guarantee, or design acceptance test.

Do not produce Reels, podcasts, a new website, new copy, ads, or a different strategy. Do not publish or schedule anything.

## 2. Locate the inputs and apply the revision safely

Read applicable project `AGENTS.md` instructions. Inspect only the selected project and its supplied package. Locate these files rather than assuming a machine-specific path:

- `BTB_180_Day_Content.json`
- `Brand_Config.json`
- `Strategy_and_Editorial_Boundaries.md`
- `Source_and_Validation_Register.md`
- `QA_Content_Report.json`
- The original `Codex_Visual_Production_Prompt.md`, package README, and any existing renderer.

Read the source data and policies before implementing. Prefer improving an existing working renderer over creating a competing application.

This owner-requested v2 replaces the earlier **presentation instructions** where necessary: the blanket ban on imagery, the exclusive reliance on flat text layouts, and the old broad spacing guidance. It does not override privacy, permission, exact-copy, approval, or project-security boundaries. If a higher-priority project restriction prevents scene generation, complete the text-based work and disclose that limitation; do not bypass the restriction.

Do not edit or replace the original input package. Create a versioned output directory such as `output/btb-180-day-v2/`. Preserve existing approved artwork and unrelated changes. Record input file hashes, selected asset paths, renderer version, and effective configuration.

Keep `Brand_Config.json` unchanged. Create a separate `Visual_Design_Overrides_v2.json` for the new presentation tokens and slide decisions. Existing per-post `layout` remains a semantic input. A legacy `visual_brief` saying “no imagery” does not prevent an optional scene under this v2, but its storytelling, privacy, and safety constraints remain binding. Record this limited override explicitly.

## 3. Permission and authenticity boundaries

Use only the sanitised package for editorial content. Do not search Legal, Personal, health, family-court, private-message, or unrelated folders. Do not add names, incidents, financial amounts, legal conclusions, quotations from correspondence, or new autobiography.

No publishing, scheduling, social-account access, outreach, live-site changes, deployment, purchases, paid model/API calls, new API keys, or remote Git pushes. Do not upload source packages, private files, or project data to external services. Use existing permitted project tooling; obey environment permissions for any dependency installation.

Optional background generation is permitted only through an actually available, project-permitted native capability that does not require additional spend, billable credits, new credentials, or uploading protected material. Send only a minimal, non-sensitive design brief. Do not assume a subscription makes every image service free. When access, cost, or permission is uncertain, use approved local assets or a text-only fallback and record the missing scene capability.

No fictional founder, synthetic children, invented testimonials, fake evidence, or scenes presented as documentary moments from the owner's life. Do not turn distress into sensational imagery or clinical claims. Preserve all existing safety caveats in the writing.

Retain the twelve founder-attestation gates and owner editorial approval requirements. Rendering a post is not approving it for publication.

## 4. Exact-copy contract

`BTB_180_Day_Content.json` is the authoritative source. Preserve its bytes and all post IDs, dates, slide order, words, punctuation, capitalisation, apostrophes, captions, hashtags, and approval metadata.

Expected inputs:

- IDs `BTB-001` through `BTB-180`, six slides each.
- Editorial slots 28 October 2026 through 25 April 2027, America/Toronto. These are planning dates, not publishing instructions.
- P1/P2/P5: 36 posts each; P3/P4: 30 each; P6: 12.
- Layout families: editorial, contrast, script, checklist, and letter.
- The exact caption export is each post's `caption_ready_to_copy`.

Recalculate `copy_sha256` using the original contract: join the six exact slide texts with `\n`, append `\n` and the exact `caption`, then SHA-256 the UTF-8 bytes. Verify every supplied hash before and after production.

**Allowed:** line wrapping, paragraph spacing, type weight, colour, block placement, and emphasis applied to exact source substrings.

**Not allowed:** rewritten hooks, shorter copy to fit, changed punctuation, smart-quote substitution, added promises, invented headings, reordered sentences, deleted caveats, extra CTAs, additional slides, or new list numbering that implies source-authored steps.

Series labels, the verified brand identity, and slide folios are separate design metadata. They must not be confused with source copy. Do not add “SWIPE,” slogans, dates, or other decorative wording unless already approved in the supplied content.

For styled fragments, use exact character ranges or string slices into the canonical text. Preserve all characters and spaces when fragments are concatenated. Do not verify a hidden copy of the text while rendering altered visible text. Check the actual visible copy nodes and their geometry. Visual line breaks may change layout, not wording or reading order.

## 5. Brand continuity and visual tokens

Retain the brand name **Broken to Balanced**, the project-supplied handle **@brokentobalanced**, **Playfair Display** for editorial headlines, and **Inter** for supporting and body text. Using the supplied handle does not certify current account ownership.

Locate and verify the original approved logo within the project's brand assets. Do not redraw the cracked-B concept, create a new monogram, or call a text substitute the approved logo. A plain-text brand signature is acceptable for review outputs when the asset is missing; retain `brand_status: provisional_wordmark` and the approval gate.

Use this palette. The added colours are v2 implementation tokens, not claims that the original brand guide already contained them:

| Token | Value | Use |
|---|---|---|
| charcoal | `#1A1A1A` | Core dark background; main text on light slides |
| off_white | `#F5F5F5` | Main text on charcoal; existing neutral |
| warm_ivory_v2 | `#F3EEE6` | New warm-paper background |
| warm_sand | `#C2A57B` | Existing gold/sand accent; text on charcoal; decoration on ivory |
| bronze_text_v2 | `#6C5134` | Dark accent text on ivory; accessible counterpart to sand |
| deep_blue | `#2F4F6F` | Existing occasional accent; not a new dominant identity |
| muted_olive | `#6E7F5F` | Existing restrained decoration; not default text |
| dark_secondary_v2 | `#BDB5AA` | Secondary lettering on charcoal |
| light_secondary_v2 | `#59534B` | Secondary lettering on ivory |

Main combinations: off-white on charcoal; charcoal on warm ivory. Gold is an accent, not a full-page shiny effect. Do not use bright yellow, neon, rainbow palettes, metallic effects, luxury black-and-gold ornamentation, or a new colour for every pillar.

Use **at least 4.5:1 contrast for all meaningful text**, including metadata and CTAs, as this project's conservative design requirement. Compute actual pairs and effective composited backgrounds rather than assuming a token is accessible. Approximate solid-pair checks to verify during implementation:

- Off-white / charcoal: 15.96:1.
- Charcoal / ivory: 15.07:1.
- Sand / charcoal: 7.43:1.
- Sand / ivory: only 2.03:1 — do not use for meaningful lettering.
- Bronze / ivory: 6.35:1.
- Olive / ivory: only 3.74:1 — do not use for meaningful lettering.

Use sand rules on ivory only as nonessential decoration. No meaning should depend on colour alone.

## 6. Typography: specific, expressive, and readable

Use the approved font families, loaded and verified before rendering. Do not silently substitute fonts in a final-brand export. Diagnostic fallback previews may proceed with explicit status. Do not distribute font binaries in deliverables.

At a 1080 × 1350 canvas, use these starting ranges and then inspect actual line measurements:

| Role | Typeface | Size | Weight | Line height |
|---|---|---|---|---|
| Cover hook | Playfair Display | 84–104 px target; 72–112 px permitted | Available 500–600 | 1.08–1.16 |
| Short interior insight | Playfair Display or Inter | 66–84 px | Available 500–600 | 1.12–1.24 |
| Body | Inter | 54–62 px target; 50–66 px permitted | 400–500 | 1.28–1.40 |
| Existing script/example | Inter | 54–64 px | 450–500 if available, otherwise an available weight | 1.28–1.40 |
| Closing action/CTA | Inter | 48–56 px | 400–500 | 1.25–1.38 |
| Series, footer, folio | Inter | 28–30 px | 400–500 | 1.20–1.35 |

Do not use synthetic font weights. Confirm the actual installed faces or variable font axes. Avoid ultra-thin body text, artificial condensed type, stretched text, dense all-caps paragraphs, and ornamental scripts.

Keep long cover hooks at least 72 px by using more lines and the available vertical area. The main body has a 48 px absolute floor, not a target. If content still fails at the floor, change its composition and available space; do not crop it or rewrite it. Report an unresolved exception instead of silently breaking the rule.

Use left alignment by default. A short closing statement may be centred when it improves the composition, but do not centre every paragraph vertically.

Line breaks must follow meaning. Keep a possessive with the concept it modifies when it fits. Avoid isolating “Your” above a long remainder or leaving “and” alone. Do not hyphenate “responsibilities” simply to force a preset layout. Prefer a complete clause per block over arbitrary wrapping.

One emphasis target per slide is normally enough: a phrase, a distinction, or a key action. Use weight, size, spacing, or colour purposefully; do not apply all four to every sentence. Emphasis must preserve negation and caveats. Highlighting “does not mean” as part of its phrase is safer than visually isolating “mean.”

Use sentence case. Keep Playfair for editorial emphasis, not every long body paragraph. The design must be readable at a 390 px-wide phone preview; test at 360 px as well. These previews are inspection sizes, not proof of universal device accessibility.

## 7. Composition: remove dead space, retain breathing room

Canvas: **1080 × 1350 px, 4:5, PNG, sRGB**. These are project output specifications, not claims about the only supported Instagram size.

Use an approximately 92 px horizontal margin and 88 px top/bottom margin. Main text typically fits within the 896 px-wide central column; narrower blocks are allowed when they improve line length.

Suggested vertical zones, adjustable through measured layout rather than blindly fixed:

- Series/header: roughly y = 88–165.
- Main editorial message: roughly y = 260–1090.
- Quiet footer: roughly y = 1190–1262.

For most covers and body slides, start the main message between approximately y = 280 and 380. Do not reproduce the existing long empty gap down to about the middle of the canvas. Short text can have more breathing room; make that an optical decision, not a template accident. Never stretch type or add content merely to fill a short slide.

For long text, allow the main region to start slightly earlier while keeping the header separate. Use sentence spacing and a clear reading path rather than shrinking fonts. Keep text, emphasis, decoration, and footer from colliding.

Reduce the footer to a quiet signature, normally the verified small mark or one plain-text brand line, the handle where appropriate, and `1 / 6` through `6 / 6`. Do not always stack a large brand name above a second equally large handle. A full-width horizontal rule is optional, not a requirement. No double borders or report-page ornament.

Preview possible square and 3:4 crops as stress tests, not assertions about a current platform UI. Keep the hook intelligible within a conservative central area where practical; do not shrink a full 4:5 composition into a tiny box to make every footer survive every crop.

## 8. Three visual treatments, one identity

Treatments control the surface and atmosphere. Existing layout families control the organisation of the message. Keep them separate in the render model.

### A — Dark editorial

A charcoal-led carousel with off-white type and limited sand accents. Use for difficult truths, concise contrasts, and strong emotional openings.

Vary hierarchy, sentence grouping, and composition within the carousel. “Dark editorial” does not mean six identical central text blocks. Use the existing semantic layout where appropriate: contrast, script, checklist, or letter.

Do not pretend all darkness is meaningful depth. Use this treatment because the copy benefits from restraint, not because every difficult topic must look bleak.

### B — Warm editorial / warm-paper system

The default production treatment. Combine charcoal openings or insight slides with warm-ivory practical and reassuring slides. Keep typography and brand signature stable.

A useful pattern for the first example is dark / ivory / dark / ivory / ivory / ivory, but **do not impose this alternating pattern on all posts**. For a practical post, an ivory cover may be better. A founder letter may remain ivory throughout. Assign backgrounds according to the actual message, not slide number alone.

Paper texture is optional and nearly imperceptible. It must be deterministic, bounded, and absent from the contrast assumptions unless tested. A clean solid ivory background is preferable to visible grunge.

### C — Scene-led cover, text-first interior

Use only when a specific ordinary-life visual adds meaning. Limit scenes to the cover by default. A second scene-bearing slide requires a recorded editorial reason; do not exceed two scene-bearing slides per carousel. Never generate six unrelated scenes as a substitute for layout design.

Use approved local imagery first. Generate new background-only imagery only within the permissions in section 3. Use objects and spaces, not synthetic people: a work surface, a closed notebook, a plain lunch bag, a cleared chair, an ordinary doorway, or daylight reaching a table. Match the scene to the actual text.

Keep scenes restrained, plausible, and desaturated. No readable bills, personal screens, school names, brands, wedding documents, private photographs, identifiable homes, or location clues. No distressed child, crying face, broken-heart graphic, split couple, courthouse, courtroom reconstruction, extravagant success imagery, or generic mountain-summit montage.

For the first post, a possible cover scene is an ordinary kitchen table with a plain lunch bag, a closed unbranded laptop, and an unmarked envelope. It illustrates everyday responsibilities; it must not suggest this is the founder's actual kitchen or documentary evidence of his life.

Render image and text separately. Do not ask an image model to render lettering, quotes, numbers, logos, or screenshots. Use either a dedicated solid text panel or an area with reliably measured contrast. A generic semi-transparent black overlay is not sufficient evidence of accessibility. A solid panel is the safe fallback.

Retain image provenance, rights/permission, generation method where applicable, file hash, scene brief, crop, and actual use in the manifest. Treat synthetic scenes as illustrative. Do not insert “photograph from my life” or any unsupported statement in captions.

If a suitable scene cannot be produced legitimately, use a complete B-style text-first fallback. Record `requested_treatment: C`, `effective_treatment: B`, and the reason. Do not label the result a completed scene treatment or include it as a C observation in a future test.

## 9. Match layout to what the words do

Preserve the source `layout` as the starting point. Use the following slide-level compositions; the same carousel may use multiple compositions without changing its brand:

**Editorial statement:** one dominant source thought, optionally separated at a real sentence boundary. Use the serif selectively and let whitespace support the contrast.

**Contrast:** separate the actual clauses vertically, not in cramped phone-sized columns. Do not invent labels such as “toxic / healthy,” “wrong / right,” or “before / after.” Preserve exact source order.

**Script/example:** distinguish the exact existing example through type, indentation, or a restrained panel. Keep introductory context and caveats readable. No fake message app, timestamp, sender name, or implication of a real private exchange.

**Practical sequence:** give existing actions separate lines or blocks. Do not add checkmarks implying completed actions, reorder an instruction, or number it as a new programme. Small decorative rules may support grouping but do not add steps.

**Founder letter:** warm-paper or calm dark editorial, with restrained typography. No fake handwriting, signature, portrait, date, quotation attribution, or claim that the owner has approved the words. Keep attestation in review metadata.

**Closing reassurance:** give the existing supportive statement priority and the existing CTA secondary emphasis. Do not create a new CTA or repeat it in a footer. Secondary does not mean tiny or low contrast.

The whole carousel should have a visible rhythm: an opening, recognition or distinction, useful guidance, and a closing where those functions exist in the copy. Do not invent an emotional arc that is absent from the source. Every slide must also remain understandable on its own.

## 10. Exact art direction for BTB-001

Use this first carousel as the quality reference. Preserve every source character. The following shows grouping, not permission to retype altered copy.

### Slide 1 — Charcoal; deliberate two-part headline

Source: `The relationship ended. Your responsibilities didn't.`

Separate the two sentences as complete visual thoughts. Start the headline in the upper-middle region rather than halfway down the slide. Keep “Your responsibilities” together where measured fit allows. A candidate arrangement is:

The relationship  
ended.

Your responsibilities  
didn't.

Use a genuine available Playfair weight. Choose the font size and block width by measuring the long word. Emphasise the second sentence with restrained sand or a subtle weight distinction. Do not isolate “Your” as a stranded line, replace the apostrophe, or add a motivational subheading.

### Slide 2 — Ivory; everyday responsibilities become visible

Source: `You can be grieving and still have lunches to pack, work to finish, and bills to open.`

Keep the opening readable, then introduce three visual lines using exact fragments: `lunches to pack,` / `work to finish,` / `and bills to open.` The word “have” must remain in the opening or its exact source position. Use charcoal body text and a restrained bronze emphasis, not gold text on ivory. No invented icons or new headings are needed.

### Slide 3 — Charcoal; insight rather than a large paragraph

Source: `Looking functional does not mean the change has been easy. It means life has kept asking things of you.`

Separate the two sentences. Emphasise the first sentence's distinction without visually dropping the negation. Keep the second sentence readable at normal body size. Use no new comparison labels.

### Slide 4 — Ivory; practical distinction

Source: `For today, separate what must happen from what can wait. A difficult season does not make every task urgent.`

Use a single-column reading order. Highlight the exact phrases `what must happen` and `what can wait` in their original sentence. Set the second sentence below with appropriate space. Do not extract the phrases into a layout that omits or scrambles the connecting words. No extra “urgent / later” titles.

### Slide 5 — Ivory; two clear actions plus their conclusion

Source: `Choose one essential responsibility. Choose one person you can speak honestly with. Leave room for both.`

Use two vertically stacked sentence blocks, then a smaller-but-readable third statement. Small rules or spacing can distinguish the actions. Do not add invented numbered steps, completed checkboxes, or new advice. Preserve sentence order.

### Slide 6 — Warm ivory; supportive ending

Source: `You do not have to look recovered to deserve support. Send this to someone carrying more than they show.`

Give the first sentence visual priority, with the original sharing request below. Use a clean light background; any subtle illumination must leave contrast verifiable. Keep the footer quiet. No added “Follow for more,” fake quotation marks, or extra logo block.

Produce this B-treatment reference in full. Also produce an A-treatment comparison and, when legitimately available, a C-cover comparison with the same exact copy. Keep alternatives under `proofs/`; only one selected version belongs in the 1,080 primary exports. Missing imagery must not block the B reference.

## 11. Deterministic implementation and accessibility text

Use the existing project stack when suitable. Prefer HTML/CSS with a verified local browser renderer, or deterministic SVG if already established. Record actual dependency versions and keep a lockfile. Do not invent tool availability, runtime versions, or execution results.

Render source text as escaped text nodes, never executable HTML. Use measured layout and explicit source-span mappings for emphasis. Wait for the actual font faces and all image assets to finish loading; `document.fonts.ready` alone is not proof that the intended family exists.

Disable animation, automatic hyphenation, timestamp overlays, uncontrolled randomness, and nondeterministic remote assets. Keep whitespace and crop decisions in versioned configuration. If a texture or generator uses randomness, record a fixed seed. Cache approved scene backgrounds by hash; rerenders must reuse them rather than generating new imagery every time.

Take screenshots at a known scale and verify that final dimensions are exactly 1080 × 1350, not 2160 × 2700 or browser-viewport leftovers. Keep editable text, emphasis ranges, layout decisions, and backgrounds available for rerendering.

**Alt text:** keep the original six supplied values unchanged in `alt-text-source.json`. For text-only slides, use those exact values in the delivery `alt-text.json`. For a scene-bearing slide, create a derived accessibility description that briefly describes the actual meaningful scene, identifies generated imagery as an illustration when relevant, and includes the complete canonical slide wording. Preserve the original separately and record the derived change. Do not invent scenery, claim a real-life event, or change the visible copy to match an image. Verify the derived description against the rendered output.

## 12. Proofs, pilot assignment, then full production

First inspect the supplied existing slide examples when present. Treat them as layout references, not as assets to scrape or merely recolour. Show the change from v1 to v2 through actual rendered proofs.

Create the BTB-001 comparisons and representative proofs covering all five semantic layout families, the longest hook, the longest body slide, one founder post, and one post with a safety caveat. Check both full-size output and phone previews. Correct the system before batch production.

Prepare a **12-post exploratory visual test plan**, four posts assigned to each effective A/B/C treatment where C is available. Select suitable posts from the existing upcoming slots, balancing pillars, hook length, and CTA type as far as possible. Preserve every date and ID; do not schedule or publish them. If C is unavailable, record that the three-way test is not fully prepared rather than counting B fallbacks as C.

This is a proposed observational comparison, not a controlled experiment or proof that design caused growth. Store only assignment metadata. Keep actual reach, shares, saves, and follows blank. Where later measurements exist, the intended comparisons are shares, saves, and attributed follows per 1,000 accounts reached, using consistent definitions. No performance forecasts or invented winners.

Do not wait for future audience data to complete local production. Use B as the conservative default beyond pilot assignments, with A where the supplied copy calls for a concise dark statement. Use C selectively only where a genuine scene adds meaning and passes permissions and QA. Do not randomise themes across 180 posts or lock an untested colour treatment in as a proven winner. Store per-post and per-slide choices so later approved changes can be rerendered without rewriting the library.

Proceed to all 180 carousels in resumable batches. Do not stop after proofs and call the task complete. If real subagents are available, delegate independent renderer, text-integrity, and visual-QA work with clear ownership. Do not fabricate delegation. Preserve successful outputs; repair failed assets with bounded retries and log unresolved failures precisely.

## 13. Quality gates

Run automated checks on every primary slide and produce per-slide results:

1. All 180 IDs, 1,080 slide texts, dates, and six-slide structures match the source.
2. All 180 canonical content hashes match; all caption exports match exactly.
3. Visible copy-node character sequences equal the canonical strings. No hidden or clipped copy is counted as a successful match.
4. Font family, weight, loading, glyph coverage, and permitted sizes are verified. No synthetic weight or silent fallback is accepted as final brand output.
5. Actual text bounding boxes remain within their content region. No overlap, footer collision, clipped descenders, broken glyphs, horizontal overflow, or off-canvas text.
6. Contrast meets the project threshold for actual meaningful text. For variable scenes, verify the area behind text or use a tested solid panel; a single average image colour is not sufficient.
7. All images exist, decode, have correct dimensions, and have recorded hashes. Links in the review gallery resolve to real files.
8. Brand, footer, alt text, scene provenance, and approval metadata are correct. No private details or internal review labels appear in public artwork.
9. A failed C background is accurately labelled as a fallback, not a successful scene-led output.
10. No changes were made to publishing state or performance actuals.

Also perform visual inspection. Inspect the quality-reference proofs individually, all covers through legible contact sheets, every carousel sequence in the review gallery, and all flagged layouts at full size. Check rhythm, meaningful emphasis, balanced space, coherent scene choices, and phone readability. Do not call an automated pass “human approval.” Record exactly what was inspected, by what method, and what remains unreviewed if runtime limits intervene.

Use actual text and geometry for text-integrity checks; do not rely on OCR or a model's self-rating as the primary method. Any unresolved clipping, inadequate contrast, missing glyphs, or altered copy is a blocking defect, not a cosmetic suggestion.

## 14. Required deliverables

Use this structure or an equally clear project-compatible equivalent:

```text
output/btb-180-day-v2/
  README.md
  visual-system-v2.md
  Visual_Design_Overrides_v2.json
  change-log-v1-to-v2.md
  manifest.json
  input-hashes.json
  posts/
    BTB-001/
      01.png ... 06.png
      editable/
      caption.txt
      alt-text-source.json
      alt-text.json
      post-manifest.json
    ... BTB-180/
  proofs/
    BTB-001/A/...
    BTB-001/B/...
    BTB-001/C/...           # only actual completed assets
    representative/...
  assets/                  # permitted backgrounds; no font binaries
  review/
    index.html
    cover-contact-sheets/...
    carousel-contact-sheets/...
  qa/
    content-integrity.json
    layout-geometry.json
    typography-report.json
    contrast-report.json
    asset-provenance.json
    image-integrity.json
    visual-inspection.md
    editorial-proposals.md
    blockers.json
  pilot/
    visual-test-assignments.json
    measurement-notes.md
  renderer/                # source/config; no dependencies or secrets bundled
```

Each post manifest must include source ID/date/hash, semantic layout, requested/effective treatment, per-slide background and layout choices, emphasis ranges, output paths/hashes, font/logo status, scene provenance if applicable, QA results, founder-attestation status, and owner-approval gate. Keep production, design review, editorial approval, and publication status separate.

The review gallery must be local and offline-capable, searchable by ID, date, pillar, layout, treatment, and approval status. Show all six slides in order, original caption, alt text, downloadable local outputs, and real QA results. Keep diagnostics outside the public images. No tracking pixels, upload controls, social logins, or publishing buttons.

Include real reproduction commands supported by the implementation. Package primary outputs and the minimal reproducible renderer, with proofs separately identifiable. Exclude font binaries, node_modules, browser profiles, credentials, private sources, unrelated files, and fabricated placeholders. Missing assets belong in `blockers.json`, not in pretend image files.

## 15. Completion report and acceptance criteria

Report actual results, not an aesthetic self-score:

- Number of complete primary carousels, primary PNGs, captions, alt-text sets, and editable slide sources.
- Proof counts separately from the target of 180 / 1,080.
- Counts by effective treatment A/B/C and any C-to-B fallbacks.
- All source hashes and exact-copy checks; dimensions, fonts, contrast, and geometry results.
- What visually changed from v1: hierarchy, whitespace, light/dark pacing, footer, and any actual scenes.
- Original-logo and font status; founder and owner approval gates still pending.
- Specific unresolved defects or missing assets, by post/slide.
- Output/review/archive paths and commands that actually ran.
- Confirmation that no publishing, scheduling, account changes, spending, private-folder access, or performance fabrication occurred.

The acceptance target is a complete, readable, emotionally coherent visual library with exact source copy and honest approval states. If the logo is absent, deliver usable review assets and report the brand gate. If scenes are unavailable, deliver complete text-first production and accurately report the missing C proofs. If some PNGs fail, report the exact shortfall and retain the successful work. Do not call unresolved defects or unreviewed work approved.

**Execute now within the permitted environment. Start by validating the existing package and inspecting the current renderer, produce and check the reference carousel, then complete the full production set.**

# END EXECUTION PROMPT
