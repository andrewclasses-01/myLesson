// 📝 16/10/2026 — LUẬT: THẦY GIAO HỮU A Show Speed với học sinh (web v1.360.0): thầy mời em · em mời thầy · thẻ trận trong
// chat lớp (thầy gửi) + phòng riêng (nwChats tin `he`) · đáp án may/ke chỉ thầy đọc. Chép khuôn dang-luat-the-td.js: sửa TẠI CHỖ từ
// bản luật ĐANG CHẠY, CHỐT DỪNG (mỗi chỗ thay đúng 1 lần). Tự đứng một mình.
//
//   node tools/dang-luat-thay-giao-huu.js --xem | --bien-dich | --dang | --kiem | --lui <rulesetName> | --goc <tệp> | --thu-tran (trận thật đầu–cuối)
//
// Đi kèm: js/the-td.js, js/chat-ui.js, nw/js/chat.js, nw/js/thachdau.js, js/tn-khung.js, nw/js/tran.js + hàm myLesson/app tran-dau.js.
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


const DAU_HIEU = '(16/10/2026) THAY GIAO HUU';
// 1) tranDau: THẦY mời em · EM mời thầy (hai nhánh create riêng — nhánh học sinh cũ KHÔNG đổi, khoá `gv`/`cai` bị nó cấm)
const R1_CU = "      allow update: if request.auth != null && resource.data.trangThai == 'moi'\n";
const R1_MOI =
  "      // " + DAU_HIEU + " (web v1.360.0): tran CO THAY - giao huu, khong tinh giai. `gv` = uid thay; `cai` = cach dau thay chon\n" +
  "      // (che '' | one | list | free + act AWord boId/boTen - ham may chu tdDoi doc act, dung ban y nhu giai co bo tu).\n" +
  "      function tdKhungThay(d) {\n" +
  "        return d.keys().hasOnly(['a', 'b', 'nguoi', 'tenA', 'tenB', 'lop', 'giai', 'phut', 'lv', 'trangThai', 'taoLuc', 'het', 'gv', 'cai'])\n" +
  "          && d.b is string && d.b != request.auth.uid && d.nguoi == [request.auth.uid, d.b] && d.a == request.auth.uid\n" +
  "          && d.trangThai == 'moi' && d.giai == '' && d.lop is string && d.lop.size() > 0 && d.lop.size() <= 30\n" +
  "          && d.tenA is string && d.tenA.size() <= 60 && d.tenB is string && d.tenB.size() <= 60\n" +
  "          && d.taoLuc is int && d.taoLuc > request.time.toMillis() - 120000 && d.taoLuc < request.time.toMillis() + 120000\n" +
  "          && d.het == d.taoLuc + 60000;\n" +
  "      }\n" +
  "      // thay moi mot em (em do phai hoc lop `lop` cua tran)\n" +
  "      allow create: if laThay() && tdKhungThay(request.resource.data)\n" +
  "        && request.resource.data.gv == request.auth.uid\n" +
  "        && nwHoSo(request.resource.data.b).cacLop.hasAny([request.resource.data.lop])\n" +
  "        && request.resource.data.phut in [2, 3, 5] && request.resource.data.lv in ['easy', 'medium', 'hard']\n" +
  "        && (!('cai' in request.resource.data) || (request.resource.data.cai is map\n" +
  "            && request.resource.data.cai.keys().hasOnly(['che', 'boId', 'boTen']) && request.resource.data.cai.get('che', '') in ['', 'one', 'list', 'free']\n" +
  "            && request.resource.data.cai.get('boId', '') is string && request.resource.data.cai.get('boId', '').size() <= 80\n" +
  "            && request.resource.data.cai.get('boTen', '') is string && request.resource.data.cai.get('boTen', '').size() <= 80));\n" +
  "      // em moi thay (2 phut Easy, khong cach dau rieng)\n" +
  "      allow create: if nwVao() && request.auth.token.get('hs', false) == true && tdKhungThay(request.resource.data)\n" +
  "        && !('cai' in request.resource.data)\n" +
  "        && request.resource.data.gv == request.resource.data.b && nwHoSo(request.resource.data.b).vaiTro == 'gv'\n" +
  "        && request.resource.data.lop in nwLops() && request.resource.data.tenA == nwHoSo(nwToi()).ten\n" +
  "        && request.resource.data.phut == 2 && request.resource.data.lv == 'easy';\n" +
  R1_CU;
