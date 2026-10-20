// ⭐ 20/10/2026 — LUẬT THÔNG BÁO TRANG CHỦ (hộp "Thông báo" dashboard, thầy "ok build" mẫu THONG BAO v1).
//   thongBao/<mãTB>     nội dung + trạng thái { ten, kieu, nhan, chao, phuDe, noi, ket, nut, sao, anh, gui, tt:'nhap'|'dang'|'xong', … }
//                       THẦY đọc/ghi. Học sinh đã đăng nhập đọc được khi tt == 'dang' (để vẽ pop-up).
//   tbNhan/<mãTB>_<số>  phiếu người nhận { tb, so, m, t, lop, sao, nhan:false } — THẦY tạo/xoá/đọc. Em đọc phiếu CỦA MÌNH (m == token.ma),
//                       chỉ lật nhan false→true (+nhanLuc) khi thông báo đang hiện; có sao thì CÙNG LƯỢT phải tạo saoDot/tb_<mãTB>_<số>.
//   saoDot/tb_<mãTB>_<số>  em tự tạo đúng 1 dòng { so: số của em, n: đúng số sao trên phiếu (1–50) } ⇒ hàm apDotSao cộng ví.
// Chép khuôn `dang-luat-qua-2010.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, có CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-thong-bao.js --xem | --dang | --kiem | --lui <rulesetName>
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


const DAU_HIEU = '(20/10/2026) THONG BAO';
const MOC_SAODOT = "    match /saoDot/{id} {\n";
const TBN = "/databases/$(database)/documents/tbNhan/$(id.split('_')[1] + '_' + id.split('_')[2])";
const KHOI_TB =
  "    // " + DAU_HIEU + ": thong bao trang chu. Thay quan ly; em doc thong bao dang hien + phieu cua minh, chi lat nhan.\n" +
  "    match /thongBao/{id} {\n" +
  "      allow read: if laThay() || (request.auth != null && request.auth.token.hs == true && resource.data.tt == 'dang');\n" +
  "      allow create, update: if laThay() && id.matches('[A-Za-z0-9]{1,40}') && request.resource.data.tt in ['nhap', 'dang', 'xong'];\n" +
  "      allow delete: if laThay();\n" +
  "    }\n" +
  "    match /tbNhan/{id} {\n" +
  "      allow read: if laThay() || (request.auth != null && request.auth.token.hs == true && resource.data.m == request.auth.token.ma);\n" +
  "      allow create: if laThay() && request.resource.data.nhan == false && request.resource.data.sao is int\n" +
  "        && request.resource.data.sao >= 0 && request.resource.data.sao <= 50 && id == request.resource.data.tb + '_' + request.resource.data.so;\n" +
  "      allow delete: if laThay();\n" +
  "      allow update: if request.auth != null && request.auth.token.hs == true && resource.data.m == request.auth.token.ma\n" +
  "        && resource.data.nhan == false && request.resource.data.nhan == true\n" +
  "        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['nhan', 'nhanLuc'])\n" +
  "        && get(/databases/$(database)/documents/thongBao/$(resource.data.tb)).data.tt == 'dang'\n" +
  "        && (resource.data.sao == 0 || existsAfter(/databases/$(database)/documents/saoDot/$('tb_' + id)));\n" +
  "    }\n";
const DONG_SAODOT =
  "      // " + DAU_HIEU + ": em tu tao phieu sao cua thong bao (dung so sao tren phieu tbNhan, 1 lan, kem lat nhan).\n" +
  "      allow create: if request.auth != null && request.auth.token.hs == true && id.matches('tb_[A-Za-z0-9]+_[0-9]{6}')\n" +
  "        && request.resource.data.keys().hasOnly(['nguon', 'lop', 'ngay', 'nhom', 'ai', 'dong', 'tao'])\n" +
  "        && request.resource.data.nguon == 'thongBao' && request.resource.data.dong is list && request.resource.data.dong.size() == 1\n" +
  "        && request.resource.data.dong[0].keys().hasOnly(['so', 'n', 'viec', 'app'])\n" +
  "        && request.resource.data.dong[0].so == id.split('_')[2]\n" +
  "        && request.resource.data.dong[0].n == get(" + TBN + ").data.sao && request.resource.data.dong[0].n > 0\n" +
  "        && get(" + TBN + ").data.m == request.auth.token.ma\n" +
  "        && get(" + TBN + ").data.nhan == false\n" +
  "        && getAfter(" + TBN + ").data.nhan == true;\n";
