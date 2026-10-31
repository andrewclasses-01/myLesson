// 🧪 31/10/2026 — THỬ MỜI ĐẤU XẾP HẠNG trên máy chủ THẬT (hàm xhMoi · xhGhep roiPhong · luật hiện có, web v1.468.0).
//
//   node tools/thu-moi-xep-hang.js
//
// 3 tài khoản ZTEST (online giả qua nwUsers.hoatDongLuc) + MÙA THỬ tạm: A Vàng III (850) · B Vàng II (950) · C Bạc (500).
// Danh sách mời theo bậc ⇒ A mời C bị chặn ⇒ A mời B, B từ chối ⇒ A mời lại, B nhận (phòng chờ, phiếu hàng chờ mang trận, đếm cặp)
// ⇒ A rời phòng (xoá phiếu) ⇒ roiPhong: trận het + A bị khoá + B được trả về ⇒ cặp đủ 2 trận ⇒ trận mời sau `xhKhongTinh`. Dọn sạch.
'use strict';
const fs = require('fs');
const path = require('path');
const M = require('module');
const GOC = path.join(__dirname, 'dang-luat-xep-hang.js');
let src = fs.readFileSync(GOC, 'utf8');
src = src.slice(0, src.lastIndexOf('(async () => {')) + '\nmodule.exports = { goi, H, ghiAdmin, xoaTaiLieu, taoTkThu, xoaTkThu, FS_GOC, DB, API_KEY };';
const mod = new M(GOC); mod.filename = GOC; mod.paths = M._nodeModulePaths(__dirname); mod._compile(src, GOC);
const { goi, H, ghiAdmin, xoaTaiLieu, taoTkThu, xoaTkThu, FS_GOC } = mod.exports;

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
let hong = 0;
const ok = (t, dk, them) => { console.log((dk ? '  ✓ ' : '  ✗ ') + t + (them ? '  · ' + them : '')); if (!dk) hong++; };
async function docAdmin(p) { const r = await goi(`${FS_GOC}/${p}`, { headers: await H() }); return r.status === 200 ? doc(r.json) : null; }
async function cho(ten, fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 30000)) { const x = await fn(); if (x) return x; await ngu(1000); } throw new Error('QUA_GIO: ' + ten); }
const HAM = 'https://asia-southeast1-aword-70dae.cloudfunctions.net/xhMoi';
async function moi(tkn, data) {
  const r = await goi(HAM, { method: 'POST', headers: { Authorization: 'Bearer ' + tkn }, json: { data } });
  return (r.json && r.json.result) || { loiHttp: r.status, chi: JSON.stringify(r.json).slice(0, 200) };
}

