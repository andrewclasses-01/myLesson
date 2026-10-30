// 📝 31/10/2026 — TÍNH LẠI `hang` (thứ hạng toàn trường) cho MỌI em của mùa xếp hạng đang chạy.
//   Máy chủ cũ chỉ tính hạng cho hai em vừa đấu ⇒ em bị vượt giữ số cũ (rà 31/10: 79/112 em sai). Máy chủ mới (capBang + khoang) tự giữ đúng từ sau deploy;
//   chạy công cụ này MỘT LẦN để sửa số đang sai. Bằng điểm ⇒ cùng hạng (= count(diem > x) + 1, như máy chủ).
//   node tools/xh-tinh-lai-hang.js --xem   (chỉ đọc, in ra em nào sẽ đổi)
//   node tools/xh-tinh-lai-hang.js --ghi   (ghi thật)
'use strict';
const path = require('path');
const fs = require('fs');
const FN = path.join(__dirname, '..', '..', 'myLesson', 'may-chu', 'functions', 'node_modules');
const admin = require(path.join(FN, 'firebase-admin'));
const KHOA = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'E:\LAP TRINH APP\mySpeaking-data\data\firebase-admin.json', 'D:\APP AND DATA\mySpeaking-data\data\firebase-admin.json'].find((p) => fs.existsSync(p));
admin.initializeApp({ credential: admin.credential.cert(require(KHOA)) });
const db = admin.firestore();

(async () => {
  const ghi = process.argv.includes('--ghi');
  const mua = (await db.doc('caiDat/xepHang').get()).data().mua;
  const ds = (await db.collection('xhMua/' + mua + '/em').get()).docs.filter((d) => d.data().diem != null);
  const diem = ds.map((d) => d.data().diem);
  const doi = ds.map((d) => ({ d, hang: diem.filter((x) => x > d.data().diem).length + 1 })).filter((r) => r.d.data().hang !== r.hang);
  console.log('Mùa', mua, '·', ds.length, 'em có điểm ·', doi.length, 'em đổi hạng');
  doi.sort((p, q) => p.hang - q.hang).forEach((r) => console.log('  ', r.d.data().ten, r.d.data().lop, r.d.data().diem, '#' + r.d.data().hang, '⇒ #' + r.hang));
  if (!ghi) { console.log('(--xem: chưa ghi gì)'); process.exit(0); }
  for (let i = 0; i < doi.length; i += 400) {
    const b = db.batch(); doi.slice(i, i + 400).forEach((r) => b.update(r.d.ref, { hang: r.hang })); await b.commit();
  }
  console.log('ĐÃ GHI', doi.length, 'em');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
