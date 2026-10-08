/* ⛔ FILE SINH TỰ ĐỘNG từ kho myPay v0.18.0 (37ab2d7) bằng tools/dong-goi-web.js — ĐỪNG SỬA TAY (sửa ở kho myPay rồi đóng gói lại) */
(function (g) {
  var G = {};
  G["E:\\LAP TRINH APP\\myPay\\src\\main.js"] = function (module, exports, require, __dirname, __filename, process, Buffer) {
const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, nativeImage } = require('electron');
const path = require('path');

const kho = require('./main/lib/kho-pay');
const diemdanh = require('./main/lib/diemdanh');
const phi = require('./main/lib/phi');
const saoke = require('./main/lib/saoke');
const engine = require('./main/lib/engine');
const hoadon = require('./main/lib/hoadon');
const khoFs = require('./main/lib/kho-fs');
const dongBoTen = require('./main/lib/dong-bo-ten');
const fs = require('fs');

let win = null;

const F_CUASO = path.join(kho.GOC_DATA, 'cua-so.json');
function docCuaSo() {
  try {
    let raw = fs.readFileSync(F_CUASO, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    return JSON.parse(raw);
  } catch (_) { return null; }
}
function ghiCuaSo(b) {
  try {
    const tmp = F_CUASO + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(b, null, 1), 'utf8');
    fs.renameSync(tmp, F_CUASO);
  } catch (_) { /* lỗi ghi vặt không được chặn app */ }
}
function luuCuaSoBayGio() {
  if (!win || win.isDestroyed()) return;
  const maximized = win.isMaximized();
  const b = maximized ? (win.__boundsTruocMax || win.getBounds()) : win.getBounds();
  ghiCuaSo({ x: b.x, y: b.y, width: b.width, height: b.height, maximized });
}

function taoCuaSo() {
  const nho = docCuaSo();
  const opt = {
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    backgroundColor: '#edf0f5',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  };
  if (nho && Number.isFinite(nho.width) && Number.isFinite(nho.height)) {
    Object.assign(opt, { width: nho.width, height: nho.height });
    if (Number.isFinite(nho.x) && Number.isFinite(nho.y)) Object.assign(opt, { x: nho.x, y: nho.y });
  }
  win = new BrowserWindow(opt);
  if (nho && nho.maximized) win.maximize();
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('console-message', (_e, level, msg) => {
    console.log('[renderer]', msg);
  });
  win.on('resize', () => { if (!win.isMaximized()) win.__boundsTruocMax = win.getBounds(); });
  win.on('move', () => { if (!win.isMaximized()) win.__boundsTruocMax = win.getBounds(); });
  win.on('close', luuCuaSoBayGio);
}

const coKhoa = app.requestSingleInstanceLock();
if (!coKhoa) { app.quit(); } else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(taoCuaSo);
}
app.on('window-all-closed', () => app.quit());

function boc(ham) {
  return async (_e, ...args) => {
    try { return { ok: true, data: await ham(...args) }; }
    catch (err) {
      console.error('[main]', err && err.stack || err);
      return { ok: false, loi: String((err && err.message) || err) };
    }
  };
}

function tinhKetQuaThang(m, y) {
  const caiDat = kho.docCaiDat();
  const dd = diemdanh.docThang(m, y);                 // buổi học từng em từ myStudent
  const giaDinh = kho.docGiaDinh(dd.hocSinhDs);
  const bang = phi.tinhThang(dd, caiDat, giaDinh);    // đơn vị thu + tiền cần đóng
  let thang = kho.docThang(m, y);                      // sao kê + gán tay + ghi đè đã lưu
  const hocMay = kho.docHocMay();
  const dsLopBiet = (dd.lopDs || []).map((L) => L.ma_lop);

  if (!thang.xacNhanDaDiCu) {
    const kqCu = engine.doiSoat(bang.units, thang.txns || [], hocMay, thang.ganTay || {}, {}, dsLopBiet);
    const diCu = [];
    for (const mm of kqCu.matched) {
      if (mm.ti < 0) continue;
      const tx = kqCu.txns[mm.ti];
      const unitIds = mm.u.kind === 'grp' ? (mm.u.members || []).map((x) => x.id) : [mm.u.id];
      diCu.push({ content: tx.content, amount: tx.amount, ngay: tx.ngay, nguon: tx.nguon, unitIds, via: mm.via, hit: mm.hit });
    }
    thang = kho.diCuXacNhan(m, y, diCu);
  }

  const ketQuaGiaoDich = engine.doiSoat(bang.units, thang.txns || [], hocMay, thang.ganTay || {}, {}, dsLopBiet);
  const duyet = thang.duyetMau || {};
  for (const mm of ketQuaGiaoDich.matched) {
    if (mm.ti >= 0 && (mm.via === 'L0' || mm.via === 'L2')) {
      const tx = ketQuaGiaoDich.txns[mm.ti];
      mm.daDuyet = !!(tx && duyet[kho.khoaTxn(tx)]);
    }
  }
  const xnMap = new Map((thang.xacNhan || []).map((x) => [x.khoa, x]));
  for (const t of ketQuaGiaoDich.txns) t.daXacNhanRoi = xnMap.has(kho.khoaTxn(t));

  const txnsXacNhan = (thang.xacNhan || []).map((x) => ({ content: x.content, amount: x.amount, ngay: x.ngay, nguon: x.nguon }));
  const ganTayEpBuoc = {};
  for (const x of (thang.xacNhan || [])) ganTayEpBuoc[x.khoa] = { unitIds: x.unitIds || [] };
  const ketQua = engine.doiSoat(bang.units, txnsXacNhan, [], ganTayEpBuoc, thang.ghiDe || {}, dsLopBiet);
  kho.apDungChotTay(ketQua, bang.units, kho.docChotTay().ds, m, y);

  const lechChot = kho.soSanhChot(thang.chot, bang.units);
  const ghiChu = kho.docGhiChu().ds;
  return { dd, bang, thang, ketQua, ketQuaGiaoDich, caiDat, giaDinh, lechChot, ghiChu };
}

function timUnitTheoMa(m, y, loai, hsId, idNha) {
  const { bang } = tinhKetQuaThang(m, y);
  if (loai === 'nha') return bang.units.find((u) => u.kind === 'fam' && String(u.idNha) === String(idNha)) || null;
  return bang.units.find((u) => u.kind !== 'fam' && String(u.hsId) === String(hsId))
    || bang.units.find((u) => (u.members || []).some((x) => String(x.id) === String(hsId))) || null;
}

ipcMain.handle('thang:doc', boc(async (m, y) => tinhKetQuaThang(m, y)));

ipcMain.handle('saoke:chon', boc(async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Chon file sao ke ngan hang (.xlsx)',
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xlsm'] }],
    properties: ['openFile', 'multiSelections'],
  });
  return r.canceled ? [] : r.filePaths;
}));
ipcMain.handle('saoke:nap', boc(async (m, y, duongDans) => {
  const ds = [];
  for (const p of duongDans) ds.push(Object.assign(saoke.docFile(p), { duongDan: p })); // tự vá file lỗi, CHỈ ĐỌC
  return kho.napSaoKe(m, y, ds);
}));
ipcMain.handle('saoke:xoa', boc(async (m, y, tenFile) => kho.xoaSaoKe(m, y, tenFile)));
ipcMain.handle('saoke:mo', boc(async (m, y, tenFile) => {
  const t = kho.docThang(m, y);
  const f = (t.saoKe || []).find((x) => x.ten === tenFile);
  if (!f || !f.duongDan) throw new Error('KHONG_CO_DUONG_DAN — file này nạp trước v0.8.0, chưa lưu đường dẫn. Kéo lại file vào app giúp tôi.');
  if (!fs.existsSync(f.duongDan)) throw new Error('FILE_KHONG_CON — không thấy file ở: ' + f.duongDan);
  const loi = await shell.openPath(f.duongDan);
  if (loi) throw new Error('MO_FILE_LOI — ' + loi);
  return true;
}));

ipcMain.handle('gan:tay', boc(async (m, y, ti, unitIds, hoc) => kho.ganTay(m, y, ti, unitIds, hoc)));
ipcMain.handle('gan:huy', boc(async (m, y, ti) => kho.huyGan(m, y, ti)));

function ungVienXacNhan(ketQuaGiaoDich) {
  const ung = [];
  for (const mm of ketQuaGiaoDich.matched) {
    if (mm.ti < 0) continue; // "thầy đánh dấu đã đóng" không phải giao dịch sao kê thật
    const tx = ketQuaGiaoDich.txns[mm.ti];
    if (!tx || tx.daXacNhanRoi) continue; // đã ghi cứng từ trước — bỏ qua, khỏi ghi trùng
    if ((mm.via === 'L0' || mm.via === 'L2') && !mm.daDuyet) continue;
    const unitIds = mm.u.kind === 'grp' ? (mm.u.members || []).map((x) => x.id) : [mm.u.id];
    ung.push({ content: tx.content, amount: tx.amount, ngay: tx.ngay, nguon: tx.nguon, unitIds, via: mm.via, hit: mm.hit });
  }
  return ung;
}
ipcMain.handle('giaodich:xacnhan', boc(async (m, y) => {
  const { ketQuaGiaoDich } = tinhKetQuaThang(m, y);
  const ung = ungVienXacNhan(ketQuaGiaoDich);
  const kq = kho.themXacNhan(m, y, ung);
  return { them: kq.them, tongUng: ung.length };
}));
ipcMain.handle('giaodich:lamsach', boc(async (m, y) => kho.lamSachGiaoDich(m, y)));
ipcMain.handle('giaodich:huyxacnhan', boc(async (m, y, khoa) => kho.xoaMotXacNhan(m, y, khoa)));
ipcMain.handle('gan:goiy', boc(async (m, y, ti) => {
  const { bang, dd, ketQuaGiaoDich } = tinhKetQuaThang(m, y);
  const tx = ketQuaGiaoDich.txns[ti];
  if (!tx) throw new Error('KHONG_THAY_GIAO_DICH');
  const dsLopBiet = (dd.lopDs || []).map((L) => L.ma_lop);
  const conThieu = bang.units.filter((u) => !(u.id in ketQuaGiaoDich.done));
  return engine.xepHangGoiY(conThieu, tx, dsLopBiet)
    .map((r) => ({ id: r.u.id, label: r.u.label, classes: r.u.classes, kind: r.u.kind, expected: r.u.expected, diem: r.diem, lyDo: r.lyDo }));
}));

ipcMain.handle('caidat:ghi', boc(async (caiDat) => kho.ghiCaiDat(caiDat)));
ipcMain.handle('caidat:doc', boc(async () => kho.docCaiDat()));
ipcMain.handle('giadinh:ghi', boc(async (gd) => {
  kho.ghiGiaDinh(gd);
  return kho.docGiaDinh(diemdanh.docHocSinh());
}));
ipcMain.handle('hocsinh:ds', boc(async () => diemdanh.docHocSinh().map((h) => ({
  id: h.id, ten: h.ten, lop: h.lop,
}))));

ipcMain.handle('thang:ghide', boc(async (m, y, unitId, patch) => kho.ghiDeUnit(m, y, unitId, patch)));

ipcMain.handle('mau:duyet', boc(async (m, y, ti, bat) => kho.duyetMau(m, y, ti, !!bat)));

ipcMain.handle('tamung:doc', boc(async () => kho.docTamUng(diemdanh.docHocSinh())));
ipcMain.handle('tamung:them', boc(async (d) => kho.themTamUng(d)));
ipcMain.handle('tamung:xoa', boc(async (hsId) => kho.xoaTamUng(hsId)));
ipcMain.handle('tamung:tru', boc(async (m, y, hsId, soTienCanTru) => {
  const { bang, ketQua } = tinhKetQuaThang(m, y);
  const u = bang.units.find((x) => x.kind === 'reg' && String(x.hsId) === String(hsId));
  if (!u) throw new Error('KHONG_THAY_HOC_SINH_LE — tạm ứng chỉ áp dụng học sinh lẻ, không áp dụng gia đình');
  if (u.id in ketQua.done) throw new Error('DA_DONG_ROI');
  const soTru = kho.truTamUng(hsId, m, y, soTienCanTru);
  if (!soTru) throw new Error('KHONG_CON_DU_DE_TRU');
  kho.ghiDeUnit(m, y, u.id, { daDong: true });
  return { soTru, conLai: kho.soDuTamUng(hsId), conThieuSauTru: Math.max(0, (Number(soTienCanTru) || 0) - soTru) };
}));

