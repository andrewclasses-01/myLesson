// ============================================================
// anh-kho-tinh.mjs — XUẤT ẢNH ĐẠI DIỆN TỪ KHO `lessonAvatar` RA FILE TĨNH (v1.308.0, 11/10/2026 — thầy chốt "phương án B").
//
// VÌ SAO: từ khi app myLesson thôi ghi `assets/avatar/<lớp>/<tên>.jpg`, em MỚI chỉ có ảnh trong kho Firestore `lessonAvatar` ⇒ trang
// vẽ chữ tắt trước, chờ `deAvatarKho` (chung.js) tải gói kho rồi mới đè ảnh (ca thật: Gia Hân / Minh Lâm / Thanh Mai NT4 trong hộp
// ÔN TẬP). v1.306.0 đã cho hiện ngay từ bản trong máy, nhưng máy CHƯA TỪNG tải gói vẫn phải chờ mạng. File tĩnh thì hiện tức thì.
//
// CÁCH CHẠY:
//   · Tự động — `tools/xuat-ban.mjs` gọi `xuatAnhKho(_site)` mỗi lần xuất bản (push main + lịch mỗi giờ trong xuat-ban.yml)
//     ⇒ ảnh chỉ nằm trong BẢN XUẤT BẢN, KHÔNG commit vào git (không phình repo, không đụng app myLesson đang mở).
//   · Tay — `node tools/anh-kho-tinh.mjs`        : chỉ BÁO (so với assets/avatar trong repo), không ghi gì.
//           `node tools/anh-kho-tinh.mjs <thư_mục>` : ghi vào <thư_mục>/assets/avatar (vd. thư mục tạm để xem thử).
//
// LUẬT (chép đúng `deAnhLop`/`timAnh` của js/chung.js — đổi bên kia thì đổi bên này):
//   · Tên file = avSlugTen(TÊN TRONG lop.json) — đúng URL `avUrl(tenGoc, ten)` trang đang xin.
//   · Tìm ảnh: mã số em khớp VÀ tên kho (`t`) khớp tên/tên cũ ⇒ lấy; không thì TRÙNG HẲN tên đúng MỘT ảnh; không thì luật ĐUÔI đúng
//     MỘT ảnh. Hai ảnh trở lên ⇒ BỎ (thà thiếu ảnh còn hơn gắn nhầm mặt). HS đặc biệt (`hsDb`) không bao giờ được gắn ảnh.
//   · CHỈ ĐIỀN Ô THIẾU: file tĩnh đã có thì GIỮ (trang vẫn đè ảnh kho mới hơn khi chạy). Ảnh có bia XOÁ (`xoa`) ⇒ GỠ file tĩnh khỏi bản
//     xuất bản (thầy đã xoá ảnh thì đừng để lớp nền hiện lại mặt cũ).
//   · Kho im lặng / lỗi mạng ⇒ CHỈ BÁO, KHÔNG BAO GIỜ làm hỏng lượt xuất bản (trả về bình thường).
// 💸 1 lượt đọc Firestore mỗi lớp mỗi lượt xuất bản (10 lớp ⇒ 10 lượt) — rất nhỏ so với hạn mức.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEP = fileURLToPath(import.meta.url);
const GOC = path.resolve(path.dirname(TEP), '..');

