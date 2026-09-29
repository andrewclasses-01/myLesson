/* ============================================================
   js/khampha.js — bộ dùng chung cho KHÁM PHÁ (v0.9.0, 22/09/2026)
   Tách từ khampha.html để trang Quản lý (quanly.html) dùng chung CÙNG MỘT pop-up thêm/sửa mục,
   không có hai bản form lệch nhau. Bảng loại (LOAI/TEN_LOAI), icon loại, đổi ngày, popMuc.
   popMuc(m, o): m = mục đang sửa (null = thêm) · o.loai = loại mặc định · o.banThu · o.xong(moi, hanhDong)
   với hanhDong = 'them' | 'sua' | 'an' — trang gọi tự cập nhật danh sách của mình rồi vẽ lại.
   Ghi kho nwKhamPha (luật: laThay); ảnh bìa nén 1280px lên Storage `_kp`.
   ============================================================ */
(function () {
  'use strict';
  var $ = NW.$, IC = NW.IC, an = NW.chuAnToan;
  var LOAI = {
    troChoi:    { ten: 'Trò chơi tiếng Anh', mo: 'Chơi game luyện từ, nghe, đọc trên AWord', nut: 'CHƠI', mau: ['#0E7C6E', '#5CC9B6'], ic: '<path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="3"/>' },
    giaiDau:    { ten: 'Giải đấu online', mo: 'Thi đấu với bạn khắp trung tâm, có bảng xếp hạng', nut: 'THAM GIA', mau: ['#E0575B', '#FF9A9C'], ic: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/>' },
    khoaHoc:    { ten: 'Khoá học', mo: 'Các khoá tự học có lộ trình, học đến đâu tính đến đó', nut: 'VÀO HỌC', mau: ['#3E7BFA', '#8BB4FF'], ic: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/>' },
    chuongTrinh:{ ten: 'Chương trình trung tâm', mo: 'Sự kiện, lớp mới, ưu đãi của Andrew Classes', nut: 'XEM', mau: ['#F2A93B', '#FFD27A'], ic: '<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M8 14h3M13 14h3M8 17.5h3"/>' }
  };
  var TEN_LOAI = Object.assign({ thongBao: { ten: 'Thông báo quan trọng', nut: 'MỞ' } }, LOAI);
  function icLoai(k) { return '<svg class="ic" viewBox="0 0 24 24">' + LOAI[k].ic + '</svg>'; }
  function ngayInput(ms) { if (!ms) return ''; var d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function docNgay(s, cuoiNgay) { if (!s) return 0; var d = new Date(s + (cuoiNgay ? 'T23:59:59' : 'T00:00:00')); return isNaN(d) ? 0 : d.getTime(); }
  function popMuc(m, o) {
    o = o || {}; var sua = !!m; m = m || { loai: o.loai || 'troChoi' };
    var anhMoi = null;   // {blob, url}
    var p = NW.popMo({ tieuDe: sua ? 'Sửa mục Khám phá' : 'Thêm mục Khám phá', html:
      '<label class="lbl">Loại</label><select id="tmLoai" class="chon-o">' + Object.keys(TEN_LOAI).map(function (x) { return '<option value="' + x + '"' + (x === m.loai ? ' selected' : '') + '>' + an(TEN_LOAI[x].ten) + '</option>'; }).join('') + '</select>' +
      '<label class="lbl" style="margin-top:12px">Tiêu đề</label><input type="text" id="tmTieu" maxlength="80" value="' + an(m.tieuDe || '') + '" placeholder="VD: Rocket Race — WORDS 3">' +
      '<label class="lbl" style="margin-top:12px">Mô tả</label><textarea id="tmMo" rows="3" maxlength="600">' + an(m.moTa || '') + '</textarea>' +
      '<label class="lbl" style="margin-top:12px">Link (AWord, myLesson, Google Form…) — để trống thì nút chỉ mở pop-up</label><input type="text" id="tmLink" value="' + an(m.link || '') + '" placeholder="https://…">' +
      '<label class="lbl" style="margin-top:12px">Chữ trên nút</label><input type="text" id="tmNut" maxlength="20" value="' + an(m.nut || '') + '" placeholder="' + an((TEN_LOAI[m.loai] || {}).nut || 'XEM') + '">' +
      '<div style="display:flex;gap:10px;margin-top:12px"><div style="flex:1"><label class="lbl">Bắt đầu</label><input type="date" id="tmBd" class="chon-o" value="' + ngayInput(m.batDau) + '"></div>' +
      '<div style="flex:1"><label class="lbl">Kết thúc / hết hạn</label><input type="date" id="tmKt" class="chon-o" value="' + ngayInput(m.ketThuc) + '"></div></div>' +
      '<div id="tmRieng" style="margin-top:12px"></div>' +
      '<label class="lbl" style="margin-top:12px">Ảnh bìa (16:9, tự nén 1280px)</label>' +
      '<div class="tb-them" style="margin-top:0"><span id="tmAnhTen">' + (m.anh ? 'Đang có ảnh — chọn để thay' : 'Chưa có ảnh') + '</span><button type="button" class="xanh" id="tmAnhNut">' + IC.anh + '</button><input type="file" id="tmAnhFile" accept="image/*" hidden></div>' +
      '<div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap"><label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700"><input type="checkbox" id="tmGhim"' + (m.ghim ? ' checked' : '') + ' style="accent-color:var(--accent)"> Ghim lên đầu mục</label>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700">Thứ tự <input type="number" id="tmThuTu" value="' + (m.thuTu || 0) + '" style="width:70px;padding:6px 8px"></label></div>',
      chan: (sua ? '<button class="btn nguy" id="tmAn" type="button">Ẩn mục</button>' : '') + '<button class="btn soft" data-dong type="button">Thôi</button><button class="btn primary" id="tmOk" type="button">' + (sua ? 'Lưu' : 'Đăng') + '</button>' });
    $('[data-dong]', p).onclick = NW.popDong;
    var selLoai = $('#tmLoai', p), rieng = $('#tmRieng', p);
    function veRieng() {
      var k = selLoai.value;
      $('#tmNut', p).placeholder = (TEN_LOAI[k] || {}).nut || 'XEM';
      if (k === 'thongBao') rieng.innerHTML = '<label class="lbl">Mức</label><select id="tmMuc" class="chon-o"><option value="thuong"' + (m.muc !== 'cao' ? ' selected' : '') + '>Thường (vàng)</option><option value="cao"' + (m.muc === 'cao' ? ' selected' : '') + '>Cao (đỏ)</option></select>';
      else if (k === 'giaiDau') rieng.innerHTML = '<label class="lbl">Trạng thái</label><select id="tmTt" class="chon-o">' + [['sap', 'Sắp diễn ra'], ['dang', 'Đang diễn ra'], ['xong', 'Đã kết thúc']].map(function (x) { return '<option value="' + x[0] + '"' + (m.trangThai === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' +
        '<label class="lbl" style="margin-top:12px">Top 3 (mỗi dòng: Tên · Lớp · Điểm)</label><textarea id="tmTop" rows="3" placeholder="MINH ANH · A1C · 980">' + an((m.top || []).map(function (n) { return [n.ten, n.lop, n.diem].filter(function (v) { return v != null && v !== ''; }).join(' · '); }).join('\n')) + '</textarea>';
      else if (k === 'khoaHoc') rieng.innerHTML = '<div style="display:flex;gap:10px"><div style="flex:1"><label class="lbl">Số bài</label><input type="number" id="tmSoBai" value="' + (m.soBai || '') + '"></div><div style="flex:1"><label class="lbl">Tiến độ % (tạm nhập tay)</label><input type="number" id="tmTienDo" min="0" max="100" value="' + (m.tienDo || '') + '"></div></div>';
      else rieng.innerHTML = '';
    }
    selLoai.onchange = veRieng; veRieng();
    $('#tmAnhNut', p).onclick = function () { $('#tmAnhFile', p).click(); };
    $('#tmAnhFile', p).onchange = async function () {
      var f0 = this.files && this.files[0]; this.value = ''; if (!f0) return;
      try { var blob = await NW.nenAnh(f0, { canhDai: 1280 }); anhMoi = { blob: blob, url: URL.createObjectURL(blob) }; $('#tmAnhTen', p).textContent = 'Đã chọn ảnh mới: ' + f0.name; }
      catch (e) { NW.toast('Không đọc được ảnh.', true); }
    };
    var nutAn = $('#tmAn', p);
    if (nutAn) nutAn.onclick = async function () {
      if (!(await NW.hoi('Ẩn mục này?', 'Mục sẽ không hiện với học sinh nữa (vẫn còn trong kho).', { ok: 'Ẩn', nguy: true }))) return;
      NW.popDong(); if (o.xong) o.xong(Object.assign({}, m, { an: true }), 'an');
      if (o.banThu) { NW.toast('Bàn thử: không ghi thật.'); return; }
      try { var f = await NW.fb(); await f.fs.updateDoc(f.fs.doc(f.db, 'nwKhamPha', m.id), { an: true, capNhat: Date.now() }); NW.toast('Đã ẩn mục.'); }
      catch (e) { NW.toast(NW.chuLoiKho(e), true); }
    };
    $('#tmOk', p).onclick = async function () {
      var k = selLoai.value, tieu = $('#tmTieu', p).value.trim();
      if (!tieu) { NW.toast('Cần tiêu đề.', true); return; }
      var moi = { loai: k, tieuDe: tieu, moTa: $('#tmMo', p).value.trim().slice(0, 600), link: $('#tmLink', p).value.trim().slice(0, 300), nut: $('#tmNut', p).value.trim().slice(0, 20),
        batDau: docNgay($('#tmBd', p).value), ketThuc: docNgay($('#tmKt', p).value, true), ghim: $('#tmGhim', p).checked, thuTu: +$('#tmThuTu', p).value || 0,
        muc: k === 'thongBao' ? ($('#tmMuc', p) ? $('#tmMuc', p).value : 'thuong') : '', trangThai: k === 'giaiDau' ? $('#tmTt', p).value : '',
        top: k === 'giaiDau' ? $('#tmTop', p).value.split('\n').map(function (l) { var c = l.split('·').map(function (x) { return x.trim(); }); return c[0] ? { ten: c[0], lop: c[1] || '', diem: c[2] || '' } : null; }).filter(Boolean).slice(0, 10) : [],
        soBai: k === 'khoaHoc' ? (+$('#tmSoBai', p).value || 0) : 0, tienDo: k === 'khoaHoc' ? (+$('#tmTienDo', p).value || 0) : 0,
        anh: m.anh || '', an: false, capNhat: Date.now() };
      if (!sua) { moi.luc = Date.now(); moi.boi = NW.toi.uid; }
      this.disabled = true;
      if (o.banThu) {
        moi.anh = anhMoi ? anhMoi.url : moi.anh; moi.id = m.id || ('m' + Date.now());
        NW.popDong(); if (o.xong) o.xong(moi, sua ? 'sua' : 'them'); NW.toast('Bàn thử: chỉ hiện trên máy, không ghi thật.'); return;
      }
      try {
        var f = await NW.fb();
        if (anhMoi) moi.anh = await NW.taiAnh(anhMoi.blob, NW.tenAnhMoi('_kp'));
        if (sua) { await f.fs.updateDoc(f.fs.doc(f.db, 'nwKhamPha', m.id), moi); moi.id = m.id; }
        else { var ref = await f.fs.addDoc(f.fs.collection(f.db, 'nwKhamPha'), moi); moi.id = ref.id; }
        NW.popDong(); if (o.xong) o.xong(moi, sua ? 'sua' : 'them'); NW.toast(sua ? 'Đã lưu.' : 'Đã đăng mục mới.');
      } catch (e) { NW.toast(NW.chuLoiKho(e), true); this.disabled = false; }
    };
  }
  NW.KhamPha = { LOAI: LOAI, TEN_LOAI: TEN_LOAI, icLoai: icLoai, ngayInput: ngayInput, docNgay: docNgay, popMuc: popMuc };
})();
