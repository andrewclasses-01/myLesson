// 🚨 27/09/2026 (web v1.156.0) — LUẬT CÔNG TẮC KHẨN CẤP + VÁ LỖ NHỎ (phương án B + D, sau tấn công Tr0ngX).
// Chép khuôn `dang-luat-sau-tan-cong.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, mỗi chỗ sửa có CHỐT DỪNG.
//
//   node dang-luat-khan-cap.js --xem | --dang | --kiem | --lui <rulesetName>
//   node dang-luat-khan-cap.js --khan-cap xem | bat-chat | bat-diem | bat-ca | tat   (ghi bằng khoá quản trị)
//
// Luật thêm:
//   · lessonWeb/khanCap { khoaChat, khoaDiem, luc, lyDo } — ai cũng đọc, CHỈ thầy ghi.
//   · classChat create: khoaChat ⇒ từ chối (trừ thầy).  scores + results create: khoaDiem ⇒ từ chối.
//   · (D) dashLopThuTu: chỉ thầy ghi.  practiceLog: 0 ≤ score/total ≤ 5000, tên không chứa link.
//     (practiceLog KHÔNG dùng score ≤ total: lượt bỏ dở hợp lệ ghi total = 0 — AWord play.js leave().)
//   · spSubmissions GIỮ NGUYÊN delete mở: học sinh "bỏ đánh dấu nộp" = deleteDoc (bai-sp.html).
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const KF = require('E:/LAP TRINH APP/myLesson/app/src/main/lib/kho-fs');
const PROJECT = 'aword-70dae';
const API = 'https://firebaserules.googleapis.com/v1';
const TAI_LIEU = 'E:/LAP TRINH APP/myLesson-data/tai-lieu';

function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function thayTrongKhoi(s, dauKhoi, cu, moi, ten) {
  const d = s.indexOf(dauKhoi);
  if (d < 0 || s.indexOf(dauKhoi, d + 1) >= 0) throw new Error('CHOT DUNG [' + ten + ']: khối không duy nhất');
  const i = s.indexOf(cu, d);
  if (i < 0) throw new Error('CHOT DUNG [' + ten + ']: không thấy chỗ sửa trong khối');
  const ketKhoi = s.indexOf('\n    }\n', d);
  if (ketKhoi >= 0 && i > ketKhoi && ten !== 'practiceLog') throw new Error('CHOT DUNG [' + ten + ']: chỗ sửa nằm ngoài khối');
  return s.slice(0, i) + moi + s.slice(i + cu.length);
}
const LOC_LINK_TEN = "'.*(https?:|www[.]|[.]com|[.]net|t[.]me|discord).*'";

