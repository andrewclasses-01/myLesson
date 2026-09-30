// 💬 30/09/2026 (web v1.198.0) — LUẬT TIN NHẮN myNetwork cho KHUÔN CHAT KIỂU ZALO dùng chung (js/chat-ui.js):
//   sticker · cảm xúc ĐẾM (cx.<uid> = {ten, luc, n:{6 loại}, l}, mỗi loại 0..10) · thu hồi GIỮ CHỖ (thay cho xoá hẳn).
// Chép khuôn `dang-luat-chat-zalo.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, mỗi chỗ sửa có CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-nw-chat-zalo.js --xem | --dang | --kiem | --lui <rulesetName>
//
// Chỉ đụng khối `match /nwChats/{id}` → `match /tin/{mid}` (create thêm 'sticker' tuỳ chọn; update: cảm xúc cũ `camXuc` ⇒ `cx` đếm
// + nhánh thu hồi). Thêm 3 hàm nwCx* trong khối nwChats. KHÔNG đụng classChat / nwPosts / đăng nhập / điểm.
//   · thầy chốt 30/09: cảm xúc cũ myNetwork (7 loại, 1 người 1 cái) BỎ — trang mới không đọc `camXuc` nữa; luật không cho ghi `camXuc` nữa.
//   · thu hồi: người gửi hoặc thầy — tin còn ô, chu = '', hinh = '', cx = {}, bỏ traLoi/sticker/camXuc. Thầy vẫn XOÁ HẲN được (delete cũ).
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

const DAU = "    match /nwChats/{id} {\n";
const HAM = "      // (30/09/2026, web v1.198.0) khuon chat kieu Zalo: o cam xuc dem cua tin nhan (n: 6 loai, moi loai 0..10).\n" +
  "      function nwCxSo(n, k) { return n.get(k, 0) is int && n.get(k, 0) >= 0 && n.get(k, 0) <= 10; }\n" +
  "      function nwCxNHop(n) {\n" +
  "        return n is map && n.keys().hasOnly(['tim','haha','khoc','gian','wow','timVo'])\n" +
  "          && nwCxSo(n, 'tim') && nwCxSo(n, 'haha') && nwCxSo(n, 'khoc') && nwCxSo(n, 'gian') && nwCxSo(n, 'wow') && nwCxSo(n, 'timVo');\n" +
  "      }\n" +
  "      function nwCxHop(v) {\n" +
  "        return v == null || (v is map && v.keys().hasOnly(['ten','luc','n','l'])\n" +
  "          && (!('n' in v) || nwCxNHop(v.n)) && (!('ten' in v) || (v.ten is string && v.ten.size() <= 60)));\n" +
  "      }\n";
const MOC_KEYS = "          && request.resource.data.keys().hasOnly(['uid', 'ten', 'anh', 'chu', 'hinh', 'luc', 'camXuc', 'traLoi'])   // v0.6.0: cảm xúc + trả lời\n";
const MOI_KEYS = "          && request.resource.data.keys().hasOnly(['uid', 'ten', 'anh', 'chu', 'hinh', 'luc', 'traLoi', 'sticker'])   // v0.6.0: trả lời · (30/09/2026, web v1.198.0) sticker; bo camXuc cu\n" +
  "          && (!('sticker' in request.resource.data)\n" +
  "              || (request.resource.data.sticker is string && request.resource.data.sticker.matches('^[a-z]{2,8}:[a-z0-9-]{2,24}$')))\n";
const MOC_UPDATE = "        // v0.6.0: ai trong phòng cũng thả/gỡ cảm xúc — CHỈ ô của mình trong map camXuc\n" +
  "        allow update: if nwVao()\n" +
  "          && nwToi() in get(/databases/$(database)/documents/nwChats/$(id)).data.thanhVien\n" +
  "          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['camXuc'])\n" +
  "          && request.resource.data.get('camXuc', {}).diff(resource.data.get('camXuc', {})).affectedKeys().hasOnly([nwToi()]);\n";
