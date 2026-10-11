// 📝 12/10/2026 — LUẬT: tài liệu tiến độ `lessonVideoTienDo/{ma}__{bai}` nhận thêm trường `chuong` (LESSON CHƯƠNG khóa NỀN TẢNG:
// đã xem hết slide hướng dẫn · bước tự đánh dấu đọc sách/gửi Zalo · khúc đã xem video bài làm mẫu) — để đổi máy không mất tiến độ.
// Thầy chốt 12/10 ("làm luôn phần đồng bộ tiến độ lên kho cho nhiều máy"). Chép khuôn script luật màn giới thiệu (09/10): sửa TẠI CHỖ
// từ bản luật ĐANG CHẠY, CHỐT DỪNG. Chỉ THÊM 'chuong' vào danh sách trường của lessonVideoTienDo — điều kiện "đúng em" giữ nguyên.
//
//   node tools/dang-luat-tien-do-chuong.js --xem | --dang | --kiem | --lui <rulesetName>
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

const DAU_HIEU = '(12/10/2026) tien do LESSON CHUONG';
const CU = "['ma','bai','lop','khuc','luc','vt','vtLuc','cham'])";
const MOI = "['ma','bai','lop','khuc','luc','vt','vtLuc','cham','chuong'])   // " + DAU_HIEU;
const CU2 = "        && (!('vtLuc' in request.resource.data)\n            || request.resource.data.vtLuc is number);";
const MOI2 = "        && (!('vtLuc' in request.resource.data)\n            || request.resource.data.vtLuc is number)\n" +
  "        // " + DAU_HIEU + ": chuong = map { hd, tay, vid } (slide huong dan, buoc tu danh dau, video mau)\n" +
  "        && (!('chuong' in request.resource.data)\n            || (request.resource.data.chuong is map && request.resource.data.chuong.size() <= 5));";

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ nhận trường chuong — không đăng lại');
  const k = cu.indexOf('match /lessonVideoTienDo/');
  if (k < 0) throw new Error('CHOT DUNG: luật đang chạy không có lessonVideoTienDo');
  const ket = cu.indexOf('match /', k + 10);
  const khoi = cu.slice(k, ket < 0 ? cu.length : ket);
  if (khoi.split(CU).length - 1 !== 1) throw new Error('CHOT DUNG: khối lessonVideoTienDo không có đúng 1 danh sách trường cũ');
  let moi = thayMot(khoi, CU, MOI, 'lessonVideoTienDo hasOnly');
  moi = thayMot(moi, CU2, MOI2, 'lessonVideoTienDo vtLuc (cuối điều kiện)');
  return cu.slice(0, k) + moi + cu.slice(k + khoi.length);
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

// ───────── KIỂM (REST thật: học sinh ZTEST ghi tài liệu tiến độ của CHÍNH MÌNH có `chuong`; dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) });
  const MA = 'ZTEST9999993', MA_KHAC = 'ZTEST9999992', UID = 'hs_9999993';
  const pMinh = 'lessonVideoTienDo/' + MA + '__ZTEST_CHUONG', pKhac = 'lessonVideoTienDo/' + MA_KHAC + '__ZTEST_CHUONG';
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  try {
    const tHs = await taoTkThu(UID, MA, { hs: true, ma: MA, lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const A = (t) => ({ Authorization: 'Bearer ' + t });
    const chuong = { mapValue: { fields: {
      hd: { mapValue: { fields: { pct: I(100), xong: { booleanValue: true } } } },
      tay: { mapValue: { fields: { btc01sach: I(Date.now()) } } },
      vid: { mapValue: { fields: { btc01mau: { mapValue: { fields: { tong: { doubleValue: 76.2 }, khuc: { arrayValue: { values: [{ doubleValue: 0 }, { doubleValue: 76.2 }] } } } } } } } },
    } } };
    const goiGhi = (p, ma, tk, them) => goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: tk ? A(tk) : {},
      json: { fields: Object.assign({ ma: S(ma), bai: S('ZTEST_CHUONG'), lop: S('ZTEST'), khuc: { mapValue: { fields: {} } }, luc: I(Date.now()) }, them) } });
    ok('HỌC SINH ghi tiến độ của mình KÈM chuong = 200', (await goiGhi(pMinh, MA, tHs, { chuong })).status, 200);
    ok('HỌC SINH ghi tiến độ KHÔNG chuong (bài thường) vẫn = 200', (await goiGhi(pMinh, MA, tHs, {})).status, 200);
    ok('HỌC SINH ghi chuong KHÔNG phải map = 403', (await goiGhi(pMinh, MA, tHs, { chuong: S('x') })).status, 403);
    ok('HỌC SINH ghi trường lạ = 403', (await goiGhi(pMinh, MA, tHs, { la: S('x') })).status, 403);
    ok('HỌC SINH ghi tiến độ của EM KHÁC = 403', (await goiGhi(pKhac, MA_KHAC, tHs, { chuong })).status, 403);
    ok('NGƯỜI LẠ ghi = 403', (await goiGhi(pMinh, MA, null, { chuong })).status, 403);
  } finally {
    console.log('  dọn', await xoaTaiLieu([pMinh, pKhac]), 'tài liệu thử');
    await xoaTkThu(UID);
    console.log('  xoá tài khoản thử');
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
      ghiTaiLieu('_luat-thu-tien-do-chuong.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-tien-do-chuong.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-tien-do-chuong.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-tien-do-chuong.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
