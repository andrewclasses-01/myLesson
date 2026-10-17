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
//
// ⭐ v1.351.0 (15/10/2026 tối, thầy) — hai việc mới:
//   1. GIẢI CÓ BỘ TỪ (thầy chọn act AWord WORDS + tuỳ chọn như Fight): máy chủ gửi bàn ĐANG CHƠI (chu · goi[{m, n}] · bam ·
//      tim · van/soVan · che one|list|free · chiBo). Ô giữa hiện GỢI Ý các từ của bàn (lật ra khi có người tìm); tìm hết ⇒
//      máy chủ đổi bàn (chữ xáo lại, rung). Từ gửi lên = `tu/{từ}_{van}`. Máy em so BĂM (sha256(id:TỪ)) để báo đúng/sai
//      ngay — giống máy chủ (tran-dau.js `bam`). One/List: +1 mỗi từ · Free: điểm×2; Free tắt "Word list only" ⇒ từ điển.
//      Word list = ô như PHÍM (bấm lại được). One word: 8/12/16 ô.
//   2. THEO DÕI (?xem=1, hoặc mở trận không phải của mình): bạn cùng lớp / thầy xem trực tiếp — không bàn chữ, ô giữa
//      trải rộng (cột tên A | cột tên B), điểm 2 bên, không ghi gì. Luật: tools/dang-luat-giai-dau-bo.js (bạn cùng lớp đọc tu).
// Bàn thử: ?thu=1&che=one|list|free (bộ từ mẫu) · &xem=1 (xem 2 máy đấu nhau).
// ⭐ v1.352.0 — GỢI Ý LẬT CHỮ (y AWord Fight): 15 giây không ai tìm thêm từ ⇒ máy em XIN máy chủ một bước (`tu/zg<bước>_<van>`, hai máy
//   cùng xin thì máy sau trượt vì tài liệu đã có); máy chủ lật thêm 1 chữ của từ ngắn nhất (goiY {i,k,chu}); lật hết = bỏ từ (tim '-',
//   hien[i] = TỪ). Vạch mảnh dưới đầu bảng gợi ý chạy 15 giây. GIỌNG ĐỌC (giải bật): gợi ý ẩn chữ, nút loa phát clip voiceClips/{id};
//   One word tự đọc khi sang bàn.
// ============================================================
import { loadDict, lookup, points, shuffle, wordsOn, createSfx, escapeHtml as esc } from "../game/ws-lib.js";
import { taoXem } from "./xem.js?v=1";   // ⭐ v1.361.0 — người xem: avatar · bình luận · tim (mẫu mau-xem-v1)

const q = new URLSearchParams(location.search);
const ID = q.get("id") || "";
const XEM = q.get("xem") === "1";
// ⭐ THẦY GIAO HỮU (16/10/2026, web v1.360.0 — mẫu thầy duyệt: D:\OTHERS\CLAUDE\DAU GAME ONLINE - thiet ke\mau-thay-v1) — trận của thầy
//   mang `gv` = uid thầy. Màn của THẦY (laGv) thấy sẵn đáp án màu xanh dương nhạt (gõ tự do: mọi từ của 16 chữ dễ → khó trong cột thầy;
//   One word: từ đang tới xanh, từ sau xám; Word list / Free words: bảng giữa), bấm một từ là lấy luôn (y như gõ đúng). Màn học sinh KHÔNG đổi.
//   Đáp án bộ từ: tranDau/{id}/may/ke (luật: chỉ thầy đọc). Bàn thử: ?thu=1&vai=thay|hs (thầy đấu Gia Bảo) · &dong=1 (khung mẹ 2 màn) · &t0 · &seed
const VAI = ["hs", "thay", "xem"].includes(q.get("vai")) ? q.get("vai") : "";
const DONG = q.get("dong") === "1";
// ⭐ v1.372.0 — LUYỆN TẬP với MÁY (hộp ⚔ trong chat lớp, mẫu mau-v9-chat-dau): ?luyen=1&may=1|2|3&phut=2|3|5&bo=n|g&giai=<id>&lop=<mã lớp>
//   Chạy hoàn toàn ở máy em (cùng bộ máy với bàn thử: không tạo tranDau, không gọi máy chủ, không ghi điểm/lịch sử); bo=g lấy bộ từ của giải.
const LUYEN = q.get("luyen") === "1";
const guiMe = (m) => { if (DONG) parent.postMessage(Object.assign({ mauThay: 1, tu: VAI }, m), "*"); };
const LV_TEN = { easy: "EASY", medium: "MEDIUM", hard: "HARD" };
const CHE_TEN = { one: "ONE WORD", list: "WORD LIST", free: "FREE WORDS" };
const LAND = { W: 1280, H: 508, Y: 56, BH: 408, B: { x: 12, w: 420 }, C: { x: 448, w: 820 }, sA: 222, sB: 1063, clock: 640, sw: 220, T: 62, gap: 10, pv: 46, btn: 44, g2: 12, tools: 474 };
const PORT = { W: 420, H: 820, sA: 82, sB: 338, clock: 210, sw: 130, C: { x: 10, y: 92, w: 400, h: 262 }, B: { x: 10, y: 364, w: 400, h: 410 }, T: 68, gap: 9, pv: 40, btn: 42, g2: 10, tools: 784 };

const app = document.getElementById("tranApp");
app.innerHTML = `<div class="wsg"><div class="wsg-vp"><div class="wsg-cv"></div></div></div>`;
const root = app.firstChild, vp = root.querySelector(".wsg-vp"), cv = root.querySelector(".wsg-cv");
const sfx = createSfx();
let dict = null, L = LAND, port = false;

// trạng thái
const G = { phase: "tai", T: null, ben: "a", order: shuffle([...Array(16).keys()]), sel: [], ask: false, roi: false, pop: false, lastKey: "", note: "", xem: XEM, van: -1, n: 16, xinGoi: {} };
const GOI_MS = 15000;
let TU = new Map();          // tên tài liệu từ → { w, v, uid, ok, d, i, m, luc }
let LECH = 0;                // giờ máy chủ − giờ máy em (ms)
let f = null, tranRef = null, toi = null, banThu = false;
let clockIv = null, nhipIv = null, cdIv = null, bot = null;
const now = () => Date.now() + LECH;
// ⭐ v1.361.0 (16/10/2026 chiều, thầy) — lớp NGƯỜI XEM (js/xem.js) nằm trên khung trận: dải ĐANG XEM (avatar), bình luận, tim mỗi bên
const XM = taoXem({ vp, esc, tenBen: (k) => tenBen(k), ben: () => G.ben, laXem: () => G.xem, gui: (m) => guiMe(m),
  toi: () => toiXem() });