function ghepFirestore(cu) {
  if (cu.includes('function khanCap(')) throw new Error('CHOT DUNG: luật ĐÃ có công tắc khẩn cấp — không đăng lại');
  if (!cu.includes('function nwTacGiaDung(')) throw new Error('CHOT DUNG: luật đang chạy CHƯA có bản vá 27/09 (d30455f5) — kiểm lại');
  let s = cu;
  // 1) hàm khanCap(k) ngay sau laThay()
  s = thayMot(s, '    // ═══ myNetwork (20/09/2026)',
    '    // (27/09/2026) CONG TAC KHAN CAP: lessonWeb/khanCap { khoaChat, khoaDiem } - thay bat tu dashboard (nut 🚨)\n' +
    '    // hoac chuong bao dong tren may thay tu bat khi thay rac hang loat. Thieu tai lieu = KHONG khoa.\n' +
    '    function khanCap(k) {\n' +
    '      return exists(/databases/$(database)/documents/lessonWeb/khanCap)\n' +
    '          && get(/databases/$(database)/documents/lessonWeb/khanCap).data.get(k, false) == true;\n' +
    '    }\n\n' +
    '    // ═══ myNetwork (20/09/2026)', 'ham khanCap');
  // 2) tài liệu công tắc
  s = thayMot(s, '    match /lessonWeb/{doc} {\n      allow read: if true;\n      allow write: if false;\n    }\n',
    '    match /lessonWeb/{doc} {\n      allow read: if true;\n      allow write: if false;\n    }\n' +
    '    // (27/09/2026) cong tac khan cap - ai cung doc (trang HS hien chu "tam khoa"), CHI thay ghi.\n' +
    '    match /lessonWeb/khanCap {\n' +
    '      allow read: if true;\n' +
    "      allow create, update: if laThay()\n" +
    "        && request.resource.data.keys().hasOnly(['khoaChat', 'khoaDiem', 'luc', 'lyDo'])\n" +
    "        && request.resource.data.get('khoaChat', false) is bool\n" +
    "        && request.resource.data.get('khoaDiem', false) is bool\n" +
    "        && request.resource.data.get('lyDo', '') is string\n" +
    "        && request.resource.data.get('lyDo', '').size() <= 200;\n" +
    '      allow delete: if false;\n' +
    '    }\n', 'lessonWeb/khanCap');
  // 3) chat: khoaChat
  s = thayMot(s, "        && !request.resource.data.text.lower().matches('(?s).*(discord[.]|t[.]me/).*');\n",
    "        && !request.resource.data.text.lower().matches('(?s).*(discord[.]|t[.]me/).*')\n" +
    "        && (!khanCap('khoaChat') || laThay());   // (27/09/2026) cong tac khan cap\n", 'classChat');
  // 4) scores + results: khoaDiem
  s = thayMot(s, "                      && !request.resource.data.name.lower().matches(" + LOC_LINK_TEN + ")\n",
    "                      && !request.resource.data.name.lower().matches(" + LOC_LINK_TEN + ")\n" +
    "                      && !khanCap('khoaDiem')   // (27/09/2026) cong tac khan cap\n", 'scores');
  s = thayMot(s, "                    && !request.resource.data.studentName.lower().matches(" + LOC_LINK_TEN + ")\n",
    "                    && !request.resource.data.studentName.lower().matches(" + LOC_LINK_TEN + ")\n" +
    "                    && !khanCap('khoaDiem')   // (27/09/2026) cong tac khan cap\n", 'results');
  // 5) (D) dashLopThuTu chỉ thầy
  s = thayTrongKhoi(s, '    match /dashLopThuTu/{id} {', '      allow create, update: if request.resource.data.keys().hasOnly(',
    '      // (27/09/2026) CHI THAY - truoc do nguoi la dao duoc thu tu the lop tren dashboard.\n' +
    '      allow create, update: if laThay() && request.resource.data.keys().hasOnly(', 'dashLopThuTu');
  // 6) (D) practiceLog: điểm trong khoảng + tên không chứa link
  s = thayTrongKhoi(s, '            match /practiceLog/{code}/entries/{entryId} {', '                && request.resource.data.total is int\n',
    '                && request.resource.data.total is int\n' +
    '                // (27/09/2026, sau tan cong Tr0ngX) diem trong khoang + ten khong chua link. KHONG dung score <= total:\n' +
    '                // luot BO DO hop le ghi total = 0 (AWord play.js leave()).\n' +
    '                && request.resource.data.score >= 0 && request.resource.data.score <= 5000\n' +
    '                && request.resource.data.total >= 0 && request.resource.data.total <= 5000\n' +
    '                && !request.resource.data.name.lower().matches(' + LOC_LINK_TEN + ')\n', 'practiceLog');
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


const DB = `projects/${PROJECT}/databases/(default)`;
const FS_GOC = `https://firestore.googleapis.com/v1/${DB}/documents`;
async function xoaTaiLieu(paths) {
  if (!paths.length) return 0;
  const H = { Authorization: 'Bearer ' + await tokenQuanTri() };
  const r = await goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit`, { method: 'POST', headers: H, json: { writes: paths.map((p) => ({ delete: DB + '/documents/' + p })) } });
  if (r.status !== 200) throw new Error('XOA_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  return r.json.writeResults.length;
}

// ───────── CÔNG TẮC (khoá quản trị — dùng khi thầy nhắn "bị tấn công", và cho chuông báo động) ─────────
async function docCongTac() {
  const H = { Authorization: 'Bearer ' + await tokenQuanTri() };
  const r = await goi(`${FS_GOC}/lessonWeb/khanCap`, { headers: H });
  if (r.status === 404) return { khoaChat: false, khoaDiem: false, luc: 0, lyDo: '' };
  if (r.status !== 200) throw new Error('DOC_' + r.status);
  const f = r.json.fields || {};
  return { khoaChat: !!(f.khoaChat && f.khoaChat.booleanValue), khoaDiem: !!(f.khoaDiem && f.khoaDiem.booleanValue),
           luc: Number(f.luc && (f.luc.integerValue || f.luc.doubleValue)) || 0, lyDo: (f.lyDo && f.lyDo.stringValue) || '' };
}
async function datCongTac(vao) {
  const H = { Authorization: 'Bearer ' + await tokenQuanTri() };
  const fields = { luc: { integerValue: String(Date.now()) } };
  if ('khoaChat' in vao) fields.khoaChat = { booleanValue: !!vao.khoaChat };
  if ('khoaDiem' in vao) fields.khoaDiem = { booleanValue: !!vao.khoaDiem };
  fields.lyDo = { stringValue: String(vao.lyDo || '').slice(0, 200) };
  const mask = Object.keys(fields).map((k) => 'updateMask.fieldPaths=' + k).join('&');
  const r = await goi(`${FS_GOC}/lessonWeb/khanCap?${mask}`, { method: 'PATCH', headers: H, json: { fields } });
  if (r.status !== 200) throw new Error('GHI_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  return docCongTac();
}

// ───────── KIỂM (khoá CÔNG KHAI như người lạ; chỗ thử ZTEST, dọn ngay) ─────────
async function kiem() {
  const cfg = docConfigWeb();
  const k = '?key=' + encodeURIComponent(cfg.apiKey);
  const ok = (t, dk, chu) => { console.log((dk ? '  ✓ ' : '  ✗ ') + t + (chu ? ' → ' + chu : '')); if (!dk) kiem.hong = true; };
  const nay = Date.now(), rac = [];
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) }), B = (v) => ({ booleanValue: v });
  const ghi = async (p, body) => { const r = await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', json: body }); if (r.status === 200) rac.push(p); return r.status; };
  const chat = (id) => ghi('classChat/ZTEST/messages/' + id, { fields: { name: S('ZTEST'), code: S('ZTEST'), role: S('hs'), text: S('thu'), createdAt: I(nay), may: S('abcdefghij') } });
  const diem = (id) => ghi('assignments/ZTEST/scores/' + id, { fields: { name: S('ZTEST'), score: I(5), total: I(10), timeMs: I(1000), createdAt: I(nay) } });
  const kq = (id) => ghi('results/' + id, { fields: { assignmentId: S('ZTEST'), studentName: S('ZTEST'), score: I(5), total: I(10), timeMs: I(1000), createdAt: I(nay), review: { arrayValue: {} } } });
  const pl = (id, them) => ghi('practiceLog/ZTEST/entries/' + id, { fields: Object.assign({ name: S('ZTEST'), mode: S('practice'), again: B(false), mistakes: B(false), score: I(3), total: I(0), timeMs: I(1000), done: B(false), attemptId: S('ZTEST'), createdAt: I(nay), updatedAt: I(nay) }, them || {}) });
  const truoc = await docCongTac();
  console.log('luật đang chạy:', (await docRelease('cloud.firestore')).rulesetName, '| công tắc hiện tại:', JSON.stringify(truoc));
  try {
    ok('người lạ GHI công tắc khẩn cấp = 403', await ghi('lessonWeb/khanCap', { fields: { khoaChat: B(false) } }) === 403);
    ok('người lạ đổi thứ tự lớp dashboard = 403', await ghi('dashLopThuTu/ZTEST', { fields: { dsLop: { arrayValue: {} }, dsKhoa: { arrayValue: {} }, luc: I(nay) } }) === 403);
    ok('practiceLog lượt bỏ dở (score 3, total 0) = 200', await pl('p1') === 200);
    ok('practiceLog điểm 9.999.999 = 403', await pl('p2', { score: I(9999999) }) === 403);
    ok('practiceLog tên chứa link = 403', await pl('p3', { name: S('t.me/abc') }) === 403);
    await datCongTac({ khoaChat: false, khoaDiem: false, lyDo: 'kiem luat' });
    ok('KHÔNG khẩn cấp: chat = 200', await chat('c1') === 200);
    ok('KHÔNG khẩn cấp: điểm = 200', await diem('s1') === 200);
    await datCongTac({ khoaChat: true, khoaDiem: true, lyDo: 'kiem luat' });
    await new Promise((r) => setTimeout(r, 1500));
    ok('BẬT khẩn cấp: chat = 403', await chat('c2') === 403);
    ok('BẬT khẩn cấp: điểm = 403', await diem('s2') === 403);
    ok('BẬT khẩn cấp: results = 403', await kq('ZTEST_r9') === 403);
  } finally {
    await datCongTac({ khoaChat: truoc.khoaChat, khoaDiem: truoc.khoaDiem, lyDo: truoc.lyDo });
    console.log('  trả công tắc về:', JSON.stringify(await docCongTac()));
    console.log('  dọn', await xoaTaiLieu(rac), 'tài liệu thử:', rac.join(', '));
  }
  if (kiem.hong) process.exitCode = 1;
}

(async () => {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a[0] === '--khan-cap') {
      const lenh = a[1] || 'xem';
      const bang = { 'bat-chat': { khoaChat: true }, 'bat-diem': { khoaDiem: true }, 'bat-ca': { khoaChat: true, khoaDiem: true }, 'tat': { khoaChat: false, khoaDiem: false } };
      if (lenh !== 'xem' && !bang[lenh]) throw new Error('lệnh công tắc: xem | bat-chat | bat-diem | bat-ca | tat');
      const kq = lenh === 'xem' ? await docCongTac() : await datCongTac(Object.assign({ lyDo: a.slice(2).join(' ') || (lenh === 'tat' ? '' : 'Claude bat theo lenh thay') }, bang[lenh]));
      console.log('công tắc khẩn cấp:', JSON.stringify(kq));
      return;
    }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-khan-cap.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-khan-cap.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-khan-cap.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-khan-cap.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName> | --khan-cap xem|bat-chat|bat-diem|bat-ca|tat');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
