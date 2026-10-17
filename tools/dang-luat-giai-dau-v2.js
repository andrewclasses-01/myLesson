// 📝 17/10/2026 — LUẬT: GIẢI ĐẤU TẠO TỪ myLesson (web v1.371.0, Đợt 1 của "giải đấu tạo từ app"). Chép khuôn `dang-luat-giai-dau-bo.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, CHỐT DỪNG.
//
//   node tools/dang-luat-giai-dau-v2.js --xem | --bien-dich | --dang | --kiem | --lui <rulesetName>
//
// Sửa ĐÚNG 1 chỗ, ⛔ không đụng gì khác: giaiDau gdHop — thêm vào hasOnly đúng 4 khoá của HỢP ĐỒNG DỮ LIỆU 3 kho:
//   hinhThuc (string) · assignment (string 6 ký tự) · nguon (string) · buoi (map {lop, dayId})   — thiếu/null = như cũ
// Lý do: web "Đóng giải / Thưởng sao / Sửa" ghi lại cả tài liệu; giải do app myLesson tạo có khoá lạ sẽ bị 403 nếu luật chưa biết.
// Đi kèm: nw/js/giaidau.js (khoá form Sửa với giải nguon=='mylesson') · js/the-giai.js
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


const DAU_HIEU = '(17/10/2026) GIAI TU myLESSON';
const GD_CU =
  "        return d.keys().hasOnly(['ten', 'lops', 'game', 'phut', 'lv', 'tu', 'den', 'sao', 'dong', 'daThuong', 'taoLuc', 'capNhat', 'boi', 'bo'])\n";
const GD_MOI =
  "        // " + DAU_HIEU + " (web v1.371.0): 4 khoa moi cua giai tao tu app - hinhThuc (string), assignment (ma 6 ky tu), nguon (string), buoi {lop, dayId}; thieu/null = nhu cu\n" +
  "        return d.keys().hasOnly(['ten', 'lops', 'game', 'phut', 'lv', 'tu', 'den', 'sao', 'dong', 'daThuong', 'taoLuc', 'capNhat', 'boi', 'bo', 'hinhThuc', 'assignment', 'nguon', 'buoi'])\n" +
  "          && (d.get('hinhThuc', null) == null || (d.hinhThuc is string && d.hinhThuc.size() <= 20))\n" +
  "          && (d.get('assignment', null) == null || (d.assignment is string && d.assignment.size() == 6))\n" +
  "          && (d.get('nguon', null) == null || (d.nguon is string && d.nguon.size() <= 20))\n" +
  "          && (d.get('buoi', null) == null || (d.buoi is map && d.buoi.keys().hasOnly(['lop', 'dayId'])\n" +
  "              && d.buoi.get('lop', '') is string && d.buoi.get('dayId', '') is string))\n";

function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ có khoá giải từ myLesson — không đăng lại');
  return thayMot(cu, GD_CU, GD_MOI, 'giaiDau: 4 khoá mới');
}

