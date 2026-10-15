// 🔔 15/10/2026 (web v1.339.0) — LUẬT CHAT LỚP: viên "@Bạn hiền" của nút REMIND (thầy chốt mẫu `MAU REMIND BAN HIEN v1`).
// Tin nhắc bạn KHÔNG còn dãy @Tên1 @Tên2… mà chỉ chữ "@Bạn hiền"; tên các bạn bị nhắc đi KÈM tin ở trường MỚI `nhom`
// (list 1..40 tên) ⇒ js/nhac-tb.js báo từng em, js/chat-ui.js vẽ viên bấm xem ai.
// Sửa TẠI CHỖ từ luật ĐANG CHẠY, mỗi chỗ sửa có CHỐT DỪNG; chỉ đụng khối `classChat/{lop}/messages`:
//   · create: thêm 'nhom' vào danh sách trường được phép + kiểm khuôn (list, 1..40 phần tử). TUỲ CHỌN — tin thường không có.
//   · update THU HỒI: cho xoá thêm 'nhom' (js/chat.js thuHoi xoá cùng chữ). KHÔNG bắt buộc xoá (trang cũ còn cache vẫn thu hồi được).
//
//   node tools/dang-luat-ban-hien.js --xem | --dang | --kiem | --lui <rulesetName>
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

const CLAIM_THAY = { thay: true };   // xem laThay() trong luật đang chạy

const DAU_HIEU = '(15/10/2026, web v1.339.0) VIEN @Ban hien';
const MOC_KEYS = "['name','code','role','text','createdAt','may','q','sticker','hinh','he'])";
const MOI_KEYS = "['name','code','role','text','createdAt','may','q','sticker','hinh','he','nhom'])";
const MOC_STK = "        && (!('sticker' in request.resource.data)\n" +
  "            || (request.resource.data.sticker is string && request.resource.data.sticker.matches('^[a-z]{2,8}:[a-z0-9-]{2,24}$')))\n";
const MOI_STK = MOC_STK +
  "        // " + DAU_HIEU + " (nut REMIND): ten cac ban bi nhac di KEM tin - list 1..40, TUY CHON.\n" +
  "        && (!('nhom' in request.resource.data)\n" +
  "            || (request.resource.data.nhom is list && request.resource.data.nhom.size() > 0 && request.resource.data.nhom.size() <= 40))\n";
const MOC_TH = ".affectedKeys().hasOnly(['thuHoi','text','cx','q','sticker','hinh'])";
const MOI_TH = ".affectedKeys().hasOnly(['thuHoi','text','cx','q','sticker','hinh','nhom'])";

function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ có viên @Bạn hiền — không đăng lại');
  const a = cu.indexOf('    match /classChat/{lop}/messages/{id} {');
  const b = cu.indexOf('    match /classChat/{lop}/thuHoi/{id} {');
  if (a < 0 || b < a) throw new Error('CHOT DUNG: không thấy khối classChat/messages (hoặc thứ tự lạ)');
  let k = cu.slice(a, b);
  for (const [moc, moi] of [[MOC_KEYS, MOI_KEYS], [MOC_STK, MOI_STK], [MOC_TH, MOI_TH]]) {
    const n = k.split(moc).length - 1;
    if (n !== 1) throw new Error('CHOT DUNG: mốc xuất hiện ' + n + ' lần (cần 1): ' + moc.slice(0, 70));
    k = k.replace(moc, () => moi);
  }
  return cu.slice(0, a) + k + cu.slice(b);
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


// ───────── KIỂM (REST thật: tài khoản HỌC SINH + THẦY ZTEST, phòng ZTEST; dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) });
  const L = (ds) => ({ arrayValue: { values: ds.map(S) } });
  const MA = 'ZTEST9999994', UID = 'hs_9999994', UID_T = 'ztest_thay_bh', LOP = 'ZTEST_BH';
  const nhom3 = ['Minh Thư', 'Gia Huy', 'Bảo Nam'], nhom41 = Array.from({ length: 41 }, (_, i) => 'Em ' + i);
  const da = [];
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  try {
    const tHs = await taoTkThu(UID, MA, { hs: true, ma: MA, lop: LOP, lops: LOP, msId: 0 });
    const tThay = await taoTkThu(UID_T, 'ZTESTTHAYBH', CLAIM_THAY);
    const A = (t) => ({ Authorization: 'Bearer ' + t });
    let so = 0;
    const tao = async (tk, laThay, them) => {
      const p = 'classChat/' + LOP + '/messages/ztest_bh_' + Date.now() + '_' + (so++);
      da.push(p);
      const r = await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: A(tk), json: { fields: Object.assign({
        name: S(laThay ? 'Thầy Andrew' : 'Ztest Em'), code: S(laThay ? 'GV' : MA), role: S(laThay ? 'gv' : 'hs'),
        text: S('@Bạn hiền triển đi nha 🚀'), createdAt: I(Date.now()), may: S('ztestmay01') }, them) } });
      return { p, st: r.status };
    };
    ok('HỌC SINH gửi tin thường (không nhom) = 200', (await tao(tHs, false, {})).st, 200);
    const t1 = await tao(tHs, false, { nhom: L(nhom3) });
    ok('HỌC SINH gửi "@Bạn hiền" kèm nhom 3 tên = 200', t1.st, 200);
    ok('HỌC SINH nhom 41 tên = 403', (await tao(tHs, false, { nhom: L(nhom41) })).st, 403);
    ok('HỌC SINH nhom rỗng = 403', (await tao(tHs, false, { nhom: L([]) })).st, 403);
    ok('HỌC SINH nhom là chữ = 403', (await tao(tHs, false, { nhom: S('Minh Thư') })).st, 403);
    ok('THẦY gửi kèm nhom = 200', (await tao(tThay, true, { nhom: L(nhom3) })).st, 200);
    ok('HỌC SINH trường lạ = 403', (await tao(tHs, false, { la: S('x') })).st, 403);
    // THU HỒI tin có nhom: xoá chữ + nhom (updateMask gồm nhom mà không gửi giá trị = xoá)
    const mask = ['thuHoi', 'text', 'cx', 'q', 'sticker', 'hinh', 'nhom'].map((f) => 'updateMask.fieldPaths=' + f).join('&');
    const th = await goi(`${FS_GOC}/${t1.p}${k}&${mask}`, { method: 'PATCH', headers: A(tHs),
      json: { fields: { thuHoi: { booleanValue: true }, text: S(''), cx: { mapValue: { fields: {} } } } } });
    ok('HỌC SINH thu hồi tin có nhom (xoá luôn nhom) = 200', th.status, 200);
  } finally {
    console.log('  dọn', await xoaTaiLieu(da), 'tài liệu thử');
    await xoaTkThu(UID); await xoaTkThu(UID_T);
    console.log('  xoá 2 tài khoản thử');
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
      ghiTaiLieu('_luat-thu-ban-hien.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-ban-hien.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-ban-hien.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-ban-hien.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
