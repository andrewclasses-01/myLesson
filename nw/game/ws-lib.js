// =============================================================
// WORDSHAKE — shared library for the fixed GAME (games/wordshake) and the
// activity TEMPLATE (templates/wordshake). Đợt 386, 25/9/2026.
// Design approved in 4 rounds: D:\OTHERS\CLAUDE\AWord - thiet ke Wordshake\
// wordshake-v1…v4.html (structure = v2, neon skin + HUD strip + sound = v4).
//
//   loadDict()          -> Promise<Map>  word -> { lv, m, base }
//   lookup(dict, w)     -> { m, base, lv } | null   (3–7 letters only)
//   points(len)         -> 3→1 · 4→2 · 5→3 · 6→4 · 7→5
//   rollBoard(dict)     -> 16 upper-case letters from 16 Boggle dice
//   wordsOn(dict, letters, maxLv) -> every dictionary word the board can make
//   canMake(word, letters)
//   createSfx()         -> synthesised sound effects (Web Audio, no files)
//
// The dictionary (ws-dict.txt) is built from ALL ENGLISH WORDS.xlsx: A1→C2,
// 3–7 letters, no -ing/-ed forms (thầy, 25/9/2026), meanings = short common
// Vietnamese, several senses joined by " / ". One line per word:
//   word \t level(1..6) \t meaning        headword
//   word \t level(1..6) \t =base          inflected form, shows the base's meaning
// =============================================================

export const MIN_LEN = 3, MAX_LEN = 7;
export const points = n => Math.max(1, Math.min(5, n - 2));

let dictPromise = null;
export function loadDict() {
  if (dictPromise) return dictPromise;
  const url = new URL("./ws-dict.txt", import.meta.url).href;
  dictPromise = fetch(url).then(r => {
    if (!r.ok) throw new Error("ws-dict.txt " + r.status);
    return r.text();
  }).then(parseDict).catch(e => { dictPromise = null; throw e; });
  return dictPromise;
}
export function parseDict(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    if (!line) continue;
    const a = line.indexOf("\t"), b = line.indexOf("\t", a + 1);
    if (a < 0 || b < 0) continue;
    const w = line.slice(0, a), lv = +line.slice(a + 1, b), rest = line.slice(b + 1).replace(/\r$/, "");
    if (rest.startsWith("=")) map.set(w, { lv, m: "", base: rest.slice(1) });
    else map.set(w, { lv, m: rest, base: null });
  }
  return map;
}
export function lookup(dict, w) {
  w = String(w || "").toLowerCase();
  if (w.length < MIN_LEN || w.length > MAX_LEN || !dict) return null;
  const e = dict.get(w);
  if (!e) return null;
  if (e.base) {
    const b = dict.get(e.base);
    return { m: b ? b.m : "", base: e.base, lv: e.lv };
  }
  return { m: e.m, base: null, lv: e.lv };
}

export function countOf(s) { const m = {}; for (const c of s) m[c] = (m[c] || 0) + 1; return m; }
export function canMake(word, letters) {
  const bag = countOf(letters.join ? letters.join("").toLowerCase() : String(letters).toLowerCase());
  const m = {};
  for (const c of word) { m[c] = (m[c] || 0) + 1; if (m[c] > (bag[c] || 0)) return false; }
  return true;
}
export function wordsOn(dict, letters, maxLv = 6) {
  const bag = countOf(letters.join("").toLowerCase());
  const out = [];
  for (const [w, e] of dict) {
    if (e.lv > maxLv) continue;
    let ok = true; const m = {};
    for (const c of w) { m[c] = (m[c] || 0) + 1; if (m[c] > (bag[c] || 0)) { ok = false; break; } }
    if (ok) out.push(w);
  }
  return out;
}

// The 16 dice of the original game (British Council Wordshake, read 25/9/2026).
const DICE = ["OSNDWE", "RUWLGI", "AAIOTC", "MCEDPA", "HSRAOM", "SEUTLP", "ABILYT", "EIYEHF",
              "DOKNUT", "ELGKUY", "NTGVEI", "IFORXB", "SEARLC", "PNHSEI", "VENDZA", "OMBAJQ"];
