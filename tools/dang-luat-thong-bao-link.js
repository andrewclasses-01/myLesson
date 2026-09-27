// 🔔 27/09/2026 tối — LUẬT myNetwork `nwUsers/{uid}/thongBao` create: `link` CHỈ là trang TRONG site (rà XSS, HO SO BAO MAT.md 8.5).
// Chép khuôn `dang-luat-chong-link.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, CHỐT DỪNG từng chỗ. Tự đứng một mình.
//
//   node tools/dang-luat-thong-bao-link.js --xem | --dang | --kiem | --lui <rulesetName>
//
// Vì sao: ai đăng nhập cũng tạo được thông báo cho NGƯỜI KHÁC; `js/thanh.js` bấm thông báo ⇒ `location.href = link` ⇒ `javascript:`
// chạy trong phiên nạn nhân. Web đã chặn (`NW.linkAnToan`), luật chặn tận gốc cùng khuôn. Link hợp lệ hiện có: baidang.html?id= ·
// canhan.html?uid= · tinnhan.html?phong=. ⛔ KHÔNG đụng đăng nhập / scores / results / classChat.
// ⛔ File này viết bằng Write tool (không heredoc Bash — bash nuốt gạch chéo ngược, xem bẫy bash-heredoc-nuot-backslash).
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

const NEO = "          && request.resource.data.keys().hasOnly(['loai', 'tu', 'tuTen', 'tuAnh', 'chu', 'link', 'luc', 'daDoc'])\n";
const THEM = NEO +
  "          // (27/09/2026 toi, ra XSS) `link` CHI la trang TRONG site - cung khuon js/loi.js NW.linkAnToan; chan javascript:/data:/link ngoai\n" +
  "          && (!('link' in request.resource.data)\n" +
  "              || (request.resource.data.link is string\n" +
  "                  && request.resource.data.link.matches('^[a-z0-9-]+[.]html([?][A-Za-z0-9_=&%.-]*)?(#[A-Za-z0-9_-]*)?$')))\n";

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghepFirestore(cu) {
  if (cu.includes('NW.linkAnToan')) throw new Error('CHOT DUNG: luật ĐÃ ràng thongBao.link — không đăng lại');
  if (!cu.includes('match /thongBao/{id}')) throw new Error('CHOT DUNG: luật đang chạy không có khối thongBao — kiểm lại');
  return thayMot(cu, NEO, THEM, 'thongBao create link');
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
  const mask = Object.keys(fields).map((k) => 'updateMask.fieldPaths=' + k).join('&');
  const r = await goi(`${FS_GOC}/${p}?${mask}`, { method: 'PATCH', headers: await H(), json: { fields } });
  if (r.status !== 200) throw new Error('GHI_ADMIN_' + p + '_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
}

// ───────── KIỂM (REST thật; 2 em thử có hồ sơ nwUsers, dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const nay = Date.now(), rac = [];
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) }), B = (v) => ({ booleanValue: v }), L = (xs) => ({ arrayValue: { values: xs.map(S) } });
  const A = 'hs_ztesttb1', Bn = 'hs_ztesttb2';
  let dem = 0;
  const tb = async (link, idTok) => {
    const p = 'nwUsers/' + Bn + '/thongBao/t' + (++dem);
    const fields = { loai: S('thu'), tu: S(A), tuTen: S('ZTEST A'), chu: S('thu'), luc: I(nay), daDoc: B(false) };
    if (link !== undefined) fields.link = S(link);
    const r = await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: idTok ? { Authorization: 'Bearer ' + idTok } : {}, json: { fields } });
    if (r.status === 200) rac.push(p);
    return r.status;
  };
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  try {
    const tkA = await taoTkThu(A, 'ZTESTTB1', { hs: true, ma: 'ZTESTTB1', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    await taoTkThu(Bn, 'ZTESTTB2', { hs: true, ma: 'ZTESTTB2', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    await ghiAdmin('nwUsers/' + A, { ten: S('ZTEST A'), vaiTro: S('hs'), lop: S('ZTEST'), cacLop: L(['ZTEST']) });
    await ghiAdmin('nwUsers/' + Bn, { ten: S('ZTEST B'), vaiTro: S('hs'), lop: S('ZTEST'), cacLop: L(['ZTEST']) });
    rac.push('nwUsers/' + A, 'nwUsers/' + Bn);
    await new Promise((r) => setTimeout(r, 1500));
    ok('A báo B, KHÔNG link = 200', await tb(undefined, tkA), 200);
    ok('A báo B, link "baidang.html?id=abc_123" = 200', await tb('baidang.html?id=abc_123', tkA), 200);
    ok('A báo B, link "canhan.html?uid=hs_1#x" = 200', await tb('canhan.html?uid=hs_1#x', tkA), 200);
    ok('A báo B, link "javascript:alert(1)" = 403', await tb('javascript:alert(1)', tkA), 403);
    ok('A báo B, link "https://evil.com/x" = 403', await tb('https://evil.com/x', tkA), 403);
    ok('A báo B, link "//evil.com" = 403', await tb('//evil.com', tkA), 403);
    ok('A báo B, link "data:text/html,x" = 403', await tb('data:text/html,x', tkA), 403);
    ok('NGƯỜI LẠ báo B = 403', await tb('baidang.html?id=1', null), 403);
  } finally {
    console.log('  dọn', await xoaTaiLieu(rac), 'tài liệu thử');
    await xoaTkThu(A); await xoaTkThu(Bn);
    console.log('  đã xoá tài khoản thử', A, Bn);
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
      ghiTaiLieu('_luat-thu-thong-bao-link.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-thong-bao-link.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-thong-bao-link.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-thong-bao-link.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
