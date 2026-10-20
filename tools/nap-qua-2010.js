// ⭐ 20/10/2026 — NẠP PHIẾU QUÀ 20-10 cho mọi bạn NỮ (giới tính 'f' trong lopThem/chung, đánh dấu ở dashboard).
//   Mỗi em một tài liệu quaDip/2010_<số HS> { dip, so, m, t, lop, sao:10, nhan:false, het, tao } — ĐÃ CÓ thì để nguyên (không lật lại nhan).
//   Trang em (js/qua-2010.js) tìm phiếu theo m == ID đăng nhập ⇒ hiện pop-up; luật: tools/dang-luat-qua-2010.js.
//   node tools/nap-qua-2010.js --xem | --nap
'use strict';
const path = require('path');
const fs = require('fs');
const NODE_MODULES = ['E:/LAP TRINH APP/myLesson/app/may-chu/functions/node_modules', 'D:/APP AND DATA/myLesson/app/may-chu/functions/node_modules']
  .find((p) => fs.existsSync(path.join(p, 'firebase-admin')));
if (!NODE_MODULES) { console.error('Không thấy firebase-admin (app/may-chu/functions/node_modules)'); process.exit(1); }
const admin = require(path.join(NODE_MODULES, 'firebase-admin'));
const KHOA = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'E:\\LAP TRINH APP\\mySpeaking-data\\data\\firebase-admin.json', 'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'].find((p) => fs.existsSync(p));
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(KHOA, 'utf8').replace(/^\uFEFF/, ''))) });
const db = admin.firestore();
const chuanMa = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();
const HET = Date.UTC(2026, 9, 22, 17, 0, 0);   // 00:00 23/10/2026 giờ VN

(async () => {
  const nap = process.argv.includes('--nap');
  const DL = JSON.parse((await db.doc('lessonWeb/lop').get()).data().json);
  const gt = ((await db.doc('lopThem/chung').get()).data() || {}).gt || {};
  const nguoi = ((await db.doc('hsSo/soCai').get()).data() || {}).nguoi || {};
  const soTheoMa = {};
  Object.keys(nguoi).forEach((so) => { const m = chuanMa((nguoi[so] || {}).ma); if (m) soTheoMa[m] = so; });
  const theo = {}, ds = [];
  (DL.lop || []).concat(DL.khoa || []).forEach((l) => (l.hocSinh || []).forEach((h) => {
    const k = h.ma ? chuanMa(h.ma) : (l.maLop + '#' + h.id);
    if (!theo[k]) { theo[k] = { k, ten: h.ten || '', lop: l.tenGoc || l.maLop }; ds.push(theo[k]); }
  }));
  const nu = ds.filter((p) => gt[p.k] === 'f');
  const thieu = [], viec = [];
  nu.forEach((p) => {
    const so = soTheoMa[p.k];
    if (!so) { thieu.push(p); return; }
    viec.push({ so, m: p.k, t: String(p.ten || (nguoi[so] || {}).t || '').replace(/\s+\d+$/, ''), lop: p.lop });
  });
  console.log('Học sinh:', ds.length, '· nữ:', nu.length, '· có số HS:', viec.length, '· KHÔNG có số HS:', thieu.length);
  thieu.forEach((p) => console.log('   ⚠ chưa có số HS:', p.ten, '|', p.lop, '|', p.k));
  const refs = viec.map((v) => db.doc('quaDip/2010_' + v.so));
  const cu = refs.length ? await db.getAll(...refs) : [];
  const moi = viec.filter((v, i) => !cu[i].exists);
  console.log('Đã có phiếu:', viec.length - moi.length, '· sẽ tạo mới:', moi.length);
  if (!nap) { moi.slice(0, 5).forEach((v) => console.log('   mẫu', v)); console.log('(xem thử — chạy --nap để ghi)'); return; }
  const luc = Date.now();
  for (let i = 0; i < moi.length; i += 400) {
    const b = db.batch();
    moi.slice(i, i + 400).forEach((v) => b.create(db.doc('quaDip/2010_' + v.so), { dip: '2010', so: v.so, m: v.m, t: v.t, lop: v.lop, sao: 10, nhan: false, het: HET, tao: luc }));
    await b.commit();
  }
  console.log('✓ đã tạo', moi.length, 'phiếu quà');
})().catch((e) => { console.error('LỖI:', e.message); process.exit(1); });
