// ⭐ 20/10/2026 — LUẬT QUÀ 20-10 (thầy "ok build" pop-up Ngày Phụ nữ Việt Nam: bạn NỮ mở trang ⇒ pop-up, bấm THANK YOU ❤️ ⇒ +10⭐).
//   quaDip/2010_<số>  phiếu quà của MỘT em nữ { dip:'2010', so, m (ID đăng nhập chuẩn), t, sao:10, nhan:false, het } — khoá quản trị TẠO
//                     (tools/nap-qua-2010.js, giới tính lấy từ lopThem/chung). Em đọc phiếu CỦA MÌNH (m == token.ma).
//                     Em chỉ được lật nhan false→true (+ nhanLuc) và CHỈ khi cùng lượt có phiếu sao saoDot/qua2010_<số>.
//   saoDot/qua2010_<số>  em TỰ TẠO đúng 1 dòng { so: <số của em>, n: 10 } trong CÙNG lượt ghi lật nhan ⇒ hàm apDotSao cộng ví.
//                     id cố định + create-only + nhan đã true ⇒ không nhận lần hai.
// Chép khuôn `dang-luat-sao.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, có CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-qua-2010.js --xem | --dang | --kiem | --lui <rulesetName>
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

const DAU_HIEU = '(20/10/2026) QUA 2010';
const MOC_SAODOT = "    match /saoDot/{id} {\n";
const QD = "/databases/$(database)/documents/quaDip/$('2010_' + id.split('_')[1])";
const KHOI_QUA =
  "    // " + DAU_HIEU + ": phieu qua 20-10 tung em nu. Em chi lat nhan false->true cung luot tao saoDot/qua2010_<so>.\n" +
  "    match /quaDip/{id} {\n" +
  "      allow read: if laThay() || (request.auth != null && request.auth.token.hs == true && resource.data.m == request.auth.token.ma);\n" +
  "      allow update: if request.auth != null && request.auth.token.hs == true && resource.data.m == request.auth.token.ma\n" +
  "        && resource.data.nhan == false && request.resource.data.nhan == true\n" +
  "        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['nhan', 'nhanLuc'])\n" +
  "        && existsAfter(/databases/$(database)/documents/saoDot/$('qua' + id));\n" +
  "      allow create, delete: if false;\n" +
  "    }\n";
const DONG_SAODOT =
  "      // " + DAU_HIEU + ": em nu tu tao phieu +10 sao dung 1 lan (kem lat quaDip.nhan).\n" +
  "      allow create: if request.auth != null && request.auth.token.hs == true && id.matches('qua2010_[0-9]{6}')\n" +
  "        && request.resource.data.keys().hasOnly(['nguon', 'lop', 'ngay', 'nhom', 'ai', 'dong', 'tao'])\n" +
  "        && request.resource.data.nguon == 'qua2010' && request.resource.data.dong is list && request.resource.data.dong.size() == 1\n" +
  "        && request.resource.data.dong[0].keys().hasOnly(['so', 'n', 'viec', 'app'])\n" +
  "        && request.resource.data.dong[0].so == id.split('_')[1] && request.resource.data.dong[0].n == 10\n" +
  "        && get(" + QD + ").data.m == request.auth.token.ma\n" +
  "        && get(" + QD + ").data.nhan == false\n" +
  "        && getAfter(" + QD + ").data.nhan == true;\n";

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


function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU) || cu.includes('match /quaDip/')) throw new Error('CHOT DUNG: luật ĐÃ có quà 20-10 — không đăng lại');
  if (!cu.includes('function laThay(')) throw new Error('CHOT DUNG: thiếu laThay — kiểm lại');
  return thayMot(cu, MOC_SAODOT, KHOI_QUA + MOC_SAODOT + DONG_SAODOT, 'quaDip + dòng tạo phiếu trong saoDot');
}