const toiXem = () => (banThu ? { uid: "xem_kl", ten: "Khánh Linh" } : { uid: toi.uid, ten: toi.laThay ? "Thầy Andrew" : toi.ten, anh: toi.anh || (toi.laThay ? "assets/avatar-tron.jpg" : ""), gv: !!toi.laThay });
// ⭐ v1.361.0 — AVATAR THẬT của hai người chơi: nwUsers/{uid}.anh (đọc một lần, napAnh); thầy chưa có ảnh ⇒ assets/avatar-tron.jpg
const anhBen = (k) => (G.anh && G.anh[k]) || (G.T && (k === "a" ? G.T.anhA : G.T.anhB)) || "";
const avOn = (k, st) => { const a = anhBen(k); return `<span class="on-av${a ? " anh" : ""}" style="${st || ""}${a ? `;background:#0B2A1C url('${esc(a)}') center/cover no-repeat` : ""}">${a ? "" : esc(tat(tenBen(k)))}</span>`; };

// ---------- khung vẽ ----------
function fit() {
  port = innerWidth / innerHeight < 0.85;
  L = port ? PORT : LAND;
  const s = Math.min((innerWidth - 16) / L.W, (innerHeight - 16) / L.H);
  vp.style.width = L.W * s + "px"; vp.style.height = L.H * s + "px";
  cv.style.width = L.W + "px"; cv.style.height = L.H + "px";
  cv.style.transform = `scale(${s})`;
  XM.dat(L, s, port);
}
addEventListener("resize", () => { const was = port; fit(); if (was !== port) render(); });
const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
const khac = () => (G.ben === "a" ? "b" : "a");
const uidBen = (k) => G.T && (k === "a" ? G.T.a : G.T.b);
const tenBen = (k) => (G.T ? (k === "a" ? G.T.tenA : G.T.tenB) : "") || "?";
const tat = (ten) => String(ten || "?").trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(-2);
const letters = () => (G.T && G.T.chu ? G.T.chu.split("") : []);
const che = () => (G.T && G.T.che) || "";              // "" = A Show Speed 16 chữ ngẫu nhiên (như cũ)
const vanNay = () => (G.T && G.T.van) || 0;
const laPhim = () => che() === "list";                // Word list: ô như phím, bấm lại được
// ⭐ thầy giao hữu — em (người đang xem màn này) là THẦY trong trận của thầy
const laGv = () => !!(G.T && G.T.gv && !G.xem && G.T.gv === uidBen(G.ben));
// đáp án cả bộ cho thầy (thật: tranDau/{id}/may/ke — luật cho thầy đọc; mẫu: bộ mẫu) · danh sách từ của 16 chữ (gõ tự do)
const keGv = () => (banThu ? KE_THU : G.keGv || []);
let DS_GV = null, DS_GV_KEY = "";
function dsGv() {   // mọi từ ghép được từ 16 chữ, DỄ → KHÓ (cấp từ điển ↑, rồi ngắn → dài, rồi a→z)
  const chu = letters(), key = chu.join("");
  if (key !== DS_GV_KEY) {
    DS_GV_KEY = key;
    DS_GV = dict && chu.length ? wordsOn(dict, chu, 6).filter((w) => lookup(dict, w))
      .sort((x, y) => dict.get(x).lv - dict.get(y).lv || x.length - y.length || (x < y ? -1 : 1)) : [];
  }
  return DS_GV;
}
// tên tài liệu từ: trận có bộ từ mang đuôi bàn
const tenTu = (w) => (che() ? w + "_" + vanNay() : w);
function tachTen(id) { const m = /^([a-z]+)(?:_(\d+))?$/.exec(id) || []; return { w: m[1] || id, v: m[2] != null ? +m[2] : -1 }; }
const diemBai = (up) => (che() === "free" ? points(Math.min(7, Math.max(3, up.length))) * 2 : 1);
// băm như máy chủ (tran-dau.js `bam`): sha256(id + ':' + TỪ) → 16 ký tự hex đầu
async function bamTu(up) {
  const id = banThu ? "thu" : ID;
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id + ":" + up));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

// ---------- điểm ----------
function diemBen(k) {
  if (G.T && G.T.trangThai === "xong" && G.T.diem) return G.T.diem[k] || 0;
  // trận có bộ từ: điểm máy chủ cộng (diem.a/b tăng ngay khi chấm)
  if (che()) return (G.T && G.T.diem && G.T.diem[k]) || 0;
  const uid = uidBen(k); let s = 0;
  TU.forEach((x) => { if (x.uid === uid && x.ok !== false) s += x.d != null && x.ok ? x.d : points(x.w.length); });
  return s;
}
function dsTu() {   // mọi từ hợp lệ, mới nhất trước (trận có bộ từ: chỉ từ máy chủ đã nhận)
  const a = []; TU.forEach((x) => { if (che() ? x.ok === true : x.ok !== false) a.push(x); });
  return a.sort((p, q2) => q2.luc - p.luc);
}

