// 📝 15/10/2026 — LUẬT: kho GIẢI ĐẤU `giaiDau` (đấu game online 1–1, web v1.346.0, Đợt 1 — thầy 'ok build').
// Chép khuôn `dang-luat-xem-gioi-thieu.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-giai-dau.js --xem | --dang | --kiem | --lui <rulesetName>
//
// Chỉ CHÈN một khối mới `match /giaiDau/{id}` (+ bảng xếp hạng `bang/{lop}`) ngay sau khối nwCauHinh.
// ⛔ KHÔNG đụng khối nào khác. Thiết kế: D:\OTHERS\CLAUDE\DAU GAME ONLINE - thiet ke\.
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


const DAU_HIEU = '(15/10/2026) GIAI DAU';
const NEO = "    match /nwCauHinh/{doc} {\n      allow read: if nwVao();\n      allow write: if laThay();\n    }\n";
const KHOI = NEO +
  "\n" +
  "    // " + DAU_HIEU + " - dau game online 1-1 (web v1.346.0, Dot 1): THAY tao/sua/dong giai; ai vao mang (nwVao) deu doc.\n" +
  "    // Bang xep hang tung lop giaiDau/{id}/bang/{lop}: chi thay ghi (Dot 2: ham may chu ghi sau moi tran);\n" +
  "    // hoc sinh CUA LOP DO + thay doc (khoa doc nguoi ngoai). Doc danh sach giai KHONG dat dieu kien theo {id}.\n" +
  "    match /giaiDau/{id} {\n" +
  "      function gdHop(d) {\n" +
  "        return d.keys().hasOnly(['ten', 'lops', 'game', 'phut', 'lv', 'tu', 'den', 'sao', 'dong', 'daThuong', 'taoLuc', 'capNhat', 'boi'])\n" +
  "          && d.ten is string && d.ten.size() > 0 && d.ten.size() <= 40\n" +
  "          && d.lops is list && d.lops.size() > 0 && d.lops.size() <= 20\n" +
  "          && d.game == 'aShowSpeed'\n" +
  "          && d.phut in [2, 3, 5]\n" +
  "          && d.lv in ['easy', 'medium', 'hard']\n" +
  "          && d.tu is int && d.den is int && d.den > d.tu\n" +
  "          && d.sao is list && d.sao.size() == 3\n" +
  "          && d.get('dong', false) is bool;\n" +
  "      }\n" +
  "      allow read: if nwVao();\n" +
  "      allow create, update: if laThay() && gdHop(request.resource.data);\n" +
  "      allow delete: if laThay();\n" +
  "      match /bang/{lop} {\n" +
  "        allow read: if laThay() || hsLop(lop);\n" +
  "        allow write: if laThay();\n" +
  "      }\n" +
  "    }\n";

function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ có khối giaiDau — không đăng lại');
  if (cu.includes('match /giaiDau/')) throw new Error('CHOT DUNG: luật đang chạy đã có match /giaiDau/ (ai đó thêm tay?) — dừng');
  return thayMot(cu, NEO, KHOI, 'chèn khối giaiDau sau nwCauHinh');
}

