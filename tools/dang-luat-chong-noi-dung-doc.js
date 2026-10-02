// 🛡 02/10/2026 (web v1.225.0, thầy chốt "vá hết") — CHỐNG NỘI DUNG ĐỘC HẠI gửi tới học sinh.
//   Đo thật 02/10 (3 tài khoản HS giả): HS có tài khoản gửi được ẢNH TỪ WEB NGOÀI (tin nhắn/bài/thông báo), LINK lừa trong Tin nhắn,
//   TRÍCH DẪN GIẢ lời thầy, sửa TIN CUỐI thành chữ bịa, tự gắn VAI GV khi tạo phòng, CHẶN + KHOÁ chỉ có hiệu lực trên màn hình,
//   gửi THÔNG BÁO cho em lớp khác, đặt tên "Thầy Andrew" ở chat lớp, tải SVG có mã chạy. Người lạ (không tài khoản) vốn đã bị chặn.
//   Vá 11 chỗ luật Firestore + 1 chỗ luật Storage (xem VA_FS / VA_ST). Mỗi chỗ phải thấy đúng 1 lần, không thì CHỐT DỪNG.
//
//   node tools/dang-luat-chong-noi-dung-doc.js --xem | --dang | --kiem | --lui <rulesetFirestore> [rulesetStorage]
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const PROJECT = 'aword-70dae';
const API_KEY = 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY';   // khoá CÔNG KHAI (config.js) — dùng để thử như người lạ
const API = 'https://firebaserules.googleapis.com/v1';
const DB = `projects/${PROJECT}/databases/(default)`;
const FS_GOC = `https://firestore.googleapis.com/v1/${DB}/documents`;
const IDT = 'https://identitytoolkit.googleapis.com/v1';
const DUOI_EMAIL = '@id.andrewclasses.com';
const KHOA_UNG_VIEN = [path.join(process.env.LOCALAPPDATA || '', 'AndrewClasses', 'firebase-admin.json'),
  'E:\\LAP TRINH APP\\mySpeaking-data\\data\\firebase-admin.json',
  'D:\\APP AND DATA\\mySpeaking-data\\data\\firebase-admin.json'];
const TAI_LIEU_UNG_VIEN = ['E:/LAP TRINH APP/myLesson-data/tai-lieu', 'D:/APP AND DATA/myLesson-data/tai-lieu'];


