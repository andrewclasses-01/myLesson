// thu-chuhanchang.js — PHÉP THỬ cho `A.chuHanChang` (mới thêm vào js/chung.js,
// 09/09/2026) + kiểm A.xetChang/A.changHien vẫn đúng sau khi lop.html đổi
// sang gọi A.chuHanChang thay vì bản chép cục bộ.
//
// CHẠY: node tools/thu-chuhanchang.js   (từ thư mục web)
// AN TOÀN: không đụng mạng, không đụng Firestore — chỉ chạy chung.js trong VM giả.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function elGia() {
  return { style: {}, dataset: {}, value: '', textContent: '', innerHTML: '', hidden: false,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, append() {}, setAttribute() {}, getAttribute: () => null,
    addEventListener() {}, removeEventListener() {}, remove() {}, focus() {},
    closest: () => null, querySelector: () => null, querySelectorAll: () => [] };
}
const tai = {
  console,
  document: { addEventListener() {}, querySelector: () => elGia(), querySelectorAll: () => [],
    getElementById: () => elGia(), createElement: () => elGia(), body: elGia() },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { userAgent: 'node' },
  fetch: () => Promise.reject(new Error('ban thu khong goi mang')),
  location: { href: '', search: '', hostname: 'localhost' },
  setTimeout, clearTimeout, setInterval, clearInterval,
  addEventListener() {}, removeEventListener() {},
};
tai.window = tai; tai.globalThis = tai; tai.self = tai;

const ctx = vm.createContext(tai);
const ma = fs.readFileSync(path.join(__dirname, '..', 'js', 'chung.js'), 'utf8');
vm.runInContext(ma, ctx, { filename: 'chung.js' });
const A = vm.runInContext('window.AWC', ctx);

let soLoi = 0;
function kt(ten, thuc, mongMuon) {
  if (thuc === mongMuon) { console.log('  OK  ' + ten); }
  else { console.log('  SAI ' + ten + ' — muon "' + mongMuon + '" ma duoc "' + thuc + '"'); soLoi++; }
}

console.log('=== A.chuHanChang — "2026-09-13T23:59" -> "23:59 • 13/9" ===');
kt('mau dung tu bai giao thuc te', A.chuHanChang('2026-09-13T23:59'), '23:59 • 13/9');
kt('gio le', A.chuHanChang('2026-09-05T07:05'), '07:05 • 5/9');
kt('chuoi rong -> rong', A.chuHanChang(''), '');
kt('sai dang -> rong', A.chuHanChang('13/9/2026 23:59'), '');
kt('undefined -> rong', A.chuHanChang(undefined), '');

console.log('=== A.xetChang + A.changHien — bai STAGE 2 chang, 1 em con thieu chang 1 ===');
const xetChang = A.xetChang, changHien = A.changHien;
const bai = {
  id: 'b1', dang: 'STAGE',
  khoi: [
    { loai: 'act', ma: 'm1', han: '2026-09-10T18:00' },
    { loai: 'act', ma: 'm2', han: '2026-09-12T18:00' },
  ],
};
const diem = { m1: [{ ten: 'An', xong: 1 }] };   // "Binh" chua lam act m1
const chuan = { m1: 1, m2: 1 };
const lay = { diem: (ma) => diem[ma] || [], chuan: (ma) => chuan[ma] };
const caLop = ['An', 'Binh'];
const cac = xetChang(bai, lay, caLop, { now: new Date('2026-09-09T10:00:00').getTime() });
kt('co dung 2 chang', String(cac.length), '2');
kt('chang 1 dang -> con Binh chua xong', cac[0].tt, 'dang');
kt('chang 2 chua toi luot (cho hoac xa)', cac[1].tt === 'xa' || cac[1].tt === 'cho' ? 'ok' : cac[1].tt, 'ok');
const xem = changHien(cac);
kt('changHien tro dung chang 1 (dang mo, chua xong)', String(xem), '0');

if (soLoi) {
  console.log('\n=== THAT BAI: ' + soLoi + ' phep thu sai ===');
  process.exit(1);
}
console.log('\n=== TAT CA PHEP THU DEU DUNG ===');
process.exit(0);
