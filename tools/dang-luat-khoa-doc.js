// 🔒 02/10/2026 (thầy chốt) — KHOÁ ĐỌC NGƯỜI NGOÀI: người không đăng nhập không đọc được chat lớp, chat riêng,
//   danh sách học sinh, kết quả thi đua. Làm THEO GIAI ĐOẠN (bản đồ ai đọc ẩn danh: memory khoa-doc-nguoi-ngoai):
//   mỗi giai đoạn sửa người đọc (thêm vé đăng nhập / khoá quản trị) → đẩy → rồi MỚI siết luật ở đây.
//   GĐ1: dashLopThuTu + classChatArchive chỉ thầy đọc (chỉ dashboard đọc, sau cổng đăng nhập).
//   GĐ2 (sau web v1.226.0 vé đọc): chat lớp + đã xem = em ĐÚNG LỚP/thầy · tiến độ video/audio + bài nộp = CHÍNH EM/thầy ·
//        tích nộp Speaking = học sinh đăng nhập/thầy · lịch lớp mystudentRosterClasses = thầy.
//   GĐ3 (sau AWord Đợt 439): bảng điểm assignments/*/bang + scores = HS đăng nhập/thầy (nội dung bài assignments/{code} vẫn công khai).
//
//   node tools/dang-luat-khoa-doc.js --gd <n> --xem | --dang | --kiem  ·  --lui <rulesetName>
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const PROJECT = 'aword-70dae';
const API_KEY = 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY';   // khoá CÔNG KHAI (config.js) — dùng để thử như người lạ
const API = 'https://firebaserules.googleapis.com/v1';
const DB = `projects/${PROJECT}/databases/(default)`;
const FS_GOC = `https://firestore.googleapis.com/v1/${DB}/documents`;
const IDT = 'https://identitytoolkit.googleapis.com/v1';
const DUOI_EMAIL = '@id.andrewclasses.com';
const KHOA_UNG_VIEN = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'E:\\LAP TRINH APP\\mySpeaking-data\\data\\firebase-admin.json',
  'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'];
const TAI_LIEU_UNG_VIEN = ['E:/LAP TRINH APP/myLesson-data/tai-lieu', 'D:/APP AND DATA/myLesson-data/tai-lieu'];


