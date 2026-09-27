// 📝 28/09/2026 — LUẬT cho HỒ SƠ EM trên dashboard (Đợt B1+B2, kế hoạch myLesson-app "KE HOACH QUAN LY HOC SINH.md").
// Chép khuôn `dang-luat-dang-ky-knt-dong.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-ho-so-hs.js --xem | --dang | --kiem | --lui <rulesetName>
//
// Thêm 4 khối, TẤT CẢ chỉ PHIÊN THẦY (laThay) — người lạ + học sinh đều 403:
//   hsLichSu/{ma}              mốc chuyển lớp / trình độ của em — thầy đọc + ghi (giới hạn hình dạng)
//   nwNhatKyDatLaiMk/{id}      nhật ký đặt lại mật khẩu (hàm máy chủ ghi) — thầy CHỈ ĐỌC
//   mystudentAttRows/{id}      điểm danh myStudent — thầy CHỈ ĐỌC (myStudent vẫn ghi bằng khoá quản trị)
//   mystudentRosterStudents/{id} danh sách HS myStudent (gid ↔ mã, có NGÀY SINH ĐỦ NĂM) — thầy CHỈ ĐỌC,
//                              ⛔ KHÔNG BAO GIỜ mở công khai (khoá API nằm công khai trong config.js).
// ⛔ KHÔNG đụng đăng nhập / scores / results / classChat / nwUsers. (File sinh bằng Write tool — không heredoc Bash.)
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

// Neo: ngay SAU khối lessonWeb/{doc} (đọc công khai, ghi đóng).
const NEO = "    match /lessonWeb/{doc} {\n      allow read: if true;\n      allow write: if false;\n    }\n";
const DAU_HIEU = '(28/09/2026, Dot B quan ly hoc sinh)';
const THEM =
  "    // " + DAU_HIEU + " HO SO EM tren dashboard - TAT CA chi PHIEN THAY (laThay).\n" +
  "    // Moc chuyen lop / trinh do cua em, id = ma dang nhap chuan (em chua co ma: <LOP>#<id>). Thay doc + ghi.\n" +
  "    match /hsLichSu/{ma} {\n" +
  "      allow read, delete: if laThay();\n" +
  "      allow create, update: if laThay()\n" +
  "        && ma.matches('^[A-Z0-9#_-]{1,80}$')\n" +
  "        && request.resource.data.keys().hasOnly(['moc', 'capNhat'])\n" +
  "        && request.resource.data.moc is list\n" +
  "        && request.resource.data.moc.size() <= 200\n" +
  "        && request.resource.data.capNhat is timestamp;\n" +
  "    }\n" +
  "    // Nhat ky dat lai mat khau (ham may chu datLaiMatKhauHs ghi bang quyen quan tri): thay CHI DOC.\n" +
  "    match /nwNhatKyDatLaiMk/{id} {\n" +
  "      allow read: if laThay();\n" +
  "      allow write: if false;\n" +
  "    }\n" +
  "    // Diem danh myStudent (mot dong / em / buoi, khoa student_gid): thay CHI DOC de ve 24 buoi trong ho so em.\n" +
  "    match /mystudentAttRows/{id} {\n" +
  "      allow read: if laThay();\n" +
  "      allow write: if false;\n" +
  "    }\n" +
  "    // Danh sach HS myStudent (gid <-> ma; co NGAY SINH DU NAM): CHI THAY doc (tra gid cua em cho diem danh).\n" +
  "    // KHONG BAO GIO doi thanh doc cong khai - xem chu thich o khoi mystudentRosterClasses.\n" +
  "    match /mystudentRosterStudents/{id} {\n" +
  "      allow read: if laThay();\n" +
  "      allow write: if false;\n" +
  "    }\n";

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ có khối hồ sơ em — không đăng lại');
  ['match /hsLichSu/', 'match /nwNhatKyDatLaiMk/', 'match /mystudentAttRows/', 'match /mystudentRosterStudents/'].forEach((k) => {
    if (cu.includes(k)) throw new Error('CHOT DUNG: luật đang chạy ĐÃ có "' + k + '" (ai đó thêm) — đọc lại trước khi ghép');
  });
  if (!cu.includes('function laThay()')) throw new Error('CHOT DUNG: luật đang chạy không có laThay()');
  return thayMot(cu, NEO, NEO + THEM, 'neo lessonWeb/{doc}');
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