// ---------- vòng đời ----------
async function batDau() {
  fit(); render();
  banThu = NW.laBanThu() || LUYEN;
  try { dict = await loadDict(); } catch (e) { G.note = "Không tải được từ điển. Kiểm tra mạng rồi tải lại trang."; return render(); }
  if (banThu) return chayBanThu();
  toi = NW.toi;
  if (!ID) { G.note = "Không tìm thấy trận."; return render(); }
  f = await NW.fb();
  tranRef = f.fs.doc(f.db, "tranDau", ID);
  let ngheTu = false;
  f.fs.onSnapshot(tranRef, (s) => {
    if (!s.exists()) { G.note = "Không tìm thấy trận."; return render(); }
    const T = s.data(); G.T = T;
    const laNguoiChoi = toi.uid === T.a || toi.uid === T.b;
    // ⭐ v1.351.0 — không phải người trong trận ⇒ XEM (bạn cùng lớp / thầy — luật đã cho đọc mới tới được đây)
    if (!laNguoiChoi || XEM) G.xem = true;
    G.ben = G.xem ? "a" : (T.a === toi.uid ? "a" : "b");
    if (!ngheTu) {
      ngheTu = true; ngheDsTu(); if (!G.xem) { batNhip(); batDangDau(); }
      napAnh(T);
      XM.noiKho({ f, ref: tranRef, toi: toiXem(), laXem: G.xem });
    }
    doiBan();
    napKeGv();
    capNhatPha();
    if (G.phase === "play" || G.phase === "count") veDiem();
  }, () => { G.note = "Không đọc được trận (có thể trận không thuộc lớp của em)."; G.phase = "loi"; render(); });
}
// ⭐ v1.361.0 — ảnh thật hai người chơi (một lần mỗi trận)
async function napAnh(T) {
  const anh = {};
  await Promise.all(["a", "b"].map(async (k) => {
    const uid = k === "a" ? T.a : T.b;
    try { const s = await f.fs.getDoc(f.fs.doc(f.db, "nwUsers", uid)); anh[k] = (s.exists() && s.data().anh) || ""; } catch (e) { anh[k] = ""; }
    if (!anh[k] && T.gv && uid === T.gv) anh[k] = "assets/avatar-tron.jpg";
  }));
  G.anh = anh; render();
}
// ⭐ v1.361.0 — ĐANG ĐẤU: còn mở tab trận ⇒ nhịp tdDangDau/{em} 30 giây (hộp mời ⚔ của người khác hiện "Đang đấu", không mời được).
//   Hết trận vẫn tính là đang đấu tới khi rời tab — hai bạn còn bấm Đấu lại được với nhau. Rời trang ⇒ xoá.
function batDangDau() {
  if (banThu || !toi || !toi.uid) return;
  const ref = f.fs.doc(f.db, "tdDangDau", toi.uid);
  const ghi = () => f.fs.setDoc(ref, { id: ID, luc: Date.now() }).catch((e) => console.warn("[trận] đang đấu", e));
  ghi(); setInterval(ghi, 30000);
  addEventListener("pagehide", () => { f.fs.deleteDoc(ref).catch(() => { }); });
}
// ⭐ thầy giao hữu — THẦY đọc kế hoạch bàn (đáp án) một lần khi trận có bộ từ đã xếp (máy chủ ghi may/ke cùng lúc với trangThai 'choi')
let _keGvDang = false;
function napKeGv() {
  if (banThu || G.keGv || _keGvDang || !laGv() || !che() || !tranRef) return;
  _keGvDang = true;
  f.fs.getDoc(f.fs.doc(tranRef, "may", "ke")).then((s) => { G.keGv = (s.exists() && s.data().ds) || null; if (G.keGv) renderCentre(); })
    .catch((e) => console.warn("[trận] đáp án thầy", e)).finally(() => { _keGvDang = false; });
}
function ngheDsTu() {
  f.fs.onSnapshot(f.fs.collection(tranRef, "tu"), (snap) => {
    const moi = new Map();
    snap.forEach((d) => {
      const x = d.data({ serverTimestamps: "estimate" }) || {}, t = tachTen(d.id);
      moi.set(d.id, { w: t.w, v: x.v != null ? x.v : t.v, uid: x.uid, ok: x.ok, d: x.d, i: x.i, m: x.m || "", luc: x.luc && x.luc.toMillis ? x.luc.toMillis() : 0 });
    });
    // từ mới của BẠN (xem: của cả hai) ⇒ tiếng + nảy (từ của em đã kêu lúc bấm Enter)
    moi.forEach((x, id) => {
      const cu = TU.get(id), daNhan = che() ? x.ok === true && !(cu && cu.ok === true) : !cu;
      if (daNhan && (G.xem || x.uid !== toi.uid) && G.phase === "play") {
        const ben = x.uid === uidBen(G.ben) ? 0 : 1;
        sfx.ok(ben ? .65 : -.65, x.d || points(x.w.length)); nayDiem(ben);
      }
    });
    TU = moi;
    if (G.phase === "play" || G.phase === "count" || G.phase === "over") { veO(); veDiem(); }
  }, () => { G.loiTu = true; if (G.phase === "play") renderCentre(); });
}
async function batNhip() {
  // nhịp đầu: đo lệch đồng hồ với máy chủ
  await nhip({});
  nhipIv = setInterval(() => { if (G.phase === "play" || G.phase === "lobby") nhip({}); }, 10000);
}
async function nhip(them) {
  if (banThu || !tranRef || G.xem) return;
  const r = f.fs.doc(tranRef, "nhip", toi.uid), t0 = Date.now();
  try {
    await f.fs.setDoc(r, Object.assign({ luc: Date.now(), sv: f.fs.serverTimestamp() }, them), { merge: true });
    if (!LECH) {
      const s = await f.fs.getDocFromServer(r), t1 = Date.now(), sv = s.data().sv;
      if (sv && sv.toMillis) LECH = sv.toMillis() - (t0 + t1) / 2;
    }
  } catch (e) { console.warn("[trận] nhịp", e); }
}
// ⭐ v1.351.0 — bàn mới (chữ khác / số ô khác) ⇒ xáo vị trí riêng của em, bỏ chữ đang chọn, rung bàn
function doiBan() {
  const n = letters().length || 16, v = vanNay();
  if (v === G.van && n === G.n) return;
  const dau = G.van < 0;
  G.van = v; G.n = n; G.order = shuffle([...Array(n).keys()]); G.sel = [];
  if (!dau && G.phase === "play") { render(); shake(); sfx.shake(); }
  // One word + giọng đọc: tự đọc gợi ý của bàn mới (lần đầu đợi màn đếm ngược xong — xem vaoPha)
  if (!dau && G.T.giong && G.T.che === "one") docGiong(((G.T.goi || [])[0] || {}).v);
}
// ⭐ v1.352.0 — GIỌNG ĐỌC: clip ở voiceClips/{id} (audio = data URL, ai cũng đọc được); đệm theo id
const CLIP = new Map();
let amDang = null;
async function docGiong(id) {
  if (!id || !sfx.on) return;
  try {
    if (!CLIP.has(id)) {
      if (banThu || !f) return;
      const s = await f.fs.getDoc(f.fs.doc(f.db, "voiceClips", id));
      CLIP.set(id, s.exists() ? s.data().audio || "" : "");
    }
    const url = CLIP.get(id); if (!url) return;
    if (amDang) amDang.pause();
    amDang = new Audio(url); await amDang.play();
  } catch (e) { console.warn("[trận] giọng đọc", e); }
}
// ⭐ v1.352.0 — GỢI Ý: đủ 15 giây không tiến triển ⇒ xin máy chủ lật một chữ (mỗi bước xin lại sau 3 giây nếu chưa thấy máy chủ đổi)
const maBuoc = (n) => String.fromCharCode(97 + (Math.floor(n / 26) % 26)) + String.fromCharCode(97 + (n % 26));
function xinGoi() {
  const T = G.T;
  if (!che() || !T.goiYBat || G.xem || banThu || !tranRef) return;
  if (now() - (T.moc || T.batDau || 0) < GOI_MS) return;
  const n = T.soGoi || 0, key = vanNay() + ":" + n;
  if (G.xinGoi[key] && Date.now() - G.xinGoi[key] < 3000) return;
  G.xinGoi[key] = Date.now();
  f.fs.setDoc(f.fs.doc(tranRef, "tu", "zg" + maBuoc(n) + "_" + vanNay()), { uid: toi.uid, luc: f.fs.serverTimestamp() }).catch(() => { });
}
// vạch gợi ý: chạy đầy trong 15 giây kể từ lần tiến triển cuối (sửa tại chỗ mỗi nhịp, không vẽ lại)
function veVachGoi() {
  const v = cv.querySelector(".td-vach i"); if (!v || !G.T) return;
  v.style.width = Math.min(100, Math.max(0, (now() - (G.T.moc || G.T.batDau || 0)) / GOI_MS * 100)) + "%";
}
function capNhatPha() {
  const T = G.T, cu = G.phase;
  if (T.trangThai === "moi" || T.trangThai === "nhan") G.phase = "cho";
  else if (T.trangThai === "choi") G.phase = now() < T.batDau ? "lobby" : now() < T.ketThuc ? "play" : "count";
  else if (T.trangThai === "xong") G.phase = "over";
  else { G.phase = "loi"; G.note = { tuchoi: "Bạn đã từ chối lời mời.", huy: "Lời mời đã huỷ.", het: "Lời mời đã hết hạn." }[T.trangThai] || "Trận không còn."; }
  if (G.phase !== cu) vaoPha(cu);
  else if (G.phase === "over") render();
  else if (G.phase === "play" && che()) renderCentre();   // gợi ý lật / bàn đổi
}
function vaoPha(cu) {
  clearInterval(cdIv); clearInterval(clockIv);
  if (G.phase === "lobby") { render(); cdIv = setInterval(() => { if (now() >= G.T.batDau) { capNhatPha(); } else renderCentre(); }, 200); return; }
  if (G.phase === "play") {
    render(); if (cu === "lobby" || cu === "cho" || cu === "tai") shake(); clockIv = setInterval(tick, 250);
    if (G.T.giong && G.T.che === "one" && cu !== "play") docGiong(((G.T.goi || [])[0] || {}).v);
    return;
  }
  if (G.phase === "count") {
    render(); root.classList.add("ending");
    if (G.xem) return;
    // máy chủ chỉ chốt khi đã quá giờ hết + 2 giây (từ gửi trễ) ⇒ báo "xong" lúc +2,5 giây, nhắc lại lúc +9 giây nếu chưa có kết quả
    const cho = Math.max(0, (G.T.ketThuc || 0) + 2500 - now());
    setTimeout(() => { if (G.phase === "count") nhip({ xong: true }); }, cho);
    setTimeout(() => { if (G.phase === "count") nhip({ xong: true }); }, cho + 6500);
    return;
  }
  if (G.phase === "over") {
    root.classList.remove("ending"); render();
    const kq = ketQua(); if (kq === "thang" || G.xem) sfx.win(-.65);
    if (!G.xem && NW.ThachDau) NW.ThachDau.nghe();   // nhận lời "Đấu lại" của bạn
    return;
  }
  render();
}
let conCu = -1;
function tick() {
  if (G.phase !== "play") return;
  const con = Math.max(0, Math.ceil((G.T.ketThuc - now()) / 1000));
  if (now() >= G.T.ketThuc) { G.phase = "count"; return vaoPha("play"); }
  if (che() && G.T.goiYBat) { veVachGoi(); xinGoi(); }
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
  if (che()) return submitBo(w);
  if (!lookup(dict, w)) { sfx.bad(-.65); return bubble("bad", "?"); }
  if (TU.has(w)) { sfx.dup(-.65); return bubble("dup", TU.get(w).uid === myUid() ? "Found" : "Taken"); }
  const p = points(w.length);
  sfx.ok(-.65, p); bubble("ok", "+" + p);
  if (banThu) return apTu(w, myUid(), true);
  try {
    await f.fs.setDoc(f.fs.doc(tranRef, "tu", w), { uid: toi.uid, luc: f.fs.serverTimestamp() });
    nayDiem(0);
  } catch (e) {
    // tạo trùng (bạn vừa lấy trước) hoặc quá giờ ⇒ luật từ chối
    bubble("dup", now() > (G.T.ketThuc || 0) ? "Time" : "Taken");
  }
}
// ⭐ v1.351.0 — gửi một từ ở trận có bộ từ
async function submitBo(w) {
  const T = G.T, up = w.toUpperCase(), v = vanNay();
  const i = (T.bam || []).indexOf(await bamTu(up));
  const tim = T.tim || {};
  let p;
  if (i >= 0) {
    if (tim[i]) { sfx.dup(-.65); return bubble("dup", tim[i] === myUid() ? "Found" : "Taken"); }
    p = diemBai(up);
  } else if (che() === "free" && !T.chiBo) {
    if (w.length < 3 || !lookup(dict, w)) { sfx.bad(-.65); return bubble("bad", "?"); }
    if (TU.has(tenTu(w))) { sfx.dup(-.65); return bubble("dup", TU.get(tenTu(w)).uid === myUid() ? "Found" : "Taken"); }
    p = points(w.length);
  } else { sfx.bad(-.65); return bubble("bad", "?"); }
  sfx.ok(-.65, p); bubble("ok", "+" + p);
  if (banThu) return apTu(w, myUid(), true);
  try {
    await f.fs.setDoc(f.fs.doc(tranRef, "tu", tenTu(w)), { uid: toi.uid, luc: f.fs.serverTimestamp() });
    nayDiem(0);
  } catch (e) { bubble("dup", now() > (T.ketThuc || 0) ? "Time" : "Taken"); }
}
const myUid = () => (banThu ? (G.xem ? "may2" : (toi && toi.uid) || "toi") : G.xem ? (G.T && G.T.a) : toi.uid);