ipcMain.handle('nophi:doc', boc(async () => {
  const hsDs = diemdanh.docHocSinh();
  return kho.docNoPhi(hsDs, kho.docGiaDinh(hsDs));
}));
ipcMain.handle('nophi:them', boc(async (dong) => kho.themNoPhi(dong)));
ipcMain.handle('nophi:themrieng', boc(async (dong) => kho.themNoPhiRieng(dong)));
ipcMain.handle('nophi:xoa', boc(async (id) => kho.xoaNoPhi(id)));
ipcMain.handle('nophi:nopbu', boc(async (id) => {
  const d = kho.docNoPhiTho().dong.find((x) => x.id === id);
  if (!d) throw new Error('KHONG_THAY_DONG_NO');
  let u = null;
  try { u = timUnitTheoMa(d.m, d.y, d.loai, d.hsId, d.idNha); } catch (_) { u = null; }
  if (u) kho.ghiDeUnit(d.m, d.y, u.id, { daDong: true });
  kho.xoaNoPhi(id);
  return { daDanhDauThangCu: !!u, thang: d.m + '/' + d.y, ten: (u && u.label) || d.tenLuc || '' };
}));

ipcMain.handle('chottay:them', boc(async (dl) => kho.themChotTay(dl)));
ipcMain.handle('chottay:xoa', boc(async (id) => kho.xoaChotTay(id)));
ipcMain.handle('ghichu:ghi', boc(async (khoa, chu) => kho.ghiGhiChu(khoa, chu)));

ipcMain.handle('thang:chot', boc(async (m, y) => {
  const { bang } = tinhKetQuaThang(m, y);
  kho.chotThang(m, y, bang.units);
  return tinhKetQuaThang(m, y);
}));

ipcMain.handle('dongbo:ten', boc(async () => dongBoTen.chay()));

ipcMain.handle('hocmay:ds', boc(async () => kho.docHocMay()));
ipcMain.handle('hocmay:sua', boc(async (id, patch) => kho.suaHocMay(id, patch)));
ipcMain.handle('hocmay:xoa', boc(async (id) => kho.xoaHocMay(id)));

ipcMain.handle('nophi:chuagannhan', boc(async () => {
  const homNay = new Date();
  const tbd = (kho.docCaiDat() || {}).thangBatDau;
  const dsThang = diemdanh.dsThangCoDuLieu()
    .filter((t) => t.y < homNay.getFullYear() || (t.y === homNay.getFullYear() && t.m < homNay.getMonth() + 1))
    .filter((t) => !tbd || t.y > tbd.y || (t.y === tbd.y && t.m >= tbd.m));
  const ket = [];
  for (const { m, y } of dsThang) {
    let bang; let ketQua;
    try { ({ bang, ketQua } = tinhKetQuaThang(m, y)); } catch (_) { continue; }
    for (const u of bang.units) {
      if (!(u.buoi > 0)) continue;         // tháng đó lớp không học — bỏ qua
      if (u.id in ketQua.done) continue;   // đã đóng (khớp giao dịch tự động/tay, hoặc thầy đánh dấu daDong)
      const loai = u.kind === 'fam' ? 'nha' : 'hs';
      if (kho.coNoPhi(loai, u.hsId, u.idNha, m, y)) continue;         // đã gắn nhãn rồi
      ket.push({
        m, y, loai, hsId: u.hsId || null, idNha: u.idNha || null,
        ten: u.label, lop: (u.classes || []).join(', '), soTien: u.expected || 0, buoi: u.buoi,
      });
    }
  }
  ket.sort((a, b) => (b.y - a.y) || (b.m - a.m) || a.ten.localeCompare(b.ten, 'vi'));
  return ket;
}));

ipcMain.handle('hoadon:ghi', boc(async (tenFile, dataUrl) => hoadon.ghiPng(tenFile, dataUrl)));
ipcMain.handle('hoadon:moThuMuc', boc(async () => { shell.openPath(hoadon.thuMuc()); return true; }));
ipcMain.handle('hoadon:saochep', boc(async (dataUrl) => {
  clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
  return true;
}));

ipcMain.handle('fs:xemtruoc', boc(async (m, y) => {
  const { bang, ketQua } = tinhKetQuaThang(m, y);
  return khoFs.xayDsDay(m, y, bang, ketQua);
}));

ipcMain.handle('fs:day', boc(async (m, y) => {
  const { bang, ketQua, thang } = tinhKetQuaThang(m, y);
  return khoFs.dayThang(m, y, bang, ketQua, thang);
}));
ipcMain.handle('fs:trangthai', boc(async () => ({ coKhoa: khoFs.coKhoaQuanTri() })));

