'use strict';
// Independent v2 rerender test: exported source/PNG files remain read-only.
const fs = require('node:fs'), path = require('node:path');
const http = require('node:http'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const config = read(path.join(__dirname, 'runtime-config.json'));
const canonical = read(path.join(__dirname, 'input', 'BTB_180_Day_Content.json'));
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
function dep(name) {
  try { return require(name); } catch {}
  for (const root of [process.env.BTB_NODE_MODULES,
    '/Users/vikasshdalal/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'].filter(Boolean)) {
    try { return require(path.join(root, name)); } catch {}
  }
  throw new Error('Pinned dependency unavailable: ' + name);
}
const targets = [];
for (let slide = 1; slide <= 6; slide++) {
  targets.push({ dir: 'posts/BTB-001', slide, reason: 'selected reference primary B' });
  for (const treatment of ['A', 'B']) targets.push({ dir: 'proofs/BTB-001/' + treatment, slide,
    reason: 'complete reference ' + treatment + ' comparison proof' });
}
for (const [id, slide, reason] of [
  ['175', 1, 'longest hook'], ['142', 4, 'longest body'],
  ['003', 4, 'script example'], ['003', 5, 'safety caveat'],
  ['014', 2, 'founder A interior'], ['030', 2, 'founder B interior'],
  ['005', 3, 'practical sequence'], ['002', 3, 'contrast interior'],
  ['002', 1, 'contrast cover'], ['003', 1, 'script cover'],
  ['005', 1, 'checklist cover'], ['014', 1, 'letter cover']
]) targets.push({ dir: 'posts/BTB-' + id, slide, reason });
const fonts = {
  headings: process.env.BTB_HEADING_FONT || config.fonts.headings.path,
  body: process.env.BTB_BODY_FONT || config.fonts.body.path
};
async function main() {
  const result = {
    status: 'FAIL', method: 'Independent fresh Chromium rerender from final saved v2 editable HTML; exact PNG SHA-256 and source-span/font checks',
    target_count: targets.length, exact_match_count: 0, verified_source_and_font_count: 0,
    primary_targets: targets.filter(t => t.dir.startsWith('posts/')).length,
    proof_targets: targets.filter(t => t.dir.startsWith('proofs/')).length,
    renderer_version: config.renderer_version, verifier_sha256: sha(fs.readFileSync(__filename)),
    renderer_sha256: sha(fs.readFileSync(path.join(__dirname, 'run.cjs'))),
    styles_sha256: sha(fs.readFileSync(path.join(__dirname, 'styles.css'))),
    browser_flags: ['--force-color-profile=srgb', '--disable-lcd-text'],
    screenshot_options: { selector: '.slide', viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce', animations: 'disabled', scale: 'css' },
    network_scope: 'Loopback server only; all other browser requests aborted',
    exported_sources_or_images_modified: false, v1_outputs_modified: false,
    results: [], errors: []
  };
  const external = [];
  let server, browser;
  try {
    for (const key of ['headings', 'body']) if (sha(fs.readFileSync(fonts[key])) !== config.fonts[key].sha256)
      throw new Error('Pinned font hash mismatch: ' + key);
    const inputHash = sha(fs.readFileSync(path.join(__dirname, 'input/BTB_180_Day_Content.json')));
    result.input_sha256 = inputHash;
    if (inputHash !== config.input_sha256) throw new Error('Canonical input hash mismatch');
    for (const target of targets) {
      const number = String(target.slide).padStart(2, '0');
      for (const file of [target.dir + '/' + number + '.png', target.dir + '/editable/' + number + '.html', target.dir + '/post-manifest.json'])
        if (!fs.existsSync(path.join(ROOT, file))) throw new Error('Missing final target: ' + file);
    }
    server = http.createServer((req, res) => {
      try {
        const url = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
        let file;
        if (url.startsWith('/__fonts/')) {
          const key = url.split('/').pop();
          if (!Object.hasOwn(fonts, key)) throw new Error('Unknown font');
          file = fonts[key]; res.setHeader('Content-Type', 'font/ttf');
        } else {
          file = path.resolve(ROOT, '.' + url);
          if (!file.startsWith(ROOT + path.sep)) throw new Error('Outside output');
          res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css',
            '.png': 'image/png', '.json': 'application/json' })[path.extname(file)] || 'application/octet-stream');
        }
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(fs.readFileSync(file));
      } catch { res.statusCode = 404; res.end('Not found'); }
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const baseURL = 'http://127.0.0.1:' + server.address().port;
    const { chromium } = dep('playwright');
    let executablePath = process.env.BTB_BROWSER || config.browser_path;
    if (!fs.existsSync(executablePath)) executablePath = chromium.executablePath();
    browser = await chromium.launch({ executablePath, headless: true, args: result.browser_flags });
    result.browser_version = browser.version(); result.browser_path = executablePath;
    result.node_version = process.version;
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce' });
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(baseURL + '/')) return route.continue();
      external.push(url); return route.abort();
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    for (const target of targets) {
      const number = String(target.slide).padStart(2, '0');
      const html = target.dir + '/editable/' + number + '.html', png = target.dir + '/' + number + '.png';
      const manifest = read(path.join(ROOT, target.dir, 'post-manifest.json'));
      const slideRecord = manifest.slides.find(s => s.number === target.slide);
      const post = canonical.posts.find(p => p.id === manifest.id);
      const text = post.slides[target.slide - 1].text;
      await page.goto(baseURL + '/' + html, { waitUntil: 'load' });
      const faces = await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([document.fonts.load('500 94px "Playfair Display"'),
          document.fonts.load('400 60px Inter'), document.fonts.load('450 58px Inter'),
          document.fonts.load('500 60px Inter')]);
        return [...document.fonts].map(f => ({ family: f.family, status: f.status, weight: f.weight }));
      });
      const actual = await page.evaluate(() => ({
        copy: document.querySelector('.copy').textContent,
        blocks: [...document.querySelectorAll('.copy-block')].map(e => {
          const style = getComputedStyle(e), bounds = e.getBoundingClientRect();
          return { text: e.textContent, start: Number(e.dataset.sourceStart), end: Number(e.dataset.sourceEnd),
            role: e.dataset.role, font_size: parseFloat(style.fontSize), font_weight: Number(style.fontWeight),
            font_family: style.fontFamily, font_synthesis: style.fontSynthesis, gap_before: parseFloat(style.marginTop),
            visible: style.display !== 'none' && style.visibility === 'visible' && bounds.width > 0 && bounds.height > 0 };
        })
      }));
      const dom = await cdp.send('DOM.getDocument');
      const blocks = [];
      for (let i = 0; i < actual.blocks.length; i++) {
        const block = actual.blocks[i], expected = slideRecord.source_spans[i], fitted = slideRecord.fitted_typography[i];
        const node = await cdp.send('DOM.querySelector', { nodeId: dom.root.nodeId, selector: '.copy-block:nth-child(' + (i + 1) + ')' });
        const platformFonts = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId })).fonts;
        const exactSource = expected && block.start === expected.start && block.end === expected.end && block.text === text.slice(expected.start, expected.end);
        const fontsOK = expected && platformFonts.length > 0 && platformFonts.every(f => f.isCustomFont && f.familyName === expected.font_family);
        const fittedOK = fitted && block.font_size === fitted.font_size && block.gap_before === fitted.gap_before && block.font_weight === expected.font_weight;
        blocks.push({ ...block, exact_source_span: !!exactSource, actual_fonts_match: !!fontsOK,
          fitted_typography_match: !!fittedOK, platform_fonts: platformFonts,
          passed: !!exactSource && !!fontsOK && !!fittedOK && block.visible && block.font_synthesis === 'none' });
      }
      const textAndFontsOK = actual.copy === text && actual.blocks.length === slideRecord.source_spans.length &&
        faces.every(f => f.status === 'loaded') && blocks.every(b => b.passed);
      const original = fs.readFileSync(path.join(ROOT, png));
      const rerendered = await page.locator('.slide').screenshot({ animations: 'disabled', scale: 'css' });
      const originalHash = sha(original), newHash = sha(rerendered), match = originalHash === newHash;
      if (match) result.exact_match_count++;
      if (textAndFontsOK) result.verified_source_and_font_count++;
      result.results.push({ ...target, id: manifest.id, effective_treatment: manifest.effective_treatment, png, html,
        original_sha256: originalHash, rerender_sha256: newHash, exact_png_match: match,
        saved_png_manifest_hash_match: originalHash === slideRecord.png_sha256,
        actual_visible_text_exact: actual.copy === text, source_spans_and_fonts_verified: textAndFontsOK,
        faces, blocks });
      if (!match || !textAndFontsOK || originalHash !== slideRecord.png_sha256)
        result.errors.push(png + ': ' + (!match ? 'PNG byte mismatch ' : '') + (!textAndFontsOK ? 'source/font mismatch ' : '') + (originalHash !== slideRecord.png_sha256 ? 'manifest hash mismatch' : ''));
    }
    if (external.length) result.errors.push('Unexpected non-loopback browser requests');
    result.status = result.errors.length ? 'FAIL' : 'PASS';
  } catch (error) { result.errors.push(error.stack || error.message); }
  finally {
    result.blocked_external_requests = external;
    if (browser) await browser.close();
    if (server && server.listening) await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(ROOT, 'qa/reproducibility-v2.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(`V2 reproducibility ${result.status}: ${result.exact_match_count}/${result.target_count} exact PNG matches; ${result.verified_source_and_font_count} source/font checks pass`);
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
}
main();
