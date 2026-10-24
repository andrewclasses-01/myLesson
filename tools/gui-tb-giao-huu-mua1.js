// 📣 24/10/2026 (web v1.418.0) — GỬI THÔNG BÁO KẾT THÚC GIAO HỮU A SHOW SPEED MÙA 1 cho MỌI học sinh (thầy duyệt mẫu v2:
//    D:\OTHERS\CLAUDE\THONG BAO GIAO HUU MUA 1 - thiet ke\mau-v2).
//
//   node tools/gui-tb-giao-huu-mua1.js --xem      (tính + in tóm tắt + ghi bản xem trước JSON, KHÔNG ghi kho)
//   node tools/gui-tb-giao-huu-mua1.js --gui      (ghi kho: thongBao/gh1mua1 + tbNhan/gh1mua1_<số HS> + nwCauHinh/huyHieu)
//   node tools/gui-tb-giao-huu-mua1.js --dung     (thôi hiện thông báo: tt 'xong')
//
// Dữ liệu CHỐT lúc chạy: trận tranDau giao hữu em–em (giai '', không gv) trangThai 'xong'. Thưởng (thầy chốt 24/10):
//   · mỗi 10 trận = 1 ⭐, trần 10 ⭐ (từ 100 trận) · 10 bạn THẮNG nhiều nhất +5 ⭐ · 10 bạn CHĂM (nhiều trận) nhất: HUY HIỆU
//     "Chiến binh A Show Speed · Mùa 1" sau tên 30 ngày (nwCauHinh/huyHieu, js/huy-hieu.js).
//   · Thông báo kiểu `gh1` (js/tb-gh.js vẽ 3 màn) đi đúng đường thông báo trang chủ có sẵn (js/thong-bao.js): phiếu tbNhan mang `sao`
//     riêng + `gh` thành tích riêng của em; em bấm nhận ⇒ saoDot/tb_<mã>_<số> (luật dang-luat-thong-bao.js, không đổi luật).
//   ⛔ Thẻ KHÔNG hiện tổng số trận / số người (thầy chốt) — thongBao chỉ mang 2 danh sách top 10.
'use strict';
const fs = require('fs');
const path = require('path');
const M = require('module');
const GOC = path.join(__dirname, 'dang-luat-gioi-han-choi.js');
let src = fs.readFileSync(GOC, 'utf8');
src = src.slice(0, src.lastIndexOf('(async () => {')) + '\nmodule.exports = { tokenQuanTri, goi, FS_GOC, DB };';
const mod = new M(GOC); mod.filename = GOC; mod.paths = M._nodeModulePaths(__dirname); mod._compile(src, GOC);
const { tokenQuanTri, goi, FS_GOC, DB } = mod.exports;