ipcMain.handle('app:thongtin', boc(async () => ({
  version: app.getVersion(),
  dataDir: kho.GOC_DATA,
})));

};
  G["E:\\LAP TRINH APP\\myPay\\src\\preload.js"] = function (module, exports, require, __dirname, __filename, process, Buffer) {
const { contextBridge, ipcRenderer } = require('electron');
const { webUtils } = require('electron');

const goi = (kenh) => (...args) => ipcRenderer.invoke(kenh, ...args);

contextBridge.exposeInMainWorld('mypay', {
  docThang: goi('thang:doc'),
  chonSaoKe: goi('saoke:chon'),
  napSaoKe: goi('saoke:nap'),
  xoaSaoKe: goi('saoke:xoa'),
  moFileSaoKe: goi('saoke:mo'),
  ganTay: goi('gan:tay'),
  huyGan: goi('gan:huy'),
  goiYGanTay: goi('gan:goiy'),
  xacNhanGiaoDich: goi('giaodich:xacnhan'),
  lamSachGiaoDich: goi('giaodich:lamsach'),
  huyXacNhan: goi('giaodich:huyxacnhan'),
  ghiCaiDat: goi('caidat:ghi'),
  docCaiDat: goi('caidat:doc'),
  ghiGiaDinh: goi('giadinh:ghi'),
  dsHocSinh: goi('hocsinh:ds'),
  ghiDeUnit: goi('thang:ghide'),
  duyetMau: goi('mau:duyet'),
  docNoPhi: goi('nophi:doc'),
  themNoPhi: goi('nophi:them'),
  themNoPhiRieng: goi('nophi:themrieng'),
  xoaNoPhi: goi('nophi:xoa'),
  nopBuNoPhi: goi('nophi:nopbu'),
  chuaGanNhan: goi('nophi:chuagannhan'),
  docTamUng: goi('tamung:doc'),
  themTamUng: goi('tamung:them'),
  xoaTamUng: goi('tamung:xoa'),
  truTamUng: goi('tamung:tru'),
  chotThang: goi('thang:chot'),
  themChotTay: goi('chottay:them'),
  xoaChotTay: goi('chottay:xoa'),
  ghiGhiChu: goi('ghichu:ghi'),
  dongBoTen: goi('dongbo:ten'),
  dsHocMay: goi('hocmay:ds'),
  suaHocMay: goi('hocmay:sua'),
  xoaHocMay: goi('hocmay:xoa'),
  ghiHoaDon: goi('hoadon:ghi'),
  moThuMucHoaDon: goi('hoadon:moThuMuc'),
  saoChepAnh: goi('hoadon:saochep'),
  xemTruocFirestore: goi('fs:xemtruoc'),
  dayFirestore: goi('fs:day'),
  fsTrangThai: goi('fs:trangthai'),
  thongTin: goi('app:thongtin'),
  duongDanFile: (file) => { try { return webUtils.getPathForFile(file); } catch (_) { return ''; } },
});

};
  G["E:\\LAP TRINH APP\\myPay\\src\\main\\lib\\engine.js"] = function (module, exports, require, __dirname, __filename, process, Buffer) {

const TOL_UNDER = 200000;

function stripAcc(s) {
  return String(s).replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function nname(s) { return String(s).trim().replace(/\s+/g, ' ').toUpperCase(); }
function normCls(v) {
  if (v === null || v === undefined) return '';
  return String(v).split('|')[0].replace(/\s+/g, '').toUpperCase()
    .replace(/-/g, '').replace(/\(/g, '').replace(/\)/g, '');
}
function ntx(s) {
  let x = stripAcc(String(s)).toUpperCase().replace(/[^A-Z0-9]+/g, ' ');
  return ' ' + x.replace(/\s+/g, ' ').trim() + ' ';
}
function nameHit(cs, name) {
  const nm = stripAcc(name).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  return !!nm && cs.includes(' ' + nm + ' ');
}
function toks(s) {
  return new Set(stripAcc(String(s)).toUpperCase().replace(/[^A-Z0-9]+/g, ' ')
    .split(' ').filter((t) => t.length >= 2));
}
function given(s) {
  const ts = stripAcc(String(s)).toUpperCase().replace(/[^A-Z0-9]+/g, ' ')
    .split(' ').filter((t) => t.length >= 2);
  return ts.length ? ts[ts.length - 1] : '';
}
function subset(a, b) { for (const x of a) if (!b.has(x)) return false; return true; }
function strictSubset(a, b) { return a.size < b.size && subset(a, b); }
function setEq(a, b) { return a.size === b.size && subset(a, b); }
function inter(a, b) { const r = new Set(); for (const x of a) if (b.has(x)) r.add(x); return r; }

function nameMatch(qs, xs) {
  const qt = toks(qs); const xt = toks(xs);
  if (!qt.size || !xt.size) return false;
  if (setEq(qt, xt)) return true;
  if (strictSubset(qt, xt)) {
    if (qt.size >= 2) return true;
    return qt.values().next().value === given(xs);
  }
  if (strictSubset(xt, qt)) return xt.size >= 2;
  return false;
}

function parseContent(raw) {
  const s = String(raw);
  let sender = '';
  const m = /CT\s*tu\s*\d*\s*(.+?)\s+toi\b/i.exec(s);
  if (m) sender = m[1].trim();
  let head = s.split(/\bCT\s*tu\b/i)[0];
  head = head.replace(/^\s*CT\s*DEN:\S+\s*/i, '');
  head = head.replace(/^\s*MBVCB[.\d]*\.?/i, '');
  head = head.replace(/^\s*Vietinbank;\d+;?\s*/i, ''); // ⛔ chỉ cắt số TK, GIỮ tên (bẫy v1.0)
  head = head.replace(/\b\d{3}[A-Z0-9]{8,}\b/g, ' ');
  let note = head.split(/\btoi\b|PHAM XUAN NINH|tai VIETINBANK/i)[0];
  note = note.replace(/,?\s*ma\s*GD\s*\d+.*$/i, '');
  note = note.replace(/\s+/g, ' ').replace(/^[\s.,;-]+|[\s.,;-]+$/g, '');
  return { note, sender };
}

function lopHopLe(units) {
  const ds = new Set();
  for (const u of units) for (const c of u.classes) ds.add(c);
  return [...ds];
}
function classesIn(s, dsLop) {
  const comp = stripAcc(String(s)).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const out = new Set();
  for (const cls of dsLop) {
    const n1 = normCls(cls);
    const n2 = String(cls).replace(/\(.*?\)/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if ((n1 && comp.includes(n1)) || (n2 && comp.includes(n2))) out.add(cls);
  }
  return out;
}

function statusOf(paid, exp) {
  if (exp === null || exp === undefined) return { st: '?', d: 0 };
  const d = paid - exp;
  if (d >= 0) return { st: d === 0 ? 'ĐỦ' : 'THỪA', d };
  return { st: -d <= TOL_UNDER ? 'ĐỦ' : 'THIẾU', d };
}

const STOP = new Set('CHUYEN KHOAN NHANH QUA ZALO TIEN CK NOP NOPTIEN HOC THANG CON EM HS LOP CLASS THE GUI CHA ME PH HOP PHI MOI HD CT DEN MBVCB VIETINBANK BO TRA QUY DONG FT'.split(' '));

function doiSoat(unitsGoc, txns, hocMay, ganTay, ghiDe, dsLopBiet) {
  const units = unitsGoc.map((u) => Object.assign({}, u));
  const gd = ghiDe || {};
  const DS_LOP = [...new Set([...lopHopLe(units), ...(dsLopBiet || [])])];
  const clsIn = (s) => classesIn(s, DS_LOP);
  for (const t of txns) { const pc = parseContent(t.content); t.note = pc.note; t.sender = pc.sender; }

  const done = {};           // unitId -> ti
  const txnDone = new Set(); // ti đã dùng
  const review = [];         // ca mơ hồ
  const matched = [];
  const other = [];
  const REG_ONLY = [true];

  const dt = (s) => new Set(ntx(s).trim().split(' ')
    .filter((w) => w && !STOP.has(w) && w !== 'THI' && w.length >= 2 && !/^\d+$/.test(w)));
  function clstokOf(note) {
    const ct = new Set();
    for (const c of clsIn(note)) {
      ct.add(normCls(c));
      ct.add(String(c).replace(/\(.*?\)/g, '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
    }
    return ct;
  }
  function parseT(s) {
    const out = [];
    for (const part0 of String(s).split(/\s+và\s+|\s*[,;]\s*|\s*\+\s*|\s*&\s*/)) {
      const part = part0.trim();
      if (!part) continue;
      const mm = part.split(/\s*[-–]\s*/);
      out.push({ nm: mm[0].trim(), cset: clsIn(part) });
    }
    return out;
  }
  function findUnit(nm, cset) {
    const qt = toks(nm);
    if (!qt.size) return [];
    let c = units.filter((u) => !(u.id in done)
      && (!REG_ONLY[0] || u.kind !== 'fam')
      && u.names.some((x) => nameMatch(nm, x)));
    if (cset.size) c = c.filter((u) => inter(new Set(u.classes), cset).size);
    return c;
  }
  function dedupU(f) { const s = new Set(); return f.filter((x) => !s.has(x.id) && s.add(x.id)); }
  function regOk(u, ti) {
    if (u.kind !== 'reg') return true;
    const exp = u.expected; const amt = txns[ti].amount;
    if (exp === null || exp === undefined) return true;
    if (amt === exp) return true;
    const note = txns[ti].note;
    if (!inter(clsIn(note), new Set(u.classes)).size) return false;
    const nt = toks(note);
    if (!u.names.some((x) => { const t = toks(x); return t.size && subset(t, nt); })) return false;
    return true;
  }
  function confirm(u, ti, via, hn, spr) {
    const { st, d } = statusOf(txns[ti].amount, u.expected);
    matched.push({ u, ti, status: st, diff: d, via, hit: hn, sp: spr || null });
    done[u.id] = ti; txnDone.add(ti);
  }
  function cgroup(found, ti, via, spr) {
    const ss = found.reduce((s, x) => s + (x.expected || 0), 0);
    const { st, d } = statusOf(txns[ti].amount, ss);
    for (const x of found) done[x.id] = ti;
    txnDone.add(ti);
    matched.push({
      u: {
        label: found.map((x) => x.label).join(' + '), kind: 'grp', members: found,
        classes: found.flatMap((x) => x.classes), expected: ss, flag: via + 'gộp',
      },
      ti, status: st, diff: d, via, hit: '', sp: spr || null,
    });
  }
  function resolve(best) {
    const found = []; let ambig = false;
    for (const { nm, cset } of parseT(best.target)) {
      const u = findUnit(nm, cset);
      if (u.length === 1) found.push(u[0]);
      else if (u.length > 1) ambig = true;
    }
    return { found: dedupU(found), ambig };
  }
  function specialPass(strict, final) {
    for (let ti = 0; ti < txns.length; ti++) {
      if (txnDone.has(ti)) continue;
      const t = txns[ti];
      const combo = ntx(t.sender + ' ' + t.note);
      const nc = new Set([...dt(t.note), ...dt(t.sender)]);
      let best = null; let bs = 0;
      for (const s of hocMay) {
        if (!s.target) continue;
        const h = !!(s.chutk && nameHit(combo, s.chutk));
        const st = dt(s.noidung);
        const ov = inter(st, nc).size;
        let ok; let score;
        if (strict) { ok = h || (st.size >= 2 && subset(st, nc)); score = (h ? 3 : 0) + ov; }
        else { const need = st.size ? Math.max(2, Math.floor(st.size * 0.6)) : 99; ok = h || ov >= need; score = (h ? 3 : 0) + ov; }
        if (ok && score > bs) { best = s; bs = score; }
      }
      if (!best) continue;
      const { found: found0, ambig } = resolve(best);
      let found = found0;
      const ncl = clsIn(t.note);
      if (ncl.size) found = found.filter((u) => inter(new Set(u.classes), ncl).size); // FIX A
      let biChanTien = null;                                                          // YC3 gate
      if (found.length === 1 && !regOk(found[0], ti)) { biChanTien = found[0]; found = []; }
      if (found.length) {
        const via = strict ? 'L0' : 'L2';
        if (found.length === 1) confirm(found[0], ti, via, best.chutk || best.noidung.slice(0, 16), best);
        else cgroup(found, ti, via, best);
      } else if (final) {
        if (biChanTien) review.push({ ti, reason: 'mẫu đã học nhưng lệch số tiền', cands: [biChanTien.label] });
        else if (ambig) review.push({ ti, reason: 'mẫu đã học nhưng mơ hồ', cands: [best.target] });
        else if (strict) { other.push({ ti, target: best.target }); txnDone.add(ti); }
      }
    }
  }
  function l1Pass(final, solo) {
    for (let ti = 0; ti < txns.length; ti++) {
      if (txnDone.has(ti)) continue;
      const t = txns[ti];
      const cs = ntx(t.note);
      const ncl = clsIn(t.note);
      const cand = [];
      for (const u of units) {
        if (u.id in done) continue;
        if (REG_ONLY[0] && u.kind === 'fam') continue;
        if (ncl.size && !inter(new Set(u.classes), ncl).size) continue; // FIX E — GATE LỚP
        let hit = null;
        for (const x of u.names) {
          if (!nameHit(cs, x)) continue;
          const tk = toks(x);
          if (tk.size === 1 && STOP.has(tk.values().next().value)) continue;
          if (solo && tk.size !== 1) continue;
          if (!solo && tk.size < 2) continue;
          hit = x; break;
        }
        if (hit) cand.push({ u, hit });
      }
      if (!cand.length) continue;
      if (cand.length === 1) {
        const { u, hit } = cand[0];
        if (regOk(u, ti)) confirm(u, ti, 'L1', hit);
      } else {
        const exact = cand.filter(({ u }) => u.expected === t.amount);
        const clsC = cand.filter(({ u }) => inter(new Set(u.classes), ncl).size);
        const fit = cand.filter(({ u }) => t.amount >= (u.expected || 0) - TOL_UNDER);
        const pick = exact.length === 1 ? exact : (clsC.length === 1 ? clsC : (fit.length === 1 ? fit : null));
        if (pick && regOk(pick[0].u, ti)) confirm(pick[0].u, ti, 'L1', pick[0].hit);
        else if (final) review.push({ ti, reason: 'nhiều ứng viên', cands: cand.map(({ u }) => u.label) });
      }
    }
  }
  function l1bPass() {
    const FILLER = new Set([...STOP].filter((w) => w !== 'TIEN').concat(['THI']));
    for (let ti = 0; ti < txns.length; ti++) {
      if (txnDone.has(ti)) continue;
      const t = txns[ti];
      const ch = clsIn(t.note);
      if (!ch.size) continue;
      const clstok = clstokOf(t.note);
      const ntoks = new Set([...toks(t.note)]
        .filter((w) => !FILLER.has(w) && !clstok.has(w.replace(/[^A-Z0-9]/g, ''))));
      if (!ntoks.size || subset(ntoks, STOP)) continue;
      const full = []; const part = [];
      for (const u of units) {
        if (u.id in done) continue;
        if (REG_ONLY[0] && u.kind === 'fam') continue;
        if (!inter(new Set(u.classes), ch).size) continue;
        let lvl = null;
        for (const nm of u.names) {
          const ut = toks(nm);
          if (!ut.size) continue;
          if (subset(ut, ntoks)) { lvl = 'full'; break; }
          if (inter(ut, ntoks).size) lvl = lvl || 'part';
        }
        if (lvl === 'full') full.push(u);
        else if (lvl === 'part') part.push(u);
      }
      const pick = full.length === 1 ? full : (part.length === 1 ? part : null);
      if (pick && regOk(pick[0], ti)) confirm(pick[0], ti, 'L1b', t.note.slice(0, 16));
    }
  }

  const khoaTxn = (tx) => (String(tx.content) + '|' + tx.amount).toUpperCase();
  const gt = ganTay || {};
  for (let ti = 0; ti < txns.length; ti++) {
    const g = gt[khoaTxn(txns[ti])];
    if (!g || !g.unitIds || !g.unitIds.length) continue;
    const found = dedupU(g.unitIds.map((id) => units.find((u) => u.id === id)).filter(Boolean)
      .filter((u) => !(u.id in done)));
    if (!found.length) continue;
    if (found.length === 1) confirm(found[0], ti, 'TAY', 'thầy gán');
    else cgroup(found, ti, 'TAY', null);
  }

  function runRound(final) {
    specialPass(true, final);   // L0
    l1Pass(final, false);       // L1
    l1bPass();                  // L1b
    specialPass(false, final);  // L2
    l1Pass(final, true);        // L1-solo
  }
  REG_ONLY[0] = true; runRound(false);
  REG_ONLY[0] = false; runRound(true);

  let review2 = review.filter((r) => !txnDone.has(r.ti));
  const seen = new Set();
  review2 = review2.filter((r) => !seen.has(r.ti) && seen.add(r.ti)); // dedup ti
  for (const u of units) {
    if (!(u.id in done) && gd[u.id] && gd[u.id].daDong) {
      matched.push({ u, ti: -1, status: 'ĐỦ', diff: 0, via: 'TAY', hit: 'thầy đánh dấu đã đóng', sp: null });
      done[u.id] = -1;
    }
  }
  const unpaid = units.filter((u) => !(u.id in done));
  const rv = new Set(review2.map((r) => r.ti));
  const unident = [];
  for (let ti = 0; ti < txns.length; ti++) if (!txnDone.has(ti) && !rv.has(ti)) unident.push(ti);
  return { units, matched, unpaid, unident, review: review2, other, done, txns };
}

function loaiStop(qs) {
  return new Set([...toks(qs)].filter((w) => !STOP.has(w) && w !== 'THI'));
}
function diemMotUnit(u, tx, dsLopBiet) {
  const note = tx.note != null ? tx.note : (parseContent(tx.content).note || '');
  const sender = tx.sender != null ? tx.sender : (parseContent(tx.content).sender || '');
  const qs = (note + ' ' + sender).trim();
  const ten = (u.names && u.names.length ? u.names : [u.label]);

  const tenDay = ten.some((n) => nameMatch(qs, n));
  const tenSender = !tenDay && sender && ten.some((n) => nameMatch(sender, n));
  const qt = loaiStop(qs);
  const xt = new Set(); for (const n of ten) for (const t of toks(n)) if (t !== 'THI') xt.add(t);
  const giaoNhau = [...qt].filter((t) => xt.has(t)).length;

  const lopTrongNoiDung = dsLopBiet && dsLopBiet.length ? classesIn(qs, dsLopBiet) : new Set();
  const dungLop = (u.classes || []).some((c) => lopTrongNoiDung.has(c));

  const tienDung = u.expected !== null && u.expected !== undefined && tx.amount === u.expected;
  const lechTien = (u.expected !== null && u.expected !== undefined) ? Math.abs(tx.amount - u.expected) : Infinity;
  const tienGan = !tienDung && lechTien <= TOL_UNDER;

  let diem = 0; const lyDo = [];
  if (tenDay) { diem += 100; lyDo.push('trùng tên'); }
  else if (tenSender) { diem += 70; lyDo.push('trùng tên người chuyển'); }
  else if (giaoNhau > 0) { diem += giaoNhau * 12; lyDo.push('tên gần giống'); }
  if (dungLop) { diem += 40; lyDo.push('đúng lớp ' + [...lopTrongNoiDung].filter((c) => (u.classes || []).includes(c)).join(', ')); }
  if (tienDung) { diem += 30; lyDo.push('đúng số tiền'); }
  else if (tienGan) { diem += 8; lyDo.push('gần đúng số tiền'); }
  return { diem, lyDo: lyDo.length ? lyDo.join(' + ') : 'không có dấu hiệu rõ' };
}
function xepHangGoiY(units, tx, dsLopBiet) {
  return units
    .map((u) => Object.assign({ u }, diemMotUnit(u, tx, dsLopBiet)))
    .sort((a, b) => b.diem - a.diem || a.u.label.localeCompare(b.u.label, 'vi'));
}

module.exports = {
  doiSoat, parseContent, nameMatch, classesIn, statusOf, normCls, nname,
  stripAcc, ntx, nameHit, toks, given, TOL_UNDER, xepHangGoiY,
};

};
  G["E:\\LAP TRINH APP\\myPay\\src\\main\\lib\\phi.js"] = function (module, exports, require, __dirname, __filename, process, Buffer) {
const kho = require('./kho-pay');

function floorStep(x, step) { const s = step || 50000; return Math.floor(x / s) * s; }

function catLop(cd, maLop) {
  return Object.assign({}, kho.MAC_DINH_LOP, (cd.lop || {})[maLop]);
}
function khoaTen(ten) { return String(ten || '').trim().toUpperCase(); }
function idDonVi(maLop, id) { return 'R|' + maLop + '|#' + id; }
function catHs(cd, maLop, ten) {
  const hs = cd.hocSinh || {};
  return Object.assign({}, catLop(cd, maLop), hs[maLop + '|' + khoaTen(ten)] || hs[maLop + '|' + ten]);
}

const TRAN_TIEU_HOC = 1000000;

function phiTho(buoi, cat) {
  let f = buoi * (cat.donGia || 150000);
  if (cat.tieuHoc) return Math.min(f, TRAN_TIEU_HOC);
  if (cat.tran > 0) f = Math.min(f, cat.tran);
  return f;
}
function phiLe(buoi, cat) {
  const tho = phiTho(buoi, cat);
  if (!cat.giamPct && !(cat.tran > 0)) return tho;              // đường "buổi × giá" thuần
  return floorStep(tho * (100 - (cat.giamPct || 0)) / 100, 50000);
}

function tinhThang(dd, caiDat, giaDinh) {
  const cd = caiDat || kho.docCaiDat();
  const fams = (giaDinh && giaDinh.families) || [];
  const canhBao = (dd.canhBao || []).slice();

  const tenTrongLop = {};    // lop -> Set(ten hiện có ở myStudent)
  for (const hs of dd.hocSinhDs || []) {
    (tenTrongLop[hs.lop] = tenTrongLop[hs.lop] || new Set()).add(khoaTen(hs.ten));
  }
  function coTrongLop(lop, ten) { return (tenTrongLop[lop] || new Set()).has(khoaTen(ten)); }

  const trongNhaId = new Set();
  for (const f of fams) {
    for (const m of f.members || []) {
      if (m.mat) {
        canhBao.push(`Gia đình "${f.ten || ('#' + f.id)}": có 1 thành viên (mã ${m.id}) không còn trong danh sách học sinh — vào Cài đặt → Quản lý học sinh để sửa lại nhóm.`);
        continue;
      }
      trongNhaId.add(String(m.id));
    }
  }
  for (const k of Object.keys(cd.hocSinh || {})) {
    const i = k.indexOf('|');
    const lop = k.slice(0, i); const ten = k.slice(i + 1);
    if ((cd.hocSinh[k] || {}).lichSu) continue;
    if (!coTrongLop(lop, ten)) {
      canhBao.push(`Cài đặt riêng "${k}" không khớp học sinh nào đang học lớp ${lop} — có thể do đổi tên bên myStudent. Vào Cài đặt bấm "Đồng bộ tên đổi".`);
    }
  }

  function buoiCuaId(maLop, id) {
    const L = (dd.lopMap || {})[maLop];
    const h = L && id !== undefined && L.hocSinh[String(id)];
    const heSo = catLop(cd, maLop).heSoBuoi || 1;
    return {
      buoi: (h ? h.buoiCoMat : 0) * heSo,
      vang: h ? h.buoiVang : 0,
      choDuyet: h ? h.choDuyet : 0,
      ngay: h ? h.ngayCoMat : [],
      lich: h ? h.lich : [],
    };
  }

  const lopDsThat = new Set((dd.lopDs || []).map((L) => L.ma_lop));
  const lopThat = (maLop) => !!((cd.lop || {})[maLop] || lopDsThat.has(maLop));
  const lopCoHoc = {};    // mã số -> [mã lớp THẬT có buoiCoMat tháng này]
  for (const [maLop, L] of Object.entries(dd.lopMap || {})) {
    if (!lopThat(maLop)) continue;
    for (const h of Object.values(L.hocSinh || {})) {
      if (h.buoiCoMat) (lopCoHoc[String(h.id)] = lopCoHoc[String(h.id)] || []).push(maLop);
    }
  }
  const tenSoLop = (maLop, id) => { const L = (dd.lopMap || {})[maLop]; const h = L && L.hocSinh[String(id)]; return h ? h.ten : ''; };
  const catEm = (maLop, dsTen) => {
    const hs = cd.hocSinh || {};
    for (const t of dsTen) if (t && hs[maLop + '|' + khoaTen(t)]) return catHs(cd, maLop, t);
    return catHs(cd, maLop, dsTen.find(Boolean) || '');
  };

  const units = [];
  const daId = new Set(); // "LỚP|mã số" đã có unit (vòng roster) — chống trùng ở 1b
  for (const hs of dd.hocSinhDs || []) {
    const maLop = hs.lop;
    if (!catLop(cd, maLop).thu) continue;
    if (trongNhaId.has(String(hs.id))) continue; // em trong gia đình → tính ở unit nhà (mọi lớp)
    const b = buoiCuaId(maLop, hs.id);
    const hocLopKhac = (lopCoHoc[String(hs.id)] || []).some((l) => l !== maLop && catLop(cd, l).thu);
    if (!b.buoi && !b.choDuyet && hocLopKhac) continue;   // v0.15.0 — tháng này em học lớp khác ⇒ để vòng 1b tính đúng lớp đó
    const cat = catEm(maLop, [hs.ten, tenSoLop(maLop, hs.id)]);   // v0.15.0 — tên hiện tại, rồi tên trong sổ tháng đó (em đổi tên)
    units.push({
      id: idDonVi(maLop, hs.id),
      hsId: hs.id,
      kind: 'reg',
      label: hs.ten,
      classes: [maLop],
      names: [hs.ten],
      maDangNhap: hs.ma_dang_nhap || '',
      buoi: b.buoi, vang: b.vang, choDuyet: b.choDuyet, ngayCoMat: b.ngay, lich: b.lich,
      cat,
      expected: phiLe(b.buoi, cat),
    });
    daId.add(maLop + '|' + hs.id);
  }
  for (const [maLop, L] of Object.entries(dd.lopMap || {})) {
    if (!catLop(cd, maLop).thu) continue;
    for (const h of Object.values(L.hocSinh)) {
      if (!h.buoiCoMat) continue;
      if (daId.has(maLop + '|' + h.id)) continue;
      if (trongNhaId.has(String(h.id))) continue;   // v0.15.0 — con trong gia đình: buổi mọi lớp cộng ở unit nhà
      const conHoc = (dd.hocSinhDs || []).some((x) => String(x.id) === String(h.id));
      if (conHoc && !lopThat(maLop)) continue;      // v0.15.0 — em thật trong lớp THỬ: bỏ
      const ten = h.ten;
      const b = buoiCuaId(maLop, h.id);
      const cat = catHs(cd, maLop, ten);
      units.push({
        id: idDonVi(maLop, h.id),                    // 06/10/2026 — theo SỐ, xem vòng 1
        hsId: h.id,                                  // v0.6.0 — xem chú thích ở vòng 1
        kind: 'reg', label: ten, classes: [maLop], names: [ten], maDangNhap: '',
        buoi: b.buoi, vang: b.vang, choDuyet: b.choDuyet, ngayCoMat: b.ngay, lich: b.lich,
        cat, expected: phiLe(b.buoi, cat), daNghi: !conHoc, lopCu: conHoc,
      });
      daId.add(maLop + '|' + h.id);
    }
  }

  for (const f of fams) {
    const mems = [];
    let tong = 0;
    for (const m of f.members || []) {
      if (m.mat) continue;
      const cacLop = (lopCoHoc[String(m.id)] || []).filter((l) => catLop(cd, l).thu);
      if (!cacLop.length && catLop(cd, m.lop).thu) cacLop.push(m.lop);
      for (const lop of cacLop) {
        const b = buoiCuaId(lop, m.id);
        const cat = catEm(lop, [tenSoLop(lop, m.id), m.ten]);
        tong += phiTho(b.buoi, cat);
        mems.push({ id: m.id, lop, ten: m.ten, buoi: b.buoi, vang: b.vang, choDuyet: b.choDuyet, lich: b.lich });
      }
    }
    if (!mems.length) continue;
    units.push({
      id: 'F|' + f.id,
      idNha: f.id,
      kind: 'fam',
      label: mems.map((x) => x.ten).join(' + '),
      classes: mems.map((x) => x.lop),
      names: mems.map((x) => x.ten),
      members: mems,
      buoi: mems.reduce((s, x) => s + x.buoi, 0),
      choDuyet: mems.reduce((s, x) => s + x.choDuyet, 0),
      giamPct: f.giamPct || 0,
      expected: floorStep(tong * (100 - (f.giamPct || 0)) / 100, 50000),
    });
  }
  return { units, canhBao };
}

module.exports = { tinhThang, phiLe, phiTho, floorStep, catLop, catHs };

};
  G["E:\\LAP TRINH APP\\myPay\\src\\main\\lib\\kho-pay.js"] = function (module, exports, require, __dirname, __filename, process, Buffer) {
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GOC_DATA = path.resolve(__dirname, '..', '..', '..', '..', 'myPay-data');

function taoThuMuc(p) { try { fs.mkdirSync(p, { recursive: true }); } catch (_) { /* đã có */ } }
taoThuMuc(GOC_DATA);
taoThuMuc(path.join(GOC_DATA, 'thang'));
taoThuMuc(path.join(GOC_DATA, 'hoa-don'));

function docJson(p, macDinh) {
  try {
    let raw = fs.readFileSync(p, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // BOM giết parse → mất dữ liệu thật
    return JSON.parse(raw);
  } catch (_) { return macDinh; }
}
function ghiJson(p, obj) {
  taoThuMuc(path.dirname(p));
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 1), 'utf8');
  fs.renameSync(tmp, p); // atomic — không bao giờ để lại file cụt
}

const F_CAIDAT = path.join(GOC_DATA, 'cai-dat.json');
const MAC_DINH_LOP = { thu: true, donGia: 150000, tran: 0, giamPct: 0, heSoBuoi: 1 };
function docCaiDat() {
  const cd = docJson(F_CAIDAT, {});
  if (!cd.lop) cd.lop = {};
  if (!cd.hocSinh) cd.hocSinh = {};
  return cd;
}
function ghiCaiDat(moi) {
  const cu = docCaiDat();
  const gop = Object.assign({}, cu, moi);
  gop.lop = Object.assign({}, cu.lop, moi.lop || {});
  gop.hocSinh = Object.assign({}, cu.hocSinh, moi.hocSinh || {});
  for (const k of Object.keys(gop.hocSinh)) if (gop.hocSinh[k] === null) delete gop.hocSinh[k];
  ghiJson(F_CAIDAT, gop);
  return gop;
}

const F_GIADINH = path.join(GOC_DATA, 'gia-dinh.json');
const MAC_DINH_NHA = { giamPct: 15 };
function docGiaDinhTho() { return docJson(F_GIADINH, { families: [] }); }
function docGiaDinh(hocSinhDs) {
  const gd = docGiaDinhTho();
  const theoId = new Map((hocSinhDs || []).map((h) => [String(h.id), h]));
  return {
    families: (gd.families || []).map((f) => {
      const members = (f.ids || []).map((id) => {
        const hs = theoId.get(String(id));
        return hs ? { id, ten: hs.ten, lop: hs.lop } : { id, ten: '(mã ' + id + ' không còn)', lop: '', mat: true };
      });
      return Object.assign({}, MAC_DINH_NHA, f, {
        members,
        ten: f.ten || members.map((m) => m.ten).join(' + '),
      });
    }),
  };
}
function ghiGiaDinh(gd) {
  const families = ((gd && gd.families) || []).map((f) => ({
    id: String(f.id),
    ten: String(f.ten || ''),
    giamPct: Number(f.giamPct) || 0,
    ids: (f.ids || []).map((x) => Number(x)).filter((x) => Number.isFinite(x)),
  })).filter((f) => f.ids.length);
  ghiJson(F_GIADINH, { families });
  return docGiaDinhTho();
}

const F_NOPHI = path.join(GOC_DATA, 'no-phi.json');
function idNo(d) {
  return (d.loai === 'nha' ? 'N|' + d.idNha : 'H|' + d.hsId) + '|' + d.y + '-' + String(d.m).padStart(2, '0');
}
function docNoPhiTho() {
  const o = docJson(F_NOPHI, { dong: [] });
  if (!Array.isArray(o.dong)) o.dong = [];
  return o;
}
function docNoPhi(hocSinhDs, giaDinh) {
  const tho = docNoPhiTho();
  const theoId = new Map((hocSinhDs || []).map((h) => [String(h.id), h]));
  const theoNha = new Map((((giaDinh || {}).families) || []).map((f) => [String(f.id), f]));
  const oMap = new Map();
  for (const d of tho.dong) {
    d.kieu = d.kieu === 'sau' ? 'sau' : 'no';   // dòng ghi bằng v0.6.0 chưa có `kieu` → coi là nợ
    const khoaO = d.loai === 'nha' ? 'N|' + d.idNha : 'H|' + d.hsId;
    if (!oMap.has(khoaO)) {
      let ten = d.tenLuc || '(không rõ)'; let lop = d.lopLuc || ''; let mat = true;
      if (d.loai === 'nha') {
        const f = theoNha.get(String(d.idNha));
        if (f) { ten = f.ten; lop = (f.members || []).map((x) => x.lop).filter(Boolean).join(', '); mat = false; }
      } else {
        const hs = theoId.get(String(d.hsId));
        if (hs) { ten = hs.ten; lop = hs.lop; mat = false; }
      }
      oMap.set(khoaO, { khoa: khoaO, loai: d.loai, hsId: d.hsId, idNha: d.idNha, ten, lop, mat, dong: [], tong: 0, tongNo: 0, tongSau: 0 });
    }
    const o = oMap.get(khoaO);
    o.dong.push(d);
    const t = Number(d.soTien) || 0;
    o.tong += t;                                  // thầy chốt: GỘP 1 TỔNG (nợ + đóng sau)
    if (d.kieu === 'sau') o.tongSau += t; else o.tongNo += t;
  }
  const ds = [...oMap.values()];
  for (const o of ds) o.dong.sort((a, b) => (a.y - b.y) || (a.m - b.m));
  ds.sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));
  return { o: ds, soDong: tho.dong.length };
}
function themNoPhi(dong) {
  const tho = docNoPhiTho();
  const d = {
    loai: dong.loai === 'nha' ? 'nha' : 'hs',
    kieu: dong.kieu === 'sau' ? 'sau' : 'no',
    hsId: dong.loai === 'nha' ? null : Number(dong.hsId),
    idNha: dong.loai === 'nha' ? String(dong.idNha) : null,
    m: Number(dong.m), y: Number(dong.y),
    soTien: Math.max(0, Math.round(Number(dong.soTien) || 0)),
    tenLuc: String(dong.tenLuc || ''), lopLuc: String(dong.lopLuc || ''),
    themLuc: new Date().toISOString(),
  };
  if (d.loai === 'hs' && !Number.isFinite(d.hsId)) throw new Error('THIEU_MA_SO_HS');
  if (d.loai === 'nha' && !d.idNha) throw new Error('THIEU_MA_NHA');
  if (!d.m || !d.y) throw new Error('THIEU_THANG');
  d.id = idNo(d);
  tho.dong = tho.dong.filter((x) => x.id !== d.id); // cùng người + cùng tháng = thay, không đẻ dòng trùng
  tho.dong.push(d);
  ghiJson(F_NOPHI, tho);
  return d;
}
function themNoPhiRieng(dong) {
  const tho = docNoPhiTho();
  const d = {
    loai: dong.loai === 'nha' ? 'nha' : 'hs',
    kieu: dong.kieu === 'sau' ? 'sau' : 'no',
    hsId: dong.loai === 'nha' ? null : Number(dong.hsId),
    idNha: dong.loai === 'nha' ? String(dong.idNha) : null,
    m: Number(dong.m), y: Number(dong.y),
    soTien: Math.max(0, Math.round(Number(dong.soTien) || 0)),
    tenLuc: String(dong.tenLuc || ''), lopLuc: String(dong.lopLuc || ''),
    themLuc: new Date().toISOString(),
    themTay: true, // đánh dấu để phân biệt với dòng do nợ-phí tự nhận (không bắt buộc dùng ở UI)
  };
  if (d.loai === 'hs' && !Number.isFinite(d.hsId)) throw new Error('THIEU_MA_SO_HS');
  if (d.loai === 'nha' && !d.idNha) throw new Error('THIEU_MA_NHA');
  if (!d.m || !d.y) throw new Error('THIEU_THANG');
  d.id = idNo(d) + '#' + crypto.randomUUID().slice(0, 8); // hậu tố ngẫu nhiên = không bao giờ trùng, không đè dòng cũ
  tho.dong.push(d);
  ghiJson(F_NOPHI, tho);
  return d;
}
function xoaNoPhi(id) {
  const tho = docNoPhiTho();
  const truoc = tho.dong.length;
  tho.dong = tho.dong.filter((x) => x.id !== id);
  if (tho.dong.length !== truoc) ghiJson(F_NOPHI, tho);
  return { daXoa: truoc - tho.dong.length };
}
function coNoPhi(loai, hsId, idNha, m, y) {
  const tho = docNoPhiTho();
  return tho.dong.some((d) => d.m === m && d.y === y
    && (loai === 'nha' ? String(d.idNha) === String(idNha) : d.loai !== 'nha' && String(d.hsId) === String(hsId)));
}

const F_TAMUNG = path.join(GOC_DATA, 'tam-ung.json');
function docTamUngTho() {
  const o = docJson(F_TAMUNG, { ds: [] });
  if (!Array.isArray(o.ds)) o.ds = [];
  return o;
}
function docTamUng(hocSinhDs) {
  const tho = docTamUngTho();
  const theoId = new Map((hocSinhDs || []).map((h) => [String(h.id), h]));
  return tho.ds.filter((d) => d.soDu > 0).map((d) => {
    const hs = theoId.get(String(d.hsId));
    return hs ? { hsId: d.hsId, ten: hs.ten, lop: hs.lop, mat: false, soDu: d.soDu, lichSu: d.lichSu }
      : { hsId: d.hsId, ten: d.tenLuc || '(không rõ)', lop: d.lopLuc || '', mat: true, soDu: d.soDu, lichSu: d.lichSu };
  }).sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));
}
function soDuTamUng(hsId) {
  const tho = docTamUngTho();
  const d = tho.ds.find((x) => String(x.hsId) === String(hsId));
  return d ? d.soDu : 0;
}
function themTamUng({ hsId, soTien, tenLuc, lopLuc }) {
  const tho = docTamUngTho();
  const tien = Math.max(0, Math.round(Number(soTien) || 0));
  if (!tien) throw new Error('SO_TIEN_KHONG_HOP_LE');
  let d = tho.ds.find((x) => String(x.hsId) === String(hsId));
  if (!d) { d = { hsId: Number(hsId), tenLuc: String(tenLuc || ''), lopLuc: String(lopLuc || ''), soDu: 0, lichSu: [] }; tho.ds.push(d); }
  d.soDu += tien;
  d.tenLuc = String(tenLuc || d.tenLuc); d.lopLuc = String(lopLuc || d.lopLuc); // theo kịp tên/lớp mới nhất thầy vừa chọn
  d.lichSu.push({ loai: 'them', soTien: tien, luc: new Date().toISOString() });
  ghiJson(F_TAMUNG, tho);
  return d;
}
function xoaTamUng(hsId) {
  const tho = docTamUngTho();
  const truoc = tho.ds.length;
  tho.ds = tho.ds.filter((x) => String(x.hsId) !== String(hsId));
  if (tho.ds.length !== truoc) ghiJson(F_TAMUNG, tho);
  return { daXoa: truoc - tho.ds.length };
}
function truTamUng(hsId, m, y, soTienCanTru) {
  const tho = docTamUngTho();
  const d = tho.ds.find((x) => String(x.hsId) === String(hsId));
  if (!d || d.soDu <= 0) return 0;
  const truocDu = d.soDu;
  const tru = Math.min(d.soDu, Math.max(0, Math.round(Number(soTienCanTru) || 0)));
  if (!tru) return 0;
  d.soDu -= tru;
  d.lichSu.push({ loai: 'tru', m, y, soTien: tru, truocDu, sauDu: d.soDu, luc: new Date().toISOString() });
  ghiJson(F_TAMUNG, tho);
  return tru;
}
function soDuSauThang(hsId, m, y) {
  const tho = docTamUngTho();
  const d = tho.ds.find((x) => String(x.hsId) === String(hsId));
  if (!d) return null;
  const bg = d.lichSu.filter((h) => h.loai === 'tru' && h.m === m && h.y === y).pop();
  return bg ? bg.sauDu : d.soDu;
}

