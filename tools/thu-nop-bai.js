// thu-nop-bai.js — PHÉP THỬ THUẦN cho `A.nopBai` (web v1.120.0, 21/09/2026): nạp chung.js vào VM với `fetch` giả,
// gọi thật id/tenObject/tuFs↔raFs/doc/ghi/nopTrang (nén ảnh giả bằng canvas giả) — KHÔNG đụng Firestore/Storage thật.
// Chạy: node tools/thu-nop-bai.js   (thư mục web). Mã thoát 1 khi có ca sai.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function dungTai() {
  const goi = [];          // [{u, method, body}]
  const kho = {};          // id -> doc REST (giả Firestore)
  const tra = (u, opt) => {
    const o = opt || {};
    goi.push({ u, method: o.method || 'GET', body: o.body });
    const ok = (j, status) => Promise.resolve({ ok: true, status: status || 200, json: () => Promise.resolve(JSON.parse(JSON.stringify(j))) });
    let m = /documents\/lessonNop\/([^?]+)/.exec(u);
    if (m) {
      const id = decodeURIComponent(m[1]);
      if (o.method === 'PATCH') { kho[id] = JSON.parse(o.body); return ok(kho[id]); }
      return kho[id] ? ok(kho[id]) : Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    }
    if (/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\?uploadType=media/.test(u)) {
      if (o.headers['Content-Type'] !== 'image/jpeg') return Promise.resolve({ ok: false, status: 403, json: () => Promise.resolve({}) });
      return ok({ downloadTokens: 'tk-' + goi.length });
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  };
  const canvasGia = (w, h) => ({
    width: w, height: h, getContext: () => ({ drawImage() {}, fillRect() {}, fillStyle: '' }),
    toBlob(cb, kieu, q) { cb({ size: Math.round(this.width * this.height * (q || 0.8) / 20), type: kieu, _w: this.width, _h: this.height }); },
  });
  const elGia = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, setAttribute() {}, getAttribute: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] });
  class BlobGia { constructor(parts, o) { this.size = 1; this.type = (o && o.type) || ''; } }
  const tai = {
    console, URLSearchParams, JSON, Promise, Math, Date, String, Number, Array, Object, RegExp, Error, Blob: BlobGia,
    document: { addEventListener() {}, querySelector: () => elGia(), querySelectorAll: () => [], getElementById: () => elGia(),
      createElement: (t) => (t === 'canvas' ? canvasGia(0, 0) : elGia()), body: elGia(), fonts: { ready: Promise.resolve() } },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { userAgent: 'node' },
    fetch: tra,
    location: { href: '', search: '', pathname: '/bai.html', hostname: 'localhost' },
    setTimeout, clearTimeout, setInterval, clearInterval, addEventListener() {}, removeEventListener() {},
    MYLESSON_CONFIG: { AWORD_DB: { projectId: 'aword-70dae', apiKey: 'k' } },
    canvasGia,
  };
  tai.window = tai; tai.globalThis = tai; tai.self = tai;
  const ctx = vm.createContext(tai);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'som.js'), 'utf8'), ctx, { filename: 'som.js' });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'chung.js'), 'utf8'), ctx, { filename: 'chung.js' });
  return { A: vm.runInContext('window.AWC', ctx), goi, kho, canvasGia };
}

let soLoi = 0;
function kt(ten, thuc, mong) {
  const a = JSON.stringify(thuc), b = JSON.stringify(mong);
  if (a === b) console.log('  OK  ' + ten);
  else { console.log('  SAI ' + ten + ' — muốn ' + b + ' mà được ' + a); soLoi++; }
}

