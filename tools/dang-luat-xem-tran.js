// 📝 16/10/2026 chiều — LUẬT: NGƯỜI XEM TRẬN (web v1.361.0): tranDau/{id}/xem/{uid} (đang xem) · /bl/{tự} (bình luận) · /tim/a|b (đếm tim)
// + tdDangDau/{uid} (đang mở tab trận ⇒ hộp mời ⚔ hiện "Đang đấu"). Chép khuôn dang-luat-thay-giao-huu.js: sửa TẠI CHỖ bản đang chạy, CHỐT DỪNG.
//
//   node tools/dang-luat-xem-tran.js --xem | --bien-dich | --dang | --kiem | --lui <rulesetName> | --goc <tệp>
//
// Đi kèm: nw/js/xem.js, nw/js/tran.js, js/the-td.js.
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


const DAU_HIEU = '(16/10/2026 chieu) NGUOI XEM TRAN';
// 1) trong match /tranDau/{id}: người xem (xem/{uid}) · bình luận (bl/{tự}) · đếm tim (tim/a|b) — chèn trước khối nhip
const R1_CU = "      match /nhip/{uid} {\n";
const R1_MOI =
  "      // " + DAU_HIEU + " (web v1.361.0): ai duoc xem = thay · ban CUNG LOP cua tran · 2 nguoi choi (nhu nut Theo doi).\n" +
  "      function tdDuocXem() { return laThay() || hsLop(tdTran().lop) || (request.auth != null && request.auth.uid in tdTran().nguoi); }\n" +
  "      function tdNguoiXem() { return request.auth != null && !(request.auth.uid in tdTran().nguoi) && (laThay() || hsLop(tdTran().lop)); }\n" +
  "      // nguoi dang xem: moi nguoi ghi o CUA MINH (nhip 20 giay), ten khop ho so (thay tu do), anh tu kho nw/\n" +
  "      match /xem/{uid} {\n" +
  "        allow read: if tdDuocXem();\n" +
  "        allow create, update: if tdNguoiXem() && uid == request.auth.uid\n" +
  "          && request.resource.data.keys().hasOnly(['ten', 'anh', 'gv', 'luc'])\n" +
  "          && request.resource.data.ten is string && request.resource.data.ten.size() <= 60\n" +
  "          && (laThay() || request.resource.data.ten == nwHoSo(request.auth.uid).ten)\n" +
  "          && nwAnhKho(request.resource.data.get('anh', '')) && (request.resource.data.get('gv', false) == false || laThay())\n" +
  "          && request.resource.data.luc is int;\n" +
  "        allow delete: if request.auth != null && uid == request.auth.uid;\n" +
  "      }\n" +
  "      // binh luan cua NGUOI XEM (khong phai 2 nguoi choi): 1..120 chu, khong link, gio may chu\n" +
  "      match /bl/{bid} {\n" +
  "        allow read: if tdDuocXem();\n" +
  "        allow create: if tdNguoiXem()\n" +
  "          && request.resource.data.keys().hasOnly(['uid', 'ten', 'anh', 'gv', 'chu', 'luc']) && request.resource.data.uid == request.auth.uid\n" +
  "          && request.resource.data.chu is string && request.resource.data.chu.size() > 0 && request.resource.data.chu.size() <= 120\n" +
  "          && !nwCoLink(request.resource.data.chu)\n" +
  "          && request.resource.data.ten is string && request.resource.data.ten.size() <= 60\n" +
  "          && (laThay() || request.resource.data.ten == nwHoSo(request.auth.uid).ten)\n" +
  "          && nwAnhKho(request.resource.data.get('anh', '')) && (request.resource.data.get('gv', false) == false || laThay())\n" +
  "          && request.resource.data.luc == request.time;\n" +
  "        allow delete: if laThay();\n" +
  "      }\n" +
  "      // dem TIM moi ben (a | b): nguoi xem chi CONG 1 moi lan ghi\n" +
  "      match /tim/{k} {\n" +
  "        allow read: if tdDuocXem();\n" +
  "        allow create: if tdNguoiXem() && k in ['a', 'b'] && request.resource.data.keys().hasOnly(['n']) && request.resource.data.n == 1;\n" +
  "        allow update: if tdNguoiXem() && k in ['a', 'b'] && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['n'])\n" +
  "          && request.resource.data.n == resource.data.n + 1;\n" +
  "      }\n" + R1_CU;
