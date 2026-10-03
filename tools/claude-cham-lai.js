// 🟢 03/10/2026 — ĐƯỜNG CHO CLAUDE CHẤM LẠI BÀI KIỂM TRA ĐẦU VÀO (thầy yêu cầu khi cần; dashboard KHÔNG tự gọi Claude).
//
// Cách dùng (chạy trên máy có khoá quản trị Firebase — cùng khoá `dang-luat-*.js` dùng):
//   node tools/claude-cham-lai.js --ds [--ngay 2/10/2026] [--ten "ngoc anh"]
//        liệt kê bài ĐÃ NỘP theo ngày (giờ VN) / theo tên: em nào, nộp ngày giờ nào, điểm từng bài, đã có báo cáo / đã có Claude chấm lại chưa
//   node tools/claude-cham-lai.js --xuat <ID> [--ra file.json]
//        xuất bài làm của 1 em ra file JSON để Claude ĐỌC: từng câu (đề · con viết · đáp án · các đáp án chấp nhận · máy chấm đúng/sai) + ghi chú đang có
//   node tools/claude-cham-lai.js --ghi file.json
//        Claude ghi kết quả chấm lại vào `ktdvBaoCao/<ID>` (dashboard mở báo cáo là thấy ngay):
//          { "ma": "ID", "claudeGhiChu": "lý do/ghi chú ngắn (tuỳ chọn)",
//            "uuDiem": "…", "hanChe": "…",                       // nhận xét chung (mỗi dòng = 1 ý)
//            "ghiChu": { "BT1:7": "lời giải thích câu 7 của BT1", … },   // câu SAI: lời giải thích kỹ như cột “Nhận xét” trong file Excel
//            "sua":    { "BT3:12": true, "BT2:4": false } }         // đổi Đúng/Sai: true = đúng, false = sai (khi máy chấm oan/lọt)
//        Chỉ GỘP vào những gì đã có (không xoá phần thầy đã sửa trừ khi trùng khoá); đặt `claudeLuc` = bây giờ.
//   node tools/claude-cham-lai.js --go <ID>      gỡ phần Claude đã ghi (ghiChu + claudeLuc + claudeGhiChu), trả về lời giải thích tự động
//
// ⛔ Sau --ghi: link đã gửi phụ huynh KHÔNG tự đổi — thầy mở báo cáo trên dashboard, đọc lại rồi bấm “Cập nhật link PH”.
// ⛔ Khoá câu = "BT<bài>:<số câu bắt đầu từ 1>" (giống cột STT trong file Excel). Chỉ ĐỌC kho results/ktdvHoSo/assignments; chỉ GHI ktdvBaoCao/<ID>.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const PROJECT = 'aword-70dae';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const KHOA_UNG_VIEN = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'E:\\LAP TRINH APP\\mySpeaking-data\\data\\firebase-admin.json', 'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'];
// 3 bài giao (⛔ khớp js/ktdv-ql.js BAI)
const BAI = [{ ma: 'BT1', code: '5576de', ten: 'Tạo cụm số ít', n: 40 }, { ma: 'BT2', code: 'bc52sb', ten: 'Tạo cụm số nhiều', n: 20 }, { ma: 'BT3', code: 'khszvm', ten: 'Tạo câu', n: 50 }];

