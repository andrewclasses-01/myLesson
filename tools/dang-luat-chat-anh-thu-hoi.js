// 💬 01/10/2026 (web v1.206.0) — LUẬT CHAT LỚP: ẢNH CỦA THẦY + BẢN CHÉP TIN THU HỒI (chỉ thầy đọc).
// Chép khuôn `dang-luat-chat-zalo.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, mỗi chỗ sửa có CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-chat-anh-thu-hoi.js --xem | --dang | --kiem | --lui <rulesetFirestore> [rulesetStorage]
//
// Firestore — chỉ đụng khối `classChat`:
//   · create tin: thêm trường TUỲ CHỌN 'hinh' = URL tải về Storage `classChat/<lớp>/…` — CHỈ THẦY (role gv + laThay()).
//     text vẫn bắt buộc (trang gửi '[Hình ảnh]') ⇒ trang cũ còn cache vẫn đọc được.
//   · update THU HỒI: thêm 'hinh' vào danh sách được xoá + bắt buộc xoá (tin ảnh thu hồi là mất ảnh như mất chữ).
//   · KHO MỚI `classChat/{lop}/thuHoi/{id}` (id = id tin): BẢN CHÉP nội dung tin lúc thu hồi. CHỈ THẦY ĐỌC.
//     Tạo được khi: cùng MỘT LƯỢT GHI (batch) với lệnh thu hồi (getAfter thấy thuHoi), nội dung ĐÚNG Y tin gốc trước lượt ghi
//     (get), người tạo = người được thu hồi tin đó (thầy mọi tin, em tin của mình). Không ai sửa/xoá.
//     Trang cũ thu hồi KHÔNG kèm bản chép vẫn được (update tin không đòi bản chép).
// Storage — thêm khối `classChat/{lop}/{tep}`: CHỈ THẦY ghi (JPEG < 2 MB) và đọc qua SDK; học sinh xem bằng URL có token tải.
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const PROJECT = 'aword-70dae';
const BUCKET = 'aword-70dae.firebasestorage.app';
const API_KEY = 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY';   // khoá CÔNG KHAI (config.js) — dùng để thử như người lạ
const API = 'https://firebaserules.googleapis.com/v1';
const DB = `projects/${PROJECT}/databases/(default)`;
const FS_GOC = `https://firestore.googleapis.com/v1/${DB}/documents`;
const IDT = 'https://identitytoolkit.googleapis.com/v1';
const DUOI_EMAIL = '@id.andrewclasses.com';
const REL_ST = `firebase.storage/${BUCKET}`;
const KHOA_UNG_VIEN = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'E:\\LAP TRINH APP\\mySpeaking-data\\data\\firebase-admin.json',
  'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'];
const TAI_LIEU_UNG_VIEN = ['E:/LAP TRINH APP/myLesson-data/tai-lieu', 'D:/APP AND DATA/myLesson-data/tai-lieu'];

const DAU_HIEU = '(01/10/2026, web v1.206.0) ANH CUA THAY';
// URL tải về Storage của ảnh chat lớp (getDownloadURL): .../o/classChat%2F<lop>%2F<tep>?alt=media&token=<uuid>
const RE_HINH = "'^https://firebasestorage[.]googleapis[.]com/v0/b/aword-70dae[.]firebasestorage[.]app/o/classChat%2F[^?/]+[?]alt=media&token=[0-9a-f-]+$'";
const MOC_STK = "        && (!('sticker' in request.resource.data)\n" +
  "            || (request.resource.data.sticker is string && request.resource.data.sticker.matches('^[a-z]{2,8}:[a-z0-9-]{2,24}$')))\n" +
  "        && request.resource.data.text is string\n";
