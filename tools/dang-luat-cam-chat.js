// 🔇 01/10/2026 (web v1.216.0) — LUẬT CẤM CHAT TỪNG EM (thầy bấm đúp avatar em trong chat dashboard).
// Chép khuôn `dang-luat-chat-da-xem.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, có CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-cam-chat.js --xem | --dang | --kiem | --lui <rulesetName>
//
// · Kho mới classChatCam/{lop}/em/{ma} = {ten, den, luc} (den = mốc ms HẾT cấm). Đọc: CHỈ chính em đó + thầy.
//   Ghi/xoá: chỉ thầy.
// · classChat/{lop}/messages: tin + cảm xúc của em bị từ chối khi ô cấm còn hạn (den > request.time) ⇒ hết giờ tự mở.
//   Thêm trường tuỳ chọn `he` = {loai:'cam', ten} — tin hệ thống "<TÊN> đã bị Thầy Andrew cấm chat!", CHỈ thầy ghi.
// ⛔ Đổi tên trường/kho thì đổi CẢ js/chat.js (camChat/ngheCam/docCam) — hai bên phải khớp.
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

const DAU_HIEU = '(01/10/2026, web v1.216.0) CAM CHAT';

// 1) hàm ccBiCam ngay đầu khối classChat/messages (dùng $(lop) của khối)
const MOC_MSG = "    match /classChat/{lop}/messages/{id} {\n      allow read: if true;\n";
const HAM_CAM =
  "      // " + DAU_HIEU + ": em co o cam con han trong classChatCam/<lop>/em/<ma> => khong nhan tin, khong tha cam xuc.\n" +
  "      function ccBiCam(ma) {\n" +
  "        return exists(/databases/$(database)/documents/classChatCam/$(lop)/em/$(ma))\n" +
  "          && get(/databases/$(database)/documents/classChatCam/$(lop)/em/$(ma)).data.get('den', 0) > request.time.toMillis();\n" +
  "      }\n";
// 2) create: thêm trường `he` vào danh sách cho phép
const KHOA_CU = "['name','code','role','text','createdAt','may','q','sticker','hinh'])";
const KHOA_MOI = "['name','code','role','text','createdAt','may','q','sticker','hinh','he'])";
// 3) create: sau điều kiện "đúng người gửi" ⇒ em bị cấm thì từ chối + kiểm khuôn `he` (chỉ thầy)
const MOC_NGUOI =
  "        && ((request.resource.data.role == 'hs' && request.resource.data.code is string\n" +
  "             && hsDung(request.resource.data.code))\n" +
  "            || laThay())\n";
const THEM_NGUOI =
  "        // " + DAU_HIEU + ": em dang bi thay cam chat (con han) => tu choi tin.\n" +
  "        && (request.resource.data.role != 'hs' || !ccBiCam(request.resource.data.code))\n" +
  "        // " + DAU_HIEU + ": tin he thong '<TEN> da bi Thay Andrew cam chat!' (he) - CHI thay.\n" +
  "        && (!('he' in request.resource.data)\n" +
  "            || (laThay() && request.resource.data.role == 'gv' && request.resource.data.he is map\n" +
  "                && request.resource.data.he.keys().hasOnly(['loai','ten']) && request.resource.data.he.loai == 'cam'\n" +
  "                && request.resource.data.he.ten is string && request.resource.data.he.ten.size() <= 60))\n";
// 4) cảm xúc: nhánh học sinh ⇒ em bị cấm thì không thả được
const MOC_CX =
  "            || (request.auth != null && request.auth.token.get('hs', false) == true\n" +
  "                && request.resource.data.cx.diff(resource.data.get('cx', {})).affectedKeys()\n";
const MOI_CX =
  "            || (request.auth != null && request.auth.token.get('hs', false) == true\n" +
  "                && !ccBiCam(request.auth.token.get('ma', ''))   // " + DAU_HIEU + "\n" +
  "                && request.resource.data.cx.diff(resource.data.get('cx', {})).affectedKeys()\n";