const F_HOCMAY = path.join(GOC_DATA, 'hoc-may.json');
function docHocMay() {
  const ds = docJson(F_HOCMAY, []);
  let thieuId = false;
  for (const it of ds) if (!it.id) { it.id = crypto.randomUUID(); thieuId = true; }
  if (thieuId) ghiJson(F_HOCMAY, ds); // vá 1 lần cho mẫu ghi từ bản trước v0.8.0 (chưa có id)
  return ds;
}
function _backupHocMay(dsCu) {
  const d = path.join(GOC_DATA, '_backup-hoc-may');
  taoThuMuc(d);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  try { fs.writeFileSync(path.join(d, `hoc-may_${stamp}.json`), JSON.stringify(dsCu, null, 1), 'utf8'); } catch (_) { /* sao lưu hỏng không được cản việc sửa chính */ }
}
function themHocMay(cases) {
  const ds = docHocMay();
  const khoa = (c) => (c.noidung + '||' + c.chutk + '||' + c.target).toUpperCase();
  const daCo = new Set(ds.map(khoa));
  let them = 0;
  for (const c of cases || []) {
    if (!c || !c.target) continue;
    const m = { id: crypto.randomUUID(), noidung: String(c.noidung || ''), chutk: String(c.chutk || ''), target: String(c.target), hocLuc: new Date().toISOString() };
    if (daCo.has(khoa(m))) continue; // bỏ qua mẫu trùng
    ds.push(m); daCo.add(khoa(m)); them++;
  }
  if (them) ghiJson(F_HOCMAY, ds);
  return { tong: ds.length, them };
}
function suaHocMay(id, patch) {
  const ds = docHocMay();
  const it = ds.find((x) => x.id === id);
  if (!it) throw new Error('KHONG_THAY_MAU');
  _backupHocMay(ds);
  if (patch.noidung !== undefined) it.noidung = String(patch.noidung);
  if (patch.chutk !== undefined) it.chutk = String(patch.chutk);
  if (patch.target !== undefined) it.target = String(patch.target);
  ghiJson(F_HOCMAY, ds);
  return it;
}
function xoaHocMay(id) {
  const ds = docHocMay();
  const truoc = ds.length;
  const moi = ds.filter((x) => x.id !== id);
  if (moi.length !== truoc) { _backupHocMay(ds); ghiJson(F_HOCMAY, moi); }
  return { daXoa: truoc - moi.length };
}

