// 📝 29/09/2026 — LUẬT xoá LƯỢT NHẬP TAY (web v1.181.0, dashboard "Nhập điểm tay"). Khối `assignments/{code}/scores/{scoreId}`:
//   · create: mã tài liệu `tay…` (lượt thầy nhập tay) CHỈ thầy được tạo — học sinh không giả được nhãn NHẬP TAY
//   · delete: thêm `laThay() && scoreId.matches('tay.*')` — tài khoản quản trị dashboard (claim `thay`) xoá được lượt nhập tay;
//     lượt THẬT của em (mã `hw…` AWord) vẫn CHỈ Google của thầy (isTeacher) mới xoá.
// Luật này ĐÃ ĐĂNG TAY qua Firebase Console 29/09/2026 19:28 (sửa đúng 2 chỗ bằng API CodeMirror, không gõ tay).
// Công cụ này để LƯU bản đang chạy + KIỂM bằng REST thật + LÙI.
//
//   node tools/dang-luat-xoa-nhap-tay.js --luu | --kiem | --lui <rulesetName>
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


const DAU_HIEU = "allow delete: if isTeacher() || (laThay() && scoreId.matches('tay.*'));";

// ───────── KIỂM (REST thật: người lạ · học sinh ZTEST · "thầy" ZTEST claim thay; act giả ZTEST_ntay; dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) });
  const rac = [];
  const UID_HS = 'hs_9999993', UID_THAY = 'ztest_thay_ntay';
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName, rel.source.includes(DAU_HIEU) ? '(CÓ khối xoá nhập tay)' : '(⚠ CHƯA có khối xoá nhập tay)');
  const ACT = 'assignments/ZTEST_ntay/scores/';
  const diem = (ten) => ({ name: S(ten), score: I(5), total: I(10), timeMs: I(65000), createdAt: I(Date.now()) });
  try {
    // tài liệu có sẵn (khoá quản trị ghi): 1 lượt THẬT `hw…` + 1 lượt nhập tay để người lạ/học sinh thử xoá
    const pThat = ACT + 'hw1790000000000xZTST', pTay0 = ACT + 'tay1790000000000xzt0';
    await ghiAdmin(pThat, diem('ZTEST THAT')); rac.push(pThat);
    await ghiAdmin(pTay0, diem('ZTEST TAY0')); rac.push(pTay0);
    const tHs = await taoTkThu(UID_HS, 'ZTEST9999993', { hs: true, ma: 'ZTEST9999993', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tThay = await taoTkThu(UID_THAY, 'ZTESTTHAYNTAY', { thay: true });
    const A = (t) => ({ Authorization: 'Bearer ' + t });
    const tao = (p, t, ma) => goi(`${FS_GOC}/${p.replace(/\/[^/]+$/, '')}${k}&documentId=${p.split('/').pop()}`, { method: 'POST', headers: t ? A(t) : {}, json: { fields: Object.assign(diem('ZTEST'), ma ? { ma: S(ma) } : {}) } });
    const xoa = (p, t) => goi(`${FS_GOC}/${p}${k}`, { method: 'DELETE', headers: t ? A(t) : {} });
    // TẠO
    const pTay1 = ACT + 'tay1790000000001xzt1', pTayHs = ACT + 'tay1790000000002xzt2', pTayLa = ACT + 'tay1790000000003xzt3', pHwHs = ACT + 'hw1790000000004xZT4';
    rac.push(pTay1, pTayHs, pTayLa, pHwHs);
    // đối chứng: HỌC SINH nộp lượt THẬT hw… có đúng `ma` của mình = 200 ⇒ phép 403 bên dưới là do khoá `tay…`, không do thiếu ma
    ok('HỌC SINH nộp lượt thật hw… (đúng ma) = 200 (đối chứng)', (await tao(pHwHs, tHs, 'ZTEST9999993')).status, 200);
    ok('THẦY (claim thay) tạo lượt nhập tay = 200', (await tao(pTay1, tThay)).status, 200);
    ok('HỌC SINH tạo lượt mã tay… (đúng ma) = 403', (await tao(pTayHs, tHs, 'ZTEST9999993')).status, 403);
    ok('NGƯỜI LẠ tạo lượt mã tay… = 403', (await tao(pTayLa)).status, 403);
    // XOÁ
    ok('NGƯỜI LẠ xoá lượt nhập tay = 403', (await xoa(pTay0)).status, 403);
    ok('HỌC SINH xoá lượt nhập tay = 403', (await xoa(pTay0, tHs)).status, 403);
    ok('THẦY (claim thay) xoá lượt THẬT hw… = 403', (await xoa(pThat, tThay)).status, 403);
    ok('THẦY (claim thay) xoá lượt nhập tay = 200', (await xoa(pTay1, tThay)).status, 200);
    ok('  …đọc lại sau khi xoá = 404', (await goi(`${FS_GOC}/${pTay1}${k}`)).status, 404);
    ok('THẦY (claim thay) xoá lượt nhập tay có sẵn = 200', (await xoa(pTay0, tThay)).status, 200);
    ok('Lượt thật hw… vẫn còn = 200', (await goi(`${FS_GOC}/${pThat}${k}`)).status, 200);
  } finally {
    console.log('  dọn', await xoaTaiLieu(rac), 'tài liệu thử');
    await xoaTkThu(UID_HS); await xoaTkThu(UID_THAY);
    console.log('  xoá 2 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

async function dsRuleset() {
  const r = await goi(`${API}/projects/${PROJECT}/rulesets?pageSize=5`, { headers: await H() });
  if (r.status !== 200) throw new Error('DS_RULESET_' + r.status);
  return r.json.rulesets || [];
}

(async () => {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    if (a.includes('--luu')) {
      const fsNay = await docRelease('cloud.firestore');
      console.log('cloud.firestore đang chạy:', fsNay.rulesetName, fsNay.source.includes(DAU_HIEU) ? '(CÓ khối xoá nhập tay)' : '(⚠ CHƯA có)');
      const ds = await dsRuleset();
      ds.forEach((x) => console.log('  ' + x.createTime + '  ' + x.name));
      const truoc = ds.find((x) => x.name !== fsNay.rulesetName && x.createTime < (ds.find((y) => y.name === fsNay.rulesetName) || {}).createTime);
      if (truoc) {
        const rs = await goi(`${API}/${truoc.name}`, { headers: await H() });
        const src = rs.json.source.files.map((f) => f.content).join('\n');
        ghiTaiLieu('_luat-truoc-xoa-nhap-tay.rules', src);
        const d = soDong(src, fsNay.source);
        console.log('  Khác biệt so với bản trước (' + truoc.name + '):');
        d.bot.forEach((x) => console.log('   − ' + x));
        d.them.forEach((x) => console.log('   + ' + x));
        console.log('  Đường lùi: node tools/dang-luat-xoa-nhap-tay.js --lui ' + truoc.name);
      }
      ghiTaiLieu('_luat-dang-chay-firestore.rules', fsNay.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsNay.source);
      return;
    }
    console.log('Dùng: --luu | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
