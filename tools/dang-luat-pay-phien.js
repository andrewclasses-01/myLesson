// 🟢 06/10/2026 — LUẬT "PHIÊN myPay RIÊNG" (thầy chốt: học phí + điểm danh không được lộ trên máy dùng chung).
//   Chạy SAU tools/dang-luat-pay.js (03/10). Đổi 4 kho myPay từ laThay() sang payPhien():
//     payPhien() = laThay() + phiên đăng nhập CÓ MÃ 6 SỐ (sign_in_second_factor 'totp') + đăng nhập chưa quá 6 GIỜ (auth_time).
//   ⇒ phiên dashboard (nhớ 30 ngày), vé app ký uid 'thay' (myLesson/myActivity trên máy lớp), Google — đều KHÔNG đọc được
//     payKho / payKhoSaoLuu / payMaHs / mystudentSoDiemDanh. Chỉ trang pay.html (phiên riêng trong tab, js/pay/kho-may.js
//     — HAN_PHIEN phải khớp 21600000) đọc được. Công cụ myPay trên máy dùng khoá quản trị nên không bị ảnh hưởng.
// Chép khuôn `dang-luat-pay.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, có CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-pay-phien.js --xem | --dang | --kiem | --lui <rulesetName>
//   --kiem: thử THẬT trên máy chủ: người lạ / em / vé thầy kiểu app (không mã 6 số) / quản trị chưa mã bị chặn; tài khoản thử
//           CÓ mã 6 số (tự cài TOTP, tự tính mã) đọc/ghi được; "quá hạn là chặn" thử ở ngăn rỗng zzKiemPayPhien (cùng phép
//           tính, hạn 60 giây: đọc ngay = 200, chờ 65 giây = 403). (Khoá quản trị KHÔNG có quyền API thử luật projects:test.)
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

const DAU_HIEU = '(06/10/2026) MYPAY PHIEN RIENG';
const HAN_MS = 6 * 3600 * 1000;   // ⛔ khớp HAN_PHIEN trong myPay web/kho-may.js
const KHOI_CU =
  "    match /payKho/{id} {\n" +
  "      allow read, write: if laThay();\n" +
  "    }\n" +
  "    match /payKhoSaoLuu/{id} {\n" +
  "      allow read, create: if laThay();\n" +
  "      allow update, delete: if false;\n" +
  "    }\n" +
  "    match /payMaHs/{id} {\n" +
  "      allow read, write: if laThay();\n" +
  "    }\n" +
  "    match /mystudentSoDiemDanh/{id} {\n" +
  "      allow read: if laThay();\n" +
  "      allow write: if false;\n" +
  "    }\n";
const KHOI_MOI =
  "    // " + DAU_HIEU + ": kho hoc phi + so diem danh ngay CHI mo cho phien pay.html (thay + ma 6 so + dang nhap trong 6 gio).\n" +
  "    function payPhienTrong(ms) {\n" +
  "      return laThay()\n" +
  "        && request.auth.token.firebase.sign_in_second_factor == 'totp'\n" +
  "        && request.time.toMillis() - request.auth.token.auth_time * 1000 < ms;\n" +
  "    }\n" +
  "    function payPhien() {\n" +
  "      return payPhienTrong(" + HAN_MS + ");\n" +
  "    }\n" +
  "    // ngan THU (rong, khong du lieu): cung phep tinh nhung han 60 giay - de --kiem chung minh 'qua han la chan' tren may chu that.\n" +
  "    match /zzKiemPayPhien/{id} {\n" +
  "      allow get: if payPhienTrong(60000);\n" +
  "      allow list, write: if false;\n" +
  "    }\n" +
  KHOI_CU.replace(/if laThay\(\);/g, 'if payPhien();');

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU) || cu.includes('function payPhien(')) throw new Error('CHOT DUNG: luật ĐÃ có payPhien — không đăng lại');
  if (!cu.includes('function laThay(')) throw new Error('CHOT DUNG: thiếu laThay — kiểm lại');
  return thayMot(cu, KHOI_CU, KHOI_MOI, 'khối pay 03/10');
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

