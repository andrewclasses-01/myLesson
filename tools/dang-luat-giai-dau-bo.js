// 📝 15/10/2026 tối — LUẬT: GIẢI ĐẤU CÓ BỘ TỪ + THEO DÕI TRẬN (web v1.351.0). Chép khuôn `dang-luat-the-td.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, CHỐT DỪNG.
//
//   node tools/dang-luat-giai-dau-bo.js --xem | --dang | --kiem | --lui <rulesetName>
//
// Sửa ĐÚNG 3 chỗ, ⛔ không đụng gì khác:
//   1. giaiDau gdHop: thêm khoá `bo` (bộ từ chép từ act AWord WORDS + tuỳ chọn che/o/chiBo) — thiếu/null = như cũ
//   2. tranDau/{id}/tu: bạn CÙNG LỚP đọc được (nút THEO DÕI) · tên từ cho 2–16 chữ + đuôi bàn `_<van>`
//   3. users/{uid}/items (thư viện AWord): phiên thầy do app ký (claim thay) ĐỌC được — chọn act WORDS trên trang giải
// Đi kèm: nw/js/giaidau.js · nw/js/tran.js · js/the-td.js · myLesson/may-chu/functions/tran-dau.js + ws-chu.js
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


const DAU_HIEU = '(15/10/2026 toi) GIAI CO BO TU';
const AW_UID = 'tpD5VivTD6g4NVceix4Zf3Ibefp1';   // chủ thư viện AWord (users/{uid}/items) = tài khoản Google của thầy
// 1) giaiDau: thêm khoá `bo` (bộ từ chép từ act WORDS + tuỳ chọn) — trống/null = A Show Speed ngẫu nhiên như cũ
const GD_CU =
  "        return d.keys().hasOnly(['ten', 'lops', 'game', 'phut', 'lv', 'tu', 'den', 'sao', 'dong', 'daThuong', 'taoLuc', 'capNhat', 'boi'])\n";
const GD_MOI =
  "        // " + DAU_HIEU + " (web v1.351.0): `bo` = bo tu cua act AWord WORDS thay chon (che one|list|free, o 8|12|16, chiBo, tu[{w,m}] <= 300)\n" +
  "        return d.keys().hasOnly(['ten', 'lops', 'game', 'phut', 'lv', 'tu', 'den', 'sao', 'dong', 'daThuong', 'taoLuc', 'capNhat', 'boi', 'bo'])\n" +
  "          && (d.get('bo', null) == null || (d.bo is map && d.bo.get('che', '') in ['one', 'list', 'free']\n" +
  "              && d.bo.get('tu', null) is list && d.bo.tu.size() > 0 && d.bo.tu.size() <= 300))\n";
// 2) tranDau/{id}/tu: bạn CÙNG LỚP đọc được (THEO DÕI trận trực tiếp)
const TU_DOC_CU = "        allow read: if laThay() || (request.auth != null && request.auth.uid in tdTran().nguoi);\n" +
  "        allow create: if request.auth != null && tu.matches('^[a-z]{3,7}$')\n";
const TU_DOC_MOI = "        // " + DAU_HIEU + ": ban CUNG LOP doc duoc tu cua tran (nut THEO DOI trong chat / trang giai) - ten tu co duoi ban `_<van>` (tran co bo tu)\n" +
  "        allow read: if laThay() || (request.auth != null && request.auth.uid in tdTran().nguoi) || hsLop(tdTran().lop);\n" +
  "        allow create: if request.auth != null && tu.matches('^[a-z]{2,16}(_[0-9]{1,3})?$')\n";
// 3) thư viện AWord: phiên THẦY do app ký (custom token claim thay) cũng ĐỌC được (chọn act WORDS cho giải) — không ghi
const LIB_CU = "    match /users/{uid}/items/{itemId} {\n      allow read, write: if isTeacher() && request.auth.uid == uid;\n    }\n";
const LIB_MOI = "    match /users/{uid}/items/{itemId} {\n      allow read, write: if isTeacher() && request.auth.uid == uid;\n" +
  "      // " + DAU_HIEU + ": phien thay do app myLesson ky (claim thay) DOC duoc thu vien de chon act WORDS cho giai dau (khong ghi)\n" +
  "      allow read: if request.auth != null && request.auth.token.get('thay', false) == true && uid == '" + AW_UID + "';\n    }\n";