export function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
const VOWELS = "AEIOU";
// Roll until the board is worth playing: 4–7 vowels, no Q (a lone Q is dead
// weight without U), and — once the dictionary is known — at least `minWords`
// everyday words (A1–B2) on it. 40 tries is plenty (measured: most rolls pass).
// Đợt 387 — `easy` (thầy: "ưu tiên bộ chữ dễ … tránh bế tắc"): roll 60 boards
// with 5–7 vowels and keep the one with the MOST A1–A2 words. Measured over
// 100 boards: 109 → ~250 A1–A2 words a board, ~13 ms a board.
// ⭐ Đợt 390 (thầy: "các lượt play again trùng nhau quá") — "the MOST A1–A2 words"
// always drifts to the same common letters: measured, two easy boards in a row
// shared 10.1 of 16 letters (up to 13) vs 7.6 for plain rolls. Now every board with
// ≥ 55 % of the best one's easy words is a candidate, and the one sharing the FEWEST
// letters with `recent` (the last boards played, newest first) wins. Measured over
// 150 boards in a row: 10.1 → 7.8 shared letters, 19 % → 8 % shared easy words, still
// ~174 A1–A2 words a board (plain rolls 109). The GAME keeps `recent` in localStorage.
export function overlapOf(a, b) {
  const m = countOf(a.join("")); let n = 0;
  for (const c of b) if (m[c] > 0) { m[c]--; n++; }
  return n;
}
// ⭐ Đợt 395 (thầy: Options ▸ EASY / MEDIUM / HARD) — `level: "medium" | "hard"`.
// Measured 26/9/2026 (words a board, A1–A2 / B1–B2 / C1–C2): the dictionary is 55 %
// C-level, so EVERY board has more hard words than easy ones, and chasing a count only
// finds boards with more of everything. The lever is the SHARE: out of 150 rolls keep
// the board whose share of the level's band is highest, among boards big enough to
// play. Averages over 30 boards:
//   easy (unchanged)  218 / 348 / 659   A-share 18 %
//   medium            123 / 226 / 341   B-share 33 %  (plain rolls 28 %)
//   hard              ~70 / 130 / 290   C-share 58–60 %, and only ~70 easy words
// ~0.3 ms a roll ⇒ ~50 ms a board.
const LEVELS = {
  medium: { band: [3, 4], vlo: 4, vhi: 7, minTot: 600 },
  hard:   { band: [5, 6], vlo: 4, vhi: 6, minTot: 250 }
};
export const LEVEL_IDS = ["easy", "medium", "hard"];
function rollLevel(dict, L, recent) {
  const cands = [];
  for (let t = 0; t < 150; t++) {
    const letters = shuffle(DICE).map(d => d[Math.random() * 6 | 0]);
    const v = letters.filter(c => VOWELS.includes(c)).length;
    if (v < L.vlo || v > L.vhi || letters.includes("Q")) continue;
    const ws = wordsOn(dict, letters, 6);
    let inBand = 0;
    for (const w of ws) { const lv = dict.get(w).lv; if (lv >= L.band[0] && lv <= L.band[1]) inBand++; }
    cands.push({ letters, tot: ws.length, s: ws.length ? inBand / ws.length : 0 });
  }
  if (!cands.length) return "AEEIOSTRNLPCDMHU".split("");
  const big = cands.filter(c => c.tot >= L.minTot);
  const use = big.length ? big : cands;
  const top = Math.max(...use.map(c => c.s));
  const pool = use.filter(c => c.s >= top - .02);       // near-best, then the least like `recent`
  const likeness = c => recent.slice(0, 8).reduce((s, r, i) => s + overlapOf(r, c.letters) * (i === 0 ? 2 : 1), 0);
  pool.forEach(c => { c.like = likeness(c) + Math.random() * .5; });
  pool.sort((a, b) => a.like - b.like);
  return pool[0].letters;
}
export function rollBoard(dict, { minWords = 45, tries = 40, easy = false, level = "", recent = [], pool: poolPct = .55 } = {}) {
  if (dict && LEVELS[level]) return rollLevel(dict, LEVELS[level], recent);
  if (level === "easy") easy = true;
  let best = null, bestN = -1;
  if (easy) tries = 60;
  const cands = [];
  for (let t = 0; t < tries; t++) {
    const letters = shuffle(DICE).map(d => d[Math.random() * 6 | 0]);
    const v = letters.filter(c => VOWELS.includes(c)).length;
    if (v < (easy ? 5 : 4) || v > 7 || letters.includes("Q")) continue;
    if (!dict) return letters;
    const n = wordsOn(dict, letters, easy ? 2 : 4).length;
    if (!easy && n >= minWords) return letters;
    cands.push({ letters, n });
    if (n > bestN) { best = letters; bestN = n; }
  }
  if (!easy || !cands.length) return best || "AEEIOSTRNLPCDMHU".split("");
  const pool = cands.filter(c => c.n >= bestN * poolPct);
  // the board the class JUST saw counts double
  const likeness = c => recent.slice(0, 8).reduce((s, r, i) => s + overlapOf(r, c.letters) * (i === 0 ? 2 : 1), 0);
  pool.forEach(c => { c.like = likeness(c) + Math.random() * .5; });
  pool.sort((a, b) => a.like - b.like);
  return pool[0].letters;
}

