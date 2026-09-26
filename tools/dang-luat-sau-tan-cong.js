// ⭐ 27/09/2026 — VÁ SAU TẤN CÔNG "Tr0ngX" (26/09 tối: 1.230 tin rác chat 8 lớp, 141 điểm giả
// 9.999.999 ở 34 bài AWord, 2 bài myNetwork giả "Thầy Andrew" tích GV, 3 tài khoản tự đăng ký).
// Chép khuôn `dang-luat-han-chang.js`: sửa TẠI CHỖ từ bản luật ĐANG CHẠY, mỗi chỗ sửa có CHỐT DỪNG.
//
//   node dang-luat-sau-tan-cong.js --xem           ghép thử, in khác biệt từng dòng (chưa đăng)
//   node dang-luat-sau-tan-cong.js --dang          đăng luật Firestore mới
//   node dang-luat-sau-tan-cong.js --kiem          thử bằng HTTP thật (khoá công khai) + dọn tài liệu thử
//   node dang-luat-sau-tan-cong.js --lui <rulesetName>
//   node dang-luat-sau-tan-cong.js --tat-dang-ky   tắt "ai cũng tự tạo được tài khoản Firebase"
//   node dang-luat-sau-tan-cong.js --don-rac       sao lưu + xoá 2 bài nwPosts + 4 practiceLog rác, khoá 3 tài khoản kẻ tấn công
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const KF = require('E:/LAP TRINH APP/myLesson/app/src/main/lib/kho-fs');
const PROJECT = 'aword-70dae';
const API = 'https://firebaserules.googleapis.com/v1';
const TAI_LIEU = 'E:/LAP TRINH APP/myLesson-data/tai-lieu';
const SAO_LUU = 'E:/LAP TRINH APP/_SAO LUU FIRESTORE';

// Thay đúng MỘT chỗ; không thấy hoặc thấy >1 ⇒ dừng.
function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
// Chèn `them` ngay TRƯỚC lần xuất hiện đầu tiên của `neo` sau `dauKhoi`; neo phải đứng trước `truocKhi`.
function chenTrongKhoi(s, dauKhoi, neo, them, ten, truocKhi) {
  const d = s.indexOf(dauKhoi);
  if (d < 0 || s.indexOf(dauKhoi, d + 1) >= 0) throw new Error('CHOT DUNG [' + ten + ']: khối không duy nhất');
  const i = s.indexOf(neo, d);
  if (i < 0) throw new Error('CHOT DUNG [' + ten + ']: không thấy neo');
  if (truocKhi) { const j = s.indexOf(truocKhi, d); if (j < 0 || j < i) throw new Error('CHOT DUNG [' + ten + ']: neo nằm sai chỗ'); }
  return s.slice(0, i) + them + s.slice(i);
}

const LOC_LINK_TEN = "'.*(https?:|www[.]|[.]com|[.]net|t[.]me|discord).*'";

