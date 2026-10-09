// ⭐ 10/10/2026 — LUẬT THƯỞNG SAO (thiết kế D:\OTHERS\CLAUDE\THIET KE THUONG SAO.md, thầy "ok build"):
//   saoTong/chung   ví cả trường { em:{'<số>':{s,m,t,l}} } — THẦY + HỌC SINH đã đăng nhập đọc (bảng sao lớp); KHÔNG ai ghi từ trình duyệt.
//   saoLichSu/<số>  lịch sử ví một em — THẦY đọc, hoặc chính em (token.ma == m); KHÔNG ai ghi từ trình duyệt.
//   saoDot/<id>     PHIẾU SAO — thầy (dashboard) TẠO được, nguon 'dashboard'; app lớp học tạo bằng khoá quản trị.
//                   Hàm máy chủ apDotSao áp phiếu vào ví (sao.js). Không sửa/xoá từ trình duyệt.
//   saoBuoi/<id>    rổ sao tạm từng buổi — chỉ app (khoá quản trị) ghi; THẦY đọc (dashboard "Buổi chưa chốt").
//                   saoBuoi/_hienTai = con trỏ buổi đang dạy + số sao 2 đội — đọc CÔNG KHAI (myBoard/myActivity nghe tức thì).
//   saoCaiDat/chung lý do nhanh + trần sao + bật/tắt báo em — THẦY đọc/ghi (app đọc bằng khoá quản trị).
// Chép khuôn `dang-luat-so-hs.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, có CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-sao.js --xem | --dang | --kiem | --lui <rulesetName>
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

const DAU_HIEU = '(10/10/2026) THUONG SAO';
const MOC_KHO = "    match /classChatArchive/{id} {\n";
const KHOI =
  "    // " + DAU_HIEU + ": vi sao hoc sinh. Chi ham may chu apDotSao sua vi (ap phieu saoDot).\n" +
  "    match /saoTong/{id} {\n" +
  "      allow read: if laThay() || (request.auth != null && request.auth.token.hs == true);\n" +
  "      allow write: if false;\n" +
  "    }\n" +
  "    match /saoLichSu/{so} {\n" +
  "      allow read: if laThay() || (request.auth != null && request.auth.token.hs == true && resource.data.m == request.auth.token.ma);\n" +
  "      allow write: if false;\n" +
  "    }\n" +
  "    match /saoDot/{id} {\n" +
  "      allow read: if laThay();\n" +
  "      allow create: if laThay() && request.resource.data.nguon == 'dashboard' && request.resource.data.dong is list\n" +
  "        && request.resource.data.dong.size() > 0 && request.resource.data.dong.size() <= 300 && !('xong' in request.resource.data);\n" +
  "      allow update, delete: if false;\n" +
  "    }\n" +
  "    match /saoBuoi/{id} {\n" +
  "      allow read: if laThay() || id == '_hienTai';\n" +
  "      allow write: if false;\n" +
  "    }\n" +
  "    match /saoCaiDat/{id} {\n" +
  "      allow read, write: if laThay();\n" +
  "    }\n";

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU) || cu.includes('match /saoTong/')) throw new Error('CHOT DUNG: luật ĐÃ có kho sao — không đăng lại');
  if (!cu.includes('function laThay(')) throw new Error('CHOT DUNG: thiếu laThay — kiểm lại');
  return thayMot(cu, MOC_KHO, KHOI + MOC_KHO, 'kho sao trước classChatArchive');
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