// ───────── KIỂM (REST thật, tài khoản ZTEST tạo rồi xoá ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b });
  const L = (a) => ({ arrayValue: { values: a } });
  const UID_HS = 'hs_9999993', UID_THAY = 'ztest_thay_giaidau', LOP = 'ZTESTGD', LOP_KHAC = 'ZTESTKHAC';
  const pHs = 'nwUsers/' + UID_HS, ID_GIAI = 'ztest_giai_' + Date.now();
  const bay = Date.now();
  const giai = (o) => ({ fields: Object.assign({ ten: S('ZTEST giai'), lops: L([S(LOP)]), game: S('aShowSpeed'), phut: I(2), lv: S('easy'),
    tu: I(bay), den: I(bay + 86400e3), sao: L([I(30), I(20), I(10)]), dong: B(false), daThuong: B(false), taoLuc: I(bay), capNhat: I(bay), boi: S('ztest') }, o || {}) });
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  const xoa = [pHs];
  try {
    await ghiAdmin(pHs, { uid: S(UID_HS), ten: S('ZTEST GD'), vaiTro: S('hs'), lop: S(LOP), cacLop: L([S(LOP)]), anh: S(''), capNhat: I(bay) });
    const tHs = await taoTkThu(UID_HS, 'ZTEST9999993', { hs: true, ma: 'ZTEST9999993', lop: LOP, lops: LOP, msId: 0 });
    const tThay = await taoTkThu(UID_THAY, 'ZTESTTHAYGIAIDAU', { thay: true });
    const A = (t) => (t ? { Authorization: 'Bearer ' + t } : {});
    const tao = (tk, id, body) => goi(`${FS_GOC}/giaiDau${k}&documentId=${id}`, { method: 'POST', headers: A(tk), json: body });
    const doc = (tk, p) => goi(`${FS_GOC}/${p}${k}`, { headers: A(tk) });
    const ds = (tk, where) => goi(`https://firestore.googleapis.com/v1/${DB}/documents:runQuery${k}`, { method: 'POST', headers: A(tk), json: { structuredQuery: Object.assign({ from: [{ collectionId: 'giaiDau' }], limit: 5 }, where || {}) } });

    ok('HỌC SINH tạo giải = 403', (await tao(tHs, ID_GIAI + 'hs', giai())).status, 403);
    ok('THẦY tạo giải phut=7 (sai) = 403', (await tao(tThay, ID_GIAI + 'sai', giai({ phut: I(7) }))).status, 403);
    ok('THẦY tạo giải trường lạ = 403', (await tao(tThay, ID_GIAI + 'la', giai({ hack: S('x') }))).status, 403);
    const r = await tao(tThay, ID_GIAI, giai());
    ok('THẦY tạo giải đúng = 200', r.status, 200);
    xoa.push('giaiDau/' + ID_GIAI);
    ok('NGƯỜI LẠ đọc giải = 403', (await doc(null, 'giaiDau/' + ID_GIAI)).status, 403);
    ok('HỌC SINH đọc giải = 200', (await doc(tHs, 'giaiDau/' + ID_GIAI)).status, 200);
    const dsHs = await ds(tHs, { where: { fieldFilter: { field: { fieldPath: 'lops' }, op: 'ARRAY_CONTAINS_ANY', value: L([S(LOP)]) } } });
    ok('HỌC SINH hỏi DANH SÁCH theo lớp (array-contains-any) = 200', dsHs.status, 200);
    ok('THẦY hỏi DANH SÁCH orderBy tu = 200', (await ds(tThay, { orderBy: [{ field: { fieldPath: 'tu' }, direction: 'DESCENDING' }] })).status, 200);
    // bảng xếp hạng: thầy ghi, em lớp đó đọc, em lớp khác không
    const bang = (lop) => 'giaiDau/' + ID_GIAI + '/bang/' + lop;
    ok('HỌC SINH ghi bảng xếp hạng = 403', (await goi(`${FS_GOC}/${bang(LOP)}${k}`, { method: 'PATCH', headers: A(tHs), json: { fields: { em: { mapValue: { fields: {} } } } } })).status, 403);
    ok('THẦY ghi bảng lớp = 200', (await goi(`${FS_GOC}/${bang(LOP)}${k}`, { method: 'PATCH', headers: A(tThay), json: { fields: { em: { mapValue: { fields: {} } }, capNhat: I(bay) } } })).status, 200);
    ok('THẦY ghi bảng lớp khác = 200', (await goi(`${FS_GOC}/${bang(LOP_KHAC)}${k}`, { method: 'PATCH', headers: A(tThay), json: { fields: { em: { mapValue: { fields: {} } } } } })).status, 200);
    xoa.push(bang(LOP), bang(LOP_KHAC));
    ok('HỌC SINH đọc bảng LỚP MÌNH = 200', (await doc(tHs, bang(LOP))).status, 200);
    ok('HỌC SINH đọc bảng LỚP KHÁC = 403', (await doc(tHs, bang(LOP_KHAC))).status, 403);
    ok('NGƯỜI LẠ đọc bảng = 403', (await doc(null, bang(LOP))).status, 403);
    ok('HỌC SINH sửa giải = 403', (await goi(`${FS_GOC}/giaiDau/${ID_GIAI}${k}&updateMask.fieldPaths=dong`, { method: 'PATCH', headers: A(tHs), json: { fields: { dong: B(true) } } })).status, 403);
    ok('THẦY đóng giải = 200', (await goi(`${FS_GOC}/giaiDau/${ID_GIAI}${k}&updateMask.fieldPaths=dong&updateMask.fieldPaths=capNhat`, { method: 'PATCH', headers: A(tThay), json: { fields: { dong: B(true), capNhat: I(Date.now()) } } })).status, 200);
  } finally {
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử');
    await xoaTkThu(UID_HS); await xoaTkThu(UID_THAY);
    console.log('  xoá 2 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  const TEN = 'tools/dang-luat-giai-dau.js';
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-giai-dau.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-giai-dau.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node ' + TEN + ' --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node ' + TEN + ' --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
