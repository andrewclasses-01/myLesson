// thu-kho-web.js — PHÉP THỬ `A.napDuLieu()` đọc HAI NGUỒN (web v1.119.0, 21/09/2026):
// file tĩnh lop.json/bai.json ⟷ kho web tức thì Firestore `lessonWeb/*`, lấy bản có
// `capNhat` mới hơn. Chạy chung.js trong VM giả với `fetch` giả trả từng địa chỉ.
//
// CHẠY: node tools/thu-kho-web.js   (từ thư mục web) — mã thoát 1 nếu có SAI.
// AN TOÀN: không đụng mạng, không đụng Firestore, không đụng file dữ liệu.
// Kiểm: kho mới hơn ⇒ lấy kho (lớp + bài đúng lớp) · kho cũ hơn ⇒ giữ file tĩnh ·
//   kho hỏng/404 ⇒ y như trước · đoán đúng lớp (phiên đã lưu) ⇒ dùng lượt xin sớm, không
//   xin thêm · đoán sai (?nhu= không kèm ?lop=) ⇒ xin thêm đúng 1 lượt bai_<lớp thật> ·
//   màn đăng nhập (chưa đăng nhập, không ?lop=) ⇒ không xin bài · dashboard ⇒ list cả kho
//   và đè MỌI lớp · hình `{lop, khoa, bai}` giữ nguyên.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FS_GOC = 'https://firestore.googleapis.com/v1/projects/aword-70dae/databases/(default)/documents/';
const LOP_TINH = { capNhat: '2026-09-19 21:53:10', nguon: 'myStudent',
  lop: [{ maLop: 'A1C', tenGoc: 'A1-C', hocSinh: [{ id: 1, ten: 'AN', ma: 'AB12' }] },
        { maLop: 'B2B', tenGoc: 'B2-B', hocSinh: [{ id: 2, ten: 'BA', ma: 'CD34' }] }],
  khoa: [{ maLop: 'NNTNGK9', tenGoc: 'NNTNG K9', loai: 'khoa', hocSinh: [{ id: 3, ten: 'CA', ma: 'EF56' }] }] };
const BAI_TINH = { capNhat: '2026-09-19 21:53:10',
  bai: { A1C: [{ id: 'A1C_cu', tieuDe: 'cũ' }], B2B: [{ id: 'B2B_cu' }], NNTNGK9: [{ id: 'K9_cu' }] } };
const docFs = (o, them) => ({ name: 'projects/x/databases/(default)/documents/lessonWeb/' + (them || 'doc'),
  fields: { capNhat: { stringValue: o.capNhat }, json: { stringValue: JSON.stringify(o) } } });

function dungTai(kichBan) {
  // kichBan: { search, pathname, phien, kho: { 'lessonWeb/lop': obj|null|'hong', 'lessonWeb/bai_A1C': ..., 'lessonWeb': [docs] } }
  const goi = [];
  const tra = (u) => {
    goi.push(u.replace(FS_GOC, 'FS:').replace(/\?.*$/, ''));
    if (/data\/lop\.json/.test(u)) return ok(LOP_TINH);
    if (/data\/bai\.json/.test(u)) return ok(BAI_TINH);
    if (/lessonHan|lessonNghi/.test(u)) return ok({ documents: [] });
    const m = /documents\/(lessonWeb(?:\/[^?]+)?)/.exec(u);
    if (m) {
      const v = kichBan.kho[m[1]];
      if (v === 'hong') return Promise.reject(new Error('mạng hỏng'));
      if (v == null) return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
      if (m[1] === 'lessonWeb') return ok({ documents: v.map(o => docFs(o, 'bai_' + o.lop)) });
      return ok(docFs(v));
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  };
  // bản SAO như r.json() thật — không thì các ca thử dùng chung một vật thể và đè lên nhau
  const ok = (j) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(JSON.stringify(j))) });
  const elGia = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, setAttribute() {}, getAttribute: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] });
  const kho = {};
  if (kichBan.phien) kho.mylesson_hs = JSON.stringify(kichBan.phien);
  const tai = {
    console, URLSearchParams, JSON, Promise, Math, Date, String, Number, Array, Object, RegExp, Error,
    document: { addEventListener() {}, querySelector: () => elGia(), querySelectorAll: () => [], getElementById: () => elGia(),
      createElement: () => elGia(), body: elGia(), fonts: { ready: Promise.resolve() } },
    localStorage: { getItem: (k) => (k in kho ? kho[k] : null), setItem(k, v) { kho[k] = String(v); }, removeItem(k) { delete kho[k]; } },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { userAgent: 'node' },
    fetch: tra,
    location: { href: '', search: kichBan.search || '', pathname: kichBan.pathname || '/lop.html', hostname: 'localhost' },
    setTimeout, clearTimeout, setInterval, clearInterval, addEventListener() {}, removeEventListener() {},
    MYLESSON_CONFIG: { AWORD_DB: { projectId: 'aword-70dae', apiKey: 'k' } },
  };
  tai.window = tai; tai.globalThis = tai; tai.self = tai;
  const ctx = vm.createContext(tai);
  // som.js chạy TRƯỚC chung.js y như trên trang thật (khối dập trong <head>)
  const som = fs.readFileSync(path.join(__dirname, '..', 'js', 'som.js'), 'utf8');
  vm.runInContext(som, ctx, { filename: 'som.js' });
  const ma = fs.readFileSync(path.join(__dirname, '..', 'js', 'chung.js'), 'utf8');
  vm.runInContext(ma, ctx, { filename: 'chung.js' });
  return { A: vm.runInContext('window.AWC', ctx), goi };
}