const MOI_STK = "        && (!('sticker' in request.resource.data)\n" +
  "            || (request.resource.data.sticker is string && request.resource.data.sticker.matches('^[a-z]{2,8}:[a-z0-9-]{2,24}$')))\n" +
  "        // " + DAU_HIEU + " gui trong chat lop (hoc sinh KHONG gui anh): URL tai ve Storage classChat/<lop>/.\n" +
  "        && (!('hinh' in request.resource.data)\n" +
  "            || (laThay() && request.resource.data.role == 'gv' && request.resource.data.hinh is string\n" +
  "                && request.resource.data.hinh.size() <= 500 && request.resource.data.hinh.matches(" + RE_HINH + ")))\n" +
  "        && request.resource.data.text is string\n";
const MOC_KEYS = "['name','code','role','text','createdAt','may','q','sticker'])";
const MOI_KEYS = "['name','code','role','text','createdAt','may','q','sticker','hinh'])";
const MOC_TH1 = ".affectedKeys().hasOnly(['thuHoi','text','cx','q','sticker'])";
const MOI_TH1 = ".affectedKeys().hasOnly(['thuHoi','text','cx','q','sticker','hinh'])";
const MOC_TH2 = "            && !('q' in request.resource.data) && !('sticker' in request.resource.data)\n";
const MOI_TH2 = "            && !('q' in request.resource.data) && !('sticker' in request.resource.data) && !('hinh' in request.resource.data)\n";
const MOC_KHO = "    match /classChatArchive/{id} {\n";
const KHOI_TH =
  "    // (01/10/2026, web v1.206.0) BAN CHEP TIN THU HOI: CHI THAY doc (dashboard hien noi dung duoi \"Tin nhan da bi thu hoi\").\n" +
  "    // Ghi CUNG MOT LUOT (batch) voi lenh thu hoi: noi dung DUNG Y tin goc (get = truoc luot ghi), tin goc sau luot ghi da thu hoi.\n" +
  "    match /classChat/{lop}/thuHoi/{id} {\n" +
  "      function ccGoc() { return get(/databases/$(database)/documents/classChat/$(lop)/messages/$(id)).data; }\n" +
  "      allow read: if laThay();\n" +
  "      allow create: if request.resource.data.keys().hasOnly(['text','q','sticker','hinh','name','code','luc'])\n" +
  "        && exists(/databases/$(database)/documents/classChat/$(lop)/messages/$(id))\n" +
  "        && ccGoc().get('thuHoi', false) != true\n" +
  "        && getAfter(/databases/$(database)/documents/classChat/$(lop)/messages/$(id)).data.get('thuHoi', false) == true\n" +
  "        && request.resource.data.get('text', '') == ccGoc().get('text', '')\n" +
  "        && request.resource.data.get('q', null) == ccGoc().get('q', null)\n" +
  "        && request.resource.data.get('sticker', null) == ccGoc().get('sticker', null)\n" +
  "        && request.resource.data.get('hinh', null) == ccGoc().get('hinh', null)\n" +
  "        && request.resource.data.get('name', '') == ccGoc().get('name', '')\n" +
  "        && request.resource.data.get('code', '') == ccGoc().get('code', '')\n" +
  "        && request.resource.data.luc is number\n" +
  "        && (laThay() || (ccGoc().get('role', '') == 'hs' && hsDung(ccGoc().get('code', ''))));\n" +
  "      allow update, delete: if false;\n" +
  "    }\n";