function fThang(m, y) { return path.join(GOC_DATA, 'thang', `${y}-${String(m).padStart(2, '0')}.json`); }
function docThang(m, y) {
  const t = docJson(fThang(m, y), {});
  if (!t.saoKe) t.saoKe = [];
  if (!t.txns) t.txns = [];
  if (!t.ganTay) t.ganTay = {};
  if (!t.ghiDe) t.ghiDe = {};
  if (!t.duyetMau) t.duyetMau = {};
  if (!t.xacNhan) t.xacNhan = [];
  if (t.xacNhanDaDiCu === undefined) t.xacNhanDaDiCu = false;
  return t;
}
function ghiThang(m, y, t) { ghiJson(fThang(m, y), t); return t; }

function chotThang(m, y, units) {
  const t = docThang(m, y);
  t.chot = {
    luc: new Date().toISOString(),
    units: (units || []).map((u) => ({
      id: u.id, label: u.label, classes: (u.classes || []).slice(),
      buoi: u.buoi, expected: u.expected,
    })),
  };
  return ghiThang(m, y, t);
}

function soSanhChot(chot, unitsHienTai) {
  if (!chot || !chot.units) return [];
  const cu = new Map(chot.units.map((u) => [u.id, u]));
  const moi = new Map((unitsHienTai || []).map((u) => [u.id, u]));
  const vnd = (x) => (x || 0).toLocaleString('vi-VN') + 'đ';
  const lech = [];
  for (const [id, u] of cu) {
    const v = moi.get(id);
    if (!v) { lech.push({ id, loai: 'mat', chu: `"${u.label}" không còn trong danh sách tháng này (đã nghỉ / đổi tên / chuyển lớp — xem lại).` }); continue; }
    if (u.label !== v.label) lech.push({ id, loai: 'doiTen', chu: `"${u.label}" đổi tên thành "${v.label}".` });
    if ((u.classes || []).join(',') !== (v.classes || []).join(',')) {
      lech.push({ id, loai: 'doiLop', chu: `"${v.label}": lớp đổi từ ${(u.classes || []).join(', ')} sang ${(v.classes || []).join(', ')}.` });
    }
    if (u.buoi !== v.buoi) lech.push({ id, loai: 'doiBuoi', chu: `"${v.label}": số buổi đổi từ ${u.buoi} thành ${v.buoi}.` });
    if (u.expected !== v.expected) lech.push({ id, loai: 'doiTien', chu: `"${v.label}": cần đóng đổi từ ${vnd(u.expected)} thành ${vnd(v.expected)}.` });
  }
  for (const [id, v] of moi) {
    if (!cu.has(id)) lech.push({ id, loai: 'them', chu: `Mới xuất hiện: "${v.label}" (${(v.classes || []).join(', ')}).` });
  }
  return lech;
}

function napSaoKe(m, y, dsFile) {
  const t = docThang(m, y);
  for (const f of dsFile) {
    t.saoKe = t.saoKe.filter((x) => x.ten !== f.ten);
    t.txns = t.txns.filter((x) => x.nguon !== f.ten);
    t.saoKe.push({ ten: f.ten, soDong: f.txns.length, napLuc: new Date().toISOString(), duongDan: f.duongDan || '' });
    for (const tx of f.txns) t.txns.push(Object.assign({ nguon: f.ten }, tx));
  }
  const daThay = new Set();
  t.txns = t.txns.filter((x) => {
    const k = (x.content + '|' + x.amount + '|' + (x.ngay || '')).toUpperCase();
    if (daThay.has(k)) return false; daThay.add(k); return true;
  });
  t.txns.forEach((x, i) => { x.ti = i; });
  return ghiThang(m, y, t);
}
function xoaSaoKe(m, y, ten) {
  const t = docThang(m, y);
  t.saoKe = t.saoKe.filter((x) => x.ten !== ten);
  t.txns = t.txns.filter((x) => x.nguon !== ten);
  t.txns.forEach((x, i) => { x.ti = i; });
  return ghiThang(m, y, t);
}

