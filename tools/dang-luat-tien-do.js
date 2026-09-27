// 🔐 27/09/2026 chiều — LUẬT "BÀI NỘP + TIẾN ĐỘ ĐÒI ĐĂNG NHẬP" (web v1.161.0 + AWord Đợt 411), thầy "làm 1 và 2".
// Trước đó ai cũng: ghi ĐÈ ảnh nộp worksheet của em khác (Storage nopBai + lessonNop), làm giả tiến độ video/audio, làm giả
// giờ luyện (practiceLog), XOÁ tích nộp Speaking của em khác (spSubmissions delete: if true).
// Nay mọi kho đó CHỈ ghi được bằng ID token của ĐÚNG em có mã (hoặc thầy):
//   Firestore: emDung(ma) = hsDung(ma) || laThay() || isTeacher() — lessonNop · lessonVideoTienDo · lessonAudioTienDo ·
//              practiceLog (create/update) · spSubmissions (create + delete, mã = {maHS} trên đường dẫn)
//   Storage  : nopBai/{lop}/{bai}/{o}/{ma}/{tep} — request.auth.token.ma == ma
// ⛔ ĐĂNG SAU khi web v1.161.0 + AWord Đợt 411 đã LIVE (kiểm mã băm).
// Chép khuôn `dang-luat-mat-khau.js`: sửa TẠI CHỖ từ bản ĐANG CHẠY, mỗi chỗ sửa có CHỐT DỪNG.
//
//   node dang-luat-tien-do.js --xem | --dang | --kiem | --lui <firestoreRuleset> [<storageRuleset>]
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
  'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'];
const TAI_LIEU_UNG_VIEN = ['E:/LAP TRINH APP/myLesson-data/tai-lieu', 'D:/APP AND DATA/myLesson-data/tai-lieu'];

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}