(async () => {
  const t = dungTai();
  const N = t.A.nopBai;
  console.log('=== 1. tên/id khớp luật (lop ≤30, bai ≤200, ma ≤60, đúng 4 khúc) ===');
  kt('id', N.id('a1c', 'A1C_16.9_DICTS LSA2', 2, ' ab12 '), 'A1C__A1C_16.9_DICTS_LSA2__2__ab12');
  kt('tenObject', N.tenObject('A1C', 'B', 0, 'M', 3), 'nopBai/A1C/B/0/M/t3.jpg');
  kt('tenObject nhỏ', N.tenObject('A1C', 'B', 0, 'M', 3, true), 'nopBai/A1C/B/0/M/t3_nho.jpg');
  kt('lớp có ký tự lạ bị lọc (giữ chữ, bỏ /)', N.id('A1-C/x', 'b', 0, 'm').split('__')[0], 'A1-CX');
  kt('o âm → 0', N.id('A', 'b', -3, 'm').split('__')[2], '0');

  console.log('=== 2. tuFs ↔ ghi (7 trường, đúng kiểu integerValue/mapValue) ===');
  const ok1 = await N.ghi({ lop: 'A1C', bai: 'B1', o: 1, ma: 'M1', ten: 'AN', trang: { 1: { luc: 1700000000000, url: 'u1', nho: 'n1' } }, luc: 1700000000001 });
  kt('ghi ok', ok1, true);
  const body = JSON.parse(t.goi.filter(g => g.method === 'PATCH').pop().body);
  kt('đúng 7 trường', Object.keys(body.fields).sort(), ['bai', 'lop', 'luc', 'ma', 'o', 'ten', 'trang']);
  kt('o là integerValue', body.fields.o, { integerValue: '1' });
  kt('trang.1.luc là integerValue chuỗi', body.fields.trang.mapValue.fields['1'].mapValue.fields.luc, { integerValue: '1700000000000' });
  const d = await N.doc('A1C', 'B1', 1, 'M1');
  kt('doc đọc lại đúng', { ten: d.ten, o: d.o, url: d.trang['1'].url, luc: d.trang['1'].luc }, { ten: 'AN', o: 1, url: 'u1', luc: 1700000000000 });
  kt('doc chưa có → null', await N.doc('A1C', 'B1', 9, 'M1'), null);
  kt('doc thiếu mã → null (không gọi mạng)', await N.doc('A1C', 'B1', 1, ''), null);

  console.log('=== 3. nopTrang: nén → 2 upload JPEG → ghi doc gộp trang cũ ===');
  const truoc = t.goi.length;
  const kq = await N.nopTrang({ lop: 'A1C', bai: 'B1', o: 1, ma: 'M1', ten: 'AN' }, 2, t.canvasGia(3000, 4000));
  kt('ok', kq.ok, true);
  kt('giữ trang 1 cũ + thêm trang 2', Object.keys(kq.trang).sort(), ['1', '2']);
  const up = t.goi.slice(truoc).filter(g => /uploadType=media/.test(g.u));
  kt('đúng 2 lượt upload (to + nhỏ)', up.length, 2);
  kt('tên object to', decodeURIComponent(/name=([^&]+)/.exec(up[0].u)[1]), 'nopBai/A1C/B1/1/M1/t2.jpg');
  kt('tên object nhỏ', decodeURIComponent(/name=([^&]+)/.exec(up[1].u)[1]), 'nopBai/A1C/B1/1/M1/t2_nho.jpg');
  kt('url có token', /alt=media&token=tk-/.test(kq.trang['2'].url), true);
  kt('ảnh to thu về cạnh dài 1600', up[0].body._h, 1600);
  kt('ảnh nhỏ cạnh dài 320', up[1].body._h, 320);
  const doc2 = JSON.parse(t.goi.filter(g => g.method === 'PATCH').pop().body);
  kt('doc ghi lại có 2 trang', Object.keys(doc2.fields.trang.mapValue.fields).sort(), ['1', '2']);

  console.log('=== 4. kho từ chối ⇒ {ok:false, loi}, không ném ===');
  t.kho.__tuChoi = true;
  const goc = t.A.nopBai.dayBlob;
  const kq2 = await N.nopTrang({ lop: 'A1C', bai: 'B1', o: 1, ma: 'M1', ten: 'AN' }, 1, { size: 1, type: 'text/plain' });
  kt('nguồn không phải ảnh ⇒ lỗi hiền', kq2.ok, false);
  kt('có câu lỗi', typeof kq2.loi === 'string' && kq2.loi.length > 0, true);

  console.log('=== 5. v1.121.0 — chặng STAGE: khối NGHE/WORKSHEET mang `han` là MỤC CHẶNG, act vẫn quyết xong/thiếu ===');
  const bai = { id: 'B', dang: 'STAGE', khoi: [
    { loai: 'act', ten: 'ACT 1', ma: 'a1', han: '2026-09-23T00:00' },
    { loai: 'nghe', ten: 'DICTATION', maNghe: 'X', han: '2026-09-24T12:00' },
    { loai: 'act', ten: 'ACT 2', ma: 'a2', han: '2026-09-26T00:00' },
    { loai: 'ws', ten: 'Sheet', o: 3, han: '2026-09-26T00:00' },
    { loai: 'nghe', ten: 'CU', maNghe: 'Y' },                       // bài cũ: không hạn ⇒ không phải mục chặng
  ] };
  const cac = t.A.changCuaBai(bai);
  kt('3 chặng', cac.map(c => c.so), [1, 2, 3]);
  kt('acts chỉ act có mã', cac.map(c => c.acts.map(a => a.ten)), [['ACT 1'], [], ['ACT 2']]);
  kt('muc đủ thành viên', cac.map(c => c.muc.map(a => a.ten)), [['ACT 1'], ['DICTATION'], ['ACT 2', 'Sheet']]);
  const lay = { diem: () => [], chuan: () => ({ dinh: 100 }) };
  const xet = t.A.xetChang(bai, lay, ['AN', 'BI'], { now: Date.parse('2026-09-22T10:00') });
  kt('chặng 1 đang chạy, chặng 2 (chỉ nghe) chưa tới lượt', xet.map(c => c.tt), ['dang', 'xa', 'xa']);
  const xet2 = t.A.xetChang(bai, { diem: (ma) => (ma === 'a1' ? [{ ten: 'AN', diem: 100, giay: 1 }, { ten: 'BI', diem: 100, giay: 1 }] : []), chuan: () => ({ dinh: 100 }) }, ['AN', 'BI'], { now: Date.parse('2026-09-22T20:00') });
  kt('cả lớp xong act 1 ⇒ chặng nghe mở, không có act ⇒ coi như xong ⇒ chặng 3 CHỜ tới 12h trước hạn chặng 2', xet2.map(c => c.tt), ['xong', 'xong', 'cho']);
  kt('thiếu chặng 3 = cả lớp (act 2 chưa ai làm)', xet2[2].thieu, ['AN', 'BI']);

  console.log(soLoi ? `\n✗ ${soLoi} ca sai` : '\n✓ Tất cả đúng');
  process.exit(soLoi ? 1 : 0);
})();
