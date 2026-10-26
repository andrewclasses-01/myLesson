// 📝 25/10/2026 — LUẬT: XẾP HẠNG THEO MÙA A Show Speed (Đợt 1). Chép khuôn dang-luat-gioi-han-choi.js: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, CHỐT DỪNG.
//
//   node tools/dang-luat-xep-hang.js --xem | --bien-dich | --dang | --kiem | --lui <rulesetName>
//
// tranDau: trận có `xh` mọi HS + thầy đọc (đấu khác lớp, người xem toàn trường) · em bấm Sẵn sàng ô ss của mình · tim cộng 1–30/lần ·
//   chatGui (tin chờ, hàm xhChat lọc đáp án) ⇒ chat (chỉ máy chủ ghi). Kho mới: xhHang/{uid} (hàng chờ) · caiDat/xepHang · xhMua/{mua} (+ em, bang).
// Đi kèm: app may-chu/functions/xep-hang.js + tran-dau.js · web nw/xephang.html · nw/xh-tran.html · js/td-ql.js
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

const DAU_HIEU = '(25/10/2026) XEP HANG MUA';
const ND = (s) => s;   // giữ nguyên chuỗi
// 1) đọc trận: trận xếp hạng ⇒ mọi người vào mạng đọc được (đấu khác lớp + người xem toàn trường)
const R_CU = "      allow read: if laThay() || (request.auth != null && (resource.data.a == request.auth.uid || resource.data.b == request.auth.uid)) || hsLop(resource.data.lop);\n";
const R_MOI = "      // " + DAU_HIEU + ": tran xep hang (co `xh`) - moi hoc sinh + thay doc (dau khac lop, nguoi xem toan truong, danh sach Dang dau)\n" +
  "      allow read: if laThay() || (request.auth != null && (resource.data.a == request.auth.uid || resource.data.b == request.auth.uid)) || hsLop(resource.data.lop)\n" +
  "        || (resource.data.xh is string && nwVao());\n";
// 2) hai em bấm Sẵn sàng (chỉ ô ss của mình, trong hạn)
const S_CU = "        && (request.resource.data.trangThai != 'nhan' || resource.data.get('gv', null) != null || (!tdDem() && !tdHet(request.auth.uid)));\n";
const S_MOI = S_CU +
  "      // " + DAU_HIEU + ": tran xep hang do MAY CHU tao (trangThai 'cho') - moi em chi bam SAN SANG o cua minh, truoc hetSS\n" +
  "      allow update: if request.auth != null && resource.data.xh is string && resource.data.trangThai == 'cho'\n" +
  "        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['ss'])\n" +
  "        && request.time.toMillis() <= resource.data.hetSS\n" +
  "        && ((request.auth.uid == resource.data.a && request.resource.data.ss == {'a': true, 'b': resource.data.ss.b})\n" +
  "            || (request.auth.uid == resource.data.b && request.resource.data.ss == {'a': resource.data.ss.a, 'b': true}));\n";
const F_CU = "      function tdTran() { return get(/databases/$(database)/documents/tranDau/$(id)).data; }\n";
const F_MOI = F_CU + "      function tdXh() { return tdTran().get('xh', '') != ''; }\n";
// 3) đọc từ của trận
const U_CU = "        allow read: if laThay() || (request.auth != null && request.auth.uid in tdTran().nguoi) || hsLop(tdTran().lop);\n";
const U_MOI = "        allow read: if laThay() || (request.auth != null && request.auth.uid in tdTran().nguoi) || hsLop(tdTran().lop) || (tdXh() && nwVao());\n";
// 4) người xem
const X1_CU = "      function tdDuocXem() { return laThay() || hsLop(tdTran().lop) || (request.auth != null && request.auth.uid in tdTran().nguoi); }\n";
const X1_MOI = "      function tdDuocXem() { return laThay() || hsLop(tdTran().lop) || (request.auth != null && request.auth.uid in tdTran().nguoi) || (tdXh() && nwVao()); }\n";
const X2_CU = "      function tdNguoiXem() { return request.auth != null && !(request.auth.uid in tdTran().nguoi) && (laThay() || hsLop(tdTran().lop)); }\n";
const X2_MOI = "      function tdNguoiXem() { return request.auth != null && !(request.auth.uid in tdTran().nguoi) && (laThay() || hsLop(tdTran().lop) || (tdXh() && nwVao())); }\n";
// 5) tim: trận xếp hạng cho cộng 1–30 mỗi lần ghi (máy gộp nhiều lần bấm)
const T1_CU = "        allow create: if tdNguoiXem() && k in ['a', 'b'] && request.resource.data.keys().hasOnly(['n']) && request.resource.data.n == 1;\n";
const T1_MOI = "        allow create: if tdNguoiXem() && k in ['a', 'b'] && request.resource.data.keys().hasOnly(['n'])\n" +
  "          && (request.resource.data.n == 1 || (tdXh() && request.resource.data.n is int && request.resource.data.n >= 1 && request.resource.data.n <= 30));\n";