// ───────── KIỂM (REST thật, tài khoản ZTEST tạo rồi xoá ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b });
  const L = (a) => ({ arrayValue: { values: a } }), M = (o) => ({ mapValue: { fields: o } });
  const LOP = 'ZTESTV2A', LOP2 = 'ZTESTV2B', A = 'hs_9999971', Bb = 'hs_9999972', T = 'ztest_thay_v2';
  const MA = { [A]: 'ZTEST9999971', [Bb]: 'ZTEST9999972', [T]: 'ZTESTTHAYV2' };
  const bay = Date.now();
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb];
  console.log('luật đang chạy:', (await docRelease('cloud.firestore')).rulesetName);
  try {
    const hs = (uid, ten, lop) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(lop), cacLop: L([S(lop)]), anh: S(''), capNhat: I(bay) });
    await hs(A, 'ZTEST V2 AN', LOP); await hs(Bb, 'ZTEST V2 BINH', LOP2);
    const tk = {};
    tk[A] = await taoTkThu(A, MA[A], { hs: true, ma: MA[A], lop: LOP, lops: LOP, msId: 0 });
    tk[Bb] = await taoTkThu(Bb, MA[Bb], { hs: true, ma: MA[Bb], lop: LOP2, lops: LOP2, msId: 0 });
    tk[T] = await taoTkThu(T, MA[T], { thay: true });
    const H2 = (t) => ({ Authorization: 'Bearer ' + t });
    const goc = () => ({ ten: S('ZTEST giai v2'), lops: L([S(LOP)]), game: S('aShowSpeed'), phut: I(2), lv: S('easy'),
      tu: I(bay - 60000), den: I(bay + 3600e3), sao: L([I(3), I(2), I(1)]), dong: B(false) });
    const moi = () => Object.assign(goc(), { hinhThuc: S('cap'), assignment: S('ABC123'), nguon: S('mylesson'), buoi: M({ lop: S(LOP), dayId: S('day_1') }) });
    const tao = (id, fields, tkn) => goi(`${FS_GOC}/giaiDau${k}&documentId=${id}`, { method: 'POST', headers: H2(tkn || tk[T]), json: { fields } });
    const sua = (id, fields) => goi(`${FS_GOC}/giaiDau/${id}${k}`, { method: 'PATCH', headers: H2(tk[T]), json: { fields } });
    const id1 = 'ztest_giai_v2a_' + bay, id2 = 'ztest_giai_v2b_' + bay, id3 = 'ztest_giai_v2c_' + bay;
    ok('Thầy tạo giải CÓ 4 khoá mới = 200', (await tao(id1, moi())).status, 200); xoa.push('giaiDau/' + id1);
    ok('Thầy tạo giải KHÔNG khoá mới (như cũ) = 200', (await tao(id2, goc())).status, 200); xoa.push('giaiDau/' + id2);
    ok('Web ghi lại giải có khoá mới (Đóng giải: dong=true) = 200', (await sua(id1, Object.assign(moi(), { dong: B(true) }))).status, 200);
    ok('Web ghi lại giải có khoá mới (Thưởng sao: daThuong) = 200', (await sua(id1, Object.assign(moi(), { dong: B(true), daThuong: I(bay) }))).status, 200);
    ok('assignment sai độ dài (5 ký tự) = 403', (await tao(id3, Object.assign(moi(), { assignment: S('ABC12') }))).status, 403);
    ok('assignment sai kiểu (số) = 403', (await tao(id3, Object.assign(moi(), { assignment: I(123456) }))).status, 403);
    ok('buoi sai kiểu (string) = 403', (await tao(id3, Object.assign(moi(), { buoi: S('x') }))).status, 403);
    ok('buoi thêm khoá lạ = 403', (await tao(id3, Object.assign(moi(), { buoi: M({ lop: S(LOP), dayId: S('d'), z: S('1') }) }))).status, 403);
    ok('Khoá lạ ngoài 4 khoá (zzz) = 403', (await tao(id3, Object.assign(moi(), { zzz: S('1') }))).status, 403);
    ok('Học sinh tạo giải (kể cả khoá mới) = 403', (await tao(id3, moi(), tk[A])).status, 403);
    ok('Học sinh CÙNG LỚP đọc giải = 200', (await goi(`${FS_GOC}/giaiDau/${id1}${k}`, { headers: H2(tk[A]) })).status, 200);
    ok('Học sinh LỚP KHÁC đọc bảng giải = 403', (await goi(`${FS_GOC}/giaiDau/${id1}/bang/${LOP}${k}`, { headers: H2(tk[Bb]) })).status, 403);
  } finally {
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử');
    for (const u of [A, Bb, T]) await xoaTkThu(u);
    console.log('  xoá 3 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  const TEN = 'tools/dang-luat-giai-dau-v2.js';
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-giai-dau-v2.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--bien-dich')) { console.log('BIÊN DỊCH OK (chưa kích hoạt):', await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules')); return; }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-giai-dau-v2.rules', fsCu.source);
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
