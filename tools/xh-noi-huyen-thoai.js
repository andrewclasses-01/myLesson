// 📝 31/10/2026 — thầy chốt NỚI HUYỀN THOẠI: suất mùa đang chạy ⇒ HT 2 suất ≥1800 (các suất khác giữ nguyên).
//   chiaSuat điền lần lượt và DỪNG khi em không đủ sàn ⇒ suất HT thứ 2 còn trống thì bảng y như cũ, không em nào tụt suất.
//   Bảng top + cờ s của em tự tính lại ở trận xếp hạng kế tiếp (capBang).
//   node tools/xh-noi-huyen-thoai.js --xem | --ghi
'use strict';
const path = require('path');
const fs = require('fs');
const FN = path.join(__dirname, '..', '..', 'myLesson', 'may-chu', 'functions', 'node_modules');
const admin = require(path.join(FN, 'firebase-admin'));
const KHOA = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'E:/LAP TRINH APP/mySpeaking-data/data/firebase-admin.json', 'D:/APP AND DATA/mySpeaking-data/data/firebase-admin.json'].find((p) => fs.existsSync(p));
admin.initializeApp({ credential: admin.credential.cert(require(KHOA)) });
const db = admin.firestore();

(async () => {
  const mua = (await db.doc('caiDat/xepHang').get()).data().mua;
  const ref = db.doc('xhMua/' + mua), M = (await ref.get()).data();
  const cu = Array.isArray(M.suat) && M.suat.length ? M.suat : [{ t: 'ht', n: 1, san: 2000 }, { t: 'ct', n: 2, san: 1600 }, { t: 'kc', n: 3, san: 1400 }, { t: 'bk', n: 6, san: 1100 }];
  const moi = cu.map((x) => (x.t === 'ht' ? Object.assign({}, x, { n: 2, san: 1800 }) : x));
  console.log('Mùa', mua, M.ten, '\n  cũ ', JSON.stringify(cu), '\n  mới', JSON.stringify(moi));
  if (!process.argv.includes('--ghi')) { console.log('(--xem: chưa ghi gì)'); process.exit(0); }
  await ref.update({ suat: moi });
  console.log('ĐÃ GHI ⇒', JSON.stringify((await ref.get()).data().suat));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