// 5) kho ô cấm
const MOC_KHO = "    match /classChatArchive/{id} {\n";
const KHOI =
  "    // " + DAU_HIEU + " TUNG EM: classChatCam/<lop>/em/<ma em> = {ten, den, luc}; den = moc ms HET cam.\n" +
  "    // Doc: CHI chinh em do (dang nhap dung ma) + thay. Ghi/xoa: chi thay. Het han => classChat tu mo (den <= request.time).\n" +
  "    match /classChatCam/{lop}/em/{ma} {\n" +
  "      allow read: if hsDung(ma) || laThay();\n" +
  "      allow create, update: if laThay()\n" +
  "        && request.resource.data.keys().hasOnly(['ten','den','luc'])\n" +
  "        && request.resource.data.ten is string && request.resource.data.ten.size() <= 60\n" +
  "        && request.resource.data.den is number && request.resource.data.luc is number;\n" +
  "      allow delete: if laThay();\n" +
  "    }\n";

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU) || cu.includes('match /classChatCam/')) throw new Error('CHOT DUNG: luật ĐÃ có cấm chat — không đăng lại');
  if (!cu.includes('function laThay(') || !cu.includes('function hsDung(')) throw new Error('CHOT DUNG: thiếu laThay/hsDung — kiểm lại');
  let s = cu;
  s = thayMot(s, MOC_MSG, MOC_MSG + HAM_CAM, 'hàm ccBiCam đầu khối classChat/messages');
  s = thayMot(s, KHOA_CU, KHOA_MOI, "danh sách trường tin + 'he'");
  s = thayMot(s, MOC_NGUOI, MOC_NGUOI + THEM_NGUOI, 'tin: em bị cấm + khuôn he');
  s = thayMot(s, MOC_CX, MOI_CX, 'cảm xúc: em bị cấm');
  s = thayMot(s, MOC_KHO, KHOI + MOC_KHO, 'classChatCam trước classChatArchive');
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

// ───────── công tắc khẩn cấp (đọc để biết; nếu đang khoá chat thì tạm mở trong lúc kiểm rồi trả lại) ─────────
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


