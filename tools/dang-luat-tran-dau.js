// 📝 15/10/2026 — LUẬT: kho TRẬN ĐẤU `tranDau` (+ tu, nhip) và `tdLichSu` (đấu game online 1–1 A Show Speed, web v1.347.0, Đợt 2).
// Chép khuôn `dang-luat-xem-gioi-thieu.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-tran-dau.js --xem | --dang | --kiem | --lui <rulesetName>
//
// Chỉ CHÈN khối mới ngay sau khối giaiDau (dang-luat-giai-dau.js phải đăng trước). ⛔ KHÔNG đụng khối nào khác.
// Hàm máy chủ đi kèm: myLesson/app/may-chu/functions/tran-dau.js (tdTao · tdDoi · tdTu · tdNhip · tdQuet).
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


const DAU_HIEU = '(15/10/2026) TRAN DAU';
const NEO = "      match /bang/{lop} {\n        allow read: if laThay() || hsLop(lop);\n        allow write: if laThay();\n      }\n    }\n";
const T = (s) => '    ' + s + '\n';
const KHOI = NEO + '\n' + [
  "// " + DAU_HIEU + " - tran A Show Speed online 1-1 (web v1.347.0, Dot 2). Em A tao loi moi (cung lop, giai dang mo khop phut/lv);",
  "// em B nhan/tu choi trong 60 giay; A huy. Ham may chu (tran-dau.js) xep chu, cham tu, chot tran. Doc: 2 em trong tran + thay.",
  "match /tranDau/{id} {",
  "  function tdGiaiMo(g, d) {",
  "    return g.lops.hasAny([d.lop]) && g.get('dong', false) == false",
  "      && g.tu <= request.time.toMillis() && request.time.toMillis() < g.den",
  "      && g.phut == d.phut && g.lv == d.lv;",
  "  }",
  "  function tdGiaiHop(d) {",
  "    return d.giai == '' ? (d.phut == 2 && d.lv == 'easy')",
  "      : (exists(/databases/$(database)/documents/giaiDau/$(d.giai))",
  "         && tdGiaiMo(get(/databases/$(database)/documents/giaiDau/$(d.giai)).data, d));",
  "  }",
  "  allow read: if laThay() || (request.auth != null && (resource.data.a == request.auth.uid || resource.data.b == request.auth.uid));",
  "  allow create: if nwVao() && request.auth.token.get('hs', false) == true",
  "    && request.resource.data.keys().hasOnly(['a', 'b', 'nguoi', 'tenA', 'tenB', 'lop', 'giai', 'phut', 'lv', 'trangThai', 'taoLuc', 'het'])",
  "    && request.resource.data.a == nwToi() && request.resource.data.b is string && request.resource.data.b != nwToi()",
  "    && request.resource.data.nguoi == [nwToi(), request.resource.data.b]",
  "    && request.resource.data.trangThai == 'moi'",
  "    && request.resource.data.lop is string && request.resource.data.lop in nwLops()",
  "    && nwHoSo(request.resource.data.b).cacLop.hasAny([request.resource.data.lop])",
  "    && request.resource.data.tenA == nwHoSo(nwToi()).ten",
  "    && request.resource.data.tenB is string && request.resource.data.tenB.size() <= 60",
  "    && request.resource.data.taoLuc is int",
  "    && request.resource.data.taoLuc > request.time.toMillis() - 120000 && request.resource.data.taoLuc < request.time.toMillis() + 120000",
  "    && request.resource.data.het == request.resource.data.taoLuc + 60000",
  "    && request.resource.data.giai is string && request.resource.data.phut is int && request.resource.data.lv is string",
  "    && tdGiaiHop(request.resource.data);",
  "  allow update: if request.auth != null && resource.data.trangThai == 'moi'",
  "    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['trangThai'])",
  "    && ((request.auth.uid == resource.data.b && request.resource.data.trangThai in ['nhan', 'tuchoi']",
  "         && request.time.toMillis() < resource.data.het + 5000)",
  "        || (request.auth.uid == resource.data.a && request.resource.data.trangThai == 'huy'));",
  "  function tdTran() { return get(/databases/$(database)/documents/tranDau/$(id)).data; }",
  "  // Tu: TAO MOT LAN (khong update) => ai tao truoc duoc tu, ben kia bi tu choi = Taken.",
  "  match /tu/{tu} {",
  "    allow read: if laThay() || (request.auth != null && request.auth.uid in tdTran().nguoi);",
  "    allow create: if request.auth != null && tu.matches('^[a-z]{3,7}$')",
  "      && request.resource.data.keys().hasOnly(['uid', 'luc']) && (!('luc' in request.resource.data) || request.resource.data.luc == request.time)",
  "      && request.resource.data.uid == request.auth.uid",
  "      && request.auth.uid in tdTran().nguoi",
  "      && tdTran().trangThai == 'choi'",
  "      && request.time.toMillis() >= tdTran().batDau - 1000",
  "      && request.time.toMillis() <= tdTran().ketThuc + 2000;",
  "  }",
  "  match /nhip/{uid} {",
  "    allow read: if laThay() || (request.auth != null && request.auth.uid in tdTran().nguoi);",
  "    allow write: if request.auth != null && uid == request.auth.uid && uid in tdTran().nguoi",
  "      && request.resource.data.keys().hasOnly(['luc', 'sv', 'roi', 'xong']);",
  "  }",
  "}",
  "match /tdLichSu/{uid} {",
  "  allow read: if laThay() || (request.auth != null && request.auth.uid == uid);",
  "}"
].map(T).join('');

