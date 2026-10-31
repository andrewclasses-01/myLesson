// 📝 31/10/2026 — LUẬT "PHÒNG CHỜ CÔNG KHAI" (xếp hạng, web v1.469.0):
//   xhPhong/{uid}          chủ phòng tự ghi phòng của mình { mua, ten, anh, lop, h, pha, tran, luc = giờ máy chủ } · ai đăng nhập (nwVao) cũng đọc
//   xhPhong/{uid}/xem/{v}  người xem tự ghi ô của mình { ten, anh, luc } (ảnh ở giữa phòng) · ai đăng nhập cũng đọc
//   xhPhong/{uid}/chatGui  tin chờ (chỉ người gửi đọc lại) ⇒ hàm xhPhongChat lọc ⇒ /chat (chỉ máy chủ ghi, ai đăng nhập cũng đọc)
//   /may/* không mở (máy chủ giữ giờ gửi chat). THAM GIA / vào trận đều qua hàm xhMoi — luật trận không đổi.
//   Sửa TẠI CHỖ từ bản luật ĐANG CHẠY (mượn hàm của dang-luat-xep-hang.js), CHỐT DỪNG nếu không thấy đúng 1 chỗ.
//
//   node tools/dang-luat-phong-cho.js --xem | --bien-dich | --dang | --lui <rulesetName>
// Đi kèm: app may-chu/functions/xep-hang.js (vaoPhong, xhPhongChat, xhPhongXoa, donPhong) · web nw/js/xephang.js
'use strict';
const fs = require('fs');
const path = require('path');
const M = require('module');
const GOC = path.join(__dirname, 'dang-luat-xep-hang.js');
let src = fs.readFileSync(GOC, 'utf8');
src = src.slice(0, src.lastIndexOf('(async () => {')) + '\nmodule.exports = { docRelease, taoRuleset, datRelease, thayMot, soDong, ghiTaiLieu };';
const mod = new M(GOC); mod.filename = GOC; mod.paths = M._nodeModulePaths(__dirname); mod._compile(src, GOC);
const { docRelease, taoRuleset, datRelease, thayMot, soDong, ghiTaiLieu } = mod.exports;
const TEN = 'tools/dang-luat-phong-cho.js';

function ghep(s) {
  if (s.includes('PHONG CHO CONG KHAI')) throw new Error('CHOT DUNG: luật ĐÃ có khối PHONG CHO CONG KHAI — không đăng lại');
  const CU = "    match /tdHan/{uid} {\n      allow read: if nwVao();\n    }\n";
  return thayMot(s, CU, CU +
    "    // (31/10/2026) PHONG CHO CONG KHAI (xep hang): chu phong ghi phong cua minh, ai dang nhap cung xem; nguoi xem ghi o cua minh;\n" +
    "    // chat phong: tin cho => ham xhPhongChat loc => chat (chi may chu ghi). Tham gia / vao tran qua ham xhMoi.\n" +
    "    match /xhPhong/{uid} {\n" +
    "      allow read: if nwVao();\n" +
    "      allow create, update: if request.auth != null && uid == request.auth.uid\n" +
    "        && request.resource.data.keys().hasOnly(['mua', 'ten', 'anh', 'lop', 'h', 'pha', 'tran', 'luc'])\n" +
    "        && request.resource.data.mua is string && request.resource.data.mua.size() <= 40\n" +
    "        && request.resource.data.ten is string && request.resource.data.ten.size() <= 60\n" +
    "        && request.resource.data.anh is string && request.resource.data.anh.size() <= 600\n" +
    "        && request.resource.data.lop is string && request.resource.data.lop.size() <= 40\n" +
    "        && request.resource.data.h is string && request.resource.data.h.size() <= 12\n" +
    "        && request.resource.data.pha in ['cho', 'tim', 'moi', 'thay', 'vao', 'roi']\n" +
    "        && request.resource.data.tran is string && request.resource.data.tran.size() <= 40\n" +
    "        && request.resource.data.luc == request.time;\n" +
    "      allow delete: if request.auth != null && uid == request.auth.uid;\n" +
    "      match /xem/{v} {\n" +
    "        allow read: if nwVao();\n" +
    "        allow create, update: if request.auth != null && v == request.auth.uid\n" +
    "          && request.resource.data.keys().hasOnly(['ten', 'anh', 'luc'])\n" +
    "          && request.resource.data.ten is string && request.resource.data.ten.size() <= 60\n" +
    "          && request.resource.data.anh is string && request.resource.data.anh.size() <= 600\n" +
    "          && request.resource.data.luc == request.time;\n" +
    "        allow delete: if request.auth != null && v == request.auth.uid;\n" +
    "      }\n" +
    "      match /chatGui/{cid} {\n" +
    "        allow read: if request.auth != null && resource.data.uid == request.auth.uid;\n" +
    "        allow create: if nwVao() && request.resource.data.keys().hasOnly(['uid', 'chu', 'luc'])\n" +
    "          && request.resource.data.uid == request.auth.uid\n" +
    "          && request.resource.data.chu is string && request.resource.data.chu.size() > 0 && request.resource.data.chu.size() <= 120\n" +
    "          && request.resource.data.luc == request.time;\n" +
    "      }\n" +
    "      match /chat/{cid} {\n" +
    "        allow read: if nwVao();\n" +
    "      }\n" +
    "    }\n", 'xhPhong sau tdHan');
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
      ghiTaiLieu('_luat-truoc-phong-cho.rules', cu.source);
      const rs = await taoRuleset(moi, cu.fileName || 'firestore.rules');
      console.log('ruleset mới firestore:', rs);
      await datRelease('cloud.firestore', rs);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node ' + TEN + ' --lui ' + cu.rulesetName);
      return;
    }
    console.log('Dùng: --xem | --bien-dich | --dang | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
