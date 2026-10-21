// Bàn thử KHÔNG MẠNG cho chuẩn điểm (js/chung.js chuanDiem + kyChuanTuDoc) — web v1.396.0.
// Chạy: node tools/thu-van-tay-chuan.js   (thoát mã 1 nếu có ca hỏng)
//
// Kiểu lỗi nó canh (ca thật 21/10/2026, K10 BÀI CHUẨN BỊ Bước 3 `fgakf3`): máy em NHỚ chuẩn điểm của act, thầy sửa
// tuỳ chọn act đã giao bên AWord (anagram bonus → submit) ⇒ máy cũ chấm 25/25 = 100% < mốc 200% mãi, Bước 4–5 không mở.
// ⛔ Sửa chuanDiem / docSoNop / kyChuanTuDoc / chuanTuDoc thì chạy lại file này trước khi push.
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const WEB = path.join(__dirname, '..');

// ---- dựng tài liệu Firestore REST giả ----
const s = (v) => ({ stringValue: v }), n = (v) => ({ integerValue: String(v) }), b = (v) => ({ booleanValue: v });
function docGiao(loai, opt, soTu) {
  const items = { arrayValue: { values: Array.from({ length: soTu || 5 }, (_, i) => ({ mapValue: { fields: { answer: s('WORD' + i) } } })) } };
  return { fields: { activityType: s(loai), activity: { mapValue: { fields: { options: { mapValue: { fields: opt } }, content: { mapValue: { fields: { items } } } } } },
    submitCount: n(3), lastSubmitAt: n(1) } };
}
// Cùng map nhưng đảo thứ tự khoá (Firestore làm vậy thật)
const dao = (o) => Object.fromEntries(Object.entries(o).reverse());

function dung(kho, ls) {
  const dem = { soNop: 0, baiGiao: 0 };
  const localStorage = { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } };
  const fetch = (url) => {
    const ma = decodeURIComponent((/assignments\/([^/?]+)/.exec(url) || [])[1] || '');
    if (/mask\.fieldPaths=submitCount/.test(url)) dem.soNop++; else if (/activity\.content/.test(url)) dem.baiGiao++;
    if (kho.matMang) return Promise.reject(new Error('mat mang'));
    const d = kho[ma];
    return Promise.resolve({ ok: !!d, status: d ? 200 : 404, json: () => Promise.resolve(JSON.parse(JSON.stringify(d || {}))) });
  };
  const win = { localStorage, sessionStorage: localStorage, fetch, location: { href: 'https://andrewclasses.com/bai.html', search: '', pathname: '/bai.html', hostname: 'andrewclasses.com' },
    addEventListener() {}, setTimeout, clearTimeout, setInterval, clearInterval, console, navigator: { userAgent: 'node' } };
  win.window = win;
  win.document = { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), head: { appendChild() {} }, body: { appendChild() {} }, documentElement: { dataset: {} } };
  const ctx = vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(WEB, 'config.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(WEB, 'js/chung.js'), 'utf8'), ctx);
  const A = Object.values(win).find((v) => v && v.xongAct && v.chuanDiem && v.kyChuanTuDoc);
  return { A, dem };
}

let hong = 0;
const ok = (ten, dat, them) => { if (!dat) hong++; console.log((dat ? 'ĐẠT  ' : 'HỎNG ') + ten + (them ? '  ' + them : '')); };