// ───────── TOTP (RFC 6238, SHA1, 30 s, 6 số) — tự tính mã cho tài khoản thử ─────────
function base32(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '';
  for (const ch of String(s).replace(/=+$/, '').toUpperCase()) { const v = A.indexOf(ch); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); }
  const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function maTotp(bi, luc) {
  const dem = Math.floor((luc || Date.now()) / 30000); const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(dem));
  const h = crypto.createHmac('sha1', base32(bi)).update(b).digest(); const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, '0');
}
const IDT2 = 'https://identitytoolkit.googleapis.com/v2';
const UID_QT = 'ztest_payphien', EMAIL_QT = 'ztest-payphien@quantri.andrewclasses.com';
// tài khoản quản trị THỬ: claim thay + CÀI mã 6 số thật ⇒ đăng nhập 2 bước ⇒ idToken có sign_in_second_factor 'totp'
async function tkQuanTriThu() {
  const mk = 'ztest-' + crypto.randomBytes(9).toString('base64url');
  await xoaTkThu(UID_QT);
  let r = await goi(`${IDT}/projects/${PROJECT}/accounts`, { method: 'POST', headers: await H(), json: { localId: UID_QT, email: EMAIL_QT, password: mk, emailVerified: true } });
  if (r.status !== 200) throw new Error('TAO_TK_QT_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  r = await goi(`${IDT}/projects/${PROJECT}/accounts:update`, { method: 'POST', headers: await H(), json: { localId: UID_QT, customAttributes: JSON.stringify({ thay: true }) } });
  if (r.status !== 200) throw new Error('CLAIMS_TK_QT_' + r.status);
  const vao = async () => goi(`${IDT}/accounts:signInWithPassword?key=${API_KEY}`, { method: 'POST', json: { email: EMAIL_QT, password: mk, returnSecureToken: true } });
  r = await vao();
  if (r.status !== 200 || !r.json.idToken) throw new Error('DANG_NHAP_QT_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  const tokMot = r.json.idToken;   // phiên KHÔNG mã 6 số (trước khi cài) — phải bị chặn
  r = await goi(`${IDT2}/accounts/mfaEnrollment:start?key=${API_KEY}`, { method: 'POST', json: { idToken: tokMot, totpEnrollmentInfo: {} } });
  if (r.status !== 200 || !r.json.totpSessionInfo) throw new Error('CAI_TOTP_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  const bi = r.json.totpSessionInfo.sharedSecretKey, ss = r.json.totpSessionInfo.sessionInfo;
  r = await goi(`${IDT2}/accounts/mfaEnrollment:finalize?key=${API_KEY}`, { method: 'POST', json: { idToken: tokMot, displayName: 'ztest', totpVerificationInfo: { sessionInfo: ss, verificationCode: maTotp(bi) } } });
  if (r.status !== 200) throw new Error('CHOT_TOTP_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  r = await vao();
  if (!r.json || !r.json.mfaPendingCredential) throw new Error('KHONG_HOI_MA_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  const cho = r.json.mfaPendingCredential, enr = r.json.mfaInfo[0].mfaEnrollmentId;
  for (let lan = 0; lan < 3; lan++) {   // mã vừa dùng để cài có thể bị coi là "đã dùng" ⇒ chờ khung 30 s sau
    if (lan) await new Promise((x) => setTimeout(x, 31000 - (Date.now() % 30000)));
    const f = await goi(`${IDT2}/accounts/mfaSignIn:finalize?key=${API_KEY}`, { method: 'POST', json: { mfaPendingCredential: cho, mfaEnrollmentId: enr, totpVerificationInfo: { verificationCode: maTotp(bi) } } });
    if (f.status === 200 && f.json.idToken) return { tokMot, tokHai: f.json.idToken };
    if (lan === 2) throw new Error('DANG_NHAP_2_BUOC_' + f.status + ' ' + JSON.stringify(f.json).slice(0, 200));
  }
}

// ───────── KIỂM THẬT (REST trên máy chủ; tài liệu thử ZTESTPAY do khoá quản trị đặt, dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const Hd = (tok) => tok ? { Authorization: 'Bearer ' + tok } : {};
  const S = (v) => ({ stringValue: v });
  const ZZ = 'zzKiemPayPhien/ZTESTPAY';
  const PK = 'payKho/ZTESTPAY', SL = 'payKhoSaoLuu/ZTESTPAY', SL2 = 'payKhoSaoLuu/ZTESTPAY2', MA = 'payMaHs/ZTESTPAY', SO = 'mystudentSoDiemDanh/ZTESTPAY';
  const ghi = async (tok, p, f) => (await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: Hd(tok), json: { fields: f } })).status;
  const doc = async (tok, p) => (await goi(`${FS_GOC}/${p}${k}`, { headers: Hd(tok) })).status;
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  if (!rel.source.includes('function payPhien(')) console.log('  ⚠ luật đang chạy CHƯA có payPhien (chưa --dang?)');
  try {
    for (const p of [PK, SL, MA, SO, ZZ]) {
      const r0 = await goi(`${FS_GOC}/${p}`, { method: 'PATCH', headers: await H(), json: { fields: { json: S('{}'), thu: S('ZTEST') } } });
      if (r0.status !== 200) throw new Error('KHONG_DAT_DUOC_MAU_' + p + '_' + r0.status);
    }
    console.log('Thử THẬT trên máy chủ:');
    const tkE = await taoTkThu('hs_ztestpay', 'ZTESTPAY', { hs: true, ma: 'ZTESTPAY', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkT = await tokenThayThu();
    const qt = await tkQuanTriThu();
    ok('THẦY mã 6 số đọc payKho = 200', await doc(qt.tokHai, PK), 200);
    ok('THẦY mã 6 số ghi payKho = 200', await ghi(qt.tokHai, PK, { json: S('{"a":1}') }), 200);
    ok('THẦY mã 6 số đọc payKhoSaoLuu = 200', await doc(qt.tokHai, SL), 200);
    ok('THẦY mã 6 số THÊM sao lưu mới = 200', await ghi(qt.tokHai, SL2, { json: S('{}') }), 200);
    ok('THẦY mã 6 số SỬA sao lưu cũ = 403 (chỉ thêm)', await ghi(qt.tokHai, SL, { json: S('x') }), 403);
    ok('THẦY mã 6 số đọc payMaHs = 200', await doc(qt.tokHai, MA), 200);
    ok('THẦY mã 6 số ghi payMaHs = 200', await ghi(qt.tokHai, MA, { thu: S('y') }), 200);
    ok('THẦY mã 6 số đọc sổ điểm danh ngày = 200', await doc(qt.tokHai, SO), 200);
    ok('THẦY mã 6 số ghi sổ điểm danh ngày = 403', await ghi(qt.tokHai, SO, { thu: S('z') }), 403);
    ok('Quản trị CHƯA mã 6 số đọc payKho = 403', await doc(qt.tokMot, PK), 403);
    ok('Vé thầy kiểu APP (không mã 6 số) đọc payKho = 403', await doc(tkT, PK), 403);
    ok('Vé thầy kiểu APP ghi payKho = 403', await ghi(tkT, PK, { json: S('{}') }), 403);
    ok('Vé thầy kiểu APP đọc sổ điểm danh ngày = 403', await doc(tkT, SO), 403);
    ok('Vé thầy kiểu APP đọc payMaHs = 403', await doc(tkT, MA), 403);
    ok('EM đọc payKho = 403', await doc(tkE, PK), 403);
    ok('EM đọc sổ điểm danh ngày = 403', await doc(tkE, SO), 403);
    ok('NGƯỜI LẠ đọc payKho = 403', await doc(null, PK), 403);
    ok('NGƯỜI LẠ ghi payKho = 403', await ghi(null, PK, { json: S('{}') }), 403);
    ok('NGƯỜI LẠ đọc sổ điểm danh ngày = 403', await doc(null, SO), 403);
    // quá hạn: ngăn thử zzKiemPayPhien — cùng phép tính, hạn 60 giây (phiên mã 6 số vừa đăng nhập ở trên)
    ok('Ngăn thử hạn 60 giây — đọc NGAY = 200', await doc(qt.tokHai, ZZ), 200);
    console.log('  … chờ 65 giây cho phiên thử quá hạn 60 giây');
    await new Promise((x) => setTimeout(x, 65000));
    ok('Ngăn thử hạn 60 giây — đọc sau 65 giây = 403 (QUÁ HẠN LÀ CHẶN)', await doc(qt.tokHai, ZZ), 403);
    ok('…cùng phiên đó vẫn đọc payKho (hạn 6 giờ) = 200', await doc(qt.tokHai, PK), 200);
  } finally {
    console.log('  dọn', await xoaTaiLieu([PK, SL, SL2, MA, SO, ZZ]), 'tài liệu thử');
    await xoaTkThu('hs_ztestpay'); await xoaTkThu('ztest_thay'); await xoaTkThu(UID_QT);
    console.log('  đã xoá tài khoản thử hs_ztestpay + ztest_thay + ' + UID_QT);
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
      ghiTaiLieu('_luat-thu-pay-phien.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-pay-phien.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-pay-phien.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-pay-phien.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
