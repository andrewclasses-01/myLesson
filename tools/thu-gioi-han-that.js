// 19/10/2026 — THỬ HÀM MÁY CHỦ tdDoi + chot với GIỚI HẠN CHƠI (web v1.375.0), dữ liệu ZTEST, dọn sạch.
//   node tools/thu-gioi-han-that.js   (cần khoá quản trị + firebase-admin của app myLesson ở E:)
//   Ca 1: em A đã đủ 20 trận hôm nay ⇒ bạn bấm Nhận ⇒ trận 'han' ly 'hetA'
//   Ca 2: A đã 10 trận giải hôm nay ⇒ trận giải chơi được nhưng khongTinh {a:true} ⇒ phiếu đếm tăng ⇒ A rời trận ⇒ chốt:
//         bảng giải chỉ cộng B (thắng), dòng trận có ka, lịch sử A có kt
'use strict';
const path = require('path');
const fs = require('fs');
const NM = ['E:/LAP TRINH APP/myLesson/app/may-chu/functions/node_modules', 'D:/APP AND DATA/myLesson/app/may-chu/functions/node_modules'].find((p) => fs.existsSync(p));
const admin = require(path.join(NM, 'firebase-admin'));
const KHOA = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'), 'E:\\LAP TRINH APP\\mySpeaking-data\\data\\firebase-admin.json'].find((p) => fs.existsSync(p));
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(KHOA, 'utf8').replace(/^\uFEFF/, ''))) });
const db = admin.firestore();
const A = 'hs_9999983', B = 'hs_9999984', LOP = 'ZTESTGH2', GIAI = 'ztest_gh_giai_' + Date.now();
const NGAY = Math.floor((Date.now() + 7 * 3600e3) / 864e5);
let hong = false;
const ok = (t, dk, them) => { console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → ' + JSON.stringify(them))); if (!dk) hong = true; };
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
async function cho(ref, dk, giay) { for (let i = 0; i < giay * 2; i++) { const s = await ref.get(); if (s.exists && dk(s.data())) return s.data(); await ngu(500); } return (await ref.get()).data(); }
function tran(id, giai) {
  const l = Date.now();
  return db.doc('tranDau/' + id).set({ a: A, b: B, nguoi: [A, B], tenA: 'ZTEST GH A', tenB: 'ZTEST GH B', lop: LOP, giai, phut: 2, lv: 'easy', trangThai: 'moi', taoLuc: l, het: l + 60000 });
}
(async () => {
  const xoa = [], id1 = 'ztest_gh1_' + Date.now(), id2 = 'ztest_gh2_' + Date.now();
  try {
    // ---- ca 1 ----
    await db.doc('tdHan/' + A).set({ ngay: NGAY, so: 20, giai: {}, cap: {} });
    await db.doc('tdHan/' + B).set({ ngay: NGAY, so: 0, giai: {}, cap: {} });
    await tran(id1, ''); xoa.push('tranDau/' + id1);
    await db.doc('tranDau/' + id1).update({ trangThai: 'nhan' });
    const t1 = await cho(db.doc('tranDau/' + id1), (t) => t.trangThai !== 'nhan', 40);
    ok('Ca 1: A đủ 20 trận ⇒ trangThai han, ly hetA', t1.trangThai === 'han' && t1.ly === 'hetA', { tt: t1.trangThai, ly: t1.ly });
    ok('Ca 1: phiếu đếm B KHÔNG tăng', (await db.doc('tdHan/' + B).get()).data().so === 0);
    // ---- ca 2 ----
    await db.doc('tdHan/' + A).set({ ngay: NGAY, so: 10, giai: { [GIAI]: 10 }, cap: {} });
    await tran(id2, GIAI); xoa.push('tranDau/' + id2);
    await db.doc('tranDau/' + id2).update({ trangThai: 'nhan' });
    const t2 = await cho(db.doc('tranDau/' + id2), (t) => t.trangThai !== 'nhan', 40);
    ok('Ca 2: trận giải bắt đầu (choi)', t2.trangThai === 'choi', t2.trangThai);
    ok('Ca 2: khongTinh = {a:true, b:false}', !!t2.khongTinh && t2.khongTinh.a === true && t2.khongTinh.b === false, t2.khongTinh);
    const hA = (await db.doc('tdHan/' + A).get()).data(), hB = (await db.doc('tdHan/' + B).get()).data();
    ok('Ca 2: phiếu A so 11, giải 11, cặp B 1', hA.so === 11 && hA.giai[GIAI] === 11 && hA.cap[B] === 1, hA);
    ok('Ca 2: phiếu B so 1, giải 1, cặp A 1', hB.so === 1 && hB.giai[GIAI] === 1 && hB.cap[A] === 1, hB);
    // A rời trận ⇒ chốt (tdNhip)
    await db.doc('tranDau/' + id2 + '/nhip/' + A).set({ luc: Date.now(), roi: true });
    xoa.push('tranDau/' + id2 + '/nhip/' + A);
    const t3 = await cho(db.doc('tranDau/' + id2), (t) => t.trangThai === 'xong', 40);
    ok('Ca 2: chốt xong, A thua (rời trận)', t3.trangThai === 'xong' && t3.kq && t3.kq.a === 'thua', { tt: t3.trangThai, kq: t3.kq });
    const bang = (await db.doc('giaiDau/' + GIAI + '/bang/' + LOP).get()).data() || {};
    ok('Ca 2: bảng giải KHÔNG có A, B thắng 1', !(bang.em || {})[A] && ((bang.em || {})[B] || {}).t === 1, bang.em);
    ok('Ca 2: dòng trận có ka:true', bang.tran && bang.tran[0] && bang.tran[0].ka === true && !bang.tran[0].kb, bang.tran && bang.tran[0]);
    const lsA = (await db.doc('tdLichSu/' + A).get()).data() || {}, lsB = (await db.doc('tdLichSu/' + B).get()).data() || {};
    ok('Ca 2: lịch sử A có kt, B không', lsA.ds && lsA.ds[0].kt === true && lsB.ds && !lsB.ds[0].kt, { a: lsA.ds && lsA.ds[0], b: lsB.ds && lsB.ds[0] });
  } finally {
    const them = ['tdHan/' + A, 'tdHan/' + B, 'tdLichSu/' + A, 'tdLichSu/' + B, 'giaiDau/' + GIAI + '/bang/' + LOP];
    for (const id of [id1, id2]) {
      for (const sub of ['tu', 'nhip', 'may', 'xem']) { const q = await db.collection('tranDau/' + id + '/' + sub).get(); q.forEach((d) => them.push(d.ref.path)); }
    }
    const tb = await db.collection('nwUsers/' + B + '/thongBao').get(); tb.forEach((d) => them.push(d.ref.path));
    const b = db.batch(); new Set(xoa.concat(them)).forEach((p) => b.delete(db.doc(p))); await b.commit();
    const conDu = await db.collection('nwUsers').doc(B).get(); if (conDu.exists && !conDu.data().uid) await conDu.ref.delete();
    console.log('  dọn xong');
  }
  if (hong) process.exitCode = 1;
  process.exit();
})().catch((e) => { console.error(e); process.exit(1); });