// ---------------------------------------------------------------
// Sound — synthesised with Web Audio, nothing to download. In a fight the
// left team's sounds pan left and the right team's pan right, so in a noisy
// classroom you can hear which side just scored.
// ---------------------------------------------------------------
export function createSfx() {
  let ctx = null, on = true;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function out(c, pan) {
    const g = c.createGain(); g.gain.value = .9;
    if (c.createStereoPanner && pan) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(c.destination); }
    else g.connect(c.destination);
    return g;
  }
  function tone(f, dur, o = {}) {
    const c = on && ac(); if (!c) return;
    const t = c.currentTime + (o.at || 0);
    const os = c.createOscillator(), g = c.createGain();
    os.type = o.type || "square"; os.frequency.setValueAtTime(f, t);
    if (o.slide) os.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || .06, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    os.connect(g).connect(out(c, o.pan)); os.start(t); os.stop(t + dur + .03);
  }
  function noise(dur, o = {}) {
    const c = on && ac(); if (!c) return;
    const t = c.currentTime + (o.at || 0), n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = o.freq || 2500; bp.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = o.vol || .08;
    src.connect(bp).connect(g).connect(out(c, o.pan)); src.start(t);
  }
  const P = p => p || 0;
  return {
    get on() { return on; },
    set on(v) { on = !!v; if (on) ac(); },
    unlock() { ac(); },
    tap: (pan) => tone(pan > 0 ? 980 : 880, .055, { vol: .045, pan: P(pan) }),
    untap: (pan) => tone(520, .06, { vol: .04, pan: P(pan), slide: 420 }),
    clear: (pan) => tone(420, .14, { type: "triangle", vol: .06, pan: P(pan), slide: 160 }),
    ok(pan, pts = 1) {
      const base = pan > 0 ? 587 : 523, steps = [0, 4, 7, 12, 16, 19].slice(0, Math.min(6, 2 + pts));
      steps.forEach((k, i) => tone(base * Math.pow(2, k / 12), .13, { type: "triangle", vol: .1, at: i * .06, pan: P(pan) }));
      noise(.12, { vol: .04, at: steps.length * .06, freq: 6000, pan: P(pan) });
    },
    bad(pan) { tone(196, .28, { type: "sawtooth", vol: .06, slide: 98, pan: P(pan) }); noise(.2, { vol: .05, freq: 400, pan: P(pan) }); },
    dup(pan) { tone(784, .07, { vol: .05, pan: P(pan) }); tone(622, .1, { vol: .05, at: .1, pan: P(pan) }); },
    shake() { for (let i = 0; i < 12; i++) noise(.045, { at: i * .055, vol: .06, freq: 1200 + Math.random() * 3000 }); },
    tick: () => tone(1320, .035, { vol: .05 }),
    // Đợt 387 (thầy: "10 giây cuối có chuông dồn dập") — call once per second
    // with the seconds left (10…1): 2 bell strikes a second from 10 to 6, 4 a
    // second from 5 to 1, pitch climbing as time runs out. Scheduled on the
    // audio clock (`at`), so the strikes stay evenly spaced inside the second.
    countdown(left) {
      if (!(left > 0 && left <= 10)) return;
      const n = left > 5 ? 2 : 4, f = 1320 * Math.pow(2, (10 - left) / 18);
      for (let i = 0; i < n; i++) {
        const at = i / n;
        tone(f, .22, { type: "sine", vol: .09, at });
        tone(f * 2.76, .12, { type: "sine", vol: .03, at });   // the metallic overtone of a bell
      }
    },
    next() { tone(660, .07, { type: "triangle", vol: .06 }); tone(990, .1, { type: "triangle", vol: .06, at: .07 }); },
    timeup() { tone(440, .35, { type: "sawtooth", vol: .07 }); tone(330, .6, { type: "sawtooth", vol: .07, at: .3 }); },
    win(pan) {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, { type: "triangle", vol: .1, at: .4 + i * .11, pan: P(pan) }));
      tone(1047, .55, { type: "square", vol: .05, at: .85, pan: P(pan) }); tone(1319, .55, { type: "triangle", vol: .07, at: .85, pan: P(pan) });
    },
    // Đợt 390 — the score tank: a point lands in the water · one drip per counted
    // point while it drains (pitch climbs with the count) · the number lands.
    splash(pan) { noise(.16, { vol: .05, freq: 900, pan: P(pan) }); tone(380, .14, { type: "sine", vol: .06, slide: 950, pan: P(pan) }); },
    drip(i) { tone(620 + Math.min(i, 80) * 12, .05, { type: "sine", vol: .05 }); },
    // Đợt 395 (thầy: "mỗi nhịp đếm số có 1 tiếng Tích, càng về sau âm càng cao và âm
    // lượng càng lớn") — p = 0…1 through the count: pitch climbs an octave and a half,
    // volume ~4×. A short square click + a bright noise tick on top = "tích".
    countTick(p) {
      p = Math.max(0, Math.min(1, p || 0));
      const f = 900 * Math.pow(2, p * 1.5), vol = .035 + p * .11;
      tone(f, .045, { type: "square", vol });
      noise(.02, { vol: vol * .9, freq: 5200 + p * 2500 });
    },
    // the leading team's number grows — a short rising swell
    swell(pan) { tone(330, .38, { type: "triangle", vol: .08, slide: 990, pan: P(pan) }); noise(.3, { vol: .04, freq: 3000, pan: P(pan) }); },
    land() { tone(1047, .3, { type: "triangle", vol: .09 }); tone(1568, .42, { type: "triangle", vol: .06, at: .08 }); },
    dispose() { try { ctx && ctx.close(); } catch (e) {} ctx = null; }
  };
}

