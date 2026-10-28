// 📝 19/10/2026 — LUẬT: GIỚI HẠN CHƠI giải đấu / giao hữu (web v1.375.0). Chép khuôn dang-luat-giai-dau-v2.js: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, CHỐT DỪNG.
//
//   node tools/dang-luat-gioi-han-choi.js --xem | --bien-dich | --dang | --kiem | --lui <rulesetName>
//
// Sửa 4 chỗ trong khối tranDau + thêm 2 khối:
//   · hàm tdCai/tdGio/tdDem/tdNgay/tdHet (đọc caiDat/choiGame — thiếu ⇒ mặc định 23→6, 20 trận/ngày)
//   · em mời em: cấm lúc nghỉ đêm + cấm khi em HOẶC bạn đã đủ số trận hôm nay (phiếu tdHan/{uid})
//   · em bấm Nhận trận em–em: cấm lúc nghỉ đêm / em đã đủ trận (trận CÓ THẦY tự do; Từ chối / Huỷ luôn được)
//   · tdHan/{uid}: chỉ đọc (máy chủ tdDoi ghi) · caiDat/choiGame: ai đăng nhập đọc, THẦY ghi (đủ 6 khoá, số trong khoảng)
// Đi kèm: app may-chu/functions/tran-dau.js (tdDoi đếm + khongTinh, chot) · js/the-td.js (GioiHan) · nw/js/thachdau.js · nw/js/giaidau.js · nw/js/tran.js
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const PROJECT = 'aword-70dae';
const API_KEY = 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY';   // khoá CÔNG KHAI (config.js)
const API = 'https://firebaserules.googleapis.com/v1';
const DB = `projects/${PROJECT}/databases/(default)`;
const FS_GOC = `https://firestore.googleapis.com/v1/${DB}/documents`;
const IDT = 'https://identitytoolkit.googleapis.com/v1';
const DUOI_EMAIL = '@id.andrewclasses.com';
const KHOA_UNG_VIEN = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'E:\\LAP TRINH APP\\mySpeaking-data\\data\\firebase-admin.json',
  'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'];
const TAI_LIEU_UNG_VIEN = ['E:/LAP TRINH APP/myLesson-data/tai-lieu', 'D:/APP AND DATA/myLesson-data/tai-lieu'];

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function soDong(cu, moi) {
  const a = cu.split('\n'), b = moi.split('\n');
  const dem = (ds) => { const m = new Map(); ds.forEach((x) => m.set(x, (m.get(x) || 0) + 1)); return m; };
  const ma = dem(a), mb = dem(b), them = [], bot = [];
  mb.forEach((n, k) => { const d = n - (ma.get(k) || 0); for (let i = 0; i < d; i++) them.push(k); });
  ma.forEach((n, k) => { const d = n - (mb.get(k) || 0); for (let i = 0; i < d; i++) bot.push(k); });
  return { them, bot };
}

