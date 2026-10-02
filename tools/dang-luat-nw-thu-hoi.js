// 💬 02/10/2026 (web v1.223.0, thầy chốt) — CHAT RIÊNG myNetwork: BẢN CHÉP TIN THU HỒI cho THẦY (y chat lớp v1.206.0).
//   Học sinh thu hồi tin của mình ⇒ CÙNG MỘT LƯỢT GHI (batch): cất bản chép `nwChats/{id}/thuHoi/{mid}` + thu hồi giữ chỗ tin gốc.
//   Bản chép CHỈ THẦY đọc (trang Tin nhắn của thầy hiện nội dung ngay dưới "Tin nhắn đã bị thu hồi"). Luật đối chiếu bản chép với
//   tin gốc TỪNG TRƯỜNG (get = trước lượt ghi) + tin gốc SAU lượt ghi phải đã thu hồi (getAfter). Không ai sửa; chỉ thầy xoá.
//   Thầy: không thu hồi nữa, chỉ XOÁ HẲN (delete tin cũ đã có sẵn trong luật) — kèm xoá bản chép.
// Chép khuôn `dang-luat-nw-chat-zalo.js`. Chỉ THÊM khối `match /thuHoi/{mid}` ngay sau khối `match /tin/{mid}` của nwChats.
//
//   node tools/dang-luat-nw-thu-hoi.js --xem | --dang | --kiem | --lui <rulesetName>
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
  'E:\\LAP TRINH APP\\mySpeaking-data\\data\\firebase-admin.json',
  'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'];
const TAI_LIEU_UNG_VIEN = ['E:/LAP TRINH APP/myLesson-data/tai-lieu', 'D:/APP AND DATA/myLesson-data/tai-lieu'];

const MOC = "        // v0.6.0: thu hồi tin = tác giả hoặc thầy\n" +
  "        allow delete: if nwVao() && (resource.data.uid == nwToi() || laThay());\n" +
  "      }\n";
const KHOI = "      // (02/10/2026, web v1.223.0) BAN CHEP TIN THU HOI chat Network: CHI THAY doc (trang Tin nhan hien duoi 'Tin nhan da bi thu hoi').\n" +
  "      // Ghi CUNG MOT LUOT (batch) voi lenh thu hoi: noi dung DUNG Y tin goc (get = truoc luot ghi), tin goc sau luot ghi da thu hoi.\n" +
  "      match /thuHoi/{mid} {\n" +
  "        function nwTinGoc() { return get(/databases/$(database)/documents/nwChats/$(id)/tin/$(mid)).data; }\n" +
  "        allow read: if laThay();\n" +
  "        allow create: if nwVao()\n" +
  "          && request.resource.data.keys().hasOnly(['uid', 'ten', 'chu', 'hinh', 'traLoi', 'sticker', 'luc'])\n" +
  "          && exists(/databases/$(database)/documents/nwChats/$(id)/tin/$(mid))\n" +
  "          && nwTinGoc().get('thuHoi', false) != true\n" +
  "          && getAfter(/databases/$(database)/documents/nwChats/$(id)/tin/$(mid)).data.get('thuHoi', false) == true\n" +
  "          && request.resource.data.get('uid', '') == nwTinGoc().get('uid', '')\n" +
  "          && request.resource.data.get('ten', '') == nwTinGoc().get('ten', '')\n" +
  "          && request.resource.data.get('chu', '') == nwTinGoc().get('chu', '')\n" +
  "          && request.resource.data.get('hinh', '') == nwTinGoc().get('hinh', '')\n" +
  "          && request.resource.data.get('traLoi', null) == nwTinGoc().get('traLoi', null)\n" +
  "          && request.resource.data.get('sticker', null) == nwTinGoc().get('sticker', null)\n" +
  "          && request.resource.data.luc is number\n" +
  "          && (nwTinGoc().get('uid', '') == nwToi() || laThay());\n" +
  "        allow update: if false;\n" +
  "        allow delete: if laThay();\n" +
  "      }\n";
