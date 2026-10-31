// 🧪 31/10/2026 — THỬ PHÒNG CHỜ CÔNG KHAI trên máy chủ THẬT (luật dang-luat-phong-cho.js · hàm xhMoi vao · xhPhongChat · xhPhongXoa, web v1.469.0).
//
//   node tools/thu-phong-cho-that.js
//
// 3 tài khoản ZTEST + MÙA THỬ tạm: A Vàng III (850, chủ phòng) · B Vàng II (950, cùng hạng lớn) · C Bạc (500).
// A ghi phòng ⇒ B đọc, không sửa được phòng A ⇒ B ghi ô người xem (không ghi hộ C) ⇒ chat phòng qua bộ lọc (chu / xem / link bị chặn)
// ⇒ C (Bạc) THAM GIA bị chặn ⇒ B THAM GIA ⇒ trận cho + phiếu hai em + phòng mang trận ⇒ vào lần nữa bị chặn ⇒ dọn: rời phòng ⇒ xhPhongXoa dọn chat/người xem.
'use strict';
const fs = require('fs');
const path = require('path');
const M = require('module');
const GOC = path.join(__dirname, 'dang-luat-xep-hang.js');
let src = fs.readFileSync(GOC, 'utf8');
src = src.slice(0, src.lastIndexOf('(async () => {')) + '\nmodule.exports = { goi, H, ghiAdmin, xoaTaiLieu, taoTkThu, xoaTkThu, FS_GOC, DB, API_KEY };';
const mod = new M(GOC); mod.filename = GOC; mod.paths = M._nodeModulePaths(__dirname); mod._compile(src, GOC);
const { goi, H, ghiAdmin, xoaTaiLieu, taoTkThu, xoaTkThu, FS_GOC, DB, API_KEY } = mod.exports;