function goi(url, o) {
  o = o || {};
  return new Promise((res, rej) => {
    const u = new URL(url); const body = o.body || null;
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: o.method || 'GET', headers: Object.assign({}, o.headers, body ? { 'Content-Length': Buffer.byteLength(body) } : {}) },
      (x) => { let d = ''; x.setEncoding('utf8'); x.on('data', (c) => d += c); x.on('end', () => { let j = null; try { j = d ? JSON.parse(d) : null; } catch (_) { j = { _raw: d.slice(0, 300) }; } res({ s: x.statusCode, j }); }); });
    r.setTimeout(30000, () => r.destroy(new Error('QUA_LAU'))); r.on('error', rej); if (body) r.write(body); r.end();
  });
}
let _tk = null;
async function H() {
  if (!_tk) {
    const kp = KHOA_UNG_VIEN.find((p) => p && fs.existsSync(p));
    if (!kp) throw new Error('KHOA_THIEU_FILE — chép khoá về máy bằng D:\\APP AND DATA\\_KHOA\\CAI KHOA FIREBASE.bat');
    const sa = JSON.parse(fs.readFileSync(kp, 'utf8').replace(/^\uFEFF/, ''));
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const p = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
    const jwt = p + '.' + crypto.createSign('RSA-SHA256').update(p).sign(sa.private_key).toString('base64url');
    const r = await goi('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt) });
    if (r.s !== 200) throw new Error('KHONG_XIN_DUOC_TOKEN_' + r.s);
    _tk = r.j.access_token;
  }
  return { Authorization: 'Bearer ' + _tk, 'Content-Type': 'application/json' };
}
// ---- Firestore typed JSON <-> JS ----
function giai(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return +v.integerValue; if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null; if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(giai);
  if ('mapValue' in v) { const o = {}; for (const k in (v.mapValue.fields || {})) o[k] = giai(v.mapValue.fields[k]); return o; }
  return null;
}
function ma(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(ma) } };
  const f = {}; Object.keys(x).forEach((k) => { f[k] = ma(x[k]); }); return { mapValue: { fields: f } };
}
const docObj = (d) => { const o = {}; for (const k in (d.fields || {})) o[k] = giai(d.fields[k]); return o; };
async function docDoc(p) { const r = await goi(`${BASE}/${p}`, { headers: await H() }); if (r.s === 404) return null; if (r.s !== 200) throw new Error('DOC_' + p + '_' + r.s); return docObj(r.j); }
async function ghiDoc(p, obj) {
  const fields = {}; Object.keys(obj).forEach((k) => { fields[k] = ma(obj[k]); });
  const r = await goi(`${BASE}/${p}`, { method: 'PATCH', headers: await H(), body: JSON.stringify({ fields }) });   // PATCH không mask = thay cả tài liệu bằng đúng `fields`
  if (r.s !== 200) throw new Error('GHI_' + p + '_' + r.s + ' ' + JSON.stringify(r.j).slice(0, 200));
}
async function lietKe(coll) {
  const out = []; let tok = '';
  do {
    const r = await goi(`${BASE}/${coll}?pageSize=300${tok ? '&pageToken=' + encodeURIComponent(tok) : ''}`, { headers: await H() });
    if (r.s !== 200) throw new Error('LIST_' + coll + '_' + r.s);
    (r.j.documents || []).forEach((d) => out.push(docObj(d))); tok = r.j.nextPageToken || '';
  } while (tok);
  return out;
}
async function docKetQua() {
  const q = { structuredQuery: { from: [{ collectionId: 'results' }], where: { fieldFilter: { field: { fieldPath: 'assignmentId' }, op: 'IN', value: { arrayValue: { values: BAI.map((b) => ({ stringValue: b.code })) } } } } } };
  const r = await goi(`${BASE}:runQuery`, { method: 'POST', headers: await H(), body: JSON.stringify(q) });
  if (r.s !== 200) throw new Error('RUNQUERY_' + r.s);
  return r.j.filter((x) => x.document).map((x) => Object.assign({ id: x.document.name.split('/').pop() }, docObj(x.document)));
}
// lượt NỘP HẲN mới nhất của (em, bài) — giống ktdv-ql.js
function tot(a) { return (a.doDang ? 0 : 1e15) + (a.createdAt || 0); }
function chonLuot(rows) {
  const m = {};
  rows.forEach((x) => { if (!x.ma) return; const k = String(x.ma).toUpperCase() + '|' + x.assignmentId; if (!m[k] || tot(x) > tot(m[k])) m[k] = x; });
  return m;
}
const vn = (ms) => { const d = new Date((ms || 0) + 7 * 3600e3); return d.getUTCDate() + '/' + (d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); };
const vnGio = (ms) => { const d = new Date((ms || 0) + 7 * 3600e3); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' ' + vn(ms); };
const khongDau = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
function chuanNgay(s) {   // "2/10" hoặc "2/10/2026" ⇒ "2/10/2026"
  const m = /^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{4}))?$/.exec(String(s || '').trim());
  if (!m) throw new Error('--ngay phải dạng D/M hoặc D/M/YYYY');
  return (+m[1]) + '/' + (+m[2]) + '/' + (m[3] || new Date().getFullYear());
}
function arg(ten) { const i = process.argv.indexOf(ten); return i >= 0 ? process.argv[i + 1] : null; }