// ---------------------------------------------------------------
// ⭐ Đợt 390 (thầy, 25/9/2026) — SCORE TANK. While a game runs a score box shows no
// number, only a tank; a point FLIES in (`flyPoint`) and the tank reacts (`hit`).
// When time is up the tank DRAINS while its number counts up from 0 (`drain`) — the
// class holds its breath until the last drop.
// ⭐ Đợt 390b (thầy chọn mẫu 4 trong `D:\OTHERS\CLAUDE\AWord - thiet ke Wordshake\
// score-tank-mau.html`): an ENERGY BAR, not water — bright bands running across,
// scanlines, a neon top line that trembles; a point is a COMET with a tail, and when it
// lands a pulse sweeps both ways + sparks fly. ⛔ The level is the SAME for every team
// and every score (`FIXED`, thầy: "lượng nước luôn ở mức tương đương để không đoán được
// đội nào hơn cho đến khi chạy điểm") — only the drain tells the scores apart.
// Used by the GAME (always) and the template (Options ▸ Score tank). Self-contained:
// its CSS is injected once; drawn on a <canvas>, one shared rAF loop for all tanks.
//   createTank({ side, cls }) -> { el, hit(), set(), drain(final, ms, onStep), reset(), stop(), destroy(), level }
//   flyPoint(fromEl, toEl, text, side) -> Promise (resolves when the comet lands)
// ---------------------------------------------------------------
const FIXED = .62;
// ⭐ Đợt 459 (thầy, 4/10/2026) — the column's fall during the count: SLOW and TINY, the same for both.
// It used to drop in a jump per counted number and EMPTY (the lower team's tank stopped early, the
// leader's kept falling) — an easy way to read who is ahead. Now both tanks follow the SAME overall
// progress (`follow(n / hi)`) down by only DROP of the full height (≈ 6 % of the box), eased
// every frame (never a jump), and differ from each other by a random ≤ ±JITTER·p unrelated to the
// score. After the count `settle()` lets the level glide away (the numbers are final by then).
const DROP = .1, JITTER = .006;
const TEAM_C = [
  { c1: [125, 255, 178], c2: [14, 122, 67], glow: "61,245,138" },
  { c1: [143, 235, 255], c2: [12, 93, 134], glow: "55,215,255" }
];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const TANK_CSS = `
.wst{position:absolute;inset:3px;overflow:hidden;border-radius:3px;pointer-events:none;z-index:0}
.wst canvas{position:absolute;left:-12px;top:0;width:calc(100% + 24px);height:100%;display:block}
.wst-num{position:absolute;inset:0;display:grid;place-items:center;font:inherit;line-height:1;color:#fff;opacity:0;z-index:2;
  text-shadow:0 0 10px rgba(61,245,138,.9),0 0 2px #000;font-variant-numeric:tabular-nums}
.wst.wst-s1 .wst-num{text-shadow:0 0 10px rgba(55,215,255,.9),0 0 2px #000}
.wst.is-count .wst-num{opacity:1}
.wst-num.is-land{animation:wst-land .55s cubic-bezier(.22,.9,.3,1)}
@keyframes wst-land{0%{scale:1}35%{scale:1.5}100%{scale:1}}.wst-fly{position:fixed;z-index:9999;pointer-events:none;left:0;top:0;border-radius:50%;will-change:transform}
.wst-fly.is-head{width:10px;height:10px;margin:-5px 0 0 -5px;background:#fff;box-shadow:0 0 10px 3px rgba(61,245,138,.95),0 0 26px 8px rgba(61,245,138,.5)}
.wst-fly.is-head.s1{box-shadow:0 0 10px 3px rgba(55,215,255,.95),0 0 26px 8px rgba(55,215,255,.5)}
.wst-fly.is-tail{width:7px;height:7px;margin:-3.5px 0 0 -3.5px;background:rgba(155,255,196,.8);box-shadow:0 0 8px rgba(61,245,138,.8)}
.wst-fly.is-tail.s1{background:rgba(180,240,255,.8);box-shadow:0 0 8px rgba(55,215,255,.8)}
`;
function ensureTankCss() {
  if (typeof document === "undefined" || document.getElementById("ws-tank-css")) return;
  const st = document.createElement("style"); st.id = "ws-tank-css"; st.textContent = TANK_CSS;
  document.head.append(st);
}
/** Kept for older callers: the level no longer depends on the score. */
export function tankLevel() { return FIXED; }