// 2) tdDangDau/{uid}: người chơi đang mở tab trận (nhịp 30 giây) — hộp mời ⚔ hiện "Đang đấu", không mời được
const R2_CU = "    match /tdLichSu/{uid} {\n";
const R2_MOI =
  "    // " + DAU_HIEU + ": DANG DAU - nguoi choi con mo tab tran ghi nhip { id tran, luc } (chi tran co minh); ai dang nhap cung doc\n" +
  "    match /tdDangDau/{uid} {\n" +
  "      allow read: if nwVao();\n" +
  "      allow create, update: if request.auth != null && uid == request.auth.uid\n" +
  "        && request.resource.data.keys().hasOnly(['id', 'luc']) && request.resource.data.id is string\n" +
  "        && request.resource.data.id.size() > 0 && request.resource.data.id.size() <= 40 && request.resource.data.luc is int\n" +
  "        && exists(/databases/$(database)/documents/tranDau/$(request.resource.data.id))\n" +
  "        && request.auth.uid in get(/databases/$(database)/documents/tranDau/$(request.resource.data.id)).data.nguoi;\n" +
  "      allow delete: if request.auth != null && uid == request.auth.uid;\n" +
  "    }\n" + R2_CU;

function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ có phần người xem — không đăng lại');
  let s = thayMot(cu, R1_CU, R1_MOI, 'tranDau: xem / bl / tim');
  s = thayMot(s, R2_CU, R2_MOI, 'tdDangDau');
  return s;
}

