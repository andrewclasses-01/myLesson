// ⏰ 06/10/2026 (web v1.257.0) — LUẬT 2 kho của TỰ NHẮC HẠN BÀI (hàm máy chủ nhac-han.js):
//   cauHinhNhac/chung  : cài đặt (bật, mốc phút, từng lớp) — CHỈ thầy đọc/ghi (dashboard js/day.js moNhacHan).
//   nhacHanDaGui/{id}  : sổ đã nhắc = NHẬT KÝ — thầy đọc, KHÔNG ai ghi (chỉ máy chủ).
// (khuôn chép từ dang-luat-day-thong-bao.js)
//   id = sha1(endpoint) 40 hex · chỉ CHÍNH CHỦ đọc/xoá · ghi: uid = chính mình; ma/thay/lops KHỚP vé đăng nhập (máy chủ gửi tin lớp
//   theo `lops`, bỏ người gửi theo `ma`, thầy theo `thay`) ⇒ không ai tự gắn mình vào lớp khác để nghe lén tin lớp đó.
//   Vé "thầy đăng nhập thay / xem như em" (claim thayNhu) KHÔNG được đăng ký máy.
// Khuôn: sửa TẠI CHỖ bản luật ĐANG CHẠY (lấy thẳng từ Firebase), chốt dừng: mốc thấy đúng 1 lần, chưa có khối mới, ngoặc cân.
//
//   node tools/dang-luat-nhac-han.js --xem | --dang | --kiem | --lui <rulesetFirestore>
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const PROJECT = 'aword-70dae';
const API_KEY = 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY';   // khoá CÔNG KHAI (config.js) — thử như người lạ
const API = 'https://firebaserules.googleapis.com/v1';
const FS_GOC = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const KHOA_UNG_VIEN = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'E:\\LAP TRINH APP\\mySpeaking-data\\data\\firebase-admin.json',
  'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'];
const TAI_LIEU_UNG_VIEN = ['E:/LAP TRINH APP/myLesson-data/tai-lieu', 'D:/APP AND DATA/myLesson-data/tai-lieu'];

const KHOI_FS = `    // (06/10/2026, dang-luat-nhac-han.js, web v1.257.0) TU NHAC HAN BAI: cai dat (chi thay) + so da nhac (chi may chu ghi).
    match /cauHinhNhac/{doc} {
      allow read: if laThay();
      allow write: if laThay() && doc == 'chung'
        && request.resource.data.keys().hasOnly(['bat', 'moc', 'lop', 'capNhat'])
        && request.resource.data.get('bat', true) is bool
        && request.resource.data.get('moc', []) is list && request.resource.data.get('moc', []).size() <= 6
        && request.resource.data.get('lop', {}) is map && request.resource.data.get('lop', {}).size() <= 80;
    }
    match /nhacHanDaGui/{id} {
      allow read: if laThay();
      allow write: if false;
    }
`;
const MOC_FS = '    match /lessonWeb/{doc} {';
const DAU_HIEU = 'match /cauHinhNhac/{doc}';