// ───────── HTTP ─────────
function goi(url, opt) {
  const o = opt || {};
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = Object.assign({}, o.headers || {});
    let body = null;
    if (o.json !== undefined) { body = JSON.stringify(o.json); headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(body); }
    else if (o.form !== undefined) { body = o.form; headers['Content-Type'] = 'application/x-www-form-urlencoded'; headers['Content-Length'] = Buffer.byteLength(body); }
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: o.method || 'GET', headers }, (res) => {
      let d = ''; res.setEncoding('utf8'); res.on('data', (c) => { d += c; });
      res.on('end', () => { let j = null; try { j = d ? JSON.parse(d) : null; } catch (_) { j = { _raw: d.slice(0, 300) }; } resolve({ status: res.statusCode, json: j }); });
    });
    req.setTimeout(30000, () => req.destroy(new Error('QUA_LAU')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
let _sa = null, _token = null;
function khoa() {
  if (_sa) return _sa;
  const duong = KHOA_UNG_VIEN.find((p) => p && fs.existsSync(p));
  if (!duong) throw new Error('KHOA_THIEU_FILE — chép khoá về máy bằng D:\\APP AND DATA\\_KHOA\\CAI KHOA FIREBASE.bat');
  _sa = JSON.parse(fs.readFileSync(duong, 'utf8').replace(/^\uFEFF/, ''));
  return _sa;
}
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function kyJwt(payload) {
  const sa = khoa();
  const phan = b64u({ alg: 'RS256', typ: 'JWT' }) + '.' + b64u(payload);
  return phan + '.' + crypto.createSign('RSA-SHA256').update(phan).sign(sa.private_key).toString('base64url');
}
async function tokenQuanTri() {
  if (_token) return _token;
  const sa = khoa();
  const now = Math.floor(Date.now() / 1000);
  const jwt = kyJwt({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const r = await goi('https://oauth2.googleapis.com/token', { method: 'POST', form: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt) });
  if (r.status !== 200 || !r.json || !r.json.access_token) throw new Error('KHONG_XIN_DUOC_TOKEN_' + r.status);
  _token = r.json.access_token;
  return _token;
}
async function H() { return { Authorization: 'Bearer ' + await tokenQuanTri() }; }
async function docRelease(ten) {
  const r = await goi(`${API}/projects/${PROJECT}/releases/${ten}`, { headers: await H() });
  if (r.status !== 200) throw new Error('RELEASE_' + ten + '_' + r.status + ' ' + JSON.stringify(r.json));
  const rs = await goi(`${API}/${r.json.rulesetName}`, { headers: await H() });
  if (rs.status !== 200) throw new Error('RULESET_' + rs.status);
  return { rulesetName: r.json.rulesetName, source: rs.json.source.files.map((f) => f.content).join('\n'), fileName: rs.json.source.files[0].name };
}
async function taoRuleset(source, fileName) {
  const r = await goi(`${API}/projects/${PROJECT}/rulesets`, { method: 'POST', headers: await H(), json: { source: { files: [{ name: fileName, content: source }] } } });
  if (r.status !== 200) throw new Error('TAO_RULESET_' + r.status + ' ' + JSON.stringify(r.json));
  return r.json.name;
}
async function datRelease(ten, rulesetName) {
  const name = `projects/${PROJECT}/releases/${ten}`;
  const r = await goi(`${API}/${name}`, { method: 'PATCH', headers: await H(), json: { release: { name, rulesetName }, updateMask: 'rulesetName' } });
  if (r.status !== 200) throw new Error('DAT_RELEASE_' + ten + '_' + r.status + ' ' + JSON.stringify(r.json));
  return r.json;
}
function ghiTaiLieu(ten, noiDung) {
  const tm = TAI_LIEU_UNG_VIEN.find((p) => fs.existsSync(path.dirname(p))) || TAI_LIEU_UNG_VIEN[0];
  try { fs.mkdirSync(tm, { recursive: true }); fs.writeFileSync(path.join(tm, ten), noiDung, 'utf8'); console.log('  đã ghi', path.join(tm, ten)); } catch (e) { console.log('  (không ghi được tài liệu:', e.message, ')'); }
}
async function xoaTaiLieu(paths) {
  if (!paths.length) return 0;
  const r = await goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit`, { method: 'POST', headers: await H(), json: { writes: paths.map((p) => ({ delete: DB + '/documents/' + p })) } });
  if (r.status !== 200) throw new Error('XOA_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  return r.json.writeResults.length;
}

// ───────── tài khoản thử (khoá quản trị, REST Identity Toolkit) ─────────
function emailTuMa(ma) { return crypto.createHash('sha256').update(ma).digest('hex').slice(0, 24) + DUOI_EMAIL; }
async function taoTkThu(uid, ma, claims) {
  const mk = 'ztest-' + crypto.randomBytes(9).toString('base64url');
  await goi(`${IDT}/projects/${PROJECT}/accounts:delete`, { method: 'POST', headers: await H(), json: { localId: uid } });
  const r = await goi(`${IDT}/projects/${PROJECT}/accounts`, { method: 'POST', headers: await H(), json: { localId: uid, email: emailTuMa(ma), password: mk } });
  if (r.status !== 200) throw new Error('TAO_TK_THU_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  const c = await goi(`${IDT}/projects/${PROJECT}/accounts:update`, { method: 'POST', headers: await H(), json: { localId: uid, customAttributes: JSON.stringify(claims) } });
  if (c.status !== 200) throw new Error('CLAIMS_TK_THU_' + c.status);
  const s = await goi(`${IDT}/accounts:signInWithPassword?key=${API_KEY}`, { method: 'POST', json: { email: emailTuMa(ma), password: mk, returnSecureToken: true } });
  if (s.status !== 200) throw new Error('DANG_NHAP_TK_THU_' + s.status + ' ' + JSON.stringify(s.json).slice(0, 200));
  return s.json.idToken;
}
async function xoaTkThu(uid) { await goi(`${IDT}/projects/${PROJECT}/accounts:delete`, { method: 'POST', headers: await H(), json: { localId: uid } }); }
async function ghiAdmin(p, fields) {
  const r = await goi(`${FS_GOC}/${p}`, { method: 'PATCH', headers: await H(), json: { fields } });
  if (r.status !== 200) throw new Error('GHI_ADMIN_' + p + '_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
}

const DAU_HIEU = '(19/10/2026) GIOI HAN CHOI';
// 1) hàm dùng chung đầu khối tranDau
const H_CU = "    match /tranDau/{id} {\n      function tdGiaiMo(g, d) {\n";
const H_MOI =
  "    match /tranDau/{id} {\n" +
  "      // " + DAU_HIEU + " (web v1.375.0): nghi dem 23:00-6:00 gio VN + tran/ngay (caiDat/choiGame, thieu = mac dinh). Phieu dem tdHan/{uid} chi may chu ghi.\n" +
  "      // Chi ap cho tran EM-EM (tran co thay = tu do). Ham tdDoi chan them lan nua (trangThai 'han').\n" +
  "      function tdCai() {\n" +
  "        return exists(/databases/$(database)/documents/caiDat/choiGame) ? get(/databases/$(database)/documents/caiDat/choiGame).data : {};\n" +
  "      }\n" +
  "      function tdGio() { return (request.time.hours() + 7) % 24 + request.time.minutes() / 60.0; }\n" +
  "      function tdDem() {\n" +
  "        let c = tdCai();\n" +
  "        let tu = c.get('nghiTu', 23);\n" +
  "        let den = c.get('nghiDen', 6);\n" +
  "        return c.get('bat', true) == true && (tu > den ? (tdGio() >= tu || tdGio() < den) : (tdGio() >= tu && tdGio() < den));\n" +
  "      }\n" +
  "      function tdNgay() { return math.floor((request.time.toMillis() + 25200000) / 86400000); }\n" +
  "      function tdHet(u) {\n" +
  "        return exists(/databases/$(database)/documents/tdHan/$(u))\n" +
  "          && get(/databases/$(database)/documents/tdHan/$(u)).data.get('ngay', 0) == tdNgay()\n" +
  "          && get(/databases/$(database)/documents/tdHan/$(u)).data.get('so', 0) >= tdCai().get('tranNgay', 20);\n" +
  "      }\n" +
  "      function tdGiaiMo(g, d) {\n";
// 2) em mời em
const T_CU = "        && tdGiaiHop(request.resource.data);\n";
const T_MOI = "        && tdGiaiHop(request.resource.data)\n        && !tdDem() && !tdHet(nwToi()) && !tdHet(request.resource.data.b);\n";
// 3) em bấm Nhận trận em–em
const N_CU = "            || (request.auth.uid == resource.data.a && request.resource.data.trangThai == 'huy'));\n";
const N_MOI = "            || (request.auth.uid == resource.data.a && request.resource.data.trangThai == 'huy'))\n" +
  "        && (request.resource.data.trangThai != 'nhan' || resource.data.get('gv', null) != null || (!tdDem() && !tdHet(request.auth.uid)));\n";
// 4) phiếu đếm + cài đặt
const L_CU = "    match /tdLichSu/{uid} {\n      allow read: if laThay() || (request.auth != null && request.auth.uid == uid);\n    }\n";
const L_MOI = L_CU +
  "    // " + DAU_HIEU + ": phieu dem tran trong ngay (may chu ghi) - ai dang nhap mang cung doc (de bao ban het luot)\n" +
  "    match /tdHan/{uid} {\n" +
  "      allow read: if nwVao();\n" +
  "    }\n" +
  "    // " + DAU_HIEU + ": cai dat gioi han choi - thay sua tren trang Giai dau\n" +
  "    match /caiDat/choiGame {\n" +
  "      allow read: if request.auth != null;\n" +
  "      allow write: if laThay()\n" +
  "        && request.resource.data.keys().hasOnly(['bat', 'nghiTu', 'nghiDen', 'tranNgay', 'giaiNgay', 'capNgay', 'capNhat'])\n" +
  "        && request.resource.data.keys().hasAll(['bat', 'nghiTu', 'nghiDen', 'tranNgay', 'giaiNgay', 'capNgay'])\n" +
  "        && request.resource.data.bat is bool\n" +
  "        && (request.resource.data.nghiTu is int || request.resource.data.nghiTu is float) && request.resource.data.nghiTu >= 0 && request.resource.data.nghiTu < 24\n" +
  "        && (request.resource.data.nghiDen is int || request.resource.data.nghiDen is float) && request.resource.data.nghiDen >= 0 && request.resource.data.nghiDen < 24\n" +
  "        && request.resource.data.tranNgay is int && request.resource.data.tranNgay >= 1 && request.resource.data.tranNgay <= 200\n" +
  "        && request.resource.data.giaiNgay is int && request.resource.data.giaiNgay >= 1 && request.resource.data.giaiNgay <= 200\n" +
  "        && request.resource.data.capNgay is int && request.resource.data.capNgay >= 1 && request.resource.data.capNgay <= 50;\n" +
  "    }\n";

// 27/10/2026: luật đang chạy đã có khối giới hạn ⇒ chỉ vá giờ nghỉ cho có PHÚT (22:30 = 22.5)
const PHUT_CU = ['      function tdGio() { return (request.time.hours() + 7) % 24; }', '        && request.resource.data.nghiTu is int && request.resource.data.nghiTu >= 0 && request.resource.data.nghiTu <= 23', '        && request.resource.data.nghiDen is int && request.resource.data.nghiDen >= 0 && request.resource.data.nghiDen <= 23'];
const PHUT_MOI = ['      function tdGio() { return (request.time.hours() + 7) % 24 + request.time.minutes() / 60.0; }', '        && (request.resource.data.nghiTu is int || request.resource.data.nghiTu is float) && request.resource.data.nghiTu >= 0 && request.resource.data.nghiTu < 24', '        && (request.resource.data.nghiDen is int || request.resource.data.nghiDen is float) && request.resource.data.nghiDen >= 0 && request.resource.data.nghiDen < 24'];
function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) {
    if (cu.includes(PHUT_MOI[0])) throw new Error('CHOT DUNG: luật ĐÃ có giờ nghỉ theo phút — không đăng lại');
    return PHUT_CU.reduce((s, x, i) => thayMot(s, x, PHUT_MOI[i], 'giờ nghỉ có phút ' + (i + 1)), cu);
  }
  let s = thayMot(cu, H_CU, H_MOI, 'tranDau: hàm giới hạn');
  s = thayMot(s, T_CU, T_MOI, 'tranDau: em mời em');
  s = thayMot(s, N_CU, N_MOI, 'tranDau: em nhận');
  return thayMot(s, L_CU, L_MOI, 'tdHan + caiDat');
}

// ───────── KIỂM (REST thật, tài khoản ZTEST tạo rồi xoá ngay) ─────────
// ⚠ Phép thử giờ nghỉ đêm đổi TẠM caiDat/choiGame (vài giây) rồi trả lại mặc định — chạy lúc ít học sinh đấu.
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b });
  const L = (a) => ({ arrayValue: { values: a } }), M = (o) => ({ mapValue: { fields: o } });
  const LOP = 'ZTESTGH', A = 'hs_9999981', Bb = 'hs_9999982', T = 'ztest_thay_gh';
  const bay = Date.now(), NGAY = Math.floor((bay + 7 * 3600e3) / 864e5), GIO = new Date(bay + 7 * 3600e3).getUTCHours();
  const CAI = (o) => Object.assign({ bat: B(true), nghiTu: I(23), nghiDen: I(6), tranNgay: I(20), giaiNgay: I(10), capNgay: I(3) }, o || {});
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb, 'tdHan/' + A, 'tdHan/' + Bb];
  const datCai = (o) => ghiAdmin('caiDat/choiGame', Object.assign(CAI(o), { capNhat: I(Date.now()) }));
  console.log('luật đang chạy:', (await docRelease('cloud.firestore')).rulesetName, '· giờ VN', GIO);
  if (GIO >= 23 || GIO < 6) throw new Error('Đang giờ nghỉ đêm — chạy --kiem ban ngày (các phép "mời được" sẽ trượt).');
  let tk = {};
  // 27/10: giữ cài đặt GỐC của thầy (trước đây trả về mặc định 23–6/20 trận ⇒ mất cài đặt thật)
  const caiGoc = ((await goi(`${FS_GOC}/caiDat/choiGame`, { headers: await H() })).json || {}).fields || null;
  try {
    await datCai();
    const hs = (uid, ten) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(LOP), cacLop: L([S(LOP)]), anh: S(''), capNhat: I(bay) });
    await hs(A, 'ZTEST GH AN'); await hs(Bb, 'ZTEST GH BINH');
    tk[A] = await taoTkThu(A, 'ZTEST9999981', { hs: true, ma: 'ZTEST9999981', lop: LOP, lops: LOP, msId: 0 });
    tk[Bb] = await taoTkThu(Bb, 'ZTEST9999982', { hs: true, ma: 'ZTEST9999982', lop: LOP, lops: LOP, msId: 0 });
    tk[T] = await taoTkThu(T, 'ZTESTTHAYGH', { thay: true });
    const H2 = (t) => ({ Authorization: 'Bearer ' + t });
    const moi = (o) => { const l = Date.now(); return { fields: Object.assign({ a: S(A), b: S(Bb), nguoi: L([S(A), S(Bb)]), tenA: S('ZTEST GH AN'), tenB: S('ZTEST GH BINH'), lop: S(LOP), giai: S(''),
      phut: I(2), lv: S('easy'), trangThai: S('moi'), taoLuc: I(l), het: I(l + 60000) }, o || {}) }; };
    const thayMoi = () => { const l = Date.now(); return { fields: { a: S(T), b: S(Bb), nguoi: L([S(T), S(Bb)]), tenA: S('Thầy Andrew'), tenB: S('ZTEST GH BINH'), lop: S(LOP), giai: S(''),
      phut: I(2), lv: S('easy'), trangThai: S('moi'), taoLuc: I(l), het: I(l + 60000), gv: S(T) } }; };
    let dem = 0;
    const tao = async (tkn, body) => { const id = 'ztest_gh_' + bay + '_' + (dem++); const r = await goi(`${FS_GOC}/tranDau${k}&documentId=${id}`, { method: 'POST', headers: H2(tkn), json: body }); if (r.status === 200) xoa.push('tranDau/' + id); return { st: r.status, id }; };
    const sua = (tkn, p, fields) => goi(`${FS_GOC}/${p}${k}` + Object.keys(fields).map((x) => '&updateMask.fieldPaths=' + x).join(''), { method: 'PATCH', headers: H2(tkn), json: { fields } });
    // trận thử bấm Nhận xong ⇒ xoá NGAY (hàm tdDoi không dựng trận / không ghi phiếu đếm cho tài khoản thử)
    const nhan = async (id) => { const r = await sua(tk[Bb], 'tranDau/' + id, { trangThai: S('nhan') }); if (r.status === 200) await xoaTaiLieu(['tranDau/' + id]); return r.status; };
    const han = (uid, so) => ghiAdmin('tdHan/' + uid, { ngay: I(NGAY), so: I(so), giai: M({}), cap: M({}) });

    ok('A mời B (ban ngày, chưa có phiếu đếm) = 200', (await tao(tk[A], moi())).st, 200);
    await han(A, 19);
    ok('A đã chơi 19 trận hôm nay ⇒ mời được = 200', (await tao(tk[A], moi())).st, 200);
    await han(A, 20);
    ok('A đã chơi 20 trận ⇒ mời = 403', (await tao(tk[A], moi())).st, 403);
    await ghiAdmin('tdHan/' + A, { ngay: I(NGAY - 1), so: I(50), giai: M({}), cap: M({}) });
    ok('Phiếu 50 trận của HÔM QUA ⇒ hôm nay mời được = 200', (await tao(tk[A], moi())).st, 200);
    await han(A, 0); await han(Bb, 20);
    // 28/10/2026 (dang-luat-moi-giai-doc.js): lúc MỜI không kiểm phiếu của bạn nữa (lượt kiểm mời GIẢI vượt 10 lượt đọc) — chặn ở bước bạn bấm Nhận
    ok('B (người được mời) đã hết 20 trận ⇒ A vẫn mời được = 200 (chặn lúc B Nhận)', (await tao(tk[A], moi())).st, 200);
    await han(Bb, 0);
    const t1 = await tao(tk[A], moi());
    await han(Bb, 20);
    ok('B hết lượt ⇒ bấm Nhận = 403', await nhan(t1.id), 403);
    ok('B hết lượt ⇒ bấm Từ chối vẫn được = 200', (await sua(tk[Bb], 'tranDau/' + t1.id, { trangThai: S('tuchoi') })).status, 200);
    const t2 = await tao(tk[T], thayMoi());
    ok('THẦY mời B (B hết lượt) = 200', t2.st, 200);
    ok('B hết lượt vẫn Nhận trận với THẦY = 200', await nhan(t2.id), 200);
    await han(Bb, 3);
    const t3 = await tao(tk[A], moi());
    ok('B còn lượt ⇒ bấm Nhận = 200', await nhan(t3.id), 200);
    ok('Học sinh đọc phiếu đếm của bạn = 200', (await goi(`${FS_GOC}/tdHan/${Bb}${k}`, { headers: H2(tk[A]) })).status, 200);
    ok('Học sinh tự sửa phiếu đếm = 403', (await sua(tk[A], 'tdHan/' + A, { so: I(0) })).status, 403);
    ok('Học sinh đọc cài đặt = 200', (await goi(`${FS_GOC}/caiDat/choiGame${k}`, { headers: H2(tk[A]) })).status, 200);
    ok('Học sinh sửa cài đặt = 403', (await sua(tk[A], 'caiDat/choiGame', CAI({ tranNgay: I(200) }))).status, 403);
    ok('Thầy sửa cài đặt sai (nghiTu 30) = 403', (await sua(tk[T], 'caiDat/choiGame', CAI({ nghiTu: I(30) }))).status, 403);
    ok('Thầy ghi đè cài đặt thiếu khoá = 403', (await goi(`${FS_GOC}/caiDat/choiGame${k}`, { method: 'PATCH', headers: H2(tk[T]), json: { fields: { bat: B(true) } } })).status, 403);
    ok('Thầy sửa cài đặt đúng = 200', (await sua(tk[T], 'caiDat/choiGame', Object.assign(CAI(), { capNhat: I(Date.now()) }))).status, 200);
    await han(Bb, 0);
    // ---- giờ nghỉ đêm: đặt TẠM khung nghỉ phủ giờ hiện tại ----
    const t4 = await tao(tk[A], moi());
    await datCai({ nghiTu: I(GIO), nghiDen: I((GIO + 1) % 24) });
    try {
      ok('Giờ nghỉ đêm ⇒ A mời B = 403', (await tao(tk[A], moi())).st, 403);
      ok('Giờ nghỉ đêm ⇒ B bấm Nhận = 403', await nhan(t4.id), 403);
      const t5 = await tao(tk[T], thayMoi());
      ok('Giờ nghỉ đêm ⇒ THẦY mời B vẫn được = 200', t5.st, 200);
      await datCai({ bat: B(false), nghiTu: I(GIO), nghiDen: I((GIO + 1) % 24) });
      ok('Tắt giới hạn (bat=false) ⇒ A mời = 200', (await tao(tk[A], moi())).st, 200);
    } finally { await datCai(); }
    ok('Trả lại mặc định ⇒ A mời = 200', (await tao(tk[A], moi())).st, 200);
  } finally {
    try {
      const q = await goi(`${FS_GOC}/nwUsers/${Bb}/thongBao?pageSize=50`, { headers: await H() });
      ((q.json && q.json.documents) || []).forEach((d) => xoa.push(d.name.split('/documents/')[1]));
    } catch (_) { }
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử');
    for (const u of [A, Bb, T]) await xoaTkThu(u);
    if (caiGoc) await ghiAdmin('caiDat/choiGame', caiGoc);
    console.log('  xoá 3 tài khoản thử · caiDat/choiGame ' + (caiGoc ? 'trả lại cài đặt gốc của thầy' : '= mặc định'));
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  const TEN = 'tools/dang-luat-gioi-han-choi.js';
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-gioi-han-choi.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--bien-dich')) { console.log('BIÊN DỊCH OK (chưa kích hoạt):', await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules')); return; }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-gioi-han-choi.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node ' + TEN + ' --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node ' + TEN + ' --kiem');
      return;
    }
    console.log('Dùng: --xem | --bien-dich | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
