// 📝 28/09/2026 (Đợt F — điểm danh trên dashboard) — LUẬT STORAGE: ảnh BẰNG CHỨNG điểm danh myStudent
// `<lớp>/_evidence/<ngày>/<tệp>` — CHỈ THẦY ĐỌC (dashboard xem ảnh camera chụp khi sửa điểm danh). Không ai ghi.
// Sửa tại chỗ từ bản LIVE (chốt dừng), neo ngay TRƯỚC khối bắt-hết `match /{allPaths=**}`.
//
//   node tools/dang-luat-storage-bang-chung.js --xem | --dang | --kiem | --lui <rulesetName>
//
// ⛔ CHỈ đọc, chỉ thầy (email thầy đã xác minh HOẶC claim thay) — giống laThay() của luật Firestore.
'use strict';
const fs = require('fs');
const path = require('path');
const PROJECT = 'aword-70dae';
const BUCKET = 'aword-70dae.firebasestorage.app';
const API_KEY = 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY';   // khoá CÔNG KHAI (config.js)
const API = 'https://firebaserules.googleapis.com/v1';
const RELEASE = `projects/${PROJECT}/releases/firebase.storage/${BUCKET}`;
const KHOA_UNG_VIEN = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'];
const TAI_LIEU_UNG_VIEN = ['E:/LAP TRINH APP/myLesson-data/tai-lieu', 'D:/APP AND DATA/myLesson-data/tai-lieu'];
const FN = 'E:/LAP TRINH APP/myLesson/app/may-chu/functions';
const rq = require('module').createRequire(FN + '/index.js');

const NEO = '    match /{allPaths=**} {\n';
const DAU_HIEU = '(28/09/2026, Dot F) ANH BANG CHUNG diem danh';
const THEM =
  '    // ' + DAU_HIEU + ' myStudent: CHI THAY doc (dashboard xem anh camera khi sua diem danh). Khong ai ghi.\n' +
  '    match /{lop}/_evidence/{ngay}/{tep} {\n' +
  "      allow read: if request.auth != null && ((request.auth.token.email == 'namdaptrai01@gmail.com' && request.auth.token.email_verified == true) || request.auth.token.get('thay', false) == true);\n" +
  '      allow write: if false;\n' +
  '    }\n';

function khoa() { const k = KHOA_UNG_VIEN.find((p) => fs.existsSync(p)); if (!k) throw new Error('thiếu khoá quản trị'); return k; }
async function token() {
  const { GoogleAuth } = rq('google-auth-library');
  return new GoogleAuth({ keyFile: khoa(), scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getAccessToken();
}
async function api(method, url, body) {
  const r = await fetch(url, { method, headers: { Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(method + ' ' + url + ' → ' + r.status + ' ' + JSON.stringify(j).slice(0, 300));
  return j;
}
async function docLive() {
  const rel = await api('GET', `${API}/${RELEASE}`);
  const rs = await api('GET', `${API}/${rel.rulesetName}`);
  const f = rs.source.files[0];
  return { rulesetName: rel.rulesetName, source: f.content, fileName: f.name };
}
function ghep(cu) {
  if (cu.includes(DAU_HIEU) || cu.includes('/_evidence/')) throw new Error('CHOT DUNG: luật ĐÃ có khối _evidence — không đăng lại');
  const n = cu.split(NEO).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG: thấy ' + n + ' khối allPaths (cần đúng 1)');
  return cu.replace(NEO, () => THEM + NEO);
}
function ghiTaiLieu(ten, noiDung) {
  const d = TAI_LIEU_UNG_VIEN.find((p) => fs.existsSync(p));
  if (!d) return;
  fs.writeFileSync(path.join(d, ten), noiDung);
  console.log('  đã ghi ' + path.join(d, ten));
}

async function kiem() {
  const admin = rq('firebase-admin');
  admin.initializeApp({ credential: admin.credential.cert(require(khoa())), storageBucket: BUCKET });
  const auth = admin.auth(), bucket = admin.storage().bucket();
  const OBJ = 'ZTESTSTORAGE/_evidence/2026-01-01/ztest.jpg';
  const idTk = async (uid, claims) => {
    const ct = await auth.createCustomToken(uid, claims);
    const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: ct, returnSecureToken: true }) });
    return (await r.json()).idToken;
  };
  let hong = false;
  const ok = (t, st, can) => { const d = st === can; console.log((d ? '  ✓ ' : '  ✗ ') + t + (d ? '' : '  → THỰC TẾ ' + st)); if (!d) hong = true; };
  const url = 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/' + encodeURIComponent(OBJ) + '?alt=media';
  try {
    await bucket.file(OBJ).save(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), { contentType: 'image/jpeg' });
    const tThay = await idTk('ztest_thay_st', { thay: true });
    const tHs = await idTk('hs_9999992', { hs: true, ma: 'ZTEST9999992' });
    ok('NGƯỜI LẠ đọc ảnh bằng chứng = 403', (await fetch(url)).status, 403);
    ok('HỌC SINH đọc = 403', (await fetch(url, { headers: { Authorization: 'Firebase ' + tHs } })).status, 403);
    ok('THẦY đọc = 200', (await fetch(url, { headers: { Authorization: 'Firebase ' + tThay } })).status, 200);
    const up = await fetch('https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o?name=' + encodeURIComponent('ZTESTSTORAGE/_evidence/2026-01-01/ghi.jpg'), { method: 'POST', headers: { Authorization: 'Firebase ' + tThay, 'Content-Type': 'image/jpeg' }, body: Buffer.from([0xff, 0xd8]) });
    ok('THẦY ghi = 403', up.status, 403);
  } finally {
    await bucket.file(OBJ).delete().catch(() => {});
    await bucket.file('ZTESTSTORAGE/_evidence/2026-01-01/ghi.jpg').delete().catch(() => {});
    for (const u of ['ztest_thay_st', 'hs_9999992']) { try { await auth.deleteUser(u); } catch (e) { } }
    console.log('  đã dọn');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt (luật mới cần ~1 phút lan).'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--lui') {
      if (!a[1]) throw new Error('thiếu rulesetName');
      console.log(JSON.stringify(await api('PATCH', `${API}/${RELEASE}`, { release: { name: RELEASE, rulesetName: a[1] } })).slice(0, 200));
      return;
    }
    if (a.includes('--kiem')) { await kiem(); return; }
    const cu = await docLive();
    console.log('firebase.storage đang chạy:', cu.rulesetName);
    const moi = ghep(cu.source);
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-storage-bang-chung.rules', moi);
      console.log('  ghép thử OK (chưa đăng). Thêm:\n' + THEM);
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-storage-bang-chung.rules', cu.source);
      const rs = await api('POST', `${API}/projects/${PROJECT}/rulesets`, { source: { files: [{ name: cu.fileName || 'storage.rules', content: moi }] } });
      console.log('ruleset mới storage:', rs.name);
      await api('PATCH', `${API}/${RELEASE}`, { release: { name: RELEASE, rulesetName: rs.name } });
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-storage-bang-chung.js --lui ' + cu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-storage-bang-chung.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