function soDong(cu, moi) {
  const a = cu.split('\n'), b = moi.split('\n');
  const dem = (ds) => { const m = new Map(); ds.forEach((x) => m.set(x, (m.get(x) || 0) + 1)); return m; };
  const ma = dem(a), mb = dem(b), them = [], bot = [];
  mb.forEach((n, k) => { const d = n - (ma.get(k) || 0); for (let i = 0; i < d; i++) them.push(k); });
  ma.forEach((n, k) => { const d = n - (mb.get(k) || 0); for (let i = 0; i < d; i++) bot.push(k); });
  return { them, bot };
}
function goi(url, opt) {
  const o = opt || {};
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = Object.assign({}, o.headers || {});
    let body = null;
    if (o.json !== undefined) { body = JSON.stringify(o.json); headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(body); }
    else if (o.form !== undefined) { body = o.form; headers['Content-Type'] = 'application/x-www-form-urlencoded'; headers['Content-Length'] = Buffer.byteLength(body); }
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: o.method || 'GET', headers }, (res) => {
      let d = ''; res.on('data', (c) => { d += c; });
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
async function tokenQuanTri() {
  if (_token) return _token;
  const sa = khoa(), now = Math.floor(Date.now() / 1000);
  const phan = b64u({ alg: 'RS256', typ: 'JWT' }) + '.' + b64u({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const jwt = phan + '.' + crypto.createSign('RSA-SHA256').update(phan).sign(sa.private_key).toString('base64url');
  const r = await goi('https://oauth2.googleapis.com/token', { method: 'POST', form: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt) });
  if (r.status !== 200 || !r.json || !r.json.access_token) throw new Error('KHONG_XIN_DUOC_TOKEN_' + r.status);
  return (_token = r.json.access_token);
}
async function H() { return { Authorization: 'Bearer ' + await tokenQuanTri() }; }
async function docRelease(ten) {
  const r = await goi(`${API}/projects/${PROJECT}/releases/${ten}`, { headers: await H() });
  if (r.status !== 200) throw new Error('RELEASE_' + ten + '_' + r.status);
  const rs = await goi(`${API}/${r.json.rulesetName}`, { headers: await H() });
  if (rs.status !== 200) throw new Error('RULESET_' + rs.status);
  return { rulesetName: r.json.rulesetName, source: rs.json.source.files.map((f) => f.content).join('\n'), fileName: rs.json.source.files[0].name };
}
async function taoRuleset(source, fileName) {
  const r = await goi(`${API}/projects/${PROJECT}/rulesets`, { method: 'POST', headers: await H(), json: { source: { files: [{ name: fileName, content: source }] } } });
  if (r.status !== 200) throw new Error('TAO_RULESET_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 600));
  return r.json.name;
}
async function datRelease(ten, rulesetName) {
  const name = `projects/${PROJECT}/releases/${ten}`;
  const r = await goi(`${API}/${name}`, { method: 'PATCH', headers: await H(), json: { release: { name, rulesetName }, updateMask: 'rulesetName' } });
  if (r.status !== 200) throw new Error('DAT_RELEASE_' + ten + '_' + r.status);
  return r.json;
}
function ghiTaiLieu(ten, noiDung) {
  const tm = TAI_LIEU_UNG_VIEN.find((p) => fs.existsSync(p)) || TAI_LIEU_UNG_VIEN[0];
  try { fs.mkdirSync(tm, { recursive: true }); fs.writeFileSync(path.join(tm, ten), noiDung, 'utf8'); console.log('  đã ghi', path.join(tm, ten)); } catch (e) { console.log('  (không ghi được tài liệu:', e.message, ')'); }
}
function chen(src, moc, khoi, dauHieu) {
  if (src.includes(dauHieu)) throw new Error('CHOT DUNG: luật ĐÃ có ' + dauHieu + ' — không chèn lại');
  const n = src.split(moc).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG: mốc "' + moc.trim() + '" thấy ' + n + ' lần (phải đúng 1)');
  const moi = src.replace(moc, () => khoi + moc);   // ⛔ hàm, KHÔNG chuỗi: luật có `$'` (regex ...+$') ⇒ replace hiểu là "phần sau mốc"
  if (moi.split('{').length !== moi.split('}').length) throw new Error('CHOT DUNG: bản ghép lệch ngoặc');
  return moi;
}
async function kiem() {
  let ok = 0, sai = 0;
  const t = (d, ten) => { if (d) { ok++; console.log('  ✓', ten); } else { sai++; console.log('  ✗', ten); } };
  let r = await goi(`${FS_GOC}/cauHinhNhac/chung?key=${API_KEY}`); t(r.status === 403, 'người lạ đọc cauHinhNhac ⇒ 403 (được ' + r.status + ')');
  r = await goi(`${FS_GOC}/cauHinhNhac/chung?key=${API_KEY}`, { method: 'PATCH', json: { fields: { bat: { booleanValue: false } } } }); t(r.status === 403, 'người lạ GHI cauHinhNhac ⇒ 403 (được ' + r.status + ')');
  r = await goi(`${FS_GOC}/nhacHanDaGui?key=${API_KEY}`); t(r.status === 403, 'người lạ LIỆT KÊ nhacHanDaGui ⇒ 403 (được ' + r.status + ')');
  r = await goi(`${FS_GOC}/lessonWeb/lop?key=${API_KEY}`); t(r.status === 200, 'đối chứng: lessonWeb/lop vẫn đọc công khai ⇒ 200 (được ' + r.status + ')');
  console.log(`
${ok} đạt / ${sai} hỏng`); process.exit(sai ? 1 : 0);
}
(async () => {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--lui') {
      if (!a[1]) throw new Error('cần ruleset firestore');
      console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 100));
      return;
    }
    if (a.includes('--kiem')) return await kiem();
    const cu = await docRelease('cloud.firestore');
    console.log('đang chạy: firestore', cu.rulesetName);
    const moi = chen(cu.source, MOC_FS, KHOI_FS, DAU_HIEU);
    const d = soDong(cu.source, moi);
    console.log(`  firestore: −${d.bot.length} dòng · +${d.them.length} dòng`);
    if (d.bot.length) throw new Error('CHOT DUNG: bản ghép làm MẤT dòng cũ');
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-nhac-han-firestore.rules', moi);
      // biên dịch thử trên máy chủ luật (tạo ruleset KHÔNG phát hành) ⇒ bắt lỗi cú pháp trước khi đăng
      const rs = await taoRuleset(moi, cu.fileName || 'firestore.rules');
      console.log('  ✓ biên dịch được (ruleset nháp, chưa phát hành):', rs);
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-nhac-han-firestore.rules', cu.source);
      const rs = await taoRuleset(moi, cu.fileName || 'firestore.rules');
      await datRelease('cloud.firestore', rs);
      console.log('✓ ĐÃ ĐĂNG firestore', rs);
      console.log('Đường lùi:\n  node tools/dang-luat-nhac-han.js --lui ' + cu.rulesetName);
      console.log('Đợi ~1 phút rồi: node tools/dang-luat-nhac-han.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <firestore>');
  } catch (e) { console.error('LỖI:', e.message); process.exit(1); }
})();