// ───────── CÁC CHỖ VÁ (mỗi chỗ phải thấy ĐÚNG 1 lần trong luật đang chạy — không thì CHỐT DỪNG) ─────────
const DAU_HIEU = 'function nwAnhKho(s)';
const VA_FS = [
  ['1 hàm dùng chung (ảnh kho nw/, tài khoản còn mở, có link, ô tv)',
    String.raw`    function nwNhanDuoc(u) { return laThay() || nwLaGv(u) || nwCungLop(u) || nwBanBe(u); }
`,
    String.raw`    function nwNhanDuoc(u) { return laThay() || nwLaGv(u) || nwCungLop(u) || nwBanBe(u); }
    // (02/10/2026, web v1.225.0) CHONG NOI DUNG DOC (do that: hoc sinh gui duoc anh tu web ngoai, link lua, trich gia thay...).
    // Anh CHI tu kho Storage nw/ cua he thong (hoac assets/ cua chinh site) - khong link anh ngoai (doi anh sau khi gui, do IP nguoi xem).
    function nwAnhKho(s) {
      return s == null || (s is string && (s == ''
        || (s.size() <= 500 && s.matches('^https://firebasestorage[.]googleapis[.]com/v0/b/aword-70dae[.]firebasestorage[.]app/o/nw%2F[A-Za-z0-9_-]+%2F[^?/]+[?]alt=media&token=[0-9a-f-]+$'))
        || (s.size() <= 120 && s.matches('^assets/[A-Za-z0-9._/-]+$') && !s.matches('.*[.][.].*'))));
    }
    function nwAnhDs(ds) {
      return ds is list && ds.size() <= 10
        && (ds.size() < 1 || nwAnhKho(ds[0])) && (ds.size() < 2 || nwAnhKho(ds[1])) && (ds.size() < 3 || nwAnhKho(ds[2]))
        && (ds.size() < 4 || nwAnhKho(ds[3])) && (ds.size() < 5 || nwAnhKho(ds[4])) && (ds.size() < 6 || nwAnhKho(ds[5]))
        && (ds.size() < 7 || nwAnhKho(ds[6])) && (ds.size() < 8 || nwAnhKho(ds[7])) && (ds.size() < 9 || nwAnhKho(ds[8]))
        && (ds.size() < 10 || nwAnhKho(ds[9]));
    }
    // Tai khoan bi thay KHOA (nwUsers.khoa) khong ghi duoc gi - truoc do chi khoa tren man hinh.
    function nwConMo() { return laThay() || nwHoSo(nwToi()).get('khoa', false) != true; }
    // Cung khuon link voi chat lop (js/chat.js CO_LINK) + discord / t.me.
    function nwCoLink(s) {
      return s.lower().matches('(?s).*(https?:|://|www[.]|discord|t[.]me/|[.](com|vn|net|org|io|me|app|gg|ly|xyz|top|site|online|tv|cc|info|edu)([/?#:]|\\s|$)).*');
    }
    // O tv cua CHINH EM khi tao phong rieng: khop ho so that (truoc do em tu ghi vaiTro 'gv' => hien tich THAY).
    function nwTvToi(v) {
      return v == null || (v is map && v.get('ten', '') == nwHoSo(nwToi()).ten
        && v.get('vaiTro', 'hs') == nwHoSo(nwToi()).get('vaiTro', 'hs') && nwAnhKho(v.get('anh', '')));
    }
    // O tv cua NGUOI KIA: khong gan vai gv gia, anh dung kho.
    function nwTvKhac(v, u) {
      return v == null || (v is map && (v.get('vaiTro', 'hs') != 'gv' || nwLaGv(u)) && nwAnhKho(v.get('anh', '')));
    }
`],
  ['2 ảnh bìa hồ sơ',
    String.raw`             && request.resource.data.gioiThieu.size() <= 300)
`,
    String.raw`             && request.resource.data.gioiThieu.size() <= 300
             && nwAnhKho(request.resource.data.get('bia', '')))   // (02/10/2026) anh bia chi tu kho nw/
`],
  ['3 thông báo: chỉ người nhắn được + ảnh kho + tài khoản mở',
    String.raw`          && request.resource.data.keys().hasOnly(['loai', 'tu', 'tuTen', 'tuAnh', 'chu', 'link', 'luc', 'daDoc'])
`,
    String.raw`          && request.resource.data.keys().hasOnly(['loai', 'tu', 'tuTen', 'tuAnh', 'chu', 'link', 'luc', 'daDoc'])
          // (02/10/2026, web v1.225.0) chi gui cho nguoi DUOC NHAN (thay / cung lop / ban be) - truoc do gui duoc cho em BAT KY lop nao;
          // anh nguoi gui chi tu kho nw/; tai khoan bi khoa khong gui.
          && nwConMo() && (laThay() || (nwNhanDuoc(uid) && nwAnhKho(request.resource.data.get('tuAnh', ''))))
`],
  ['4 bài đăng mới: ảnh kho + tài khoản mở',
    String.raw`        && request.resource.data.anh is list && request.resource.data.anh.size() <= 10                // v0.5.0: 10 ảnh
`,
    String.raw`        && request.resource.data.anh is list && request.resource.data.anh.size() <= 10                // v0.5.0: 10 ảnh
        // (02/10/2026, web v1.225.0) anh bai / anh tac gia / anh bai goc chia se: CHI tu kho nw/ (khong anh web ngoai); tai khoan bi khoa khong dang.
        && nwConMo() && (laThay() || (nwAnhDs(request.resource.data.anh) && nwAnhKho(request.resource.data.tacGia.get('anh', ''))
             && (request.resource.data.get('goc', null) == null || nwAnhDs(request.resource.data.goc.get('anh', [])))))
`],
  ['5 sửa bài: ảnh kho',
    String.raw`             && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['chu', 'anh', 'pham', 'suaLuc'])
             && request.resource.data.chu.size() <= 2000)
`,
    String.raw`             && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['chu', 'anh', 'pham', 'suaLuc'])
             && request.resource.data.chu.size() <= 2000
             && (laThay() || nwAnhDs(request.resource.data.anh)))   // (02/10/2026) anh chi tu kho nw/
`],
  ['6 bình luận: ảnh kho + tài khoản mở',
    String.raw`          && request.resource.data.anh is string && request.resource.data.anh.size() <= 500
`,
    String.raw`          && request.resource.data.anh is string && request.resource.data.anh.size() <= 500
          && nwConMo() && (laThay() || (nwAnhKho(request.resource.data.anh) && nwAnhKho(request.resource.data.tacGia.get('anh', ''))))   // (02/10/2026)
`],
  ['7 tạo phòng riêng: đúng khuôn, ô tv thật',
    String.raw`        && (request.resource.data.loai == 'rieng' || laThay())   // v0.6.0: CHỈ THẦY tạo nhóm
`,
    String.raw`        && (request.resource.data.loai == 'rieng' || laThay())   // v0.6.0: CHỈ THẦY tạo nhóm
        // (02/10/2026, web v1.225.0) CHONG GIA MAO: hoc sinh tao phong rieng DUNG khuon trang nw/js/chat.js Chat.moRieng
        // (ten rong, chua co tin cuoi, khong anh/chanBoi); o tv cua em khop ho so that; o nguoi kia khong gan vai gv gia.
        && nwConMo()
        && (laThay() || (request.resource.data.keys().hasOnly(['loai', 'ten', 'thanhVien', 'tv', 'taoBoi', 'luc', 'capNhat', 'tinCuoi', 'docLuc'])
            && request.resource.data.get('ten', '') == '' && request.resource.data.get('tinCuoi', null) == null
            && request.resource.data.tv is map && request.resource.data.tv.keys().hasOnly(request.resource.data.thanhVien)
            && nwTvToi(request.resource.data.tv.get(nwToi(), null))
            && nwTvKhac(request.resource.data.tv.get(request.resource.data.thanhVien[0] == nwToi() ? request.resource.data.thanhVien[1] : request.resource.data.thanhVien[0], null),
                        request.resource.data.thanhVien[0] == nwToi() ? request.resource.data.thanhVien[1] : request.resource.data.thanhVien[0])))
`],
  ['8 tin cuối của phòng: đúng tên mình',
    String.raw`                && resource.data.get('chanBoi', []).removeAll([nwToi()]).hasOnly(request.resource.data.get('chanBoi', []))));
`,
    String.raw`                && resource.data.get('chanBoi', []).removeAll([nwToi()]).hasOnly(request.resource.data.get('chanBoi', []))))
        // (02/10/2026, web v1.225.0) TIN CUOI (xem truoc o danh sach): hoc sinh chi ghi tin cuoi mang DUNG uid + ten cua minh
        // (truoc do sua thanh chu bia gan ten 'Thay Andrew').
        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['tinCuoi']) || laThay() || request.resource.data.tinCuoi == null
            || (request.resource.data.tinCuoi is map && request.resource.data.tinCuoi.get('uid', '') == nwToi()
                && nwTenDung(request.resource.data.tinCuoi.get('ten', ''))));
`],
  ['9 hàm trích dẫn thật (trong khối tin)',
    String.raw`      match /tin/{mid} {
`,
    String.raw`      match /tin/{mid} {
        // (02/10/2026, web v1.225.0) TRICH DAN (traLoi) phai KHOP tin goc that trong cung phong: uid + ten + chu + anh
        // (truoc do bia trich "Thay Andrew: cac em vao link nay...").
        function nwTraLoiThat(q) {
          return q is map && q.keys().hasOnly(['id', 'uid', 'ten', 'chu', 'hinh'])
            && q.get('id', '') is string && q.get('id', '').size() > 0 && q.get('id', '').size() <= 40
            && exists(/databases/$(database)/documents/nwChats/$(id)/tin/$(q.id))
            && get(/databases/$(database)/documents/nwChats/$(id)/tin/$(q.id)).data.get('uid', '') == q.get('uid', '')
            && get(/databases/$(database)/documents/nwChats/$(id)/tin/$(q.id)).data.get('ten', '') == q.get('ten', '')
            && get(/databases/$(database)/documents/nwChats/$(id)/tin/$(q.id)).data.get('chu', '') == q.get('chu', '')
            && get(/databases/$(database)/documents/nwChats/$(id)/tin/$(q.id)).data.get('hinh', '') == q.get('hinh', '');
        }
`],
  ['10 gửi tin: không ảnh/link/trích giả, chặn + khoá thật',
    String.raw`          && nwTenDung(request.resource.data.get('ten', ''))   // (27/09/2026)
          && request.resource.data.luc is number;
`,
    String.raw`          && nwTenDung(request.resource.data.get('ten', ''))   // (27/09/2026)
          // (02/10/2026, web v1.225.0) CHONG NOI DUNG DOC - do that 02/10 cac duong nay deu LOT:
          //   hoc sinh KHONG gui anh (thay chot 02/10, trang cung khong co nut) · anh dai dien chi tu kho nw/ · hoc sinh khong gui link
          //   · bi nguoi kia CHAN (chanBoi) thi khong gui · tai khoan bi KHOA khong gui · trich dan phai khop tin goc.
          && nwConMo()
          && (laThay() || request.resource.data.get('hinh', '') == '')
          && (laThay() || nwAnhKho(request.resource.data.get('anh', '')))
          && (laThay() || !nwCoLink(request.resource.data.chu))
          && (laThay() || get(/databases/$(database)/documents/nwChats/$(id)).data.get('chanBoi', []).removeAll([nwToi()]).size() == 0)
          && (!('traLoi' in request.resource.data) || laThay() || nwTraLoiThat(request.resource.data.traLoi))
          && request.resource.data.luc is number;
`],
  ['11 chat lớp: học sinh không đặt tên giả thầy',
    String.raw`        && request.resource.data.name.size() <= 60
        && request.resource.data.role in ['hs','gv']
`,
    String.raw`        && request.resource.data.name.size() <= 60
        && request.resource.data.role in ['hs','gv']
        // (02/10/2026, web v1.225.0) HOC SINH khong dat ten gia thay (do that: 4.738 tin HS, 0 ten bi chan oan).
        && (request.resource.data.role != 'hs'
            || !request.resource.data.name.lower().matches('.*(th[aầâ]y|andrew|gi[aá]o vi[eê]n|admin|qu[aả]n tr[iị]).*'))
`],
];
const VA_ST = [
  ['12 kho ảnh nw/: bỏ SVG',
    String.raw`        && request.resource.contentType.matches('image/.*');
`,
    String.raw`        && request.resource.contentType.matches('image/(jpeg|png|webp)');   // (02/10/2026) bo SVG (co the chua ma chay) - do that: 161/161 anh la JPEG
`],
];
const ST_TEN = 'firebase.storage/aword-70dae.firebasestorage.app';
function thayMot(s, cu, moi, ten) {
  const n = s.split(cu).length - 1;
  if (n !== 1) throw new Error('CHOT DUNG [' + ten + ']: thấy ' + n + ' chỗ (cần đúng 1)');
  return s.replace(cu, () => moi);
}
function ghep(cu, ds, dauHieu) {
  if (cu.includes(dauHieu)) throw new Error('CHOT DUNG: luật ĐÃ có bản vá (' + dauHieu + ') — không đăng lại');
  return ds.reduce((s, [ten, a, b]) => thayMot(s, a, b, ten), cu);
}
function soDong(cu, moi) {
  const a = cu.split('\n'), b = moi.split('\n');
  const dem = (ds) => { const m = new Map(); ds.forEach((x) => m.set(x, (m.get(x) || 0) + 1)); return m; };
  const ma = dem(a), mb = dem(b), them = [], bot = [];
  mb.forEach((n, k) => { const d = n - (ma.get(k) || 0); for (let i = 0; i < d; i++) them.push(k); });
  ma.forEach((n, k) => { const d = n - (mb.get(k) || 0); for (let i = 0; i < d; i++) bot.push(k); });
  return { them, bot };
}