// 2) may/ke (kế hoạch bàn = ĐÁP ÁN): chỉ thầy đọc (màn thầy hiện sẵn đáp án). Trước đây không có luật = không ai đọc.
const R2_CU = "      match /nhip/{uid} {\n";
const R2_MOI = "      // " + DAU_HIEU + ": ke hoach ban (dap an) - CHI THAY doc (man thay hien san dap an). Ghi: chi ham may chu.\n" +
  "      match /may/{k} {\n        allow read: if laThay();\n      }\n" + R2_CU;
// 3) classChat: THẦY gửi thẻ trận (he td) — trận phải đúng lớp của phòng
const R3_CU = "            || (laThay() && request.resource.data.role == 'gv' && request.resource.data.he is map\n" +
  "                && request.resource.data.he.keys().hasOnly(['loai','ten']) && request.resource.data.he.loai == 'cam'\n";
const R3_MOI = "            // " + DAU_HIEU + ": THAY gui the tran giao huu (he td) - tran dung lop cua phong\n" +
  "            || (laThay() && request.resource.data.role == 'gv' && request.resource.data.he is map\n" +
  "                && request.resource.data.he.keys().hasOnly(['loai','id']) && request.resource.data.he.loai == 'td'\n" +
  "                && request.resource.data.he.id is string && request.resource.data.he.id.size() > 0 && request.resource.data.he.id.size() <= 40\n" +
  "                && exists(/databases/$(database)/documents/tranDau/$(request.resource.data.he.id))\n" +
  "                && get(/databases/$(database)/documents/tranDau/$(request.resource.data.he.id)).data.lop == lop)\n" + R3_CU;
// 4) nwChats tin: thẻ trận (he td) trong phòng RIÊNG / nhóm — trận do CHÍNH người gửi tạo, người kia là thành viên phòng
const R4_CU = "          && request.resource.data.keys().hasOnly(['uid', 'ten', 'anh', 'chu', 'hinh', 'luc', 'traLoi', 'sticker'])   // v0.6.0: trả lời · (30/09/2026, web v1.198.0) sticker; bo camXuc cu\n";
const R4_MOI = "          && request.resource.data.keys().hasOnly(['uid', 'ten', 'anh', 'chu', 'hinh', 'luc', 'traLoi', 'sticker', 'he'])   // v0.6.0: trả lời · (30/09/2026, web v1.198.0) sticker; bo camXuc cu · " + DAU_HIEU + ": he\n" +
  "          && (!('he' in request.resource.data) || (request.resource.data.he is map\n" +
  "              && request.resource.data.he.keys().hasOnly(['loai', 'id']) && request.resource.data.he.loai == 'td'\n" +
  "              && request.resource.data.he.id is string && request.resource.data.he.id.size() > 0 && request.resource.data.he.id.size() <= 40\n" +
  "              && exists(/databases/$(database)/documents/tranDau/$(request.resource.data.he.id))\n" +
  "              && get(/databases/$(database)/documents/tranDau/$(request.resource.data.he.id)).data.a == nwToi()\n" +
  "              && get(/databases/$(database)/documents/tranDau/$(request.resource.data.he.id)).data.b in get(/databases/$(database)/documents/nwChats/$(id)).data.thanhVien))\n";

function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ có phần thầy giao hữu — không đăng lại');
  let s = thayMot(cu, R1_CU, R1_MOI, 'tranDau: thầy mời / em mời thầy');
  s = thayMot(s, R2_CU, R2_MOI, 'tranDau/may: thầy đọc đáp án');
  s = thayMot(s, R3_CU, R3_MOI, 'classChat: thầy gửi thẻ trận');
  s = thayMot(s, R4_CU, R4_MOI, 'nwChats tin: thẻ trận');
  return s;
}

