// 💬 30/09/2026 (web v1.199.0) — LUẬT BÀI ĐĂNG + BÌNH LUẬN myNetwork cho bộ cảm xúc / sticker DÙNG CHUNG (js/chat-ui.js):
//   thầy chốt: ngoài chat, MỖI NGƯỜI MỖI LOẠI TỐI ĐA 1 (thả được nhiều loại) — ô `cx.<uid>` = {ten, luc, n:{6 loại, 0..1}, l}.
//   Cảm xúc cũ `camXuc{uid: mã}` BỎ: không cho ghi nữa. Bình luận thêm `sticker` ('goi:ten').
// Chép khuôn `dang-luat-nw-chat-zalo.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, mỗi chỗ sửa có CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-nw-bai-zalo.js --xem | --dang | --kiem | --lui <rulesetName>
//
// Chỉ đụng khối `match /nwPosts/{id}` (+ `match /binhLuan/{cid}` bên trong). KHÔNG đụng nwChats / classChat / đăng nhập / điểm.
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

const STK = "'^[a-z]{2,8}:[a-z0-9-]{2,24}$'";
const DAU = "    match /nwPosts/{id} {\n";
const HAM = "      // (30/09/2026, web v1.199.0) cam xuc bai dang / binh luan: 6 loai, MOI NGUOI MOI LOAI TOI DA 1 (thay chot).\n" +
  "      function nwCx1So(n, k) { return n.get(k, 0) is int && n.get(k, 0) >= 0 && n.get(k, 0) <= 1; }\n" +
  "      function nwCx1NHop(n) {\n" +
  "        return n is map && n.keys().hasOnly(['tim','haha','khoc','gian','wow','timVo'])\n" +
  "          && nwCx1So(n, 'tim') && nwCx1So(n, 'haha') && nwCx1So(n, 'khoc') && nwCx1So(n, 'gian') && nwCx1So(n, 'wow') && nwCx1So(n, 'timVo');\n" +
  "      }\n" +
  "      function nwCx1Hop(v) {\n" +
  "        return v == null || (v is map && v.keys().hasOnly(['ten','luc','n','l'])\n" +
  "          && (!('n' in v) || nwCx1NHop(v.n)) && (!('ten' in v) || (v.ten is string && v.ten.size() <= 60)));\n" +
  "      }\n";