// ───────── KIỂM (REST thật, tài khoản ZTEST tạo rồi xoá ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b }), L = (a) => ({ arrayValue: { values: a } });
  const LOP = 'ZTESTXM1', LOP2 = 'ZTESTXM2', A = 'hs_9999961', Bb = 'hs_9999962', C = 'hs_9999963', D = 'hs_9999964';
  const MA = { [A]: 'ZTEST9999961', [Bb]: 'ZTEST9999962', [C]: 'ZTEST9999963', [D]: 'ZTEST9999964' };
  const TEN = { [A]: 'ZTEST AN', [Bb]: 'ZTEST BINH', [C]: 'ZTEST CUONG', [D]: 'ZTEST DUNG' };
  const bay = Date.now(), TR = 'ztest_xm_' + bay;
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb, 'nwUsers/' + C, 'nwUsers/' + D, 'tranDau/' + TR, 'tranDau/' + TR + '/tim/a', 'tranDau/' + TR + '/xem/' + C, 'tdDangDau/' + A];
  console.log('luật đang chạy:', (await docRelease('cloud.firestore')).rulesetName);
  try {
    const hs = (uid, lop) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(TEN[uid]), vaiTro: S('hs'), lop: S(lop), cacLop: L([S(lop)]), anh: S(''), capNhat: I(bay) });
    await hs(A, LOP); await hs(Bb, LOP); await hs(C, LOP); await hs(D, LOP2);
    const tk = {};
    for (const u of [A, Bb, C]) tk[u] = await taoTkThu(u, MA[u], { hs: true, ma: MA[u], lop: LOP, lops: LOP, msId: 0 });
    tk[D] = await taoTkThu(D, MA[D], { hs: true, ma: MA[D], lop: LOP2, lops: LOP2, msId: 0 });
    await ghiAdmin('tranDau/' + TR, { a: S(A), b: S(Bb), nguoi: L([S(A), S(Bb)]), tenA: S(TEN[A]), tenB: S(TEN[Bb]), lop: S(LOP), giai: S(''), phut: I(2), lv: S('easy'), trangThai: S('het'), taoLuc: I(bay), het: I(bay) });
    const H2 = (t) => ({ Authorization: 'Bearer ' + t });
    const ghi = (who, p, fields, mask) => goi(`${FS_GOC}/${p}${k}${mask ? mask.map((m) => '&updateMask.fieldPaths=' + m).join('') : ''}`, { method: 'PATCH', headers: H2(tk[who]), json: { fields } });
    const tao = (who, p, fields) => goi(`${FS_GOC}/${p}${k}`, { method: 'POST', headers: H2(tk[who]), json: { fields } });
    // người xem
    ok('C (cùng lớp) ghi "đang xem" của mình = 200', (await ghi(C, `tranDau/${TR}/xem/${C}`, { ten: S(TEN[C]), anh: S(''), gv: B(false), luc: I(Date.now()) })).status, 200);
    ok('C ghi "đang xem" thay cho B = 403', (await ghi(C, `tranDau/${TR}/xem/${Bb}`, { ten: S(TEN[Bb]), anh: S(''), luc: I(Date.now()) })).status, 403);
    ok('C ghi tên giả "Thầy Andrew" = 403', (await ghi(C, `tranDau/${TR}/xem/${C}`, { ten: S('Thầy Andrew'), anh: S(''), luc: I(Date.now()) })).status, 403);
    ok('C tự gắn huy hiệu thầy (gv) = 403', (await ghi(C, `tranDau/${TR}/xem/${C}`, { ten: S(TEN[C]), anh: S(''), gv: B(true), luc: I(Date.now()) })).status, 403);
    ok('D (lớp khác) ghi "đang xem" = 403', (await ghi(D, `tranDau/${TR}/xem/${D}`, { ten: S(TEN[D]), anh: S(''), luc: I(Date.now()) })).status, 403);
    ok('A (người chơi) đọc danh sách người xem = 200', (await goi(`${FS_GOC}/tranDau/${TR}/xem${k}`, { headers: H2(tk[A]) })).status, 200);
    ok('D (lớp khác) đọc danh sách người xem = 403', (await goi(`${FS_GOC}/tranDau/${TR}/xem${k}`, { headers: H2(tk[D]) })).status, 403);
    // bình luận
    const bl = (who, chu, ten) => goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit${k}`, { method: 'POST', headers: H2(tk[who]), json: { writes: [{
      update: { name: `${DB}/documents/tranDau/${TR}/bl/ztestbl${who.slice(-2)}${Math.random().toString(36).slice(2, 7)}`, fields: { uid: S(who), ten: S(ten || TEN[who]), anh: S(''), gv: B(false), chu: S(chu) } },
      updateTransforms: [{ fieldPath: 'luc', setToServerValue: 'REQUEST_TIME' }], currentDocument: { exists: false } }] } });
    let r = await bl(C, 'Cố lên An ơi!');
    ok('C bình luận = 200', r.status, 200);
    ok('C bình luận có link = 403', (await bl(C, 'vào www.abc.com nè')).status, 403);
    ok('C bình luận dài 121 chữ = 403', (await bl(C, 'x'.repeat(121))).status, 403);
    ok('A (người chơi) bình luận = 403', (await bl(A, 'mình đây')).status, 403);
    ok('D (lớp khác) bình luận = 403', (await bl(D, 'hello')).status, 403);
    ok('C bình luận mạo tên bạn = 403', (await bl(C, 'hi', TEN[Bb])).status, 403);
    // tim
    ok('C thả tim bên a lần đầu (n = 1) = 200', (await ghi(C, `tranDau/${TR}/tim/a`, { n: I(1) })).status, 200);
    ok('C thả tim bên a (+1) = 200', (await ghi(C, `tranDau/${TR}/tim/a`, { n: I(2) })).status, 200);
    ok('C tự sửa tim bên a lên 99 = 403', (await ghi(C, `tranDau/${TR}/tim/a`, { n: I(99) })).status, 403);
    ok('C thả tim bên lạ "c" = 403', (await ghi(C, `tranDau/${TR}/tim/c`, { n: I(1) })).status, 403);
    ok('A (người chơi) tự thả tim cho mình = 403', (await ghi(A, `tranDau/${TR}/tim/a`, { n: I(3) })).status, 403);
    // đang đấu
    ok('A ghi "đang đấu" trận của mình = 200', (await ghi(A, `tdDangDau/${A}`, { id: S(TR), luc: I(Date.now()) })).status, 200);
    ok('C ghi "đang đấu" trận không có mình = 403', (await ghi(C, `tdDangDau/${C}`, { id: S(TR), luc: I(Date.now()) })).status, 403);
    ok('C ghi "đang đấu" thay A = 403', (await ghi(C, `tdDangDau/${A}`, { id: S(TR), luc: I(Date.now()) })).status, 403);
    ok('D đọc "đang đấu" của A = 200', (await goi(`${FS_GOC}/tdDangDau/${A}${k}`, { headers: H2(tk[D]) })).status, 200);
    ok('A xoá "đang đấu" của mình = 200', (await goi(`${FS_GOC}/tdDangDau/${A}${k}`, { method: 'DELETE', headers: H2(tk[A]) })).status, 200);
    const q = await goi(`${FS_GOC}/tranDau/${TR}/bl?pageSize=20`, { headers: await H() });
    ((q.json && q.json.documents) || []).forEach((d) => xoa.unshift(d.name.split('/documents/')[1]));
  } finally {
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử');
    for (const u of [A, Bb, C, D]) await xoaTkThu(u);
    console.log('  xoá 4 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  const TEN = 'tools/dang-luat-xem-tran.js';
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    if (a.includes('--goc')) { const g = await docRelease('cloud.firestore'); fs.writeFileSync(a[a.indexOf('--goc') + 1], g.source, 'utf8'); console.log('đã ghi', g.rulesetName); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-xem-tran.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--bien-dich')) { console.log('BIÊN DỊCH OK (chưa kích hoạt):', await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules')); return; }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-xem-tran.rules', fsCu.source);
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
