// 📝 15/10/2026 — LUẬT: THẺ THÁCH ĐẤU trong chat nhóm lớp (đấu game online Đợt 3, web v1.348.0): tin he td của học sinh + bạn cùng lớp đọc trận.
// Chép khuôn `dang-luat-xem-gioi-thieu.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-the-td.js --xem | --dang | --kiem | --lui <rulesetName>
//
// Sửa ĐÚNG 2 chỗ: điều kiện `he` của classChat (thêm nhánh học sinh loai 'td') + dòng read của tranDau (thêm hsLop). ⛔ Không đụng gì khác.
// Đi kèm: js/the-td.js (thẻ + nút ⚔), js/chat-ui.js, js/chat.js (heChuan td).
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


const DAU_HIEU = '(15/10/2026) THE THACH DAU';
const HE_CU =
  "        && (!('he' in request.resource.data)\n" +
  "            || (laThay() && request.resource.data.role == 'gv' && request.resource.data.he is map\n";
const HE_MOI =
  "        && (!('he' in request.resource.data)\n" +
  "            // " + DAU_HIEU + " (web v1.348.0, dau game online Dot 3): HOC SINH gui THE THACH DAU he={loai:'td', id} -\n" +
  "            // CHI tran do chinh em tao (tranDau.a == em) va dung lop cua phong chat. Xet nhanh hoc sinh TRUOC (laThay() voi phien hoc sinh bao loi).\n" +
  "            || (request.resource.data.role == 'hs' && request.auth != null && request.resource.data.he is map\n" +
  "                && request.resource.data.he.keys().hasOnly(['loai','id']) && request.resource.data.he.loai == 'td'\n" +
  "                && request.resource.data.he.id is string && request.resource.data.he.id.size() > 0 && request.resource.data.he.id.size() <= 40\n" +
  "                && exists(/databases/$(database)/documents/tranDau/$(request.resource.data.he.id))\n" +
  "                && get(/databases/$(database)/documents/tranDau/$(request.resource.data.he.id)).data.a == request.auth.uid\n" +
  "                && get(/databases/$(database)/documents/tranDau/$(request.resource.data.he.id)).data.lop == lop)\n" +
  "            || (laThay() && request.resource.data.role == 'gv' && request.resource.data.he is map\n";
const DOC_CU = "      allow read: if laThay() || (request.auth != null && (resource.data.a == request.auth.uid || resource.data.b == request.auth.uid));\n";
const DOC_MOI = "      // " + DAU_HIEU + ": ban CUNG LOP (dang nhap) xem duoc tran de the trong chat hien trang thai / ket qua\n" +
  "      allow read: if laThay() || (request.auth != null && (resource.data.a == request.auth.uid || resource.data.b == request.auth.uid)) || hsLop(resource.data.lop);\n";

function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ có thẻ thách đấu — không đăng lại');
  let s = thayMot(cu, HE_CU, HE_MOI, 'classChat: tin he td của học sinh');
  s = thayMot(s, DOC_CU, DOC_MOI, 'tranDau: bạn cùng lớp đọc');
  return s;
}

