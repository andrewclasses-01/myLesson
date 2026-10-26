// 🏆 25/10/2026 — GỬI ẢNH VINH DANH GIAO HỮU A SHOW SPEED MÙA 1 vào CHAT NHÓM từng lớp (thầy duyệt mẫu
//    D:\OTHERS\CLAUDE\THONG BAO GIAO HUU MUA 1 - thiet ke\anh-lop-v1). Mỗi lớp 1 ảnh PNG (chỉ các em ≥ 10 trận của lớp đó).
//
//   node tools/gui-anh-vinh-danh-gh1.js --xem <thư mục PNG>   (ghép tên lớp → mã lớp + in tin thầy mẫu, KHÔNG ghi gì)
//   node tools/gui-anh-vinh-danh-gh1.js --gui <thư mục PNG> [tiền tố tên ảnh, mặc định vinhdanh-gh1]   (tải ảnh lên Storage classChat/<mã lớp>/… + ghi tin vào classChat/<mã lớp>/messages)
//   node tools/gui-anh-vinh-danh-gh1.js --luu-mau <thư mục PNG> (lưu MẪU vào hộp Thông báo dashboard: thongBao/anhLopGh1mua1 kiểu 'anhLop',
//        tt 'xong' ⇒ học sinh không đọc được; ảnh = URL các tin đã gửi ở bước --gui. Hộp vẽ ở js/tb-ql.js veCtAnh)
//
// Tin đi đúng khuôn tin ảnh của thầy (js/chat.js guiAnh/gui, v1.206.0): role 'gv', text = '[Hình ảnh]' (chuTin ẩn chữ này khi có hinh),
// hinh = URL tải về firebasestorage có token. File PNG đặt tên <tên lớp>.png (đúng tenGoc trong lessonWeb/lop).
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const M = require('module');
const GOC = path.join(__dirname, 'dang-luat-gioi-han-choi.js');
let src = fs.readFileSync(GOC, 'utf8');
src = src.slice(0, src.lastIndexOf('(async () => {')) + '\nmodule.exports = { tokenQuanTri, goi, FS_GOC, DB };';
const mod = new M(GOC); mod.filename = GOC; mod.paths = M._nodeModulePaths(__dirname); mod._compile(src, GOC);
const { tokenQuanTri, goi, FS_GOC, DB } = mod.exports;

const BUCKET = 'aword-70dae.firebasestorage.app';
const CHU_ANH = '[Hình ảnh]';