(async () => {
  const OPT = { anagramMode: s('submit'), pointsOff: n(0), lives: n(0), allCaps: b(true), timer: s('countUp') };
  const { A } = dung({}, {});
  // 1. Vân tay không đổi khi Firestore đảo thứ tự khoá
  const k1 = A.kyChuanTuDoc(docGiao('anagram', OPT).fields), k2 = A.kyChuanTuDoc(docGiao('anagram', dao(OPT)).fields);
  ok('đảo thứ tự khoá ⇒ cùng vân tay', k1 === k2);
  ok('2 (integer) ≡ 2.0 (double)', A.kyChuanTuDoc(docGiao('x', { a: n(2) }).fields) === A.kyChuanTuDoc(docGiao('x', { a: { doubleValue: 2 } }).fields));
  // 2. Đổi BẤT KỲ khoá nào (kể cả khoá mới) ⇒ vân tay đổi — gồm mọi khoá chuanTuDoc/soCauTuDoc đang đọc
  const nguon = fs.readFileSync(path.join(WEB, 'js/chung.js'), 'utf8');
  const khoaDung = new Set(['unjumbleMode', 'anagramMode', 'bonusMult', 'pointsOff', 'minusAmount', 'letterPenalty', 'timeCost']);
  (nguon.match(/\bopt\.([A-Za-z_]\w*)/g) || []).forEach((m) => khoaDung.add(m.slice(4)));
  for (const k of khoaDung) {
    const o2 = Object.assign({}, OPT, { [k]: k in OPT && OPT[k].stringValue ? s(OPT[k].stringValue + 'X') : n(7) });
    ok('đổi `' + k + '` ⇒ vân tay đổi', A.kyChuanTuDoc(docGiao('anagram', o2).fields) !== k1);
  }
  ok('đổi loại act ⇒ vân tay đổi', A.kyChuanTuDoc(docGiao('unjumble', OPT).fields) !== k1);

  // 3. Luồng chuanDiem với bộ đệm trong máy
  const kho = { aaa111: docGiao('anagram', OPT, 25) };
  // 3a. Ca thật: bộ đệm CŨ mốc 200% (bonus), chưa có vân tay
  let ls = { awc_chuan2_aaa111: JSON.stringify({ tru: false, dinh: 200, soCau: 188, soMuc: 25 }) };
  let r = dung(kho, ls), c = await Promise.all([r.A.diemCuaAct('aaa111').catch(() => []), r.A.chuanDiem('aaa111')]).then((x) => x[1]);
  ok('bộ đệm cũ 200% ⇒ tự đọc lại thành 100%', c.dinh === 100 && c.soCau === 25, JSON.stringify(r.dem));
  ok('  sổ nộp chỉ 1 lượt (dùng chung diemCuaAct)', r.dem.soNop === 1);
  // 3b. Mở lại trang, không ai sửa gì ⇒ không đọc bài giao
  r = dung(kho, ls); c = await Promise.all([r.A.diemCuaAct('aaa111').catch(() => []), r.A.chuanDiem('aaa111')]).then((x) => x[1]);
  ok('mở lại, tuỳ chọn không đổi ⇒ 0 lượt đọc bài giao', r.dem.baiGiao === 0 && c.dinh === 100, JSON.stringify(r.dem));
  // 3c. Thầy sửa tuỳ chọn trên AWord: submit → bonus
  kho.aaa111 = docGiao('anagram', Object.assign({}, OPT, { anagramMode: s('bonus') }), 25);
  r = dung(kho, ls); c = await r.A.chuanDiem('aaa111');
  ok('thầy đổi submit → bonus ⇒ máy em nhận mốc 200%', c.dinh === 200 && r.dem.baiGiao === 1);
  // 3d. Unjumble đổi chế độ ⇒ số câu đổi (ca vân tay 4 khoá v1.395.0 bỏ sót)
  kho.uuu222 = docGiao('unjumble', { unjumbleMode: s('bonus') }, 10);
  ls.awc_chuan2_uuu222 = '';
  r = dung(kho, ls); c = await r.A.chuanDiem('uuu222');
  kho.uuu222 = docGiao('unjumble', { unjumbleMode: s('submit') }, 10);
  r = dung(kho, ls); const c2 = await r.A.chuanDiem('uuu222');
  ok('unjumble bonus → submit ⇒ soCau 20 → 10', c.soCau === 20 && c2.soCau === 10, c.soCau + ' → ' + c2.soCau);
  // 3e. Mất mạng ⇒ vẫn trả bản nhớ, không vỡ
  kho.matMang = true; r = dung(kho, ls); c = await r.A.chuanDiem('aaa111');
  ok('mất mạng ⇒ dùng bản nhớ', c && c.dinh === 200);
  // 3f. Act chưa từng nhớ + mất mạng ⇒ lùi "nộp là xong" như cũ
  r = dung(kho, {}); c = await r.A.chuanDiem('moi999');
  ok('act mới + mất mạng ⇒ CHUAN_LUI', c && c.tru === true);

  console.log(hong ? hong + ' CA HỎNG' : 'TẤT CẢ ĐẠT');
  process.exit(hong ? 1 : 0);
})().catch((e) => { console.error('LỖI', e); process.exit(1); });