const T2_CU = "          && request.resource.data.n == resource.data.n + 1;\n";
const T2_MOI = "          && (request.resource.data.n == resource.data.n + 1\n" +
  "              || (tdXh() && request.resource.data.n is int && request.resource.data.n > resource.data.n && request.resource.data.n <= resource.data.n + 30));\n";
// 6) chat trận xếp hạng: tin CHỜ (máy chủ lọc đáp án) ⇒ chat
const C_CU = "      match /nhip/{uid} {\n        allow read: if laThay() || (request.auth != null && request.auth.uid in tdTran().nguoi);\n";
const C_MOI =
  "      // " + DAU_HIEU + ": CHAT TRAN (nguoi choi + nguoi xem). Em ghi tin CHO vao chatGui (chi minh doc lai) => ham xhChat loc\n" +
  "      // tu dap an cua ban dang choi + link + 2 giay/tin => chep sang chat (chi may chu ghi). Thay luu lai.\n" +
  "      match /chatGui/{cid} {\n" +
  "        allow read: if request.auth != null && resource.data.uid == request.auth.uid;\n" +
  "        allow create: if tdXh() && (nwVao()) && request.resource.data.keys().hasOnly(['uid', 'chu', 'luc'])\n" +
  "          && request.resource.data.uid == request.auth.uid\n" +
  "          && request.resource.data.chu is string && request.resource.data.chu.size() > 0 && request.resource.data.chu.size() <= 120\n" +
  "          && request.resource.data.luc == request.time;\n" +
  "      }\n" +
  "      match /chat/{cid} {\n" +
  "        allow read: if tdXh() && tdDuocXem();\n" +
  "      }\n" + C_CU;