// ───────── KIỂM (REST thật; chỗ thử classChat/ZTEST + classChatCam/ZTEST, dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(Math.round(v)) });
  const M = (o) => ({ mapValue: { fields: o } });
  const Hd = (tok) => tok ? { Authorization: 'Bearer ' + tok } : {};
  const LOP = 'ZTEST', A_MA = 'ZTESTCC1', B_MA = 'ZTESTCC2';
  const CAM = (ma) => `classChatCam/${LOP}/em/${ma}`;
  const tao = []; // tài liệu tin đã tạo (để dọn)
  const guiTin = async (tok, f) => {
    const r = await goi(`${FS_GOC}/classChat/${LOP}/messages${k}`, { method: 'POST', headers: Hd(tok), json: { fields: f } });
    if (r.status === 200 && r.json && r.json.name) tao.push(r.json.name.split('/documents/')[1]);
    return r.status;
  };
  const tinHs = (ma, ten) => ({ name: S(ten), code: S(ma), role: S('hs'), text: S('thu cam chat'), createdAt: I(Date.now()), may: S('ztestmay01') });
  const datCam = async (tok, ma, den) => (await goi(`${FS_GOC}/${CAM(ma)}${k}`, { method: 'PATCH', headers: Hd(tok), json: { fields: { ten: S('EM THU'), den: I(den), luc: I(Date.now()) } } })).status;
  const thaCx = async (tok, ma, docPath) => (await goi(`${FS_GOC}/${docPath}${k}&updateMask.fieldPaths=${encodeURIComponent('cx.' + ma)}`, { method: 'PATCH', headers: Hd(tok),
    json: { fields: { cx: M({ [ma]: M({ ten: S('EM'), luc: I(Date.now()), n: M({ tim: I(1) }), l: S('tim') }) }) } } })).status;
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  const ct = await docCongTac();
  if (ct.khoaChat) { console.log('⚠ Công tắc khẩn cấp ĐANG KHOÁ CHAT — tin học sinh bị chặn sẵn, phép thử không đo được. Tắt khoá rồi chạy lại.'); process.exitCode = 1; return; }
  try {
    const tkA = await taoTkThu('hs_ztestcc1', A_MA, { hs: true, ma: A_MA, lop: LOP, lops: LOP, msId: 0 });
    const tkB = await taoTkThu('hs_ztestcc2', B_MA, { hs: true, ma: B_MA, lop: LOP, lops: LOP, msId: 0 });
    const tkT = await tokenThayThu();
    const nay = Date.now();
    ok('em A gửi tin khi CHƯA bị cấm = 200', await guiTin(tkA, tinHs(A_MA, 'EM A')), 200);
    const tinB = tao.length;
    ok('em B gửi tin = 200', await guiTin(tkB, tinHs(B_MA, 'EM B')), 200);
    const tinCuaB = tao[tinB];
    ok('NGƯỜI LẠ đặt ô cấm = 403', await datCam(null, A_MA, nay + 3600e3), 403);
    ok('em B đặt ô cấm cho A = 403', await datCam(tkB, A_MA, nay + 3600e3), 403);
    ok('THẦY cấm em A 1 giờ = 200', await datCam(tkT, A_MA, nay + 3600e3), 200);
    ok('em A đọc ô cấm CỦA MÌNH = 200', (await goi(`${FS_GOC}/${CAM(A_MA)}${k}`, { headers: Hd(tkA) })).status, 200);
    ok('em B đọc ô cấm của A = 403', (await goi(`${FS_GOC}/${CAM(A_MA)}${k}`, { headers: Hd(tkB) })).status, 403);
    ok('NGƯỜI LẠ đọc ô cấm = 403', (await goi(`${FS_GOC}/${CAM(A_MA)}${k}`)).status, 403);
    ok('em B đọc ô CỦA MÌNH (chưa có) = 404', (await goi(`${FS_GOC}/${CAM(B_MA)}${k}`, { headers: Hd(tkB) })).status, 404);
    ok('THẦY liệt kê ô cấm của lớp = 200', (await goi(`${FS_GOC}/classChatCam/${LOP}/em${k}`, { headers: Hd(tkT) })).status, 200);
    ok('em A tự gỡ cấm (ghi den = 0) = 403', await datCam(tkA, A_MA, 0), 403);
    ok('em A tự xoá ô cấm = 403', (await goi(`${FS_GOC}/${CAM(A_MA)}${k}`, { method: 'DELETE', headers: Hd(tkA) })).status, 403);
    ok('em A ĐANG BỊ CẤM gửi tin = 403', await guiTin(tkA, tinHs(A_MA, 'EM A')), 403);
    ok('em A ĐANG BỊ CẤM thả cảm xúc = 403', await thaCx(tkA, A_MA, tinCuaB), 403);
    ok('em B (không bị cấm) vẫn gửi tin = 200', await guiTin(tkB, tinHs(B_MA, 'EM B')), 200);
    ok('em B vẫn thả cảm xúc = 200', await thaCx(tkB, B_MA, tinCuaB), 200);
    const tinHe = (role, ten) => ({ name: S('Thầy Andrew'), code: S(role === 'gv' ? 'GV' : B_MA), role: S(role), text: S(ten + ' đã bị Thầy Andrew cấm chat!'), createdAt: I(Date.now()), may: S('ztestmay01'), he: M({ loai: S('cam'), ten: S(ten) }) });
    ok('THẦY gửi tin hệ thống "đã bị cấm chat" (he) = 200', await guiTin(tkT, tinHe('gv', 'EM A')), 200);
    ok('em B gửi tin giả "he" = 403', await guiTin(tkB, tinHe('hs', 'EM A')), 403);
    const heLa = tinHe('gv', 'EM A'); heLa.he = M({ loai: S('khac'), ten: S('EM A') });
    ok('THẦY gửi he sai loại = 403', await guiTin(tkT, heLa), 403);
    ok('THẦY đặt hạn cấm A đã QUA (hết giờ) = 200', await datCam(tkT, A_MA, Date.now() - 60e3), 200);
    ok('em A HẾT GIỜ cấm gửi tin = 200', await guiTin(tkA, tinHs(A_MA, 'EM A')), 200);
    ok('THẦY bỏ cấm (xoá ô) = 200', (await goi(`${FS_GOC}/${CAM(A_MA)}${k}`, { method: 'DELETE', headers: Hd(tkT) })).status, 200);
  } finally {
    console.log('  dọn', await xoaTaiLieu(tao.concat([CAM(A_MA), CAM(B_MA)])), 'tài liệu thử (classChat/ZTEST + classChatCam/ZTEST)');
    await xoaTkThu('hs_ztestcc1'); await xoaTkThu('hs_ztestcc2'); await xoaTkThu('ztest_thay');
    console.log('  đã xoá tài khoản thử hs_ztestcc1 + hs_ztestcc2 + ztest_thay');
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
      ghiTaiLieu('_luat-thu-cam-chat.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-cam-chat.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-cam-chat.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-cam-chat.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
