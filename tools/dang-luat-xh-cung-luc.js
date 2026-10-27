// 📝 27/10/2026 — LUẬT: XẾP HẠNG "CÙNG LÚC" (thầy chốt: hai em gửi cùng đáp án cách nhau ≤ 400 ms ⇒ cả hai được điểm).
//   Mỗi em ghi tài liệu RIÊNG `tranDau/{id}/tu/{từ}_{bàn}_{a|b}` (đuôi a|b phải đúng bên của mình) — trước đây một từ = một tài liệu,
//   em sau bị luật chặn ngay ở máy em (TAKEN) nên máy chủ không bao giờ biết hai em gửi gần như cùng lúc.
//   Sửa TẠI CHỖ từ bản luật ĐANG CHẠY (mượn hàm của dang-luat-xep-hang.js), CHỐT DỪNG nếu không thấy đúng 1 chỗ.
//
//   node tools/dang-luat-xh-cung-luc.js --xem | --bien-dich | --dang | --lui <rulesetName>
// Đi kèm: app may-chu/functions/tran-dau.js (tdTu/tdTuBo CUNG_LUC) · web nw/js/xh-tran.js (ghi `_a|_b`)
'use strict';
const fs = require('fs');
const path = require('path');
const M = require('module');
const GOC = path.join(__dirname, 'dang-luat-xep-hang.js');
let src = fs.readFileSync(GOC, 'utf8');
src = src.slice(0, src.lastIndexOf('(async () => {')) + '\nmodule.exports = { docRelease, taoRuleset, datRelease, thayMot, soDong, ghiTaiLieu };';
const mod = new M(GOC); mod.filename = GOC; mod.paths = M._nodeModulePaths(__dirname); mod._compile(src, GOC);
const { docRelease, taoRuleset, datRelease, thayMot, soDong, ghiTaiLieu } = mod.exports;
const TEN = 'tools/dang-luat-xh-cung-luc.js';

function ghep(s) {
  if (s.includes("(_[0-9]{1,3}(_[ab])?)?$')")) throw new Error('CHOT DUNG: luật ĐÃ có đuôi _a|_b — không đăng lại');
  s = thayMot(s,
    "allow create: if request.auth != null && tu.matches('^[a-z]{2,16}(_[0-9]{1,3})?$')",
    "allow create: if request.auth != null && tu.matches('^[a-z]{2,16}(_[0-9]{1,3}(_[ab])?)?$')\n" +
    "          // (27/10/2026) XEP HANG CUNG LUC: duoi _a|_b = tai lieu rieng cua tung ben, phai dung ben cua minh\n" +
    "          && (!tu.matches('.*_[ab]$') || (tu.matches('.*_a$') && request.auth.uid == tdTran().a) || (tu.matches('.*_b$') && request.auth.uid == tdTran().b))",
    'tu create');
  return s;
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
      ghiTaiLieu('_luat-truoc-xh-cung-luc.rules', cu.source);
      const rs = await taoRuleset(moi, cu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node ' + TEN + ' --lui ' + cu.rulesetName);
      return;
    }
    console.log('Dùng: --xem | --bien-dich | --dang | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
