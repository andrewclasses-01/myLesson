// ============================================================
// js/tran.js — TRẬN A SHOW SPEED ONLINE 1–1 (đấu game online Đợt 2 · web v1.347.0, 15/10/2026)
// Giao diện = mẫu v1/v2 thầy duyệt (D:\OTHERS\CLAUDE\DAU GAME ONLINE - thiet ke\mau-v2\game.js): 2 khung —
// BÀN CHỮ CỦA EM + Ô CHUNG (từ vừa tìm + nghĩa, cột em | cột bạn). Skin + âm thanh + từ điển = game/ (chép AWord).
//
// Dữ liệu (luật: tools/dang-luat-tran-dau.js · hàm: myLesson/app/may-chu/functions/tran-dau.js):
//   tranDau/{id}            trangThai moi → nhan → choi (máy chủ: chu 16 chữ · batDau · ketThuc) → xong (kq · diem · ly)
//   tranDau/{id}/tu/{từ}    em gửi từ = TẠO tài liệu (một lần ⇒ ai trước được) · máy chủ chấm ok/d
//   tranDau/{id}/nhip/{uid} nhịp 10 giây · roi (rời trận) · xong (hết giờ ở máy em ⇒ máy chủ chốt)
// Giờ trận = giờ MÁY CHỦ: lệch đồng hồ đo bằng serverTimestamp lúc ghi nhịp đầu (memory "mốc giờ phải bù lệch").
// Bàn thử ?thu=1: đấu với MÁY (5–10 giây tìm một từ) — không ghi gì.
// ============================================================
import { loadDict, lookup, points, shuffle, wordsOn, createSfx, escapeHtml as esc } from "../game/ws-lib.js";

const q = new URLSearchParams(location.search);
const ID = q.get("id") || "";
const LV_TEN = { easy: "EASY", medium: "MEDIUM", hard: "HARD" };
const LAND = { W: 1280, H: 508, Y: 56, BH: 408, B: { x: 12, w: 420 }, C: { x: 448, w: 820 }, sA: 222, sB: 1063, clock: 640, sw: 220, T: 62, gap: 10, pv: 46, btn: 44, g2: 12, tools: 474 };
const PORT = { W: 420, H: 820, sA: 82, sB: 338, clock: 210, sw: 130, C: { x: 10, y: 92, w: 400, h: 262 }, B: { x: 10, y: 364, w: 400, h: 410 }, T: 68, gap: 9, pv: 40, btn: 42, g2: 10, tools: 784 };

const app = document.getElementById("tranApp");
app.innerHTML = `<div class="wsg"><div class="wsg-vp"><div class="wsg-cv"></div></div></div>`;
const root = app.firstChild, vp = root.querySelector(".wsg-vp"), cv = root.querySelector(".wsg-cv");
const sfx = createSfx();
let dict = null, L = LAND, port = false;

// trạng thái
const G = { phase: "tai", T: null, ben: "a", order: shuffle([...Array(16).keys()]), sel: [], ask: false, roi: false, pop: false, lastKey: "", note: "" };
let TU = new Map();          // từ → { uid, ok, luc }
let LECH = 0;                // giờ máy chủ − giờ máy em (ms)
let f = null, tranRef = null, toi = null, banThu = false;
let clockIv = null, nhipIv = null, cdIv = null, bot = null;
const now = () => Date.now() + LECH;

// ---------- khung vẽ ----------
function fit() {
  port = innerWidth / innerHeight < 0.85;
  L = port ? PORT : LAND;
  const s = Math.min((innerWidth - 16) / L.W, (innerHeight - 16) / L.H);
  vp.style.width = L.W * s + "px"; vp.style.height = L.H * s + "px";
  cv.style.width = L.W + "px"; cv.style.height = L.H + "px";
  cv.style.transform = `scale(${s})`;
}
addEventListener("resize", () => { const was = port; fit(); if (was !== port) render(); });
const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
const khac = () => (G.ben === "a" ? "b" : "a");
const uidBen = (k) => G.T && (k === "a" ? G.T.a : G.T.b);
const tenBen = (k) => (G.T ? (k === "a" ? G.T.tenA : G.T.tenB) : "") || "?";
const tat = (ten) => String(ten || "?").trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(-2);
const letters = () => (G.T && G.T.chu ? G.T.chu.split("") : []);