const MA_TB = 'gh1mua1';
const TRAN_BAC = 10, BAC_MAX = 10, THANG_SAO = 5, HH_NGAY = 30;

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
async function lietKe(duong, mask) {
  const tk = await tokenQuanTri(), ra = [];
  let page = '';
  do {
    const u = FS_GOC + '/' + duong + '?pageSize=300' + (page ? '&pageToken=' + encodeURIComponent(page) : '') + (mask || []).map((f) => '&mask.fieldPaths=' + f).join('');
    const r = await goi(u, { headers: { Authorization: 'Bearer ' + tk } });
    if (r.status !== 200) throw new Error(duong + ' HTTP ' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
    (r.json.documents || []).forEach((d) => { const o = giaTri({ mapValue: { fields: d.fields || {} } }); o._id = d.name.split('/').pop(); ra.push(o); });
    page = r.json.nextPageToken || '';
  } while (page);
  return ra;
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
const khongDau = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const slugLop = (s) => khongDau(s).replace(/[^a-z0-9]/g, '') || 'lop';
const slugTen = (s) => khongDau(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'hs';
const chuanMa = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();
const tenGoi = (t) => String(t || '').replace(/\s+\d+$/, '').trim().split(/\s+/).slice(-2).join(' ');

async function tinh(gop) {
  const [tran, soCai, lw, users] = await Promise.all([
    lietKe('tranDau', ['a', 'b', 'tenA', 'tenB', 'lop', 'giai', 'gv', 'trangThai', 'kq', 'batDau', 'taoLuc']),
    doc1('hsSo/soCai'), doc1('lessonWeb/lop'), lietKe('nwUsers', ['ten', 'vaiTro'])]);
  const nguoi = (soCai && soCai.nguoi) || {}, maSo = {};
  Object.keys(nguoi).forEach((n) => { const P = nguoi[n] || {}; if (P.ma) maSo[chuanMa(P.ma)] = n; (P.maCu || []).forEach((m) => { if (!maSo[chuanMa(m)]) maSo[chuanMa(m)] = n; }); });
  const x = JSON.parse((lw && lw.json) || '{}');
  const U = {}; users.forEach((u) => { U[u._id] = u; });
  // người nhận: y hộp Thông báo "Tất cả học sinh · Mọi lớp" (js/tb-ql.js tinhNguoiNhan) — mỗi số HS một phiếu, lớp đầu tiên gặp
  const em = {}, thieu = [];
  (x.lop || []).concat(x.khoa || []).forEach((l) => {
    const tenLop = String(l.tenGoc || l.maLop);
    (l.hocSinh || []).forEach((h) => {
      const k = h.ma ? chuanMa(h.ma) : '', so = k ? maSo[k] : '';
      if (!so) { thieu.push(h.ten + ' (' + tenLop + ')'); return; }
      if (em[so]) return;
      const u = U['hs_' + so] || {};
      em[so] = { so, m: k, t: h.ten || '', lop: tenLop, maLop: String(l.maLop || ''), ten: u.ten || tenGoi(h.ten), anh: 'assets/avatar/' + slugLop(tenLop) + '/' + slugTen(h.ten) + '.jpg',
        n: 0, T: 0, H: 0, B: 0, ban: new Set(), ngay: new Set() };
    });
  });
  // ⭐ TÀI KHOẢN CŨ (uid `hs_<id myStudent>` trước đợt đánh lại số HS): trận cũ của CHÍNH em nằm ở uid khác. --gop ⇒ nối uid cũ về em
  //   hiện tại theo TÊN + MÃ LỚP ghi trong trận (chỉ nhận khi khớp đúng MỘT em). Thầy chốt gộp hay không.
  const XONG = tran.filter((t) => !t.giai && !t.gv && t.trangThai === 'xong'), noi = {};
  if (gop) {
    const ten = {};
    XONG.forEach((t) => ['a', 'b'].forEach((k) => {
      const u = String(t[k] || ''), so = u.replace(/^hs_/, ''); if (em[so]) return;
      const kh = (t['ten' + k.toUpperCase()] || '') + '|' + (t.lop || ''); (ten[u] = ten[u] || {})[kh] = (ten[u][kh] || 0) + 1;
    }));
    Object.keys(ten).forEach((u) => {
      const [tn, lp] = Object.entries(ten[u]).sort((a, b) => b[1] - a[1])[0][0].split('|');
      const ung = Object.values(em).filter((e) => e.maLop === lp && (khongDau(e.ten) === khongDau(tn) || khongDau(e.t).endsWith(khongDau(tn))));
      if (ung.length === 1) noi[u] = ung[0].so;
    });
    console.log('gộp tài khoản cũ:', Object.keys(noi).length, Object.entries(noi).map(([u, so]) => u + '→' + em[so].ten).join(', '));
  }
  // thành tích: trận giao hữu em–em đã xong (uid hs_<số HS>, + uid cũ đã nối)
  XONG.forEach((t) => {
    [['a', 'b'], ['b', 'a']].forEach(([k, kk]) => {
      const u = String(t[k] || ''), so = noi[u] || u.replace(/^hs_/, ''), e = em[so]; if (!e) return;
      e.n++; const r = (t.kq || {})[k]; if (r === 'thang') e.T++; else if (r === 'hoa') e.H++; else e.B++;
      e.ban.add(noi[t[kk]] ? 'hs_' + noi[t[kk]] : t[kk]); e.ngay.add(new Date((t.batDau || t.taoLuc || 0) + 7 * 36e5).toISOString().slice(0, 10));
    });
  });
  const ds = Object.values(em);
  const cham = ds.filter((e) => e.n).sort((a, b) => b.n - a.n || b.T - a.T).slice(0, 10);
  const thang = ds.filter((e) => e.T).sort((a, b) => b.T - a.T || b.T / b.n - a.T / a.n).slice(0, 10);
  const hangC = {}, hangT = {};
  ds.filter((e) => e.n).sort((a, b) => b.n - a.n || b.T - a.T).forEach((e, i) => { hangC[e.so] = i + 1; });
  ds.filter((e) => e.n).sort((a, b) => b.T - a.T || b.T / b.n - a.T / a.n).forEach((e, i) => { hangT[e.so] = i + 1; });
  const topC = new Set(cham.map((e) => e.so)), topT = new Set(thang.map((e) => e.so));
  const the = (e) => ({ so: e.so, ten: e.ten, lop: e.lop, anh: e.anh, n: e.n, T: e.T, tyLe: e.n ? Math.round(100 * e.T / e.n) : 0, ngay: e.ngay.size, doiThu: e.ban.size });
  ds.forEach((e) => {
    e.sTran = Math.min(Math.floor(e.n / TRAN_BAC), BAC_MAX); e.sThang = topT.has(e.so) ? THANG_SAO : 0; e.hh = topC.has(e.so);
    e.sao = e.sTran + e.sThang;
    e.gh = { n: e.n, T: e.T, H: e.H, B: e.B, hc: hangC[e.so] || 0, ht: hangT[e.so] || 0, sTran: e.sTran, sThang: e.sThang, hh: e.hh, ten: e.ten, anh: e.anh,
      canC: cham.length === 10 ? Math.max(0, cham[9].n - e.n + 1) : 0, canT: thang.length === 10 ? thang[9].T : 0 };
  });
  return { ds, cham: cham.map(the), thang: thang.map(the), thieu, em };
}

(async () => {
  const a = process.argv.slice(2);
  try {
    if (a.includes('--dung')) { await ghi([{ update: { name: DB + '/documents/thongBao/' + MA_TB, fields: thanhGT({ tt: 'xong' }).mapValue.fields }, updateMask: { fieldPaths: ['tt'] } }]); console.log('đã dừng'); return; }
    const k = await tinh(!a.includes('--khong-gop'));
    const coSao = k.ds.filter((e) => e.sao > 0);
    console.log('người nhận', k.ds.length, '· có sao', coSao.length, '· tổng sao', coSao.reduce((s, e) => s + e.sao, 0), '· thiếu số HS', k.thieu.length);
    console.log('TOP CHĂM', k.cham.map((e) => e.ten + ' ' + e.lop + ' ' + e.n).join(' | '));
    console.log('TOP THẮNG', k.thang.map((e) => e.ten + ' ' + e.lop + ' ' + e.T).join(' | '));
    const luc = Date.now();
    const tb = { ten: 'Giao hữu A Show Speed · Mùa 1', kieu: 'gh1', nut: 'NHẬN THƯỞNG', noi: 'Tổng kết giao hữu A Show Speed mùa 1', tt: 'dang', dangLuc: luc, sua: luc, tao: luc,
      sao: 0, soNhan: k.ds.length, gui: { gt: 'all', lops: [] }, gh: { cham: k.cham, thang: k.thang, thangSao: THANG_SAO, bac: TRAN_BAC, bacMax: BAC_MAX } };
    const hh = { gh1: { ten: 'Chiến binh A Show Speed · Mùa 1', tu: luc, den: luc + HH_NGAY * 864e5,
      ds: k.ds.filter((e) => e.hh).map((e) => ({ so: e.so, uid: 'hs_' + e.so, ma: e.m, ten: e.ten, t: e.t, lop: e.lop, lopSlug: slugLop(e.lop), tenSlug: slugTen(e.t) })) } };
    if (a.includes('--xem')) {
      const ra = path.join(require('os').tmpdir(), 'gh1mua1-xem.json');
      fs.writeFileSync(ra, JSON.stringify({ tb, hh, mau: k.ds.slice(0, 400).map((e) => ({ so: e.so, t: e.t, lop: e.lop, sao: e.sao, gh: e.gh })) }, null, 1));
      console.log('bản xem trước:', ra, '(chưa ghi kho)'); return;
    }
    if (!a.includes('--gui')) { console.log('Dùng: --xem | --gui | --dung'); return; }
    const cu = await doc1('thongBao/' + MA_TB);
    if (cu) throw new Error('thongBao/' + MA_TB + ' ĐÃ CÓ — không gửi lại (xoá tay nếu thật sự muốn gửi lại)');
    const w = k.ds.map((e) => viet('tbNhan/' + MA_TB + '_' + e.so, { tb: MA_TB, so: e.so, m: e.m, t: e.t, lop: e.lop, sao: e.sao, nhan: false, gh: e.gh }));
    w.push(viet('nwCauHinh/huyHieu', hh));
    console.log('ghi', w.length, 'phiếu + huy hiệu…');
    await ghi(w);
    await ghi([viet('thongBao/' + MA_TB, tb)]);   // thông báo "Đang hiện" ghi SAU CÙNG (phiếu đủ rồi mới hiện)
    console.log('XONG — thông báo đang hiện');
  } catch (e) { console.error('LỖI', e.message); process.exit(1); }
})();
