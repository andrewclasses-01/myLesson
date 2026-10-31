// 📝 31/10/2026 — LUẬT "LƯỢT LUYỆN TẬP" (hồ sơ Giải đấu của em trên dashboard, web v1.463.0):
//   tdLuyen/{id}: máy em ghi MỘT phiếu khi ván luyện với máy xong (nw/js/tran.js ?luyen=1). Chỉ TẠO — không sửa, không xoá.
//   Thầy đọc hết (js/hs-gd.js tab Luyện tập) · em đọc phiếu của mình. Khoá + kiểu + độ dài kiểm chặt, `luc` = giờ máy chủ.
//   Sửa TẠI CHỖ từ bản luật ĐANG CHẠY (mượn hàm của dang-luat-xep-hang.js), CHỐT DỪNG nếu không thấy đúng 1 chỗ.
//
//   node tools/dang-luat-luyen-tap.js --xem | --bien-dich | --dang | --lui <rulesetName>
'use strict';
const fs = require('fs');
const path = require('path');
const M = require('module');
const GOC = path.join(__dirname, 'dang-luat-xep-hang.js');
let src = fs.readFileSync(GOC, 'utf8');
src = src.slice(0, src.lastIndexOf('(async () => {')) + '\nmodule.exports = { docRelease, taoRuleset, datRelease, thayMot, soDong, ghiTaiLieu };';
const mod = new M(GOC); mod.filename = GOC; mod.paths = M._nodeModulePaths(__dirname); mod._compile(src, GOC);
const { docRelease, taoRuleset, datRelease, thayMot, soDong, ghiTaiLieu } = mod.exports;
const TEN = 'tools/dang-luat-luyen-tap.js';

const NEO = [
  '    match /tdLichSu/{uid} {',
  '      allow read: if laThay() || (request.auth != null && request.auth.uid == uid);',
  '    }',
  ''
].join('\n');
const D = 'request.resource.data';
const KHOI = [
  '    // (31/10/2026) LUYEN TAP: em ghi 1 phieu moi van luyen voi may xong (ho so Giai dau tren dashboard). Chi tao; thay doc het, em doc cua minh.',
  '    match /tdLuyen/{id} {',
  '      allow read: if laThay() || (request.auth != null && resource.data.uid == request.auth.uid);',
  '      allow create: if nwVao() && ' + D + '.uid == request.auth.uid',
  "        && " + D + ".keys().hasOnly(['uid', 'ten', 'lop', 'luc', 'phut', 'may', 'bo', 'boTen', 'giai', 'che', 'diem', 'dm', 'kq', 'dung', 'sai', 'dai', 'lam'])",
  '        && ' + D + '.luc == request.time',
  '        && ' + D + '.ten is string && ' + D + '.ten.size() <= 60 && ' + D + '.lop is string && ' + D + '.lop.size() <= 20',
  "        && " + D + ".phut in [2, 3, 5] && " + D + ".may in [1, 2, 3] && " + D + ".bo in ['n', 'g']",
  '        && ' + D + '.boTen is string && ' + D + '.boTen.size() <= 80 && ' + D + '.giai is string && ' + D + '.giai.size() <= 40',
  "        && " + D + ".che in ['', 'one', 'list', 'free'] && " + D + ".kq in ['thang', 'thua', 'hoa']",
  '        && ' + D + '.diem is int && ' + D + '.diem >= 0 && ' + D + '.diem <= 5000 && ' + D + '.dm is int && ' + D + '.dm >= 0 && ' + D + '.dm <= 5000',
  '        && ' + D + '.dung is int && ' + D + '.dung >= 0 && ' + D + '.dung <= 500 && ' + D + '.sai is int && ' + D + '.sai >= 0 && ' + D + '.sai <= 500',
  '        && ' + D + '.dai is string && ' + D + '.dai.size() <= 16 && ' + D + '.lam is int && ' + D + '.lam >= 0 && ' + D + '.lam <= 400000;',
  '    }',
  ''
].join('\n');

function ghep(s) {
  if (s.includes('LUYEN TAP:')) throw new Error('CHOT DUNG: luật ĐÃ có khối LUYEN TAP — không đăng lại');
  return thayMot(s, NEO, NEO + KHOI, 'tdLuyen');
}

(async () => {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--lui') { if (!a[1]) throw new Error('thiếu rulesetName'); console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120)); return; }
    const cu = await docRelease('cloud.firestore');
    console.log('cloud.firestore đang chạy:', cu.rulesetName);
    const moi = ghep(cu.source);
    if (a.includes('--xem')) {
      const d = soDong(cu.source, moi);
      console.log('  ghép thử OK (chưa đăng). Khác biệt:');
      d.bot.forEach((x) => console.log('   − ' + x));
      d.them.forEach((x) => console.log('   + ' + x));
      return;
    }
    if (a.includes('--bien-dich')) { console.log('BIÊN DỊCH OK (chưa kích hoạt):', await taoRuleset(moi, cu.fileName || 'firestore.rules')); return; }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-luyen-tap.rules', cu.source);
      const rs = await taoRuleset(moi, cu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node ' + TEN + ' --lui ' + cu.rulesetName);
      return;
    }
    console.log('Dùng: --xem | --bien-dich | --dang | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
