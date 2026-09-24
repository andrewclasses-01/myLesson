// ⭐ 24/09/2026 (web v1.142.0 "ĐỔI HẠN TỪNG CHẶNG") — ĐĂNG LUẬT Firestore qua API `firebaserules`
// bằng khoá quản trị (chép khuôn `dang-luat-han-chang.js` — KHÔNG dán tay Console).
//
// Việc: kho `lessonHan` nhận thêm MỘT trường `hanChang` = map { "<số chặng>": "YYYY-MM-DDTHH:MM" }
// (chuỗi rỗng = đã gỡ). KHÔNG BẮT BUỘC, map ≤ 40 khoá, chỉ thầy ghi được (`laThay()` giữ nguyên).
// Chặng CUỐI vẫn đi bằng trường `han` cũ; `hanChang` chỉ cho các chặng TRƯỚC chặng cuối.
//
//   node dang-luat-han-chang.js --xem | --dang | --kiem | --lui <rulesetName>
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const KF = require('E:/LAP TRINH APP/myLesson/app/src/main/lib/kho-fs');
const PROJECT = 'aword-70dae';
const API = 'https://firebaserules.googleapis.com/v1';
const TAI_LIEU = 'E:/LAP TRINH APP/myLesson-data/tai-lieu';

// ───────── SỬA TẠI CHỖ khối lessonHan ─────────
const DAU_KHOI = 'match /lessonHan/{maThe} {';
const HAS_CU = "['baiId','han','tt','lop','luc','boQua','boQuaChang','tinhCa','moChang']";
const HAS_MOI = "['baiId','han','tt','lop','luc','boQua','boQuaChang','hanChang','tinhCa','moChang']";
// Neo = dòng CUỐI của điều kiện `boQua` (đặt điều kiện mới ngay sau cho dễ đọc).
const NEO = "        && (!('boQuaChang' in request.resource.data)\n"
          + "            || (request.resource.data.boQuaChang is map\n"
          + "                && request.resource.data.boQuaChang.size() <= 40))";
const DK_MOI = "\n        // (24/09/2026, web v1.142.0) hanChang = map {so chang: 'YYYY-MM-DDTHH:MM'} - han rieng TUNG CHANG\n"
             + "        // cua bai STAGE (chuoi rong = da go). Khong bat buoc, chi thay ghi duoc.\n"
             + "        && (!('hanChang' in request.resource.data)\n"
             + "            || (request.resource.data.hanChang is map\n"
             + "                && request.resource.data.hanChang.size() <= 40))";

function ghepFirestore(cu) {
  const dau = cu.indexOf(DAU_KHOI);
  if (dau < 0) throw new Error('CHOT DUNG: không thấy khối lessonHan');
  const cuoiRel = cu.slice(dau).search(/\n\s*allow delete/);
  if (cuoiRel < 0) throw new Error('CHOT DUNG: khối lessonHan không có dòng allow delete');
  const cuoi = dau + cuoiRel;
  let khoi = cu.slice(dau, cuoi);
  if (khoi.includes("'hanChang'")) throw new Error('CHOT DUNG: khối lessonHan ĐÃ có hanChang — không đăng lại');
  if (khoi.split(HAS_CU).length !== 2) throw new Error('CHOT DUNG: không thấy đúng 1 chuỗi hasOnly cũ');
  khoi = khoi.replace(HAS_CU, HAS_MOI);
  if (khoi.split(NEO).length !== 2) throw new Error('CHOT DUNG: không thấy đúng 1 khối điều kiện boQuaChang để neo');
  khoi = khoi.replace(NEO, NEO + DK_MOI);
  return cu.slice(0, dau) + khoi + cu.slice(cuoi);
}