// (15/10/2026 tối) SỬA 1: bản đầu viết `!laThay()` ⇒ phiên HỌC SINH không có claim `thay` ⇒ lỗi ⇒ bị cấm tạo lời mời (bẫy đã ghi
// trong memory chat-kieu-zalo: laThay() lỗi với phiên học sinh). Luật đang chạy còn dòng cũ ⇒ thay đúng dòng đó.
const SUA1_CU = "      allow create: if nwVao() && !laThay()\n";
const SUA1_MOI = "      allow create: if nwVao() && request.auth.token.get('hs', false) == true\n";
function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU) && cu.includes(SUA1_CU)) return thayMot(cu, SUA1_CU, SUA1_MOI, 'sửa 1: tranDau create');
  if (cu.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ có khối tranDau (đã sửa) — không đăng lại');
  if (cu.includes('match /tranDau/')) throw new Error('CHOT DUNG: luật đang chạy đã có match /tranDau/ — dừng');
  if (!cu.includes('(15/10/2026) GIAI DAU')) throw new Error('CHOT DUNG: chưa có khối giaiDau (chạy dang-luat-giai-dau.js trước)');
  return thayMot(cu, NEO, KHOI, 'chèn khối tranDau sau khối giaiDau');
}

// ───────── KIỂM (REST thật, tài khoản ZTEST tạo rồi xoá ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b });
  const L = (a) => ({ arrayValue: { values: a } });
  const LOP = 'ZTESTTD', A = 'hs_9999991', Bb = 'hs_9999992', C = 'hs_9999990', THAY = 'ztest_thay_trandau';
  const bay = Date.now(), GIAI = 'ztest_giai_td_' + bay, TRAN = 'ztest_tran_' + bay, TRAN2 = 'ztest_tran2_' + bay;
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb, 'nwUsers/' + C, 'giaiDau/' + GIAI, 'tdLichSu/' + A];
  console.log('luật đang chạy:', (await docRelease('cloud.firestore')).rulesetName);
  try {
    const hs = (uid, ten, lop) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(lop), cacLop: L([S(lop)]), anh: S(''), capNhat: I(bay) });
    await hs(A, 'ZTEST AN', LOP); await hs(Bb, 'ZTEST BINH', LOP); await hs(C, 'ZTEST CUONG', 'ZTESTKHAC');
    await ghiAdmin('giaiDau/' + GIAI, { ten: S('ZTEST'), lops: L([S(LOP)]), game: S('aShowSpeed'), phut: I(2), lv: S('easy'), tu: I(bay - 60000), den: I(bay + 3600e3), sao: L([I(1), I(1), I(1)]), dong: B(false) });
    await ghiAdmin('tdLichSu/' + A, { ds: L([]) });
    const tA = await taoTkThu(A, 'ZTEST9999991', { hs: true, ma: 'ZTEST9999991', lop: LOP, lops: LOP, msId: 0 });
    const tB = await taoTkThu(Bb, 'ZTEST9999992', { hs: true, ma: 'ZTEST9999992', lop: LOP, lops: LOP, msId: 0 });
    const tC = await taoTkThu(C, 'ZTEST9999990', { hs: true, ma: 'ZTEST9999990', lop: 'ZTESTKHAC', lops: 'ZTESTKHAC', msId: 0 });
    const tT = await taoTkThu(THAY, 'ZTESTTHAYTD', { thay: true });
    const H2 = (t) => (t ? { Authorization: 'Bearer ' + t } : {});
    const moi = (o) => ({ fields: Object.assign({ a: S(A), b: S(Bb), nguoi: L([S(A), S(Bb)]), tenA: S('ZTEST AN'), tenB: S('ZTEST BINH'), lop: S(LOP), giai: S(GIAI),
      phut: I(2), lv: S('easy'), trangThai: S('moi'), taoLuc: I(Date.now()), het: I(0) }, o || {}) });
    const datHet = (m) => { m.fields.het = I(+m.fields.taoLuc.integerValue + 60000); return m; };
    const tao = (tk, id, body) => goi(`${FS_GOC}/tranDau${k}&documentId=${id}`, { method: 'POST', headers: H2(tk), json: body });
    const sua = (tk, p, fields) => goi(`${FS_GOC}/${p}${k}` + Object.keys(fields).map((f) => '&updateMask.fieldPaths=' + f).join(''), { method: 'PATCH', headers: H2(tk), json: { fields } });
    const doc = (tk, p) => goi(`${FS_GOC}/${p}${k}`, { headers: H2(tk) });
    const taoCon = (tk, p, id, fields) => goi(`${FS_GOC}/${p}${k}&documentId=${id}`, { method: 'POST', headers: H2(tk), json: { fields } });

    ok('A mời C (khác lớp) = 403', (await tao(tA, TRAN + 'x', datHet(moi({ b: S(C), nguoi: L([S(A), S(C)]) })))).status, 403);
    ok('A mời B mà ghi tên giả = 403', (await tao(tA, TRAN + 'y', datHet(moi({ tenA: S('Thay Andrew') })))).status, 403);
    ok('A mời B sai số phút của giải = 403', (await tao(tA, TRAN + 'z', datHet(moi({ phut: I(5) })))).status, 403);
    ok('B tạo lời mời ĐỨNG TÊN A = 403', (await tao(tB, TRAN + 'w', datHet(moi()))).status, 403);
    const r1 = await tao(tA, TRAN, datHet(moi()));
    ok('A mời B (giải đang mở) = 200', r1.status, 200);
    xoa.push('tranDau/' + TRAN);
    const r2 = await tao(tA, TRAN2, datHet(moi({ giai: S(''), phut: I(2), lv: S('easy') })));
    ok('A mời B giao hữu = 200', r2.status, 200);
    xoa.push('tranDau/' + TRAN2);
    ok('C (người ngoài) đọc trận = 403', (await doc(tC, 'tranDau/' + TRAN)).status, 403);
    ok('B đọc trận = 200', (await doc(tB, 'tranDau/' + TRAN)).status, 200);
    ok('B hỏi danh sách lời mời của mình = 200', (await goi(`https://firestore.googleapis.com/v1/${DB}/documents:runQuery${k}`, { method: 'POST', headers: H2(tB), json: { structuredQuery: { from: [{ collectionId: 'tranDau' }], where: { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: 'b' }, op: 'EQUAL', value: S(Bb) } }, { fieldFilter: { field: { fieldPath: 'trangThai' }, op: 'EQUAL', value: S('moi') } }] } }, limit: 5 } } })).status, 200);
    ok('A tự bấm Nhận = 403', (await sua(tA, 'tranDau/' + TRAN, { trangThai: S('nhan') })).status, 403);
    ok('B sửa chữ trận = 403', (await sua(tB, 'tranDau/' + TRAN, { trangThai: S('nhan'), chu: S('AAAAAAAAAAAAAAAA') })).status, 403);
    ok('A huỷ lời mời giao hữu = 200', (await sua(tA, 'tranDau/' + TRAN2, { trangThai: S('huy') })).status, 200);
    ok('B nhận = 200', (await sua(tB, 'tranDau/' + TRAN, { trangThai: S('nhan') })).status, 200);
    ok('A gửi từ khi trận CHƯA bắt đầu = 403', (await taoCon(tA, 'tranDau/' + TRAN + '/tu', 'cat', { uid: S(A) })).status, 403);
    // máy chủ (khoá quản trị) chuyển sang chơi — giống tdDoi
    await goi(`${FS_GOC}/tranDau/${TRAN}?updateMask.fieldPaths=trangThai&updateMask.fieldPaths=batDau&updateMask.fieldPaths=ketThuc&updateMask.fieldPaths=chu`, { method: 'PATCH', headers: await H(), json: { fields: { trangThai: S('choi'), batDau: I(Date.now() - 1000), ketThuc: I(Date.now() + 60000), chu: S('CATDOGEEIOSTRNLP') } } });
    ok('A gửi từ "cat" = 200', (await taoCon(tA, 'tranDau/' + TRAN + '/tu', 'cat', { uid: S(A) })).status, 200);
    ok('B gửi lại "cat" (Taken) = 403', [(await taoCon(tB, 'tranDau/' + TRAN + '/tu', 'cat', { uid: S(Bb) })).status].map((x) => (x === 409 ? 403 : x))[0], 403);   // REST tạo trùng = 409, trình duyệt (setDoc) = 403
    ok('B gửi "dog" = 200', (await taoCon(tB, 'tranDau/' + TRAN + '/tu', 'dog', { uid: S(Bb) })).status, 200);
    ok('B gửi từ đứng tên A = 403', (await taoCon(tB, 'tranDau/' + TRAN + '/tu', 'tea', { uid: S(A) })).status, 403);
    ok('C gửi từ = 403', (await taoCon(tC, 'tranDau/' + TRAN + '/tu', 'sea', { uid: S(C) })).status, 403);
    ok('A gửi từ có chữ hoa = 403', (await taoCon(tA, 'tranDau/' + TRAN + '/tu', 'Rat', { uid: S(A) })).status, 403);
    ok('A gửi từ kèm điểm tự khai = 403', (await taoCon(tA, 'tranDau/' + TRAN + '/tu', 'eat', { uid: S(A), d: I(99) })).status, 403);
    ok('A sửa từ đã gửi = 403', (await sua(tA, 'tranDau/' + TRAN + '/tu/cat', { d: I(5) })).status, 403);
    ok('A ghi nhịp của mình = 200', (await sua(tA, 'tranDau/' + TRAN + '/nhip/' + A, { luc: I(Date.now()) })).status, 200);
    ok('A ghi nhịp thay B = 403', (await sua(tA, 'tranDau/' + TRAN + '/nhip/' + Bb, { roi: B(true) })).status, 403);
    ok('B đọc danh sách từ = 200', (await goi(`${FS_GOC}/tranDau/${TRAN}/tu${k}`, { headers: H2(tB) })).status, 200);
    ok('C đọc danh sách từ = 403', (await goi(`${FS_GOC}/tranDau/${TRAN}/tu${k}`, { headers: H2(tC) })).status, 403);
    ok('THẦY đọc trận = 200', (await doc(tT, 'tranDau/' + TRAN)).status, 200);
    ok('A đọc lịch sử của mình = 200', (await doc(tA, 'tdLichSu/' + A)).status, 200);
    ok('B đọc lịch sử của A = 403', (await doc(tB, 'tdLichSu/' + A)).status, 403);
    ok('A tự ghi lịch sử = 403', (await sua(tA, 'tdLichSu/' + A, { ds: L([]) })).status, 403);
    xoa.push('tranDau/' + TRAN + '/tu/cat', 'tranDau/' + TRAN + '/tu/dog', 'tranDau/' + TRAN + '/nhip/' + A);
    // hàm máy chủ có thể đã ghi thêm: thông báo cho B, lịch sử, bảng giải
    xoa.push('tdLichSu/' + Bb, 'giaiDau/' + GIAI + '/bang/' + LOP);
    await xoaTkThu(THAY);
  } finally {
    // thông báo hàm tdTao ghi cho B
    try {
      const q = await goi(`${FS_GOC}/nwUsers/${Bb}/thongBao?pageSize=20`, { headers: await H() });
      ((q.json && q.json.documents) || []).forEach((d) => xoa.push(d.name.split('/documents/')[1]));
    } catch (_) { }
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử');
    for (const u of [A, Bb, C, THAY]) await xoaTkThu(u);
    console.log('  xoá 4 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  const TEN = 'tools/dang-luat-tran-dau.js';
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-tran-dau.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Dòng thêm: ' + d.them.length + ' · dòng bớt: ' + d.bot.length);
      d.bot.forEach((x) => console.log('   − ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-tran-dau.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node ' + TEN + ' --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node ' + TEN + ' --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
