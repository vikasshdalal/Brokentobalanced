'use strict';
// Independent bounded rerender check. Exported HTML/PNG files are read-only inputs.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'runtime-config.json'), 'utf8'));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const dependencyRoots = [process.env.BTB_NODE_MODULES,
  '/Users/vikasshdalal/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'].filter(Boolean);
function dependency(name) {
  try { return require(name); } catch {}
  for (const root of dependencyRoots) {
    try { return require(path.join(root, name)); } catch {}
  }
  throw new Error('Pinned dependency unavailable: ' + name);
}
const targets = [
  ['BTB-001', 1, 'editorial cover'], ['BTB-001', 3, 'editorial body'],
  ['BTB-002', 1, 'contrast cover'], ['BTB-002', 3, 'contrast body'],
  ['BTB-003', 1, 'script cover'], ['BTB-003', 5, 'script safety caveat'],
  ['BTB-005', 1, 'checklist cover'], ['BTB-005', 3, 'checklist body'],
  ['BTB-014', 1, 'letter cover'], ['BTB-014', 3, 'letter founder body'],
  ['BTB-175', 1, 'longest hook'], ['BTB-142', 4, 'longest body'],
  ['BTB-011', 6, 'repaired final-word wrap']
];
const fontPaths = {
  headings: process.env.BTB_HEADING_FONT || config.fonts.headings.path,
  body: process.env.BTB_BODY_FONT || config.fonts.body.path
};
async function main() {
  const result = {
    status: 'FAIL', method: 'Independent fresh Chromium rerender from saved editable HTML; exact PNG SHA-256 comparison',
    renderer_version: config.renderer_version,
    verifier_sha256: sha256(fs.readFileSync(__filename)),
    styles_sha256: sha256(fs.readFileSync(path.join(__dirname, 'styles.css'))),
    target_count: targets.length, exact_match_count: 0, results: [], errors: [],
    network_scope: 'Loopback server only; every other browser request aborted',
    exported_sources_or_images_modified: false,
    screenshot_options: { viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1,
      colorScheme: 'light', reducedMotion: 'reduce', selector: '.slide', animations: 'disabled', scale: 'css' },
    browser_flags: ['--force-color-profile=srgb', '--disable-lcd-text']
  };
  let server, browser;
  const blockedRequests = [];
  try {
    for (const key of ['headings', 'body']) {
      const actual = sha256(fs.readFileSync(fontPaths[key]));
      if (actual !== config.fonts[key].sha256) throw new Error('Font hash mismatch: ' + key);
    }
    for (const [id, number] of targets) {
      const nn = String(number).padStart(2, '0');
      for (const rel of [`posts/${id}/${nn}.png`, `posts/${id}/editable/${nn}.html`]) {
        if (!fs.existsSync(path.join(ROOT, rel))) throw new Error('Await full-render completion; missing ' + rel);
      }
    }
    server = http.createServer((req, res) => {
      try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
        let file;
        if (pathname.startsWith('/__fonts/')) {
          const key = pathname.split('/').pop();
          if (!Object.hasOwn(fontPaths, key)) throw new Error('Unknown font');
          file = fontPaths[key];
          res.setHeader('Content-Type', 'font/ttf');
        } else {
          file = path.resolve(ROOT, '.' + pathname);
          if (!file.startsWith(ROOT + path.sep)) throw new Error('Outside output');
          const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
          res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        }
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(fs.readFileSync(file));
      } catch {
        res.statusCode = 404;
        res.end('Not found');
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const baseURL = 'http://127.0.0.1:' + server.address().port;
    const { chromium } = dependency('playwright');
    let executablePath = process.env.BTB_BROWSER || config.browser_path;
    if (!fs.existsSync(executablePath)) executablePath = chromium.executablePath();
    browser = await chromium.launch({ executablePath, headless: true, args: result.browser_flags });
    result.browser_version = browser.version();
    result.browser_path = executablePath;
    result.node_version = process.version;
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce' });
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(baseURL + '/')) return route.continue();
      blockedRequests.push(url);
      return route.abort();
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    for (const [id, number, reason] of targets) {
      const nn = String(number).padStart(2, '0');
      const html = `posts/${id}/editable/${nn}.html`;
      const png = `posts/${id}/${nn}.png`;
      await page.goto(baseURL + '/' + html, { waitUntil: 'load' });
      const fontFaces = await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([document.fonts.load('500 92px "Playfair Display"'),
          document.fonts.load('400 62px Inter'), document.fonts.load('600 62px Inter')]);
        return [...document.fonts].map(f => ({ family: f.family, status: f.status, weight: f.weight }));
      });
      const dom = await cdp.send('DOM.getDocument');
      const node = await cdp.send('DOM.querySelector', { nodeId: dom.root.nodeId, selector: '.copy' });
      const platformFonts = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId })).fonts;
      const expectedFamily = number === 1 ? 'Playfair Display' : 'Inter';
      const fontsOK = fontFaces.every(f => f.status === 'loaded') && platformFonts.length > 0 &&
        platformFonts.every(f => f.isCustomFont && f.familyName === expectedFamily);
      const original = fs.readFileSync(path.join(ROOT, png));
      const rerendered = await page.locator('.slide').screenshot({ animations: 'disabled', scale: 'css' });
      const originalHash = sha256(original), rerenderHash = sha256(rerendered);
      const matches = originalHash === rerenderHash;
      if (matches) result.exact_match_count++;
      result.results.push({ id, slide: number, reason, png, html, original_sha256: originalHash,
        rerender_sha256: rerenderHash, exact_match: matches, fonts_verified: fontsOK,
        font_faces: fontFaces, platform_fonts: platformFonts });
      if (!matches || !fontsOK) result.errors.push(`${id}/${nn}: ${!matches ? 'PNG mismatch' : 'font mismatch'}`);
    }
    if (blockedRequests.length) result.errors.push('Unexpected non-loopback browser requests');
    result.status = result.errors.length ? 'FAIL' : 'PASS';
  } catch (error) {
    result.errors.push(error.stack || error.message);
  } finally {
    result.blocked_external_requests = blockedRequests;
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(ROOT, 'qa/reproducibility.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(`Reproducibility ${result.status}: ${result.exact_match_count}/${result.target_count} exact PNG matches`);
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
}
main();