function khoaTxn(tx) { return (String(tx.content) + '|' + tx.amount).toUpperCase(); }
function ganTay(m, y, ti, unitIds, hoc) {
  const t = docThang(m, y);
  const tx = t.txns[ti];
  if (!tx) throw new Error('KHONG_THAY_GIAO_DICH');
  t.ganTay[khoaTxn(tx)] = { unitIds: unitIds || [], luc: new Date().toISOString() };
  ghiThang(m, y, t);
  let hocKq = null;
  if (hoc && hoc.target) hocKq = themHocMay([hoc]); // học mẫu cho các tháng sau
  return { thang: t, hoc: hocKq };
}
function huyGan(m, y, ti) {
  const t = docThang(m, y);
  const tx = t.txns[ti];
  if (tx) delete t.ganTay[khoaTxn(tx)];
  return ghiThang(m, y, t);
}
function duyetMau(m, y, ti, bat) {
  const t = docThang(m, y);
  const tx = t.txns[ti];
  if (!tx) throw new Error('KHONG_THAY_GIAO_DICH');
  if (bat) t.duyetMau[khoaTxn(tx)] = { luc: new Date().toISOString() };
  else delete t.duyetMau[khoaTxn(tx)];
  return ghiThang(m, y, t);
}
function ghiDeUnit(m, y, unitId, patch) {
  const t = docThang(m, y);
  if (patch === null) delete t.ghiDe[unitId];
  else t.ghiDe[unitId] = Object.assign({}, t.ghiDe[unitId], patch);
  return ghiThang(m, y, t);
}

function diCuXacNhan(m, y, dsDiCu) {
  const t = docThang(m, y);
  if (t.xacNhanDaDiCu) return t; // đã di cư rồi — TUYỆT ĐỐI không chạy lại (sẽ hồi sinh dòng thầy đã hủy tay)
  const daCo = new Set(t.xacNhan.map((x) => x.khoa));
  for (const d of dsDiCu || []) {
    const khoa = khoaTxn(d);
    if (daCo.has(khoa)) continue;
    t.xacNhan.push({
      khoa, content: String(d.content), amount: Number(d.amount) || 0, ngay: String(d.ngay || ''),
      nguon: String(d.nguon || ''), unitIds: (d.unitIds || []).slice(), via: d.via || '', hit: d.hit || '',
      luc: new Date().toISOString(),
    });
    daCo.add(khoa);
  }
  t.xacNhanDaDiCu = true;
  ghiThang(m, y, t);
  return t;
}
function themXacNhan(m, y, dsMoi) {
  const t = docThang(m, y);
  const daCo = new Set(t.xacNhan.map((x) => x.khoa));
  let them = 0;
  for (const d of dsMoi || []) {
    const khoa = khoaTxn(d);
    if (daCo.has(khoa)) continue; // đã có rồi (trùng lại lần sau) — GIỮ bản đầu tiên, không ghi đè
    t.xacNhan.push({
      khoa, content: String(d.content), amount: Number(d.amount) || 0, ngay: String(d.ngay || ''),
      nguon: String(d.nguon || ''), unitIds: (d.unitIds || []).slice(), via: d.via || '', hit: d.hit || '',
      luc: new Date().toISOString(),
    });
    daCo.add(khoa); them++;
  }
  if (them) ghiThang(m, y, t);
  return { thang: t, them };
}
function xoaMotXacNhan(m, y, khoa) {
  const t = docThang(m, y);
  const truoc = t.xacNhan.length;
  t.xacNhan = t.xacNhan.filter((x) => x.khoa !== khoa);
  if (t.xacNhan.length !== truoc) ghiThang(m, y, t);
  return { daXoa: truoc - t.xacNhan.length };
}
function lamSachGiaoDich(m, y) {
  const t = docThang(m, y);
  t.saoKe = []; t.txns = []; t.ganTay = {}; t.duyetMau = {};
  return ghiThang(m, y, t);
}

const F_CHOTTAY = path.join(GOC_DATA, 'chot-tay.json');
function khoaNguoi(d) { return d.doiTuong === 'nha' ? 'N|' + d.idNha : 'H|' + d.hsId; }
function docChotTay() {
  const o = docJson(F_CHOTTAY, { ds: [] });
  if (!Array.isArray(o.ds)) o.ds = [];
  return o;
}
function _backupJson(ten, obj) {
  const d = path.join(GOC_DATA, '_backup-' + ten);
  taoThuMuc(d);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  try { fs.writeFileSync(path.join(d, `${ten}_${stamp}.json`), JSON.stringify(obj, null, 1), 'utf8'); } catch (_) { /* sao lưu hỏng không cản việc chính */ }
}
function themChotTay(dl) {
  const d = {
    loai: dl.loai === 'tang' ? 'tang' : 'chot',
    doiTuong: dl.doiTuong === 'nha' ? 'nha' : 'hs',
    hsId: dl.doiTuong === 'nha' ? null : Number(dl.hsId),
    idNha: dl.doiTuong === 'nha' ? String(dl.idNha) : null,
    m: Number(dl.m), y: Number(dl.y),
    ghiChu: String(dl.ghiChu || '').slice(0, 500),
    truoc: String(dl.truoc || '').slice(0, 200),
    tenLuc: String(dl.tenLuc || ''), lopLuc: String(dl.lopLuc || ''),
    luc: new Date().toISOString(),
  };
  if (d.doiTuong === 'hs' && !Number.isFinite(d.hsId)) throw new Error('THIEU_MA_SO_HS');
  if (d.doiTuong === 'nha' && !d.idNha) throw new Error('THIEU_MA_NHA');
  if (!d.m || !d.y) throw new Error('THIEU_THANG');
  d.id = khoaNguoi(d) + '|' + d.y + '-' + String(d.m).padStart(2, '0');
  const tho = docChotTay();
  tho.ds = tho.ds.filter((x) => x.id !== d.id);
  tho.ds.push(d);
  ghiJson(F_CHOTTAY, tho);
  const no = docNoPhiTho();
  const cungNguoi = (x) => (d.doiTuong === 'nha' ? x.loai === 'nha' && String(x.idNha) === d.idNha
    : x.loai !== 'nha' && String(x.hsId) === String(d.hsId));
  const truocHoacBang = (x) => x.y < d.y || (x.y === d.y && x.m <= d.m);
  const xoa = no.dong.filter((x) => cungNguoi(x) && truocHoacBang(x));
  if (xoa.length) {
    _backupJson('no-phi', no);
    no.dong = no.dong.filter((x) => !xoa.includes(x));
    ghiJson(F_NOPHI, no);
  }
  return { dong: d, daXoaNo: xoa.length };
}
function xoaChotTay(id) {
  const tho = docChotTay();
  const truoc = tho.ds.length;
  tho.ds = tho.ds.filter((x) => x.id !== id);
  if (tho.ds.length !== truoc) ghiJson(F_CHOTTAY, tho);
  return { daXoa: truoc - tho.ds.length };
}
function chotTayPhu(ds, khoa, m, y) {
  let tot = null;
  for (const d of ds) {
    if (khoaNguoi(d) !== khoa) continue;
    if (d.y < y || (d.y === y && d.m < m)) continue;
    if (!tot || d.y < tot.y || (d.y === tot.y && d.m < tot.m)) tot = d;
  }
  return tot;
}

const F_GHICHU = path.join(GOC_DATA, 'ghi-chu.json');
function docGhiChu() {
  const o = docJson(F_GHICHU, { ds: {} });
  if (!o.ds || typeof o.ds !== 'object' || Array.isArray(o.ds)) o.ds = {};
  return o;
}
function ghiGhiChu(khoa, chu) {
  const k = String(khoa || '');
  if (!/^(H\|\d+|N\|.+)$/.test(k)) throw new Error('KHOA_GHI_CHU_SAI');
  const o = docGhiChu();
  const c = String(chu || '').trim().slice(0, 2000);
  if (c) o.ds[k] = { chu: c, luc: new Date().toISOString() };
  else delete o.ds[k];
  ghiJson(F_GHICHU, o);
  return o.ds;
}

function apDungChotTay(kq, units, ds, m, y) {
  kq.chotTay = {};
  if (!ds || !ds.length) return kq;
  for (const u of units) {
    if (!(u.buoi > 0)) continue;
    const khoa = u.kind === 'fam' ? 'N|' + u.idNha : 'H|' + u.hsId;
    const d = chotTayPhu(ds, khoa, m, y);
    if (!d) continue;
    kq.chotTay[u.id] = { id: d.id, loai: d.loai, m: d.m, y: d.y, ghiChu: d.ghiChu, truoc: d.truoc, luc: d.luc, theo: !(d.m === m && d.y === y) };
    if (u.id in kq.done) {
      const mm = kq.matched.find((x) => x.u.id === u.id);
      if (mm && (mm.status !== 'ĐỦ' || mm.diff < 0)) { mm.statusGoc = mm.status; mm.diffGoc = mm.diff; mm.status = 'ĐỦ'; mm.diff = 0; }
    } else {
      kq.matched.push({ u, ti: -1, status: 'ĐỦ', diff: 0, via: d.loai === 'tang' ? 'TANG' : 'CHOT',
        hit: d.loai === 'tang' ? 'thầy tặng học phí' : 'thầy chốt xong phí', sp: null });
      kq.done[u.id] = -1;
    }
  }
  if (Array.isArray(kq.unpaid)) kq.unpaid = kq.unpaid.filter((u) => !(u.id in kq.done));
  return kq;
}