function ghepFirestore(cu) {
  if (cu.includes('function nwTacGiaDung(')) throw new Error('CHOT DUNG: luật ĐÃ có bản vá sau tấn công — không đăng lại');
  let s = cu;
  // 1) myNetwork: chỉ tài khoản CÓ HỒ SƠ (hoặc thầy) mới vào; tên + tích GV phải khớp hồ sơ.
  s = thayMot(s, '    function nwVao() { return request.auth != null; }',
    '    // (27/09/2026, sau tan cong Tr0ngX) chi tai khoan CO HO SO nwUsers (hoc sinh do cong cu tao) hoac thay.\n' +
    '    // Truoc do: ai tu dang ky tai khoan Firebase cung vao duoc.\n' +
    '    function nwVao() {\n' +
    '      return request.auth != null\n' +
    '          && (laThay() || exists(/databases/$(database)/documents/nwUsers/$(request.auth.uid)));\n' +
    '    }\n' +
    '    // Ten + tich GV tren bai / binh luan phai KHOP ho so that (truoc do tu khai => gia "Thay Andrew" tich GV).\n' +
    '    function nwTacGiaDung(tg) {\n' +
    '      return laThay() || (tg.uid == nwToi()\n' +
    '          && tg.ten == nwHoSo(nwToi()).ten\n' +
    "          && tg.get('vaiTro', 'hs') == nwHoSo(nwToi()).get('vaiTro', 'hs'));\n" +
    '    }\n' +
    '    function nwTenDung(ten) { return laThay() || ten == nwHoSo(nwToi()).ten; }', 'nwVao');
  // 2) nwPosts create: tác giả thật, nhãn lớp 'GV' chỉ thầy, bài chia sẻ phải trỏ đúng bài gốc thật.
  s = chenTrongKhoi(s, '    match /nwPosts/{id} {', '        && request.resource.data.luc is number;\n',
    '        // (27/09/2026) tac gia that + lop GV chi thay + bai chia se phai khop bai goc that\n' +
    '        && nwTacGiaDung(request.resource.data.tacGia)\n' +
    "        && (request.resource.data.get('lop', '') != 'GV' || laThay())\n" +
    "        && (request.resource.data.get('goc', null) == null || laThay()\n" +
    '            || (request.resource.data.chiaSeTu is string\n' +
    '                && get(/databases/$(database)/documents/nwPosts/$(request.resource.data.chiaSeTu)).data.uid == request.resource.data.goc.uid\n' +
    '                && get(/databases/$(database)/documents/nwPosts/$(request.resource.data.chiaSeTu)).data.tacGia == request.resource.data.goc.tacGia\n' +
    '                && get(/databases/$(database)/documents/nwPosts/$(request.resource.data.chiaSeTu)).data.chu == request.resource.data.goc.chu))\n',
    'nwPosts', '      allow update: if nwVao() && (');
  // 3) binhLuan create: tác giả thật.
  s = chenTrongKhoi(s, '      match /binhLuan/{cid} {', '          && request.resource.data.luc is number;\n',
    '          && nwTacGiaDung(request.resource.data.tacGia)   // (27/09/2026)\n', 'binhLuan', '        allow update: if nwVao() && (');
  // 4) tin nhắn riêng/nhóm: tên người gửi thật.
  s = chenTrongKhoi(s, '      match /tin/{mid} {', '          && request.resource.data.luc is number;\n',
    "          && nwTenDung(request.resource.data.get('ten', ''))   // (27/09/2026)\n", 'tin', '        allow update: if nwVao()');
  // 5) thông báo gửi người khác: tên người gửi thật.
  s = thayMot(s, "          && request.resource.data.keys().hasOnly(['loai', 'tu', 'tuTen', 'tuAnh', 'chu', 'link', 'luc', 'daDoc'])\n",
    "          && request.resource.data.keys().hasOnly(['loai', 'tu', 'tuTen', 'tuAnh', 'chu', 'link', 'luc', 'daDoc'])\n" +
    "          && nwTenDung(request.resource.data.get('tuTen', ''))   // (27/09/2026)\n", 'thongBao');
  // 6) Bảng xếp hạng AWord: điểm hợp lý + tên không chứa link (8.281 điểm thật từ trước tới nay: 0 vi phạm).
  s = chenTrongKhoi(s, '      match /scores/{scoreId} {', '                      && request.resource.data.createdAt is int\n',
    '                      // (27/09/2026, sau tan cong Tr0ngX: 9.999.999 diem) diem hop ly + ten khong chua link\n' +
    '                      && request.resource.data.score >= 0\n' +
    '                      && request.resource.data.score <= request.resource.data.total\n' +
    '                      && request.resource.data.timeMs >= 0\n' +
    '                      && !request.resource.data.name.lower().matches(' + LOC_LINK_TEN + ')\n', 'scores');
  // 7) results: như trên.
  s = chenTrongKhoi(s, '    match /results/{resultId} {', '                    && request.resource.data.total is int\n',
    '                    // (27/09/2026) diem hop ly + ten khong chua link\n' +
    '                    && request.resource.data.score >= 0\n' +
    '                    && request.resource.data.score <= request.resource.data.total\n' +
    '                    && !request.resource.data.studentName.lower().matches(' + LOC_LINK_TEN + ')\n', 'results');
  // 8) Chat lớp: DẤU MÁY bắt buộc (mọi tin thật từ web v1.80 đều có) + chặn link rác.
  s = thayMot(s,
    "        && (!request.resource.data.keys().hasAny(['may'])\n" +
    '            || (request.resource.data.may is string\n' +
    '                && request.resource.data.may.size() <= 20));\n',
    '        // (27/09/2026, sau tan cong Tr0ngX) DAU MAY bat buoc - 1.723 tin that 7 ngay deu co, 1.230 tin rac deu khong.\n' +
    '        && request.resource.data.may is string\n' +
    '        && request.resource.data.may.size() >= 6\n' +
    '        && request.resource.data.may.size() <= 20\n' +
    "        && !request.resource.data.text.lower().matches('(?s).*(discord[.]|t[.]me/).*');\n", 'classChat');
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


const FS_GOC = () => `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const DB = `projects/${PROJECT}/databases/(default)`;
async function xoaTaiLieu(paths) {
  if (!paths.length) return 0;
  const H = { Authorization: 'Bearer ' + await tokenQuanTri() };
  const r = await goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit`, { method: 'POST', headers: H, json: { writes: paths.map((p) => ({ delete: DB + '/documents/' + p })) } });
  if (r.status !== 200) throw new Error('XOA_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  return r.json.writeResults.length;
}

