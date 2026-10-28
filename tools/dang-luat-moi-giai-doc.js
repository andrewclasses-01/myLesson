// 📝 28/10/2026 — LUẬT: SỬA LỜI MỜI ĐẤU GIẢI BỊ TỪ CHỐI OAN (lỗi sót từ đợt GIỚI HẠN CHƠI 19/10, dang-luat-gioi-han-choi.js).
// Chép khuôn dang-luat-gioi-han-choi.js: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-moi-giai-doc.js --xem | --bien-dich | --dang | --kiem | --lui <rulesetName>
//
// Lỗi (đo 28/10 trên kho thật): HAI em cùng có phiếu tdHan (dù 1 trận, dù phiếu hôm qua) ⇒ em mời bạn ĐẤU GIẢI = 403; giao hữu vẫn qua.
// Từ 21/10 không còn trận giải nào. Nguyên nhân: lượt kiểm "em mời em" đọc quá nhiều tài liệu (giới hạn 10 lượt get/exists mỗi lần kiểm):
// nwUsers em + bạn, giaiDau (exists+get), caiDat (exists+get), tdHan em VÀ bạn (exists + 2 get mỗi phiếu).
// Sửa 2 chỗ: (1) tdHet đọc phiếu MỘT lần (let) · (2) lúc MỜI chỉ kiểm phiếu CỦA EM — phiếu của bạn đã kiểm lúc bạn bấm Nhận
// (luật update có sẵn) + máy em vẫn báo trước "bạn đã chơi đủ" (GioiHan.chanMoi). Không đổi gì khác.
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

const DAU_HIEU = '(28/10/2026) MOI GIAI DOC IT';
const HET_CU = "      function tdHet(u) {\n" +
  "        return exists(/databases/$(database)/documents/tdHan/$(u))\n" +
  "          && get(/databases/$(database)/documents/tdHan/$(u)).data.get('ngay', 0) == tdNgay()\n" +
  "          && get(/databases/$(database)/documents/tdHan/$(u)).data.get('so', 0) >= tdCai().get('tranNgay', 20);\n" +
  "      }\n";
const HET_MOI = "      // " + DAU_HIEU + ": doc phieu MOT lan (truoc: exists + 2 get) - luot kiem moi giai vuot gioi han 10 luot doc\n" +
  "      function tdHet(u) {\n" +
  "        let h = exists(/databases/$(database)/documents/tdHan/$(u)) ? get(/databases/$(database)/documents/tdHan/$(u)).data : {};\n" +
  "        return h.get('ngay', 0) == tdNgay() && h.get('so', 0) >= tdCai().get('tranNgay', 20);\n" +
  "      }\n";
const MOI_CU = "        && !tdDem() && !tdHet(nwToi()) && !tdHet(request.resource.data.b);\n";
const MOI_MOI = "        // " + DAU_HIEU + ": luc MOI chi kiem phieu cua EM; phieu cua ban kiem luc ban bam Nhan (luat update ben duoi)\n" +
  "        && !tdDem() && !tdHet(nwToi());\n";