// ───────── KIỂM (REST thật; phiếu thử ZTEST số 99999x — số không có trong sổ ⇒ apDotSao không cộng gì) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const Hd = (tok) => tok ? { Authorization: 'Bearer ' + tok } : {};
  const S = (v) => ({ stringValue: v });
  const I = (v) => ({ integerValue: String(v) });
  const B = (v) => ({ booleanValue: v });
  const doc = async (tok, p) => (await goi(`${FS_GOC}/${p}${k}`, { headers: Hd(tok) })).status;
  const phieu = (so, n, them) => Object.assign({ nguon: S('qua2010'), lop: S('ZTEST'), ngay: S('2026-10-20'), nhom: S('QUÀ 20-10'), ai: S('Thầy Andrew'),
    dong: { arrayValue: { values: [{ mapValue: { fields: { so: S(so), n: I(n), viec: S('ZTEST'), app: S('qua2010') } } }] } }, tao: I(Date.now()) }, them || {});
  // Lượt ghi GỘP (đúng như trang làm): lật nhan + tạo phiếu.
  const nhan = async (tok, so, n, chiPhieu) => {
    const writes = [];
    if (!chiPhieu) writes.push({ update: { name: `${DB}/documents/quaDip/2010_${so}`, fields: { nhan: B(true), nhanLuc: I(Date.now()) } }, updateMask: { fieldPaths: ['nhan', 'nhanLuc'] } });
    writes.push({ update: { name: `${DB}/documents/saoDot/qua2010_${so}`, fields: phieu(so, n) }, currentDocument: { exists: false } });
    return (await goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit${k}`, { method: 'POST', headers: Hd(tok), json: { writes } })).status;
  };
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  const SO = ['999991', '999992', '999993'];
  const dat = async (so, m) => {
    const r0 = await goi(`${FS_GOC}/quaDip/2010_${so}`, { method: 'PATCH', headers: await H(),
      json: { fields: { dip: S('2010'), so: S(so), m: S(m), t: S('ZTEST'), sao: I(10), nhan: B(false), het: I(Date.now() + 3600e3) } } });
    if (r0.status !== 200) throw new Error('KHONG_DAT_DUOC_MAU_' + so + '_' + r0.status);
  };
  const don = SO.map((s) => 'quaDip/2010_' + s).concat(SO.map((s) => 'saoDot/qua2010_' + s));
  try {
    await dat(SO[0], 'ZTESTQUA'); await dat(SO[1], 'ZTESTKHAC'); await dat(SO[2], 'ZTESTQUA');
    const tkE = await taoTkThu('hs_ztestqua', 'ZTESTQUA', { hs: true, ma: 'ZTESTQUA', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkT = await tokenThayThu();
    ok('EM đọc phiếu quà CỦA MÌNH = 200', await doc(tkE, 'quaDip/2010_' + SO[0]), 200);
    ok('EM đọc phiếu quà EM KHÁC = 403', await doc(tkE, 'quaDip/2010_' + SO[1]), 403);
    ok('NGƯỜI LẠ đọc phiếu quà = 403', await doc(null, 'quaDip/2010_' + SO[0]), 403);
    ok('THẦY đọc phiếu quà = 200', await doc(tkT, 'quaDip/2010_' + SO[1]), 200);
    // truy vấn danh sách đúng như trang: where m == ma của em
    const q = await goi(`${FS_GOC}:runQuery${k}`, { method: 'POST', headers: Hd(tkE), json: { structuredQuery: { from: [{ collectionId: 'quaDip' }],
      where: { fieldFilter: { field: { fieldPath: 'm' }, op: 'EQUAL', value: S('ZTESTQUA') } } } } });
    ok('EM truy vấn quaDip theo m của mình = 200', q.status, 200);
    ok('  … thấy đúng 2 phiếu của mình', Array.isArray(q.json) ? q.json.filter((x) => x.document).length : -1, 2);
    ok('EM tạo phiếu sao KHÔNG lật nhan = 403', await nhan(tkE, SO[0], 10, true), 403);
    ok('EM nhận +20 sao = 403', await nhan(tkE, SO[2], 20), 403);
    ok('EM nhận quà CỦA EM KHÁC = 403', await nhan(tkE, SO[1], 10), 403);
    ok('EM nhận quà của mình (+10, gộp lượt) = 200', await nhan(tkE, SO[0], 10), 200);
    ok('EM nhận LẦN HAI = 403', await nhan(tkE, SO[0], 10), 403);
    const r2 = await goi(`${FS_GOC}/quaDip/2010_${SO[2]}?updateMask.fieldPaths=nhan${k.replace('?', '&')}`, { method: 'PATCH', headers: Hd(tkE), json: { fields: { nhan: B(true) } } });
    ok('EM lật nhan mà KHÔNG tạo phiếu = 403', r2.status, 403);
    const r3 = await goi(`${FS_GOC}/quaDip/2010_${SO[2]}?updateMask.fieldPaths=sao${k.replace('?', '&')}`, { method: 'PATCH', headers: Hd(tkE), json: { fields: { sao: I(100) } } });
    ok('EM sửa số sao trong phiếu quà = 403', r3.status, 403);
    ok('NGƯỜI LẠ nhận quà = 403', await nhan(null, SO[2], 10), 403);
  } finally {
    await new Promise((r) => setTimeout(r, 4000));   // chờ apDotSao đánh dấu xong phiếu thử rồi mới xoá
    console.log('  dọn', await xoaTaiLieu(don), 'tài liệu thử');
    await xoaTkThu('hs_ztestqua'); await xoaTkThu('ztest_thay');
    console.log('  đã xoá tài khoản thử hs_ztestqua + ztest_thay');
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
      ghiTaiLieu('_luat-thu-qua-2010.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-qua-2010.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-qua-2010.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-qua-2010.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