function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghepFirestore(cu) {
  if (cu.includes('match /thuHoi/{mid}')) throw new Error('CHOT DUNG: luật ĐÃ có bản chép thu hồi chat Network — không đăng lại');
  const dau = cu.indexOf('    match /nwChats/{id} {\n');
  if (dau < 0) throw new Error('CHOT DUNG: không thấy khối nwChats');
  const sau = cu.indexOf('    match /nwBanBe/{id} {', dau);
  if (sau < 0) throw new Error('CHOT DUNG: không thấy khối nwBanBe sau nwChats');
  const vung = cu.slice(dau, sau);
  const moi = thayMot(vung, MOC, MOC + KHOI, 'thêm khối thuHoi sau khối tin của nwChats');
  return cu.slice(0, dau) + moi + cu.slice(sau);
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


// ───────── KIỂM (REST thật; phòng thử nwChats/<A>__<B> + 2 hồ sơ nwUsers thử, dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const nay = Date.now(), rac = [];
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) }), B = (v) => ({ booleanValue: v });
  const M = (o) => ({ mapValue: { fields: o } }), A = (ds) => ({ arrayValue: { values: ds } });
  const H2 = (tok) => tok ? { Authorization: 'Bearer ' + tok } : {};
  const UA = 'hs_ztestnw1', UB = 'hs_ztestnw2', TA = 'ZTEST NW MOT', TB = 'ZTEST NW HAI';
  const PHONG = 'nwChats/' + UA + '__' + UB;
  const quanTri = async (p, fields) => { const r = await goi(`${FS_GOC}/${p}`, { method: 'PATCH', headers: await H(), json: { fields } }); if (r.status !== 200) throw new Error('ADMIN_GHI_' + p + '_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200)); rac.push(p); };
  let dem = 0;
  const tao = async (tok, fields) => {
    const p = PHONG + '/tin/z' + (++dem);
    const f = Object.assign({ luc: I(nay), anh: S(''), hinh: S('') }, fields);
    const r = await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: H2(tok), json: { fields: f } });
    if (r.status === 200) rac.push(p);
    return { st: r.status, p, f };
  };
  const mThu = ['thuHoi', 'chu', 'hinh', 'cx', 'traLoi', 'sticker', 'camXuc'];
  const thu = { thuHoi: B(true), chu: S(''), hinh: S(''), cx: M({}) };
  const pChep = (p) => p.replace('/tin/', '/thuHoi/');
  // MỘT lượt ghi: [bản chép?] + [thu hồi?]
  const loat = async (tok, p, chep, coThu) => {
    const w = [];
    if (chep) w.push({ update: { name: DB + '/documents/' + pChep(p), fields: chep }, currentDocument: { exists: false } });
    if (coThu) w.push({ update: { name: DB + '/documents/' + p, fields: thu }, updateMask: { fieldPaths: mThu } });
    const r = await goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit${k}`, { method: 'POST', headers: H2(tok), json: { writes: w } });
    if (r.status === 200 && chep) rac.push(pChep(p));
    return r.status;
  };
  const chepTu = (g, sua) => Object.assign({ uid: g.uid, ten: g.ten, chu: g.chu, hinh: g.hinh, luc: I(nay) }, g.traLoi ? { traLoi: g.traLoi } : {}, g.sticker ? { sticker: g.sticker } : {}, sua || {});
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  try {
    const tkA = await taoTkThu(UA, 'ZTESTNW1', { hs: true, ma: 'ZTESTNW1', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkB = await taoTkThu(UB, 'ZTESTNW2', { hs: true, ma: 'ZTESTNW2', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkT = await tokenThayThu();
    await quanTri('nwUsers/' + UA, { ten: S(TA), vaiTro: S('hs'), cacLop: A([S('ZTEST')]) });
    await quanTri('nwUsers/' + UB, { ten: S(TB), vaiTro: S('hs'), cacLop: A([S('ZTEST')]) });
    await quanTri(PHONG, { loai: S('rieng'), thanhVien: A([S(UA), S(UB)]), tv: M({}), taoBoi: S(UA), luc: I(nay), capNhat: I(nay), docLuc: M({}) });
    await new Promise((r) => setTimeout(r, 1500));
    const a1 = await tao(tkA, { uid: S(UA), ten: S(TA), chu: S('Bí mật số 1'), traLoi: M({ id: S('z0'), uid: S(UB), ten: S(TB), chu: S('hỏi'), hinh: S('') }) });
    ok('em A gửi tin (có trả lời) = 200', a1.st, 200);
    const a2 = await tao(tkA, { uid: S(UA), ten: S(TA), chu: S('[Sticker]'), sticker: S('lop:ga-hello') });
    ok('em A gửi sticker = 200', a2.st, 200);
    const b1 = await tao(tkB, { uid: S(UB), ten: S(TB), chu: S('Tin của B') });
    ok('em B gửi tin = 200', b1.st, 200);
    // --- bản chép sai / thiếu ---
    ok('em A chép SAI chữ + thu hồi = 403', await loat(tkA, a1.p, chepTu(a1.f, { chu: S('bịa') }), true), 403);
    ok('em A chép thiếu traLoi + thu hồi = 403', await loat(tkA, a1.p, { uid: S(UA), ten: S(TA), chu: S('Bí mật số 1'), hinh: S(''), luc: I(nay) }, true), 403);
    ok('em A chép đúng nhưng KHÔNG thu hồi cùng lượt = 403', await loat(tkA, a1.p, chepTu(a1.f), false), 403);
    ok('em A chép thêm trường lạ = 403', await loat(tkA, a1.p, chepTu(a1.f, { la: S('x') }), true), 403);
    ok('em B chép + thu hồi tin CỦA A = 403', await loat(tkB, a1.p, chepTu(a1.f), true), 403);
    ok('NGƯỜI LẠ chép + thu hồi = 403', await loat(null, a1.p, chepTu(a1.f), true), 403);
    // --- đúng ---
    ok('em A chép ĐÚNG + thu hồi tin của mình (1 lượt) = 200', await loat(tkA, a1.p, chepTu(a1.f), true), 200);
    ok('em A chép + thu hồi sticker của mình = 200', await loat(tkA, a2.p, chepTu(a2.f), true), 200);
    ok('em B thu hồi THƯỜNG (không chép) tin của mình = 200', await loat(tkB, b1.p, null, true), 200);
    // --- đọc bản chép ---
    const doc = (tok, p) => goi(`${FS_GOC}/${p}${k}`, { headers: H2(tok) });
    ok('em A đọc bản chép = 403', (await doc(tkA, pChep(a1.p))).status, 403);
    ok('em B đọc bản chép = 403', (await doc(tkB, pChep(a1.p))).status, 403);
    ok('NGƯỜI LẠ đọc bản chép = 403', (await doc(null, pChep(a1.p))).status, 403);
    const rT = await doc(tkT, pChep(a1.p));
    ok('THẦY đọc bản chép = 200', rT.status, 200);
    ok('… nội dung đúng "Bí mật số 1" (1 = đúng)', rT.json && rT.json.fields && rT.json.fields.chu && rT.json.fields.chu.stringValue === 'Bí mật số 1' ? 1 : 0, 1);
    // --- không sửa / xoá / chép lại ---
    ok('em A sửa bản chép = 403', (await goi(`${FS_GOC}/${pChep(a1.p)}${k}&updateMask.fieldPaths=chu`, { method: 'PATCH', headers: H2(tkA), json: { fields: { chu: S('sửa') } } })).status, 403);
    ok('em A xoá bản chép = 403', (await goi(`${FS_GOC}/${pChep(a1.p)}${k}`, { method: 'DELETE', headers: H2(tkA) })).status, 403);
    // --- thầy xoá hẳn ---
    ok('THẦY xoá bản chép = 200', (await goi(`${FS_GOC}/${pChep(a2.p)}${k}`, { method: 'DELETE', headers: H2(tkT) })).status, 200);
    ok('THẦY xoá hẳn tin = 200', (await goi(`${FS_GOC}/${a2.p}${k}`, { method: 'DELETE', headers: H2(tkT) })).status, 200);
  } finally {
    console.log('  dọn', await xoaTaiLieu(rac.slice().reverse()), 'tài liệu thử');
    await xoaTkThu(UA); await xoaTkThu(UB); await xoaTkThu('ztest_thay');
    console.log('  đã xoá tài khoản thử', UA, UB, 'ztest_thay');
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
      ghiTaiLieu('_luat-thu-nw-thu-hoi.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-nw-thu-hoi.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-nw-thu-hoi.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-nw-thu-hoi.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
