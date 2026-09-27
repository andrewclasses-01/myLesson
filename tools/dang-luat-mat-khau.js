// 🔐 27/09/2026 (web v1.158.0) — LUẬT CHAT ĐÒI ĐĂNG NHẬP THẬT (phương án G, sau tấn công Tr0ngX lần 3).
// Chép khuôn `dang-luat-khan-cap.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, mỗi chỗ sửa có CHỐT DỪNG.
// Tự đứng một mình (không require app myLesson — máy ANDREWHOME và máy khác để app ở chỗ khác nhau).
//
//   node dang-luat-mat-khau.js --xem | --dang | --kiem | --lui <rulesetName>
//
// Luật thêm:
//   · hàm hsDung(ma): request.auth có claim hs == true và claim ma == ma
//     (claims do myNetwork/tools/tao-tai-khoan.mjs đặt; em đăng nhập bằng ID + MẬT KHẨU ở web).
//   · classChat create: tin role 'hs' ⇒ hsDung(code). Trước đó chỉ kiểm hình dạng + `may` — kẻ tấn công
//     điền `may` = mã em (27/09 7:43) là qua.
//   · classChat update (cảm xúc): thầy, hoặc học sinh đăng nhập CHỈ sửa ô cx.<mã của chính em>.
//     Trước đó ai cũng sửa được cả map cx của mọi tin.
//   ⛔ KHÔNG kiểm lớp (path) ∈ claim lops: đổi tên lớp tự lan (myStudent v2.86) không chạy lại công cụ
//      tài khoản ⇒ chat lớp mới gãy im lặng. Em gửi nhầm phòng vẫn mang đúng tên mình — chấp nhận.
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
  'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'];
const TAI_LIEU_UNG_VIEN = ['E:/LAP TRINH APP/myLesson-data/tai-lieu', 'D:/APP AND DATA/myLesson-data/tai-lieu'];

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}

