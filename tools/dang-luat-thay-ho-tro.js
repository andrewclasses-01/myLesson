// 📝 31/10/2026 — LUẬT "THẦY ANDREW HỖ TRỢ" (trận xếp hạng):
//   1) tranDau/{id}: thầy (claim thay) đang xem trận xếp hạng đang chơi được ghi ĐÚNG 2 khoá `hoTro {ben '', 'a'|'b', gv = mình, luc}` + `daHoTro`
//   2) tranDau/{id}/tu/{tu}: thầy gửi từ HỘ em đang hỗ trợ — đuôi tài liệu phải là `_<hoTro.ben>`, uid = thầy (máy chủ gán điểm theo đuôi)
//   3) tranDau/{id}/xem/{uid}: thêm khoá `sv` (giờ máy chủ) để máy thầy đo lệch giờ như máy em (doLech)
//   Sửa TẠI CHỖ từ bản luật ĐANG CHẠY (mượn hàm của dang-luat-xep-hang.js), CHỐT DỪNG nếu không thấy đúng 1 chỗ.
//
//   node tools/dang-luat-thay-ho-tro.js --xem | --bien-dich | --dang | --lui <rulesetName>
// Đi kèm: app may-chu/functions/tran-dau.js (benGui, chốt xoá dấu) + xep-hang.js (thua có thầy) · web nw/js/xh-tran.js (v1.459.0)
'use strict';
const fs = require('fs');
const path = require('path');
const M = require('module');
const GOC = path.join(__dirname, 'dang-luat-xep-hang.js');
let src = fs.readFileSync(GOC, 'utf8');
src = src.slice(0, src.lastIndexOf('(async () => {')) + '\nmodule.exports = { docRelease, taoRuleset, datRelease, thayMot, soDong, ghiTaiLieu };';
const mod = new M(GOC); mod.filename = GOC; mod.paths = M._nodeModulePaths(__dirname); mod._compile(src, GOC);
const { docRelease, taoRuleset, datRelease, thayMot, soDong, ghiTaiLieu } = mod.exports;
const TEN = 'tools/dang-luat-thay-ho-tro.js';

function ghep(s) {
  if (s.includes('THAY HO TRO')) throw new Error('CHOT DUNG: luật ĐÃ có khối THAY HO TRO — không đăng lại');
  s = thayMot(s,
    "      function tdTran() { return get(/databases/$(database)/documents/tranDau/$(id)).data; }\n",
    "      // (31/10/2026) THAY HO TRO: thay dang xem tran xep hang DANG CHOI bat / tat / doi ben ho tro - chi 2 khoa hoTro + daHoTro\n" +
    "      allow update: if laThay() && resource.data.xh is string && resource.data.trangThai == 'choi'\n" +
    "        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['hoTro', 'daHoTro'])\n" +
    "        && request.resource.data.hoTro is map && request.resource.data.hoTro.keys().hasOnly(['ben', 'gv', 'luc'])\n" +
    "        && request.resource.data.hoTro.ben in ['', 'a', 'b'] && request.resource.data.hoTro.gv == request.auth.uid\n" +
    "        && request.resource.data.hoTro.luc is int && request.resource.data.get('daHoTro', {}) is map;\n" +
    "      function tdTran() { return get(/databases/$(database)/documents/tranDau/$(id)).data; }\n",
    'tranDau update hoTro');
  s = thayMot(s,
    "          && (!tu.matches('.*_[ab]$') || (tu.matches('.*_a$') && request.auth.uid == tdTran().a) || (tu.matches('.*_b$') && request.auth.uid == tdTran().b))\n",
    "          && (!tu.matches('.*_[ab]$') || (tu.matches('.*_a$') && request.auth.uid == tdTran().a) || (tu.matches('.*_b$') && request.auth.uid == tdTran().b) || tdThayHo())\n",
    'tu duoi ben');
  s = thayMot(s,
    "          && request.resource.data.uid == request.auth.uid\n          && request.auth.uid in tdTran().nguoi\n",
    "          && request.resource.data.uid == request.auth.uid\n          && (request.auth.uid in tdTran().nguoi || tdThayHo())\n",
    'tu nguoi');
  s = thayMot(s,
    "      match /tu/{tu} {\n",
    "      match /tu/{tu} {\n" +
    "        // (31/10/2026) THAY HO TRO: thay gui tu HO em dang ho tro - duoi tai lieu _<ben> dung ben dang ho tro (may chu cham theo duoi)\n" +
    "        function tdThayHo() { return laThay() && tdTran().get('hoTro', {}).get('gv', '') == request.auth.uid\n" +
    "          && tdTran().hoTro.ben in ['a', 'b'] && tu.matches('^[a-z]{2,16}_[0-9]{1,3}_' + tdTran().hoTro.ben + '$'); }\n",
    'tu ham tdThayHo');
  s = thayMot(s,
    "          && request.resource.data.keys().hasOnly(['ten', 'anh', 'gv', 'luc'])\n",
    "          && request.resource.data.keys().hasOnly(['ten', 'anh', 'gv', 'luc', 'sv'])   // (31/10/2026) THAY HO TRO: sv = gio may chu cho thay do lech\n",
    'xem sv');
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
      ghiTaiLieu('_luat-truoc-thay-ho-tro.rules', cu.source);
      const rs = await taoRuleset(moi, cu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node ' + TEN + ' --lui ' + cu.rulesetName);
      return;
    }
    console.log('Dùng: --xem | --bien-dich | --dang | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