function giaTri(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(giaTri);
  if ('mapValue' in v) { const o = {}; Object.entries(v.mapValue.fields || {}).forEach(([k, x]) => { o[k] = giaTri(x); }); return o; }
  return null;
}
function thanhGT(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === 'string') return { stringValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(thanhGT) } };
  const f = {}; Object.keys(x).forEach((k) => { f[k] = thanhGT(x[k]); }); return { mapValue: { fields: f } };
}
async function doc1(duong) {
  const tk = await tokenQuanTri(), r = await goi(FS_GOC + '/' + duong, { headers: { Authorization: 'Bearer ' + tk } });
  if (r.status !== 200) throw new Error(duong + ' HTTP ' + r.status);
  return giaTri({ mapValue: { fields: r.json.fields || {} } });
}
async function tinThayMoiNhat(maLop) {   // để chép đúng name/code/may thầy đang dùng
  const tk = await tokenQuanTri();
  const r = await goi(FS_GOC + '/classChat/' + encodeURIComponent(maLop) + ':runQuery', { method: 'POST', headers: { Authorization: 'Bearer ' + tk }, json: { structuredQuery: {
    from: [{ collectionId: 'messages' }], orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }], limit: 300 } } });
  const d = (r.json || []).find((x) => x.document && x.document.fields.role && x.document.fields.role.stringValue === 'gv');
  return d ? giaTri({ mapValue: { fields: d.document.fields } }) : null;
}
function taiLen(duong, buf, token) {   // GCS multipart, gắn firebaseStorageDownloadTokens ⇒ URL tải về kiểu Firebase
  return tokenQuanTri().then((tk) => new Promise((res, rej) => {
    const ranh = 'ranh' + crypto.randomBytes(8).toString('hex');
    const meta = JSON.stringify({ name: duong, contentType: 'image/png', cacheControl: 'public,max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } });
    const than = Buffer.concat([Buffer.from('--' + ranh + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + ranh + '\r\nContent-Type: image/png\r\n\r\n'), buf, Buffer.from('\r\n--' + ranh + '--')]);
    const rq = https.request({ hostname: 'storage.googleapis.com', path: '/upload/storage/v1/b/' + BUCKET + '/o?uploadType=multipart', method: 'POST',
      headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'multipart/related; boundary=' + ranh, 'Content-Length': than.length } }, (r) => {
      let d = ''; r.on('data', (c) => { d += c; }); r.on('end', () => (r.statusCode === 200 ? res() : rej(new Error('upload HTTP ' + r.statusCode + ' ' + d.slice(0, 200)))));
    });
    rq.on('error', rej); rq.end(than);
  }));
}

(async () => {
  const che = process.argv[2], thuMuc = process.argv[3];
  if (!/^--(xem|gui|luu-mau)$/.test(che || '') || !thuMuc) { console.log('Dùng: --xem|--gui <thư mục PNG>'); process.exit(1); }
  const lw = await doc1('lessonWeb/lop'), x = JSON.parse((lw && lw.json) || '{}');
  const lop = {}; (x.lop || []).concat(x.khoa || []).forEach((l) => { const t = String(l.tenGoc || l.maLop); if (!lop[t]) lop[t] = String(l.maLop || ''); });
  const tep = fs.readdirSync(thuMuc).filter((f) => /\.png$/i.test(f));
  const viec = tep.map((f) => ({ f, ten: f.replace(/\.png$/i, ''), ma: lop[f.replace(/\.png$/i, '')] || '' }));
  viec.forEach((v) => console.log((v.ma ? '  ✓ ' : '  ✗ THIẾU MÃ ') + v.ten + ' → ' + v.ma));
  if (viec.some((v) => !v.ma)) throw new Error('Có lớp không ghép được mã — dừng.');
  let mau = null; for (const v of viec) { mau = await tinThayMoiNhat(v.ma); if (mau) break; }
  console.log('Tin thầy mẫu:', JSON.stringify(mau && { name: mau.name, code: mau.code, role: mau.role, may: mau.may }));
  if (!mau) throw new Error('Không thấy tin thầy mẫu để chép name/code/may.');
  if (che === '--xem') return;
  if (che === '--luu-mau') {
    const tk0 = await tokenQuanTri(), anh = [];
    let luc = 0;
    for (const v of viec) {
      const q = await goi(FS_GOC + '/classChat/' + encodeURIComponent(v.ma) + ':runQuery', { method: 'POST', headers: { Authorization: 'Bearer ' + tk0 }, json: { structuredQuery: {
        from: [{ collectionId: 'messages' }], orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }], limit: 300 } } });
      const d = (q.json || []).map((x) => x.document && giaTri({ mapValue: { fields: x.document.fields } })).find((x) => x && /vinhdanh-gh1-/.test(x.hinh || ''));
      if (!d) throw new Error(v.ten + ': không thấy tin ảnh vinh danh đã gửi');
      anh.push({ lop: v.ten, ma: v.ma, url: d.hinh }); luc = Math.max(luc, d.createdAt || 0);
    }
    const mau = { ten: 'Vinh danh giao hữu A Show Speed · Mùa 1 (ảnh chat lớp)', kieu: 'anhLop', tt: 'xong', tao: Date.now(), dangLuc: luc, anh,
      ghiChu: 'Mỗi lớp một ảnh vinh danh các em ≥ 10 trận giao hữu, gửi vào chat nhóm lớp (25/10/2026). Học sinh đã nhận thưởng ở thông báo tổng kết — ảnh chỉ để chúc mừng.\n\n' +
        '• Bố cục: dải vàng "CHÚC MỪNG CHIẾN BINH A SHOW SPEED - MÙA 1" ở dòng trên cùng → tên lớp to + cúp → thẻ lớn cho em có huy hiệu (top 10 chăm) / đĩa tia chớp (top 10 thắng) → lưới 4 cột các em còn lại → chú thích icon.\n' +
        '• Số SAO là viên vàng to (nổi bật nhất); số trận 🔥 và số thắng ⚡ nhỏ, mờ. Không hiện tổng số trận / tổng số người. Không nhắc em chưa đủ 10 trận.\n' +
        '• Ảnh 1080px, nền xanh A Show Speed, chữ ANDREW CLASSES cuối ảnh.\n\n' +
        'File thiết kế: D:\\OTHERS\\CLAUDE\\THONG BAO GIAO HUU MUA 1 - thiet ke\\anh-lop-v1 (index.html + du-lieu.js; ảnh đã xuất ở thư mục xuat).\n' +
        'Cách gửi: Claude xuất PNG bằng Chrome rồi chạy myLesson Web/tools/gui-anh-vinh-danh-gh1.js.' };
    const r0 = await goi(FS_GOC + '/thongBao/anhLopGh1mua1', { method: 'PATCH', headers: { Authorization: 'Bearer ' + tk0 }, json: { fields: thanhGT(mau).mapValue.fields } });
    if (r0.status !== 200) throw new Error('lưu mẫu HTTP ' + r0.status + ' ' + JSON.stringify(r0.json).slice(0, 200));
    console.log('  💾 đã lưu mẫu thongBao/anhLopGh1mua1 —', anh.length, 'ảnh');
    return;
  }
  const tk = await tokenQuanTri();
  for (const v of viec) {
    const maS = v.ma.replace(/[^0-9A-Za-z_-]/g, '_').slice(0, 40);
    const duong = 'classChat/' + maS + '/' + (process.argv[4] || 'vinhdanh-gh1') + '-' + Date.now().toString(36) + '.png', token = crypto.randomUUID();
    await taiLen(duong, fs.readFileSync(path.join(thuMuc, v.f)), token);
    const hinh = 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/' + encodeURIComponent(duong) + '?alt=media&token=' + token;
    const tin = { may: mau.may || '', name: mau.name, code: mau.code, role: 'gv', text: CHU_ANH, createdAt: Date.now(), hinh };
    const r = await goi(FS_GOC + '/classChat/' + encodeURIComponent(v.ma) + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + tk }, json: { fields: thanhGT(tin).mapValue.fields } });
    if (r.status !== 200) throw new Error(v.ten + ' ghi tin HTTP ' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
    console.log('  📤 ' + v.ten + ' — tin ' + r.json.name.split('/').pop());
  }
})().catch((e) => { console.error('LỖI:', e.message); process.exit(1); });