const khongDau = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const slugLop = (s) => khongDau(s).replace(/[^a-z0-9]/g, '') || 'lop';
const slugTen = (s) => khongDau(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'hs';
const chuan = (s) => khongDau(s).replace(/\s+/g, ' ').trim();
function tenKhop(a, b) {
  const x = chuan(a), y = chuan(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return x.length > y.length ? x.slice(-(y.length + 1)) === ' ' + y : y.slice(-(x.length + 1)) === ' ' + x;
}

function docDb() {
  const s = fs.readFileSync(path.join(GOC, 'config.js'), 'utf8');
  const m = /AWORD_DB\s*:\s*\{[^}]*?projectId\s*:\s*'([^']+)'[^}]*?apiKey\s*:\s*'([^']+)'/.exec(s);
  return m ? { projectId: m[1], apiKey: m[2] } : null;
}

// { id: { t, a(base64), xoa } } của một lớp; null nếu đọc không được.
async function napKho(db, tenGoc) {
  const url = `https://firestore.googleapis.com/v1/projects/${db.projectId}/databases/(default)/documents/lessonAvatar/` +
    `${encodeURIComponent(slugLop(tenGoc))}?key=${encodeURIComponent(db.apiKey)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (r.status === 404) return {};
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const f = j.fields?.em?.mapValue?.fields || {}, em = {};
  for (const id in f) {
    const g = f[id].mapValue?.fields || {};
    const a = g.a?.stringValue || '';
    const xoa = !!(g.xoa && (g.xoa.integerValue || g.xoa.booleanValue || g.xoa.doubleValue));
    if (!a && !xoa) continue;
    em[id] = { t: g.t?.stringValue || '', a: xoa && !a ? '' : a, xoa: xoa && !a };
  }
  return em;
}

function timAnh(em, hs) {
  const ids = Object.keys(em), id = hs.id != null ? String(hs.id) : '';
  if (id && em[id]) {
    const tk = em[id].t;
    if (!tk || tenKhop(tk, hs.ten) || (hs.tenCu || []).some((c) => khongDau(c) === khongDau(tk))) return id;
  }
  const x = chuan(hs.ten), bang = ids.filter((k) => chuan(em[k].t) === x);
  if (bang.length === 1) return bang[0];
  if (bang.length > 1) return null;
  const long = ids.filter((k) => tenKhop(em[k].t, hs.ten));
  return long.length === 1 ? long[0] : null;
}

// `ra`: thư mục gốc bản xuất bản (ghi vào <ra>/assets/avatar); null = chỉ báo. Trả { ghi, go, co, khongAnh, loi[] }.
export async function xuatAnhKho(ra, { log = console.log } = {}) {
  const kq = { ghi: 0, go: 0, co: 0, khongAnh: 0, loi: [] };
  try {
    const db = docDb();
    if (!db) { kq.loi.push('không đọc được AWORD_DB trong config.js'); return kq; }
    const dl = JSON.parse(fs.readFileSync(path.join(GOC, 'data/lop.json'), 'utf8'));
    for (const l of [...(dl.lop || []), ...(dl.khoa || [])]) {
      const tenGoc = l.tenGoc || l.maLop, sl = slugLop(tenGoc);
      let em;
      try { em = await napKho(db, tenGoc); } catch (e) { kq.loi.push(`${tenGoc}: ${e.message || e}`); continue; }
      const chan = new Set((l.hsDb || []).map((x) => chuan(typeof x === 'object' ? x.ten : x)));
      const moi = [];
      for (const hs of l.hocSinh || []) {
        if (!hs || !hs.ten || chan.has(chuan(hs.ten))) continue;
        const tep = `assets/avatar/${sl}/${slugTen(hs.ten)}.jpg`;
        const coTinh = fs.existsSync(path.join(GOC, tep));
        const id = timAnh(em, hs);
        if (!id) { if (!coTinh) kq.khongAnh++; else kq.co++; continue; }
        if (em[id].xoa) {
          if (coTinh) { kq.go++; moi.push('−' + hs.ten); if (ra) fs.rmSync(path.join(ra, tep), { force: true }); }
          else kq.khongAnh++;
          continue;
        }
        if (coTinh) { kq.co++; continue; }
        const buf = Buffer.from(em[id].a, 'base64');
        if (buf.length < 100 || buf[0] !== 0xff || buf[1] !== 0xd8) { kq.loi.push(`${tenGoc} / ${hs.ten}: ảnh kho không phải JPEG`); continue; }
        if (ra) { fs.mkdirSync(path.join(ra, path.dirname(tep)), { recursive: true }); fs.writeFileSync(path.join(ra, tep), buf); }
        kq.ghi++; moi.push('+' + hs.ten);
      }
      if (moi.length) log(`  ${tenGoc}: ${moi.join(', ')}`);
    }
  } catch (e) { kq.loi.push(String(e.message || e)); }
  log(`anh-kho-tinh: ${ra ? 'ghi' : 'SẼ ghi'} ${kq.ghi} ảnh thiếu, ${ra ? 'gỡ' : 'SẼ gỡ'} ${kq.go} ảnh đã xoá, ${kq.co} em sẵn file tĩnh, ` +
    `${kq.khongAnh} em không có ảnh, ${kq.loi.length} lỗi` + (kq.loi.length ? '\n - ' + kq.loi.join('\n - ') : ''));
  return kq;
}

if (process.argv[1] && path.resolve(process.argv[1]) === TEP) {
  await xuatAnhKho(process.argv[2] ? path.resolve(process.argv[2]) : null);
}