const LIVE = new Set();
let rafOn = false, rafLast = 0;
function loop(now) {
  const dt = Math.min(.05, (now - rafLast) / 1000 || .016); rafLast = now;
  LIVE.forEach(t => { if (!t.el.isConnected) return; t.frame(dt); });
  if (LIVE.size) requestAnimationFrame(loop); else rafOn = false;
}
function wake() { if (!rafOn) { rafOn = true; rafLast = performance.now(); requestAnimationFrame(loop); } }

export function createTank({ side = 0, cls = "" } = {}) {
  ensureTankCss();
  const C = TEAM_C[side ? 1 : 0];
  const el = document.createElement("div");
  el.className = `wst wst-s${side ? 1 : 0} ${cls}`.trim();
  const cv = document.createElement("canvas");
  const num = document.createElement("span"); num.className = "wst-num";
  el.append(cv, num);
  const ctx = cv.getContext("2d");
  let level = FIXED, target = FIXED, ease = 2.2, off = (Math.random() - .5) * JITTER * 2;
  let energy = 0, time = Math.random() * 10, iv = null, W = 0, H = 0, dpr = 1;
  let pulses = [], sparks = [];
  // ⭐ Đợt 403 — the canvas is drawn at its ON-SCREEN size: a box scaled up by a transform
  // (the score boxes grow ×1.4–1.8 at the end) or a drawing scaled by fit() would stretch a
  // canvas sized from clientWidth and blur it. Height ratio (a skewX does not change it),
  // in ¼ steps so a growing box re-sizes the canvas a few times, not every frame.
  function fit() {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return false;
    const onScreen = cv.getBoundingClientRect().height / h || 1;
    const d = Math.min(4, Math.max(1, Math.round((window.devicePixelRatio || 1) * onScreen * 4) / 4));
    if (w !== W || h !== H || d !== dpr) {
      W = w; H = h; dpr = d;
      cv.width = Math.round(w * d); cv.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    return true;
  }
  function frame(dt) {
    time += dt; energy *= Math.pow(.18, dt);
    if (level !== target) { level += (target - level) * (1 - Math.exp(-dt * ease)); if (Math.abs(target - level) < .0004) level = target; }
    if (!fit()) return;
    const w = W, h = H;
    ctx.clearRect(0, 0, w, h);
    if (level <= .003) { sparks = []; pulses = []; return; }
    const base = h * (1 - level);
    const yAt = x => base + Math.sin(x * .09 + time * 9) * (.3 + energy * 1.8);
    const path = () => { ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += 2) ctx.lineTo(x, yAt(x)); ctx.lineTo(w, h); ctx.closePath(); };
    const g0 = ctx.createLinearGradient(0, base, 0, h);
    g0.addColorStop(0, rgba(C.c1, .83)); g0.addColorStop(1, rgba(C.c2, .86));
    ctx.fillStyle = g0; path(); ctx.fill();
    ctx.save(); path(); ctx.clip();
    for (let k = 0; k < 6; k++) {                       // bright bands running across
      const x = ((time * 55 + k * 47) % (w + 40)) - 20;
      const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, `rgba(255,255,255,${.12 + (k % 2) * .08})`); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 14, 0, 28, h);
    }
    ctx.fillStyle = "rgba(0,0,0,.14)";                  // scanlines
    for (let y = Math.floor(base); y < h; y += 3) ctx.fillRect(0, y, w, 1);
    pulses.forEach(p => {                               // the pulse a point sends both ways
      [-1, 1].forEach(dir => {
        const x = p.x + dir * p.r, g = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
        g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, `rgba(255,255,255,${p.a})`); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.fillRect(x - 18, 0, 36, h);
      });
      p.r += 420 * dt; p.a *= Math.pow(.15, dt);
    });
    pulses = pulses.filter(p => p.a > .03);
    ctx.restore();
    ctx.save(); ctx.beginPath();                        // the neon top line
    for (let x = 0; x <= w; x += 2) x ? ctx.lineTo(x, yAt(x)) : ctx.moveTo(x, yAt(x));
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.8; ctx.shadowColor = "#fff"; ctx.shadowBlur = 10; ctx.stroke(); ctx.restore();
    sparks.forEach(s => { s.vy += 140 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.6; });
    sparks = sparks.filter(s => s.life > 0);
    ctx.save(); ctx.shadowColor = rgba(C.c1, 1); ctx.shadowBlur = 8;
    sparks.forEach(s => { ctx.fillStyle = `rgba(255,255,255,${s.life})`; ctx.fillRect(s.x, s.y, 1.6, 1.6); });
    ctx.restore();
  }
  const T = {
    el, frame,
    get level() { return level; },
    /** a point just landed: a pulse sweeps both ways + sparks (the level does NOT move) */
    hit() {
      if (el.classList.contains("is-count")) return;
      energy = 1;
      const x = (W || 100) / 2, y = (H || 40) * (1 - level);
      pulses.push({ x, r: 0, a: .75 });
      for (let k = 0; k < 10; k++) sparks.push({ x, y, vx: (Math.random() - .5) * 180, vy: -30 - Math.random() * 80, life: 1 });
    },
    set() {},
    /** drain to empty over `ms` while the number counts 0 → final; onStep(n) per new number */
    drain(final, ms, onStep) {
      T.stop();
      final = Math.round(Number(final) || 0);
      el.classList.add("is-count");
      num.textContent = "0";
      const from = level, t0 = performance.now(), dur = Math.max(300, ms);
      let shown = 0;
      return new Promise(res => {
        const end = () => { clearInterval(iv); iv = null; level = target = 0; num.textContent = String(final); num.classList.remove("is-land"); void num.offsetWidth; num.classList.add("is-land"); res(final); };
        if (final <= 0) { num.textContent = String(final); return setTimeout(end, 300); }
        // setInterval, not rAF: a hidden pane freezes rAF and the count would never end
        iv = setInterval(() => {
          const t = Math.min(1, (performance.now() - t0) / dur);
          const e = 1 - Math.pow(1 - t, 2.2);          // slows down near the end — the suspense
          level = target = from * (1 - e);
          const n = Math.min(final, Math.floor(final * e + 1e-6));
          if (n !== shown) { shown = n; num.textContent = String(n); if (onStep) onStep(n); }
          if (t >= 1) end();
        }, 30);
      });
    },
    /** Đợt 395 — step-by-step count driven by the caller: show the number n. (Đợt 459: it no longer
     *  moves the level — `follow` does, for both tanks alike.) `landCount` then lands the number. */
    countTo(n, final) {
      T.stop();
      el.classList.add("is-count");
      num.textContent = String(n);
      energy = Math.max(energy, .6);
    },
    /** Đợt 459 — the level for the count's overall progress p (0…1), the same for every team: it eases
     *  toward FIXED·(1 − DROP·p) (+ a tiny random offset, nothing to do with the score). */
    follow(p) {
      p = Math.max(0, Math.min(1, Number(p) || 0));
      ease = 2.2; target = Math.max(0, FIXED * (1 - DROP * p) + off * p);
    },
    /** Đợt 459 — the count is over: the level glides away (the result screen has no tank). */
    settle() { ease = 5; target = 0; },
    // Đợt 395b (thầy): the number never pops (no scale up-and-down) while counting
    // or when it lands — only the leader's box grows, once (the game does that).
    landCount(final) {
      T.stop(); el.classList.add("is-count");
      num.textContent = String(final);
    },
    stop() { if (iv) { clearInterval(iv); iv = null; } },
    reset() { T.stop(); el.classList.remove("is-count"); num.classList.remove("is-land"); level = target = FIXED; ease = 2.2; off = (Math.random() - .5) * JITTER * 2; energy = 0; pulses = []; sparks = []; },
    destroy() { T.stop(); LIVE.delete(T); el.remove(); }
  };
  LIVE.add(T); wake();
  return T;
}