// So hai bản luật theo DÒNG: trả { them: [...], bot: [...] } — để chắc mình chỉ thêm đúng
// những dòng định thêm, không vô tình đụng khối khác (cả file ~700 dòng, 20+ kho).
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
let _token = null;
async function tokenQuanTri() {
  if (_token) return _token;
  const duong = KF.duongKhoa();
  if (!duong) throw new Error('KHOA_THIEU_FILE — chép khoá về máy bằng D:\\APP AND DATA\\_KHOA\\CAI KHOA FIREBASE.bat');
  let raw = fs.readFileSync(duong, 'utf8'); if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const sa = JSON.parse(raw);
  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const phan = b64u({ alg: 'RS256', typ: 'JWT' }) + '.' + b64u({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const ky = crypto.createSign('RSA-SHA256').update(phan).sign(sa.private_key).toString('base64url');
  const r = await goi('https://oauth2.googleapis.com/token', { method: 'POST', form: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(phan + '.' + ky) });
  if (r.status !== 200 || !r.json || !r.json.access_token) throw new Error('KHONG_XIN_DUOC_TOKEN_' + r.status);
  _token = r.json.access_token;
  return _token;
}
async function docRelease(ten) {
  const H = { Authorization: 'Bearer ' + await tokenQuanTri() };
  const r = await goi(`${API}/projects/${PROJECT}/releases/${ten}`, { headers: H });
  if (r.status !== 200) throw new Error('RELEASE_' + ten + '_' + r.status + ' ' + JSON.stringify(r.json));
  const rs = await goi(`${API}/${r.json.rulesetName}`, { headers: H });
  if (rs.status !== 200) throw new Error('RULESET_' + rs.status);
  return { rulesetName: r.json.rulesetName, source: rs.json.source.files.map((f) => f.content).join('\n'), fileName: rs.json.source.files[0].name };
}
async function taoRuleset(source, fileName) {
  const H = { Authorization: 'Bearer ' + await tokenQuanTri() };
  const r = await goi(`${API}/projects/${PROJECT}/rulesets`, { method: 'POST', headers: H, json: { source: { files: [{ name: fileName, content: source }] } } });
  if (r.status !== 200) throw new Error('TAO_RULESET_' + r.status + ' ' + JSON.stringify(r.json));
  return r.json.name;
}
async function datRelease(ten, rulesetName) {
  const H = { Authorization: 'Bearer ' + await tokenQuanTri() };
  const name = `projects/${PROJECT}/releases/${ten}`;
  const r = await goi(`${API}/${name}`, { method: 'PATCH', headers: H, json: { release: { name, rulesetName }, updateMask: 'rulesetName' } });
  if (r.status !== 200) throw new Error('DAT_RELEASE_' + ten + '_' + r.status + ' ' + JSON.stringify(r.json));
  return r.json;
}
function ghiTaiLieu(ten, noiDung) {
  try { fs.mkdirSync(TAI_LIEU, { recursive: true }); fs.writeFileSync(path.join(TAI_LIEU, ten), noiDung, 'utf8'); console.log('  đã ghi', path.join(TAI_LIEU, ten)); } catch (e) { console.log('  (không ghi được tài liệu:', e.message, ')'); }
}
function docConfigWeb() {
  const { P } = require('E:/LAP TRINH APP/myLesson/app/src/main/lib/duongdan');
  const s = fs.readFileSync(path.join(P.web, 'config.js'), 'utf8');
  const pid = /projectId\s*:\s*['"]([^'"]+)['"]/.exec(s), key = /apiKey\s*:\s*['"]([^'"]+)['"]/.exec(s);
  if (!pid || !key) throw new Error('không đọc được projectId/apiKey trong web/config.js');
  return { projectId: pid[1], apiKey: key[1] };
}

// ───────── KIỂM ─────────
// (a) luật ĐANG CHẠY đã có `tinhCa` đúng chỗ; (b) khoá công khai (không đăng nhập) vẫn KHÔNG ghi được.
async function kiem() {
  const fsNay = await docRelease('cloud.firestore');
  const src = fsNay.source;
  const khoi = src.slice(src.indexOf(DAU_KHOI), src.indexOf(DAU_KHOI) + 2000);
  const ok = (t, dk, chu) => console.log((dk ? '  ✓ ' : '  ✗ ') + t + (chu ? ' → ' + chu : ''));
  console.log('cloud.firestore đang chạy:', fsNay.rulesetName);
  ok('khối lessonHan có `hanChang` trong hasOnly', khoi.includes(HAS_MOI));
  ok('có điều kiện kiểu cho `hanChang` (map ≤ 40)',
     /!\('hanChang' in request\.resource\.data\)[\s\S]{0,200}hanChang is map[\s\S]{0,120}size\(\) <= 40/.test(khoi));
  ok('`boQua` + `boQuaChang` + `tinhCa` + `moChang` còn nguyên', ['boQua','boQuaChang','tinhCa','moChang'].every((x) => khoi.includes("'" + x + "' in request")));
  ok('`laThay()` vẫn canh cửa ghi', /allow create, update: if laThay\(\)/.test(khoi));
  // Bản luật CŨ lưu lúc --dang (nếu có) để so từng dòng.
  const duongCu = path.join(TAI_LIEU, '_luat-truoc-han-chang.rules');
  if (fs.existsSync(duongCu)) {
    const d = soDong(fs.readFileSync(duongCu, 'utf8'), src);
    const themSach = d.them.every((x) => x.includes('hanChang') || x.includes('han rieng TUNG CHANG') || x.includes(HAS_MOI));
    const botSach = d.bot.every((x) => x.includes(HAS_CU));
    ok('so với bản trước: CHỈ thêm dòng của hanChang', themSach, d.them.length + ' dòng thêm');
    ok('so với bản trước: chỉ bớt đúng dòng hasOnly cũ', botSach, d.bot.length + ' dòng bớt');
    if (!themSach || !botSach) console.log('    them:', JSON.stringify(d.them), '\n    bot:', JSON.stringify(d.bot));
  } else {
    console.log('  (không có bản luật trước để so từng dòng — chạy --dang sẽ tự lưu)');
  }
  // Khoá công khai: học sinh KHÔNG được ghi lessonHan (luật đóng, không liên quan tinhCa).
  const cfg = docConfigWeb();
  const goc = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents`;
  const k = '?key=' + encodeURIComponent(cfg.apiKey);
  const goiTL = (them) => ({ fields: Object.assign({
    baiId: { stringValue: 'ZTESTBAI' }, han: { stringValue: '2026-09-23T19:30' },
    tt: { stringValue: '' }, lop: { stringValue: 'ZTEST' }, luc: { integerValue: String(Date.now()) },
  }, them || {}) });
  let r = await goi(`${goc}/lessonHan/ZTEST_HANCHANG${k}`, { method: 'PATCH', json: goiTL() });
  ok('khoá công khai ghi lessonHan = 403 (vẫn đóng)', r.status === 403, String(r.status));
  r = await goi(`${goc}/lessonHan/ZTEST_HANCHANG${k}`, { method: 'PATCH',
    json: goiTL({ hanChang: { mapValue: { fields: { '1': { stringValue: '2026-09-23T19:30' } } } } }) });
  ok('khoá công khai ghi kèm hanChang cũng = 403', r.status === 403, String(r.status));
  r = await goi(`${goc}/lessonHan${k}&pageSize=1`);
  ok('đọc lessonHan vẫn mở (học sinh cần đọc hạn) = 200', r.status === 200, String(r.status));
  console.log('\n  ⛔ Đường ghi THẬT (`laThay()`) chỉ thầy đăng nhập dashboard mới thử được:');
  console.log('     mở dashboard → hộp quản lý bài STAGE → bấm ↩ một em trong ô "Không tính ở bài này".');
  console.log('     Hiện toast "đã quay lại danh sách đang tính" = luật OK. Nếu "Kho từ chối ghi" ⇒ lùi:');
  console.log('     node tools/dang-luat-han-chang.js --lui <rulesetName cũ in lúc --dang>');
}

(async () => {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-dang-chay-firestore.rules', fsCu.source);
      const thu = ghepFirestore(fsCu.source);
      ghiTaiLieu('_luat-thu-han-chang.rules', thu);
      const d = soDong(fsCu.source, thu);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      const fsMoi = ghepFirestore(fsCu.source);
      ghiTaiLieu('_luat-truoc-han-chang.rules', fsCu.source);   // để --kiem so từng dòng
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rsFs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rsFs);
      await datRelease('cloud.firestore', rsFs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-han-chang.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-han-chang.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('⛔', e.message); process.exit(1); }
})();