// ───────── HTTP ─────────
function goi(url, opt) {
  const o = opt || {};
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = Object.assign({}, o.headers || {});
    let body = null;
    if (o.json !== undefined) { body = JSON.stringify(o.json); headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(body); }
    else if (o.form !== undefined) { body = o.form; headers['Content-Type'] = 'application/x-www-form-urlencoded'; headers['Content-Length'] = Buffer.byteLength(body); }
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: o.method || 'GET', headers }, (res) => {
      let d = ''; res.setEncoding('utf8'); res.on('data', (c) => { d += c; });
      res.on('end', () => { let j = null; try { j = d ? JSON.parse(d) : null; } catch (_) { j = { _raw: d.slice(0, 300) }; } resolve({ status: res.statusCode, json: j }); });
    });
    req.setTimeout(30000, () => req.destroy(new Error('QUA_LAU')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
let _sa = null, _token = null;
function khoa() {
  if (_sa) return _sa;
  const duong = KHOA_UNG_VIEN.find((p) => p && fs.existsSync(p));
  if (!duong) throw new Error('KHOA_THIEU_FILE — chép khoá về máy bằng D:\\APP AND DATA\\_KHOA\\CAI KHOA FIREBASE.bat');
  _sa = JSON.parse(fs.readFileSync(duong, 'utf8').replace(/^\uFEFF/, ''));
  return _sa;
}
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function kyJwt(payload) {
  const sa = khoa();
  const phan = b64u({ alg: 'RS256', typ: 'JWT' }) + '.' + b64u(payload);
  return phan + '.' + crypto.createSign('RSA-SHA256').update(phan).sign(sa.private_key).toString('base64url');
}
async function tokenQuanTri() {
  if (_token) return _token;
  const sa = khoa();
  const now = Math.floor(Date.now() / 1000);
  const jwt = kyJwt({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const r = await goi('https://oauth2.googleapis.com/token', { method: 'POST', form: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt) });
  if (r.status !== 200 || !r.json || !r.json.access_token) throw new Error('KHONG_XIN_DUOC_TOKEN_' + r.status);
  _token = r.json.access_token;
  return _token;
}
async function H() { return { Authorization: 'Bearer ' + await tokenQuanTri() }; }
async function docRelease(ten) {
  const r = await goi(`${API}/projects/${PROJECT}/releases/${ten}`, { headers: await H() });
  if (r.status !== 200) throw new Error('RELEASE_' + ten + '_' + r.status + ' ' + JSON.stringify(r.json));
  const rs = await goi(`${API}/${r.json.rulesetName}`, { headers: await H() });
  if (rs.status !== 200) throw new Error('RULESET_' + rs.status);
  return { rulesetName: r.json.rulesetName, source: rs.json.source.files.map((f) => f.content).join('\n'), fileName: rs.json.source.files[0].name };
}
async function taoRuleset(source, fileName) {
  const r = await goi(`${API}/projects/${PROJECT}/rulesets`, { method: 'POST', headers: await H(), json: { source: { files: [{ name: fileName, content: source }] } } });
  if (r.status !== 200) throw new Error('TAO_RULESET_' + r.status + ' ' + JSON.stringify(r.json));
  return r.json.name;
}
async function datRelease(ten, rulesetName) {
  const name = `projects/${PROJECT}/releases/${ten}`;
  const r = await goi(`${API}/${name}`, { method: 'PATCH', headers: await H(), json: { release: { name, rulesetName }, updateMask: 'rulesetName' } });
  if (r.status !== 200) throw new Error('DAT_RELEASE_' + ten + '_' + r.status + ' ' + JSON.stringify(r.json));
  return r.json;
}
function ghiTaiLieu(ten, noiDung) {
  const tm = TAI_LIEU_UNG_VIEN.find((p) => fs.existsSync(path.dirname(p))) || TAI_LIEU_UNG_VIEN[0];
  try { fs.mkdirSync(tm, { recursive: true }); fs.writeFileSync(path.join(tm, ten), noiDung, 'utf8'); console.log('  đã ghi', path.join(tm, ten)); } catch (e) { console.log('  (không ghi được tài liệu:', e.message, ')'); }
}
async function xoaTaiLieu(paths) {
  if (!paths.length) return 0;
  const r = await goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit`, { method: 'POST', headers: await H(), json: { writes: paths.map((p) => ({ delete: DB + '/documents/' + p })) } });
  if (r.status !== 200) throw new Error('XOA_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  return r.json.writeResults.length;
}

// ───────── tài khoản thử (khoá quản trị, REST Identity Toolkit) — em ZTEST + "thầy thử" bằng custom token claim thay ─────────
function emailTuMa(ma) { return crypto.createHash('sha256').update(ma).digest('hex').slice(0, 24) + DUOI_EMAIL; }
async function taoTkThu(uid, ma, claims) {
  const mk = 'ztest-' + crypto.randomBytes(9).toString('base64url');
  await goi(`${IDT}/projects/${PROJECT}/accounts:delete`, { method: 'POST', headers: await H(), json: { localId: uid } });
  const r = await goi(`${IDT}/projects/${PROJECT}/accounts`, { method: 'POST', headers: await H(), json: { localId: uid, email: emailTuMa(ma), password: mk } });
  if (r.status !== 200) throw new Error('TAO_TK_THU_' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  const c = await goi(`${IDT}/projects/${PROJECT}/accounts:update`, { method: 'POST', headers: await H(), json: { localId: uid, customAttributes: JSON.stringify(claims) } });
  if (c.status !== 200) throw new Error('CLAIMS_TK_THU_' + c.status);
  const s = await goi(`${IDT}/accounts:signInWithPassword?key=${API_KEY}`, { method: 'POST', json: { email: emailTuMa(ma), password: mk, returnSecureToken: true } });
  if (s.status !== 200) throw new Error('DANG_NHAP_TK_THU_' + s.status + ' ' + JSON.stringify(s.json).slice(0, 200));
  return s.json.idToken;
}
async function xoaTkThu(uid) { await goi(`${IDT}/projects/${PROJECT}/accounts:delete`, { method: 'POST', headers: await H(), json: { localId: uid } }); }
// "thầy thử": custom token uid ztest_thay + claim {thay:true} — đúng đường app myLesson ký cho dashboard (thay-token.js).
async function tokenThayThu() {
  const sa = khoa();
  const now = Math.floor(Date.now() / 1000);
  const ct = kyJwt({ iss: sa.client_email, sub: sa.client_email, aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', iat: now, exp: now + 3600, uid: 'ztest_thay', claims: { thay: true } });
  const s = await goi(`${IDT}/accounts:signInWithCustomToken?key=${API_KEY}`, { method: 'POST', json: { token: ct, returnSecureToken: true } });
  if (s.status !== 200) throw new Error('DANG_NHAP_THAY_THU_' + s.status + ' ' + JSON.stringify(s.json).slice(0, 200));
  return s.json.idToken;
}



// ───────── KIỂM (REST thật: 4 tài khoản HS thử ZTEST + thầy thử; dọn sạch cuối) ─────────
function goiTho(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method, headers: Object.assign({ 'Content-Length': Buffer.byteLength(body || '') }, headers) }, (res) => {
      let d = ''; res.on('data', (c) => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject); if (body) req.write(body); req.end();
  });
}
async function kiem() {
  const k = '?key=' + encodeURIComponent(API_KEY);
  let hong = false;
  const ok = (t, st, can) => { const dk = st === can; console.log((dk ? '  ✓ ' : '  ✗ ') + t + (dk ? '' : '  → THỰC TẾ ' + st)); if (!dk) hong = true; };
  const S = (v) => ({ stringValue: v }), I = (v) => ({ integerValue: String(v) }), B = (v) => ({ booleanValue: v });
  const M = (o) => ({ mapValue: { fields: o } }), A = (ds) => ({ arrayValue: { values: ds } }), N = { nullValue: null };
  const H2 = (t) => t ? { Authorization: 'Bearer ' + t } : {};
  const UA = 'hs_ztestnw1', UB = 'hs_ztestnw2', UC = 'hs_ztestnw3', UD = 'hs_ztestnw4';
  const TA = 'ZTEST NW MOT', TB = 'ZTEST NW HAI', TC = 'ZTEST NW BA', TD = 'ZTEST NW BON';
  const KHO = 'https://firebasestorage.googleapis.com/v0/b/aword-70dae.firebasestorage.app/o/nw%2F' + UA + '%2Favatar_ztest.jpg?alt=media&token=0a1b2c3d-1111-2222-3333-444455556666';
  const LA = 'https://anh-doc-hai.example/x.jpg';
  const PHONG = 'nwChats/' + UA + '__' + UB, nay = Date.now(), rac = [];
  const qt = async (p, fields) => { const r = await goi(`${FS_GOC}/${p}`, { method: 'PATCH', headers: await H(), json: { fields } }); if (r.status !== 200) throw new Error('ADMIN ' + p + ' ' + r.status); rac.push(p); };
  const qtSua = async (p, fields) => { const r = await goi(`${FS_GOC}/${p}?` + Object.keys(fields).map((x) => 'updateMask.fieldPaths=' + x).join('&'), { method: 'PATCH', headers: await H(), json: { fields } }); if (r.status !== 200) throw new Error('ADMIN SUA ' + p + ' ' + r.status); };
  let dem = 0;
  const tao = async (tok, p, fields) => { const r = await goi(`${FS_GOC}/${p}${k}`, { method: 'PATCH', headers: H2(tok), json: { fields } }); if (r.status === 200) rac.push(p); return r.status; };
  const sua = async (tok, p, fields) => goi(`${FS_GOC}/${p}${k}&` + Object.keys(fields).map((x) => 'updateMask.fieldPaths=' + x).join('&'), { method: 'PATCH', headers: H2(tok), json: { fields } }).then((r) => r.status);
  const tin = (uid, ten, extra) => Object.assign({ uid: S(uid), ten: S(ten), anh: S(''), chu: S('xin chào'), hinh: S(''), luc: I(nay) }, extra || {});
  const tv1 = (uid, ten, anh, vai) => M({ uid: S(uid), ten: S(ten), anh: S(anh || ''), lop: S('ZTEST'), vaiTro: S(vai || 'hs'), cacLop: A([S('ZTEST')]) });
  const rel = await docRelease('cloud.firestore');
  console.log('luật đang chạy:', rel.rulesetName);
  try {
    const tkA = await taoTkThu(UA, 'ZTESTNW1', { hs: true, ma: 'ZTESTNW1', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkB = await taoTkThu(UB, 'ZTESTNW2', { hs: true, ma: 'ZTESTNW2', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    await taoTkThu(UC, 'ZTESTNW3', { hs: true, ma: 'ZTESTNW3', lop: 'ZKHAC', lops: 'ZKHAC', msId: 0 });
    await taoTkThu(UD, 'ZTESTNW4', { hs: true, ma: 'ZTESTNW4', lop: 'ZTEST', lops: 'ZTEST', msId: 0 });
    const tkT = await tokenThayThu();
    const hoSo = (ten, lop) => ({ ten: S(ten), vaiTro: S('hs'), cacLop: A([S(lop)]), anh: S(KHO), bia: S(''), gioiThieu: S(''), khoa: B(false) });
    await qt('nwUsers/' + UA, hoSo(TA, 'ZTEST')); await qt('nwUsers/' + UB, hoSo(TB, 'ZTEST'));
    await qt('nwUsers/' + UC, hoSo(TC, 'ZKHAC')); await qt('nwUsers/' + UD, hoSo(TD, 'ZTEST'));
    await qt(PHONG, { loai: S('rieng'), ten: S(''), thanhVien: A([S(UA), S(UB)]), tv: M({}), taoBoi: S(UA), luc: I(nay), capNhat: I(nay), docLuc: M({}), tinCuoi: N });
    await new Promise((r) => setTimeout(r, 1500));
    const p = () => PHONG + '/tin/z' + (++dem);

    console.log('— ĐƯỜNG THẬT VẪN CHẠY (phải 200) —');
    const pB = p(); ok('B gửi tin thường', await tao(tkB, pB, tin(UB, TB, { chu: S('Bạn ơi cho mình mượn vở nha, mai trả nhé') })), 200);
    ok('A gửi tin kèm ảnh đại diện kho nw/', await tao(tkA, p(), tin(UA, TA, { anh: S(KHO) })), 200);
    ok('A gửi sticker', await tao(tkA, p(), tin(UA, TA, { chu: S('[Sticker]'), sticker: S('lop:ga-hello') })), 200);
    ok('A trả lời ĐÚNG tin của B', await tao(tkA, p(), tin(UA, TA, { traLoi: M({ id: S(pB.split('/').pop()), uid: S(UB), ten: S(TB), chu: S('Bạn ơi cho mình mượn vở nha, mai trả nhé'), hinh: S('') }) })), 200);
    ok('A ghi tin cuối đúng tên mình', await sua(tkA, PHONG, { tinCuoi: M({ chu: S('xin chào'), hinh: B(false), uid: S(UA), ten: S(TA), luc: I(nay) }), capNhat: I(nay) }), 200);
    ok('A đánh dấu đã đọc', await sua(tkA, PHONG, { docLuc: M({ [UA]: I(nay) }) }), 200);
    const pA = p(); await tao(tkA, pA, tin(UA, TA, { chu: S('sẽ thu hồi') }));
    const w = [{ update: { name: DB + '/documents/' + pA.replace('/tin/', '/thuHoi/'), fields: { uid: S(UA), ten: S(TA), chu: S('sẽ thu hồi'), hinh: S(''), luc: I(nay) } }, currentDocument: { exists: false } },
      { update: { name: DB + '/documents/' + pA, fields: { thuHoi: B(true), chu: S(''), hinh: S(''), cx: M({}) } }, updateMask: { fieldPaths: ['thuHoi', 'chu', 'hinh', 'cx', 'traLoi', 'sticker', 'camXuc'] } }];
    const rTh = await goi(`https://firestore.googleapis.com/v1/${DB}/documents:commit${k}`, { method: 'POST', headers: H2(tkA), json: { writes: w } });
    if (rTh.status === 200) rac.push(pA.replace('/tin/', '/thuHoi/'));
    ok('A thu hồi tin (kèm bản chép cho thầy)', rTh.status, 200);
    ok('A tạo phòng riêng với D đúng khuôn trang', await tao(tkA, 'nwChats/' + UA + '__' + UD, { loai: S('rieng'), ten: S(''), thanhVien: A([S(UA), S(UD)]), tv: M({ [UA]: tv1(UA, TA, KHO), [UD]: tv1(UD, TD, KHO) }), taoBoi: S(UA), luc: I(nay), capNhat: I(nay), tinCuoi: N, docLuc: M({}) }), 200);
    ok('A gửi thông báo nhắc tên cho B cùng lớp', await tao(tkA, 'nwUsers/' + UB + '/thongBao/z1', { loai: S('nhac'), tu: S(UA), tuTen: S(TA), tuAnh: S(KHO), chu: S('nhắc bạn'), link: S('tinnhan.html?phong=' + UA + '__' + UB), luc: I(nay), daDoc: B(false) }), 200);
    ok('A đăng bài lớp ảnh kho nw/', await tao(tkA, 'nwPosts/zpost1', { uid: S(UA), tacGia: M({ uid: S(UA), ten: S(TA), vaiTro: S('hs'), anh: S(KHO) }), chu: S('bài thử'), anh: A([S(KHO)]), pham: S('lop'), lop: S('ZTEST'), luc: I(nay), an: B(false), ghim: B(false), soBinhLuan: I(0), soChiaSe: I(0) }), 200);
    ok('B bình luận (không ảnh)', await tao(tkB, 'nwPosts/zpost1/binhLuan/z1', { uid: S(UB), tacGia: M({ uid: S(UB), ten: S(TB), vaiTro: S('hs'), anh: S(KHO) }), chu: S('hay quá'), anh: S(''), luc: I(nay) }), 200);
    ok('A sửa giới thiệu hồ sơ', await sua(tkA, 'nwUsers/' + UA, { gioiThieu: S('mình thích tiếng Anh'), capNhat: I(nay) }), 200);
    ok('A chat lớp tên thật', await tao(tkA, 'classChat/ZTEST/messages/z1', { name: S(TA), code: S('ZTESTNW1'), role: S('hs'), text: S('chào cả lớp'), createdAt: I(nay), may: S('abcdef12') }), 200);
    await qt('nwChats/ztestnhom', { loai: S('nhom'), ten: S('Nhóm thử'), thanhVien: A([S('ztest_thay'), S(UA), S(UB)]), tv: M({}), taoBoi: S('ztest_thay'), luc: I(nay), capNhat: I(nay), docLuc: M({}) });
    ok('THẦY gửi ảnh + link trong nhóm', await tao(tkT, 'nwChats/ztestnhom/tin/zt1', tin('ztest_thay', 'Thầy Andrew', { hinh: S(LA), chu: S('xem https://andrewclasses.com') })), 200);
    ok('THẦY gửi thông báo cho em lớp khác', await tao(tkT, 'nwUsers/' + UC + '/thongBao/zt1', { loai: S('chung'), tu: S('ztest_thay'), tuTen: S('Thầy Andrew'), tuAnh: S('assets/avatar-tron.jpg'), chu: S('chào em'), link: S('tinnhan.html'), luc: I(nay), daDoc: B(false) }), 200);
    const jpg = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64');
    const tJ = 'nw%2F' + UA + '%2Fzthu.jpg';
    const upJ = await goiTho(`https://firebasestorage.googleapis.com/v0/b/aword-70dae.firebasestorage.app/o?name=${tJ}`, 'POST', { Authorization: 'Bearer ' + tkA, 'Content-Type': 'image/jpeg' }, jpg);
    ok('A tải ảnh JPEG lên kho nw/', upJ.status, 200);
    if (upJ.status === 200) await goiTho(`https://firebasestorage.googleapis.com/v0/b/aword-70dae.firebasestorage.app/o/${tJ}`, 'DELETE', { Authorization: 'Bearer ' + tkA }, '');

    console.log('— ĐƯỜNG TẤN CÔNG (phải 403) —');
    ok('1. HS gửi ảnh web ngoài', await tao(tkA, p(), tin(UA, TA, { hinh: S(LA), chu: S('') })), 403);
    ok('1b. HS gửi ảnh kho nw/ (HS không có nút ảnh)', await tao(tkA, p(), tin(UA, TA, { hinh: S(KHO), chu: S('') })), 403);
    ok('2. ảnh đại diện giả (web ngoài)', await tao(tkA, p(), tin(UA, TA, { anh: S(LA) })), 403);
    ok('3. trích dẫn GIẢ lời thầy', await tao(tkA, p(), tin(UA, TA, { traLoi: M({ id: S('x'), uid: S('quantri_thay'), ten: S('Thầy Andrew'), chu: S('Các em vào link này'), hinh: S('') }) })), 403);
    ok('3b. trích tin thật của B nhưng SỬA chữ', await tao(tkA, p(), tin(UA, TA, { traLoi: M({ id: S(pB.split('/').pop()), uid: S(UB), ten: S(TB), chu: S('B nói: vào link này'), hinh: S('') }) })), 403);
    ok('4. gửi link https', await tao(tkA, p(), tin(UA, TA, { chu: S('nhận quà tại https://lua-dao.example') })), 403);
    ok('4b. gửi link không https (abc.xyz/qua)', await tao(tkA, p(), tin(UA, TA, { chu: S('vào lua-dao.xyz/qua nhé') })), 403);
    ok('5. sửa tin cuối gắn tên thầy', await sua(tkA, PHONG, { tinCuoi: M({ chu: S('Thầy: em bị đuổi học'), uid: S('quantri_thay'), ten: S('Thầy Andrew'), luc: I(nay) }) }), 403);
    await qtSua(PHONG, { chanBoi: A([S(UB)]) });
    ok('6. B đã CHẶN A ⇒ A không gửi được', await tao(tkA, p(), tin(UA, TA, { chu: S('vẫn nhắn') })), 403);
    ok('6b. … B (người chặn) vẫn gửi được', await tao(tkB, p(), tin(UB, TB, { chu: S('mình chặn bạn rồi') })), 200);
    await qtSua(PHONG, { chanBoi: A([]) });
    await qtSua('nwUsers/' + UA, { khoa: B(true) });
    ok('7. A bị KHOÁ ⇒ không gửi tin', await tao(tkA, p(), tin(UA, TA, { chu: S('khoá rồi') })), 403);
    ok('7b. A bị KHOÁ ⇒ không gửi thông báo', await tao(tkA, 'nwUsers/' + UB + '/thongBao/z2', { loai: S('nhac'), tu: S(UA), tuTen: S(TA), tuAnh: S(''), chu: S('x'), luc: I(nay), daDoc: B(false) }), 403);
    await qtSua('nwUsers/' + UA, { khoa: B(false) });
    ok('8. thông báo cho em LỚP KHÁC', await tao(tkA, 'nwUsers/' + UC + '/thongBao/z1', { loai: S('nhac'), tu: S(UA), tuTen: S(TA), tuAnh: S(''), chu: S('Bạn có quà'), link: S('tinnhan.html'), luc: I(nay), daDoc: B(false) }), 403);
    ok('8b. thông báo cùng lớp, ảnh người gửi web ngoài', await tao(tkA, 'nwUsers/' + UB + '/thongBao/z3', { loai: S('nhac'), tu: S(UA), tuTen: S(TA), tuAnh: S(LA), chu: S('x'), luc: I(nay), daDoc: B(false) }), 403);
    ok('9. bài đăng ảnh web ngoài', await tao(tkA, 'nwPosts/zpost2', { uid: S(UA), tacGia: M({ uid: S(UA), ten: S(TA), vaiTro: S('hs'), anh: S(KHO) }), chu: S('x'), anh: A([S(KHO), S(LA)]), pham: S('lop'), lop: S('ZTEST'), luc: I(nay), an: B(false), ghim: B(false), soBinhLuan: I(0), soChiaSe: I(0) }), 403);
    ok('9b. sửa bài thêm ảnh web ngoài', await sua(tkA, 'nwPosts/zpost1', { anh: A([S(LA)]) }), 403);
    ok('9c. bình luận ảnh web ngoài', await tao(tkB, 'nwPosts/zpost1/binhLuan/z2', { uid: S(UB), tacGia: M({ uid: S(UB), ten: S(TB), vaiTro: S('hs'), anh: S(KHO) }), chu: S('x'), anh: S(LA), luc: I(nay) }), 403);
    ok('10. ảnh bìa web ngoài', await sua(tkA, 'nwUsers/' + UA, { bia: S(LA) }), 403);
    ok('11. chat lớp tên "Thầy Andrew"', await tao(tkA, 'classChat/ZTEST/messages/z2', { name: S('Thầy Andrew'), code: S('ZTESTNW1'), role: S('hs'), text: S('Lớp nghỉ'), createdAt: I(nay), may: S('abcdef12') }), 403);
    ok('11b. chat lớp tên "THẦY ANDREW" in hoa', await tao(tkA, 'classChat/ZTEST/messages/z3', { name: S('THẦY ANDREW'), code: S('ZTESTNW1'), role: S('hs'), text: S('Lớp nghỉ'), createdAt: I(nay), may: S('abcdef12') }), 403);
    ok('16. tạo phòng tự gắn vai GV (tích thầy)', await tao(tkB, 'nwChats/' + UB + '__' + UD, { loai: S('rieng'), ten: S(''), thanhVien: A([S(UB), S(UD)]), tv: M({ [UB]: tv1(UB, TB, KHO, 'gv'), [UD]: tv1(UD, TD, KHO) }), taoBoi: S(UB), luc: I(nay), capNhat: I(nay), tinCuoi: N, docLuc: M({}) }), 403);
    ok('16b. tạo phòng tự đặt tên "Thầy Andrew"', await tao(tkB, 'nwChats/' + UB + '__' + UD, { loai: S('rieng'), ten: S(''), thanhVien: A([S(UB), S(UD)]), tv: M({ [UB]: tv1(UB, 'Thầy Andrew', KHO), [UD]: tv1(UD, TD, KHO) }), taoBoi: S(UB), luc: I(nay), capNhat: I(nay), tinCuoi: N, docLuc: M({}) }), 403);
    ok('16c. tạo phòng kèm tin cuối bịa', await tao(tkB, 'nwChats/' + UB + '__' + UD, { loai: S('rieng'), ten: S(''), thanhVien: A([S(UB), S(UD)]), tv: M({ [UB]: tv1(UB, TB, KHO), [UD]: tv1(UD, TD, KHO) }), taoBoi: S(UB), luc: I(nay), capNhat: I(nay), tinCuoi: M({ chu: S('Thầy: nghỉ học'), uid: S('quantri_thay'), ten: S('Thầy Andrew'), luc: I(nay) }), docLuc: M({}) }), 403);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const tS = 'nw%2F' + UA + '%2Fzthu.svg';
    const upS = await goiTho(`https://firebasestorage.googleapis.com/v0/b/aword-70dae.firebasestorage.app/o?name=${tS}`, 'POST', { Authorization: 'Bearer ' + tkA, 'Content-Type': 'image/svg+xml' }, svg);
    ok('15. tải SVG có mã chạy', upS.status, 403);
    if (upS.status === 200) await goiTho(`https://firebasestorage.googleapis.com/v0/b/aword-70dae.firebasestorage.app/o/${tS}`, 'DELETE', { Authorization: 'Bearer ' + tkA }, '');
    ok('14. NGƯỜI LẠ gửi tin', await tao(null, p(), tin(UA, TA)), 403);
  } finally {
    console.log('  dọn', await xoaTaiLieu(rac.slice().reverse()), 'tài liệu thử');
    for (const u of [UA, UB, UC, UD, 'ztest_thay']) await xoaTkThu(u);
    console.log('  đã xoá tài khoản thử');
  }
  if (hong) { console.log('\n⚠ Có phép thử trượt. Luật mới cần ~1–10 phút lan hết máy chủ — đợi rồi chạy lại --kiem.'); process.exitCode = 1; }
}

(async () => {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--lui') {
      if (!a[1]) throw new Error('thiếu rulesetName firestore (tuỳ chọn thêm rulesetName storage)');
      console.log('firestore ←', a[1], JSON.stringify(await datRelease('cloud.firestore', a[1])).slice(0, 120));
      if (a[2]) console.log('storage ←', a[2], JSON.stringify(await datRelease(ST_TEN, a[2])).slice(0, 120));
      return;
    }
    if (a.includes('--kiem')) { await kiem(); return; }
    const fsCu = await docRelease('cloud.firestore'), stCu = await docRelease(ST_TEN);
    console.log('cloud.firestore đang chạy:', fsCu.rulesetName, '\nstorage đang chạy:', stCu.rulesetName);
    const fsMoi = ghep(fsCu.source, VA_FS, DAU_HIEU), stMoi = ghep(stCu.source, VA_ST, "image/(jpeg|png|webp)");
    if (a.includes('--xem')) {
      ghiTaiLieu('_luat-thu-chong-noi-dung-doc.rules', fsMoi);
      ghiTaiLieu('_luat-thu-chong-noi-dung-doc-storage.rules', stMoi);
      [[fsCu.source, fsMoi], [stCu.source, stMoi]].forEach(([c, m]) => { const d = soDong(c, m); d.bot.forEach((x) => console.log('   − ' + x)); d.them.forEach((x) => console.log('   + ' + x)); });
      console.log('  ghép thử OK (chưa đăng).');
      return;
    }
    if (a.includes('--dang')) {
      ghiTaiLieu('_luat-truoc-chong-noi-dung-doc.rules', fsCu.source);
      ghiTaiLieu('_luat-truoc-chong-noi-dung-doc-storage.rules', stCu.source);
      const rsF = await taoRuleset(fsMoi, fsCu.fileName || 'firestore.rules');   // tạo cả 2 trước: luật sai cú pháp ⇒ dừng TRƯỚC khi đăng gì
      const rsS = await taoRuleset(stMoi, stCu.fileName || 'storage.rules');
      await datRelease('cloud.firestore', rsF); console.log('ruleset mới firestore:', rsF);
      await datRelease(ST_TEN, rsS); console.log('ruleset mới storage:', rsS);
      console.log('\n✓ ĐÃ ĐĂNG. Đường lùi:\n  node tools/dang-luat-chong-noi-dung-doc.js --lui ' + fsCu.rulesetName + ' ' + stCu.rulesetName);
      console.log('  Đợi ~1 phút rồi: node tools/dang-luat-chong-noi-dung-doc.js --kiem');
      return;
    }
    console.log('Dùng: --xem | --dang | --kiem | --lui <rulesetFirestore> [rulesetStorage]');
  } catch (e) { console.error('LỖI:', e.message); process.exitCode = 1; }
})();