// The comet: a bright head with five ghosts behind it, on a gentle arc into the tank.
export function flyPoint(fromEl, toEl, text, side = 0) {
  ensureTankCss();
  return new Promise(res => {
    if (!fromEl || !toEl || !fromEl.isConnected || !toEl.isConnected) return res();
    const a0 = fromEl.getBoundingClientRect(), b0 = toEl.getBoundingClientRect();
    const a = [a0.left + a0.width / 2, a0.top + a0.height / 2], b = [b0.left + b0.width / 2, b0.top + b0.height * (1 - FIXED * .6)];
    const c = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 40];
    const frames = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14, v = 1 - u;
      frames.push({ transform: `translate(${v * v * a[0] + 2 * v * u * c[0] + u * u * b[0]}px,${v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]}px)` });
    }
    const opts = { duration: 480, easing: "cubic-bezier(.5,0,.8,.6)", fill: "forwards" };
    const s = side ? " s1" : "";
    const fly = (cls, delay, op, sc) => {
      const e = document.createElement("div"); e.className = "wst-fly " + cls + s;
      if (op != null) { e.style.opacity = String(op); e.style.scale = String(sc); }
      e.style.transform = frames[0].transform;
      document.body.append(e);
      return new Promise(r => {
        setTimeout(() => {
          const an = e.animate(frames, opts); let d = false;
          const fin = () => { if (d) return; d = true; e.remove(); r(); };
          an.onfinish = fin; setTimeout(fin, 700);   // a hidden tab may never finish it
        }, delay);
      });
    };
    for (let i = 1; i <= 5; i++) fly("is-tail", i * 28, 1 - i * .16, 1 - i * .12);
    fly("is-head", 0).then(res);
  });
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
