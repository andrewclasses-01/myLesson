// 📣 26/10/2026 — GỬI THÔNG BÁO KHỞI ĐỘNG MÙA XẾP HẠNG (kiểu `xh2`, js/tb-xh2.js — thầy duyệt mẫu
//    D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\thong-bao-mua2-v3) cho MỌI học sinh.
//
//   node tools/gui-tb-xep-hang-mua2.js --xem      (đọc mùa hiện tại + đếm người nhận, KHÔNG ghi kho)
//   node tools/gui-tb-xep-hang-mua2.js --gui      (ghi tbNhan/<mã>_<số HS> cho mọi em rồi thongBao/<mã> "Đang hiện")
//   node tools/gui-tb-xep-hang-mua2.js --dung     (thôi hiện: tt 'xong')
//
// Mùa lấy từ caiDat/xepHang → xhMua/{mua} (thầy tạo ở dashboard: Quản lý thách đấu → Mùa xếp hạng). Chưa có mùa ⇒ DỪNG.
// Người nhận = y hộp Thông báo "Tất cả học sinh · Mọi lớp" (lessonWeb/lop + hsSo/soCai). Không thưởng sao (sao 0) — em bấm X / PHÂN HẠNG NGAY
// là đánh dấu đã xem qua đường thông báo có sẵn (js/thong-bao.js, luật dang-luat-thong-bao.js — không đổi luật).
'use strict';
const fs = require('fs');
const path = require('path');
const M = require('module');
const GOC = path.join(__dirname, 'dang-luat-gioi-han-choi.js');
let src = fs.readFileSync(GOC, 'utf8');
src = src.slice(0, src.lastIndexOf('(async () => {')) + '\nmodule.exports = { tokenQuanTri, goi, FS_GOC, DB };';
const mod = new M(GOC); mod.filename = GOC; mod.paths = M._nodeModulePaths(__dirname); mod._compile(src, GOC);
const { tokenQuanTri, goi, FS_GOC, DB } = mod.exports;

function giaTri(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(giaTri);
  if ('mapValue' in v) { const o = {}; Object.entries(v.mapValue.fields || {}).forEach(([k, x]) => { o[k] = giaTri(x); }); return o; }
  return null;
}
function thanhGT(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === 'string') return { stringValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(thanhGT) } };
  const f = {}; Object.keys(x).forEach((k) => { f[k] = thanhGT(x[k]); }); return { mapValue: { fields: f } };
}
async function doc1(duong) {
  const tk = await tokenQuanTri(), r = await goi(FS_GOC + '/' + duong, { headers: { Authorization: 'Bearer ' + tk } });
  if (r.status === 404) return null;
  if (r.status !== 200) throw new Error(duong + ' HTTP ' + r.status);
  return giaTri({ mapValue: { fields: r.json.fields || {} } });
}
async function ghi(writes) {   // từng lô 400
  const tk = await tokenQuanTri();
  for (let i = 0; i < writes.length; i += 400) {
    const r = await goi('https://firestore.googleapis.com/v1/' + DB + '/documents:commit', { method: 'POST', headers: { Authorization: 'Bearer ' + tk }, json: { writes: writes.slice(i, i + 400) } });
    if (r.status !== 200) throw new Error('commit HTTP ' + r.status + ' ' + JSON.stringify(r.json).slice(0, 300));
    console.log('  đã ghi', Math.min(i + 400, writes.length), '/', writes.length);
  }
}
const viet = (duong, du) => ({ update: { name: DB + '/documents/' + duong, fields: thanhGT(du).mapValue.fields } });
const chuanMa = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();

async function nguoiNhan() {
  const [soCai, lw] = await Promise.all([doc1('hsSo/soCai'), doc1('lessonWeb/lop')]);
  const nguoi = (soCai && soCai.nguoi) || {}, maSo = {};
  Object.keys(nguoi).forEach((n) => { const P = nguoi[n] || {}; if (P.ma) maSo[chuanMa(P.ma)] = n; (P.maCu || []).forEach((m) => { if (!maSo[chuanMa(m)]) maSo[chuanMa(m)] = n; }); });
  const x = JSON.parse((lw && lw.json) || '{}'), em = {}, thieu = [];
  (x.lop || []).concat(x.khoa || []).forEach((l) => {
    const tenLop = String(l.tenGoc || l.maLop);
    (l.hocSinh || []).forEach((h) => {
      const k = h.ma ? chuanMa(h.ma) : '', so = k ? maSo[k] : '';
      if (!so) { thieu.push(h.ten + ' (' + tenLop + ')'); return; }
      if (!em[so]) em[so] = { so, m: k, t: h.ten || '', lop: tenLop };
    });
  });
  return { ds: Object.values(em), thieu };
}

(async () => {
  const a = process.argv.slice(2);
  try {
    const cfg = await doc1('caiDat/xepHang'), mua = cfg && cfg.mua ? String(cfg.mua) : '';
    if (!mua) throw new Error('CHƯA CÓ MÙA — thầy tạo mùa ở dashboard (Quản lý thách đấu → Mùa xếp hạng) trước.');
    const Mua = await doc1('xhMua/' + mua);
    if (!Mua) throw new Error('Không đọc được xhMua/' + mua);
    const MA_TB = 'xh2' + mua.replace(/[^A-Za-z0-9]/g, '').slice(0, 30);
    if (a.includes('--dung')) { await ghi([{ update: { name: DB + '/documents/thongBao/' + MA_TB, fields: thanhGT({ tt: 'xong' }).mapValue.fields }, updateMask: { fieldPaths: ['tt'] } }]); console.log('đã dừng', MA_TB); return; }
    const k = await nguoiNhan();
    console.log('mùa', mua, '·', Mua.ten, '·', new Date(Mua.tu).toLocaleString('vi-VN'), '→', new Date(Mua.den).toLocaleString('vi-VN'));
    console.log('người nhận', k.ds.length, '· thiếu số HS', k.thieu.length, k.thieu.slice(0, 8).join(', '));
    const luc = Date.now();
    const tb = { ten: 'Khởi động ' + (Mua.ten || 'mùa mới') + ' · Xếp hạng thế giới', kieu: 'xh2', nut: 'PHÂN HẠNG NGAY', noi: 'Giới thiệu xếp hạng thế giới A Show Speed', tt: 'dang',
      dangLuc: luc, sua: luc, tao: luc, sao: 0, soNhan: k.ds.length, gui: { gt: 'all', lops: [] },
      mua, tenMua: Mua.ten || '', tu: Mua.tu, den: Mua.den, saoHang: Mua.sao || {}, gioVang: Mua.gioVang || {} };
    if (a.includes('--xem')) { console.log('mã thông báo', MA_TB, '(chưa ghi kho)'); return; }
    if (!a.includes('--gui')) { console.log('Dùng: --xem | --gui | --dung'); return; }
    if (await doc1('thongBao/' + MA_TB)) throw new Error('thongBao/' + MA_TB + ' ĐÃ CÓ — không gửi lại (dùng --dung để thôi hiện)');
    await ghi(k.ds.map((e) => viet('tbNhan/' + MA_TB + '_' + e.so, { tb: MA_TB, so: e.so, m: e.m, t: e.t, lop: e.lop, sao: 0, nhan: false })));
    await ghi([viet('thongBao/' + MA_TB, tb)]);   // thông báo "Đang hiện" ghi SAU CÙNG (phiếu đủ rồi mới hiện)
    console.log('XONG — thông báo', MA_TB, 'đang hiện cho', k.ds.length, 'em');
  } catch (e) { console.error('LỖI', e.message); process.exit(1); }
})();
