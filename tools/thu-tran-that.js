// 15/10/2026 — THỬ MỘT TRẬN THẬT đầu-cuối (đấu game online Đợt 2): 2 tài khoản ZTEST mời/nhận/gửi từ/rời trận ⇒ kiểm tdTao·tdDoi·tdTu·tdNhip + bảng giải + lịch sử; dọn sạch.
//   node tools/thu-tran-that.js   (cần khoá quản trị như các công cụ dang-luat-*; cần app myLesson ở E: để nạp ws-chu.js)
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



// ───────── THỬ MỘT TRẬN THẬT (hàm máy chủ đã đưa lên) — tài khoản ZTEST, dọn sạch ─────────
const CHU = require('E:/LAP TRINH APP/myLesson/app/may-chu/functions/ws-chu.js');
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
async function thuTran() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, dk, them) => { console.log((dk ? '  ✓ ' : '  ✗ ') + t + (them ? '  ' + them : '')); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b });
  const L = (a) => ({ arrayValue: { values: a } });
  const val = (v) => v == null ? undefined : 'stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'booleanValue' in v ? v.booleanValue
    : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([a, b]) => [a, val(b)])) : 'arrayValue' in v ? (v.arrayValue.values || []).map(val) : v;
  const docv = (j) => j && j.fields ? Object.fromEntries(Object.entries(j.fields).map(([a, b]) => [a, val(b)])) : null;
  const LOP = 'ZTESTTD2', A = 'hs_9999981', Bb = 'hs_9999982', bay = Date.now(), GIAI = 'ztest_giai_tran_' + bay;
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb, 'giaiDau/' + GIAI, 'giaiDau/' + GIAI + '/bang/' + LOP, 'tdLichSu/' + A, 'tdLichSu/' + Bb];
  let ID = null;
  try {
    const hs = (uid, ten) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(LOP), cacLop: L([S(LOP)]), anh: S(''), capNhat: I(bay) });
    await hs(A, 'ZTEST AN'); await hs(Bb, 'ZTEST BINH');
    await ghiAdmin('giaiDau/' + GIAI, { ten: S('ZTEST CUP'), lops: L([S(LOP)]), game: S('aShowSpeed'), phut: I(2), lv: S('easy'), tu: I(bay - 60000), den: I(bay + 3600e3), sao: L([I(1), I(1), I(1)]), dong: B(false) });
    const tA = await taoTkThu(A, 'ZTEST9999981', { hs: true, ma: 'ZTEST9999981', lop: LOP, lops: LOP, msId: 0 });
    const tB = await taoTkThu(Bb, 'ZTEST9999982', { hs: true, ma: 'ZTEST9999982', lop: LOP, lops: LOP, msId: 0 });
    const H2 = (t) => ({ Authorization: 'Bearer ' + t });
    const t0 = Date.now();
    const r = await goi(`${FS_GOC}/tranDau${k}`, { method: 'POST', headers: H2(tA), json: { fields: { a: S(A), b: S(Bb), nguoi: L([S(A), S(Bb)]), tenA: S('ZTEST AN'), tenB: S('ZTEST BINH'),
      lop: S(LOP), giai: S(GIAI), phut: I(2), lv: S('easy'), trangThai: S('moi'), taoLuc: I(t0), het: I(t0 + 60000) } } });
    ok('A mời B', r.status === 200, r.status);
    ID = r.json.name.split('/').pop(); xoa.unshift('tranDau/' + ID);
    const tran = async () => docv((await goi(`${FS_GOC}/tranDau/${ID}`, { headers: await H() })).json);
    // tdTao: thông báo cho B
    let tb = null;
    for (let i = 0; i < 20 && !tb; i++) { await ngu(1000); const q = await goi(`${FS_GOC}/nwUsers/${Bb}/thongBao?pageSize=5`, { headers: await H() }); tb = (q.json.documents || [])[0]; }
    ok('máy chủ báo B có lời mời (tdTao)', !!tb, tb ? JSON.stringify(docv(tb)).slice(0, 120) : 'không thấy sau 20 giây');
    if (tb) xoa.push(tb.name.split('/documents/')[1]);
    const n = await goi(`${FS_GOC}/tranDau/${ID}${k}&updateMask.fieldPaths=trangThai`, { method: 'PATCH', headers: H2(tB), json: { fields: { trangThai: S('nhan') } } });
    ok('B nhận', n.status === 200, n.status);
    let t = null;
    for (let i = 0; i < 25; i++) { await ngu(1000); t = await tran(); if (t.trangThai === 'choi') break; }
    ok('máy chủ xếp chữ + giờ (tdDoi)', t && t.trangThai === 'choi' && /^[A-Z]{16}$/.test(t.chu || ''), t ? t.trangThai + ' ' + t.chu + ' batDau-mocMay=' + (t.batDau - t.mocMay) + 'ms' : '');
    if (!t || t.trangThai !== 'choi') return;
    const ws = CHU.wordsOn(t.chu.split(''), 2).sort((x, y) => y.length - x.length);
    const w1 = ws[0], w2 = ws[1], w3 = ws[2];
    const gui = (tk, uid, w) => goi(`${FS_GOC}/tranDau/${ID}/tu${k}&documentId=${w}`, { method: 'POST', headers: H2(tk), json: { fields: { uid: S(uid) } } });
    ok('A gửi trước giờ bắt đầu bị chặn', (await gui(tA, A, ws[3])).status === 403);
    await ngu(Math.max(0, t.batDau - Date.now() + 300));
    ok('A gửi "' + w1 + '"', (await gui(tA, A, w1)).status === 200);
    ok('A gửi "' + w2 + '"', (await gui(tA, A, w2)).status === 200);
    ok('B gửi lại "' + w1 + '" ⇒ Taken (403)', [403, 409].includes((await gui(tB, Bb, w1)).status));
    ok('B gửi "' + w3 + '"', (await gui(tB, Bb, w3)).status === 200);
    ok('B gửi từ bậy "qqqq" (luật cho tạo, máy chủ chấm 0)', (await gui(tB, Bb, 'qqqq')).status === 200);
    ['tu/' + w1, 'tu/' + w2, 'tu/' + w3, 'tu/qqqq', 'nhip/' + A, 'nhip/' + Bb].forEach((p) => xoa.unshift('tranDau/' + ID + '/' + p));
    await ngu(4000);
    t = await tran();
    const can = { a: CHU.points(w1.length) + CHU.points(w2.length), b: CHU.points(w3.length) };
    ok('máy chủ chấm điểm (tdTu) diem = ' + JSON.stringify(t.diem), t.diem && t.diem.a === can.a && t.diem.b === can.b, 'cần ' + JSON.stringify(can));
    const qq = docv((await goi(`${FS_GOC}/tranDau/${ID}/tu/qqqq`, { headers: await H() })).json);
    ok('"qqqq" bị chấm ok=false', qq && qq.ok === false);
    // nhịp + B rời trận ⇒ chốt ngay, B thua
    await goi(`${FS_GOC}/tranDau/${ID}/nhip/${A}${k}`, { method: 'PATCH', headers: H2(tA), json: { fields: { luc: I(Date.now()) } } });
    const roi = await goi(`${FS_GOC}/tranDau/${ID}/nhip/${Bb}${k}`, { method: 'PATCH', headers: H2(tB), json: { fields: { luc: I(Date.now()), roi: B(true) } } });
    ok('B bấm rời trận', roi.status === 200, roi.status);
    for (let i = 0; i < 20; i++) { await ngu(1000); t = await tran(); if (t.trangThai === 'xong') break; }
    ok('chốt trận (tdNhip): A thắng vì B rời', t.trangThai === 'xong' && t.kq && t.kq.a === 'thang' && t.ly === 'roiB', JSON.stringify({ tt: t.trangThai, kq: t.kq, ly: t.ly, diem: t.diem }));
    const bang = docv((await goi(`${FS_GOC}/giaiDau/${GIAI}/bang/${LOP}`, { headers: await H() })).json);
    ok('bảng xếp hạng giải: A 1 thắng, B 1 thua', bang && bang.em && bang.em[A] && bang.em[A].t === 1 && bang.em[Bb] && bang.em[Bb].b === 1, JSON.stringify(bang && bang.em));
    ok('bảng có trận gần đây', bang && bang.tran && bang.tran.length === 1);
    const lsA = docv((await goi(`${FS_GOC}/tdLichSu/${A}${k}`, { headers: H2(tA) })).json);
    ok('A đọc lịch sử của mình: thắng', lsA && lsA.ds && lsA.ds[0] && lsA.ds[0].kq === 'thang', JSON.stringify(lsA && lsA.ds && lsA.ds[0]).slice(0, 160));
  } finally {
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử');
    await xoaTkThu(A); await xoaTkThu(Bb);
    console.log('  xoá 2 tài khoản thử');
  }
  if (hong) process.exitCode = 1;
}
thuTran().catch((e) => { console.error('LỖI:', e.message); process.exitCode = 1; });
