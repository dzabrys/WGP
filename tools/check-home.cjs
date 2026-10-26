const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const css = require(process.env.LIGHTNINGCSS_PATH || 'lightningcss');
const sharp = require(process.env.SHARP_PATH || 'sharp');
const root = path.resolve(__dirname, '../docs');
function checkUrl(value, base) {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(value)) return;
  const decoded = decodeURIComponent(value.split(/[?#]/)[0]).replace(/^\/WGP(?=\/)/, '');
  const target = decoded.startsWith('/') ? path.resolve(root, '.' + decoded) : path.resolve(base, decoded);
  assert(fs.existsSync(target), `Missing asset: ${value} (from ${base})`);
}
async function main() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert(!/<link[^>]*rel="stylesheet"/.test(html), 'Homepage should not wait on CSS requests');
  const inline = html.match(/<style id="home-styles">([\s\S]*?)<\/style>/)[1];
  const parsed = css.transform({filename:'inline.css', code:Buffer.from(inline), visitor:{Url(url) {checkUrl(url.url, root);}}});
  assert.equal(parsed.warnings.length, 0);
  assert(html.includes('fetchpriority="high"'));
  assert(html.includes('home-skarb-piratow-960.webp 960w'));
  assert.equal((html.match(/data-product-slide=/g)||[]).length,3);
  assert(!html.includes('class="hero-subtitle"'));
  assert(!html.includes('class="hero-slide-copy"'));
  assert(!html.includes('assets/hero-1536.webp'));
  assert(!html.includes(' 536w'));
  for (const file of fs.readdirSync(root).filter(name => name.endsWith('.html'))) {
    const page = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of page.matchAll(/\b(?:src|href)="([^"]+)"/g)) checkUrl(match[1], root);
    for (const match of page.matchAll(/\bsrcset="([^"]+)"/g)) {
      for (const candidate of match[1].split(',')) {
        const [url, descriptor] = candidate.trim().split(/\s+/);
        checkUrl(url, root);
        if (file === 'index.html' && /assets\/home-(skarb-piratow|zostan-kierowca|segreguj-smieci)-/.test(url)) {
          const image = await sharp(path.resolve(root, url.split('?')[0])).metadata();
          assert.equal(`${image.width}w`, descriptor, `Wrong srcset descriptor: ${url}`);
        }
      }
    }
  }
  // Regression for the reported forced reflow: every batch must read all
  // starting transforms before the first animation writes to layout.
  let events = [], observerCallback;
  const elements = Array.from({length:3}, (_, id) => ({id, animate() {
    events.push(`write:${id}`);
    return {finished:Promise.resolve(), cancel(){}};
  }}));
  const preference = {matches:false, addEventListener(){}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'style-a1/animations.js'),'utf8'), {
    matchMedia:() => preference,
    Element:{prototype:{animate(){}}},
    getComputedStyle(el) {events.push(`read:${el.id}`);return {transform:'none'};},
    document:{querySelectorAll:() => elements},
    window:{IntersectionObserver:true},
    IntersectionObserver:class {constructor(callback){observerCallback=callback;} observe(){} unobserve(){} disconnect(){}}
  });
  const expected = ['read:0','read:1','read:2','write:0','write:1','write:2'];
  assert.deepEqual(events, expected);
  events = [];
  observerCallback(elements.map(target => ({target,isIntersecting:true})));
  assert.deepEqual(events, expected);
  events = [];
  preference.matches = true;
  observerCallback(elements.map(target => ({target,isIntersecting:true})));
  assert.deepEqual(events, []);
  console.log('PASS: all page links/assets, inline CSS URLs/fonts, responsive image widths, animation read/write batching and reduced motion.');
}
main().catch(error => {console.error(error);process.exitCode=1;});