// ⭐ thầy giao hữu — THẦY BẤM MỘT TỪ trong danh sách / bảng giữa ⇒ lấy luôn, y như gõ đúng rồi Enter
//   (thật: cùng một cổng — tạo tài liệu tu/{từ}; máy chủ chấm như thường, bên kia "Taken")
async function layTu(w) {
  if (G.phase !== "play" || G.ask || !laGv()) return;
  w = String(w || "").toLowerCase();
  let p;
  if (che()) {
    const up = w.toUpperCase(), i = (G.T.bam || []).indexOf(await bamTu(up));
    if (i < 0 || (G.T.tim || {})[i]) { sfx.dup(-.65); return bubble("dup", "Taken"); }
    p = diemBai(up);
  } else {
    if (TU.has(w)) { sfx.dup(-.65); return bubble("dup", "Taken"); }
    p = points(w.length);
  }
  G.sel = []; renderBoard();
  sfx.ok(-.65, p); bubble("ok", "+" + p);
  if (banThu) return apTu(w, myUid(), true);
  try {
    await f.fs.setDoc(f.fs.doc(tranRef, "tu", tenTu(w)), { uid: toi.uid, luc: f.fs.serverTimestamp() });
    nayDiem(0);
  } catch (e) { bubble("dup", now() > (G.T.ketThuc || 0) ? "Time" : "Taken"); }
}
// bàn thử: một từ được nhận (của mình / máy / màn bên kia) — gõ tự do hoặc bộ từ; guiDi ⇒ báo màn bên kia
async function apTu(w, uid, guiDi) {
  if (che()) {
    const b = KE_THU[vanNay()], i = b ? b.w.indexOf(w.toUpperCase()) : -1;
    if ((i >= 0 && G.T.tim[i]) || TU.has(tenTu(w))) return;
    if (guiDi) guiMe({ k: "tu", w, uid, v: vanNay() });
    return thuNhanTu(w, uid);
  }
  if (TU.has(w)) return;
  if (guiDi) guiMe({ k: "tu", w, uid, v: -1 });
  TU.set(w, { w, v: -1, uid, ok: true, d: points(w.length), luc: Date.now() });
  veO(); veDiem(); nayDiem(uid === uidBen(G.ben) ? 0 : 1);
}

