// 15/10/2026 tối — THỬ MỘT TRẬN THẬT CÓ BỘ TỪ đầu-cuối (web v1.351.0): giải One word 2 từ · 3 tài khoản ZTEST (A, B đấu; C cùng lớp xem)
//   ⇒ kiểm tdDoi dựng bàn · băm · may/ke kín · chấm từ sai/đúng · sang bàn · chốt sớm · bảng giải · bạn cùng lớp đọc tu. Dọn sạch.
//   node tools/thu-tran-bo-tu.js   (cần khoá quản trị như các công cụ dang-luat-*)
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

// ───────── THỬ MỘT TRẬN THẬT CÓ BỘ TỪ (hàm máy chủ đã đưa lên) — tài khoản ZTEST, dọn sạch ─────────
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
async function thuTran() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, dk, them) => { console.log((dk ? '  ✓ ' : '  ✗ ') + t + (them ? '  ' + them : '')); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b });
  const L = (a) => ({ arrayValue: { values: a } }), M = (o) => ({ mapValue: { fields: o } });
  const val = (v) => v == null ? undefined : 'stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'booleanValue' in v ? v.booleanValue
    : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([a, b]) => [a, val(b)])) : 'arrayValue' in v ? (v.arrayValue.values || []).map(val) : 'nullValue' in v ? null : v;
  const docv = (j) => j && j.fields ? Object.fromEntries(Object.entries(j.fields).map(([a, b]) => [a, val(b)])) : null;
  const LOP = 'ZTESTBO3', A = 'hs_9999991', Bb = 'hs_9999992', C = 'hs_9999993', bay = Date.now(), GIAI = 'ztest_giai_bo_' + bay;
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb, 'nwUsers/' + C, 'giaiDau/' + GIAI, 'giaiDau/' + GIAI + '/bang/' + LOP, 'tdLichSu/' + A, 'tdLichSu/' + Bb];
  const TU = [['cat', 'con mèo'], ['dog', 'con chó']];
  let ID = null;
  try {
    const hs = (uid, ten) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(LOP), cacLop: L([S(LOP)]), anh: S(''), capNhat: I(bay) });
    await hs(A, 'ZTEST AN'); await hs(Bb, 'ZTEST BINH'); await hs(C, 'ZTEST CUONG');
    await ghiAdmin('giaiDau/' + GIAI, { ten: S('ZTEST BO TU'), lops: L([S(LOP)]), game: S('aShowSpeed'), phut: I(2), lv: S('easy'), tu: I(bay - 60000), den: I(bay + 3600e3),
      sao: L([I(1), I(1), I(1)]), dong: B(false),
      bo: M({ id: S('ztest'), ten: S('ZTEST / WORDS'), che: S('one'), o: I(12), chiBo: B(true), bien: S('vi1'), bienTen: S('VI1'), goiY: B(true), giong: B(true),
        tu: L(TU.map(([w, m]) => M({ w: S(w), m: S(m), v: S('ztestclip_' + w) }))) }) });
    const tk = {};
    for (const [u, ma] of [[A, 'ZTEST9999991'], [Bb, 'ZTEST9999992'], [C, 'ZTEST9999993']]) tk[u] = await taoTkThu(u, ma, { hs: true, ma, lop: LOP, lops: LOP, msId: 0 });
    const H2 = (t) => ({ Authorization: 'Bearer ' + t });
    const t0 = Date.now();
    const r = await goi(`${FS_GOC}/tranDau${k}`, { method: 'POST', headers: H2(tk[A]), json: { fields: { a: S(A), b: S(Bb), nguoi: L([S(A), S(Bb)]), tenA: S('ZTEST AN'), tenB: S('ZTEST BINH'),
      lop: S(LOP), giai: S(GIAI), phut: I(2), lv: S('easy'), trangThai: S('moi'), taoLuc: I(t0), het: I(t0 + 60000) } } });
    ok('A mời B (giải có bộ từ)', r.status === 200, r.status);
    ID = r.json.name.split('/').pop(); xoa.unshift('tranDau/' + ID, 'tranDau/' + ID + '/may/ke');
    const tran = async () => docv((await goi(`${FS_GOC}/tranDau/${ID}`, { headers: await H() })).json);
    await ngu(3000);
    const q = await goi(`${FS_GOC}/nwUsers/${Bb}/thongBao?pageSize=5`, { headers: await H() });
    (q.json.documents || []).forEach((d) => xoa.push(d.name.split('/documents/')[1]));
    ok('B nhận', (await goi(`${FS_GOC}/tranDau/${ID}${k}&updateMask.fieldPaths=trangThai`, { method: 'PATCH', headers: H2(tk[Bb]), json: { fields: { trangThai: S('nhan') } } })).status === 200);
    let t = null;
    for (let i = 0; i < 50; i++) { await ngu(200); t = await tran(); if (t.trangThai === 'choi') break; }
    // ⛔ 19/10/2026 v1.376.0 (chống gian lận Đợt A): trận KHÔNG mang băm đáp án · chữ chỉ lộ lúc batDau − 150 ms
    ok('v1.376: trận không mang `bam`', t && !('bam' in t));
    ok('v1.376: chữ CHƯA lộ trong lúc đếm ngược (còn ' + (t ? t.batDau - Date.now() : '?') + ' ms)', t && !t.chu && Date.now() < t.batDau - 1000, t ? JSON.stringify({ chu: t.chu }) : '');
    await ngu(Math.max(0, t.batDau - Date.now() + 1200)); t = await tran();
    ok('tdDoi dựng bàn theo bộ từ: che one, 2 bàn, 12 ô, gợi ý 3 chữ (chữ đã lộ sau giờ bắt đầu)', t && t.trangThai === 'choi' && t.che === 'one' && t.soVan === 2 && t.van === 0 && (t.chu || '').length === 12 && t.goi && t.goi[0].n === 3,
      t ? JSON.stringify({ che: t.che, soVan: t.soVan, chu: t.chu, goi: t.goi }) : '');
    if (!t || t.trangThai !== 'choi') return;
    ok('tài liệu trận KHÔNG lộ từ', !/CAT|DOG/.test(JSON.stringify(t.goi)) && t.boTen === 'ZTEST / WORDS');
    ok('v1.352: gợi ý bật + giọng đọc mang mã clip', t.goiYBat === true && t.giong === true && /^ztestclip_/.test(t.goi[0].v || '') && t.moc === t.batDau, JSON.stringify({ goiYBat: t.goiYBat, giong: t.giong, v: t.goi[0].v }));
    const keAdmin = docv((await goi(`${FS_GOC}/tranDau/${ID}/may/ke`, { headers: await H() })).json);
    const tuBan = (tt) => ((((keAdmin && keAdmin.ds) || [])[tt.van] || {}).w || [])[0];
    const w0 = tuBan(t);
    ok('kế hoạch bàn (đọc bằng khoá quản trị) có từ của bộ (' + w0 + ')', !!w0 && TU.some(([w]) => w.toUpperCase() === w0));
    xoa.unshift('tranDau/' + ID + '/may/bd');
    ok('A đọc chữ cất may/bd = 403', (await goi(`${FS_GOC}/tranDau/${ID}/may/bd${k}`, { headers: H2(tk[A]) })).status === 403);
    ok('A đọc kế hoạch bàn may/ke = 403', (await goi(`${FS_GOC}/tranDau/${ID}/may/ke${k}`, { headers: H2(tk[A]) })).status === 403);
    const gui = (uid, id) => goi(`${FS_GOC}/tranDau/${ID}/tu${k}&documentId=${id}`, { method: 'POST', headers: H2(tk[uid]), json: { fields: { uid: S(uid) } } });
    await ngu(Math.max(0, t.batDau - Date.now() + 300));
    ok('A gửi từ sai "zzz_0"', (await gui(A, 'zzz_0')).status === 200); xoa.unshift('tranDau/' + ID + '/tu/zzz_0');
    ok('B gửi đúng "' + w0.toLowerCase() + '_0"', (await gui(Bb, w0.toLowerCase() + '_0')).status === 200); xoa.unshift('tranDau/' + ID + '/tu/' + w0.toLowerCase() + '_0');
    for (let i = 0; i < 15; i++) { await ngu(1000); t = await tran(); if (t.van === 1) break; }
    ok('tìm hết bàn 1 ⇒ sang bàn 2, B +1', t.van === 1 && t.diem && t.diem.b === 1 && t.diem.a === 0 && Object.keys(t.tim || {}).length === 0, JSON.stringify({ van: t.van, diem: t.diem, tim: t.tim }));
    const zz = docv((await goi(`${FS_GOC}/tranDau/${ID}/tu/zzz_0`, { headers: await H() })).json);
    ok('"zzz" chấm ok=false', zz && zz.ok === false);
    ok('C (cùng lớp, ngoài trận) xem được từ của trận', (await goi(`${FS_GOC}/tranDau/${ID}/tu${k}`, { headers: H2(tk[C]) })).status === 200);
    // ⛔ v1.376: GIỚI HẠN TỐC ĐỘ — B bắn 14 từ sai liền (B đã gửi 1 từ ở bàn 1 trong 10 giây qua) ⇒ từ thứ 13 trở đi bị chặn 'nhanh'
    const sung = 'abcdefghijklmn'.split('').map((c) => 'zq' + c + '_1');
    for (const id of sung) { await gui(Bb, id); xoa.unshift('tranDau/' + ID + '/tu/' + id); }
    await ngu(6000);
    const kqSung = [];
    for (const id of sung) kqSung.push(docv((await goi(`${FS_GOC}/tranDau/${ID}/tu/${id}`, { headers: await H() })).json) || {});
    const soNhanh = kqSung.filter((x) => x.ly === 'nhanh').length;
    ok('v1.376: bắn 14 từ / vài giây ⇒ bị chặn "nhanh" ' + soNhanh + ' từ (cần ≥ 2), mọi từ đều ok=false', soNhanh >= 2 && kqSung.every((x) => x.ok === false), JSON.stringify(kqSung.map((x) => x.ly || x.ok)));
    t = await tran();
    ok('v1.376: trận ghi nghi.b ≥ 2', t.nghi && t.nghi.b >= 2, JSON.stringify(t.nghi));
    const w1 = tuBan(t);
    // ⭐ v1.352.0 — GỢI Ý LẬT CHỮ trên bàn 2
    const coTu = async (id) => (await goi(`${FS_GOC}/tranDau/${ID}/tu/${id}`, { headers: await H() })).status === 200;
    ok('xin gợi ý SAI bước "zgab_1" được nhận (luật)', (await gui(A, 'zgab_1')).status === 200);
    ok('xin gợi ý SỚM "zgaa_1" được nhận (luật)', (await gui(A, 'zgaa_1')).status === 200);
    await ngu(4000);
    ok('máy chủ xoá 2 lần xin sai/sớm, chưa lật', !(await coTu('zgab_1')) && !(await coTu('zgaa_1')) && !(await tran()).goiY);
    await ngu(Math.max(0, t.moc + 15200 - Date.now()));
    ok('đủ 15 giây: A xin "zgaa_1"', (await gui(A, 'zgaa_1')).status === 200); xoa.unshift('tranDau/' + ID + '/tu/zgaa_1');
    ok('B xin trùng bước ⇒ 409', (await gui(Bb, 'zgaa_1')).status === 409);
    for (let i = 0; i < 10; i++) { await ngu(1000); t = await tran(); if (t.goiY) break; }
    ok('máy chủ lật 1 chữ: goiY ' + JSON.stringify(t.goiY), t.goiY && t.goiY.i === 0 && t.goiY.k === 1 && t.goiY.chu === (w1 || '').slice(0, 1) && t.soGoi === 1);
    ok('A gửi đúng từ bàn cuối "' + (w1 || '?').toLowerCase() + '_1"', w1 && (await gui(A, w1.toLowerCase() + '_1')).status === 200); if (w1) xoa.unshift('tranDau/' + ID + '/tu/' + w1.toLowerCase() + '_1');
    for (let i = 0; i < 20; i++) { await ngu(1000); t = await tran(); if (t.trangThai === 'xong') break; }
    ok('hết bàn cuối ⇒ chốt sớm: hòa 1–1', t.trangThai === 'xong' && t.kq && t.kq.a === 'hoa' && t.diem.a === 1 && t.diem.b === 1 && Array.isArray(t.lo) && t.lo.length === 0,
      JSON.stringify({ tt: t.trangThai, kq: t.kq, diem: t.diem, lo: t.lo, ly: t.ly }));
    const bang = docv((await goi(`${FS_GOC}/giaiDau/${GIAI}/bang/${LOP}`, { headers: await H() })).json);
    ok('bảng giải: A 1 hòa, B 1 hòa', bang && bang.em && bang.em[A] && bang.em[A].h === 1 && bang.em[Bb] && bang.em[Bb].h === 1, JSON.stringify(bang && bang.em));
  } finally {
    console.log('  dọn', await xoaTaiLieu(xoa), 'tài liệu thử');
    await xoaTkThu(A); await xoaTkThu(Bb); await xoaTkThu(C);
    console.log('  xoá 3 tài khoản thử');
  }
  if (hong) process.exitCode = 1;
}
thuTran().catch((e) => { console.error('LỖI:', e.message); process.exitCode = 1; });