// 7) kho riêng: hàng chờ · mùa · điểm hạng · bảng top 20
const K_CU = "    match /tdHan/{uid} {\n      allow read: if nwVao();\n    }\n";
const K_MOI = K_CU +
  "    // " + DAU_HIEU + " (Dot 1): HANG CHO - em tao phieu cua minh + nhip 5 giay (gio may chu); may chu ghi m / tran / loi.\n" +
  "    match /xhHang/{uid} {\n" +
  "      function xhDem() {\n" +
  "        let c = exists(/databases/$(database)/documents/caiDat/choiGame) ? get(/databases/$(database)/documents/caiDat/choiGame).data : {};\n" +
  "        let g = (request.time.hours() + 7) % 24;\n" +
  "        let tu = c.get('nghiTu', 23);\n" +
  "        let den = c.get('nghiDen', 6);\n" +
  "        return c.get('bat', true) == true && (tu > den ? (g >= tu || g < den) : (g >= tu && g < den));\n" +
  "      }\n" +
  "      allow read: if request.auth != null && uid == request.auth.uid;\n" +
  "      allow create: if nwVao() && request.auth.token.get('hs', false) == true && uid == request.auth.uid\n" +
  "        && request.resource.data.keys().hasOnly(['mua', 'vao', 'nhip'])\n" +
  "        && request.resource.data.mua is string && request.resource.data.mua.size() > 0 && request.resource.data.mua.size() <= 40\n" +
  "        && request.resource.data.vao == request.time && request.resource.data.nhip == request.time && !xhDem();\n" +
  "      allow update: if request.auth != null && uid == request.auth.uid\n" +
  "        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['nhip']) && request.resource.data.nhip == request.time;\n" +
  "      allow delete: if request.auth != null && uid == request.auth.uid;\n" +
  "    }\n" +
  "    // " + DAU_HIEU + ": mua hien tai (thay chon tren dashboard)\n" +
  "    match /caiDat/xepHang {\n" +
  "      allow read: if nwVao();\n" +
  "      allow write: if laThay() && request.resource.data.keys().hasOnly(['mua', 'capNhat'])\n" +
  "        && request.resource.data.mua is string && request.resource.data.mua.size() <= 40;\n" +
  "    }\n" +
  "    // " + DAU_HIEU + ": MUA GIAI. Chua bat dau: thay sua tu do. DA BAT DAU: KHOA thong so (thay chot 25/10) - chi tam dung / mo lai /\n" +
  "    // chot + phat thuong (chot chi khi da het mua). em/{uid} + bang/top: CHI MAY CHU ghi; em chi doc diem cua minh; bang top 20 ai cung doc.\n" +
  "    match /xhMua/{mua} {\n" +
  "      function xhKhung(d) {\n" +
  "        return d.keys().hasOnly(['ten', 'tu', 'den', 'gioVang', 'sao', 'phut', 'tt', 'taoLuc', 'capNhat', 'chotLuc', 'daThuong', 'thuong', 'boi', 'suat'])\n" +
  "          && d.ten is string && d.ten.size() > 0 && d.ten.size() <= 60\n" +
  "          && d.tu is int && d.den is int && d.den > d.tu\n" +
  "          && d.phut in [2, 3] && d.tt in ['nhap', 'mo', 'dung', 'chot']\n" +
  "          && d.gioVang is map && d.sao is map && (!('suat' in d) || (d.suat is list && d.suat.size() <= 4));\n" +
  "      }\n" +
  "      allow read: if nwVao();\n" +
  "      allow create: if laThay() && xhKhung(request.resource.data) && request.resource.data.tt != 'chot';\n" +
  "      allow update: if laThay() && xhKhung(request.resource.data)\n" +
  "        && (resource.data.tu > request.time.toMillis()\n" +
  "            || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['tt', 'capNhat', 'chotLuc', 'daThuong', 'thuong']))\n" +
  "        && (request.resource.data.tt != 'chot' || request.time.toMillis() >= resource.data.den);\n" +
  "      allow delete: if laThay() && resource.data.tu > request.time.toMillis();\n" +
  "      match /em/{uid} {\n" +
  "        allow read: if laThay() || (request.auth != null && request.auth.uid == uid);\n" +
  "      }\n" +
  "      match /bang/{d} {\n" +
  "        allow read: if nwVao();\n" +
  "      }\n" +
  "    }\n";

// 26/10 luật SUẤT: luật đang chạy đã có khối xếp hạng ⇒ chỉ vá khung xhMua cho phép trường `suat` (list ≤ 4)
const SUAT_CU = ["'chotLuc', 'daThuong', 'thuong', 'boi'])\n", "&& d.gioVang is map && d.sao is map;\n"];
const SUAT_MOI = ["'chotLuc', 'daThuong', 'thuong', 'boi', 'suat'])\n", "&& d.gioVang is map && d.sao is map && (!('suat' in d) || (d.suat is list && d.suat.size() <= 4));\n"];
function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) {
    if (cu.includes(SUAT_MOI[0])) throw new Error('CHOT DUNG: luật ĐÃ có xếp hạng mùa + trường suat — không đăng lại');
    return thayMot(thayMot(cu, SUAT_CU[0], SUAT_MOI[0], 'xhMua: suat (khoá)'), SUAT_CU[1], SUAT_MOI[1], 'xhMua: suat (kiểu)');
  }
  let s = thayMot(cu, R_CU, R_MOI, 'tranDau: đọc');
  s = thayMot(s, S_CU, S_MOI, 'tranDau: sẵn sàng');
  s = thayMot(s, F_CU, F_MOI, 'tranDau: tdXh');
  s = thayMot(s, U_CU, U_MOI, 'tu: đọc');
  s = thayMot(s, X1_CU, X1_MOI, 'tdDuocXem');
  s = thayMot(s, X2_CU, X2_MOI, 'tdNguoiXem');
  s = thayMot(s, T1_CU, T1_MOI, 'tim: tạo');
  s = thayMot(s, T2_CU, T2_MOI, 'tim: cộng');
  s = thayMot(s, C_CU, C_MOI, 'chat');
  return thayMot(s, K_CU, K_MOI, 'xhHang + caiDat/xepHang + xhMua');
}