// ───────── KIỂM (khoá CÔNG KHAI như người lạ; tài liệu thử ghi vào chỗ ZTEST rồi xoá ngay) ─────────
async function kiem() {
  const cfg = docConfigWeb();
  const k = '?key=' + encodeURIComponent(cfg.apiKey);
  const goc = FS_GOC();
  const ok = (t, dk, chu) => { console.log((dk ? '  ✓ ' : '  ✗ ') + t + (chu ? ' → ' + chu : '')); if (!dk) kiem.hong = true; };
  const nay = Date.now(), rac = [];
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) });
  const chat = (them) => ({ fields: Object.assign({ name: S('ZTEST'), code: S('ZTEST'), role: S('hs'), text: S('thu luat'), createdAt: I(nay) }, them) });
  const ghi = async (p, body) => { const r = await goi(`${goc}/${p}${k}`, { method: 'PATCH', json: body }); if (r.status === 200) rac.push(p); return r.status; };
  console.log('luật đang chạy:', (await docRelease('cloud.firestore')).rulesetName);
  ok('chat KHÔNG dấu máy = 403', await ghi('classChat/ZTEST/messages/t1', chat({})) === 403);
  ok('chat có link discord = 403', await ghi('classChat/ZTEST/messages/t2', chat({ may: S('abcdefghij'), text: S('xem discord.com/users/1') })) === 403);
  ok('chat bình thường có dấu máy = 200', await ghi('classChat/ZTEST/messages/t3', chat({ may: S('abcdefghij') })) === 200);
  ok('chat giả thầy (role gv) = 403', await ghi('classChat/ZTEST/messages/t4', chat({ may: S('abcdefghij'), role: S('gv') })) === 403);
  const diem = (them) => ({ fields: Object.assign({ name: S('ZTEST'), score: I(5), total: I(10), timeMs: I(1000), createdAt: I(nay) }, them) });
  ok('điểm > tổng = 403', await ghi('assignments/ZTEST/scores/s1', diem({ score: I(9999999) })) === 403);
  ok('tên chứa link = 403', await ghi('assignments/ZTEST/scores/s2', diem({ name: S('discord.com/123') })) === 403);
  ok('điểm âm = 403', await ghi('assignments/ZTEST/scores/s3', diem({ score: I(-1) })) === 403);
  ok('điểm bình thường = 200', await ghi('assignments/ZTEST/scores/s4', diem({})) === 200);
  const kq = (them) => ({ fields: Object.assign({ assignmentId: S('ZTEST'), studentName: S('ZTEST'), score: I(5), total: I(10), timeMs: I(1000), createdAt: I(nay), review: { arrayValue: {} } }, them) });
  ok('results điểm > tổng = 403', await ghi('results/ZTEST_r1', kq({ score: I(11) })) === 403);
  ok('results bình thường = 200', await ghi('results/ZTEST_r2', kq({})) === 200);
  ok('nwPosts không đăng nhập = 403', await ghi('nwPosts/ZTEST_p1', { fields: { uid: S('x'), chu: S('x') } }) === 403);
  console.log('  dọn', await xoaTaiLieu(rac), 'tài liệu thử:', rac.join(', '));
  const src = (await docRelease('cloud.firestore')).source;
  ok('myNetwork: nwVao đòi hồ sơ nwUsers', src.includes('exists(/databases/$(database)/documents/nwUsers/$(request.auth.uid))'));
  ok('myNetwork: 4 chỗ kiểm tên thật (bài, bình luận, tin, thông báo)', (src.match(/nwTacGiaDung\(request|nwTenDung\(request/g) || []).length === 4);
  console.log('\n  ⛔ myNetwork chỉ thử được bằng tay: vào trang thử bằng một tài khoản học sinh → đăng 1 bài, bình luận,');
  console.log('     nhắn 1 tin, chia sẻ 1 bài. Có lỗi "không có quyền" ⇒ lùi bằng --lui <ruleset cũ in lúc --dang>.');
  if (kiem.hong) process.exitCode = 1;
}

// ───────── TẮT TỰ ĐĂNG KÝ tài khoản Firebase ─────────
// Không app nào tự tạo tài khoản (đã tìm createUserWithEmailAndPassword/signUp khắp E:\LAP TRINH APP: 0 chỗ);
// 159 tài khoản học sinh do công cụ tạo bằng khoá quản trị — việc đó KHÔNG bị ảnh hưởng.
async function tatDangKy() {
  const H = { Authorization: 'Bearer ' + await tokenQuanTri() };
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config`;
  const r = await goi(url + '?updateMask=client.permissions.disabledUserSignup', { method: 'PATCH', headers: H, json: { client: { permissions: { disabledUserSignup: true } } } });
  console.log('tắt tự đăng ký:', r.status, JSON.stringify(r.json && r.json.client && r.json.client.permissions));
  console.log('  lùi lại: Console → Authentication → Settings → User actions → bật lại "Enable create (sign-up)".');
}

// ───────── DỌN RÁC CÒN LẠI ─────────
async function donRac() {
  const H = { Authorization: 'Bearer ' + await tokenQuanTri() };
  const paths = ['nwPosts/ItFxhUlJ4gczxzNH4nhC', 'nwPosts/faCxz1IfTrk5JWCyoQNF',
    'practiceLog/2dxssr/entries/pl1790439465278x3n6u', 'practiceLog/2dxssr/entries/pl1790439716708xr73v',
    'practiceLog/6tkxsv/entries/pl1790439699495xequm', 'practiceLog/bw4q96/entries/pl1790439586253xthaz'];
  const uids = ['6UgCATWf5YQ9BMwo5GP6lElSfww2', 'cbRFQKxLj7gnUP1te1np4Vdk6VB3', 'TwGGfsGQOBbqMVe6BpSbgiR2iuU2'];
  const r = await goi(`https://firestore.googleapis.com/v1/${DB}/documents:batchGet`, { method: 'POST', headers: H, json: { documents: paths.map((p) => DB + '/documents/' + p) } });
  const bk = (r.json || []).filter((x) => x.found).map((x) => x.found);
  const dau = /tr0ng|1315296425273462786/i;
  bk.forEach((d) => console.log(' ', d.name.split('/documents/')[1], dau.test(JSON.stringify(d)) ? 'có dấu Tr0ngX' : 'KHÔNG CÓ DẤU'));
  if (!bk.every((d) => dau.test(JSON.stringify(d)))) throw new Error('CHOT DUNG: có tài liệu không mang dấu Tr0ngX');
  const acc = await goi(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, { method: 'POST', headers: H, json: { localId: uids } });
  const out = path.join(SAO_LUU, 'RAC CON LAI Tr0ngX 26-09-2026 (truoc khi xoa).json');
  fs.writeFileSync(out + '.tmp', JSON.stringify({ taiLieu: bk, taiKhoan: (acc.json && acc.json.users) || [] }, null, 1), 'utf8');
  fs.renameSync(out + '.tmp', out);
  console.log('  sao lưu:', out);
  console.log('  xoá', await xoaTaiLieu(bk.map((d) => d.name.split('/documents/')[1])), 'tài liệu');
  for (const u of uids) {
    const d = await goi(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, { method: 'POST', headers: H, json: { localId: u, disableUser: true } });
    console.log('  khoá tài khoản', u, d.status === 200 ? 'OK' : d.status);
  }
}

(async () => {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    if (a.includes('--kiem')) { await kiem(); return; }
    if (a.includes('--tat-dang-ky')) { await tatDangKy(); return; }
    if (a.includes('--don-rac')) { await donRac(); return; }
    const fsCu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName);
    const fsMoi = ghepFirestore(fsCu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-sau-tan-cong.rules', fsMoi);
      const d = soDong(fsCu.source, fsMoi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt từng dòng:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-sau-tan-cong.rules', fsCu.source);
      ghiTaiLieu('_luat-moi-firestore.rules', fsMoi);
      const rs = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-sau-tan-cong.js --lui ' + fsCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-sau-tan-cong.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName> | --tat-dang-ky | --don-rac');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
