// 📝 12/10/2026 — LUẬT: kho MỚI `lessonXacNhan/{ma}__{bai}` = THẦY XÁC NHẬN bước "gửi video lên nhóm Zalo" của LESSON CHƯƠNG.
// Thầy chốt 12/10: chỉ GIÁO VIÊN (tài khoản dashboard) được tích "đã nộp", học sinh KHÔNG tự tích (em Nhật Quang tự tích khi chưa nộp).
// Trước đây bước zalo nằm trong `lessonVideoTienDo.chuong.tay` do CHÍNH EM ghi ⇒ không tin được. Kho mới: chỉ laThay() ghi;
// đọc = đúng em đó (hsDung) hoặc thầy — y khuôn đọc của lessonVideoTienDo. Sửa TẠI CHỖ từ luật ĐANG CHẠY, CHỐT DỪNG; chỉ THÊM khối mới.
//
//   node tools/dang-luat-xac-nhan-zalo.js --xem | --dang | --kiem | --lui <rulesetName>
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

const CLAIM_THAY = { thay: true };   // xem laThay() trong luật đang chạy (--xem in ra)

const DAU_HIEU = '(12/10/2026) THAY XAC NHAN buoc Zalo';
const KHOI = [
  '    // ' + DAU_HIEU + ' - lessonXacNhan/{ma}__{bai}: chi THAY ghi (tich "da nop video Zalo"), em chi doc cua minh.',
  '    //   tay = map { <id buoc>: moc ms } (0 = thay go tich).',
  '    match /lessonXacNhan/{id} {',
  "      allow read: if hsDung(id.split('__')[0]) || laThay();",
  '      allow create, update: if laThay()',
  "        && request.resource.data.keys().hasOnly(['ma','bai','lop','luc','tay'])",
  '        && request.resource.data.ma is string',
  '        && request.resource.data.ma.size() > 0',
  '        && request.resource.data.ma.size() <= 60',
  '        && request.resource.data.bai is string',
  '        && request.resource.data.bai.size() > 0',
  '        && request.resource.data.bai.size() <= 200',
  "        && id == request.resource.data.ma + '__' + request.resource.data.bai",
  '        && request.resource.data.lop is string',
  '        && request.resource.data.lop.size() <= 30',
  '        && request.resource.data.luc is number',
  '        && request.resource.data.tay is map',
  '        && request.resource.data.tay.size() <= 20;',
  '      allow delete: if false;',
  '    }',
  ''].join('\n');

function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU) || cu.includes('match /lessonXacNhan/')) throw new Error('CHOT DUNG: luật ĐÃ có lessonXacNhan — không đăng lại');
  const moc = '    match /lessonVideoTienDo/{id} {';
  const n = cu.split(moc).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG: thấy ' + n + ' khối lessonVideoTienDo (cần đúng 1)');
  return cu.replace(moc, () => KHOI + moc);
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

// ───────── KIỂM (REST thật: tài khoản THẦY + HỌC SINH ZTEST; dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) });
  const MA = 'ZTEST9999993', MA_KHAC = 'ZTEST9999992', UID = 'hs_9999993', UID_T = 'ztest_thay_xn';
  const pMinh = 'lessonXacNhan/' + MA + '__ZTEST_CHUONG', pKhac = 'lessonXacNhan/' + MA_KHAC + '__ZTEST_CHUONG';
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  try {
    const tHs = await taoTkThu(UID, MA, { hs: true, ma: MA, lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tThay = await taoTkThu(UID_T, 'ZTESTTHAYXN', CLAIM_THAY);
    const A = (t) => ({ Authorization: 'Bearer ' + t });
    const tay = { mapValue: { fields: { btc05zalo: I(Date.now()) } } };
    const goiGhi = (p, ma, tk, them) => goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: tk ? A(tk) : {},
      json: { fields: Object.assign({ ma: S(ma), bai: S('ZTEST_CHUONG'), lop: S('ZTEST'), luc: I(Date.now()), tay }, them) } });
    const goiDoc = (p, tk) => goi(`${FS_GOC}/${p}${k}`, { headers: tk ? A(tk) : {} });
    ok('THẦY tích cho em = 200', (await goiGhi(pMinh, MA, tThay, {})).status, 200);
    ok('THẦY tích em khác = 200', (await goiGhi(pKhac, MA_KHAC, tThay, {})).status, 200);
    ok('THẦY ghi trường lạ = 403', (await goiGhi(pMinh, MA, tThay, { la: S('x') })).status, 403);
    ok('THẦY ghi tay không phải map = 403', (await goiGhi(pMinh, MA, tThay, { tay: S('x') })).status, 403);
    ok('HỌC SINH tự tích của mình = 403', (await goiGhi(pMinh, MA, tHs, {})).status, 403);
    ok('NGƯỜI LẠ ghi = 403', (await goiGhi(pMinh, MA, null, {})).status, 403);
    ok('HỌC SINH đọc của mình = 200', (await goiDoc(pMinh, tHs)).status, 200);
    ok('HỌC SINH đọc của em khác = 403', (await goiDoc(pKhac, tHs)).status, 403);
    ok('THẦY đọc = 200', (await goiDoc(pKhac, tThay)).status, 200);
    ok('NGƯỜI LẠ đọc = 403', (await goiDoc(pMinh, null)).status, 403);
  } finally {
    console.log('  dọn', await xoaTaiLieu([pMinh, pKhac]), 'tài liệu thử');
    await xoaTkThu(UID); await xoaTkThu(UID_T);
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
      ghiTaiLieu('_luat-thu-xac-nhan-zalo.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-xac-nhan-zalo.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-xac-nhan-zalo.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-xac-nhan-zalo.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