// ---------- vẽ ----------
function render() { giuCuon(render0); XM.ve(); }
function render0() {
  const over = G.phase === "over", kq = over ? ketQua() : "";
  root.classList.toggle("asking", G.ask);
  root.classList.toggle("is-xem", G.xem);
  const sw = L.sw, chipY = port ? 56 : 12;
  const live = G.phase === "play" || G.phase === "count" || over;
  const con = G.T && G.T.ketThuc ? Math.max(0, Math.ceil((G.T.ketThuc - Math.max(now(), G.T.batDau || 0)) / 1000)) : (G.T ? G.T.phut * 60 : 120);
  // xem: ô giữa trải rộng cả khung (không có bàn chữ)
  const caKhung = XM.caKhung(L, port);   // ⭐ v1.361.0 — chừa chỗ cho khung bình luận
  cv.innerHTML =
    `<div class="wsg-hudline" style="left:${port ? 8 : 12}px;width:${L.W - (port ? 16 : 24)}px"></div>` +
    `<div class="wsg-score ${over && kq === "thang" ? "lead" : ""}" style="left:${L.sA}px;width:${sw}px${port ? ";height:36px" : ""}"><b ${port ? 'style="font-size:26px"' : ""}>${live ? diemBen(G.ben) : 0}</b></div>` +
    `<div class="wsg-clock ${G.phase === "play" && con <= 10 ? "warn" : ""}" style="left:${L.clock}px${port ? ";width:104px;height:36px" : ""}"><span ${port ? 'style="font-size:22px"' : ""}>${fmt(con)}</span></div>` +
    `<div class="wsg-score s1 ${over && kq === "thua" ? "lead" : ""}" style="left:${L.sB}px;width:${sw}px${port ? ";height:36px" : ""}"><b ${port ? 'style="font-size:26px"' : ""}>${live ? diemBen(khac()) : 0}</b></div>` +
    chips(chipY) +
    (G.xem || (port && (over || G.phase === "loi"))
      ? stageHtml(G.xem ? caKhung : { x: L.C.x, y: L.C.y, w: L.C.w, h: L.B.y + L.B.h - L.C.y }, centreHtml(), null)
      : stageHtml(port ? L.C : { x: L.C.x, y: L.Y, w: L.C.w, h: L.BH }, centreHtml(), null) +
        stageHtml(port ? L.B : { x: L.B.x, y: L.Y, w: L.B.w, h: L.BH }, boardHtml(), 0)) +
    `<div class="wsg-tools" style="top:${L.tools}px;left:${port || G.xem ? L.W / 2 : L.B.x + L.B.w / 2}px">` +
      `<button class="wsg-tool" data-do="home" aria-label="${G.xem ? "Thoát xem" : "Rời trận"}"><span><svg class="i" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.53l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg></span></button>` +
      `<button class="wsg-tool ${sfx.on ? "" : "off"}" data-do="sound" aria-label="Âm thanh"><span><svg class="i" viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4V5Z"/>${sfx.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>' : '<path d="m22 9-6 6"/><path d="m16 9 6 6"/>'}</svg></span></button>` +
    `</div>` +
    (G.ask ? `<div class="wsg-ask"><div class="wsg-askbox"><div class="q">Leave the match?</div><div class="sub">${G.T && G.T.giai ? "You will lose this match (0 points)." : "You will lose this friendly match."}</div>` +
      `<div class="a"><button class="wsg-b clr" data-do="yes"><span>Leave</span></button><button class="wsg-b ent" data-do="no"><span>Stay</span></button></div></div></div>` : "");
}
function chips(y) {
  const me = G.xem ? tenBen("a") : "You", ban = tenBen(khac());
  if (port) return `<div class="on-chip" style="left:16px;top:${y}px">${avOn(G.ben, "width:24px;height:24px;font-size:10px")}${esc(me)}</div>` +
    `<div class="on-chip r" style="right:16px;top:${y}px">${avOn(khac(), "width:24px;height:24px;font-size:10px")}${esc(ban)}</div>`;
  const half = L.sw / 2 + 16;
  return `<div class="on-chip" style="left:${L.sA + half}px">${avOn(G.ben)}${esc(me)}</div>` +
    `<div class="on-chip r" style="right:${L.W - L.sB + half}px">${avOn(khac())}${esc(ban)}</div>`;
}
const stageHtml = (g, inner, side) => `<div class="wsg-stage" ${side != null ? `data-side="${side}"` : ""} style="left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px">${inner}</div>`;
function boardHtml() {
  const live = G.phase === "play" && !G.ask, show = live || G.phase === "count" || G.phase === "over";
  const chu = letters(), n = chu.length || 16, T = L.T, gap = L.gap, gw = T * 4 + gap * 3, fs = Math.round(T * 0.5);
  const tiles = [...Array(n).keys()].map((k) =>
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
  const t = (T.phut || 2) + " MIN · " + (T.che ? CHE_TEN[T.che] || "WORDS" : LV_TEN[T.lv] || "EASY");
  return (T.giai ? "TOURNAMENT" : LUYEN ? "PRACTICE" : "FRIENDLY") + " · " + t;
}
// ⭐ v1.351.0 — bảng GỢI Ý của bàn đang chơi (trận có bộ từ): mỗi từ một dòng — gợi ý + ô trống (số chữ) / từ đã tìm (màu bên tìm)
function goiHtml() {
  const T = G.T || {}, goi = T.goi || [], tim = T.tim || {}, hien = T.hien || {}, gy = T.goiY, v = vanNay();
  const tuCua = (i) => { let w = ""; TU.forEach((x) => { if (x.ok === true && x.v === v && x.i === i) w = x.w; }); return w; };
  const mot = T.che === "one";
  // ⭐ thầy giao hữu — Word list / Free words: màn thầy hiện SẴN từ chưa ai lấy (xanh dương nhạt, bấm là lấy)
  const banGv = laGv() && !mot && G.phase === "play" ? (keGv()[v] || {}).w || [] : null;
  const dong = goi.map((g, i) => {
    const ai = tim[i], bo = ai === "-", w = bo ? hien[i] || "" : ai ? tuCua(i) : "", sd = ai && !bo ? (ai === uidBen(G.ben) ? 0 : 1) : -1;
    if (banGv && !ai && banGv[i]) return `<div class="td-g gvl" data-lay="${esc(banGv[i].toLowerCase())}"><span class="m">${esc(g.m || "")}</span><span class="w"><b class="gv">${esc(banGv[i])}</b></span></div>`;
    // chữ đã lật (gợi ý) sáng lên, phần còn lại vẫn là ô trống
    const lat = gy && gy.i === i ? String(gy.chu || "") : "";
    const o = ai && w ? `<b>${esc(w.toUpperCase())}</b>`
      : `<i>${Array.from({ length: g.n || 0 }, (_, j) => (j < lat.length ? `<em${j === lat.length - 1 ? ' class="moi"' : ""}>${esc(lat[j])}</em>` : "_")).join(" ")}</i>`;
    const loa = T.giong && g.v ? `<button type="button" class="td-loa" data-do="giong" data-v="${esc(g.v)}" aria-label="Nghe gợi ý"><svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg></button>` : "";
    // giọng đọc: chữ gợi ý ẩn tới khi từ đã có người tìm / bị lật hết
    const chu = T.giong && g.v && !ai ? "" : esc(g.m || "");
    return `<div class="td-g${ai ? " xong" + (bo ? " bo" : " sd" + sd) : ""}">${loa}<span class="m">${chu}</span><span class="w">${o}</span></div>`;
  }).join("");
  return `<div class="td-bo${mot ? " mot" : ""}"><div class="td-bo-dau"><span>${esc(CHE_TEN[T.che] || "WORDS")}</span><span>BOARD ${v + 1}/${T.soVan || 1}</span></div>` +
    (T.goiYBat && G.phase === "play" ? `<div class="td-vach"><i></i></div>` : "") +
    (G.xem ? `<div class="td-chu">${letters().map((c) => `<i>${esc(c)}</i>`).join("")}</div>` : "") +
    `<div class="td-goi">${dong}</div></div>`;
}
function centreHtml() {
  const T = G.T || {};
  if (G.phase === "tai" || G.phase === "cho" || G.phase === "loi")
    return `<div class="wsg-mid"><div class="wsg-logo">A SHOW <span>SPEED</span></div><div class="wsg-note">${esc(G.note || (G.phase === "cho" ? (G.xem ? "Waiting for the match to start…" : G.T && G.T.trangThai === "moi" ? "Waiting for " + tenBen(khac()) + " to accept…" : "Getting the letters ready…") : "Loading…"))}</div>` +
      (G.phase === "loi" ? `<div class="on-btns"><button class="wsg-b ent" data-do="back"><span>Back</span></button></div>` : "") + `</div>`;
  if (G.phase === "lobby") {
    const cd = Math.max(0, Math.ceil((T.batDau - now()) / 1000));
    return `<div class="wsg-mid"><div class="on-meta">${meta()}</div>${T.boTen ? `<div class="wsg-note">${esc(T.boTen)}</div>` : ""}
      <div class="on-vs" ${port ? 'style="gap:14px"' : ""}><div class="on-p l ${port ? "port" : ""}">${avOn(G.ben)}<b>${esc(tenBen(G.ben))}</b></div>
      <div class="on-x">VS</div>
      <div class="on-p r ${port ? "port" : ""}">${avOn(khac())}<b>${esc(tenBen(khac()))}</b></div></div>
      <div class="on-cd ${cd ? "" : "go"}">${cd > 3 ? "" : cd || "GO"}</div></div>`;
  }
  if (G.phase === "count") return `<div class="wsg-mid"><div class="wsg-logo">TIME'S <span>UP</span></div><div class="wsg-note">Checking the result…</div></div>`;
  if (G.phase === "over") {
    const kq = ketQua(), a = diemBen(G.ben), b = diemBen(khac()), ly = T.ly || "";
    const laLy = /^(roi|mat)[AB]$/.test(ly);
    const toiBo = !G.xem && laLy && ((G.ben === "a" && /A$/.test(ly)) || (G.ben === "b" && /B$/.test(ly))), banBo = laLy && !toiBo;
    const head = G.xem
      ? (kq === "hoa" ? "DRAW" : esc(String(tenBen(kq === "thang" ? "a" : "b")).toUpperCase()) + " WINS")
      : { thang: "YOU WIN", thua: toiBo ? (/^roi/.test(ly) ? "YOU LEFT" : "DISCONNECTED") : "YOU LOSE", hoa: "DRAW" }[kq];
    const pts = { thang: 2, hoa: 1, thua: 0 }[kq];
    const chu = letters();
    let missed;
    if (T.che) missed = (T.lo || []).map((x) => ({ w: x.w, m: x.m || "" }));
    else missed = chu.length ? wordsOn(dict, chu, 4).filter((w) => !TU.has(w) && !dict.get(w).base && dict.get(w).lv >= 1)
      .sort((x, y) => y.length - x.length || dict.get(x).lv - dict.get(y).lv).slice(0, port ? 10 : 8).map((w) => ({ w, m: lookup(dict, w)?.m || "" })) : [];
    const boTen = banBo ? (G.xem ? tenBen(/A$/.test(ly) ? "a" : "b") : tenBen(khac())) : "";
    return `<div class="wsg-mid on-res ${!G.xem && kq === "thua" ? "lose" : kq === "hoa" ? "draw" : ""}" style="gap:${port ? 16 : 12}px">
      <h2 ${port ? 'style="font-size:40px"' : ""}>${head}</h2>
      ${banBo ? `<div class="wsg-note">${esc(boTen)} ${/^roi/.test(ly) ? "left the match" : "lost connection"}.</div>` : ""}
      <div class="on-sc"><span class="a">${a}</span><i>–</i><span class="b">${b}</span></div>
      <div class="on-pts">${G.xem ? `<span class="on-pill ${T.giai ? "" : "mute"}"><span>${T.giai ? "TOURNAMENT" : "FRIENDLY"}</span></span>` : T.giai ? `<span class="on-pill ${pts ? "gold" : "mute"}"><span>+${pts} ${pts === 1 ? "POINT" : "POINTS"}</span></span>` : `<span class="on-pill mute"><span>${LUYEN ? "PRACTICE · NO POINTS" : "FRIENDLY · NO POINTS"}</span></span>`}</div>
      ${missed.length ? `<div class="wsg-lab">MISSED</div><div class="wsg-miss" ${port ? 'style="grid-template-columns:1fr"' : ""}>${missed.map((x) => `<div><b>${esc(x.w.toUpperCase())}</b> <span>${esc(x.m)}</span></div>`).join("")}</div>` : ""}
      <div class="on-btns"><button class="wsg-b ghost" data-do="back"><span>${LUYEN ? "Exit" : "Back"}</span></button>${G.xem ? "" : `<button class="wsg-b ent" data-do="again"><span>${LUYEN ? "Play again" : "Rematch"}</span></button>`}</div></div>`;
  }
  // đang chơi: (bộ từ: bảng gợi ý) + từ mới nhất to giữa + 2 cột
  const ds = dsTu(), f0 = ds[0];
  const side = (x) => (x.uid === uidBen(G.ben) ? 0 : 1);
  const key = f0 ? f0.w + f0.v : "";
  const pop = key && key !== G.lastKey ? "wsg-pop" : ""; G.lastKey = key;
  const nghia = (x) => x.m || (lookup(dict, x.w) || {}).m || "";
  const hit = f0 && !che() ? lookup(dict, f0.w) : null;
  // thầy trên điện thoại: ô từ mới nhất thấp hơn ⇒ danh sách của thầy có thêm chỗ
  if (laGv() && port && !che()) return centreGv(f0, side, nghia, hit, pop, ds);
  const last = f0
    ? `<div class="wsg-last ${pop} sd${side(f0)}" ${port || che() ? `style="min-height:${che() ? 64 : 84}px"` : ""}><div class="w" ${port || che() ? `style="font-size:${che() ? 34 : 40}px"` : ""}>${centred(f0.w.toUpperCase(), side(f0))}</div>${nghia(f0) ? `<div class="m" ${port ? 'style="font-size:16px"' : ""}>${esc(nghia(f0))}</div>` : ""}${hit && hit.base ? `<div class="nt">form of ${esc(hit.base.toUpperCase())}</div>` : ""}</div>`
    : `<div class="wsg-last idle" ${port || che() ? `style="min-height:${che() ? 64 : 84}px"` : ""}><div class="w">· · ·</div></div>`;
  const rows = (s) => ds.slice(1).filter((x) => side(x) === s).map((x) => `<li><b>${esc(x.w.toUpperCase())}</b>${nghia(x) ? `<span>${esc(nghia(x))}</span>` : ""}</li>`).join("");
  const hA = G.xem ? tenBen("a") : "YOU";
  const gvCot = laGv() && (!che() || che() === "one");
  return `<div class="wsg-cen${che() ? " td-cen-bo" : ""}${laGv() ? " gv-cen" : ""}" ${port ? 'style="padding:10px 12px 8px;gap:6px"' : ""}>${che() ? goiHtml() : ""}${G.xem && !che() ? `<div class="td-chu">${letters().map((c) => `<i>${esc(c)}</i>`).join("")}</div>` : ""}${last}<div class="on-cols">
    ${gvCot ? cotGv(ds, side, nghia) : `<div class="on-col c0"><h4>${esc(hA.toUpperCase())}</h4><ol>${rows(0)}</ol></div>`}
    <div class="on-col c1"><h4>${esc(tenBen(khac()).toUpperCase())}</h4><ol>${rows(1)}</ol></div></div>${G.loiTu ? `<div class="wsg-note" style="text-align:center">Chưa xem được các từ của trận.</div>` : ""}</div>`;
}
// ⭐ thầy giao hữu — CỘT CỦA THẦY (gõ tự do + One word): trên = từ CHƯA ai lấy (xanh dương nhạt, bấm là lấy; One word: từ đang tới
//   xanh dương nhạt, các từ sau xám nhạt) · dưới cùng = từ thầy đã lấy (màu đúng như thường, mới nhất ở cuối).
//   Học sinh lấy từ nào ⇒ từ đó rời danh sách của thầy (sang cột học sinh như thường).
function cotGv(ds, side, nghia) {
  const da = ds.slice(1).filter((x) => side(x) === 0).sort((p, q2) => p.luc - q2.luc);
  let goi;
  if (!che()) goi = dsGv().filter((w) => !TU.has(w)).map((w) => ({ w, m: (lookup(dict, w) || {}).m || "", lay: true }));
  else {
    const v = vanNay(), tim = (G.T && G.T.tim) || {};
    goi = [];
    keGv().forEach((b, k) => { if (k < v) return; b.w.forEach((w, i) => { if (k === v && tim[i]) return; goi.push({ w: w.toLowerCase(), m: b.m[i] || "", lay: k === v, xam: k > v }); }); });
  }
  const li = (x) => `<li class="${x.xam ? "xam" : "lay"}"${x.lay ? ` data-lay="${esc(x.w)}"` : ""}><b>${esc(x.w.toUpperCase())}</b>${x.m ? `<span>${esc(x.m)}</span>` : ""}</li>`;
  return `<div class="on-col c0 gv${che() === "one" ? " mot" : ""}"><h4>YOU<small>${goi.length.toLocaleString("en")} LEFT</small></h4>` +
    `<ol class="gv-goi">${goi.map(li).join("")}</ol>` +
    (da.length ? `<ol class="gv-da">${da.map((x) => `<li><b>${esc(x.w.toUpperCase())}</b>${nghia(x) ? `<span>${esc(nghia(x))}</span>` : ""}</li>`).join("")}</ol>` : "") + `</div>`;
}
// vẽ lại khung giữa mà GIỮ chỗ đang cuộn của danh sách thầy (vẽ lại mỗi khi có từ mới — không giữ thì nhảy về đầu)
function giuCuon(fn) {
  const a = cv.querySelector(".gv-goi"), b = cv.querySelector(".td-goi");
  const sa = a ? a.scrollTop : 0, sb = b ? b.scrollTop : 0;
  fn();
  const a2 = cv.querySelector(".gv-goi"), b2 = cv.querySelector(".td-goi"), d2 = cv.querySelector(".gv-da");
  if (a2) a2.scrollTop = sa;
  if (b2) b2.scrollTop = sb;
  if (d2) d2.scrollTop = d2.scrollHeight;
}
function centreGv(f0, side, nghia, hit, pop, ds) {
  const last = f0
    ? `<div class="wsg-last ${pop} sd${side(f0)}" style="min-height:52px"><div class="w" style="font-size:30px">${centred(f0.w.toUpperCase(), side(f0))}</div>${nghia(f0) ? `<div class="m" style="font-size:14px">${esc(nghia(f0))}</div>` : ""}</div>`
    : `<div class="wsg-last idle" style="min-height:52px"><div class="w">· · ·</div></div>`;
  const rows1 = ds.slice(1).filter((x) => side(x) === 1).map((x) => `<li><b>${esc(x.w.toUpperCase())}</b>${nghia(x) ? `<span>${esc(nghia(x))}</span>` : ""}</li>`).join("");
  return `<div class="wsg-cen gv-cen" style="padding:8px 10px 6px;gap:4px">${last}<div class="on-cols">${cotGv(ds, side, nghia)}<div class="on-col c1"><h4>${esc(tenBen(khac()).toUpperCase())}</h4><ol>${rows1}</ol></div></div></div>`;
}
function renderCentre() { const el = cv.querySelector(".wsg-stage:not([data-side])"); if (el) giuCuon(() => { el.innerHTML = centreHtml(); }); }
function veO() { if (G.phase === "play" || G.phase === "count") renderCentre(); else if (G.phase === "over") render(); }
function veDiem() { const b = cv.querySelectorAll(".wsg-score b"); if (b.length === 2) { b[0].textContent = diemBen(G.ben); b[1].textContent = diemBen(khac()); } }
function nayDiem(i) { const box = cv.querySelectorAll(".wsg-score")[i]; if (box) { box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump"); } }
function renderBoard() {
  const el = cv.querySelector('[data-side="0"]'); if (!el) return G.xem ? null : render();
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
  if (d === "home") { if (!G.xem && (G.phase === "play" || G.phase === "lobby")) { G.ask = true; return render(); } return veGiai(); }
  if (d === "no") { G.ask = false; return render(); }
  if (d === "yes") { G.ask = false; return roiTran(); }
  if (d === "sound") { sfx.on = !sfx.on; return render(); }
  if (d === "back") return veGiai();
  if (d === "again") return dauLai();
  if (d === "giong") return docGiong(b.dataset.v);
  if (G.phase !== "play" || G.ask || G.xem) return;
  if (d === "t") {
    const k = +b.dataset.k, i = G.sel.indexOf(k);
    // Word list: ô như phím — bấm lần nữa là THÊM chữ đó (bỏ bằng Clear / Backspace)
    if (laPhim()) { G.sel.push(k); sfx.tap(-.65); }
    else if (i >= 0) { G.sel.splice(i, 1); sfx.untap(-.65); } else { G.sel.push(k); sfx.tap(-.65); }
    renderBoard();
  } else if (d === "clr") { if (G.sel.length) sfx.clear(-.65); G.sel = []; renderBoard(); }
  else if (d === "ent") submit();
});
// ⭐ thầy giao hữu — bấm một từ (danh sách cột thầy / bảng giữa). Lấy lúc NHẤC tay, chỉ khi không vuốt (vuốt = cuộn danh sách);
//   so theo CHỮ của từ chứ không theo phần tử — khung có thể vẽ lại giữa cú bấm (bẫy "khối vẽ lại giữa cú bấm").
let LAY = null;
cv.addEventListener("pointerdown", (e) => { const li = e.target.closest("[data-lay]"); LAY = li && laGv() ? { w: li.dataset.lay, x: e.clientX, y: e.clientY } : null; });
addEventListener("pointerup", (e) => {
  const a = LAY; LAY = null; if (!a) return;
  if (Math.abs(e.clientX - a.x) > 10 || Math.abs(e.clientY - a.y) > 10) return;
  layTu(a.w);
});
addEventListener("pointercancel", () => { LAY = null; });
addEventListener("keydown", (e) => {
  if (G.phase !== "play" || G.ask || G.xem) return;
  if (e.key === "Enter") return submit();
  if (e.key === "Backspace") { G.sel.pop(); return renderBoard(); }
  if (e.key === "Escape") { G.sel = []; return renderBoard(); }
  const ch = e.key.length === 1 ? e.key.toUpperCase() : "";
  if (!/^[A-Z]$/.test(ch)) return;
  const chu = letters();
  const k = [...Array(chu.length).keys()].find((k2) => (laPhim() || !G.sel.includes(k2)) && chu[G.order[k2]] === ch);
  if (k != null) { G.sel.push(k); sfx.tap(-.65); renderBoard(); }
});
function veGiai() {
  if (LUYEN) { if (history.length > 1) return history.back(); return NW.di("khampha.html"); }   /* v1.372.0 luyện tập: thoát về chỗ vừa bấm */
  // xem: quay lại nơi vừa bấm "Theo dõi" (chat / trang giải)
  if (G.xem && history.length > 1 && document.referrer && new URL(document.referrer).origin === location.origin) return history.back();
  NW.di("giaidau.html");
}
async function roiTran() {
  if (LUYEN) return veGiai();   /* v1.372.0 luyện tập: Leave = thoát luôn, không ghi gì */
  if (banThu) { G.T.trangThai = "xong"; G.T.kq = { a: "thua", b: "thang" }; G.T.ly = "roiA"; G.T.diem = { a: diemBen("a"), b: diemBen("b") }; clearTimeout(bot); G.phase = "over"; return vaoPha("play"); }
  G.roi = true; G.note = "";
  await nhip({ roi: true });   // máy chủ chốt ngay: em thua
}
async function dauLai() {
  const T = G.T || {};
  const ban = { uid: uidBen(khac()), ten: tenBen(khac()) };
  if (LUYEN) return location.reload();   /* v1.372.0 luyện tập: chơi lại = nạp lại đúng tham số */
  if (banThu) return NW.ThachDau.moi(ban, { lop: "A1C", giai: "" });
  // ⭐ thầy giao hữu — đấu lại trận có thầy: thầy giữ cách đấu cũ · em mời thầy thì 2 phút Easy (luật)
  if (T.gv) return NW.ThachDau.moi(ban, laGv() ? { lop: T.lop, giai: "", phut: T.phut, lv: T.lv, gv: T.gv, cai: T.cai || null } : { lop: T.lop, giai: "", phut: 2, lv: "easy", gv: T.gv });
  let tenGiai = "";
  if (T.giai) { try { const g = await f.fs.getDoc(f.fs.doc(f.db, "giaiDau", T.giai)); tenGiai = g.exists() ? g.data().ten : ""; } catch (e) { } }
  NW.ThachDau.moi(ban, { lop: T.lop, giai: T.giai || "", phut: T.phut, lv: T.lv, tenGiai });
}

// ---------- bàn thử: đấu với MÁY (?che=one|list|free: bộ từ mẫu · ?xem=1: xem 2 máy đấu) ----------
const BO_MAU = [["apple", "quả táo"], ["banana", "quả chuối"], ["orange", "quả cam"], ["grape", "quả nho"], ["lemon", "quả chanh"], ["mango", "quả xoài"],
  ["cherry", "quả anh đào"], ["melon", "quả dưa"], ["peach", "quả đào"], ["pear", "quả lê"], ["plum", "quả mận"], ["kiwi", "quả kiwi"]];
let KE_THU = [], BO_LUYEN = null;   /* BO_LUYEN: bộ từ của giải [[từ, nghĩa]] khi luyện tập bo=g */
// mẫu: hai màn (thầy + học sinh) phải ra CÙNG bộ bàn ⇒ xáo theo hạt giống chung &seed
let hat = (+q.get("seed") || 7) >>> 0;
const rnd = () => { hat = (hat * 1664525 + 1013904223) >>> 0; return hat / 4294967296; };
const xao = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function keThu(cheThu, o) {   // bản rút gọn ws-chu.js keBo (máy chủ) — chỉ cho bàn thử
  const shuffle = xao;
  const ds = shuffle((BO_LUYEN || BO_MAU).map(([w, m]) => ({ up: w.toUpperCase(), m }))), rl = () => "EEEAAIIOOTTNNSSRRLLDDHCMPUGBYWF"[rnd() * 31 | 0];
  if (cheThu === "one") return ds.map((x) => { const n = Math.max(o, Math.ceil(x.up.length / 4) * 4), Lt = x.up.split(""); while (Lt.length < n) Lt.push(rl()); return { l: shuffle(Lt).join(""), w: [x.up], m: [x.m] }; });
  const per = cheThu === "list" ? 4 : 2, out = [];
  for (let i = 0; i < ds.length; i += per) {
    const g = ds.slice(i, i + per), Lt = [];
    if (cheThu === "list") { const s = new Set(g.flatMap((x) => x.up.split(""))); Lt.push(...s); while (Lt.length < 16) { const c = rl(); if (!Lt.includes(c)) Lt.push(c); } }
    else { const need = {}; g.forEach((x) => { const c = {}; for (const ch of x.up) c[ch] = (c[ch] || 0) + 1; for (const ch in c) need[ch] = Math.max(need[ch] || 0, c[ch]); }); for (const ch in need) for (let k = 0; k < need[ch]; k++) Lt.push(ch); while (Lt.length < 16) Lt.push(rl()); }
    out.push({ l: shuffle(Lt.slice(0, 16)).join(""), w: g.map((x) => x.up), m: g.map((x) => x.m) });
  }
  return out;
}
async function datBanThu(v) {
  const b = KE_THU[v];
  Object.assign(G.T, { van: v, chu: b.l, goi: b.w.map((w, i) => ({ m: b.m[i], n: w.length })), bam: await Promise.all(b.w.map(bamTu)), tim: {}, hien: {}, goiY: null, soGoi: 0, moc: Math.max(Date.now(), G.T.batDau || 0) });
}
// bàn thử: một bước gợi ý như máy chủ (tran-dau.js tdTuBo nhánh zg)
async function thuGoi() {
  const T = G.T, b = KE_THU[vanNay()]; if (!b) return;
  const con = b.w.map((_, k) => k).filter((k) => !T.tim[k]); if (!con.length) return;
  const cu = T.goiY, j = cu && !T.tim[cu.i] ? cu.i : con.reduce((a, k) => (b.w[k].length < b.w[a].length ? k : a));
  const kk = cu && cu.i === j ? cu.k + 1 : 1;
  T.moc = Date.now(); T.soGoi++;
  if (kk >= b.w[j].length) {
    T.tim[j] = "-"; T.hien[j] = b.w[j]; T.goiY = null;
    if (b.w.every((_, k) => T.tim[k])) { if (vanNay() + 1 < KE_THU.length) { await datBanThu(vanNay() + 1); doiBan(); } else T.ketThuc = Date.now(); }
  } else T.goiY = { i: j, k: kk, chu: b.w[j].slice(0, kk) };
  renderCentre();
}
// bàn thử: một từ được nhận (của em hoặc của máy) — chấm như máy chủ
async function thuNhanTu(w, uid) {
  const T = G.T, up = w.toUpperCase(), v = vanNay(), b = KE_THU[v], i = b ? b.w.indexOf(up) : -1;
  const ben = uid === T.a ? "a" : "b";
  const d = i >= 0 ? diemBai(up) : points(w.length);
  if (i >= 0) { T.tim[i] = uid; T.moc = Date.now(); if (T.goiY && T.goiY.i === i) T.goiY = null; }
  TU.set(tenTu(w), { w, v, uid, ok: true, d, i, m: i >= 0 ? b.m[i] : (lookup(dict, w) || {}).m || "", luc: Date.now() });
  T.diem[ben] += d;
  veDiem(); nayDiem(ben === G.ben ? 0 : 1);
  if (i >= 0 && b.w.every((_, k) => T.tim[k])) {
    if (v + 1 < KE_THU.length) { await datBanThu(v + 1); doiBan(); }
    else { T.ketThuc = Date.now(); }
  }
  renderCentre();
}
// ⭐ v1.361.0 — bàn thử một màn: giả vài bạn vào xem, bình luận, thả tim (hai/ba màn: khung mẹ giả rồi chuyển cho mọi màn)
function moPhongXem() {
  const BAN = [["mxa", "Minh Anh"], ["mxb", "Bảo Nam"], ["mxc", "Thảo Vy"], ["mxd", "Gia Huy"], ["mxe", "Khánh Linh"], ["mxf", "Quang Minh"]];
  const CHU = ["Cố lên Gia Bảo ơi!", "Thầy nhanh quá 😆", "Từ BANANA kìa!", "Hồi hộp ghê", "Gia Bảo giỏi quá 👏", "Thầy ơi nhường em với 😅", "Còn 1 phút nữa!"];
  BAN.forEach((b, i) => setTimeout(() => XM.nhan({ k: "vao", uid: b[0], ten: b[1] }), 1500 + i * 2500));
  let n = 0;
  setInterval(() => { if (G.phase === "over") return; const b = BAN[Math.random() * BAN.length | 0]; XM.nhan({ k: "bl", uid: b[0], ten: b[1], chu: CHU[n++ % CHU.length] }); }, 4500);
  setInterval(() => { if (G.phase === "over") return; XM.nhan({ k: "tim", ben: Math.random() < .5 ? "a" : "b", so: 1 + (Math.random() * 3 | 0) }); }, 2600);
}
let dangChot = false;
// ⭐ MẪU THẦY GIAO HỮU — bàn thử: thầy (a, uid "thay") đấu Gia Bảo (b, uid "hs"). Màn này của VAI; bên kia là MÁY,
//   hoặc (&dong=1) là màn thứ hai trong khung mẹ: từ lấy được ở màn nào cũng báo sang màn kia (khung mẹ chuyển tin).
async function chayBanThu() {
  let phut = +q.get("phut") || 2, lv = q.get("lv") || "easy", cheThu = ["one", "list", "free"].includes(q.get("che")) ? q.get("che") : "";
  // ⭐ v1.372.0 — luyện tập: bo=g ⇒ đọc giải (giaiDau/{giai}.bo) lấy bộ từ + cách chơi; không đọc được ⇒ 16 chữ ngẫu nhiên
  let boGiai = null, tenMe = "EM";
  if (LUYEN) {
    phut = [2, 3, 5].includes(+q.get("phut")) ? +q.get("phut") : 2;
    tenMe = NW.toi ? (NW.toi.laThay ? "Thầy Andrew" : NW.toi.ten || "EM") : "EM";
    if (q.get("bo") === "g" && q.get("giai") && NW.laBanThu()) { BO_LUYEN = BO_MAU; boGiai = { che: "free", o: 12, chiBo: true, ten: "7 JOB / WORDS", goiY: true }; cheThu = "free"; }   /* bàn thử: giải mẫu m3 không có trong kho */
    else if (q.get("bo") === "g" && q.get("giai")) {
      try {
        const gf = await NW.fb(), gs = await gf.fs.getDoc(gf.fs.doc(gf.db, "giaiDau", q.get("giai"))), gd = gs.exists() ? gs.data() : null;
        if (gd && gd.bo && ["one", "list", "free"].includes(gd.bo.che)) {
          BO_LUYEN = (gd.bo.tu || []).filter((x) => x && /^[A-Za-z]{2,16}$/.test(x.w || "")).map((x) => [x.w, x.m || ""]);
          if (BO_LUYEN.length) { boGiai = gd.bo; cheThu = gd.bo.che; } else BO_LUYEN = null;
        }
      } catch (e) { BO_LUYEN = null; }
    }
  }
  const chu = "EAIDTFJRNULHGPEG".split("");
  const t0 = +q.get("t0") || Date.now() + 4000;
  if (VAI) {
    toi = { uid: VAI };
    G.ben = VAI === "hs" ? "b" : "a";
    if (VAI === "xem") G.xem = true;
    G.T = { a: "thay", b: "hs", gv: "thay", tenA: "Thầy Andrew", tenB: "Gia Bảo", anhA: "assets/avatar-tron.jpg", anhB: "", giai: "", phut, lv, chu: chu.join(""),
      trangThai: "choi", batDau: t0, ketThuc: t0 + phut * 60000, diem: { a: 0, b: 0 } };
  } else {   // bàn thử học sinh như cũ: em (BẠN THỬ) đấu MÁY · &xem=1 xem 2 máy đấu nhau
    toi = { uid: G.xem ? "may2" : "toi" };
    G.ben = "a";
    G.T = { a: G.xem ? "may2" : "toi", b: "may", tenA: LUYEN ? tenMe : G.xem ? "Gia Bảo" : "BẠN THỬ", tenB: LUYEN ? "MÁY" : q.get("ban") || (G.xem ? "Bảo Nam" : "Gia Bảo"), giai: LUYEN ? "" : q.get("giai") || cheThu ? "thu" : "", phut, lv, chu: chu.join(""),
      trangThai: "choi", batDau: t0, ketThuc: t0 + phut * 60000, diem: { a: 0, b: 0 } };
  }
  if (cheThu) {
    KE_THU = keThu(cheThu, boGiai ? boGiai.o || 12 : +q.get("o") || 12);
    Object.assign(G.T, { che: cheThu, chiBo: boGiai ? boGiai.chiBo !== false : q.get("chiBo") !== "0", boTen: boGiai ? boGiai.ten || "" : "FRUITS / WORDS", soVan: KE_THU.length, goiYBat: boGiai ? boGiai.goiY !== false : q.get("goi") !== "0" });
    await datBanThu(0);
  }
  if (DONG && VAI === "hs") sfx.on = false;   // hai màn cùng kêu thì ồn — màn học sinh tắt tiếng (bấm loa để bật)
  doiBan();
  /* v1.372.0 luyện tập: máy Chậm / Vừa / Nhanh = nhịp tìm một từ [nền, dao động] (ms); bàn thử cũ giữ 4–8 giây */
  const TOC_MAY = LUYEN ? ({ 1: [9000, 6000], 2: [5500, 4500], 3: [3200, 2800] }[+q.get("may")] || [4000, 4000]) : [4000, 4000];
  const may = (uid) => {
    const laThayMay = uid === "thay";
    const nuoc = () => {
      bot = setTimeout(() => {
        if (G.phase === "play") {
          if (G.T.che) {
            const b = KE_THU[vanNay()], left = b ? b.w.filter((_, k) => !G.T.tim[k]) : [];
            if (left.length && Math.random() < .7) { const w = left[Math.random() * left.length | 0].toLowerCase(); sfx.ok(.65, 1); apTu(w, uid, true); }
          } else {
            // máy-học-sinh: từ dễ ngắn ngẫu nhiên · máy-thầy: bấm từ ở đầu danh sách (như thầy bấm)
            const pool = laThayMay ? dsGv().filter((w) => !TU.has(w)).slice(0, 12) : wordsOn(dict, letters(), 2).filter((w) => w.length <= 5 && !TU.has(w));
            const w = pool[Math.random() * pool.length | 0];
            if (w) { sfx.ok(.65, points(w.length)); apTu(w, uid, true); }
          }
        }
        if (G.phase !== "over") nuoc();
      }, (laThayMay ? 3000 : TOC_MAY[0]) + Math.random() * (laThayMay ? 4000 : TOC_MAY[1]));
    };
    nuoc();
  };
  // &may=hs|thay|0 — MÁY chơi phía nào (mặc định: phía bên kia). Hai màn: màn thầy may=0, màn học sinh may=hs (máy chơi thay em)
  const mayBen = LUYEN ? "may" : q.get("may") || (VAI === "thay" ? "hs" : VAI === "hs" ? "thay" : VAI === "xem" ? "0" : "may");
  if (mayBen !== "0") may(mayBen);
  if (!VAI && G.xem) may("may2");
  // tin từ màn bên kia (qua khung mẹ)
  addEventListener("message", (e) => {
    const m = e.data || {}; if (!m.mauThay || m.tu === VAI) return;
    if (m.k === "tu" && (G.phase === "play" || G.phase === "count") && (m.v === -1 || m.v === vanNay())) {
      if (!(che() ? TU.has(tenTu(m.w)) : TU.has(m.w))) sfx.ok(.65, points(m.w.length));
      apTu(m.w, m.uid, false);
    }
    if (m.k === "goi" && G.phase === "play") thuGoi();
    if (["vao", "ra", "bl", "tim"].includes(m.k)) XM.nhan(m);   // ⭐ v1.361.0 — người xem (bàn thử nhiều màn)
  });
  if (!DONG && !LUYEN) moPhongXem();
  capNhatPha();
  setInterval(() => {
    if (G.phase === "lobby" || G.phase === "play") capNhatPha();
    // gợi ý lật chữ: hai màn ⇒ màn THẦY giữ nhịp rồi báo màn học sinh (hai bên lật cùng một chữ)
    if (G.phase === "play" && G.T.che && G.T.goiYBat) {
      veVachGoi();
      if ((!DONG || VAI === "thay") && Date.now() - G.T.moc >= GOI_MS) { thuGoi(); guiMe({ k: "goi" }); }
    }
    if (G.phase === "count" && !dangChot) {
      dangChot = true;
      setTimeout(() => {
        const a = diemBen("a"), b = diemBen("b"); G.T.diem = { a, b }; G.T.kq = { a: a > b ? "thang" : a < b ? "thua" : "hoa", b: a > b ? "thua" : a < b ? "thang" : "hoa" };
        if (G.T.che) { const bb = KE_THU[vanNay()]; G.T.lo = bb ? bb.w.map((w, i) => ({ w, m: bb.m[i] })).filter((_, i) => !G.T.tim[i]) : []; }
        G.T.trangThai = "xong"; capNhatPha();
      }, 1500);
    }
  }, 500);
}

// phiên đăng nhập (không vẽ thanh trên — trận chiếm cả màn) rồi mới vào trận
NW.dungThanh({ tab: "khamPha", hop: true }).then(batDau);