(async () => {
  const A = 'hs_9999971', Bb = 'hs_9999972', C = 'hs_9999973', MUA = 'ztestmoi' + Date.now();
  const bay = Date.now(), GIO = new Date(bay + 7 * 3600e3).getUTCHours(), GIOP = GIO + new Date(bay).getUTCMinutes() / 60;
  const xoa = [A, Bb, C].flatMap((u) => ['nwUsers/' + u, 'xhHang/' + u, 'xhMua/' + MUA + '/em/' + u]).concat(['xhMua/' + MUA, 'xhMua/' + MUA + '/moiCap/' + [A, Bb].sort().join('_')]);
  const caiGoc = await docAdmin('caiDat/choiGame'), caiGocR = (await goi(`${FS_GOC}/caiDat/choiGame`, { headers: await H() })).json;
  const xhGocR = await goi(`${FS_GOC}/caiDat/xepHang`, { headers: await H() });
  const tk = {}, tranThu = []; let doiCai = false;
  console.log('Thử MỜI ĐẤU xếp hạng · giờ VN', GIO, '· mùa thử', MUA);
  try {
    const hs = (uid, ten, lop) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(lop), cacLop: L([S(lop)]), anh: S(''), capNhat: I(bay), hoatDongLuc: I(Date.now()) });
    await hs(A, 'ZTEST MOI AN', 'ZTESTMA'); await hs(Bb, 'ZTEST MOI BINH', 'ZTESTMB'); await hs(C, 'ZTEST MOI CUONG', 'ZTESTMC');
    tk[A] = await taoTkThu(A, 'ZTEST9999971', { hs: true, ma: 'ZTEST9999971', lop: 'ZTESTMA', lops: 'ZTESTMA', msId: 0 });
    tk[Bb] = await taoTkThu(Bb, 'ZTEST9999972', { hs: true, ma: 'ZTEST9999972', lop: 'ZTESTMB', lops: 'ZTESTMB', msId: 0 });
    tk[C] = await taoTkThu(C, 'ZTEST9999973', { hs: true, ma: 'ZTEST9999973', lop: 'ZTESTMC', lops: 'ZTESTMC', msId: 0 });
    await ghiAdmin('xhMua/' + MUA, { ten: S('ZTEST mùa mời'), tu: I(bay - 3600e3), den: I(bay + 3600e3), gioVang: MP({ tu: I(0), den: I(0), nhan: I(1), cn: B(false) }),
      sao: MP({ dong: I(1) }), phut: I(2), tt: S('mo'), taoLuc: I(bay) });
    const em = (u, d) => ghiAdmin('xhMua/' + MUA + '/em/' + u, { xl: I(5), xlThang: I(3), diem: I(d), cao: I(d), mmr: I(1000), tran: I(9), thang: I(5), hoa: I(0), thua: I(4), chuoi: I(1), baoVe: I(0) });
    await em(A, 850); await em(Bb, 950); await em(C, 500);
    await ghiAdmin('caiDat/xepHang', { mua: S(MUA), capNhat: I(Date.now()) });
    if (caiGoc && (caiGoc.bat !== false) && (GIOP >= (caiGoc.nghiTu ?? 23) || GIOP < (caiGoc.nghiDen ?? 6))) {
      doiCai = true;
      await ghiAdmin('caiDat/choiGame', { bat: B(true), nghiTu: I((GIO + 2) % 24), nghiDen: I((GIO + 3) % 24), tranNgay: I(20), giaiNgay: I(10), capNgay: I(3), capNhat: I(Date.now()) });
      console.log('  (dời tạm khung nghỉ đêm để thử)');
    }
    // ── danh sách ──
    const dA = await moi(tk[A], { loai: 'ds' }), uA = (dA.ds || []).map((x) => x.uid);
    ok('A (Vàng III) thấy B (Vàng II) đang online', uA.includes(Bb), JSON.stringify(dA).slice(0, 120));
    ok('A KHÔNG thấy C (Bạc — bậc thấp hơn)', !uA.includes(C));
    const dC = await moi(tk[C], { loai: 'ds' }), uC = (dC.ds || []).map((x) => x.uid);
    ok('C (Bạc) thấy cả A và B (bậc cao hơn)', uC.includes(A) && uC.includes(Bb));
    // ── mời ──
    const mC = await moi(tk[A], { loai: 'moi', ban: C });
    ok('A mời C bị chặn (bậc thấp hơn)', mC.loi === 'bac', JSON.stringify(mC));
    const m1 = await moi(tk[A], { loai: 'moi', ban: Bb });
    ok('A mời B', !!m1.id, JSON.stringify(m1)); if (!m1.id) throw new Error('không mời được');
    tranThu.push(m1.id);
    let T = await docAdmin('tranDau/' + m1.id);
    ok('Trận mời đúng khuôn (xh · moi · het 60 giây · thẻ hai em)', T.xh === MUA && T.trangThai === 'moi' && T.moi === true && T.het - T.taoLuc === 60000 && !!T.theB, T.trangThai);
    ok('B (người khác) không huỷ được lời mời của A', (await moi(tk[Bb], { loai: 'huy', id: m1.id })).loi === 'tran');
    ok('B từ chối', (await moi(tk[Bb], { loai: 'traloi', id: m1.id, nhan: false })).ok === true);
    ok('Trận ⇒ tuchoi', (await docAdmin('tranDau/' + m1.id)).trangThai === 'tuchoi');
    const m2 = await moi(tk[A], { loai: 'moi', ban: Bb }); tranThu.push(m2.id);
    const n2 = await moi(tk[Bb], { loai: 'traloi', id: m2.id, nhan: true });
    ok('A mời lại, B nhận (trận thứ 1 trong ngày ⇒ tính điểm)', n2.ok === true && n2.tinh === true, JSON.stringify(n2));
    T = await docAdmin('tranDau/' + m2.id);
    ok('Trận ⇒ phòng chờ (cho · 32 giây · tính điểm)', T.trangThai === 'cho' && T.hetSS - Date.now() > 20000 && T.xhKhongTinh === false, `${T.trangThai} · ${T.xhKhongTinh}`);
    const hA = await docAdmin('xhHang/' + A), hB = await docAdmin('xhHang/' + Bb);
    ok('Phiếu hàng chờ hai em mang trận', hA && hB && hA.tran === m2.id && hB.tran === m2.id);
    const cap = await docAdmin('xhMua/' + MUA + '/moiCap/' + [A, Bb].sort().join('_'));
    ok('Đếm cặp: 1 trận mời tính điểm hôm nay', cap && cap.n === 1, JSON.stringify(cap));
    ok('Đang ở phòng chờ ⇒ mời tiếp bị chặn', ['emBan', 'banBan'].includes((await moi(tk[A], { loai: 'moi', ban: Bb })).loi));
    // ── A rời phòng (xoá phiếu) ⇒ roiPhong ──
    await xoaTaiLieu(['xhHang/' + A]);
    T = await cho('roiPhong', async () => { const x = await docAdmin('tranDau/' + m2.id); return x && x.trangThai === 'het' ? x : null; }, 20000);
    ok('A rời phòng ⇒ trận het (ly roi)', T.ly === 'roi' && T.roi === A, T.ly);
    const eA = await docAdmin('xhMua/' + MUA + '/em/' + A), hB2 = await docAdmin('xhHang/' + Bb);
    ok('A bị khoá né trận (1 phút)', eA.khoaDen > Date.now() && eA.ne && eA.ne.n === 1, `ne ${JSON.stringify(eA.ne)}`);
    ok('B được trả về (phiếu không còn trận)', hB2 && !hB2.tran);
    // ── đủ 2 trận/ngày ⇒ trận mời sau không tính ──
    await xoaTaiLieu(['xhHang/' + Bb]);
    await ghiAdmin('xhMua/' + MUA + '/moiCap/' + [A, Bb].sort().join('_'), { ngay: I(Math.floor((Date.now() + 7 * 3600e3) / 864e5)), n: I(2), a: S(A), b: S(Bb) });
    ok('A đang bị khoá ⇒ mời bị chặn', (await moi(tk[A], { loai: 'moi', ban: Bb })).loi === 'khoa');
    await ghiAdmin('xhMua/' + MUA + '/em/' + A, { xl: I(5), xlThang: I(3), diem: I(850), cao: I(850), mmr: I(1000), tran: I(9), thang: I(5), hoa: I(0), thua: I(4), chuoi: I(1), baoVe: I(0) });   // gỡ khoá
    const m3 = await moi(tk[A], { loai: 'moi', ban: Bb });
    tranThu.push(m3.id);
    const n3 = await moi(tk[Bb], { loai: 'traloi', id: m3.id, nhan: true });
    ok('Cặp đã đủ 2 trận ⇒ trận thứ 3 KHÔNG tính điểm', n3.ok === true && n3.tinh === false && (await docAdmin('tranDau/' + m3.id)).xhKhongTinh === true, JSON.stringify(n3));
    await xoaTaiLieu(['xhHang/' + A, 'xhHang/' + Bb]);
    await cho('dọn trận 3', async () => { const x = await docAdmin('tranDau/' + m3.id); return x && x.trangThai === 'het' ? x : null; }, 20000);
  } catch (e) { console.error('  ✗ DỪNG:', e.message); hong++; }
  finally {
    try {
      for (const id of tranThu.filter(Boolean)) {
        xoa.push('tranDau/' + id);
        for (const sub of ['tu', 'nhip', 'may', 'chat', 'chatGui', 'tim', 'xem']) {
          const r = await goi(`${FS_GOC}/tranDau/${id}/${sub}?pageSize=100`, { headers: await H() });
          ((r.json && r.json.documents) || []).forEach((d) => xoa.push(d.name.split('/documents/')[1]));
        }
      }
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