// ───────── KIỂM (REST thật: người lạ · học sinh ZTEST · "thầy" ZTEST claim thay; dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v });
  const rac = [];
  const UID_HS = 'hs_9999998', UID_THAY = 'ztest_thay_hoso';
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  try {
    // tài liệu mồi (khoá quản trị) để phép ĐỌC có cái mà đọc
    const pNk = 'nwNhatKyDatLaiMk/ZTEST_hoso', pDd = 'mystudentAttRows/ZTEST__2026-09-28__ztest', pRs = 'mystudentRosterStudents/ztest_hoso';
    await ghiAdmin(pNk, { uid: S('hs_9999998'), ten: S('ZTEST') }); rac.push(pNk);
    await ghiAdmin(pDd, { class_code: S('ZTEST'), student_gid: S('ztest') }); rac.push(pDd);
    await ghiAdmin(pRs, { gid: S('ztest_hoso'), login_code: S('ZTEST9999998') }); rac.push(pRs);
    const tHs = await taoTkThu(UID_HS, 'ZTEST9999998', { hs: true, ma: 'ZTEST9999998', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tThay = await taoTkThu(UID_THAY, 'ZTESTTHAYHOSO', { thay: true });
    const A = (t) => ({ Authorization: 'Bearer ' + t });
    const pLs = 'hsLichSu/ZTEST9999998';
    const tot = { fields: { moc: { arrayValue: { values: [{ mapValue: { fields: { loai: S('vao'), den: S('ZTEST') } } }] } }, capNhat: { timestampValue: new Date().toISOString() } } };
    const xau = { fields: { moc: { arrayValue: { values: [] } }, capNhat: { timestampValue: new Date().toISOString() }, la: S('x') } };

    for (const [ten, p] of [['nhật ký đặt lại MK', pNk], ['điểm danh', pDd], ['DS học sinh myStudent', pRs]]) {
      ok('NGƯỜI LẠ đọc ' + ten + ' = 403', (await goi(`${FS_GOC}/${p}${k}`)).status, 403);
      ok('HỌC SINH đọc ' + ten + ' = 403', (await goi(`${FS_GOC}/${p}${k}`, { headers: A(tHs) })).status, 403);
      ok('THẦY đọc ' + ten + ' = 200', (await goi(`${FS_GOC}/${p}${k}`, { headers: A(tThay) })).status, 200);
      ok('THẦY GHI ' + ten + ' = 403', (await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: A(tThay), json: { fields: { x: S('y') } } })).status, 403);
    }
    ok('NGƯỜI LẠ ghi lịch sử = 403', (await goi(`${FS_GOC}/${pLs}${k}`, { method: 'PATCH', json: tot })).status, 403);
    ok('HỌC SINH ghi lịch sử của mình = 403', (await goi(`${FS_GOC}/${pLs}${k}`, { method: 'PATCH', headers: A(tHs), json: tot })).status, 403);
    const g = await goi(`${FS_GOC}/${pLs}${k}`, { method: 'PATCH', headers: A(tThay), json: tot });
    if (g.status === 200) rac.push(pLs);
    ok('THẦY ghi lịch sử đúng dạng = 200', g.status, 200);
    ok('THẦY ghi lịch sử có trường lạ = 403', (await goi(`${FS_GOC}/${pLs}${k}`, { method: 'PATCH', headers: A(tThay), json: xau })).status, 403);
    ok('THẦY đọc lịch sử = 200', (await goi(`${FS_GOC}/${pLs}${k}`, { headers: A(tThay) })).status, 200);
    ok('HỌC SINH đọc lịch sử = 403', (await goi(`${FS_GOC}/${pLs}${k}`, { headers: A(tHs) })).status, 403);
    // truy vấn đúng kiểu trang dùng (where student_gid in […]) — thầy được, người lạ không
    const q = { structuredQuery: { from: [{ collectionId: 'mystudentAttRows' }], where: { fieldFilter: { field: { fieldPath: 'student_gid' }, op: 'IN', value: { arrayValue: { values: [S('ztest')] } } } } } };
    ok('THẦY truy vấn điểm danh theo gid = 200', (await goi(`${FS_GOC}:runQuery${k}`, { method: 'POST', headers: A(tThay), json: q })).status, 200);
    ok('NGƯỜI LẠ truy vấn điểm danh = 403', (await goi(`${FS_GOC}:runQuery${k}`, { method: 'POST', json: q })).status, 403);
  } finally {
    console.log('  dọn', await xoaTaiLieu(rac), 'tài liệu thử');
    await xoaTkThu(UID_HS); await xoaTkThu(UID_THAY);
    console.log('  xoá 2 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-ho-so-hs.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-ho-so-hs.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-ho-so-hs.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-ho-so-hs.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