function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ có giải bộ từ — không đăng lại');
  let s = thayMot(cu, GD_CU, GD_MOI, 'giaiDau: khoá bo');
  s = thayMot(s, TU_DOC_CU, TU_DOC_MOI, 'tranDau/tu: bạn cùng lớp đọc + đuôi bàn');
  s = thayMot(s, LIB_CU, LIB_MOI, 'users/items: phiên thầy app đọc');
  return s;
}

// ───────── KIỂM (REST thật, tài khoản ZTEST tạo rồi xoá ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b });
  const L = (a) => ({ arrayValue: { values: a } }), M = (o) => ({ mapValue: { fields: o } }), N = { nullValue: null };
  const LOP = 'ZTESTBO1', LOP2 = 'ZTESTBO2', A = 'hs_9999981', Bb = 'hs_9999982', C = 'hs_9999983', D = 'hs_9999984', T = 'ztest_thay_bo';
  const MA = { [A]: 'ZTEST9999981', [Bb]: 'ZTEST9999982', [C]: 'ZTEST9999983', [D]: 'ZTEST9999984', [T]: 'ZTESTTHAYBO' };
  const bay = Date.now(), TRAN = 'ztest_tran_bo_' + bay;
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb, 'nwUsers/' + C, 'nwUsers/' + D];
  console.log('luật đang chạy:', (await docRelease('cloud.firestore')).rulesetName);
  try {
    const hs = (uid, ten, lop) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(lop), cacLop: L([S(lop)]), anh: S(''), capNhat: I(bay) });
    await hs(A, 'ZTEST AN', LOP); await hs(Bb, 'ZTEST BINH', LOP); await hs(C, 'ZTEST CUONG', LOP); await hs(D, 'ZTEST DUNG', LOP2);
    const tk = {};
    for (const u of [A, Bb, C]) tk[u] = await taoTkThu(u, MA[u], { hs: true, ma: MA[u], lop: LOP, lops: LOP, msId: 0 });
    tk[D] = await taoTkThu(D, MA[D], { hs: true, ma: MA[D], lop: LOP2, lops: LOP2, msId: 0 });
    tk[T] = await taoTkThu(T, MA[T], { thay: true });
    const H2 = (t) => ({ Authorization: 'Bearer ' + t });
    // giải có bộ từ (thầy ghi)
    const giai = (bo) => ({ fields: Object.assign({ ten: S('ZTEST giai bo'), lops: L([S(LOP)]), game: S('aShowSpeed'), phut: I(2), lv: S('easy'),
      tu: I(bay - 60000), den: I(bay + 3600e3), sao: L([I(3), I(2), I(1)]), dong: B(false) }, bo === undefined ? {} : { bo }) });
    const BO = M({ id: S('x'), ten: S('ZTEST / WORDS'), che: S('free'), o: I(12), chiBo: B(true), bien: S('eng1'), tu: L([M({ w: S('APPLE'), m: S('qua tao') })]) });
    const g1 = await goi(`${FS_GOC}/giaiDau${k}&documentId=ztest_giai_bo_${bay}`, { method: 'POST', headers: H2(tk[T]), json: giai(BO) });
    ok('Thầy tạo giải CÓ bộ từ = 200', g1.status, 200); if (g1.status === 200) xoa.push('giaiDau/ztest_giai_bo_' + bay);
    const g2 = await goi(`${FS_GOC}/giaiDau${k}&documentId=ztest_giai_bo2_${bay}`, { method: 'POST', headers: H2(tk[T]), json: giai(undefined) });
    ok('Thầy tạo giải KHÔNG bộ từ (như cũ) = 200', g2.status, 200); if (g2.status === 200) xoa.push('giaiDau/ztest_giai_bo2_' + bay);
    const g3 = await goi(`${FS_GOC}/giaiDau${k}&documentId=ztest_giai_bo3_${bay}`, { method: 'POST', headers: H2(tk[T]),
      json: giai(M({ che: S('xyz'), tu: L([M({ w: S('A') })]) })) });
    ok('Thầy tạo giải bộ từ sai chế độ = 403', g3.status, 403); if (g3.status === 200) xoa.push('giaiDau/ztest_giai_bo3_' + bay);
    // trận đang chơi (admin dựng sẵn — hàm máy chủ sẽ chấm từ, đừng để nó chấm: giai rỗng, che '')
    await ghiAdmin('tranDau/' + TRAN, { a: S(A), b: S(Bb), nguoi: L([S(A), S(Bb)]), tenA: S('ZTEST AN'), tenB: S('ZTEST BINH'), lop: S(LOP), giai: S(''),
      phut: I(2), lv: S('easy'), trangThai: S('choi'), taoLuc: I(bay), het: I(bay + 60000), batDau: I(bay - 2000), ketThuc: I(bay + 120000), chu: S('APPLEXXXXXXXXXXX') });
    xoa.unshift('tranDau/' + TRAN);
    const tu = (uid, w) => goi(`${FS_GOC}/tranDau/${TRAN}/tu${k}&documentId=${w}`, { method: 'POST', headers: H2(tk[uid]), json: { fields: { uid: S(uid) } } });
    const r1 = await tu(A, 'apple_0'); ok('A gửi từ có đuôi bàn "apple_0" = 200', r1.status, 200); xoa.unshift('tranDau/' + TRAN + '/tu/apple_0');
    ok('B gửi lại đúng từ đó (Taken) = 403', (await tu(Bb, 'apple_0')).status, 403);
    const r2 = await tu(A, 'go'); ok('A gửi từ 2 chữ "go" = 200', r2.status, 200); xoa.unshift('tranDau/' + TRAN + '/tu/go');
    ok('A gửi tên từ sai mẫu "Apple-1" = 403', (await tu(A, 'Apple-1')).status, 403);
    ok('C (cùng lớp, ngoài trận) đọc danh sách từ = 200', (await goi(`${FS_GOC}/tranDau/${TRAN}/tu${k}`, { headers: H2(tk[C]) })).status, 200);
    ok('D (lớp khác) đọc danh sách từ = 403', (await goi(`${FS_GOC}/tranDau/${TRAN}/tu${k}`, { headers: H2(tk[D]) })).status, 403);
    ok('C ghi từ vào trận người khác = 403', (await tu(C, 'cat_0')).status, 403);
    ok('C đọc kế hoạch bàn (may/ke) = 403', (await goi(`${FS_GOC}/tranDau/${TRAN}/may/ke${k}`, { headers: H2(tk[C]) })).status, 403);
    // thư viện AWord
    const lib = (t) => goi(`${FS_GOC}/users/${AW_UID}/items${k}&pageSize=1&mask.fieldPaths=title`, { headers: H2(t) });
    ok('Phiên thầy app (claim thay) đọc thư viện AWord = 200', (await lib(tk[T])).status, 200);
    ok('Học sinh đọc thư viện AWord = 403', (await lib(tk[A])).status, 403);
    ok('Phiên thầy app GHI thư viện = 403', (await goi(`${FS_GOC}/users/${AW_UID}/items${k}&documentId=ztest_${bay}`, { method: 'POST', headers: H2(tk[T]), json: { fields: { title: S('x') } } })).status, 403);
    await new Promise((res) => setTimeout(res, 4000));   // hàm máy chủ chấm 2 từ thử xong rồi mới dọn
  } finally {
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử');
    for (const u of [A, Bb, C, D, T]) await xoaTkThu(u);
    console.log('  xoá 5 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  const TEN = 'tools/dang-luat-giai-dau-bo.js';
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-giai-dau-bo.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--bien-dich')) { console.log('BIÊN DỊCH OK (chưa kích hoạt):', await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules')); return; }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-giai-dau-bo.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node ' + TEN + ' --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node ' + TEN + ' --kiem');
      return;
    }
    console.log('Dùng: --xem | --bien-dich | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
