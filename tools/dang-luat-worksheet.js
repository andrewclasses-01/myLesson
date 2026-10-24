// 📝 24/10/2026 (web v1.412.0 + app v2.188.0) — LUẬT STORAGE: KHOÁ ĐỌC CÔNG KHAI `worksheet/<lớp>/<bài>/<ô>.pdf`.
// Trước: `allow read: if true` (link nằm trong data/bai.json công khai ⇒ ai cũng tải tài liệu của thầy).
// Nay: CHỈ học sinh đã đăng nhập (claim hs) + thầy (email thầy đã xác minh HOẶC claim thay — giống laThay()). Ghi vẫn false
// (app đẩy bằng khoá quản trị). Web tải kèm vé `Authorization: Firebase <ID token>` (js/chung.js taiWs/luuWs).
// Sửa tại chỗ từ bản LIVE: chỉ thay ĐÚNG dòng `allow read: if true;` trong khối worksheet (chốt dừng nếu không thấy đúng 1).
//
//   node tools/dang-luat-worksheet.js --xem | --dang | --kiem | --lui <rulesetName>
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
// ⛔ DÒ chứ đừng trỏ cứng: máy MSI app phẳng (myLesson/may-chu), máy khác có thể còn myLesson/app/may-chu.
const FN = ['E:/LAP TRINH APP/myLesson/may-chu/functions', 'E:/LAP TRINH APP/myLesson/app/may-chu/functions']
  .find((p) => fs.existsSync(p + '/node_modules/firebase-admin'));
if (!FN) { console.error('Không thấy may-chu/functions (có node_modules) của app myLesson'); process.exit(2); }
const rq = require('module').createRequire(FN + '/index.js');

const THAY = "((request.auth.token.email == 'namdaptrai01@gmail.com' && request.auth.token.email_verified == true) || request.auth.token.get('thay', false) == true)";
const DAU_KHOI = '    match /worksheet/{lop}/{bai}/{tep} {\n';
const CU = '      allow read: if true;\n';
const DAU_HIEU = '(24/10/2026, web v1.412.0) CHI HOC SINH DA DANG NHAP + THAY doc worksheet';
const MOI = '      // ' + DAU_HIEU + ' (web tai kem ve Firebase ID token).\n' +
  "      allow read: if request.auth != null && (request.auth.token.get('hs', false) == true || " + THAY + ');\n';

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
  const s = cu.replace(/\r\n/g, '\n');
  if (s.includes(DAU_HIEU)) throw new Error('CHOT DUNG: luật ĐÃ có khối worksheet mới — không đăng lại');
  const i = s.indexOf(DAU_KHOI);
  if (i < 0 || s.indexOf(DAU_KHOI, i + 1) >= 0) throw new Error('CHOT DUNG: không thấy đúng 1 khối match /worksheet');
  const sau = s.slice(i + DAU_KHOI.length);
  if (!sau.startsWith(CU)) throw new Error('CHOT DUNG: dòng đầu khối worksheet KHÔNG phải `allow read: if true;` — luật live đã khác, đọc lại');
  return s.slice(0, i + DAU_KHOI.length) + MOI + sau.slice(CU.length);
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
  const OBJ = 'worksheet/ZTEST/ZTEST_BAI/0.pdf';
  const idTk = async (uid, claims) => {
    const ct = await auth.createCustomToken(uid, claims);
    const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: ct, returnSecureToken: true }) });
    return (await r.json()).idToken;
  };
  let hong = false;
  const ok = (t, st, can) => { const d = st === can; console.log((d ? '  ✓ ' : '  ✗ ') + t + (d ? '' : '  → THỰC TẾ ' + st)); if (!d) hong = true; };
  const url = 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/' + encodeURIComponent(OBJ) + '?alt=media';
  const UID = ['ztest_thay_ws', 'hs_9999993', 'ztest_la_ws'];
  try {
    await bucket.file(OBJ).save(Buffer.from('%PDF-1.4\n%ztest\n'), { contentType: 'application/pdf' });
    const tThay = await idTk(UID[0], { thay: true });
    const tHs = await idTk(UID[1], { hs: true, ma: 'ZTEST9999993' });
    const tLa = await idTk(UID[2], {});
    ok('NGƯỜI LẠ (không vé) đọc worksheet = 403', (await fetch(url)).status, 403);
    ok('TÀI KHOẢN KHÔNG PHẢI HS/THẦY đọc = 403', (await fetch(url, { headers: { Authorization: 'Firebase ' + tLa } })).status, 403);
    ok('HỌC SINH (claim hs) đọc = 200', (await fetch(url, { headers: { Authorization: 'Firebase ' + tHs } })).status, 200);
    ok('THẦY (claim thay) đọc = 200', (await fetch(url, { headers: { Authorization: 'Firebase ' + tThay } })).status, 200);
    const up = await fetch('https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o?name=' + encodeURIComponent('worksheet/ZTEST/ZTEST_BAI/1.pdf'), { method: 'POST', headers: { Authorization: 'Firebase ' + tHs, 'Content-Type': 'application/pdf' }, body: Buffer.from('%PDF') });
    ok('HỌC SINH ghi = 403', up.status, 403);
  } finally {
    await bucket.file(OBJ).delete().catch(() => {});
    await bucket.file('worksheet/ZTEST/ZTEST_BAI/1.pdf').delete().catch(() => {});
    for (const u of UID) { try { await auth.deleteUser(u); } catch (e) { } }
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
      ghiTaiLieu('_luat-thu-storage-worksheet.rules', moi);
      console.log('  ghép thử OK (chưa đăng). Thay `allow read: if true;` bằng:\n' + MOI);
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-storage-worksheet.rules', cu.source);
      const rs = await api('POST', `${API}/projects/${PROJECT}/rulesets`, { source: { files: [{ name: cu.fileName || 'storage.rules', content: moi }] } });
      console.log('ruleset mới storage:', rs.name);
      await api('PATCH', `${API}/${RELEASE}`, { release: { name: RELEASE, rulesetName: rs.name } });
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-worksheet.js --lui ' + cu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-worksheet.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetName>');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