// ───────── KIỂM (REST thật, tài khoản ZTEST tạo rồi xoá ngay) ─────────
// ⚠ Nếu đang giờ nghỉ đêm: dời TẠM khung nghỉ (vài giây) để thử tạo phiếu hàng chờ, rồi TRẢ LẠI đúng giá trị cũ.
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b });
  const L = (a) => ({ arrayValue: { values: a } }), M = (o) => ({ mapValue: { fields: o } });
  const LOP = 'ZTESTXH', LOP2 = 'ZTESTXH2', A = 'hs_9999971', Bb = 'hs_9999972', C = 'hs_9999973', T = 'ztest_thay_xh';
  const MUA = 'ztest_mua_' + Date.now(), bay = Date.now(), GIO = new Date(bay + 7 * 3600e3).getUTCHours();
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb, 'nwUsers/' + C, 'xhHang/' + A, 'xhHang/' + C, 'xhMua/' + MUA, 'xhMua/' + MUA + '/em/' + A, 'xhMua/' + MUA + '/bang/top'];
  console.log('luật đang chạy:', (await docRelease('cloud.firestore')).rulesetName, '· giờ VN', GIO);
  const caiCu = await goi(`${FS_GOC}/caiDat/choiGame`, { headers: await H() });
  const caiGoc = caiCu.status === 200 ? caiCu.json.fields : null;
  let tk = {}, doiCai = false;
  try {
    const hs = (uid, ten, lop) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(lop), cacLop: L([S(lop)]), anh: S(''), capNhat: I(bay) });
    await hs(A, 'ZTEST XH AN', LOP); await hs(Bb, 'ZTEST XH BINH', LOP); await hs(C, 'ZTEST XH CHI', LOP2);
    tk[A] = await taoTkThu(A, 'ZTEST9999971', { hs: true, ma: 'ZTEST9999971', lop: LOP, lops: LOP, msId: 0 });
    tk[Bb] = await taoTkThu(Bb, 'ZTEST9999972', { hs: true, ma: 'ZTEST9999972', lop: LOP, lops: LOP, msId: 0 });
    tk[C] = await taoTkThu(C, 'ZTEST9999973', { hs: true, ma: 'ZTEST9999973', lop: LOP2, lops: LOP2, msId: 0 });
    tk[T] = await taoTkThu(T, 'ZTESTTHAYXH', { thay: true });
    const H2 = (t) => ({ Authorization: 'Bearer ' + t });
    const doc = (tkn, p) => goi(`${FS_GOC}/${p}${k}`, { headers: H2(tkn) }).then((r) => r.status);
    const tao = (tkn, col, id, fields) => goi(`${FS_GOC}/${col}${k}&documentId=${id}`, { method: 'POST', headers: H2(tkn), json: { fields } }).then((r) => r.status);
    const sua = (tkn, p, fields, mask) => goi(`${FS_GOC}/${p}${k}` + (mask || Object.keys(fields)).map((x) => '&updateMask.fieldPaths=' + x).join(''), { method: 'PATCH', headers: H2(tkn), json: { fields } }).then((r) => r.status);
    const ghiGioMay = (tkn, p, fields, ts) => goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit${k}`, { method: 'POST', headers: H2(tkn),
      json: { writes: [{ update: { name: DB + '/documents/' + p, fields }, updateMask: { fieldPaths: Object.keys(fields) }, updateTransforms: ts.map((f) => ({ fieldPath: f, setToServerValue: 'REQUEST_TIME' })) }] } }).then((r) => r.status);
    const taoGioMay = (tkn, p, fields, ts) => goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit${k}`, { method: 'POST', headers: H2(tkn),
      json: { writes: [{ update: { name: DB + '/documents/' + p, fields }, currentDocument: { exists: false }, updateTransforms: ts.map((f) => ({ fieldPath: f, setToServerValue: 'REQUEST_TIME' })) }] } }).then((r) => r.status);

    // ── mùa ──
    const muaF = (o) => Object.assign({ ten: S('ZTEST mùa'), tu: I(bay - 3600e3), den: I(bay + 3600e3), gioVang: M({ tu: I(1170), den: I(1260), nhan: { doubleValue: 1.5 } }),
      sao: M({ dong: I(1) }), phut: I(2), tt: S('mo'), taoLuc: I(bay) }, o || {});
    ok('Học sinh tạo mùa = 403', await tao(tk[A], 'xhMua', MUA + 'x', muaF()), 403);
    ok('Thầy tạo mùa (đã bắt đầu) = 200', await tao(tk[T], 'xhMua', MUA, muaF()), 200);
    ok('Học sinh đọc mùa = 200', await doc(tk[C], 'xhMua/' + MUA), 200);
    ok('Mùa ĐÃ CHẠY: thầy đổi tên = 403', await sua(tk[T], 'xhMua/' + MUA, muaF({ ten: S('Đổi tên') })), 403);
    ok('Mùa ĐÃ CHẠY: thầy tạm dừng (tt=dung) = 200', await sua(tk[T], 'xhMua/' + MUA, { tt: S('dung') }), 200);
    ok('Mùa CHƯA HẾT: thầy chốt = 403', await sua(tk[T], 'xhMua/' + MUA, { tt: S('chot') }), 403);
    ok('Thầy đặt mùa hiện tại caiDat/xepHang… (ghi thử key lạ) = 403', await sua(tk[T], 'caiDat/xepHang', { mua: S(MUA), la: S('x') }, ['la']), 403);
    ok('Học sinh đọc caiDat/xepHang = 200 hoặc 404', [200, 404].includes(await doc(tk[A], 'caiDat/xepHang')) ? 1 : 0, 1);
    await ghiAdmin('xhMua/' + MUA + '/em/' + A, { diem: I(500), mmr: I(1000) });
    await ghiAdmin('xhMua/' + MUA + '/bang/top', { ds: L([]) });
    ok('Em đọc điểm hạng của MÌNH = 200', await doc(tk[A], 'xhMua/' + MUA + '/em/' + A), 200);
    ok('Em đọc điểm hạng của BẠN = 403', await doc(tk[C], 'xhMua/' + MUA + '/em/' + A), 403);
    ok('Em đọc bảng top 20 = 200', await doc(tk[C], 'xhMua/' + MUA + '/bang/top'), 200);
    ok('Em tự sửa điểm hạng = 403', await sua(tk[A], 'xhMua/' + MUA + '/em/' + A, { diem: I(9999) }), 403);

    // ── hàng chờ ── (đang nghỉ đêm thì dời tạm khung nghỉ)
    if (GIO >= 23 || GIO < 6) {
      doiCai = true;
      await ghiAdmin('caiDat/choiGame', { bat: B(true), nghiTu: I((GIO + 2) % 24), nghiDen: I((GIO + 3) % 24), tranNgay: I(20), giaiNgay: I(10), capNgay: I(3), capNhat: I(Date.now()) });
    }
    ok('Em vào hàng chờ (phiếu của mình) = 200', await taoGioMay(tk[A], 'xhHang/' + A, { mua: S(MUA) }, ['vao', 'nhip']), 200);
    ok('Em tạo phiếu hàng chờ cho BẠN = 403', await taoGioMay(tk[A], 'xhHang/' + Bb, { mua: S(MUA) }, ['vao', 'nhip']), 403);
    ok('Phiếu có khoá lạ (tran) = 403', await taoGioMay(tk[C], 'xhHang/' + C, { mua: S(MUA), tran: S('x') }, ['vao', 'nhip']), 403);
    ok('Em ghi nhịp = 200', await ghiGioMay(tk[A], 'xhHang/' + A, {}, ['nhip']), 200);
    ok('Em tự ghi tran vào phiếu = 403', await sua(tk[A], 'xhHang/' + A, { tran: S('abc') }), 403);
    ok('Bạn đọc phiếu hàng chờ của em = 403', await doc(tk[C], 'xhHang/' + A), 403);
    if (doiCai) {
      await ghiAdmin('caiDat/choiGame', { bat: B(true), nghiTu: I(GIO), nghiDen: I((GIO + 1) % 24), tranNgay: I(20), giaiNgay: I(10), capNgay: I(3), capNhat: I(Date.now()) });
      ok('Giờ nghỉ đêm ⇒ vào hàng chờ = 403', await taoGioMay(tk[C], 'xhHang/' + C, { mua: S(MUA) }, ['vao', 'nhip']), 403);
    }

    // ── trận xếp hạng (máy chủ tạo — ở đây khoá quản trị tạo) ──
    const TID = 'ztest_xh_' + bay;
    xoa.push('tranDau/' + TID, 'tranDau/' + TID + '/tim/a', 'tranDau/' + TID + '/xem/' + C);
    await ghiAdmin('tranDau/' + TID, { a: S(A), b: S(Bb), nguoi: L([S(A), S(Bb)]), tenA: S('ZTEST XH AN'), tenB: S('ZTEST XH BINH'), xh: S(MUA), giai: S(''), lop: S(''),
      phut: I(2), lv: S('easy'), trangThai: S('cho'), ss: M({ a: B(false), b: B(false) }), hetSS: I(Date.now() + 600000), taoLuc: I(bay), het: I(bay + 600000) });
    ok('Bạn KHÁC LỚP đọc trận xếp hạng = 200', await doc(tk[C], 'tranDau/' + TID), 200);
    const q = await goi(`${FS_GOC}:runQuery${k}`, { method: 'POST', headers: H2(tk[C]), json: { structuredQuery: { from: [{ collectionId: 'tranDau' }],
      where: { compositeFilter: { op: 'AND', filters: [{ fieldFilter: { field: { fieldPath: 'xh' }, op: 'EQUAL', value: S(MUA) } }, { fieldFilter: { field: { fieldPath: 'trangThai' }, op: 'EQUAL', value: S('cho') } }] } }, limit: 20 } } });
    ok('Bạn khác lớp HỎI DANH SÁCH trận xếp hạng (Đang đấu) = 200', q.status, 200);
    ok('A bấm Sẵn sàng ô của mình = 200', await sua(tk[A], 'tranDau/' + TID, { ss: M({ a: B(true), b: B(false) }) }), 200);
    ok('A bấm thay ô của B = 403', await sua(tk[A], 'tranDau/' + TID, { ss: M({ a: B(true), b: B(true) }) }), 403);
    ok('Người xem bấm Sẵn sàng = 403', await sua(tk[C], 'tranDau/' + TID, { ss: M({ a: B(true), b: B(true) }) }), 403);
    ok('A tự đổi trạng thái trận = 403', await sua(tk[A], 'tranDau/' + TID, { trangThai: S('nhan') }), 403);
    ok('Người xem khác lớp ghi "đang xem" = 200', await sua(tk[C], 'tranDau/' + TID + '/xem/' + C, { ten: S('ZTEST XH CHI'), anh: S(''), luc: I(Date.now()) }), 200);
    ok('Người xem thả 5 tim một lần = 200', await sua(tk[C], 'tranDau/' + TID + '/tim/a', { n: I(5) }), 200);
    ok('Người xem cộng tiếp 30 tim = 200', await sua(tk[C], 'tranDau/' + TID + '/tim/a', { n: I(35) }), 200);
    ok('Người xem cộng 31 tim một lần = 403', await sua(tk[C], 'tranDau/' + TID + '/tim/a', { n: I(66) }), 403);
    ok('Người CHƠI tự thả tim = 403', await sua(tk[A], 'tranDau/' + TID + '/tim/b', { n: I(1) }), 403);
    const cid = 'ztest_c_' + bay;
    xoa.push('tranDau/' + TID + '/chatGui/' + cid, 'tranDau/' + TID + '/chatGui/' + cid + 'b', 'tranDau/' + TID + '/chat/' + cid);
    ok('Người xem gửi chat (chờ duyệt) = 200', await taoGioMay(tk[C], 'tranDau/' + TID + '/chatGui/' + cid, { uid: S(C), chu: S('Cố lên!') }, ['luc']), 200);
    ok('Gửi chat mạo danh người khác = 403', await taoGioMay(tk[C], 'tranDau/' + TID + '/chatGui/' + cid + 'b', { uid: S(A), chu: S('x') }, ['luc']), 403);
    ok('Người chơi đọc tin chờ của người khác = 403', await doc(tk[A], 'tranDau/' + TID + '/chatGui/' + cid), 403);
    ok('Người gửi đọc lại tin chờ của mình = 200', await doc(tk[C], 'tranDau/' + TID + '/chatGui/' + cid), 200);
    await ghiAdmin('tranDau/' + TID + '/chat/' + cid, { uid: S(C), ten: S('ZTEST XH CHI'), vai: S('xem'), chu: S('Cố lên!'), luc: I(Date.now()) });
    ok('Bạn khác lớp đọc chat trận = 200', await doc(tk[C], 'tranDau/' + TID + '/chat/' + cid), 200);
    ok('Học sinh tự ghi thẳng vào chat (bỏ qua lọc) = 403', await sua(tk[C], 'tranDau/' + TID + '/chat/' + cid + 'x', { uid: S(C), chu: S('x') }), 403);

    // ── trận thường (không xh) vẫn khoá người ngoài lớp ──
    const TID2 = 'ztest_xh_thuong_' + bay; xoa.push('tranDau/' + TID2);
    await ghiAdmin('tranDau/' + TID2, { a: S(A), b: S(Bb), nguoi: L([S(A), S(Bb)]), lop: S(LOP), giai: S(''), trangThai: S('xong'), taoLuc: I(bay) });
    ok('Trận THƯỜNG: bạn khác lớp đọc = 403', await doc(tk[C], 'tranDau/' + TID2), 403);
    ok('Trận THƯỜNG: bạn cùng lớp đọc = 200', await doc(tk[Bb], 'tranDau/' + TID2), 200);
  } finally {
    if (doiCai) {
      if (caiGoc) await ghiAdmin('caiDat/choiGame', caiGoc); else await xoaTaiLieu(['caiDat/choiGame']);
      console.log('  đã trả caiDat/choiGame về giá trị cũ');
    }
    try {
      for (const sub of ['tim', 'xem', 'chatGui', 'chat', 'tu', 'nhip', 'may']) {
        const r = await goi(`${FS_GOC}/tranDau/ztest_xh_${bay}/${sub}?pageSize=50`, { headers: await H() });
        ((r.json && r.json.documents) || []).forEach((d) => xoa.push(d.name.split('/documents/')[1]));
      }
    } catch (_) { }
    console.log('  dọn', await xoaTaiLieu([...new Set(xoa)]), 'tài liệu thử');
    for (const u of [A, Bb, C, T]) await xoaTkThu(u);
    console.log('  xoá 4 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  const TEN = 'tools/dang-luat-xep-hang.js';
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-xep-hang.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--bien-dich')) { console.log('BIÊN DỊCH OK (chưa kích hoạt):', await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules')); return; }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-xep-hang.rules', fsCu.source);
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