function ghepFirestore(cu) {
  if (cu.includes('function hsDung(')) throw new Error('CHOT DUNG: luật ĐÃ có hsDung — không đăng lại');
  if (!cu.includes('function khanCap(')) throw new Error('CHOT DUNG: luật đang chạy CHƯA có công tắc khẩn cấp (85d5bd65) — kiểm lại');
  let s = cu;
  // 1) hàm hsDung ngay trước khanCap
  s = thayMot(s, '    // (27/09/2026) CONG TAC KHAN CAP:',
    '    // (27/09/2026, web v1.158.0) HOC SINH DANG NHAP THAT: Firebase Auth bang ID + MAT KHAU (khong con la ma cong khai).\n' +
    '    // Claims hs/ma do myNetwork/tools/tao-tai-khoan.mjs dat. Dung cho chat (code phai la ma cua CHINH em).\n' +
    '    function hsDung(ma) {\n' +
    '      return request.auth != null\n' +
    "          && request.auth.token.get('hs', false) == true\n" +
    "          && request.auth.token.get('ma', '') == ma;\n" +
    '    }\n\n' +
    '    // (27/09/2026) CONG TAC KHAN CAP:', 'ham hsDung');
  // 2) chat create: tin học sinh đòi hsDung(code)
  s = thayMot(s, "        && (request.resource.data.role == 'hs' || laThay())\n        && request.resource.data.createdAt is number\n",
    "        // (27/09/2026, v1.158.0) tin hoc sinh: nguoi gui phai DANG NHAP dung ma trong `code` (mat khau that).\n" +
    "        && ((request.resource.data.role == 'hs' && request.resource.data.code is string\n" +
    "             && hsDung(request.resource.data.code))\n" +
    "            || laThay())\n" +
    "        && request.resource.data.createdAt is number\n", 'classChat create');
  // 3) chat update cảm xúc: chỉ ô của mình
  s = thayMot(s, "      allow update: if request.resource.data.diff(resource.data)\n                         .affectedKeys().hasOnly(['cx'])\n        && request.resource.data.cx is map;\n",
    "      allow update: if request.resource.data.diff(resource.data)\n                         .affectedKeys().hasOnly(['cx'])\n        && request.resource.data.cx is map\n" +
    "        // (27/09/2026, v1.158.0) cam xuc: thay, hoac hoc sinh dang nhap CHI sua o cx.<ma cua chinh em>.\n" +
    "        && (laThay()\n" +
    "            || (request.auth != null && request.auth.token.get('hs', false) == true\n" +
    "                && request.resource.data.cx.diff(resource.data.get('cx', {})).affectedKeys()\n" +
    "                     .hasOnly([request.auth.token.get('ma', '')])));\n", 'classChat update');
  return s;
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
let _token = null;
async function tokenQuanTri() {
  if (_token) return _token;
  const duong = KHOA_UNG_VIEN.find((p) => p && fs.existsSync(p));
  if (!duong) throw new Error('KHOA_THIEU_FILE — chép khoá về máy bằng D:\\APP AND DATA\\_KHOA\\CAI KHOA FIREBASE.bat');
  const sa = JSON.parse(fs.readFileSync(duong, 'utf8').replace(/^\uFEFF/, ''));
  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const phan = b64u({ alg: 'RS256', typ: 'JWT' }) + '.' + b64u({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const ky = crypto.createSign('RSA-SHA256').update(phan).sign(sa.private_key).toString('base64url');
  const r = await goi('https://oauth2.googleapis.com/token', { method: 'POST', form: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(phan + '.' + ky) });
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

// ───────── công tắc khẩn cấp (để kiểm khi chat đang khoá) ─────────
async function docCongTac() {
  const r = await goi(`${FS_GOC}/lessonWeb/khanCap`, { headers: await H() });
  if (r.status === 404) return { khoaChat: false, khoaDiem: false, lyDo: '' };
  if (r.status !== 200) throw new Error('DOC_' + r.status);
  const f = r.json.fields || {};
  return { khoaChat: !!(f.khoaChat && f.khoaChat.booleanValue), khoaDiem: !!(f.khoaDiem && f.khoaDiem.booleanValue), lyDo: (f.lyDo && f.lyDo.stringValue) || '' };
}
async function datCongTac(vao) {
  const fields = { luc: { integerValue: String(Date.now()) }, khoaChat: { booleanValue: !!vao.khoaChat }, khoaDiem: { booleanValue: !!vao.khoaDiem }, lyDo: { stringValue: String(vao.lyDo || '').slice(0, 200) } };
  const mask = Object.keys(fields).map((k) => 'updateMask.fieldPaths=' + k).join('&');
  const r = await goi(`${FS_GOC}/lessonWeb/khanCap?${mask}`, { method: 'PATCH', headers: await H(), json: { fields } });
  if (r.status !== 200) throw new Error('GHI_CONG_TAC_' + r.status);
}
async function xoaTaiLieu(paths) {
  if (!paths.length) return 0;
  const r = await goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit`, { method: 'POST', headers: await H(), json: { writes: paths.map((p) => ({ delete: DB + '/documents/' + p })) } });
  if (r.status !== 200) throw new Error('XOA_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  return r.json.writeResults.length;
}

// ───────── tài khoản thử ZTEST (khoá quản trị, REST Identity Toolkit) ─────────
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

// ───────── KIỂM (REST thật: người lạ + học sinh thử; chỗ thử classChat/ZTEST, dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const nay = Date.now(), rac = [];
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) });
  const ghi = async (p, body, idTok, mask) => {
    const headers = idTok ? { Authorization: 'Bearer ' + idTok } : {};
    const r = await goi(`${FS_GOC}/${p}${k}${mask || ''}`, { method: 'PATCH', headers, json: body });
    if (r.status === 200 && !mask) rac.push(p);
    return r.status;
  };
  const tin = (id, code, idTok) => ghi('classChat/ZTEST/messages/' + id,
    { fields: { name: S('ZTEST'), code: S(code), role: S('hs'), text: S('thu'), createdAt: I(nay), may: S('abcdefghij') } }, idTok);
  const cx = (id, khoa, idTok) => ghi('classChat/ZTEST/messages/' + id,
    { fields: { cx: { mapValue: { fields: { [khoa]: { mapValue: { fields: { ma: S('tim'), ten: S('ZTEST'), luc: I(nay) } } } } } } } }, idTok, '&updateMask.fieldPaths=cx.' + khoa);

  const rel = await docRelease('cloud.firestore');
  const truoc = await docCongTac();
  console.log('luật đang chạy:', rel.rulesetName, '| công tắc:', JSON.stringify(truoc));
  let tkA = null, tkB = null;
  try {
    tkA = await taoTkThu('hs_ztestmk1', 'ZTESTMK1', { hs: true, ma: 'ZTESTMK1', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    tkB = await taoTkThu('hs_ztestmk2', 'ZTESTMK2', { hs: true, ma: 'ZTESTMK2', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    if (truoc.khoaChat) await datCongTac({ khoaChat: false, khoaDiem: truoc.khoaDiem, lyDo: 'kiem luat mat khau' });
    await new Promise((r) => setTimeout(r, 1500));
    ok('NGƯỜI LẠ gửi tin mang mã em (không đăng nhập) = 403', await tin('m1', 'ZTESTMK1', null), 403);
    ok('em A đăng nhập gửi tin ĐÚNG mã mình = 200', await tin('m2', 'ZTESTMK1', tkA), 200);
    ok('em B đăng nhập gửi tin GIẢ mã em A = 403', await tin('m3', 'ZTESTMK1', tkB), 403);
    ok('em B thả cảm xúc ô của mình = 200', await cx('m2', 'ZTESTMK2', tkB), 200);
    ok('em B thả cảm xúc GIẢ ô em A = 403', await cx('m2', 'ZTESTMK1', tkB), 403);
    ok('NGƯỜI LẠ thả cảm xúc = 403', await cx('m2', 'ZTESTMK9', null), 403);
    await datCongTac({ khoaChat: true, khoaDiem: truoc.khoaDiem, lyDo: 'kiem luat mat khau' });
    await new Promise((r) => setTimeout(r, 1500));
    ok('khoá khẩn cấp BẬT: em A đăng nhập gửi tin = 403', await tin('m4', 'ZTESTMK1', tkA), 403);
  } finally {
    await datCongTac(truoc);
    console.log('  trả công tắc về:', JSON.stringify(await docCongTac()));
    console.log('  dọn', await xoaTaiLieu(rac), 'tài liệu thử:', rac.join(', ') || '(không có)');
    await xoaTkThu('hs_ztestmk1'); await xoaTkThu('hs_ztestmk2');
    console.log('  đã xoá 2 tài khoản thử hs_ztestmk1/2');
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
      ghiTaiLieu('_luat-thu-mat-khau.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-mat-khau.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-mat-khau.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-mat-khau.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