const S = (v) => ({ stringValue: v }), I = (n) => ({ integerValue: String(n) }), B = (b) => ({ booleanValue: b });
const L = (a) => ({ arrayValue: { values: a } }), MP = (o) => ({ mapValue: { fields: o } });
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
function gt(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null; if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(gt);
  if ('mapValue' in v) { const o = {}; Object.entries(v.mapValue.fields || {}).forEach(([k, x]) => { o[k] = gt(x); }); return o; }
  return null;
}
const doc = (d) => { const o = {}; Object.entries((d && d.fields) || {}).forEach(([k, v]) => { o[k] = gt(v); }); return o; };
const k = '?key=' + encodeURIComponent(API_KEY);
let hong = 0;
const ok = (t, dk, them) => { console.log((dk ? '  ✓ ' : '  ✗ ') + t + (them ? '  · ' + them : '')); if (!dk) hong++; };
async function docAdmin(p) { const r = await goi(`${FS_GOC}/${p}`, { headers: await H() }); return r.status === 200 ? doc(r.json) : null; }
async function dsAdmin(p) { const r = await goi(`${FS_GOC}/${p}?pageSize=100`, { headers: await H() }); return ((r.json && r.json.documents) || []).map((d) => Object.assign({ _id: d.name.split('/').pop() }, doc(d))); }
async function cho(ten, fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 30000)) { const x = await fn(); if (x) return x; await ngu(1000); } throw new Error('QUA_GIO: ' + ten); }
const H2 = (t) => ({ Authorization: 'Bearer ' + t });
// ghi có trường giờ máy chủ (REQUEST_TIME) — tạo mới (moi) hoặc ghi đè cả tài liệu
const ghiGioMay = (tkn, p, fields, ts, moi) => goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit${k}`, { method: 'POST', headers: H2(tkn),
  json: { writes: [Object.assign({ update: { name: DB + '/documents/' + p, fields }, updateTransforms: ts.map((f) => ({ fieldPath: f, setToServerValue: 'REQUEST_TIME' })) },
    moi ? { currentDocument: { exists: false } } : {})] } }).then((r) => r.status);
const HAM = 'https://asia-southeast1-aword-70dae.cloudfunctions.net/xhMoi';
async function moi(tkn, data) { const r = await goi(HAM, { method: 'POST', headers: H2(tkn), json: { data } }); return (r.json && r.json.result) || { loiHttp: r.status }; }

(async () => {
  const A = 'hs_9999981', Bb = 'hs_9999982', C = 'hs_9999983', MUA = 'ztestphong' + Date.now();
  const bay = Date.now(), GIO = new Date(bay + 7 * 3600e3).getUTCHours(), GIOP = GIO + new Date(bay).getUTCMinutes() / 60;
  const xoa = [A, Bb, C].flatMap((u) => ['nwUsers/' + u, 'xhHang/' + u, 'xhMua/' + MUA + '/em/' + u]).concat(['xhMua/' + MUA, 'xhMua/' + MUA + '/moiCap/' + [A, Bb].sort().join('_')]);
  const caiGoc = await docAdmin('caiDat/choiGame'), caiGocR = (await goi(`${FS_GOC}/caiDat/choiGame`, { headers: await H() })).json;
  const xhGocR = await goi(`${FS_GOC}/caiDat/xepHang`, { headers: await H() });
  const tk = {}; let TID = '', doiCai = false;
  console.log('Thử PHÒNG CHỜ CÔNG KHAI · giờ VN', GIO, '· mùa thử', MUA);
  try {
    const hs = (uid, ten, lop) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(lop), cacLop: L([S(lop)]), anh: S(''), capNhat: I(bay), hoatDongLuc: I(Date.now()) });
    await hs(A, 'ZTEST PHONG AN', 'ZTESTPA'); await hs(Bb, 'ZTEST PHONG BINH', 'ZTESTPB'); await hs(C, 'ZTEST PHONG CUONG', 'ZTESTPC');
    tk[A] = await taoTkThu(A, 'ZTEST9999981', { hs: true, ma: 'ZTEST9999981', lop: 'ZTESTPA', lops: 'ZTESTPA', msId: 0 });
    tk[Bb] = await taoTkThu(Bb, 'ZTEST9999982', { hs: true, ma: 'ZTEST9999982', lop: 'ZTESTPB', lops: 'ZTESTPB', msId: 0 });
    tk[C] = await taoTkThu(C, 'ZTEST9999983', { hs: true, ma: 'ZTEST9999983', lop: 'ZTESTPC', lops: 'ZTESTPC', msId: 0 });
    await ghiAdmin('xhMua/' + MUA, { ten: S('ZTEST mùa phòng'), tu: I(bay - 3600e3), den: I(bay + 3600e3), gioVang: MP({ tu: I(0), den: I(0), nhan: I(1), cn: B(false) }),
      sao: MP({ dong: I(1) }), phut: I(2), tt: S('mo'), taoLuc: I(bay) });
    const em = (u, d) => ghiAdmin('xhMua/' + MUA + '/em/' + u, { xl: I(5), xlThang: I(3), diem: I(d), cao: I(d), mmr: I(1000), tran: I(9), thang: I(5), hoa: I(0), thua: I(4), chuoi: I(1), baoVe: I(0) });
    await em(A, 850); await em(Bb, 950); await em(C, 500);
    await ghiAdmin('caiDat/xepHang', { mua: S(MUA), capNhat: I(Date.now()) });
    if (caiGoc && (caiGoc.bat !== false) && (GIOP >= (caiGoc.nghiTu ?? 23) || GIOP < (caiGoc.nghiDen ?? 6))) {
      doiCai = true;
      await ghiAdmin('caiDat/choiGame', { bat: B(true), nghiTu: I((GIO + 2) % 24), nghiDen: I((GIO + 3) % 24), tranNgay: I(20), giaiNgay: I(10), capNgay: I(3), capNhat: I(Date.now()) });
      console.log('  (dời tạm khung nghỉ đêm để thử)');
    }
    // ── phòng ──
    const phong = (pha, tran) => ({ mua: S(MUA), ten: S('ZTEST PHONG AN'), anh: S(''), lop: S('ZTESTPA'), h: S('vang:III'), pha: S(pha), tran: S(tran || '') });
    ok('A ghi phòng của mình', await ghiGioMay(tk[A], 'xhPhong/' + A, phong('cho'), ['luc'], true) === 200);
    ok('B đọc được phòng A', (await goi(`${FS_GOC}/xhPhong/${A}${k}`, { headers: H2(tk[Bb]) })).status === 200);
    ok('Luật: B KHÔNG sửa được phòng A', await ghiGioMay(tk[Bb], 'xhPhong/' + A, phong('cho'), ['luc']) !== 200);
    ok('Luật: phòng có khoá lạ bị chặn', await ghiGioMay(tk[A], 'xhPhong/' + A, Object.assign(phong('cho'), { la: S('x') }), ['luc']) !== 200);
    ok('B ghi ô người xem của mình', await ghiGioMay(tk[Bb], 'xhPhong/' + A + '/xem/' + Bb, { ten: S('ZTEST PHONG BINH'), anh: S('') }, ['luc']) === 200);
    ok('Luật: B KHÔNG ghi hộ ô người xem của C', await ghiGioMay(tk[Bb], 'xhPhong/' + A + '/xem/' + C, { ten: S('x'), anh: S('') }, ['luc']) !== 200);
    // ── chat phòng ──
    const c1 = 'c1' + Date.now(), c2 = 'c2' + Date.now(), c3 = 'c3' + Date.now();
    ok('B (người xem) chat phòng', await ghiGioMay(tk[Bb], 'xhPhong/' + A + '/chatGui/' + c1, { uid: S(Bb), chu: S('Cố lên!') }, ['luc'], true) === 200);
    ok('A (chủ) chat phòng', await ghiGioMay(tk[A], 'xhPhong/' + A + '/chatGui/' + c2, { uid: S(A), chu: S('Ai vào đấu không?') }, ['luc'], true) === 200);
    const ch1 = await cho('lọc chat B', async () => docAdmin('xhPhong/' + A + '/chat/' + c1), 20000);
    const ch2 = await cho('lọc chat A', async () => docAdmin('xhPhong/' + A + '/chat/' + c2), 20000);
    ok('Chat qua bộ lọc: B = người xem, A = chủ phòng', ch1.vai === 'xem' && ch2.vai === 'chu' && ch1.ten === 'ZTEST PHONG BINH', ch1.vai + ' / ' + ch2.vai);
    ok('C đọc được chat phòng', (await goi(`${FS_GOC}/xhPhong/${A}/chat/${c1}${k}`, { headers: H2(tk[C]) })).status === 200);
    await ngu(2100);
    ok('B gửi link', await ghiGioMay(tk[Bb], 'xhPhong/' + A + '/chatGui/' + c3, { uid: S(Bb), chu: S('vào www.abc.com') }, ['luc'], true) === 200);
    const g3 = await cho('chặn link', async () => { const x = await docAdmin('xhPhong/' + A + '/chatGui/' + c3); return x && (x.ok || x.chan) ? x : null; }, 20000);
    ok('Máy chủ chặn link trong chat phòng', g3.chan === true && g3.ly === 'link', g3.ly);
    // ── THAM GIA ──
    const vC = await moi(tk[C], { loai: 'vao', phong: A });
    ok('C (Bạc) THAM GIA phòng Vàng bị chặn', vC.loi === 'hang', JSON.stringify(vC));
    const vB = await moi(tk[Bb], { loai: 'vao', phong: A });
    ok('B (Vàng) THAM GIA phòng A', vB.ok === true && !!vB.id, JSON.stringify(vB)); if (!vB.id) throw new Error('không tham gia được');
    TID = vB.id;
    const T = await docAdmin('tranDau/' + TID);
    ok('Trận phòng chờ: cho · a = chủ, b = người vào · thamGia · tính điểm', T.trangThai === 'cho' && T.a === A && T.b === Bb && T.thamGia === true && T.xhKhongTinh === false, T.trangThai);
    const hA = await docAdmin('xhHang/' + A), hB = await docAdmin('xhHang/' + Bb), pA = await docAdmin('xhPhong/' + A);
    ok('Phiếu hàng chờ hai em mang trận', hA && hB && hA.tran === TID && hB.tran === TID);
    ok('Phòng A mang trận (người xem khác theo)', pA && pA.tran === TID);
    const v2 = await moi(tk[C], { loai: 'vao', phong: A });
    ok('Vào lần nữa khi đã có người ⇒ bị chặn', ['coNguoi', 'hang', 'phong'].includes(v2.loi), v2.loi);
    // ── dọn: B rời phòng (xoá phiếu ⇒ roiPhong) · A đóng phòng ⇒ xhPhongXoa dọn ──
    await xoaTaiLieu(['xhHang/' + Bb]);
    await cho('roiPhong', async () => { const x = await docAdmin('tranDau/' + TID); return x && x.trangThai === 'het' ? x : null; }, 20000);
    ok('A đóng phòng (xoá được phòng của mình)', (await goi(`${FS_GOC}/xhPhong/${A}${k}`, { method: 'DELETE', headers: H2(tk[A]) })).status === 200);
    const sach = await cho('xhPhongXoa dọn', async () => { const a1 = await dsAdmin('xhPhong/' + A + '/chat'), a2 = await dsAdmin('xhPhong/' + A + '/xem'); return !a1.length && !a2.length ? true : null; }, 30000);
    ok('Máy chủ dọn chat + người xem của phòng', sach === true);
  } catch (e) { console.error('  ✗ DỪNG:', e.message); hong++; }
  finally {
    try {
      if (TID) {
        xoa.push('tranDau/' + TID);
        for (const sub of ['tu', 'nhip', 'may', 'chat', 'chatGui', 'tim', 'xem']) (await dsAdmin('tranDau/' + TID + '/' + sub)).forEach((d) => xoa.push('tranDau/' + TID + '/' + sub + '/' + d._id));
      }
      for (const sub of ['chat', 'chatGui', 'xem', 'may']) (await dsAdmin('xhPhong/' + A + '/' + sub)).forEach((d) => xoa.push('xhPhong/' + A + '/' + sub + '/' + d._id));
      xoa.push('xhPhong/' + A);
    } catch (_) { }
    await ngu(1500);
    console.log('  dọn', await xoaTaiLieu([...new Set(xoa)]), 'tài liệu thử');
    if (xhGocR.status === 200) await ghiAdmin('caiDat/xepHang', xhGocR.json.fields); else await xoaTaiLieu(['caiDat/xepHang']);
    if (doiCai && caiGocR) await ghiAdmin('caiDat/choiGame', caiGocR.fields);
    console.log('  trả caiDat/xepHang' + (doiCai ? ' + caiDat/choiGame' : '') + ' về giá trị cũ');
    for (const u of Object.keys(tk)) await xoaTkThu(u);
    console.log('  xoá', Object.keys(tk).length, 'tài khoản thử');
    console.log(hong ? `\n⚠ ${hong} bước TRƯỢT` : '\n✓ MỌI BƯỚC QUA');
    process.exitCode = hong ? 1 : 0;
  }
})();
