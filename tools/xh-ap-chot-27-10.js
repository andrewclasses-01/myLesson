// 📝 27/10/2026 — ÁP CÁC CHỐT MÙA 2 lên dữ liệu (thầy duyệt mẫu v7 + chốt):
//   1) giờ vàng ×1,2 · 18:30–22:00 (xhMua/{mua}.gioVang) — trận mới ghép sau lúc này mới mang giờ vàng mới
//   2) ĐIỂM DANH tính bù: ngày (giờ VN) mỗi em đã đấu xong ≥ 1 trận từ lúc mở mùa (không tính trận em bỏ / mất kết nối)
//      ⇒ xhMua/{mua}/em/{uid}.dd · ddChuoi · ddMax (máy chủ tự ghi tiếp từ các trận sau)
//   node tools/xh-ap-chot-27-10.js --xem   (chỉ đọc, in ra sẽ ghi gì)
//   node tools/xh-ap-chot-27-10.js --ghi   (ghi thật)
'use strict';
const path = require('path');
const fs = require('fs');
const FN = path.join(__dirname, '..', '..', 'app', 'may-chu', 'functions', 'node_modules');
const admin = require(path.join(FN, 'firebase-admin'));
const KHOA = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'E:\\LAP TRINH APP\\mySpeaking-data\\data\\firebase-admin.json', 'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'].find((p) => fs.existsSync(p));
admin.initializeApp({ credential: admin.credential.cert(require(KHOA)) });
const db = admin.firestore();
const GIO_VANG = { tu: 18 * 60 + 30, den: 22 * 60, nhan: 1.2 };
const soNgay = (ms) => Math.floor((ms + 7 * 3600e3) / 864e5);

(async () => {
  const ghi = process.argv.includes('--ghi');
  const mua = (await db.doc('caiDat/xepHang').get()).data().mua;
  const mRef = db.doc('xhMua/' + mua), M = (await mRef.get()).data();
  console.log('Mùa', mua, M.ten, '· giờ vàng hiện tại', JSON.stringify(M.gioVang), '⇒', JSON.stringify(GIO_VANG));
  const tran = (await db.collection('tranDau').where('xh', '==', mua).where('trangThai', '==', 'xong').get()).docs.map((d) => d.data());
  const ngay = {};
  tran.forEach((t) => {
    const n = soNgay(t.xongLuc || t.ketThuc || 0);
    ['a', 'b'].forEach((k) => {
      const bo = (t.ly === 'roi' + k.toUpperCase()) || (t.ly === 'mat' + k.toUpperCase());
      if (bo || !t[k]) return;
      (ngay[t[k]] = ngay[t[k]] || new Set()).add(n);
    });
  });
  const emS = await mRef.collection('em').get();
  const viec = [];
  emS.forEach((d) => {
    const cu = d.data(), set = new Set([...(cu.dd || []), ...(ngay[d.id] || [])]);
    const dd = [...set].sort((a, b) => a - b).slice(-60);
    if (!dd.length) return;
    let c = 1, mx = 1;
    for (let i = 1; i < dd.length; i++) { c = dd[i] === dd[i - 1] + 1 ? c + 1 : 1; mx = Math.max(mx, c); }
    viec.push({ ref: d.ref, ten: cu.ten, dd, ddChuoi: c, ddMax: Math.max(mx, cu.ddMax || 0) });
  });
  console.log('Trận đã xong', tran.length, '· em có ngày điểm danh', viec.length);
  viec.slice(0, 8).forEach((v) => console.log('  ', v.ten, '· ngày', v.dd.length, '· chuỗi', v.ddChuoi));
  if (!ghi) { console.log('\n(chỉ xem — thêm --ghi để ghi thật)'); return; }
  await mRef.update({ gioVang: GIO_VANG, capNhat: Date.now() });
  for (let i = 0; i < viec.length; i += 400) {
    const b = db.batch();
    viec.slice(i, i + 400).forEach((v) => b.set(v.ref, { dd: v.dd, ddChuoi: v.ddChuoi, ddMax: v.ddMax }, { merge: true }));
    await b.commit();
  }
  console.log('✓ ĐÃ GHI giờ vàng + điểm danh', viec.length, 'em');
})().then(() => process.exit(0)).catch((e) => { console.error('LỖI', e.message); process.exit(1); });