// ───────── CÁC GIAI ĐOẠN (mỗi chỗ vá phải thấy ĐÚNG 1 lần — không thì CHỐT DỪNG) ─────────
// Mỗi giai đoạn: [dấu hiệu "đã vá", [[tên, cũ, mới], …], [[đường đọc, mong người lạ, mong thầy], …]]
const GD = {
  1: ['(02/10/2026 GD1) khoa doc nguoi ngoai', [
    ['dashLopThuTu: chỉ thầy đọc',
      "    match /dashLopThuTu/{id} {\n      allow read: if true;\n",
      "    match /dashLopThuTu/{id} {\n      allow read: if laThay();   // (02/10/2026 GD1) khoa doc nguoi ngoai - chi dashboard thay doc (sau cong dang nhap)\n"],
    ['classChatArchive: chỉ thầy đọc',
      "    match /classChatArchive/{id} {\n      allow read: if true;\n",
      "    match /classChatArchive/{id} {\n      allow read: if laThay();   // (02/10/2026 GD1) khoa doc nguoi ngoai - ban luu chat cu chi dashboard thay doc\n"],
  ], [
    ['dashLopThuTu', 403, 200],
    ['classChatArchive', 403, 200],
  ]],
  2: ['(02/10/2026 GD2) khoa doc nguoi ngoai', [
    ['hàm hsLop (học sinh thuộc lớp)',
      "    function tenSach(t) {\n",
      "    // (02/10/2026 GD2) khoa doc nguoi ngoai: phien HOC SINH thuoc lop `lop` (claim lops = \"A1C,NNTNGK9\" do tao-tai-khoan.mjs ky).\n" +
      "    function hsLop(lop) {\n" +
      "      return request.auth != null && request.auth.token.get('hs', false) == true\n" +
      "          && lop in request.auth.token.get('lops', '').split(',');\n" +
      "    }\n" +
      "    function tenSach(t) {\n"],
    ['mystudentRosterClasses: chỉ thầy',
      "    match /mystudentRosterClasses/{maLop} {\n      allow read: if true;\n",
      "    match /mystudentRosterClasses/{maLop} {\n      allow read: if laThay();   // (02/10/2026 GD2) chi dashboard thay; app may tinh doc bang khoa quan tri\n"],
    ['classChat: em đúng lớp hoặc thầy',
      "    match /classChat/{lop}/messages/{id} {\n      allow read: if true;\n",
      "    match /classChat/{lop}/messages/{id} {\n      allow read: if hsLop(lop) || laThay();   // (02/10/2026 GD2) khoa doc nguoi ngoai - chi em DUNG LOP (dang nhap) hoac thay\n"],
    ['classChatXem: em đúng lớp hoặc thầy',
      "      allow read: if true;\n      allow create: if ccXemNguoi()",
      "      allow read: if hsLop(lop) || laThay();   // (02/10/2026 GD2) khoa doc nguoi ngoai\n      allow create: if ccXemNguoi()"],
    ['spSubmissions: học sinh đăng nhập hoặc thầy',
      "    match /spSubmissions/{buoiId}/students/{maHS} {\n      allow read: if true;\n",
      "    match /spSubmissions/{buoiId}/students/{maHS} {\n      allow read: if request.auth != null && (request.auth.token.get('hs', false) == true || laThay());   // (02/10/2026 GD2)\n"],
    ['lessonNop get: chính em hoặc thầy',
      "    match /lessonNop/{id} {\n      allow get: if true;\n",
      "    match /lessonNop/{id} {\n      allow get: if hsDung(id.split('__')[id.split('__').size() - 1]) || laThay();   // (02/10/2026 GD2) ma = doan cuoi id <lop>__<bai>__<o>__<ma>\n"],
    ['lessonVideoTienDo: chính em hoặc thầy',
      "    match /lessonVideoTienDo/{id} {\n      allow read: if true;\n",
      "    match /lessonVideoTienDo/{id} {\n      allow read: if hsDung(id.split('__')[0]) || laThay();   // (02/10/2026 GD2) id = <ma>__<bai> (do 84/84)\n"],
    ['lessonAudioTienDo: chính em hoặc thầy',
      "                match /lessonAudioTienDo/{id} {\n                    allow read: if true;\n",
      "                match /lessonAudioTienDo/{id} {\n                    allow read: if hsDung(id.split('__')[0]) || laThay();   // (02/10/2026 GD2) id = <ma>__<bai> (do 185/185)\n"],
  ], [
    ['mystudentRosterClasses', 403, 200, 403],
    ['classChat/A1C/messages', 403, 200, 200],
    ['classChat/A1A/messages', 403, 200, 403],
    ['classChatXem/A1C', 403, 200, 200, 'doc'],
    ['classChatXem/A1A', 403, 200, 403, 'doc'],
    ['spSubmissions/ZTESTKHONG/students', 403, 200, 200],
    ['lessonNop/ZTEST__X__1__ZTESTKD1', 403, 404, 404, 'doc'],
    ['lessonNop/ZTEST__X__1__NGUOIKHAC', 403, 404, 403, 'doc'],
    ['lessonVideoTienDo/ZTESTKD1__X', 403, 404, 404, 'doc'],
    ['lessonVideoTienDo/NGUOIKHAC__X', 403, 404, 403, 'doc'],
    ['lessonAudioTienDo/ZTESTKD1__X', 403, 404, 404, 'doc'],
    ['lessonAudioTienDo/NGUOIKHAC__X', 403, 404, 403, 'doc'],
  ]],
  3: ['(02/10/2026 GD3) khoa doc nguoi ngoai', [
    ['bảng điểm tốt nhất (bang): HS đăng nhập hoặc thầy',
      "      match /bang/{bangId} {\n        allow read: if true;\n",
      "      match /bang/{bangId} {\n        // (02/10/2026 GD3) khoa doc nguoi ngoai: bang xep hang (ten + diem HS) - AWord Dot 439 doc bang ve em, web myLesson v1.226.0 ve doc\n        allow read: if request.auth != null && (request.auth.token.get('hs', false) == true || laThay());\n"],
    ['scores: HS đăng nhập hoặc thầy',
      "      match /scores/{scoreId} {\n        allow read: if true;\n",
      "      match /scores/{scoreId} {\n        allow read: if request.auth != null && (request.auth.token.get('hs', false) == true || laThay());   // (02/10/2026 GD3)\n"],
  ], [
    ['assignments/3kuv6g/bang/tot', 403, 200, 200, 'doc'],
    ['assignments/3kuv6g/scores', 403, 200, 200],
    ['assignments/3kuv6g', 200, 200, 200, 'doc'],
  ]],
};
function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghep(cu, ds, dauHieu) {
  if (cu.includes(dauHieu)) throw new Error('CHOT DUNG: luật ĐÃ có giai đoạn này (' + dauHieu + ') — không đăng lại');
  return ds.reduce((s, [ten, a, b]) => thayMot(s, a, b, ten), cu);
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

// ───────── tài khoản thử (khoá quản trị, REST Identity Toolkit) — em ZTEST + "thầy thử" bằng custom token claim thay ─────────
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
// "thầy thử": custom token uid ztest_thay + claim {thay:true} — đúng đường app myLesson ký cho dashboard (thay-token.js).
async function tokenThayThu() {
  const sa = khoa();
  const now = Math.floor(Date.now() / 1000);
  const ct = kyJwt({ iss: sa.client_email, sub: sa.client_email, aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', iat: now, exp: now + 3600, uid: 'ztest_thay', claims: { thay: true } });
  const s = await goi(`${IDT}/accounts:signInWithCustomToken?key=${API_KEY}`, { method: 'POST', json: { token: ct, returnSecureToken: true } });
  if (s.status !== 200) throw new Error('DANG_NHAP_THAY_THU_' + s.status + ' ' + JSON.stringify(s.json).slice(0, 200));
  return s.json.idToken;
}



// ───────── KIỂM: người lạ (không vé) phải 403, thầy (vé thầy thử) phải 200 — đọc LIST 1 tài liệu mỗi kho ─────────
async function kiem(gd) {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + ' = ' + st + (dk ? '' : '  (cần ' + can + ')')); if (!dk) hong = true; };
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  try {
    const tkT = await tokenThayThu();
    // học sinh thử lớp A1C (mã ZTESTKD1) — cột thứ 4 của bảng thử (bỏ trống = không thử)
    const tkH = GD[gd][2].some((x) => x[3] !== undefined) ? await taoTkThu('hs_ztestkd1', 'ZTESTKD1', { hs: true, ma: 'ZTESTKD1', lop: 'A1C', lops: 'A1C', msId: 0 }) : null;
    for (const [duong, lạ, thay, hs, kieu] of GD[gd][2]) {
      const u = `${FS_GOC}/${duong}${k}` + (kieu === 'doc' ? '' : '&pageSize=1');
      ok('NGƯỜI LẠ đọc ' + duong, (await goi(u, {})).status, lạ);
      ok('THẦY đọc ' + duong, (await goi(u, { headers: { Authorization: 'Bearer ' + tkT } })).status, thay);
      if (hs !== undefined) ok('HS A1C đọc ' + duong, (await goi(u, { headers: { Authorization: 'Bearer ' + tkH } })).status, hs);
    }
  } finally { await xoaTkThu('ztest_thay'); await xoaTkThu('hs_ztestkd1'); }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  const gd = Number((a[a.indexOf('--gd') + 1]) || 0);
  try {
    if (a[0] === '--lui') {
      if (!a[1]) throw new Error('thiếu rulesetName');
      console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120));
      return;
    }
    if (!GD[gd]) throw new Error('thiếu/sai --gd <số> (có: ' + Object.keys(GD).join(', ') + ')');
    if (a.includes('--kiem')) { await kiem(gd); return; }
    const cu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', cu.rulesetName);
    const moi = ghep(cu.source, GD[gd][1], GD[gd][0]);
    if (a.includes('--xem')) {
      const d = soDong(cu.source, moi);
      d.bot.forEach((x) => console.log('   − ' + x)); d.them.forEach((x) => console.log('   + ' + x));
      console.log('  ghép thử OK (chưa đăng).');
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-khoa-doc-gd' + gd + '.rules', cu.source);
      const rs = await taoRuleset(moi, cu.fileName || 'firestore.rules');
      await datRelease('cloud.firestore', rs);
      console.log('ruleset mới:', rs, '\n\n✓ ĐÃ ĐĂNG GĐ' + gd + '. Đường lùi:\n  node tools/dang-luat-khoa-doc.js --lui ' + cu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-khoa-doc.js --gd ' + gd + ' --kiem');
      return;
    }
    console.log('Dùng: --gd <n> --xem | --dang | --kiem  ·  --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