// ───────── KIỂM (REST thật, tài khoản ZTEST tạo rồi xoá ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) });
  const L = (a) => ({ arrayValue: { values: a } }), M = (o) => ({ mapValue: { fields: o } });
  const LOP = 'ZTESTGH1', LOP2 = 'ZTESTGH2', A = 'hs_9999981', Bb = 'hs_9999982', D = 'hs_9999984', T = 'ztest_gv_9999985';
  const MA = { [A]: 'ZTEST9999981', [Bb]: 'ZTEST9999982', [D]: 'ZTEST9999984' };
  const bay = Date.now(), T1 = 'ztest_gh1_' + bay, T2 = 'ztest_gh2_' + bay, PH = A < T ? A + '__' + T : T + '__' + A;
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb, 'nwUsers/' + D, 'nwUsers/' + T, 'nwChats/' + PH];
  console.log('luật đang chạy:', (await docRelease('cloud.firestore')).rulesetName);
  try {
    const hs = (uid, ten, lop) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(lop), cacLop: L([S(lop)]), anh: S(''), capNhat: I(bay) });
    await hs(A, 'ZTEST AN', LOP); await hs(Bb, 'ZTEST BINH', LOP); await hs(D, 'ZTEST DUNG', LOP2);
    await ghiAdmin('nwUsers/' + T, { uid: S(T), ten: S('ZTEST THAY'), vaiTro: S('gv'), lop: S('GV'), cacLop: L([]), anh: S(''), capNhat: I(bay) });
    await ghiAdmin('nwChats/' + PH, { loai: S('rieng'), ten: S(''), thanhVien: L([S(PH.split('__')[0]), S(PH.split('__')[1])]), taoBoi: S(A), luc: I(bay), capNhat: I(bay) });
    const tk = {};
    tk[A] = await taoTkThu(A, MA[A], { hs: true, ma: MA[A], lop: LOP, lops: LOP, msId: 0 });
    tk[Bb] = await taoTkThu(Bb, MA[Bb], { hs: true, ma: MA[Bb], lop: LOP, lops: LOP, msId: 0 });
    tk[D] = await taoTkThu(D, MA[D], { hs: true, ma: MA[D], lop: LOP2, lops: LOP2, msId: 0 });
    tk[T] = await taoTkThu(T, 'ZTESTGV9999985', { thay: true });
    const H2 = (t) => ({ Authorization: 'Bearer ' + t });
    const tao = (who, id, f) => goi(`${FS_GOC}/tranDau${k}&documentId=${id}`, { method: 'POST', headers: H2(tk[who]), json: { fields: f } });
    const tran = (a, b, tenA, tenB, lop, them) => { const t0 = Date.now(); return Object.assign({ a: S(a), b: S(b), nguoi: L([S(a), S(b)]), tenA: S(tenA), tenB: S(tenB),
      lop: S(lop), giai: S(''), phut: I(2), lv: S('easy'), trangThai: S('moi'), taoLuc: I(t0), het: I(t0 + 60000) }, them || {}); };
    // ── tạo trận
    ok('THẦY mời A (Free words, bộ từ) = 200', (await tao(T, T1, tran(T, A, 'Thầy Andrew', 'ZTEST AN', LOP, { phut: I(3), gv: S(T), cai: M({ che: S('free'), boId: S('ztest'), boTen: S('ZTEST / WORDS') }) }))).status, 200);
    xoa.unshift('tranDau/' + T1);
    ok('THẦY mời D nhưng ghi lớp của A (D không học lớp đó) = 403', (await tao(T, T1 + 'x', tran(T, D, 'Thầy Andrew', 'ZTEST DUNG', LOP, { gv: S(T) }))).status, 403);
    ok('THẦY mời với 7 phút = 403', (await tao(T, T1 + 'y', tran(T, A, 'Thầy Andrew', 'ZTEST AN', LOP, { phut: I(7), gv: S(T) }))).status, 403);
    ok('A mời THẦY (2 phút Easy) = 200', (await tao(A, T2, tran(A, T, 'ZTEST AN', 'Thầy Andrew', LOP, { gv: S(T) }))).status, 200);
    xoa.unshift('tranDau/' + T2);
    ok('A mời thầy 3 phút = 403', (await tao(A, T2 + 'x', tran(A, T, 'ZTEST AN', 'Thầy Andrew', LOP, { phut: I(3), gv: S(T) }))).status, 403);
    ok('A gắn gv giả cho bạn B = 403', (await tao(A, T2 + 'y', tran(A, Bb, 'ZTEST AN', 'ZTEST BINH', LOP, { gv: S(Bb) }))).status, 403);
    ok('A mời thầy kèm cách đấu riêng (cai) = 403', (await tao(A, T2 + 'z', tran(A, T, 'ZTEST AN', 'Thầy Andrew', LOP, { gv: S(T), cai: M({ che: S('one'), boId: S('x'), boTen: S('x') }) }))).status, 403);
    ok('A mời bạn B như cũ (nhánh học sinh không đổi) = 200', (await tao(A, T2 + 'w', tran(A, Bb, 'ZTEST AN', 'ZTEST BINH', LOP))).status, 200);
    xoa.unshift('tranDau/' + T2 + 'w');
    // ── đáp án may/ke
    await ghiAdmin('tranDau/' + T1 + '/may/ke', { ds: L([]) }); xoa.unshift('tranDau/' + T1 + '/may/ke');
    ok('THẦY đọc đáp án may/ke = 200', (await goi(`${FS_GOC}/tranDau/${T1}/may/ke${k}`, { headers: H2(tk[T]) })).status, 200);
    ok('A (trong trận) đọc đáp án may/ke = 403', (await goi(`${FS_GOC}/tranDau/${T1}/may/ke${k}`, { headers: H2(tk[A]) })).status, 403);
    // ── thẻ trong chat lớp
    const tinLop = (who, role, ten, ma, lop, he) => goi(`${FS_GOC}/classChat/${lop}/messages${k}`, { method: 'POST', headers: H2(tk[who]), json: { fields: {
      name: S(ten), code: S(ma), role: S(role), text: S('⚔ ZTEST giao huu'), createdAt: I(Date.now()), may: S('ztestmay1'), he: M(he) } } });
    let r = await tinLop(T, 'gv', 'Thầy Andrew', 'GV', LOP, { loai: S('td'), id: S(T1) });
    ok('THẦY gửi thẻ trận vào nhóm lớp đúng = 200', r.status, 200); if (r.json && r.json.name) xoa.push(r.json.name.split('/documents/')[1]);
    ok('THẦY gửi thẻ trận vào nhóm lớp KHÁC = 403', (await tinLop(T, 'gv', 'Thầy Andrew', 'GV', LOP2, { loai: S('td'), id: S(T1) })).status, 403);
    r = await tinLop(A, 'hs', 'ZTEST AN', MA[A], LOP, { loai: S('td'), id: S(T2) });
    ok('A gửi thẻ "em mời thầy" vào nhóm lớp = 200', r.status, 200); if (r.json && r.json.name) xoa.push(r.json.name.split('/documents/')[1]);
    // ── thẻ trong phòng riêng
    const tinRieng = (who, ten, he) => goi(`${FS_GOC}/nwChats/${PH}/tin${k}`, { method: 'POST', headers: H2(tk[who]), json: { fields: {
      uid: S(who), ten: S(ten), anh: S(''), chu: S('⚔ ZTEST giao huu'), hinh: S(''), luc: I(Date.now()), he: M(he) } } });
    r = await tinRieng(A, 'ZTEST AN', { loai: S('td'), id: S(T2) });
    ok('A gửi thẻ trận của A vào phòng riêng với thầy = 200', r.status, 200); if (r.json && r.json.name) xoa.push(r.json.name.split('/documents/')[1]);
    ok('A gửi thẻ trận của THẦY (không phải A tạo) = 403', (await tinRieng(A, 'ZTEST AN', { loai: S('td'), id: S(T1) })).status, 403);
    r = await tinRieng(T, 'ZTEST THAY', { loai: S('td'), id: S(T1) });
    ok('THẦY gửi thẻ trận vào phòng riêng với A = 200', r.status, 200); if (r.json && r.json.name) xoa.push(r.json.name.split('/documents/')[1]);
    ok('A gửi thẻ kiểu lạ (loai cam) vào phòng riêng = 403', (await tinRieng(A, 'ZTEST AN', { loai: S('cam'), id: S(T2) })).status, 403);
    // ── nhận
    ok('THẦY nhận lời mời của A = 200', (await goi(`${FS_GOC}/tranDau/${T2}${k}&updateMask.fieldPaths=trangThai`, { method: 'PATCH', headers: H2(tk[T]), json: { fields: { trangThai: S('nhan') } } })).status, 200);
    ok('B (cùng lớp) đọc trận thầy–A để thẻ hiện = 200', (await goi(`${FS_GOC}/tranDau/${T1}${k}`, { headers: H2(tk[Bb]) })).status, 200);
    ok('D (lớp khác) đọc trận thầy–A = 403', (await goi(`${FS_GOC}/tranDau/${T1}${k}`, { headers: H2(tk[D]) })).status, 403);
    await new Promise((res) => setTimeout(res, 7000));   // hàm máy chủ chạy xong (thông báo, xếp chữ) rồi mới dọn
    for (const u of [A, T, Bb]) {
      const q = await goi(`${FS_GOC}/nwUsers/${u}/thongBao?pageSize=20`, { headers: await H() });
      ((q.json && q.json.documents) || []).forEach((d) => xoa.push(d.name.split('/documents/')[1]));
    }
    for (const id of [T1, T2, T2 + 'w']) await goi(`${FS_GOC}/tranDau/${id}?updateMask.fieldPaths=trangThai`, { method: 'PATCH', headers: await H(), json: { fields: { trangThai: S('het') } } });
    xoa.push('tdLichSu/' + A, 'tdLichSu/' + T, 'tranDau/' + T2 + '/may/ke');
  } finally {
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử');
    for (const u of [A, Bb, D, T]) await xoaTkThu(u);
    console.log('  xoá 4 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

// ───────── THỬ TRẬN THẬT ĐẦU–CUỐI (--thu-tran): thầy mời em bằng bộ từ AWord thật ⇒ em nhận ⇒ máy chủ xếp bàn ⇒ thầy đọc đáp án,
// lấy một từ ⇒ máy chủ chấm ⇒ em rời trận ⇒ chốt: thầy thắng, lịch sử ghi cho cả hai. Tài khoản/tài liệu ZTEST xoá hết khi xong.
async function thuTran() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, dk, them) => { console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → ' + (them || ''))); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b });
  const L = (a) => ({ arrayValue: { values: a } }), M = (o) => ({ mapValue: { fields: o } });
  const giaTri = (v) => v == null ? v : 'stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'booleanValue' in v ? v.booleanValue
    : 'arrayValue' in v ? (v.arrayValue.values || []).map(giaTri) : 'mapValue' in v ? doiMap(v.mapValue.fields || {}) : 'doubleValue' in v ? v.doubleValue : 'nullValue' in v ? null : v;
  const doiMap = (o) => { const r = {}; Object.keys(o).forEach((x) => { r[x] = giaTri(o[x]); }); return r; };
  const LOP = 'ZTESTGH9', A = 'hs_9999991', T = 'ztest_gv_9999995', MA_A = 'ZTEST9999991';
  const bay = Date.now(), TR = 'ztest_ghtran_' + bay;
  const xoa = ['nwUsers/' + A, 'nwUsers/' + T, 'tdLichSu/' + A, 'tdLichSu/' + T];
  const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    // một act WORDS thật trong thư viện AWord của thầy
    const q = await goi(`https://firestore.googleapis.com/v1/${DB}/documents/users/tpD5VivTD6g4NVceix4Zf3Ibefp1:runQuery`, { method: 'POST', headers: await H(),
      json: { structuredQuery: { from: [{ collectionId: 'items' }], where: { fieldFilter: { field: { fieldPath: 'kind' }, op: 'EQUAL', value: S('act') } }, limit: 300 } } });
    const act = (q.json || []).map((x) => x.document).filter(Boolean).map((d) => ({ id: d.name.split('/').pop(), v: doiMap(d.fields || {}) }))
      .find((a) => a.v.content && Array.isArray(a.v.content.items) && a.v.content.items.length >= 4 && a.v.content.items.filter((x) => x && x.word && /^[A-Za-z]{3,7}$/.test(String(x.word).trim())).length >= 4);
    if (!act) console.log('    (runQuery', q.status, '·', ((q.json || []).filter((x) => x.document).length), 'act)');
    ok('tìm được act WORDS thật để thử', !!act); if (!act) return;
    console.log('    act:', act.v.title, '·', act.v.content.items.length, 'từ');
    await ghiAdmin('nwUsers/' + A, { uid: S(A), ten: S('ZTEST AN'), vaiTro: S('hs'), lop: S(LOP), cacLop: L([S(LOP)]), anh: S(''), capNhat: I(bay) });
    await ghiAdmin('nwUsers/' + T, { uid: S(T), ten: S('ZTEST THAY'), vaiTro: S('gv'), lop: S('GV'), cacLop: L([]), anh: S(''), capNhat: I(bay) });
    const tkA = await taoTkThu(A, MA_A, { hs: true, ma: MA_A, lop: LOP, lops: LOP, msId: 0 }), tkT = await taoTkThu(T, 'ZTESTGV9999995', { thay: true });
    const H2 = (t) => ({ Authorization: 'Bearer ' + t });
    const doc = async (p, tk) => { const r = await goi(`${FS_GOC}/${p}${k}`, { headers: tk ? H2(tk) : await H() }); return { st: r.status, d: r.json && r.json.fields ? doiMap(r.json.fields) : null }; };
    const t0 = Date.now();
    let r = await goi(`${FS_GOC}/tranDau${k}&documentId=${TR}`, { method: 'POST', headers: H2(tkT), json: { fields: { a: S(T), b: S(A), nguoi: L([S(T), S(A)]), tenA: S('Thầy Andrew'),
      tenB: S('ZTEST AN'), lop: S(LOP), giai: S(''), phut: I(2), lv: S('easy'), trangThai: S('moi'), taoLuc: I(t0), het: I(t0 + 60000), gv: S(T),
      cai: M({ che: S('list'), boId: S(act.id), boTen: S(String(act.v.title || '').slice(0, 80)) }) } } });
    ok('thầy tạo lời mời (Word list, act thật) = 200', r.status === 200, r.status);
    xoa.unshift('tranDau/' + TR, 'tranDau/' + TR + '/may/ke');
    await ngu(4000);
    const tb = await goi(`${FS_GOC}/nwUsers/${A}/thongBao?pageSize=10`, { headers: await H() });
    const dsTb = ((tb.json && tb.json.documents) || []); dsTb.forEach((d) => xoa.push(d.name.split('/documents/')[1]));
    ok('em nhận THÔNG BÁO "mời em giao hữu"', dsTb.some((d) => /mời em giao hữu/.test(((d.fields || {}).chu || {}).stringValue || '')), dsTb.length + ' thông báo');
    r = await goi(`${FS_GOC}/tranDau/${TR}${k}&updateMask.fieldPaths=trangThai`, { method: 'PATCH', headers: H2(tkA), json: { fields: { trangThai: S('nhan') } } });
    ok('em bấm Nhận = 200', r.status === 200, r.status);
    let t = null;
    for (let i = 0; i < 20; i++) { await ngu(1000); t = (await doc('tranDau/' + TR)).d; if (t && t.trangThai === 'choi') break; }
    ok('máy chủ xếp bàn ⇒ trangThai choi', t && t.trangThai === 'choi', t && t.trangThai);
    ok('bàn theo BỘ TỪ (che list, có gợi ý, soVan ≥ 1)', t && t.che === 'list' && Array.isArray(t.goi) && t.goi.length > 0 && t.soVan >= 1, JSON.stringify(t && { che: t.che, soVan: t.soVan }));
    ok('tài liệu trận KHÔNG chứa đáp án (chỉ băm)', t && !JSON.stringify(t.goi || []).match(/"w"/) && Array.isArray(t.bam), '');
    const keT = await doc('tranDau/' + TR + '/may/ke', tkT), keA = await doc('tranDau/' + TR + '/may/ke', tkA);
    ok('THẦY đọc đáp án may/ke = 200', keT.st === 200, keT.st);
    ok('EM đọc đáp án may/ke = 403', keA.st === 403, keA.st);
    const w = keT.d && keT.d.ds && keT.d.ds[0] && keT.d.ds[0].w[0];
    ok('đáp án bàn 1 có từ', !!w, JSON.stringify(keT.d).slice(0, 120));
    while (Date.now() < t.batDau + 300) await ngu(300);
    const tenTu = String(w || '').toLowerCase() + '_0';
    r = await goi(`${FS_GOC}/tranDau/${TR}/tu${k}&documentId=${encodeURIComponent(tenTu)}`, { method: 'POST', headers: H2(tkT), json: { fields: { uid: S(T) } } });
    ok('thầy LẤY từ "' + tenTu + '" (bấm = gửi như gõ) = 200', r.status === 200, r.status);
    xoa.unshift('tranDau/' + TR + '/tu/' + tenTu);
    let x = null;
    for (let i = 0; i < 15; i++) { await ngu(1000); x = (await doc('tranDau/' + TR + '/tu/' + tenTu)).d; if (x && x.ok != null) break; }
    ok('máy chủ chấm từ của thầy ok = true', x && x.ok === true, JSON.stringify(x));
    r = await goi(`${FS_GOC}/tranDau/${TR}/tu${k}&documentId=${encodeURIComponent(tenTu)}`, { method: 'POST', headers: H2(tkA), json: { fields: { uid: S(A) } } });
    ok('em gửi lại đúng từ đó ⇒ bị từ chối (Taken)', r.status === 409 || r.status === 403, r.status);
    t = (await doc('tranDau/' + TR)).d;
    ok('điểm thầy đã cộng (diem.a > 0)', t && t.diem && t.diem.a > 0, JSON.stringify(t && t.diem));
    r = await goi(`${FS_GOC}/tranDau/${TR}/nhip/${A}${k}&updateMask.fieldPaths=roi&updateMask.fieldPaths=luc`, { method: 'PATCH', headers: H2(tkA), json: { fields: { roi: B(true), luc: I(Date.now()) } } });
    ok('em rời trận (nhịp roi) = 200', r.status === 200, r.status);
    xoa.unshift('tranDau/' + TR + '/nhip/' + A);
    for (let i = 0; i < 20; i++) { await ngu(1000); t = (await doc('tranDau/' + TR)).d; if (t && t.trangThai === 'xong') break; }
    ok('máy chủ CHỐT: xong · thầy thắng (em rời)', t && t.trangThai === 'xong' && t.kq && t.kq.a === 'thang', JSON.stringify(t && { tt: t.trangThai, kq: t.kq, ly: t.ly }));
    const lsT = (await doc('tdLichSu/' + T)).d, lsA = (await doc('tdLichSu/' + A)).d;
    ok('lịch sử trận ghi cho THẦY và EM', !!(lsT && lsT.ds && lsT.ds[0] && lsT.ds[0].id === TR && lsA && lsA.ds && lsA.ds[0].id === TR), '');
  } finally {
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử');
    for (const u of [A, T]) await xoaTkThu(u);
    console.log('  xoá 2 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có bước trượt.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  const TEN = 'tools/dang-luat-thay-giao-huu.js';
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    if (a.includes('--thu-tran')) { await thuTran(); return; }
    if (a.includes('--goc')) { const g = await docRelease('cloud.firestore'); fs.writeFileSync(a[a.indexOf('--goc') + 1], g.source, 'utf8'); console.log('đã ghi', g.rulesetName); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-thay-giao-huu.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--bien-dich')) { console.log('BIÊN DỊCH OK (chưa kích hoạt):', await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules')); return; }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-thay-giao-huu.rules', fsCu.source);
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