const MOI_UPDATE = "        // (30/09/2026, web v1.198.0) khuon chat kieu Zalo:\n" +
  "        //   CAM XUC DEM: thanh vien phong CHI sua o cx.<uid cua minh>, dung khuon, moi loai toi da 10 lan.\n" +
  "        //   THU HOI GIU CHO: nguoi gui hoac thay - tin con o, chu/anh/trich/sticker/cam xuc xoa sach.\n" +
  "        allow update: if nwVao() && (\n" +
  "             (nwToi() in get(/databases/$(database)/documents/nwChats/$(id)).data.thanhVien\n" +
  "              && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['cx'])\n" +
  "              && request.resource.data.cx is map\n" +
  "              && request.resource.data.cx.diff(resource.data.get('cx', {})).affectedKeys().hasOnly([nwToi()])\n" +
  "              && nwCxHop(request.resource.data.cx.get(nwToi(), null)))\n" +
  "          || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['thuHoi', 'chu', 'hinh', 'cx', 'traLoi', 'sticker', 'camXuc'])\n" +
  "              && request.resource.data.thuHoi == true && request.resource.data.chu == '' && request.resource.data.get('hinh', '') == ''\n" +
  "              && request.resource.data.get('cx', {}) == {}\n" +
  "              && !('traLoi' in request.resource.data) && !('sticker' in request.resource.data) && !('camXuc' in request.resource.data)\n" +
  "              && (resource.data.uid == nwToi() || laThay())));\n";

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghepFirestore(cu) {
  if (cu.includes('nwCxHop(')) throw new Error('CHOT DUNG: luật ĐÃ có cảm xúc đếm myNetwork — không đăng lại');
  let s = thayMot(cu, DAU, DAU + HAM, 'nwChats thêm hàm nwCx*');
  s = thayMot(s, MOC_KEYS, MOI_KEYS, 'tin create thêm sticker, bỏ camXuc');
  s = thayMot(s, MOC_UPDATE, MOI_UPDATE, 'tin update: cx đếm + thu hồi giữ chỗ');
  return s;
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
    const r = await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: H2(tok), json: { fields: Object.assign({ luc: I(nay), anh: S(''), hinh: S('') }, fields) } });
    if (r.status === 200) rac.push(p);
    return { st: r.status, p };
  };
  const sua = async (tok, p, fields, mask) => {
    const r = await goi(`${FS_GOC}/${p}${k}&${mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&')}`, { method: 'PATCH', headers: H2(tok), json: { fields } });
    return r.status;
  };
  const cxO = (ten, n, l) => M({ ten: S(ten), luc: I(nay), n: M(Object.fromEntries(Object.entries(n).map(([a, b]) => [a, I(b)]))), l: S(l) });
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  try {
    const tkA = await taoTkThu(UA, 'ZTESTNW1', { hs: true, ma: 'ZTESTNW1', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkB = await taoTkThu(UB, 'ZTESTNW2', { hs: true, ma: 'ZTESTNW2', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkT = await tokenThayThu();
    // hồ sơ + phòng thử (khoá quản trị, bỏ qua luật)
    await quanTri('nwUsers/' + UA, { ten: S(TA), vaiTro: S('hs'), cacLop: A([S('ZTEST')]) });
    await quanTri('nwUsers/' + UB, { ten: S(TB), vaiTro: S('hs'), cacLop: A([S('ZTEST')]) });
    await quanTri(PHONG, { loai: S('rieng'), thanhVien: A([S(UA), S(UB)]), tv: M({}), taoBoi: S(UA), luc: I(nay), capNhat: I(nay), docLuc: M({}) });
    await new Promise((r) => setTimeout(r, 1500));
    // --- tạo tin ---
    const a1 = await tao(tkA, { uid: S(UA), ten: S(TA), chu: S('Chào bạn :1f60a:') });
    ok('em A gửi tin thường (có mã emoji) = 200', a1.st, 200);
    const b1 = await tao(tkB, { uid: S(UB), ten: S(TB), chu: S('Chào lại nè') });
    ok('em B gửi tin thường = 200', b1.st, 200);
    ok('em A trả lời tin B (traLoi) = 200', (await tao(tkA, { uid: S(UA), ten: S(TA), chu: S('ok'), traLoi: M({ id: S('z2'), uid: S(UB), ten: S(TB), chu: S('Chào lại nè'), hinh: S('') }) })).st, 200);
    ok('em A gửi sticker hợp lệ "lop:ga-hello" = 200', (await tao(tkA, { uid: S(UA), ten: S(TA), chu: S('[Sticker]'), sticker: S('lop:ga-hello') })).st, 200);
    ok('em A gửi sticker sai khuôn "https://x" = 403', (await tao(tkA, { uid: S(UA), ten: S(TA), chu: S('[Sticker]'), sticker: S('https://x.y/z') })).st, 403);
    ok('em A tự ghi thuHoi lúc tạo = 403', (await tao(tkA, { uid: S(UA), ten: S(TA), chu: S('x'), thuHoi: B(true) })).st, 403);
    ok('em A tự ghi cx lúc tạo = 403', (await tao(tkA, { uid: S(UA), ten: S(TA), chu: S('x'), cx: M({}) })).st, 403);
    ok('em A ghi camXuc CŨ lúc tạo = 403', (await tao(tkA, { uid: S(UA), ten: S(TA), chu: S('x'), camXuc: M({}) })).st, 403);
    ok('em A giả tên người khác = 403', (await tao(tkA, { uid: S(UA), ten: S(TB), chu: S('x') })).st, 403);
    ok('NGƯỜI LẠ gửi tin = 403', (await tao(null, { uid: S(UA), ten: S(TA), chu: S('x') })).st, 403);
    // --- cảm xúc ---
    const cx = (ma, v) => ({ cx: M({ [ma]: v }) });
    ok('em A thả {tim:3,haha:1} lên tin B = 200', await sua(tkA, b1.p, cx(UA, cxO(TA, { tim: 3, haha: 1 }, 'haha')), ['cx.' + UA]), 200);
    ok('em A thả tim 10 lần (chạm trần) = 200', await sua(tkA, b1.p, cx(UA, cxO(TA, { tim: 10 }, 'tim')), ['cx.' + UA]), 200);
    ok('em A thả tim 11 lần = 403', await sua(tkA, b1.p, cx(UA, cxO(TA, { tim: 11 }, 'tim')), ['cx.' + UA]), 403);
    ok('em A thả loại lạ "like" = 403', await sua(tkA, b1.p, cx(UA, cxO(TA, { like: 1 }, 'like')), ['cx.' + UA]), 403);
    ok('em A sửa ô cx CỦA B = 403', await sua(tkA, a1.p, cx(UB, cxO(TB, { tim: 1 }, 'tim')), ['cx.' + UB]), 403);
    ok('em A ghi camXuc CŨ = 403', await sua(tkA, b1.p, { camXuc: M({ [UA]: S('tim') }) }, ['camXuc.' + UA]), 403);
    ok('em A gỡ ô cx của mình = 200', await sua(tkA, b1.p, { cx: M({}) }, ['cx.' + UA]), 200);
    ok('em A sửa chữ tin của B = 403', await sua(tkA, b1.p, { chu: S('bị sửa') }, ['chu']), 403);
    ok('NGƯỜI LẠ thả cảm xúc = 403', await sua(null, b1.p, cx(UA, cxO(TA, { tim: 1 }, 'tim')), ['cx.' + UA]), 403);
    // --- thu hồi ---
    const thu = { thuHoi: B(true), chu: S(''), hinh: S(''), cx: M({}) };
    const mThu = ['thuHoi', 'chu', 'hinh', 'cx', 'traLoi', 'sticker', 'camXuc'];
    ok('em A thu hồi tin CỦA B = 403', await sua(tkA, b1.p, thu, mThu), 403);
    ok('em A thu hồi nhưng GIỮ chữ = 403', await sua(tkA, a1.p, { thuHoi: B(true), chu: S('vẫn còn'), hinh: S(''), cx: M({}) }, mThu), 403);
    ok('em A thu hồi tin CỦA MÌNH = 200', await sua(tkA, a1.p, thu, mThu), 200);
    ok('THẦY thu hồi tin của B = 200', await sua(tkT, b1.p, thu, mThu), 200);
    ok('NGƯỜI LẠ thu hồi = 403', await sua(null, rac[rac.length - 1], thu, mThu), 403);
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
      ghiTaiLieu('_luat-thu-nw-chat-zalo.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-nw-chat-zalo.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-nw-chat-zalo.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-nw-chat-zalo.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