const STORAGE_REL = 'firebase.storage/aword-70dae.firebasestorage.app';
// Chèn "<dk> && " ngay sau "allow ...: if " gần nhất ĐỨNG TRƯỚC mốc (mốc phải duy nhất, và cách ≤ 160 ký tự).
function chenDk(s, neo, loaiAllow, dk, ten) {
  const i = s.indexOf(neo);
  if (i < 0 || s.indexOf(neo, i + 1) >= 0) throw new Error('CHOT DUNG [' + ten + ']: mốc không duy nhất');
  const dau = loaiAllow + ' if ';
  const j = s.lastIndexOf(dau, i);
  if (j < 0 || i - j > 160) throw new Error('CHOT DUNG [' + ten + ']: không thấy "' + dau + '" ngay trước mốc');
  const k = j + dau.length;
  return s.slice(0, k) + dk + '\n        && ' + s.slice(k);
}
function ghepFirestore(cu) {
  if (cu.includes('function emDung(')) throw new Error('CHOT DUNG: luật ĐÃ có emDung — không đăng lại');
  if (!cu.includes('function diemDungNguoi(')) throw new Error('CHOT DUNG: luật đang chạy CHƯA có diemDungNguoi (78e830b9) — kiểm lại');
  let s = cu;
  s = thayMot(s, '    // (27/09/2026) CONG TAC KHAN CAP:',
    '    // (27/09/2026 chieu, web v1.161.0 + AWord Dot 411) EM DUNG: ghi bai nop / tien do / tich nop CHI bang ID token\n' +
    '    // cua DUNG em co ma (hoac thay). Truoc do ai cung ghi de bai nop, lam gia tien do, xoa tich cua em khac.\n' +
    '    function emDung(ma) {\n' +
    '      return (ma is string && ma.size() > 0 && hsDung(ma)) || laThay() || isTeacher();\n' +
    '    }\n\n' +
    '    // (27/09/2026) CONG TAC KHAN CAP:', 'ham emDung');
  const D = "emDung(request.resource.data.get('ma', ''))   // (27/09 chieu) em dung";
  s = chenDk(s, "['lop','bai','o','ma','ten','trang','luc'])", 'allow create, update:', D, 'lessonNop');
  s = chenDk(s, "['ma','bai','lop','khuc','luc','vt','vtLuc','cham'])", 'allow create, update:', D, 'lessonVideoTienDo');
  s = chenDk(s, "['ma','bai','lop','khuc','tong','luc','cham'])", 'allow create, update:', D, 'lessonAudioTienDo');
  s = chenDk(s, "['name','mode','again','mistakes','score','total','timeMs','done','attemptId','createdAt','updatedAt','ma','activeMs','review'])", 'allow create, update:', D, 'practiceLog');
  s = chenDk(s, "hasOnly(['ten','tickedAt'])", 'allow create:', 'emDung(maHS)   // (27/09 chieu) chi dung em tich', 'spSubmissions create');
  const b = s.indexOf('match /spSubmissions/{buoiId}/students/{maHS} {');
  const x = s.indexOf('allow delete: if true;', b);
  if (b < 0 || x < 0 || x - b > 900) throw new Error('CHOT DUNG [spSubmissions delete]: không thấy trong khối');
  s = s.slice(0, x) + 'allow delete: if emDung(maHS);   // (27/09 chieu) truoc: if true - ai cung xoa tich cua em khac' + s.slice(x + 'allow delete: if true;'.length);
  return s;
}
function ghepStorage(cu) {
  if (cu.includes("request.auth.token.ma == ma")) throw new Error('CHOT DUNG: luật Storage ĐÃ đòi đúng em');
  return thayMot(cu, "      allow write: if request.resource != null\n        && request.resource.contentType == 'image/jpeg'",
    "      // (27/09/2026 chieu, web v1.161.0) CHI DUNG EM (ID token, claim ma) moi nop/ghi de anh cua minh.\n" +
    "      allow write: if request.resource != null\n" +
    "        && request.auth != null && ('ma' in request.auth.token) && request.auth.token.ma == ma\n" +
    "        && request.resource.contentType == 'image/jpeg'", 'storage nopBai');
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
let _token = null;
async function tokenQuanTri() {
  if (_token) return _token;
  const duong = KHOA_UNG_VIEN.find((p) => p && fs.existsSync(p));
  if (!duong) throw new Error('KHOA_THIEU_FILE — chép khoá về máy bằng D:\\APP AND DATA\\_KHOA\\CAI KHOA FIREBASE.bat');
  const sa = JSON.parse(fs.readFileSync(duong, 'utf8').replace(/^\uFEFF/, ''));
  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const phan = b64u({ alg: 'RS256', typ: 'JWT' }) + '.' + b64u({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const ky = crypto.createSign('RSA-SHA256').update(phan).sign(sa.private_key).toString('base64url');
  const r = await goi('https://oauth2.googleapis.com/token', { method: 'POST', form: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(phan + '.' + ky) });
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

// ───────── công tắc khẩn cấp (để kiểm khi chat đang khoá) ─────────
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

// ───────── tài khoản thử ZTEST (khoá quản trị, REST Identity Toolkit) ─────────
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

// ───────── KIỂM (REST thật: người lạ + em thử; chỗ thử ZTEST, dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const nay = Date.now(), rac = [], racSt = [];
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) }), B = (v) => ({ booleanValue: v }), M = (f) => ({ mapValue: { fields: f || {} } });
  const ghi = async (p, fields, tok) => {
    const headers = tok ? { Authorization: 'Bearer ' + tok } : {};
    const r = await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers, json: { fields } });
    if (r.status === 200) rac.push(p);
    return r.status;
  };
  const xoa = async (p, tok) => { const headers = tok ? { Authorization: 'Bearer ' + tok } : {}; return (await goi(`${FS_GOC}/${p}${k}`, { method: 'DELETE', headers })).status; };
  const nop = (ma, tok) => ghi('lessonNop/ZTEST__ZTEST__0__' + ma, { lop: S('ZTEST'), bai: S('ZTEST'), o: I(0), ma: S(ma), ten: S('ZTEST'), trang: M(), luc: I(nay) }, tok);
  const vid = (ma, tok) => ghi('lessonVideoTienDo/' + ma + '__ZTEST', { ma: S(ma), bai: S('ZTEST'), lop: S('ZTEST'), khuc: M(), luc: I(nay) }, tok);
  const aud = (ma, tok) => ghi('lessonAudioTienDo/' + ma + '__ZTEST', { ma: S(ma), bai: S('ZTEST'), lop: S('ZTEST'), khuc: M(), tong: M(), luc: I(nay) }, tok);
  const pl = (id, ma, tok) => ghi('practiceLog/ZTEST/entries/' + id, { name: S('ZTEST'), ma: S(ma), mode: S('practice'), again: B(false), mistakes: B(false), score: I(3), total: I(5), timeMs: I(1000), done: B(false), attemptId: S('ZTEST'), createdAt: I(nay), updatedAt: I(nay) }, tok);
  const tich = (ma, tok) => ghi('spSubmissions/ZTEST/students/' + ma, { ten: S('ZTEST'), tickedAt: I(nay) }, tok);
  const BUCKET = 'aword-70dae.firebasestorage.app';
  const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
  const anh = (ma, tok) => new Promise((res, rej) => {
    const ten = 'nopBai/ZTEST/ZTEST/0/' + ma + '/t1.jpg';
    const u = new URL('https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o?uploadType=media&name=' + encodeURIComponent(ten));
    const headers = { 'Content-Type': 'image/jpeg', 'Content-Length': JPG.length };
    if (tok) headers.Authorization = 'Firebase ' + tok;
    const q = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers }, (r) => { r.resume(); r.on('end', () => { if (r.statusCode === 200) racSt.push(ten); res(r.statusCode); }); });
    q.on('error', rej); q.write(JPG); q.end();
  });
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  let tkA = null;
  try {
    tkA = await taoTkThu('hs_ztesttd1', 'ZTESTTD1', { hs: true, ma: 'ZTESTTD1', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    ok('lessonNop: em A đúng mã = 200', await nop('ZTESTTD1', tkA), 200);
    ok('lessonNop: em A ghi đè bài em KHÁC = 403', await nop('ZTESTKHAC9', tkA), 403);
    ok('lessonNop: người lạ = 403', await nop('ZTESTTD1', null), 403);
    ok('video: em A đúng mã = 200', await vid('ZTESTTD1', tkA), 200);
    ok('video: người lạ = 403', await vid('ZTESTTD1', null), 403);
    ok('audio: em A đúng mã = 200', await aud('ZTESTTD1', tkA), 200);
    ok('audio: em A giả mã em khác = 403', await aud('ZTESTKHAC9', tkA), 403);
    ok('practiceLog: em A đúng mã = 200', await pl('p1', 'ZTESTTD1', tkA), 200);
    ok('practiceLog: người lạ = 403', await pl('p2', 'ZTESTTD1', null), 403);
    ok('tích SP: em A tích của mình = 200', await tich('ZTESTTD1', tkA), 200);
    ok('tích SP: người lạ tích hộ = 403', await tich('ZTESTKHAC9', null), 403);
    ok('tích SP: người lạ XOÁ tích của A = 403', await xoa('spSubmissions/ZTEST/students/ZTESTTD1', null), 403);
    ok('tích SP: em A bỏ tích của mình = 200', await xoa('spSubmissions/ZTEST/students/ZTESTTD1', tkA), 200);
    ok('ảnh nộp: em A đúng thư mục mình = 200', await anh('ZTESTTD1', tkA), 200);
    ok('ảnh nộp: em A ghi đè thư mục em KHÁC = 403', await anh('ZTESTKHAC9', tkA), 403);
    ok('ảnh nộp: người lạ = 403', await anh('ZTESTTD1', null), 403);
  } finally {
    console.log('  dọn', await xoaTaiLieu(rac.filter((p) => !p.startsWith('spSubmissions/ZTEST/students/ZTESTTD1'))), 'tài liệu thử');
    for (const ten of racSt) {
      const r = await goi('https://storage.googleapis.com/storage/v1/b/' + BUCKET + '/o/' + encodeURIComponent(ten), { method: 'DELETE', headers: await H() });
      console.log('  dọn ảnh thử', ten, r.status);
    }
    await xoaTkThu('hs_ztesttd1');
    console.log('  đã xoá tài khoản thử hs_ztesttd1');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--lui') {
      if (!a[1]) throw new Error('thiếu rulesetName firestore');
      console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 100));
      if (a[2]) console.log('storage ←', a[2], JSON.stringify(await datRelease(STORAGE_REL, a[2])).slice(0, 100));
      return;
    }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore'), stCu = await docRelease(STORAGE_REL);
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName, '· storage:', stCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source), stMoi = ghepStorage(stCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-tien-do.rules', fsMoi); ghiTaiLieu('_luat-thu-tien-do-storage.rules', stMoi);
      for (const [ten, cu, moi] of [['FIRESTORE', fsCu.source, fsMoi], ['STORAGE', stCu.source, stMoi]]) {
        const d = soDong(cu, moi);
        console.log('  ' + ten + ' — khác biệt từng dòng:');
        d.bot.forEach((x) => console.log('   − ' + x));
        d.them.forEach((x) => console.log('   + ' + x));
      }
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-tien-do.rules', fsCu.source); ghiTaiLieu('_luat-truoc-tien-do-storage.rules', stCu.source);
      const rsF = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      const rsS = await taoRuleset(stMoi, stCu.fileName || 'storage.rules');
      await datRelease('cloud.firestore', rsF);
      await datRelease(STORAGE_REL, rsS);
      console.log('ruleset mới firestore:', rsF, '· storage:', rsS);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-tien-do.js --lui ' + fsCu.rulesetName + ' ' + stCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-tien-do.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <firestore> [<storage>]');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