// ───────── KIỂM (REST thật; tài liệu thử ZTEST* do khoá quản trị đặt, dọn ngay — KHÔNG đụng saoTong/chung thật) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const Hd = (tok) => tok ? { Authorization: 'Bearer ' + tok } : {};
  const S = (v) => ({ stringValue: v });
  const I = (v) => ({ integerValue: String(v) });
  const ghi = async (tok, p, f) => (await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: Hd(tok), json: { fields: f } })).status;
  const tao = async (tok, bo, id, f) => (await goi(`${FS_GOC}/${bo}${k}&documentId=${id}`, { method: 'POST', headers: Hd(tok), json: { fields: f } })).status;
  const doc = async (tok, p) => (await goi(`${FS_GOC}/${p}${k}`, { headers: Hd(tok) })).status;
  const dong = { arrayValue: { values: [{ mapValue: { fields: { so: S('999999'), n: I(1), viec: S('ZTEST') } } }] } };
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  const P = { tong: 'saoTong/ZTESTSAO', ls: 'saoLichSu/ZTESTSAO', ls2: 'saoLichSu/ZTESTKHAC', buoi: 'saoBuoi/ZTESTSAO', cai: 'saoCaiDat/ZTESTSAO' };
  const dotTao = [];
  try {
    for (const [p, f] of [[P.tong, { thu: S('ZTEST') }], [P.ls, { m: S('ZTESTSAO'), thu: S('ZTEST') }], [P.ls2, { m: S('ZTESTKHAC') }], [P.buoi, { thu: S('ZTEST') }], [P.cai, { thu: S('ZTEST') }]]) {
      const r0 = await goi(`${FS_GOC}/${p}`, { method: 'PATCH', headers: await H(), json: { fields: f } });
      if (r0.status !== 200) throw new Error('KHONG_DAT_DUOC_MAU_' + p + '_' + r0.status);
    }
    const tkE = await taoTkThu('hs_ztestsao', 'ZTESTSAO', { hs: true, ma: 'ZTESTSAO', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkT = await tokenThayThu();
    ok('THẦY đọc saoTong = 200', await doc(tkT, P.tong), 200);
    ok('EM đọc saoTong = 200 (bảng sao lớp)', await doc(tkE, P.tong), 200);
    ok('NGƯỜI LẠ đọc saoTong = 403', await doc(null, P.tong), 403);
    ok('THẦY ghi saoTong = 403 (chỉ hàm máy chủ)', await ghi(tkT, P.tong, { thu: S('x') }), 403);
    ok('EM ghi saoTong = 403', await ghi(tkE, P.tong, { thu: S('x') }), 403);
    ok('EM đọc lịch sử CỦA MÌNH = 200', await doc(tkE, P.ls), 200);
    ok('EM đọc lịch sử EM KHÁC = 403', await doc(tkE, P.ls2), 403);
    ok('THẦY đọc lịch sử = 200', await doc(tkT, P.ls2), 200);
    ok('NGƯỜI LẠ đọc lịch sử = 403', await doc(null, P.ls), 403);
    ok('EM ghi lịch sử = 403', await ghi(tkE, P.ls, { m: S('ZTESTSAO'), thu: S('x') }), 403);
    // phiếu sao: id ZTEST* ⇒ hàm apDotSao vẫn chạy nhưng số 999999 không có trong sổ ⇒ không cộng gì
    const s1 = await tao(tkT, 'saoDot', 'ZTESTDOT1', { nguon: S('dashboard'), dong }); if (s1 === 200) dotTao.push('saoDot/ZTESTDOT1');
    ok('THẦY tạo phiếu dashboard = 200', s1, 200);
    const s2 = await tao(tkT, 'saoDot', 'ZTESTDOT2', { nguon: S('myTeam'), dong }); if (s2 === 200) dotTao.push('saoDot/ZTESTDOT2');
    ok('THẦY tạo phiếu nguồn khác = 403', s2, 403);
    const s3 = await tao(tkE, 'saoDot', 'ZTESTDOT3', { nguon: S('dashboard'), dong }); if (s3 === 200) dotTao.push('saoDot/ZTESTDOT3');
    ok('EM tạo phiếu = 403', s3, 403);
    const s4 = await tao(tkT, 'saoDot', 'ZTESTDOT4', { nguon: S('dashboard'), dong, xong: { booleanValue: true } }); if (s4 === 200) dotTao.push('saoDot/ZTESTDOT4');
    ok('THẦY tạo phiếu có sẵn xong = 403', s4, 403);
    ok('EM đọc phiếu = 403', await doc(tkE, 'saoDot/ZTESTDOT1'), 403);
    ok('THẦY đọc rổ tạm saoBuoi = 200', await doc(tkT, P.buoi), 200);
    ok('THẦY ghi rổ tạm = 403 (chỉ app)', await ghi(tkT, P.buoi, { thu: S('x') }), 403);
    ok('EM đọc rổ tạm = 403', await doc(tkE, P.buoi), 403);
    ok('NGƯỜI LẠ đọc con trỏ saoBuoi/_hienTai = 200 hoặc 404 (đọc công khai)', [200, 404].includes(await doc(null, 'saoBuoi/_hienTai')) ? 1 : 0, 1);
    ok('THẦY ghi cài đặt = 200', await ghi(tkT, P.cai, { thu: S('y') }), 200);
    ok('EM đọc cài đặt = 403', await doc(tkE, P.cai), 403);
  } finally {
    console.log('  dọn', await xoaTaiLieu(Object.values(P).concat(dotTao)), 'tài liệu thử');
    await xoaTkThu('hs_ztestsao'); await xoaTkThu('ztest_thay');
    console.log('  đã xoá tài khoản thử hs_ztestsao + ztest_thay');
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
      ghiTaiLieu('_luat-thu-sao.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-sao.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-sao.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-sao.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