let soLoi = 0;
function kt(ten, thuc, mong) {
  const a = JSON.stringify(thuc), b = JSON.stringify(mong);
  if (a === b) console.log('  OK  ' + ten);
  else { console.log('  SAI ' + ten + ' — muốn ' + b + ' mà được ' + a); soLoi++; }
}
const dem = (goi, mau) => goi.filter(u => u === mau).length;

(async () => {
  // 1. kho MỚI hơn ⇒ lấy kho, cả lớp lẫn bài; đoán đúng lớp từ phiên ⇒ không xin thêm
  let t = dungTai({ phien: { lop: 'A1C', ten: 'AN', ma: 'AB12' }, kho: {
    'lessonWeb/lop': { capNhat: '2026-09-21 10:00:00', lop: [{ maLop: 'A1C', tenGoc: 'A1-C', hocSinh: [{ id: 1, ten: 'AN', ma: 'AB12' }, { id: 9, ten: 'MỚI', ma: 'ZZ99' }] }], khoa: [] },
    'lessonWeb/bai_A1C': { capNhat: '2026-09-21 10:00:00', lop: 'A1C', bai: [{ id: 'A1C_moi' }, { id: 'A1C_cu', tieuDe: 'cũ' }] },
  } });
  let dl = await t.A.napDuLieu();
  console.log('=== kho MỚI hơn file tĩnh, em đã đăng nhập A1C ===');
  kt('lớp lấy từ kho (2 em, có em MỚI)', dl.lop[0].hocSinh.map(h => h.ten), ['AN', 'MỚI']);
  kt('khoa theo kho (rỗng vì kho không có)', dl.khoa, []);
  kt('bài A1C lấy từ kho', dl.bai.A1C.map(b => b.id), ['A1C_moi', 'A1C_cu']);
  kt('bài lớp khác vẫn từ file tĩnh', dl.bai.B2B.map(b => b.id), ['B2B_cu']);
  kt('xin bai_A1C đúng 1 lượt (lượt sớm, không xin lại)', dem(t.goi, 'FS:lessonWeb/bai_A1C'), 1);
  kt('không list cả kho', dem(t.goi, 'FS:lessonWeb'), 0);
  kt('vẫn xin file tĩnh', dem(t.goi, 'http://localhost/data/lop.json') + t.goi.filter(u => /data\/lop\.json/.test(u)).length > 0, true);

  // 2. kho CŨ hơn ⇒ giữ file tĩnh
  t = dungTai({ phien: { lop: 'A1C', ten: 'AN', ma: 'AB12' }, kho: {
    'lessonWeb/lop': { capNhat: '2026-09-01 00:00:00', lop: [{ maLop: 'A1C', hocSinh: [] }], khoa: [] },
    'lessonWeb/bai_A1C': { capNhat: '2026-09-01 00:00:00', lop: 'A1C', bai: [{ id: 'A1C_rat_cu' }] },
  } });
  dl = await t.A.napDuLieu();
  console.log('=== kho CŨ hơn ===');
  kt('lớp giữ file tĩnh', dl.lop.map(l => l.maLop), ['A1C', 'B2B']);
  kt('bài giữ file tĩnh', dl.bai.A1C.map(b => b.id), ['A1C_cu']);

  // 3. kho hỏng / 404 ⇒ y như trước
  t = dungTai({ phien: { lop: 'A1C', ten: 'AN', ma: 'AB12' }, kho: { 'lessonWeb/lop': 'hong', 'lessonWeb/bai_A1C': null } });
  dl = await t.A.napDuLieu();
  console.log('=== kho hỏng + 404 ===');
  kt('lớp từ file tĩnh', dl.lop.length, 2);
  kt('khoa từ file tĩnh', dl.khoa.length, 1);
  kt('bài từ file tĩnh', dl.bai.A1C.map(b => b.id), ['A1C_cu']);

  // 4. đoán SAI lớp: ?nhu= (thầy xem như em B2B) không kèm ?lop=, phiên máy lưu A1C
  t = dungTai({ search: '?nhu=CD34', phien: { lop: 'A1C', ten: 'AN', ma: 'AB12' }, kho: {
    'lessonWeb/lop': null,
    'lessonWeb/bai_A1C': { capNhat: '2026-09-21 10:00:00', lop: 'A1C', bai: [{ id: 'A1C_moi' }] },
    'lessonWeb/bai_B2B': { capNhat: '2026-09-21 10:00:00', lop: 'B2B', bai: [{ id: 'B2B_moi' }] },
  } });
  dl = await t.A.napDuLieu();
  console.log('=== đoán sai lớp (?nhu= em B2B, phiên lưu A1C) ===');
  kt('bài B2B lấy từ kho (xin thêm 1 lượt)', dl.bai.B2B.map(b => b.id), ['B2B_moi']);
  kt('bài A1C KHÔNG đè (lượt sớm bỏ, không dùng)', dl.bai.A1C.map(b => b.id), ['A1C_cu']);
  kt('xin bai_B2B đúng 1 lượt', dem(t.goi, 'FS:lessonWeb/bai_B2B'), 1);

  // 5. màn đăng nhập: chưa đăng nhập, không ?lop= ⇒ không xin bài nào
  t = dungTai({ pathname: '/index.html', kho: { 'lessonWeb/lop': { capNhat: '2026-09-21 10:00:00', lop: [{ maLop: 'A1C', hocSinh: [{ ten: 'X', ma: 'AB12' }] }], khoa: [] } } });
  dl = await t.A.napDuLieu();
  console.log('=== màn đăng nhập ===');
  kt('lớp từ kho', dl.lop[0].hocSinh[0].ten, 'X');
  kt('không xin tài liệu bài nào', t.goi.filter(u => /lessonWeb\/bai_/.test(u)).length, 0);
  kt('bài vẫn có từ file tĩnh', Object.keys(dl.bai).length, 3);

  // 6. dashboard ⇒ list cả kho, đè MỌI lớp mới hơn; lớp cũ hơn giữ tĩnh
  t = dungTai({ pathname: '/dashboard.html', kho: {
    'lessonWeb/lop': null,
    lessonWeb: [{ capNhat: '2026-09-21 10:00:00', lop: 'A1C', bai: [{ id: 'A1C_moi' }] },
                { capNhat: '2026-09-01 00:00:00', lop: 'B2B', bai: [{ id: 'B2B_rat_cu' }] },
                { capNhat: '2026-09-21 10:00:00', lop: 'MOI', bai: [{ id: 'MOI_1' }] }],
  } });
  dl = await t.A.napDuLieu();
  console.log('=== dashboard ===');
  kt('list cả kho 1 lượt', dem(t.goi, 'FS:lessonWeb'), 1);
  kt('A1C đè từ kho', dl.bai.A1C.map(b => b.id), ['A1C_moi']);
  kt('B2B kho cũ hơn ⇒ giữ tĩnh', dl.bai.B2B.map(b => b.id), ['B2B_cu']);
  kt('lớp chỉ có trên kho ⇒ thêm', dl.bai.MOI.map(b => b.id), ['MOI_1']);
  kt('không xin lẻ bai_ nào', t.goi.filter(u => /lessonWeb\/bai_/.test(u)).length, 0);

  // 7. ?gv=1&lop=B2B (thầy xem trang lớp) ⇒ một lớp, không list
  t = dungTai({ search: '?gv=1&lop=B2B', kho: { 'lessonWeb/lop': null, 'lessonWeb/bai_B2B': { capNhat: '2026-09-21 10:00:00', lop: 'B2B', bai: [{ id: 'B2B_moi' }] } } });
  dl = await t.A.napDuLieu();
  console.log('=== ?gv=1&lop=B2B ===');
  kt('bài B2B từ kho', dl.bai.B2B.map(b => b.id), ['B2B_moi']);
  kt('không list cả kho', dem(t.goi, 'FS:lessonWeb'), 0);
  kt('xin bai_B2B đúng 1 lượt (sớm)', dem(t.goi, 'FS:lessonWeb/bai_B2B'), 1);

  console.log(soLoi ? `\n⛔ ${soLoi} phép SAI` : '\n✓ Tất cả đúng');
  process.exit(soLoi ? 1 : 0);
})().catch(e => { console.error('LỖI BÀN THỬ:', e); process.exit(1); });