// ---------- điểm (từ chưa bị máy chủ loại = có điểm) ----------
function diemBen(k) {
  if (G.T && G.T.trangThai === "xong" && G.T.diem) return G.T.diem[k] || 0;
  const uid = uidBen(k); let s = 0;
  TU.forEach((x, w) => { if (x.uid === uid && x.ok !== false) s += points(w.length); });
  return s;
}
function dsTu() {   // mọi từ hợp lệ, mới nhất trước
  const a = []; TU.forEach((x, w) => { if (x.ok !== false) a.push({ w, uid: x.uid, luc: x.luc || 0 }); });
  return a.sort((p, q2) => q2.luc - p.luc);
}

// ---------- vòng đời ----------
async function batDau() {
  fit(); render();
  banThu = NW.laBanThu();
  try { dict = await loadDict(); } catch (e) { G.note = "Không tải được từ điển. Kiểm tra mạng rồi tải lại trang."; return render(); }
  if (banThu) return chayBanThu();
  toi = NW.toi;
  if (!ID) { G.note = "Không tìm thấy trận."; return render(); }
  f = await NW.fb();
  tranRef = f.fs.doc(f.db, "tranDau", ID);
  f.fs.onSnapshot(tranRef, (s) => {
    if (!s.exists()) { G.note = "Không tìm thấy trận."; return render(); }
    const T = s.data(); G.T = T; G.ben = T.a === toi.uid ? "a" : "b";
    if (toi.uid !== T.a && toi.uid !== T.b) { G.note = "Em không ở trong trận này."; G.phase = "loi"; return render(); }
    capNhatPha();
  }, () => { G.note = "Không đọc được trận (có thể em không ở trong trận này)."; G.phase = "loi"; render(); });
  f.fs.onSnapshot(f.fs.collection(tranRef, "tu"), (snap) => {
    const moi = new Map();
    snap.forEach((d) => { const x = d.data({ serverTimestamps: "estimate" }) || {}; moi.set(d.id, { uid: x.uid, ok: x.ok, luc: x.luc && x.luc.toMillis ? x.luc.toMillis() : 0 }); });
    // từ mới của BẠN ⇒ tiếng + nảy (từ của em đã kêu lúc bấm Enter)
    moi.forEach((x, w) => { if (!TU.has(w) && x.uid !== toi.uid && G.phase === "play") { sfx.ok(.65, points(w.length)); nayDiem(1); } });
    TU = moi;
    if (G.phase === "play" || G.phase === "count" || G.phase === "over") { veO(); veDiem(); }
  });
  // nhịp đầu: đo lệch đồng hồ với máy chủ
  await nhip({});
  nhipIv = setInterval(() => { if (G.phase === "play" || G.phase === "lobby") nhip({}); }, 10000);
}
async function nhip(them) {
  if (banThu || !tranRef) return;
  const r = f.fs.doc(tranRef, "nhip", toi.uid), t0 = Date.now();
  try {
    await f.fs.setDoc(r, Object.assign({ luc: Date.now(), sv: f.fs.serverTimestamp() }, them), { merge: true });
    if (!LECH) {
      const s = await f.fs.getDocFromServer(r), t1 = Date.now(), sv = s.data().sv;
      if (sv && sv.toMillis) LECH = sv.toMillis() - (t0 + t1) / 2;
    }
  } catch (e) { console.warn("[trận] nhịp", e); }
}
function capNhatPha() {
  const T = G.T, cu = G.phase;
  if (T.trangThai === "moi" || T.trangThai === "nhan") G.phase = "cho";
  else if (T.trangThai === "choi") G.phase = now() < T.batDau ? "lobby" : now() < T.ketThuc ? "play" : "count";
  else if (T.trangThai === "xong") G.phase = "over";
  else { G.phase = "loi"; G.note = { tuchoi: "Bạn đã từ chối lời mời.", huy: "Lời mời đã huỷ.", het: "Lời mời đã hết hạn." }[T.trangThai] || "Trận không còn."; }
  if (G.phase !== cu) vaoPha(cu);
  else if (G.phase === "over") render();
}
function vaoPha(cu) {
  clearInterval(cdIv); clearInterval(clockIv);
  if (G.phase === "lobby") { render(); cdIv = setInterval(() => { if (now() >= G.T.batDau) { capNhatPha(); } else renderCentre(); }, 200); return; }
  if (G.phase === "play") { render(); if (cu === "lobby" || cu === "cho" || cu === "tai") shake(); clockIv = setInterval(tick, 250); return; }
  if (G.phase === "count") {
    render(); root.classList.add("ending");
    // máy chủ chỉ chốt khi đã quá giờ hết + 2 giây (từ gửi trễ) ⇒ báo "xong" lúc +2,5 giây, nhắc lại lúc +9 giây nếu chưa có kết quả
    const cho = Math.max(0, (G.T.ketThuc || 0) + 2500 - now());
    setTimeout(() => { if (G.phase === "count") nhip({ xong: true }); }, cho);
    setTimeout(() => { if (G.phase === "count") nhip({ xong: true }); }, cho + 6500);
    return;
  }
  if (G.phase === "over") {
    root.classList.remove("ending"); render();
    const kq = ketQua(); if (kq === "thang") sfx.win(-.65);
    if (NW.ThachDau) NW.ThachDau.nghe();   // nhận lời "Đấu lại" của bạn
    return;
  }
  render();
}
let conCu = -1;
function tick() {
  if (G.phase !== "play") return;
  const con = Math.max(0, Math.ceil((G.T.ketThuc - now()) / 1000));
  if (now() >= G.T.ketThuc) { G.phase = "count"; return vaoPha("play"); }
  if (con !== conCu) {
    conCu = con;
    const c = cv.querySelector(".wsg-clock");
    if (c) { c.querySelector("span").textContent = fmt(con); c.classList.toggle("warn", con <= 10); }
    sfx.countdown(con);
  }
}
function ketQua() {
  const T = G.T;
  if (T && T.kq) return T.kq[G.ben];
  const a = diemBen(G.ben), b = diemBen(khac());
  return a > b ? "thang" : a < b ? "thua" : "hoa";
}
function shake() {
  const tiles = [...cv.querySelectorAll(".wsg-t")], real = tiles.map((t) => t.textContent);
  let n = 0; root.classList.add("shaking"); sfx.shake();
  const iv = setInterval(() => {
    tiles.forEach((t) => (t.textContent = "ABCDEEFGHIKLMNOOPRSTUWY"[(Math.random() * 23) | 0]));
    if (++n >= 14) { clearInterval(iv); root.classList.remove("shaking"); tiles.forEach((t, i) => (t.textContent = real[i])); }
  }, 50);
}