async function cmdDs() {
  const [hoso, kq, bc] = await Promise.all([lietKe('ktdvHoSo'), docKetQua(), lietKe('ktdvBaoCao')]);
  const luot = chonLuot(kq), ngay = arg('--ngay') ? chuanNgay(arg('--ngay')) : null, ten = arg('--ten') ? khongDau(arg('--ten')) : null;
  const bcTheo = {}; bc.forEach((x) => { if (x.ma) bcTheo[String(x.ma).toUpperCase()] = x; });
  let dem = 0;
  hoso.sort((a, b) => (b.tao || 0) - (a.tao || 0)).forEach((h) => {
    const M = String(h.ma).toUpperCase();
    const ls = BAI.map((b) => ({ b, k: luot[M + '|' + b.code] })).filter((x) => x.k);
    if (!ls.length) return;
    if (ten && khongDau(h.ten + ' ' + (h.hoTen || '')).indexOf(ten) < 0) return;
    if (ngay && !ls.some((x) => vn(x.k.createdAt) === ngay)) return;
    dem++;
    const b = bcTheo[M];
    console.log(`• ${h.ten}${h.hoTen ? ' (' + h.hoTen + ')' : ''}  — ID ${h.ma}${h.trangThai === 'da-chuyen' ? '  [đã vào học]' : ''}`);
    ls.forEach((x) => console.log(`    ${x.b.ma} ${x.b.ten}: ${x.k.score}/${x.k.total}${x.k.doDang ? ' (DỞ DANG)' : ''} · nộp ${vnGio(x.k.createdAt)}`));
    console.log('    báo cáo: ' + (b ? (b.token ? 'đã gửi PH ' + (b.guiLuc ? vnGio(b.guiLuc) : '') : 'đã lưu') : 'chưa mở') + (b && b.claudeLuc ? ' · Claude chấm lại ' + vnGio(b.claudeLuc) : ''));
  });
  console.log(dem ? `\n${dem} em.` : 'Không có em nào khớp.');
}

async function cmdXuat() {
  const M = String(process.argv[process.argv.indexOf('--xuat') + 1] || '').toUpperCase();
  if (!M || M.startsWith('--')) throw new Error('thiếu ID em: --xuat <ID>');
  const hoso = (await lietKe('ktdvHoSo')).find((h) => String(h.ma).toUpperCase() === M);
  if (!hoso) throw new Error('Không có hồ sơ ID ' + M);
  const [kq, bc] = await Promise.all([docKetQua(), docDoc('ktdvBaoCao/' + M)]);
  const luot = chonLuot(kq), out = { hs: { ma: hoso.ma, ten: hoso.ten, hoTen: hoso.hoTen || '', truong: hoso.truong || '', lopTruong: hoso.lopTruong || '' }, bai: {}, baoCaoHienTai: bc || null };
  for (const b of BAI) {
    const k = luot[M + '|' + b.code];
    if (!k) { out.bai[b.ma] = { ten: b.ten, chuaNop: true }; continue; }
    const a = await docDoc('assignments/' + b.code), items = (a && a.activity && a.activity.content && a.activity.content.items) || [];
    out.bai[b.ma] = {
      ten: b.ten, code: b.code, nopLuc: vnGio(k.createdAt), doDang: !!k.doDang, diemMay: k.score + '/' + k.total,
      cau: (k.review || []).map((r, i) => ({
        k: b.ma + ':' + (i + 1), de: r.question, conViet: r.yourText || '', dapAn: r.correctText, dapAnChapNhan: (items[i] && items[i].acceptedAnswers) || [r.correctText],
        mayCham: r.yourCorrect ? 'dung' : 'sai', ghiChuHienTai: bc && bc.ghiChu && bc.ghiChu[b.ma + ':' + (i + 1)] || undefined,
        suaHienTai: bc && bc.sua && (b.code + ':' + i) in bc.sua ? bc.sua[b.code + ':' + i] : undefined
      }))
    };
  }
  const ra = arg('--ra') || path.join(os.tmpdir(), 'ktdv-' + M + '.json');
  fs.writeFileSync(ra, JSON.stringify(out, null, 1), 'utf8');
  console.log('Đã xuất:', ra, '— ' + Object.keys(out.bai).map((m) => m + (out.bai[m].chuaNop ? ' chưa nộp' : ' ' + out.bai[m].diemMay)).join(' · '));
}

