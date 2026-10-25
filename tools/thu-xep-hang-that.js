// 🧪 25–26/10/2026 — THỬ ĐẦU–CUỐI XẾP HẠNG trên máy chủ THẬT (hàm xhGhep · tdDoi · tdTu · xhChat · tdNhip đã deploy, luật dang-luat-xep-hang.js).
//
//   node tools/thu-xep-hang-that.js
//
// 2 tài khoản ZTEST (2 lớp khác nhau) + MÙA THỬ tạm (caiDat/xepHang trỏ tạm vào mùa thử rồi TRẢ LẠI) ⇒ vào hàng chờ ⇒ máy chủ ghép ⇒
// Sẵn sàng ⇒ trận chạy ⇒ gửi từ đúng/sai ⇒ chat có đáp án bị chặn, chat thường qua ⇒ hết 20 giây xin đổi bàn ⇒ A rời trận ⇒ chốt + điểm hạng.
// Đang giờ nghỉ đêm ⇒ dời TẠM khung nghỉ (caiDat/choiGame) rồi trả đúng giá trị cũ. Dọn sạch mọi tài liệu + tài khoản thử.
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
async function cho(ten, fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 30000)) { const x = await fn(); if (x) return x; await ngu(1000); } throw new Error('QUA_GIO: ' + ten); }
const H2 = (t) => ({ Authorization: 'Bearer ' + t });
const ghiGioMay = (tkn, p, fields, ts, moi) => goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit${k}`, { method: 'POST', headers: H2(tkn),
  json: { writes: [Object.assign({ update: { name: DB + '/documents/' + p, fields }, updateTransforms: ts.map((f) => ({ fieldPath: f, setToServerValue: 'REQUEST_TIME' })) },
    moi ? { currentDocument: { exists: false } } : { updateMask: { fieldPaths: Object.keys(fields) } })] } }).then((r) => r.status);
const sua = (tkn, p, fields) => goi(`${FS_GOC}/${p}${k}` + Object.keys(fields).map((x) => '&updateMask.fieldPaths=' + x).join(''), { method: 'PATCH', headers: H2(tkn), json: { fields } }).then((r) => r.status);

(async () => {
  const A = 'hs_9999961', Bb = 'hs_9999962', LA = 'ZTESTXA', LB = 'ZTESTXB', MUA = 'ztestmua' + Date.now();
  const bay = Date.now(), GIO = new Date(bay + 7 * 3600e3).getUTCHours();
  const xoa = ['nwUsers/' + A, 'nwUsers/' + Bb, 'xhHang/' + A, 'xhHang/' + Bb, 'xhMua/' + MUA, 'xhMua/' + MUA + '/em/' + A, 'xhMua/' + MUA + '/em/' + Bb,
    'xhMua/' + MUA + '/bang/top', 'tdLichSu/' + A, 'tdLichSu/' + Bb, 'tdDangDau/' + A, 'tdDangDau/' + Bb];
  const caiGoc = await docAdmin('caiDat/choiGame'), caiGocR = (await goi(`${FS_GOC}/caiDat/choiGame`, { headers: await H() })).json;
  const xhGocR = await goi(`${FS_GOC}/caiDat/xepHang`, { headers: await H() });
  let TID = '', tk = {}, doiCai = false;
  console.log('Thử xếp hạng đầu–cuối · giờ VN', GIO, '· mùa thử', MUA);
  try {
    const hs = (uid, ten, lop) => ghiAdmin('nwUsers/' + uid, { uid: S(uid), ten: S(ten), vaiTro: S('hs'), lop: S(lop), cacLop: L([S(lop)]), anh: S(''), capNhat: I(bay) });
    await hs(A, 'ZTEST XH AN', LA); await hs(Bb, 'ZTEST XH BINH', LB);
    tk[A] = await taoTkThu(A, 'ZTEST9999961', { hs: true, ma: 'ZTEST9999961', lop: LA, lops: LA, msId: 0 });
    tk[Bb] = await taoTkThu(Bb, 'ZTEST9999962', { hs: true, ma: 'ZTEST9999962', lop: LB, lops: LB, msId: 0 });
    await ghiAdmin('xhMua/' + MUA, { ten: S('ZTEST mùa'), tu: I(bay - 3600e3), den: I(bay + 3600e3), gioVang: MP({ tu: I(0), den: I(0), nhan: I(1) }),
      sao: MP({ dong: I(1) }), phut: I(2), tt: S('mo'), taoLuc: I(bay) });
    await ghiAdmin('caiDat/xepHang', { mua: S(MUA), capNhat: I(Date.now()) });
    if (caiGoc && (caiGoc.bat !== false) && (GIO >= (caiGoc.nghiTu ?? 23) || GIO < (caiGoc.nghiDen ?? 6))) {
      doiCai = true;
      await ghiAdmin('caiDat/choiGame', { bat: B(true), nghiTu: I((GIO + 2) % 24), nghiDen: I((GIO + 3) % 24), tranNgay: I(20), giaiNgay: I(10), capNgay: I(3), capNhat: I(Date.now()) });
      console.log('  (dời tạm khung nghỉ đêm để thử)');
    }
    // ── hàng chờ ──
    ok('A vào hàng chờ', await ghiGioMay(tk[A], 'xhHang/' + A, { mua: S(MUA) }, ['vao', 'nhip'], true) === 200);
    ok('B vào hàng chờ', await ghiGioMay(tk[Bb], 'xhHang/' + Bb, { mua: S(MUA) }, ['vao', 'nhip'], true) === 200);
    let nhipIv = setInterval(() => { ghiGioMay(tk[A], 'xhHang/' + A, {}, ['nhip']).catch(() => { }); ghiGioMay(tk[Bb], 'xhHang/' + Bb, {}, ['nhip']).catch(() => { }); }, 4000);
    const hA = await cho('ghép trận', async () => { const x = await docAdmin('xhHang/' + A); return x && (x.tran || x.loi) ? x : null; }, 45000);
    clearInterval(nhipIv);
    ok('Máy chủ ghép trận', !!hA.tran, hA.loi ? 'lỗi ' + hA.loi : 'trận ' + hA.tran);
    if (!hA.tran) throw new Error('không ghép được');
    TID = hA.tran; xoa.push('tranDau/' + TID);
    let T = await docAdmin('tranDau/' + TID);
    ok('Trận xếp hạng đúng khuôn (xh · cho · 2 lớp khác nhau)', T.xh === MUA && T.trangThai === 'cho' && T.lopMaA !== T.lopMaB, `tier ${T.tier} · ${T.hA} vs ${T.hB}`);
    // ── sẵn sàng ──
    const ben = T.a === A ? { [A]: 'a', [Bb]: 'b' } : { [A]: 'b', [Bb]: 'a' };
    ok('A bấm Sẵn sàng', await sua(tk[A], 'tranDau/' + TID, { ss: MP({ a: B(ben[A] === 'a'), b: B(ben[A] === 'b') }) }) === 200);
    T = await docAdmin('tranDau/' + TID);
    ok('B bấm Sẵn sàng', await sua(tk[Bb], 'tranDau/' + TID, { ss: MP({ a: B(true), b: B(true) }) }) === 200);
    T = await cho('trận bắt đầu', async () => { const x = await docAdmin('tranDau/' + TID); return x && x.trangThai === 'choi' && x.chu ? x : null; }, 30000);
    ok('Trận chạy: có chữ + gợi ý + giờ', T.chu && (T.goi || []).length > 0 && T.ketThuc > T.batDau, `bàn 1: ${T.chu} · ${(T.goi || []).length} từ · che ${T.che}`);
    ok('Hai phiếu hàng chờ đã xoá', !(await docAdmin('xhHang/' + A)) && !(await docAdmin('xhHang/' + Bb)));
    const ke = (await docAdmin('tranDau/' + TID + '/may/ke')).ds;
    const w0 = ke[0].w[0].toLowerCase();
    // ── gửi từ ──
    const tu = (tkn, uid, id) => ghiGioMay(tkn, 'tranDau/' + TID + '/tu/' + id, { uid: S(uid) }, ['luc'], true);
    ok('A gửi từ đúng', await tu(tk[A], A, w0 + '_0') === 200, w0);
    const tA = await cho('chấm từ', async () => { const x = await docAdmin('tranDau/' + TID + '/tu/' + w0 + '_0'); return x && x.ok != null ? x : null; });
    ok('Máy chủ chấm ĐÚNG + cộng điểm', tA.ok === true && tA.d > 0, '+' + tA.d);
    ok('B gửi lại đúng từ đó = Taken', await tu(tk[Bb], Bb, w0 + '_0') !== 200);
    ok('B gửi từ sai', await tu(tk[Bb], Bb, 'zzqx_0') === 200);
    const tB = await cho('chấm từ sai', async () => { const x = await docAdmin('tranDau/' + TID + '/tu/zzqx_0'); return x && x.ok != null ? x : null; });
    ok('Máy chủ chấm SAI', tB.ok === false);
    // ── chat ──
    const w1 = (ke[0].w[1] || ke[0].w[0]);
    const c1 = 'c1' + Date.now(), c2 = 'c2' + Date.now();
    xoa.push('tranDau/' + TID + '/chatGui/' + c1, 'tranDau/' + TID + '/chatGui/' + c2, 'tranDau/' + TID + '/chat/' + c2);
    ok('B gửi chat có ĐÁP ÁN (viết cách chữ)', await ghiGioMay(tk[Bb], 'tranDau/' + TID + '/chatGui/' + c1, { uid: S(Bb), chu: S('đáp án là ' + w1.split('').join(' ')) }, ['luc'], true) === 200);
    const g1 = await cho('lọc chat', async () => { const x = await docAdmin('tranDau/' + TID + '/chatGui/' + c1); return x && (x.ok || x.chan) ? x : null; });
    ok('Máy chủ CHẶN tin có đáp án', g1.chan === true && g1.ly === 'dapAn', g1.ly);
    await ngu(2100);
    ok('A gửi chat thường', await ghiGioMay(tk[A], 'tranDau/' + TID + '/chatGui/' + c2, { uid: S(A), chu: S('GG 👍') }, ['luc'], true) === 200);
    const g2 = await cho('chép chat', async () => { const x = await docAdmin('tranDau/' + TID + '/chatGui/' + c2); return x && (x.ok || x.chan) ? x : null; });
    const ch = await docAdmin('tranDau/' + TID + '/chat/' + c2);
    ok('Tin thường vào ô chat chung', g2.ok === true && ch && ch.chu === 'GG 👍' && ch.vai === ben[A], ch && ch.vai);
    ok('B đọc được chat', (await goi(`${FS_GOC}/tranDau/${TID}/chat/${c2}${k}`, { headers: H2(tk[Bb]) })).status === 200);
    // ── đổi bàn sau 20 giây ──
    T = await docAdmin('tranDau/' + TID);
    const vanTruoc = T.van || 0;
    const doi = (T.doiLuc || T.batDau) + 20600 - Date.now();
    ok('Xin đổi bàn SỚM bị từ chối', await tu(tk[A], A, 'zhet_' + vanTruoc) === 200 && (await cho('xoá xin sớm', async () => !(await docAdmin('tranDau/' + TID + '/tu/zhet_' + vanTruoc)) || null, 15000)));
    if (doi > 0) { console.log('  … đợi ' + Math.ceil(doi / 1000) + ' giây cho hết 20 giây của bàn'); await ngu(doi); }
    ok('Hết 20 giây: xin đổi bàn', await tu(tk[A], A, 'zhet_' + vanTruoc) === 200);
    T = await cho('đổi bàn', async () => { const x = await docAdmin('tranDau/' + TID); return x && (x.van || 0) > vanTruoc ? x : null; }, 20000);
    ok('Máy chủ sang bàn mới', (T.van || 0) === vanTruoc + 1, 'bàn ' + ((T.van || 0) + 1) + ': ' + T.chu);
    // ── A rời trận ⇒ chốt ──
    ok('A rời trận', await ghiGioMay(tk[A], 'tranDau/' + TID + '/nhip/' + A, { luc: I(Date.now()), roi: B(true) }, ['sv'], false) === 200);
    xoa.push('tranDau/' + TID + '/nhip/' + A);
    T = await cho('chốt trận', async () => { const x = await docAdmin('tranDau/' + TID); return x && x.trangThai === 'xong' ? x : null; }, 30000);
    ok('Trận chốt: A thua (rời), B thắng', T.kq[ben[A]] === 'thua' && T.kq[ben[Bb]] === 'thang', 'ly ' + T.ly);
    ok('Trận mang kết quả hạng (xhKq) cho 2 bên', T.xhKq && T.xhKq.a && T.xhKq.b, JSON.stringify(T.xhKq && T.xhKq[ben[Bb]]));
    const eA = await docAdmin('xhMua/' + MUA + '/em/' + A), eB = await docAdmin('xhMua/' + MUA + '/em/' + Bb);
    ok('Điểm hạng A: trận xếp lớp 1/5, bị khoá 2 phút', eA && eA.xl === 1 && eA.khoaDen > Date.now(), eA && `xl ${eA.xl} · khoá còn ${Math.round((eA.khoaDen - Date.now()) / 1000)}s`);
    ok('Điểm hạng B: trận xếp lớp 1/5, thắng 1', eB && eB.xl === 1 && eB.xlThang === 1, eB && `mmr ${eB.mmr}`);
    ok('A đọc điểm hạng của mình', (await goi(`${FS_GOC}/xhMua/${MUA}/em/${A}${k}`, { headers: H2(tk[A]) })).status === 200);
    ok('Bảng top 20 đã ghi', !!(await docAdmin('xhMua/' + MUA + '/bang/top')));
    ok('A đang khoá ⇒ vào hàng chờ bị máy chủ báo lỗi', await (async () => {
      await ghiGioMay(tk[A], 'xhHang/' + A, { mua: S(MUA) }, ['vao', 'nhip'], true);
      const x = await cho('báo khoá', async () => { const y = await docAdmin('xhHang/' + A); return y && y.loi ? y : null; }, 20000);
      return x.loi === 'khoa';
    })());
  } catch (e) { console.error('  ✗ DỪNG:', e.message); hong++; }
  finally {
    try {
      if (TID) for (const sub of ['tu', 'nhip', 'may', 'chat', 'chatGui', 'tim', 'xem']) {
        const r = await goi(`${FS_GOC}/tranDau/${TID}/${sub}?pageSize=100`, { headers: await H() });
        ((r.json && r.json.documents) || []).forEach((d) => xoa.push(d.name.split('/documents/')[1]));
      }
    } catch (_) { }
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
