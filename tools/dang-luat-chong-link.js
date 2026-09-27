// 🔗 27/09/2026 tối (web v1.165.0) — LUẬT CHAT: TIN HỌC SINH KHÔNG ĐƯỢC CHỨA ĐƯỜNG LINK (bản đồ tấn công T5, HO SO BAO MAT.md mục 8).
// Chép khuôn `dang-luat-mat-khau.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, mỗi chỗ sửa có CHỐT DỪNG. Tự đứng một mình.
//
//   node tools/dang-luat-chong-link.js --xem | --dang | --kiem | --lui <rulesetName>
//
// Vì sao: mã nguồn web công khai ⇒ ai cũng dựng trang đăng nhập GIẢ, rồi nhắn vào chat lớp "thầy bảo vào đây" — bạn gõ
// mã + mật khẩu là mất tài khoản THẬT. Chặn link ở tin role 'hs' (thầy vẫn gửi link). Đo sao lưu 27/09: 3.398 tin HS thật
// chỉ 1 tin có link (YouTube), 46 tin thầy 0 link ⇒ không chặn oan.
// ⛔ Regex phải GIỐNG `js/chat.js CO_LINK` (bên web chặn sớm để báo lời dễ hiểu; bên luật chặn thật).
// ⛔ KHÔNG đụng đăng nhập / scores / results — chỉ sửa đúng 1 chỗ trong classChat create.
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

// Regex trong NGUỒN LUẬT (RE2, khớp TOÀN chuỗi ⇒ bọc (?s).* … .*). `\\s` ở đây = `\s` trong luật (nguồn luật cần 2 gạch chéo,
// giống `tenSach` dùng `\\p{L}`). Cùng nghĩa với js/chat.js: /(https?:|:\/\/|www\.|\.(com|…|edu)([\/?#:]|\s|$))/
const REGEX_LUAT = "(?s).*(https?:|://|www[.]|[.](com|vn|net|org|io|me|app|gg|ly|xyz|top|site|online|tv|cc|info|edu)([/?#:]|\\\\s|$)).*";
const NEO = "        && !request.resource.data.text.lower().matches('(?s).*(discord[.]|t[.]me/).*')\n";
const THEM = NEO +
  "        // (27/09/2026 toi, web v1.165.0 - ban do tan cong T5 LUA DAO QUA CHAT) tin HOC SINH khong duoc chua duong link\n" +
  "        // (thay van gui duoc). Do 3.398 tin HS that: dung 1 tin co link (YouTube). Cung khuon voi js/chat.js CO_LINK.\n" +
  "        && (request.resource.data.role != 'hs'\n" +
  "            || !request.resource.data.text.lower().matches('" + REGEX_LUAT + "'))\n";

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghepFirestore(cu) {
  if (cu.includes('T5 LUA DAO QUA CHAT')) throw new Error('CHOT DUNG: luật ĐÃ có chặn link — không đăng lại');
  if (!cu.includes('function hsDung(')) throw new Error('CHOT DUNG: luật đang chạy CHƯA có hsDung (c2abc4b3) — kiểm lại');
  if (!cu.includes('function khanCap(')) throw new Error('CHOT DUNG: luật đang chạy CHƯA có công tắc khẩn cấp — kiểm lại');
  return thayMot(cu, NEO, THEM, 'classChat create chan link');
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

// ───────── KIỂM (REST thật; chỗ thử classChat/ZTEST, dọn ngay) ─────────
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const nay = Date.now(), rac = [];
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) });
  let dem = 0;
  const tin = async (chu, code, role, idTok) => {
    const p = 'classChat/ZTEST/messages/l' + (++dem);
    const headers = idTok ? { Authorization: 'Bearer ' + idTok } : {};
    const r = await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers, json: { fields: { name: S('ZTEST'), code: S(code), role: S(role), text: S(chu), createdAt: I(nay), may: S('abcdefghij') } } });
    if (r.status === 200) rac.push(p);
    return r.status;
  };
  const rel = await docRelease('cloud.firestore');
  const truoc = await docCongTac();
  console.log('luật đang chạy:', rel.rulesetName, '| công tắc:', JSON.stringify(truoc));
  try {
    const tkA = await taoTkThu('hs_ztestlk1', 'ZTESTLK1', { hs: true, ma: 'ZTESTLK1', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkT = await tokenThayThu();
    if (truoc.khoaChat) await datCongTac({ khoaChat: false, khoaDiem: truoc.khoaDiem, lyDo: 'kiem luat chong link' });
    await new Promise((r) => setTimeout(r, 1500));
    // tin thường của em vẫn đi
    ok('em gửi "Bài 2 nghe khó quá mọi người ạ" = 200', await tin('Bài 2 nghe khó quá mọi người ạ', 'ZTESTLK1', 'hs', tkA), 200);
    ok('em gửi "em được 5.5 điểm rồi ạ. vui quá!" = 200', await tin('em được 5.5 điểm rồi ạ. vui quá!', 'ZTESTLK1', 'hs', tkA), 200);
    ok('em gửi "Thầy ơi bài 3 câu 2 đáp án B đúng không ạ?" = 200', await tin('Thầy ơi bài 3 câu 2 đáp án B đúng không ạ?', 'ZTESTLK1', 'hs', tkA), 200);
    // link bị chặn
    ok('em gửi "https://youtube.com/shorts/abc" = 403', await tin('xem cái này nè https://youtube.com/shorts/abc', 'ZTESTLK1', 'hs', tkA), 403);
    ok('em gửi "www.andrewclasses-login.com" = 403', await tin('thầy bảo vào www.andrewclasses-login.com đăng nhập lại', 'ZTESTLK1', 'hs', tkA), 403);
    ok('em gửi "bit.ly/3xyz" = 403', await tin('vào bit.ly/3xyz nhé', 'ZTESTLK1', 'hs', tkA), 403);
    ok('em gửi "andrewclasses-01.github.io" = 403', await tin('andrewclasses-01.github.io', 'ZTESTLK1', 'hs', tkA), 403);
    ok('em gửi "HTTP://X.Y" (chữ hoa) = 403', await tin('HTTP://X.Y', 'ZTESTLK1', 'hs', tkA), 403);
    ok('em gửi "abc.com" (cuối chuỗi) = 403', await tin('abc.com', 'ZTESTLK1', 'hs', tkA), 403);
    // thầy vẫn gửi link
    ok('THẦY gửi "https://youtube.com/watch?v=abc" = 200', await tin('Bài nghe hôm nay: https://youtube.com/watch?v=abc', '', 'gv', tkT), 200);
    // người lạ vẫn bị chặn như trước
    ok('NGƯỜI LẠ gửi tin thường = 403', await tin('xin chào', 'ZTESTLK1', 'hs', null), 403);
  } finally {
    await datCongTac(truoc);
    console.log('  trả công tắc về:', JSON.stringify(await docCongTac()));
    console.log('  dọn', await xoaTaiLieu(rac), 'tài liệu thử:', rac.join(', ') || '(không có)');
    await xoaTkThu('hs_ztestlk1'); await xoaTkThu('ztest_thay');
    console.log('  đã xoá tài khoản thử hs_ztestlk1 + ztest_thay');
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
      ghiTaiLieu('_luat-thu-chong-link.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-chong-link.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-chong-link.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-chong-link.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