async function cmdGhi() {
  const f = process.argv[process.argv.indexOf('--ghi') + 1];
  if (!f || f.startsWith('--') || !fs.existsSync(f)) throw new Error('thiếu file JSON: --ghi file.json');
  const inp = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
  const M = String(inp.ma || '').toUpperCase();
  if (!M) throw new Error('JSON thiếu "ma"');
  const hoso = (await lietKe('ktdvHoSo')).find((h) => String(h.ma).toUpperCase() === M);
  if (!hoso) throw new Error('Không có hồ sơ ID ' + M + ' — không ghi');
  const cu = (await docDoc('ktdvBaoCao/' + M)) || {};
  const bc = Object.assign({ sua: {}, loai: {}, ghiChu: {}, uuDiem: '', hanChe: '', guiLuc: 0, token: '', ma: hoso.ma, ten: hoso.ten }, cu);
  bc.sua = bc.sua || {}; bc.ghiChu = bc.ghiChu || {};
  const soCau = {}; BAI.forEach((b) => { soCau[b.ma] = b; });
  const kiemKhoa = (k) => { const m = /^(BT[123]):(\d+)$/.exec(k); if (!m || +m[2] < 1 || +m[2] > soCau[m[1]].n) throw new Error('khoá câu không hợp lệ: ' + k + ' (dạng BT1:7, số câu 1..n)'); return m; };
  let nGc = 0, nSua = 0;
  Object.keys(inp.ghiChu || {}).forEach((k) => { kiemKhoa(k); bc.ghiChu[k] = String(inp.ghiChu[k]).slice(0, 240); nGc++; });
  Object.keys(inp.sua || {}).forEach((k) => { const m = kiemKhoa(k); bc.sua[soCau[m[1]].code + ':' + (+m[2] - 1)] = !!inp.sua[k]; nSua++; });
  if (typeof inp.uuDiem === 'string') bc.uuDiem = inp.uuDiem;
  if (typeof inp.hanChe === 'string') bc.hanChe = inp.hanChe;
  bc.claudeLuc = Date.now(); bc.claudeGhiChu = String(inp.claudeGhiChu || '').slice(0, 200); bc.capNhat = Date.now();
  await ghiDoc('ktdvBaoCao/' + M, bc);
  console.log(`Đã ghi ktdvBaoCao/${M}: ${nGc} lời giải thích · ${nSua} câu đổi Đúng/Sai · nhận xét chung ${typeof inp.uuDiem === 'string' || typeof inp.hanChe === 'string' ? 'có' : 'không đổi'}.`);
  console.log('→ Thầy mở dashboard › KT ĐẦU VÀO › Báo cáo em ' + hoso.ten + ' để xem; muốn phụ huynh thấy bản mới thì bấm “Cập nhật link PH”.');
}

async function cmdGo() {
  const M = String(process.argv[process.argv.indexOf('--go') + 1] || '').toUpperCase();
  const cu = await docDoc('ktdvBaoCao/' + M);
  if (!cu) { console.log('Không có báo cáo của ' + M); return; }
  cu.ghiChu = {}; cu.claudeLuc = 0; cu.claudeGhiChu = ''; cu.capNhat = Date.now();
  await ghiDoc('ktdvBaoCao/' + M, cu);
  console.log('Đã gỡ phần Claude ghi cho ' + M + ' (nhận xét chung + các câu đã đổi Đúng/Sai giữ nguyên — thầy sửa tay nếu muốn bỏ).');
}

(async () => {
  try {
    if (process.argv.includes('--ds')) await cmdDs();
    else if (process.argv.includes('--xuat')) await cmdXuat();
    else if (process.argv.includes('--ghi')) await cmdGhi();
    else if (process.argv.includes('--go')) await cmdGo();
    else console.log('Dùng: --ds [--ngay D/M[/YYYY]] [--ten "…"] | --xuat <ID> [--ra file] | --ghi file.json | --go <ID>   (xem đầu file)');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