module.exports = {
  GOC_DATA, docJson, ghiJson,
  docCaiDat, ghiCaiDat, MAC_DINH_LOP, MAC_DINH_NHA,
  docGiaDinh, ghiGiaDinh, docGiaDinhTho,
  docHocMay, themHocMay, suaHocMay, xoaHocMay,
  docThang, ghiThang, napSaoKe, xoaSaoKe, ganTay, huyGan, ghiDeUnit, khoaTxn, duyetMau,
  chotThang, soSanhChot,
  docNoPhi, docNoPhiTho, themNoPhi, themNoPhiRieng, xoaNoPhi, coNoPhi,
  themXacNhan, xoaMotXacNhan, lamSachGiaoDich, diCuXacNhan,
  docTamUngTho, docTamUng, soDuTamUng, themTamUng, xoaTamUng, truTamUng, soDuSauThang,
  docChotTay, themChotTay, xoaChotTay, chotTayPhu, apDungChotTay,
  docGhiChu, ghiGhiChu,
};

};
  G["E:\\LAP TRINH APP\\myPay\\src\\main\\lib\\diemdanh.js"] = function (module, exports, require, __dirname, __filename, process, Buffer) {
const fs = require('fs');
const path = require('path');

const GOC_E = 'E:\\LAP TRINH APP';
const GOC_D = 'D:\\APP AND DATA';
function timGoc(tenCon) {
  for (const g of [GOC_E, GOC_D]) {
    const p = path.join(g, tenCon);
    if (fs.existsSync(p)) return p;
  }
  return path.join(GOC_E, tenCon);
}
const DIR_SO_NGAY = () => path.join(timGoc('myData'), 'Diem danh');
const DIR_SHARED = () => path.join(timGoc('myStudent-data'), 'shared');

function docJson(p) {
  let raw = fs.readFileSync(p, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  return JSON.parse(raw);
}

function docHocSinh() {
  try { return docJson(path.join(DIR_SHARED(), 'hoc_sinh.json')).hoc_sinh || []; }
  catch (_) { return []; }
}
function docLop() {
  try { return docJson(path.join(DIR_SHARED(), 'lop.json')).cac_lop || []; }
  catch (_) { return []; }
}

function docThang(m, y) {
  const dir = DIR_SO_NGAY();
  const lopMap = {};
  const canhBao = [];
  let soNgayDoc = 0;
  if (!fs.existsSync(dir)) {
    canhBao.push('Không thấy thư mục sổ điểm danh: ' + dir);
    return { lopMap, hocSinhDs: docHocSinh(), lopDs: docLop(), canhBao, soNgayDoc };
  }
  for (let d = 1; d <= 31; d++) {
    const f = path.join(dir, `${d}-${m}-${y}.json`);
    if (!fs.existsSync(f)) continue;
    let so;
    try { so = docJson(f); } catch (e) { canhBao.push(`File sổ ngày hỏng: ${d}-${m}-${y}.json`); continue; }
    soNgayDoc++;
    for (const lop of so.cac_lop || []) {
      const ma = lop.lop;
      if (!lopMap[ma]) lopMap[ma] = { hocSinh: {}, soBuoiLop: 0, ngay: [], ghiChu: [] };
      const L = lopMap[ma];
      const nghiCaLop = /^CẢ LỚP NGHỈ/i.test(String(lop.ghi_chu || ''));
      if (nghiCaLop) { L.ghiChu.push(`${d}/${m}: ${lop.ghi_chu}`); continue; }
      L.soBuoiLop++;
      L.ngay.push(`${d}/${m}`);
      if (lop.ghi_chu) L.ghiChu.push(`${d}/${m}: ${lop.ghi_chu}`);
      for (const hs of lop.hoc_sinh || []) {
        const kh = String(hs.id);
        if (!L.hocSinh[kh]) L.hocSinh[kh] = { id: hs.id, ten: hs.ten, buoiCoMat: 0, buoiVang: 0, choDuyet: 0, ngayCoMat: [], lich: [] };
        const H = L.hocSinh[kh];
        H.ten = hs.ten; // luôn cập nhật — ngày duyệt sau đè tên ngày trước (d tăng dần)
        if (hs.trang_thai !== 'da_chot') { H.choDuyet++; continue; }
        if (hs.co_mat) {
          H.buoiCoMat++; H.ngayCoMat.push(`${d}/${m}`);
          H.lich.push({ ngay: d, coMat: true, lyDo: '' });
        } else {
          H.buoiVang++;
          H.lich.push({ ngay: d, coMat: false, lyDo: hs.ly_do || '' });
        }
      }
    }
  }
  for (const [ma, L] of Object.entries(lopMap)) {
    const cho = Object.values(L.hocSinh).reduce((s, h) => s + h.choDuyet, 0);
    if (cho > 0) canhBao.push(`Lớp ${ma}: còn ${cho} lượt điểm danh CHƯA CHỐT — số buổi có thể thiếu.`);
  }
  if (soNgayDoc === 0) canhBao.push(`Không có sổ điểm danh nào của tháng ${m}/${y}.`);
  return { lopMap, hocSinhDs: docHocSinh(), lopDs: docLop(), canhBao, soNgayDoc };
}

function dsThangCoDuLieu() {
  const dir = DIR_SO_NGAY();
  if (!fs.existsSync(dir)) return [];
  const re = /^(\d{1,2})-(\d{1,2})-(\d{4})\.json$/;
  const bo = new Set();
  for (const ten of fs.readdirSync(dir)) {
    const m = re.exec(ten);
    if (m) bo.add(`${parseInt(m[3], 10)}-${parseInt(m[2], 10)}`);
  }
  return [...bo].map((k) => { const [y, mo] = k.split('-').map(Number); return { m: mo, y }; })
    .sort((a, b) => (a.y - b.y) || (a.m - b.m));
}

module.exports = { docThang, docHocSinh, docLop, DIR_SO_NGAY, DIR_SHARED, dsThangCoDuLieu };

};
  G["E:\\LAP TRINH APP\\myPay\\src\\main\\lib\\saoke.js"] = function (module, exports, require, __dirname, __filename, process, Buffer) {
const path = require('path');
const { moWorkbook } = require('./xlsx-mini');

const RE_NGAY = /^\d{1,2}\/\d{1,2}\/\d{4}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/;
const RE_CHU = /[A-Za-zÀ-ỹ]/;

function laNgay(cell) {
  if (!cell) return false;
  if (cell.date) return true;
  const s = String(cell.v ?? '').trim();
  return RE_NGAY.test(s);
}
function soTuOo(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return null;
  let v = cell.v;
  if (typeof v === 'string') {
    if (!/^[+-]?[\d.,\s]+$/.test(v.trim()) || !/\d/.test(v)) return null;
    v = parseInt(v.replace(/[^\d-]/g, '') || '0', 10);
  }
  return Number.isFinite(v) ? Math.trunc(v) : null;
}
function laTienLon(cell) { const n = soTuOo(cell); return n !== null && Math.abs(n) >= 1000; }
function coDauRoRet(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return false;
  return /^[+-]\s*[\d.,]/.test(String(cell.v).trim());
}
function laChu(cell) {
  if (!cell) return false;
  const s = String(cell.v ?? '').trim();
  return s.length >= 4 && RE_CHU.test(s) && !RE_NGAY.test(s);
}

function doTieuDe(rows) {
  let hdr = -1; let cN = -1; let cA = -1; let cD = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = rows[i] || [];
    for (let j = 0; j < r.length; j++) {
      const v = r[j] && String(r[j].v || '').trim();
      if (v === 'Nội dung') { hdr = i; cN = j; }
      if (v === 'Số tiền GD') cA = j;
      if (v === 'Ngày') cD = j;
    }
    if (hdr >= 0 && cA >= 0) break;
  }
  if (hdr < 0 || cN < 0 || cA < 0) return null;
  return { hangBatDau: hdr + 1, cN, cA, cD };
}

function doTheoDuLieu(rows) {
  const soCot = rows.reduce((m, r) => Math.max(m, (r || []).length), 0);
  if (!soCot) return null;
  const diem = Array.from({ length: soCot }, () => ({ ngay: 0, tien: 0, so: 0, dau: 0, chu: 0, coGiaTri: 0 }));
  for (const r of rows) {
    for (let j = 0; j < soCot; j++) {
      const c = (r || [])[j];
      if (!c || c.v === null || String(c.v).trim() === '') continue;
      diem[j].coGiaTri++;
      if (laNgay(c)) diem[j].ngay++;
      if (laTienLon(c)) diem[j].tien++;
      if (soTuOo(c) !== null) diem[j].so++;
      if (coDauRoRet(c)) diem[j].dau++;
      if (laChu(c)) diem[j].chu++;
    }
  }
  const toDoTuong = (key) => diem.reduce((best, d, j) => (d[key] > (diem[best] || { [key]: -1 })[key] ? j : best), -1);
  const cD = toDoTuong('ngay');
  if (cD < 0 || diem[cD].ngay < 3) return null; // quá ít ô giống ngày — không đủ tin
  let cA = -1;
  let coCotCoDau = false;
  for (let j = 0; j < soCot; j++) {
    if (j === cD) continue;
    if (diem[j].dau >= 3 && (cA < 0 || diem[j].dau > diem[cA].dau)) { cA = j; coCotCoDau = true; }
  }
  if (!coCotCoDau) {
    cA = -1;
    for (let j = 0; j < soCot; j++) {
      if (j === cD) continue;
      if (cA < 0 || diem[j].tien > diem[cA].tien) cA = j;
    }
  }
  if (cA < 0 || (coCotCoDau ? diem[cA].so : diem[cA].tien) < 3) return null;
  let cN = -1;
  for (let j = 0; j < soCot; j++) {
    if (j === cD || j === cA) continue;
    if (cN < 0 || diem[j].chu > diem[cN].chu) cN = j;
  }
  if (cN < 0 || diem[cN].chu < 3) return null;
  return { hangBatDau: 0, cN, cA, cD };
}

function docFile(duongDan) {
  const wb = moWorkbook(duongDan);
  const ten = path.basename(duongDan);
  let loi = 'KHONG_THAY_COT — không dò được cột Ngày/Nội dung/Số tiền: ' + ten;
  for (const sn of wb.sheetNames) {
    const rows = wb.sheet(sn);
    if (!rows) continue;
    const via = doTieuDe(rows) || doTheoDuLieu(rows);
    if (!via) continue;
    const { hangBatDau, cN, cA, cD } = via;
    const txns = [];
    for (let i = hangBatDau; i < rows.length; i++) {
      const r = rows[i] || [];
      const cell = r[cN];
      if (!cell || cell.v === null || String(cell.v).trim() === '') continue;
      const a = soTuOo(r[cA]);
      if (a === null) continue;
      const ngay = cD >= 0 && r[cD] ? String(r[cD].v || '').trim() : '';
      txns.push({ content: String(cell.v).trim(), amount: a, ngay });
    }
    if (txns.length) return { ten, txns };
  }
  throw new Error(loi);
}

module.exports = { docFile };

};
  G["E:\\LAP TRINH APP\\myPay\\src\\main\\lib\\xlsx-mini.js"] = function (module, exports, require, __dirname, __filename, process, Buffer) {
const fs = require('fs');
const zlib = require('zlib');

function docZip(buf) {
  const entries = {};
  const eocd = buf.lastIndexOf(Buffer.from('PK\x05\x06', 'binary'));
  let dungCD = false;
  if (eocd >= 0) {
    try {
      const cdOff = buf.readUInt32LE(eocd + 16);
      const soEntry = buf.readUInt16LE(eocd + 10);
      let p = cdOff;
      for (let i = 0; i < soEntry; i++) {
        if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('CD_HONG');
        const comp = buf.readUInt16LE(p + 10);
        const csize = buf.readUInt32LE(p + 20);
        const fnl = buf.readUInt16LE(p + 28);
        const efl = buf.readUInt16LE(p + 30);
        const cml = buf.readUInt16LE(p + 32);
        const lho = buf.readUInt32LE(p + 42);
        const name = buf.slice(p + 46, p + 46 + fnl).toString('utf8');
        const lfnl = buf.readUInt16LE(lho + 26);
        const lefl = buf.readUInt16LE(lho + 28);
        const ds = lho + 30 + lfnl + lefl;
        const raw = buf.slice(ds, ds + csize);
        entries[name] = comp === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw);
        p += 46 + fnl + efl + cml;
      }
      dungCD = true;
    } catch (_) { /* rơi xuống quét local header */ }
  }
  if (!dungCD) {
    const LFH = Buffer.from('PK\x03\x04', 'binary');
    let p = 0; let thay = 0;
    while (true) {
      p = buf.indexOf(LFH, p);
      if (p < 0) break;
      try {
        const comp = buf.readUInt16LE(p + 8);
        const csize = buf.readUInt32LE(p + 18);
        const fnl = buf.readUInt16LE(p + 26);
        const efl = buf.readUInt16LE(p + 28);
        const name = buf.slice(p + 30, p + 30 + fnl).toString('utf8');
        const ds = p + 30 + fnl + efl;
        const raw = buf.slice(ds, ds + csize);
        try {
          entries[name] = comp === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw);
          thay++;
        } catch (_) { /* entry nát thì bỏ entry đó, giữ phần còn lại */ }
        p = ds + csize;
      } catch (_) { p += 4; }
    }
    if (!thay) throw new Error('ZIP_KHONG_DOC_DUOC');
  }
  return entries;
}

function giaiMaXmlText(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}
function layT(khoi) {
  let out = '';
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g;
  let m;
  while ((m = re.exec(khoi))) out += m[1] ? giaiMaXmlText(m[1]) : '';
  return out;
}