const SUA = [
  ['bài create: thêm cx', "             'an', 'ghim', 'camXuc', 'soBinhLuan', 'soChiaSe', 'chiaSeTu', 'goc', 'gan', 'camGiac'])",
    "             'an', 'ghim', 'camXuc', 'cx', 'soBinhLuan', 'soChiaSe', 'chiaSeTu', 'goc', 'gan', 'camGiac'])"],
  ['bài create: cx rỗng', "        && request.resource.data.camXuc.size() == 0\n",
    "        && request.resource.data.get('camXuc', {}).size() == 0 && request.resource.data.get('cx', {}).size() == 0   // (30/09/2026, web v1.199.0)\n"],
  ['bài update: camXuc ⇒ cx 1/loại',
    "        || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['camXuc'])\n" +
    "             && request.resource.data.camXuc.diff(resource.data.camXuc).affectedKeys().hasOnly([nwToi()]))\n",
    "           // (30/09/2026, web v1.199.0) cam xuc bo chung: CHI o cx.<uid cua minh>, moi loai toi da 1; camXuc cu KHONG ghi nua\n" +
    "        || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['cx'])\n" +
    "             && request.resource.data.cx is map\n" +
    "             && request.resource.data.cx.diff(resource.data.get('cx', {})).affectedKeys().hasOnly([nwToi()])\n" +
    "             && nwCx1Hop(request.resource.data.cx.get(nwToi(), null)))\n"],
  ['bình luận create: keys', "          && request.resource.data.keys().hasOnly(['uid', 'tacGia', 'chu', 'luc', 'camXuc', 'anh', 'traLoiCho'])   // v0.5.0: ảnh + trả lời 1 cấp\n",
    "          && request.resource.data.keys().hasOnly(['uid', 'tacGia', 'chu', 'luc', 'camXuc', 'cx', 'anh', 'traLoiCho', 'sticker'])   // v0.5.0: ảnh + trả lời 1 cấp · (30/09/2026, web v1.199.0) cx + sticker\n" +
    "          && request.resource.data.get('camXuc', {}).size() == 0 && request.resource.data.get('cx', {}).size() == 0\n" +
    "          && (!('sticker' in request.resource.data) || (request.resource.data.sticker is string && request.resource.data.sticker.matches(" + STK + ")))\n"],
  ['bình luận create: có sticker là đủ', "          && (request.resource.data.chu.size() > 0 || request.resource.data.anh.size() > 0)\n",
    "          && (request.resource.data.chu.size() > 0 || request.resource.data.anh.size() > 0 || ('sticker' in request.resource.data))\n"],
  ['bình luận update: camXuc ⇒ cx 1/loại',
    "          || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['camXuc'])\n" +
    "               && request.resource.data.camXuc.diff(resource.data.camXuc).affectedKeys().hasOnly([nwToi()])));\n",
    "          || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['cx'])   // (30/09/2026, web v1.199.0) moi loai toi da 1\n" +
    "               && request.resource.data.cx is map\n" +
    "               && request.resource.data.cx.diff(resource.data.get('cx', {})).affectedKeys().hasOnly([nwToi()])\n" +
    "               && nwCx1Hop(request.resource.data.cx.get(nwToi(), null))));\n"],
];

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghepFirestore(cu) {
  if (cu.includes('nwCx1Hop(')) throw new Error('CHOT DUNG: luật ĐÃ có cảm xúc bộ chung cho bài đăng — không đăng lại');
  let s = thayMot(cu, DAU, DAU + HAM, 'nwPosts thêm hàm nwCx1*');
  SUA.forEach(([ten, a, b]) => { s = thayMot(s, a, b, ten); });
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


// ───────── KIỂM (REST thật; bài + bình luận thử + 2 hồ sơ nwUsers thử, dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const nay = Date.now(), rac = [];
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) }), B = (v) => ({ booleanValue: v }), NUL = { nullValue: null };
  const M = (o) => ({ mapValue: { fields: o } }), A = (ds) => ({ arrayValue: { values: ds } });
  const H2 = (tok) => tok ? { Authorization: 'Bearer ' + tok } : {};
  const UA = 'hs_ztestnwb1', UB = 'hs_ztestnwb2', TA = 'ZTEST BAI MOT', TB = 'ZTEST BAI HAI';
  const quanTri = async (p, fields) => { const r = await goi(`${FS_GOC}/${p}`, { method: 'PATCH', headers: await H(), json: { fields } }); if (r.status !== 200) throw new Error('ADMIN_GHI_' + p + '_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200)); rac.push(p); };
  let dem = 0;
  const taoTai = async (tok, p, fields) => {
    const r = await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: H2(tok), json: { fields } });
    if (r.status === 200) rac.push(p);
    return r.status;
  };
  const sua = async (tok, p, fields, mask) => {
    const r = await goi(`${FS_GOC}/${p}${k}&${mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&')}`, { method: 'PATCH', headers: H2(tok), json: { fields } });
    return r.status;
  };
  const cxO = (ten, n, l) => M({ ten: S(ten), luc: I(nay), n: M(Object.fromEntries(Object.entries(n).map(([a, b]) => [a, I(b)]))), l: S(l) });
  const bai = (u, ten, them) => Object.assign({ uid: S(u), tacGia: M({ uid: S(u), ten: S(ten), vaiTro: S('hs') }), chu: S('Bài thử :1f60a:'), anh: A([]), pham: S('mang'), lop: S('ZTEST'),
    luc: I(nay), an: B(false), ghim: B(false), cx: M({}), soBinhLuan: I(0), soChiaSe: I(0), chiaSeTu: NUL, goc: NUL }, them || {});
  const bl = (u, ten, them) => Object.assign({ uid: S(u), tacGia: M({ uid: S(u), ten: S(ten), vaiTro: S('hs') }), chu: S('Bình luận 😂'), anh: S(''), traLoiCho: NUL, luc: I(nay), cx: M({}) }, them || {});
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  const P1 = 'nwPosts/ztest_bai_' + nay, P2 = P1 + 'b';
  try {
    const tkA = await taoTkThu(UA, 'ZTESTNWB1', { hs: true, ma: 'ZTESTNWB1', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkB = await taoTkThu(UB, 'ZTESTNWB2', { hs: true, ma: 'ZTESTNWB2', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    await quanTri('nwUsers/' + UA, { ten: S(TA), vaiTro: S('hs'), cacLop: A([S('ZTEST')]) });
    await quanTri('nwUsers/' + UB, { ten: S(TB), vaiTro: S('hs'), cacLop: A([S('ZTEST')]) });
    await new Promise((r) => setTimeout(r, 1500));
    // --- bài ---
    ok('em A đăng bài (cx rỗng) = 200', await taoTai(tkA, P1, bai(UA, TA)), 200);
    ok('em A đăng bài tự điền sẵn cx = 403', await taoTai(tkA, P2, bai(UA, TA, { cx: M({ [UA]: cxO(TA, { tim: 1 }, 'tim') }) })), 403);
    ok('em A đăng bài kèm camXuc CŨ có dữ liệu = 403', await taoTai(tkA, P2, bai(UA, TA, { camXuc: M({ [UB]: S('tim') }) })), 403);
    const cx = (ma, v) => ({ cx: M({ [ma]: v }) });
    ok('em B thả {tim:1, haha:1} lên bài A = 200', await sua(tkB, P1, cx(UB, cxO(TB, { tim: 1, haha: 1 }, 'haha')), ['cx.' + UB]), 200);
    ok('em B thả tim 2 lần = 403', await sua(tkB, P1, cx(UB, cxO(TB, { tim: 2 }, 'tim')), ['cx.' + UB]), 403);
    ok('em B thả loại lạ "like" = 403', await sua(tkB, P1, cx(UB, cxO(TB, { like: 1 }, 'like')), ['cx.' + UB]), 403);
    ok('em B sửa ô cx CỦA A = 403', await sua(tkB, P1, cx(UA, cxO(TA, { tim: 1 }, 'tim')), ['cx.' + UA]), 403);
    ok('em B ghi camXuc CŨ = 403', await sua(tkB, P1, { camXuc: M({ [UB]: S('tim') }) }, ['camXuc.' + UB]), 403);
    ok('em B gỡ ô cx của mình = 200', await sua(tkB, P1, { cx: M({}) }, ['cx.' + UB]), 200);
    ok('NGƯỜI LẠ thả cảm xúc bài = 403', await sua(null, P1, cx(UB, cxO(TB, { tim: 1 }, 'tim')), ['cx.' + UB]), 403);
    // --- bình luận ---
    const C = P1 + '/binhLuan/zc';
    ok('em B bình luận (cx rỗng, emoji) = 200', await taoTai(tkB, C + '1', bl(UB, TB)), 200);
    ok('em B bình luận CHỈ sticker "lop:ga-hello" = 200', await taoTai(tkB, C + '2', bl(UB, TB, { chu: S(''), sticker: S('lop:ga-hello') })), 200);
    ok('em B bình luận sticker sai khuôn = 403', await taoTai(tkB, C + '3', bl(UB, TB, { chu: S(''), sticker: S('https://x.y') })), 403);
    ok('em B bình luận tự điền sẵn cx = 403', await taoTai(tkB, C + '4', bl(UB, TB, { cx: M({ [UB]: cxO(TB, { tim: 1 }, 'tim') }) })), 403);
    ok('em B bình luận rỗng hẳn = 403', await taoTai(tkB, C + '5', bl(UB, TB, { chu: S('') })), 403);
    ok('em A thả {wow:1} lên bình luận B = 200', await sua(tkA, C + '1', cx(UA, cxO(TA, { wow: 1 }, 'wow')), ['cx.' + UA]), 200);
    ok('em A thả wow 2 lần lên bình luận = 403', await sua(tkA, C + '1', cx(UA, cxO(TA, { wow: 2 }, 'wow')), ['cx.' + UA]), 403);
    ok('em A ghi camXuc CŨ lên bình luận = 403', await sua(tkA, C + '1', { camXuc: M({ [UA]: S('tim') }) }, ['camXuc.' + UA]), 403);
  } finally {
    console.log('  dọn', await xoaTaiLieu(rac.slice().reverse()), 'tài liệu thử');
    await xoaTkThu(UA); await xoaTkThu(UB);
    console.log('  đã xoá tài khoản thử', UA, UB);
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
      ghiTaiLieu('_luat-thu-nw-bai-zalo.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-nw-bai-zalo.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-nw-bai-zalo.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-nw-bai-zalo.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