function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
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
  if (cu.includes(DAU_HIEU) || cu.includes('match /tbNhan/')) throw new Error('CHOT DUNG: luật ĐÃ có thông báo — không đăng lại');
  if (!cu.includes('function laThay(')) throw new Error('CHOT DUNG: thiếu laThay — kiểm lại');
  return thayMot(cu, MOC_SAODOT, KHOI_TB + MOC_SAODOT + DONG_SAODOT, 'thongBao + tbNhan + dòng tạo phiếu trong saoDot');
}

// ───────── KIỂM (REST thật; tài liệu ZTEST* do khoá quản trị đặt, số 99999x không có trong sổ ⇒ apDotSao không cộng gì) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const Hd = (tok) => tok ? { Authorization: 'Bearer ' + tok } : {};
  const S = (v) => ({ stringValue: v });
  const I = (v) => ({ integerValue: String(v) });
  const B = (v) => ({ booleanValue: v });
  const doc = async (tok, p) => (await goi(`${FS_GOC}/${p}${k}`, { headers: Hd(tok) })).status;
  const commit = async (tok, writes) => (await goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit${k}`, { method: 'POST', headers: Hd(tok), json: { writes } })).status;
  const lat = (id) => ({ update: { name: `${DB}/documents/tbNhan/${id}`, fields: { nhan: B(true), nhanLuc: I(Date.now()) } }, updateMask: { fieldPaths: ['nhan', 'nhanLuc'] } });
  const phieu = (id, so, n) => ({ update: { name: `${DB}/documents/saoDot/tb_${id}`, fields: { nguon: S('thongBao'), lop: S('ZTEST'), ngay: S('2026-10-20'), nhom: S('ZTEST'), ai: S('Thầy Andrew'),
    dong: { arrayValue: { values: [{ mapValue: { fields: { so: S(so), n: I(n), viec: S('ZTEST'), app: S('Thầy Andrew') } } }] } }, tao: I(Date.now()) } }, currentDocument: { exists: false } });
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  const dat = async (p, f) => { const r = await goi(`${FS_GOC}/${p}`, { method: 'PATCH', headers: await H(), json: { fields: f } }); if (r.status !== 200) throw new Error('KHONG_DAT_DUOC_MAU_' + p + '_' + r.status); };
  const nh = (tb, so, m, sao) => ({ tb: S(tb), so: S(so), m: S(m), t: S('ZTEST'), lop: S('ZTEST'), sao: I(sao), nhan: B(false) });
  const DON = ['thongBao/ZTESTTB1', 'thongBao/ZTESTTB2', 'thongBao/ZTESTTB3', 'tbNhan/ZTESTTB1_999991', 'tbNhan/ZTESTTB1_999992', 'tbNhan/ZTESTTB1_999993',
    'tbNhan/ZTESTTB2_999994', 'tbNhan/ZTESTTB1_999995', 'tbNhan/ZTESTTB1_999996', 'saoDot/tb_ZTESTTB1_999991', 'saoDot/tb_ZTESTTB1_999992', 'saoDot/tb_ZTESTTB2_999994'];
  try {
    await dat('thongBao/ZTESTTB1', { tt: S('dang'), ten: S('ZTEST') });
    await dat('thongBao/ZTESTTB2', { tt: S('xong'), ten: S('ZTEST') });
    await dat('tbNhan/ZTESTTB1_999991', nh('ZTESTTB1', '999991', 'ZTESTTBEM', 5));
    await dat('tbNhan/ZTESTTB1_999992', nh('ZTESTTB1', '999992', 'ZTESTKHAC', 5));
    await dat('tbNhan/ZTESTTB1_999993', nh('ZTESTTB1', '999993', 'ZTESTTBEM', 0));
    await dat('tbNhan/ZTESTTB2_999994', nh('ZTESTTB2', '999994', 'ZTESTTBEM', 3));
    const tkE = await taoTkThu('hs_ztesttb', 'ZTESTTBEM', { hs: true, ma: 'ZTESTTBEM', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkT = await tokenThayThu();
    ok('EM đọc thông báo ĐANG HIỆN = 200', await doc(tkE, 'thongBao/ZTESTTB1'), 200);
    ok('EM đọc thông báo ĐÃ DỪNG = 403', await doc(tkE, 'thongBao/ZTESTTB2'), 403);
    ok('NGƯỜI LẠ đọc thông báo = 403', await doc(null, 'thongBao/ZTESTTB1'), 403);
    const q = await goi(`${FS_GOC}:runQuery${k}`, { method: 'POST', headers: Hd(tkE), json: { structuredQuery: { from: [{ collectionId: 'tbNhan' }],
      where: { fieldFilter: { field: { fieldPath: 'm' }, op: 'EQUAL', value: S('ZTESTTBEM') } } } } });
    ok('EM truy vấn phiếu của mình = 200', q.status, 200);
    ok('  … thấy đúng 3 phiếu', Array.isArray(q.json) ? q.json.filter((x) => x.document).length : -1, 3);
    ok('EM đọc phiếu EM KHÁC = 403', await doc(tkE, 'tbNhan/ZTESTTB1_999992'), 403);
    ok('EM lật phiếu có sao mà KHÔNG tạo phiếu sao = 403', await commit(tkE, [lat('ZTESTTB1_999991')]), 403);
    ok('EM nhận SAI số sao (6 thay vì 5) = 403', await commit(tkE, [lat('ZTESTTB1_999991'), phieu('ZTESTTB1_999991', '999991', 6)]), 403);
    ok('EM nhận phiếu EM KHÁC = 403', await commit(tkE, [lat('ZTESTTB1_999992'), phieu('ZTESTTB1_999992', '999992', 5)]), 403);
    ok('EM xác nhận + nhận 5 sao (gộp lượt) = 200', await commit(tkE, [lat('ZTESTTB1_999991'), phieu('ZTESTTB1_999991', '999991', 5)]), 200);
    ok('EM nhận LẦN HAI = 403', await commit(tkE, [lat('ZTESTTB1_999991'), phieu('ZTESTTB1_999991', '999991', 5)]), 403);
    ok('EM xác nhận thông báo KHÔNG sao = 200', await commit(tkE, [lat('ZTESTTB1_999993')]), 200);
    ok('EM xác nhận thông báo ĐÃ DỪNG = 403', await commit(tkE, [lat('ZTESTTB2_999994'), phieu('ZTESTTB2_999994', '999994', 3)]), 403);
    const r3 = await goi(`${FS_GOC}/tbNhan/ZTESTTB1_999993?updateMask.fieldPaths=sao&key=${API_KEY}`, { method: 'PATCH', headers: Hd(tkE), json: { fields: { sao: I(50) } } });
    ok('EM sửa số sao trên phiếu = 403', r3.status, 403);
    ok('EM tạo thông báo = 403', await commit(tkE, [{ update: { name: `${DB}/documents/thongBao/ZTESTTB3`, fields: { tt: S('dang') } } }]), 403);
    ok('THẦY tạo thông báo = 200', await commit(tkT, [{ update: { name: `${DB}/documents/thongBao/ZTESTTB3`, fields: { tt: S('nhap'), ten: S('ZTEST') } } }]), 200);
    ok('THẦY tạo phiếu người nhận = 200', await commit(tkT, [{ update: { name: `${DB}/documents/tbNhan/ZTESTTB1_999995`, fields: nh('ZTESTTB1', '999995', 'ZTESTX', 2) } }]), 200);
    ok('THẦY tạo phiếu 99 sao = 403', await commit(tkT, [{ update: { name: `${DB}/documents/tbNhan/ZTESTTB1_999996`, fields: nh('ZTESTTB1', '999996', 'ZTESTX', 99) } }]), 403);
    ok('THẦY đọc phiếu = 200', await doc(tkT, 'tbNhan/ZTESTTB1_999992'), 200);
  } finally {
    await new Promise((r) => setTimeout(r, 4000));   // chờ apDotSao đánh dấu xong phiếu thử rồi mới xoá
    console.log('  dọn', await xoaTaiLieu(DON), 'tài liệu thử');
    await xoaTkThu('hs_ztesttb'); await xoaTkThu('ztest_thay');
    console.log('  đã xoá tài khoản thử hs_ztesttb + ztest_thay');
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
      ghiTaiLieu('_luat-thu-thong-bao.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-thong-bao.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-thong-bao.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-thong-bao.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