function cotSo(chuCot) { let n = 0; for (const ch of chuCot) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
function soCot(n) { let r = ''; while (n > 0) { const m = (n - 1) % 26; r = String.fromCharCode(65 + m) + r; n = (n - 1 - m) / 26; } return r; }

function serialSangNgay(n) {
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

function moWorkbook(duongDan) {
  const buf = fs.readFileSync(duongDan);
  const z = docZip(buf);
  const docXml = (n) => (z[n] ? z[n].toString('utf8') : '');

  const ss = [];
  const ssXml = docXml('xl/sharedStrings.xml');
  if (ssXml) {
    const re = /<si>([\s\S]*?)<\/si>/g;
    let m; while ((m = re.exec(ssXml))) ss.push(layT(m[1]));
  }
  const wbXml = docXml('xl/workbook.xml');
  const relXml = docXml('xl/_rels/workbook.xml.rels');
  const rels = {};
  {
    const re = /<Relationship\s[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g;
    let m; while ((m = re.exec(relXml))) rels[m[1]] = m[2].replace(/^\//, '');
  }
  const sheets = [];
  {
    const re = /<sheet\s[^>]*name="([^"]*)"[^>]*r:id="([^"]+)"[^>]*\/?>/g;
    let m;
    while ((m = re.exec(wbXml))) {
      let t = rels[m[2]] || '';
      if (t && !t.startsWith('xl/')) t = 'xl/' + t;
      sheets.push({ name: giaiMaXmlText(m[1]), file: t });
    }
  }
  const laNgayXf = [];
  {
    const stXml = docXml('xl/styles.xml');
    const numFmtNgay = new Set([14, 15, 16, 17, 22, 45, 46, 47]);
    const fmtTuyChinh = {};
    const reF = /<numFmt\s[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g;
    let m; while ((m = reF.exec(stXml))) fmtTuyChinh[m[1]] = m[2];
    const xfsKhoi = (stXml.match(/<cellXfs[\s\S]*?<\/cellXfs>/) || [''])[0];
    const reXf = /<xf\s[^>]*numFmtId="(\d+)"[^>]*?\/?>/g;
    while ((m = reXf.exec(xfsKhoi))) {
      const id = parseInt(m[1], 10);
      const code = fmtTuyChinh[m[1]] || '';
      laNgayXf.push(numFmtNgay.has(id) || /[dy]/i.test(code.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"/g, '')) && /[dmy]/i.test(code));
    }
  }

  function sheet(name) {
    const it = sheets.find((s) => s.name === name);
    if (!it || !z[it.file]) return null;
    const xml = z[it.file].toString('utf8');
    const rows = [];
    const sharedF = {};
    const reRow = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    const reCell = /<c\s([^>]*?)\/>|<c\s([^>]*)>([\s\S]*?)<\/c>/g;
    let rm;
    while ((rm = reRow.exec(xml))) {
      const rAttr = /r="(\d+)"/.exec(rm[0]);
      const ri = rAttr ? parseInt(rAttr[1], 10) - 1 : rows.length;
      const hang = [];
      let cm;
      while ((cm = reCell.exec(rm[1]))) {
        const attrs = cm[1] || cm[2] || '';
        const noiDung = cm[3] || '';
        const refM = /r="([A-Z]+)(\d+)"/.exec(attrs);
        if (!refM) continue;
        const ci = cotSo(refM[1]) - 1;
        const tM = /t="([^"]+)"/.exec(attrs);
        const sM = /s="(\d+)"/.exec(attrs);
        const t = tM ? tM[1] : 'n';
        const fM = /<f(\s[^>]*)?>([\s\S]*?)<\/f>|<f(\s[^>]*)?\/>/.exec(noiDung);
        const vM = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(noiDung);
        let f = null;
        if (fM) {
          const fAttrs = fM[1] || fM[3] || '';
          const ruot = fM[2] ? giaiMaXmlText(fM[2]) : '';
          const siM = /si="(\d+)"/.exec(fAttrs);
          if (ruot) { f = ruot; if (siM) sharedF[siM[1]] = ruot; }
          else if (siM) f = sharedF[siM[1]] || null;
        }
        const cell = { v: null, f, t };
        if (t === 's') cell.v = vM ? (ss[parseInt(vM[1], 10)] ?? '') : '';
        else if (t === 'inlineStr') cell.v = layT(noiDung);
        else if (t === 'str') cell.v = vM ? giaiMaXmlText(vM[1]) : '';
        else if (t === 'b') cell.v = vM ? vM[1] === '1' : null;
        else if (vM) {
          const num = parseFloat(vM[1]);
          cell.v = Number.isFinite(num) ? num : giaiMaXmlText(vM[1]);
          const si = sM ? parseInt(sM[1], 10) : -1;
          if (typeof cell.v === 'number' && si >= 0 && laNgayXf[si] && cell.v > 20000 && cell.v < 80000) {
            cell.date = serialSangNgay(cell.v);
          }
        }
        hang[ci] = cell;
      }
      rows[ri] = hang;
    }
    return rows;
  }
  return { sheetNames: sheets.map((s) => s.name), sheet };
}

module.exports = { moWorkbook, cotSo, soCot, serialSangNgay };

};
  G["E:\\LAP TRINH APP\\myPay\\src\\main\\lib\\hoadon.js"] = function (module, exports, require, __dirname, __filename, process, Buffer) {
const fs = require('fs');
const path = require('path');
const kho = require('./kho-pay');

function thuMuc() { return path.join(kho.GOC_DATA, 'hoa-don'); }

function ghiPng(tenFile, dataUrl) {
  const m = /^data:image\/png;base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('DATAURL_SAI');
  const sach = String(tenFile || 'hoadon.png').replace(/[\\/:*?"<>|]/g, '-');
  const p = path.join(thuMuc(), sach);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, Buffer.from(m[1], 'base64'));
  fs.renameSync(tmp, p);
  return p;
}

module.exports = { ghiPng, thuMuc };

};
  G["E:\\LAP TRINH APP\\myPay\\src\\main\\lib\\dong-bo-ten.js"] = function (module, exports, require, __dirname, __filename, process, Buffer) {
const fs = require('fs');
const path = require('path');
const kho = require('./kho-pay');
const diemdanh = require('./diemdanh');

function stripAcc(s) {
  return String(s).replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function toks(s) {
  return new Set(stripAcc(String(s)).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').split(' ').filter((t) => t.length >= 2));
}
function subset(a, b) { for (const x of a) if (!b.has(x)) return false; return true; }

function rosterTheoLop() {
  const ds = diemdanh.docHocSinh();
  const m = {};
  for (const hs of ds) { (m[hs.lop] = m[hs.lop] || []).push(String(hs.ten || '').trim().toUpperCase()); }
  return m;
}

function timTenMoi(rTheoLop, lop, tenCu) {
  const ds = rTheoLop[lop] || [];
  if (ds.includes(tenCu)) return tenCu;
  const qt = toks(tenCu);
  if (!qt.size) return null;
  const ung = ds.filter((ten) => { const xt = toks(ten); return xt.size > qt.size && subset(qt, xt); });
  return ung.length === 1 ? ung[0] : null;
}

function backup(lyDo) {
  const dir = path.join(kho.GOC_DATA, '_backup-dong-bo-ten-' + new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(kho.GOC_DATA, 'cai-dat.json');
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(dir, 'cai-dat.json'));
  fs.writeFileSync(path.join(dir, '_ly-do.txt'), lyDo, 'utf8');
  return dir;
}

function chay() {
  const rTheoLop = rosterTheoLop();
  const caiDat = kho.docCaiDat();
  const daSua = [];
  const khongKhop = [];

  const patchHocSinh = {};
  for (const [k, v] of Object.entries(caiDat.hocSinh || {})) {
    const i = k.indexOf('|');
    if (i < 0) continue;
    const lop = k.slice(0, i); const tenCu = k.slice(i + 1);
    if ((rTheoLop[lop] || []).includes(tenCu)) continue; // đã đúng, bỏ qua
    const tenMoi = timTenMoi(rTheoLop, lop, tenCu);
    if (tenMoi === null) { khongKhop.push({ noi: 'Cài đặt riêng', lop, ten: tenCu }); continue; }
    const kMoi = lop + '|' + tenMoi;
    if (caiDat.hocSinh[kMoi] !== undefined) {
      khongKhop.push({ noi: 'Cài đặt riêng (khoá mới đã có sẵn, không dám ghi đè)', lop, ten: tenCu });
      continue;
    }
    patchHocSinh[kMoi] = v;
    patchHocSinh[k] = null; // xoá khoá cũ — đúng ngữ nghĩa merge của kho.ghiCaiDat
    daSua.push({ noi: 'Cài đặt riêng', lop, cu: tenCu, moi: tenMoi });
  }

  if (Object.keys(patchHocSinh).length) {
    backup('Tự động trước khi "Đồng bộ tên đổi" — ' + new Date().toISOString());
    kho.ghiCaiDat({ hocSinh: patchHocSinh });
  }

  return { daSua, khongKhop };
}

module.exports = { chay, timTenMoi, rosterTheoLop };

};
  G["E:\\LAP TRINH APP\\myPay\\src\\main\\lib\\kho-fs.js"] = function (module, exports, require, __dirname, __filename, process, Buffer) {
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const PROJECT = 'aword-70dae';
const API_KEY = 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY'; // key CÔNG KHAI định danh project
const GOC = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const KHOA_UNG_VIEN = [
  path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'E:\\LAP TRINH APP\\mySpeaking-data\\data\\firebase-admin.json',
  'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json',
];
function duongKhoa() {
  for (const p of KHOA_UNG_VIEN) {
    try { if (p && path.isAbsolute(p) && fs.existsSync(p)) return p; } catch (_) { /* thử tiếp */ }
  }
  return null;
}
function coKhoaQuanTri() { return duongKhoa() !== null; }

function goiJson(url, opt, lan) {
  const o = opt || {}; const soLan = lan || 0;
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (e) { reject(e); return; }
    const headers = Object.assign({}, o.headers || {});
    let body = null;
    if (o.json !== undefined) {
      body = JSON.stringify(o.json);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    } else if (o.form !== undefined) {
      body = o.form;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: o.method || 'GET', headers },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && soLan < 3) {
          res.resume(); resolve(goiJson(res.headers.location, o, soLan + 1)); return;
        }
        let d = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { d += c; });
        res.on('end', () => {
          let j = null;
          try { j = d ? JSON.parse(d) : null; } catch (_) { j = { _raw: d.slice(0, 200) }; }
          resolve({ status: res.statusCode, json: j, headers: res.headers });
        });
      });
    req.setTimeout((o.giay || 20) * 1000, () => req.destroy(new Error('QUA_LAU')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function maHoa(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(maHoa) } };
  if (typeof v === 'object') {
    const fields = {};
    Object.keys(v).forEach((k) => { fields[k] = maHoa(v[k]); });
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

let _token = null;
async function layToken() {
  if (_token && Date.now() < _token.hetHan - 60000) return _token.chu;
  const duong = duongKhoa();
  if (!duong) throw new Error('KHOA_THIEU_FILE — chưa cài firebase-admin.json trên máy này');
  let sa;
  try {
    let raw = fs.readFileSync(duong, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    sa = JSON.parse(raw);
  } catch (err) { throw new Error('KHOA_HONG ' + String(err && err.message)); }
  if (!sa || !sa.client_email || !sa.private_key) throw new Error('KHOA_THIEU_TRUONG');
  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const phan = b64u({ alg: 'RS256', typ: 'JWT' }) + '.' + b64u({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  });
  const kyTen = crypto.createSign('RSA-SHA256').update(phan).sign(sa.private_key).toString('base64url');
  const r = await goiJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    form: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
      '&assertion=' + encodeURIComponent(phan + '.' + kyTen),
  });
  if (r.status !== 200 || !r.json || !r.json.access_token) throw new Error('KHONG_XIN_DUOC_TOKEN_' + r.status);
  _token = { chu: r.json.access_token, hetHan: Date.now() + (r.json.expires_in || 3600) * 1000 };
  return _token.chu;
}

async function ghiDoc(duong, duLieu, chiTruong) {
  const token = await layToken();
  let url = `${GOC}/${duong}`;
  if (chiTruong && chiTruong.length) {
    url += '?' + chiTruong.map((t) => 'updateMask.fieldPaths=' + encodeURIComponent(t)).join('&');
  }
  const fields = {};
  Object.keys(duLieu).forEach((k) => { fields[k] = maHoa(duLieu[k]); });
  const r = await goiJson(url, {
    method: 'PATCH', json: { fields },
    headers: { Authorization: 'Bearer ' + await layToken() },
  });
  if (r.status !== 200) {
    throw new Error('FS_GHI_' + r.status + ' ' + JSON.stringify((r.json && r.json.error && r.json.error.message) || ''));
  }
  return true;
}

function xayDsDay(m, y, bang, ketQua) {
  const kyThang = `${y}-${String(m).padStart(2, '0')}`;
  const ds = [];
  for (const u of ketQua.units) {
    const daDong = u.id in ketQua.done;
    const mGan = ketQua.matched.find((x) => (x.u.id === u.id)
      || (x.u.kind === 'grp' && (x.u.members || []).some((mm) => mm.id === u.id)));
    const canDong = u.expected || 0;
    const daNhan = daDong && mGan ? (mGan.ti >= 0 ? ketQua.txns[mGan.ti].amount : canDong) : 0;
    const trangThai = daDong ? (mGan && mGan.status === 'THIẾU' ? 'thieu' : 'da_dong') : 'chua_dong';
    const buoi = u.buoi || 0;
    if (u.kind === 'reg') {
      const ma = (u.maDangNhap || '').trim();
      ds.push({ ten: u.label, lop: u.classes.join(','), canDong, daNhan, trangThai, buoi, kind: u.kind, ma, boQua: !ma });
    } else {
      for (const mm of u.members || []) {
        const hsMa = timMa(bang, mm);
        ds.push({
          ten: mm.ten, lop: mm.lop, canDong, daNhan, trangThai, buoi, kind: u.kind,
          giaDinh: u.label, ma: hsMa, boQua: !hsMa,
        });
      }
    }
  }
  return { kyThang, ds };
}

async function dayThang(m, y, bang, ketQua, thang) {
  const { kyThang, ds } = xayDsDay(m, y, bang, ketQua);
  const luc = new Date().toISOString();
  let soDoc = 0;
  for (const d of ds) {
    if (d.boQua) continue; // em chưa có mã đăng nhập web thì chưa đẩy
    const goi = {
      thang: kyThang, ten: d.ten, lop: d.lop, canDong: d.canDong, daNhan: d.daNhan,
      trangThai: d.trangThai, buoi: d.buoi, kind: d.kind, capNhat: luc,
    };
    if (d.giaDinh) goi.giaDinh = d.giaDinh;
    await ghiDoc(`payHoaDon/${encodeURIComponent(d.ma + '_' + kyThang)}`, goi);
    soDoc++;
  }
  const tong = {
    thang: kyThang, capNhat: luc,
    soDonVi: ketQua.units.length,
    daDong: Object.keys(ketQua.done).length,
    chuaDong: ketQua.unpaid.length,
    chuaRo: ketQua.unident.length + ketQua.review.length,
  };
  await ghiDoc(`payThang/${kyThang}`, tong);
  soDoc++;
  return { soDoc };
}
function timMa(bang, mm) {
  try {
    const ddm = require('./diemdanh');
    const hs = ddm.docHocSinh().find((h) => h.lop === mm.lop && h.ten === mm.ten);
    return hs && hs.ma_dang_nhap ? hs.ma_dang_nhap.trim() : '';
  } catch (_) { return ''; }
}

module.exports = { PROJECT, duongKhoa, coKhoaQuanTri, ghiDoc, dayThang, xayDsDay, goiJson };

};
  G.__CHINH = "E:\\LAP TRINH APP\\myPay\\src\\main.js";
  G.__CAU = "E:\\LAP TRINH APP\\myPay\\src\\preload.js";
  G.__PHIEN_BAN = "0.18.0";
  G.__MA = "37ab2d7";
  if (typeof module !== 'undefined' && module.exports) module.exports = G; else g.MyPayGoi = G;
})(typeof window !== 'undefined' ? window : globalThis);