function ghepFirestore(cu) {
  if (cu.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ có bản sửa này — không đăng lại');
  let s = thayMot(cu, HET_CU, HET_MOI, 'tdHet');
  s = thayMot(s, MOI_CU, MOI_MOI, 'em mời em');
  return s;
}

// ───────── KIỂM trên kho thật (tài khoản ZTEST, dọn sạch) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b }), M = (o) => ({ mapValue: { fields: o } });
  const L = (a) => ({ arrayValue: { values: a } });
  const LOP = 'ZTESTHAN', A = 'hs_9999971', Bb = 'hs_9999972', bay = Date.now(), GIAI = 'ztest_giai_han_' + bay;
  const NGAY = Math.floor((bay + 7 * 3600e3) / 864e5);
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb, 'giaiDau/' + GIAI, 'tdHan/' + A, 'tdHan/' + Bb];
  let hong = false;
  const ok = (ten, co, can) => { const d = co === can; if (!d) hong = true; console.log((d ? '  ✓ ' : '  ✗ ') + ten + '  ' + co); };
  try {
    const hs = (uid, ten) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(LOP), cacLop: L([S(LOP)]), anh: S(''), capNhat: I(bay) });
    await hs(A, 'ZTEST AN'); await hs(Bb, 'ZTEST BINH');
    await ghiAdmin('giaiDau/' + GIAI, { ten: S('ZTEST CUP'), lops: L([S(LOP)]), game: S('aShowSpeed'), phut: I(2), lv: S('easy'), tu: I(bay - 60000), den: I(bay + 3600e3), sao: L([I(1), I(1), I(1)]), dong: B(false) });
    const tA = await taoTkThu(A, 'ZTEST9999971', { hs: true, ma: 'ZTEST9999971', lop: LOP, lops: LOP, msId: 0 });
    const tB = await taoTkThu(Bb, 'ZTEST9999972', { hs: true, ma: 'ZTEST9999972', lop: LOP, lops: LOP, msId: 0 });
    const tao = async (giai) => {
      const t0 = Date.now();
      const r = await goi(`${FS_GOC}/tranDau${k}`, { method: 'POST', headers: { Authorization: 'Bearer ' + tA }, json: { fields: { a: S(A), b: S(Bb), nguoi: L([S(A), S(Bb)]), tenA: S('ZTEST AN'), tenB: S('ZTEST BINH'),
        lop: S(LOP), giai: S(giai), phut: I(2), lv: S('easy'), trangThai: S('moi'), taoLuc: I(t0), het: I(t0 + 60000) } } });
      return { st: r.status, p: r.status === 200 ? r.json.name.split('/documents/')[1] : '' };
    };
    const moi = async (giai) => { const r = await tao(giai); if (r.p) await xoaTaiLieu([r.p]); return r.st; };
    const han = (u, so, ngay) => ghiAdmin('tdHan/' + u, { ngay: I(ngay == null ? NGAY : ngay), so: I(so), giai: M({}), cap: M({}) });
    await xoaTaiLieu(['tdHan/' + A, 'tdHan/' + Bb]).catch(() => 0);
    ok('Chưa ai có phiếu ⇒ mời giải', await moi(GIAI), 200);
    await han(A, 1); await han(Bb, 1);
    ok('HAI em có phiếu 1 trận hôm nay ⇒ mời GIẢI (trước: 403)', await moi(GIAI), 200);
    ok('HAI em có phiếu 1 trận hôm nay ⇒ mời giao hữu', await moi(''), 200);
    await han(A, 5, NGAY - 1); await han(Bb, 5, NGAY - 1);
    ok('HAI em có phiếu HÔM QUA ⇒ mời GIẢI (trước: 403)', await moi(GIAI), 200);
    await han(A, 29); await han(Bb, 1);
    ok('Em 29 trận ⇒ mời giải', await moi(GIAI), 200);
    await han(A, 30);
    ok('Em đủ 30 trận ⇒ mời giải = 403', await moi(GIAI), 403);
    ok('Em đủ 30 trận ⇒ mời giao hữu = 403', await moi(''), 403);
    await han(A, 1); await han(Bb, 30);
    const t = await tao(GIAI);
    ok('Bạn đủ 30 trận ⇒ em mời giải được (đổi: trước 403)', t.st, 200);
    if (t.p) {
      const sua = (v) => goi(`${FS_GOC}/${t.p}${k}&updateMask.fieldPaths=trangThai`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + tB }, json: { fields: { trangThai: S(v) } } });
      ok('…nhưng bạn đủ 30 trận bấm Nhận = 403', (await sua('nhan')).status, 403);
      ok('…bạn vẫn Từ chối được', (await sua('tuchoi')).status, 200);
      await xoaTaiLieu([t.p]);
    }
  } finally {
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử'); await xoaTkThu(A); await xoaTkThu(Bb); console.log('  xoá 2 tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  const TEN = 'tools/dang-luat-moi-giai-doc.js';
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--bien-dich')) { console.log('BIÊN DỊCH OK (chưa kích hoạt):', await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules')); return; }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-moi-giai-doc.rules', fsCu.source);
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