// ───────── KIỂM (REST thật, tài khoản ZTEST tạo rồi xoá ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b });
  const L = (a) => ({ arrayValue: { values: a } }), M = (o) => ({ mapValue: { fields: o } });
  const LOP = 'ZTESTTD3', LOP2 = 'ZTESTTD4', A = 'hs_9999971', Bb = 'hs_9999972', C = 'hs_9999973', D = 'hs_9999974';
  const MA = { [A]: 'ZTEST9999971', [Bb]: 'ZTEST9999972', [C]: 'ZTEST9999973', [D]: 'ZTEST9999974' };
  const bay = Date.now(), TRAN = 'ztest_tran_td_' + bay;
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb, 'nwUsers/' + C, 'nwUsers/' + D];
  console.log('luật đang chạy:', (await docRelease('cloud.firestore')).rulesetName);
  try {
    const hs = (uid, ten, lop) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(lop), cacLop: L([S(lop)]), anh: S(''), capNhat: I(bay) });
    await hs(A, 'ZTEST AN', LOP); await hs(Bb, 'ZTEST BINH', LOP); await hs(C, 'ZTEST CUONG', LOP); await hs(D, 'ZTEST DUNG', LOP2);
    const tk = {};
    for (const u of [A, Bb, C]) tk[u] = await taoTkThu(u, MA[u], { hs: true, ma: MA[u], lop: LOP, lops: LOP, msId: 0 });
    tk[D] = await taoTkThu(D, MA[D], { hs: true, ma: MA[D], lop: LOP2, lops: LOP2, msId: 0 });
    const H2 = (t) => ({ Authorization: 'Bearer ' + t });
    const t0 = Date.now();
    const r = await goi(`${FS_GOC}/tranDau${k}&documentId=${TRAN}`, { method: 'POST', headers: H2(tk[A]), json: { fields: { a: S(A), b: S(Bb), nguoi: L([S(A), S(Bb)]),
      tenA: S('ZTEST AN'), tenB: S('ZTEST BINH'), lop: S(LOP), giai: S(''), phut: I(2), lv: S('easy'), trangThai: S('moi'), taoLuc: I(t0), het: I(t0 + 60000) } } });
    ok('A tạo lời mời giao hữu = 200', r.status, 200);
    xoa.unshift('tranDau/' + TRAN);
    const tin = (uid, lop, he) => goi(`${FS_GOC}/classChat/${lop}/messages${k}`, { method: 'POST', headers: H2(tk[uid]), json: { fields: {
      name: S(uid === A ? 'ZTEST AN' : 'ZTEST BINH'), code: S(MA[uid]), role: S('hs'), text: S('⚔ ZTEST thach dau'), createdAt: I(Date.now()), may: S('ztestmay1'), he: M(he) } } });
    const r1 = await tin(A, LOP, { loai: S('td'), id: S(TRAN) });
    ok('A gửi thẻ thách đấu (trận của A, đúng lớp) = 200', r1.status, 200);
    if (r1.json && r1.json.name) xoa.push(r1.json.name.split('/documents/')[1]);
    ok('B gửi thẻ trận của A = 403', (await tin(Bb, LOP, { loai: S('td'), id: S(TRAN) })).status, 403);
    ok('A gửi thẻ vào phòng lớp KHÁC = 403', (await tin(A, LOP2, { loai: S('td'), id: S(TRAN) })).status, 403);
    ok('A gửi thẻ trận không tồn tại = 403', (await tin(A, LOP, { loai: S('td'), id: S('khong_co_' + bay) })).status, 403);
    ok('A giả tin hệ thống "cấm chat" = 403', (await tin(A, LOP, { loai: S('cam'), ten: S('ZTEST BINH') })).status, 403);
    ok('C (cùng lớp, ngoài trận) đọc trận = 200', (await goi(`${FS_GOC}/tranDau/${TRAN}${k}`, { headers: H2(tk[C]) })).status, 200);
    ok('D (lớp khác) đọc trận = 403', (await goi(`${FS_GOC}/tranDau/${TRAN}${k}`, { headers: H2(tk[D]) })).status, 403);
    ok('C đọc danh sách từ của trận = 403', (await goi(`${FS_GOC}/tranDau/${TRAN}/tu${k}`, { headers: H2(tk[C]) })).status, 403);
    ok('B nhận (vẫn chạy như Đợt 2) = 200', (await goi(`${FS_GOC}/tranDau/${TRAN}${k}&updateMask.fieldPaths=trangThai`, { method: 'PATCH', headers: H2(tk[Bb]), json: { fields: { trangThai: S('nhan') } } })).status, 200);
    // hàm máy chủ sẽ xếp chữ + tạo nhịp/thông báo — dọn
    await new Promise((res) => setTimeout(res, 6000));
    const q = await goi(`${FS_GOC}/nwUsers/${Bb}/thongBao?pageSize=20`, { headers: await H() });
    ((q.json && q.json.documents) || []).forEach((d) => xoa.push(d.name.split('/documents/')[1]));
    await goi(`${FS_GOC}/tranDau/${TRAN}?updateMask.fieldPaths=trangThai`, { method: 'PATCH', headers: await H(), json: { fields: { trangThai: S('het') } } });
  } finally {
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử');
    for (const u of [A, Bb, C, D]) await xoaTkThu(u);
    console.log('  xoá 4 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  const TEN = 'tools/dang-luat-the-td.js';
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-the-td.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--bien-dich')) { console.log('BIÊN DỊCH OK (chưa kích hoạt):', await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules')); return; }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-the-td.rules', fsCu.source);
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