// ---------- gửi từ ----------
async function submit() {
  const chu = letters();
  const w = G.sel.map((k) => chu[G.order[k]]).join("").toLowerCase();
  if (!w) return;
  G.sel = []; renderBoard();
  if (!lookup(dict, w)) { sfx.bad(-.65); return bubble("bad", "?"); }
  if (TU.has(w)) { sfx.dup(-.65); return bubble("dup", TU.get(w).uid === myUid() ? "Found" : "Taken"); }
  const p = points(w.length);
  sfx.ok(-.65, p); bubble("ok", "+" + p);
  if (banThu) { TU.set(w, { uid: myUid(), ok: true, luc: Date.now() }); veO(); veDiem(); nayDiem(0); return; }
  try {
    await f.fs.setDoc(f.fs.doc(tranRef, "tu", w), { uid: toi.uid, luc: f.fs.serverTimestamp() });
    nayDiem(0);
  } catch (e) {
    // tạo trùng (bạn vừa lấy trước) hoặc quá giờ ⇒ luật từ chối
    bubble("dup", now() > (G.T.ketThuc || 0) ? "Time" : "Taken");
  }
}
const myUid = () => (banThu ? "toi" : toi.uid);

// ---------- vẽ ----------
function render() {
  const over = G.phase === "over", kq = over ? ketQua() : "";
  root.classList.toggle("asking", G.ask);
  const sw = L.sw, chipY = port ? 56 : 12;
  const live = G.phase === "play" || G.phase === "count" || over;
  const con = G.T && G.T.ketThuc ? Math.max(0, Math.ceil((G.T.ketThuc - Math.max(now(), G.T.batDau || 0)) / 1000)) : (G.T ? G.T.phut * 60 : 120);
  cv.innerHTML =
    `<div class="wsg-hudline" style="left:${port ? 8 : 12}px;width:${L.W - (port ? 16 : 24)}px"></div>` +
    `<div class="wsg-score ${over && kq === "thang" ? "lead" : ""}" style="left:${L.sA}px;width:${sw}px${port ? ";height:36px" : ""}"><b ${port ? 'style="font-size:26px"' : ""}>${live ? diemBen(G.ben) : 0}</b></div>` +
    `<div class="wsg-clock ${G.phase === "play" && con <= 10 ? "warn" : ""}" style="left:${L.clock}px${port ? ";width:104px;height:36px" : ""}"><span ${port ? 'style="font-size:22px"' : ""}>${fmt(con)}</span></div>` +
    `<div class="wsg-score s1 ${over && kq === "thua" ? "lead" : ""}" style="left:${L.sB}px;width:${sw}px${port ? ";height:36px" : ""}"><b ${port ? 'style="font-size:26px"' : ""}>${live ? diemBen(khac()) : 0}</b></div>` +
    chips(chipY) +
    (port && (over || G.phase === "loi")
      ? stageHtml({ x: L.C.x, y: L.C.y, w: L.C.w, h: L.B.y + L.B.h - L.C.y }, centreHtml(), null)
      : stageHtml(port ? L.C : { x: L.C.x, y: L.Y, w: L.C.w, h: L.BH }, centreHtml(), null) +
        stageHtml(port ? L.B : { x: L.B.x, y: L.Y, w: L.B.w, h: L.BH }, boardHtml(), 0)) +
    `<div class="wsg-tools" style="top:${L.tools}px;left:${port ? L.W / 2 : L.B.x + L.B.w / 2}px">` +
      `<button class="wsg-tool" data-do="home" aria-label="Rời trận"><span><svg class="i" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.53l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg></span></button>` +
      `<button class="wsg-tool ${sfx.on ? "" : "off"}" data-do="sound" aria-label="Âm thanh"><span><svg class="i" viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4V5Z"/>${sfx.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>' : '<path d="m22 9-6 6"/><path d="m16 9 6 6"/>'}</svg></span></button>` +
    `</div>` +
    (G.ask ? `<div class="wsg-ask"><div class="wsg-askbox"><div class="q">Leave the match?</div><div class="sub">${G.T && G.T.giai ? "You will lose this match (0 points)." : "You will lose this friendly match."}</div>` +
      `<div class="a"><button class="wsg-b clr" data-do="yes"><span>Leave</span></button><button class="wsg-b ent" data-do="no"><span>Stay</span></button></div></div></div>` : "");
}
function chips(y) {
  const me = tenBen(G.ben), ban = tenBen(khac());
  if (port) return `<div class="on-chip" style="left:16px;top:${y}px"><span class="on-av" style="width:24px;height:24px;font-size:10px">${esc(tat(me))}</span>You</div>` +
    `<div class="on-chip r" style="right:16px;top:${y}px"><span class="on-av" style="width:24px;height:24px;font-size:10px">${esc(tat(ban))}</span>${esc(ban)}</div>`;
  const half = L.sw / 2 + 16;
  return `<div class="on-chip" style="left:${L.sA + half}px"><span class="on-av">${esc(tat(me))}</span>You</div>` +
    `<div class="on-chip r" style="right:${L.W - L.sB + half}px"><span class="on-av">${esc(tat(ban))}</span>${esc(ban)}</div>`;
}
const stageHtml = (g, inner, side) => `<div class="wsg-stage" ${side != null ? `data-side="${side}"` : ""} style="left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px">${inner}</div>`;
function boardHtml() {
  const live = G.phase === "play" && !G.ask, show = live || G.phase === "count" || G.phase === "over";
  const chu = letters(), T = L.T, gap = L.gap, gw = T * 4 + gap * 3, fs = Math.round(T * 0.5);
  const tiles = [...Array(16).keys()].map((k) =>
    `<button class="wsg-t ${G.sel.includes(k) ? "on" : ""} ${show && chu.length ? "" : "idle"}" data-do="t" data-k="${k}" style="width:${T}px;height:${T}px;font-size:${fs}px" ${live ? "" : "disabled"}>${show && chu.length ? chu[G.order[k]] : "?"}</button>`).join("");
  const word = G.sel.map((k) => chu[G.order[k]]).join("");
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${L.g2}px;height:100%">
    <div class="wsg-pv" style="width:${gw}px;height:${L.pv}px;font-size:28px">${esc(word)}</div>
    <div style="display:grid;grid-template-columns:repeat(4,${T}px);gap:${gap}px">${tiles}</div>
    <div class="wsg-btn2" style="grid-template-columns:1fr 2fr;width:${gw}px">
      <button class="wsg-b clr" data-do="clr" style="height:${L.btn}px" ${live ? "" : "disabled"}><span>Clear</span></button>
      <button class="wsg-b ent" data-do="ent" style="height:${L.btn}px" ${live ? "" : "disabled"}><span>Enter</span></button>
    </div></div><div class="wsg-bubs"></div>`;
}
const arrow = (s) => `<span class="wsg-arr ${s ? "r" : "l"}"></span>`;
const centred = (t, s) => `<span class="wt">${s === 0 ? arrow(0) : ""}${t}${s === 1 ? arrow(1) : ""}</span>`;
function meta() {
  const T = G.T || {};
  const t = (T.phut || 2) + " MIN · " + (LV_TEN[T.lv] || "EASY");
  return (T.giai ? "TOURNAMENT" : "FRIENDLY") + " · " + t;
}
function centreHtml() {
  const T = G.T || {};
  if (G.phase === "tai" || G.phase === "cho" || G.phase === "loi")
    return `<div class="wsg-mid"><div class="wsg-logo">A SHOW <span>SPEED</span></div><div class="wsg-note">${esc(G.note || (G.phase === "cho" ? "Getting the letters ready…" : "Loading…"))}</div>` +
      (G.phase === "loi" ? `<div class="on-btns"><button class="wsg-b ent" data-do="back"><span>Back</span></button></div>` : "") + `</div>`;
  if (G.phase === "lobby") {
    const cd = Math.max(0, Math.ceil((T.batDau - now()) / 1000));
    return `<div class="wsg-mid"><div class="on-meta">${meta()}</div>
      <div class="on-vs" ${port ? 'style="gap:14px"' : ""}><div class="on-p l ${port ? "port" : ""}"><span class="on-av">${esc(tat(tenBen(G.ben)))}</span><b>${esc(tenBen(G.ben))}</b></div>
      <div class="on-x">VS</div>
      <div class="on-p r ${port ? "port" : ""}"><span class="on-av">${esc(tat(tenBen(khac())))}</span><b>${esc(tenBen(khac()))}</b></div></div>
      <div class="on-cd ${cd ? "" : "go"}">${cd > 3 ? "" : cd || "GO"}</div></div>`;
  }
  if (G.phase === "count") return `<div class="wsg-mid"><div class="wsg-logo">TIME'S <span>UP</span></div><div class="wsg-note">Checking the result…</div></div>`;
  if (G.phase === "over") {
    const kq = ketQua(), a = diemBen(G.ben), b = diemBen(khac()), ly = T.ly || "";
    const toiBo = (G.ben === "a" && /A$/.test(ly)) || (G.ben === "b" && /B$/.test(ly)), banBo = ly && !toiBo;
    const head = { thang: "YOU WIN", thua: toiBo ? (/^roi/.test(ly) ? "YOU LEFT" : "DISCONNECTED") : "YOU LOSE", hoa: "DRAW" }[kq];
    const pts = { thang: 2, hoa: 1, thua: 0 }[kq];
    const chu = letters();
    const missed = chu.length ? wordsOn(dict, chu, 4).filter((w) => !TU.has(w) && !dict.get(w).base && dict.get(w).lv >= 1)
      .sort((x, y) => y.length - x.length || dict.get(x).lv - dict.get(y).lv).slice(0, port ? 10 : 8) : [];
    return `<div class="wsg-mid on-res ${kq === "thua" ? "lose" : kq === "hoa" ? "draw" : ""}" style="gap:${port ? 16 : 12}px">
      <h2 ${port ? 'style="font-size:40px"' : ""}>${head}</h2>
      ${banBo ? `<div class="wsg-note">${esc(tenBen(khac()))} ${/^roi/.test(ly) ? "left the match" : "lost connection"}.</div>` : ""}
      <div class="on-sc"><span class="a">${a}</span><i>–</i><span class="b">${b}</span></div>
      <div class="on-pts">${T.giai ? `<span class="on-pill ${pts ? "gold" : "mute"}"><span>+${pts} ${pts === 1 ? "POINT" : "POINTS"}</span></span>` : `<span class="on-pill mute"><span>FRIENDLY · NO POINTS</span></span>`}</div>
      ${missed.length ? `<div class="wsg-lab">MISSED</div><div class="wsg-miss" ${port ? 'style="grid-template-columns:1fr"' : ""}>${missed.map((w) => `<div><b>${w.toUpperCase()}</b> <span>${esc(lookup(dict, w)?.m || "")}</span></div>`).join("")}</div>` : ""}
      <div class="on-btns"><button class="wsg-b ghost" data-do="back"><span>Back</span></button><button class="wsg-b ent" data-do="again"><span>Rematch</span></button></div></div>`;
  }
  // đang chơi: từ mới nhất to giữa + 2 cột
  const ds = dsTu(), f0 = ds[0];
  const side = (x) => (x.uid === myUid() ? 0 : 1);
  const key = f0 ? f0.w : "";
  const pop = key && key !== G.lastKey ? "wsg-pop" : ""; G.lastKey = key;
  const hit = f0 ? lookup(dict, f0.w) : null;
  const last = f0
    ? `<div class="wsg-last ${pop} sd${side(f0)}" ${port ? 'style="min-height:84px"' : ""}><div class="w" ${port ? 'style="font-size:40px"' : ""}>${centred(f0.w.toUpperCase(), side(f0))}</div>${hit && hit.m ? `<div class="m" ${port ? 'style="font-size:16px"' : ""}>${esc(hit.m)}</div>` : ""}${hit && hit.base ? `<div class="nt">form of ${esc(hit.base.toUpperCase())}</div>` : ""}</div>`
    : `<div class="wsg-last idle" ${port ? 'style="min-height:84px"' : ""}><div class="w">· · ·</div></div>`;
  const rows = (s) => ds.slice(1).filter((x) => side(x) === s).map((x) => { const h = lookup(dict, x.w); return `<li><b>${x.w.toUpperCase()}</b>${h && h.m ? `<span>${esc(h.m)}</span>` : ""}</li>`; }).join("");
  return `<div class="wsg-cen" ${port ? 'style="padding:10px 12px 8px;gap:6px"' : ""}>${last}<div class="on-cols">
    <div class="on-col c0"><h4>YOU</h4><ol>${rows(0)}</ol></div>
    <div class="on-col c1"><h4>${esc(tenBen(khac()).toUpperCase())}</h4><ol>${rows(1)}</ol></div></div></div>`;
}
function renderCentre() { const el = cv.querySelector(".wsg-stage:not([data-side])"); if (el) el.innerHTML = centreHtml(); }
function veO() { if (G.phase === "play" || G.phase === "count") renderCentre(); else if (G.phase === "over") render(); }
function veDiem() { const b = cv.querySelectorAll(".wsg-score b"); if (b.length === 2) { b[0].textContent = diemBen(G.ben); b[1].textContent = diemBen(khac()); } }
function nayDiem(i) { const box = cv.querySelectorAll(".wsg-score")[i]; if (box) { box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump"); } }
function renderBoard() {
  const el = cv.querySelector('[data-side="0"]'); if (!el) return render();
  const keep = el.querySelector(".wsg-bubs"); el.innerHTML = boardHtml();
  if (keep) el.querySelector(".wsg-bubs").replaceWith(keep);
}
function bubble(kind, sym) {
  const host = cv.querySelector('[data-side="0"] .wsg-bubs'); if (!host) return;
  const b = document.createElement("div"); b.className = "wsg-bub " + kind; b.innerHTML = `<i>${esc(sym)}</i>`;
  host.append(b); setTimeout(() => b.remove(), 1300);
}

// ---------- bấm ----------
cv.addEventListener("pointerdown", (e) => {
  sfx.unlock();
  const b = e.target.closest("[data-do]"); if (!b || b.disabled) return;
  const d = b.dataset.do;
  e.preventDefault();
  if (d === "home") { if (G.phase === "play" || G.phase === "lobby") { G.ask = true; return render(); } return veGiai(); }
  if (d === "no") { G.ask = false; return render(); }
  if (d === "yes") { G.ask = false; return roiTran(); }
  if (d === "sound") { sfx.on = !sfx.on; return render(); }
  if (d === "back") return veGiai();
  if (d === "again") return dauLai();
  if (G.phase !== "play" || G.ask) return;
  const chu = letters();
  if (d === "t") {
    const k = +b.dataset.k, i = G.sel.indexOf(k);
    if (i >= 0) { G.sel.splice(i, 1); sfx.untap(-.65); } else { G.sel.push(k); sfx.tap(-.65); }
    renderBoard();
  } else if (d === "clr") { if (G.sel.length) sfx.clear(-.65); G.sel = []; renderBoard(); }
  else if (d === "ent") submit();
});
addEventListener("keydown", (e) => {
  if (G.phase !== "play" || G.ask) return;
  if (e.key === "Enter") return submit();
  if (e.key === "Backspace") { G.sel.pop(); return renderBoard(); }
  if (e.key === "Escape") { G.sel = []; return renderBoard(); }
  const ch = e.key.length === 1 ? e.key.toUpperCase() : "";
  if (!/^[A-Z]$/.test(ch)) return;
  const chu = letters();
  const k = [...Array(16).keys()].find((k2) => !G.sel.includes(k2) && chu[G.order[k2]] === ch);
  if (k != null) { G.sel.push(k); sfx.tap(-.65); renderBoard(); }
});
function veGiai() { NW.di("giaidau.html"); }
async function roiTran() {
  if (banThu) { G.T.trangThai = "xong"; G.T.kq = { a: "thua", b: "thang" }; G.T.ly = "roiA"; G.T.diem = { a: diemBen("a"), b: diemBen("b") }; clearTimeout(bot); G.phase = "over"; return vaoPha("play"); }
  G.roi = true; G.note = "";
  await nhip({ roi: true });   // máy chủ chốt ngay: em thua
}
async function dauLai() {
  const T = G.T || {};
  const ban = { uid: uidBen(khac()), ten: tenBen(khac()) };
  if (banThu) return NW.ThachDau.moi(ban, { lop: "A1C", giai: "" });
  let tenGiai = "";
  if (T.giai) { try { const g = await f.fs.getDoc(f.fs.doc(f.db, "giaiDau", T.giai)); tenGiai = g.exists() ? g.data().ten : ""; } catch (e) { } }
  NW.ThachDau.moi(ban, { lop: T.lop, giai: T.giai || "", phut: T.phut, lv: T.lv, tenGiai });
}

// ---------- bàn thử: đấu với máy ----------
let dangChot = false;
function chayBanThu() {
  const phut = +q.get("phut") || 2, lv = q.get("lv") || "easy";
  const chu = "EAIDTFJRNULHGPEG".split("");
  G.ben = "a";
  G.T = { a: "toi", b: "may", tenA: "BẠN THỬ", tenB: q.get("ban") || "Gia Bảo", giai: q.get("giai") ? "thu" : "", phut, lv, chu: chu.join(""),
    trangThai: "choi", batDau: Date.now() + 4000, ketThuc: Date.now() + 4000 + phut * 60000 };
  const pool = shuffle(wordsOn(dict, chu, 2).filter((w) => w.length <= 5));
  const nuoc = () => {
    bot = setTimeout(() => {
      if (G.phase === "play") {
        while (pool.length && TU.has(pool[0])) pool.shift();
        const w = pool.shift();
        if (w) { TU.set(w, { uid: "may", ok: true, luc: Date.now() }); sfx.ok(.65, points(w.length)); veO(); veDiem(); nayDiem(1); }
      }
      if (G.phase !== "over") nuoc();
    }, 5000 + Math.random() * 5000);
  };
  nuoc();
  capNhatPha();
  setInterval(() => {
    if (G.phase === "lobby" || G.phase === "play") capNhatPha();
    if (G.phase === "count" && !dangChot) {
      dangChot = true;
      setTimeout(() => { const a = diemBen("a"), b = diemBen("b"); G.T.diem = { a, b }; G.T.kq = { a: a > b ? "thang" : a < b ? "thua" : "hoa", b: a > b ? "thua" : a < b ? "thang" : "hoa" }; G.T.trangThai = "xong"; capNhatPha(); }, 1500);
    }
  }, 500);
}

// phiên đăng nhập (không vẽ thanh trên — trận chiếm cả màn) rồi mới vào trận
NW.dungThanh({ tab: "khamPha", hop: true }).then(batDau);