const THAY_ST = "request.auth != null && ((request.auth.token.email == 'namdaptrai01@gmail.com' && request.auth.token.email_verified == true) || request.auth.token.get('thay', false) == true)";
const NEO_ST = '    match /{allPaths=**} {\n';
const KHOI_ST =
  '    // ' + DAU_HIEU + ' gui trong chat lop: CHI THAY ghi (JPEG < 2 MB) + doc qua SDK; hoc sinh xem bang URL co token tai.\n' +
  '    match /classChat/{lop}/{tep} {\n' +
  '      allow read: if ' + THAY_ST + ';\n' +
  '      allow write: if ' + THAY_ST + '\n' +
  "        && (request.resource == null || (request.resource.contentType == 'image/jpeg' && request.resource.size < 2 * 1024 * 1024))\n" +
  '        && lop.size() <= 40 && tep.size() <= 60;\n' +
  '    }\n';

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU) || cu.includes('/classChat/{lop}/thuHoi/')) throw new Error('CHOT DUNG: luật Firestore ĐÃ có ảnh thầy / bản chép thu hồi — không đăng lại');
  if (!cu.includes('khuon chat kieu Zalo')) throw new Error('CHOT DUNG: luật đang chạy CHƯA có khuôn chat kiểu Zalo — kiểm lại');
  if (!cu.includes('function hsDung(') || !cu.includes('function laThay(')) throw new Error('CHOT DUNG: thiếu hsDung/laThay — kiểm lại');
  let s = thayMot(cu, MOC_KEYS, MOI_KEYS, 'classChat create thêm khoá hinh');
  s = thayMot(s, MOC_STK, MOI_STK, 'classChat create kiểm hinh');
  s = thayMot(s, MOC_TH1, MOI_TH1, 'thu hồi được xoá hinh');
  s = thayMot(s, MOC_TH2, MOI_TH2, 'thu hồi bắt buộc xoá hinh');
  s = thayMot(s, MOC_KHO, KHOI_TH + MOC_KHO, 'kho bản chép thu hồi');
  return s;
}
function ghepStorage(cu) {
  if (cu.includes(DAU_HIEU) || cu.includes('match /classChat/')) throw new Error('CHOT DUNG: luật Storage ĐÃ có khối classChat — không đăng lại');
  return thayMot(cu, NEO_ST, KHOI_ST + NEO_ST, 'storage classChat trước allPaths');
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

async function docReleaseSt() { return docRelease(REL_ST); }

// ───────── KIỂM (REST thật; chỗ thử classChat/ZTEST + Storage classChat/ZTEST, dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const nay = Date.now(), rac = [], racSt = [];
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) }), B = (v) => ({ booleanValue: v });
  const M = (o) => ({ mapValue: { fields: o } });
  let dem = 0;
  const Hd = (tok) => tok ? { Authorization: 'Bearer ' + tok } : {};
  const tao = async (tok, fields) => {
    const p = 'classChat/ZTEST/messages/za' + (++dem);
    const r = await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: Hd(tok), json: { fields: Object.assign({ name: S('ZTEST'), role: S('hs'), createdAt: I(nay), may: S('abcdefghij') }, fields) } });
    if (r.status === 200) rac.push(p);
    return { st: r.status, p };
  };
  const sua = async (tok, p, fields, mask) => {
    const r = await goi(`${FS_GOC}/${p}${k}&${mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&')}`, { method: 'PATCH', headers: Hd(tok), json: { fields } });
    return r.status;
  };
  // MỘT lượt ghi gồm: (bản chép thuHoi/<id> nếu có) + (thu hồi tin, trừ khi coThuHoi === false)
  const mThu = ['thuHoi', 'text', 'cx', 'q', 'sticker', 'hinh'];
  const thuHoiBatch = async (tok, p, banChep, coThuHoi) => {
    const id = p.split('/').pop(), writes = [];
    if (banChep) writes.push({ update: { name: `${DB}/documents/classChat/ZTEST/thuHoi/${id}`, fields: banChep }, currentDocument: { exists: false } });
    if (coThuHoi !== false) writes.push({ update: { name: `${DB}/documents/${p}`, fields: { thuHoi: B(true), text: S(''), cx: M({}) } }, updateMask: { fieldPaths: mThu } });
    const r = await goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit${k}`, { method: 'POST', headers: Hd(tok), json: { writes } });
    if (r.status === 200 && banChep) rac.push('classChat/ZTEST/thuHoi/' + id);
    return r.status;
  };
  const doc = async (tok, p) => (await goi(`${FS_GOC}/${p}${k}`, { headers: Hd(tok) })).status;
  const urlHinh = 'https://firebasestorage.googleapis.com/v0/b/aword-70dae.firebasestorage.app/o/classChat%2FZTEST%2Fa1.jpg?alt=media&token=1b2c3d4e-0000-4000-8000-123456789abc';
  const relFs = await docRelease('cloud.firestore'), relSt = await docReleaseSt();
  const truoc = await docCongTac();
  console.log('luật đang chạy: firestore', relFs.rulesetName, '| storage', relSt.rulesetName, '| công tắc:', JSON.stringify(truoc));
  try {
    const tkA = await taoTkThu('hs_ztestca1', 'ZTESTCA1', { hs: true, ma: 'ZTESTCA1', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkB = await taoTkThu('hs_ztestca2', 'ZTESTCA2', { hs: true, ma: 'ZTESTCA2', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkT = await tokenThayThu();
    if (truoc.khoaChat) await datCongTac({ khoaChat: false, khoaDiem: truoc.khoaDiem, lyDo: 'kiem luat chat anh' });
    await new Promise((r) => setTimeout(r, 1500));
    console.log(' — ẢNH CỦA THẦY (Firestore)');
    const t1 = await tao(tkT, { code: S('GV'), role: S('gv'), text: S('[Hình ảnh]'), hinh: S(urlHinh) });
    ok('THẦY gửi tin ảnh (URL Storage classChat/) = 200', t1.st, 200);
    ok('THẦY gửi tin ảnh URL lạ = 403', (await tao(tkT, { code: S('GV'), role: S('gv'), text: S('[Hình ảnh]'), hinh: S('https://evil.com/a.jpg') })).st, 403);
    ok('em A gửi tin có ảnh = 403', (await tao(tkA, { code: S('ZTESTCA1'), text: S('[Hình ảnh]'), hinh: S(urlHinh) })).st, 403);
    const a1 = await tao(tkA, { code: S('ZTESTCA1'), text: S('Tin em A sẽ thu hồi'), q: M({ id: S('abc'), ten: S('B'), chu: S('trích') }) });
    ok('em A gửi tin thường (luật cũ vẫn chạy) = 200', a1.st, 200);
    const a2 = await tao(tkA, { code: S('ZTESTCA1'), text: S('Tin thứ hai của A') });
    const a3 = await tao(tkA, { code: S('ZTESTCA1'), text: S('Tin thứ ba của A') });
    const b1 = await tao(tkB, { code: S('ZTESTCA2'), text: S('Tin của B') });
    console.log(' — BẢN CHÉP THU HỒI');
    const chep = (text, extra) => Object.assign({ text: S(text), name: S('ZTEST'), code: S('ZTESTCA1'), luc: I(nay) }, extra || {});
    const qA = () => ({ q: M({ id: S('abc'), ten: S('B'), chu: S('trích') }) });
    ok('em A ghi bản chép SAI chữ + thu hồi = 403', await thuHoiBatch(tkA, a1.p, chep('chữ bịa', qA())), 403);
    ok('em A ghi bản chép mà KHÔNG thu hồi = 403', await thuHoiBatch(tkA, a2.p, chep('Tin thứ hai của A'), false), 403);
    ok('em B ghi bản chép + thu hồi tin của A = 403', await thuHoiBatch(tkB, a2.p, chep('Tin thứ hai của A')), 403);
    ok('em A thu hồi tin của mình + bản chép ĐÚNG = 200', await thuHoiBatch(tkA, a1.p, chep('Tin em A sẽ thu hồi', qA())), 200);
    ok('em A thu hồi KIỂU CŨ không bản chép (trang cache) = 200', await thuHoiBatch(tkA, a3.p, null), 200);
    ok('THẦY thu hồi tin của B + bản chép = 200', await thuHoiBatch(tkT, b1.p, { text: S('Tin của B'), name: S('ZTEST'), code: S('ZTESTCA2'), luc: I(nay) }), 200);
    ok('THẦY thu hồi tin ẢNH (xoá hinh) + bản chép có hinh = 200', await thuHoiBatch(tkT, t1.p, { text: S('[Hình ảnh]'), hinh: S(urlHinh), name: S('ZTEST'), code: S('GV'), luc: I(nay) }), 200);
    const pChep = 'classChat/ZTEST/thuHoi/' + a1.p.split('/').pop();
    ok('THẦY đọc bản chép = 200', await doc(tkT, pChep), 200);
    ok('em A (chủ tin) đọc bản chép = 403', await doc(tkA, pChep), 403);
    ok('NGƯỜI LẠ đọc bản chép = 403', await doc(null, pChep), 403);
    ok('THẦY sửa bản chép = 403', await sua(tkT, pChep, { text: S('sửa') }, ['text']), 403);
    console.log(' — STORAGE classChat/');
    const up = async (tok, ten, loai) => {
      const r = await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?name=` + encodeURIComponent('classChat/ZTEST/' + ten), { method: 'POST', headers: Object.assign({ 'Content-Type': loai || 'image/jpeg' }, tok ? { Authorization: 'Firebase ' + tok } : {}), body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
      if (r.status === 200) racSt.push('classChat/ZTEST/' + ten);
      return r.status;
    };
    ok('THẦY tải ảnh JPEG lên = 200', await up(tkT, 'zt1.jpg'), 200);
    ok('THẦY tải file PDF = 403', await up(tkT, 'zt2.pdf', 'application/pdf'), 403);
    ok('em A tải ảnh lên = 403', await up(tkA, 'zt3.jpg'), 403);
    const urlMo = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/` + encodeURIComponent('classChat/ZTEST/zt1.jpg') + '?alt=media';
    ok('NGƯỜI LẠ đọc ảnh (không token tải) = 403', (await fetch(urlMo)).status, 403);
    ok('THẦY đọc ảnh = 200', (await fetch(urlMo, { headers: { Authorization: 'Firebase ' + tkT } })).status, 200);
  } finally {
    await datCongTac(truoc);
    console.log('  trả công tắc về:', JSON.stringify(await docCongTac()));
    console.log('  dọn', await xoaTaiLieu(rac), 'tài liệu thử:', rac.join(', ') || '(không có)');
    for (const p of racSt) {
      const r = await goi(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(p)}`, { method: 'DELETE', headers: await H() });
      console.log('  xoá Storage', p, r.status);
    }
    await xoaTkThu('hs_ztestca1'); await xoaTkThu('hs_ztestca2'); await xoaTkThu('ztest_thay');
    console.log('  đã xoá tài khoản thử hs_ztestca1 + hs_ztestca2 + ztest_thay');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--lui') {
      if (!a[1]) throw new Error('thiếu rulesetName');
      console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120));
      if (a[2]) console.log('storage ←', a[2], JSON.stringify(await datRelease(REL_ST, a[2])).slice(0, 120));
      return;
    }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore'), stCu = await docReleaseSt();
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName, '| storage:', stCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source), stMoi = ghepStorage(stCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-chat-anh-thu-hoi.rules', fsMoi);
      ghiTaiLieu('_luat-thu-storage-chat-anh.rules', stMoi);
      for (const [ten, cu, moi] of [['FIRESTORE', fsCu.source, fsMoi], ['STORAGE', stCu.source, stMoi]]) {
        const d = soDong(cu, moi);
        console.log('  ' + ten + ' ghép thử OK (chưa đăng). Khác biệt từng dòng:');
        d.bot.forEach((x) => console.log('   − ' + x));
        d.them.forEach((x) => console.log('   + ' + x));
      }
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-chat-anh-thu-hoi.rules', fsCu.source);
      ghiTaiLieu('_luat-truoc-storage-chat-anh.rules', stCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rsF = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      const rsS = await taoRuleset(stMoi, stCu.fileName || 'storage.rules');
      console.log('ruleset mới firestore:', rsF, '| storage:', rsS);
      await datRelease('cloud.firestore', rsF);
      await datRelease(REL_ST, rsS);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-chat-anh-thu-hoi.js --lui ' + fsCu.rulesetName + ' ' + stCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-chat-anh-thu-hoi.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetFirestore> [rulesetStorage]');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
