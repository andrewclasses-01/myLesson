/* ============================================================
   sao-khoe.js — THẺ KHOE SAO (24/10/2026, web v1.416.0 — thầy yêu cầu).
   Trong lịch sử sao của một em (pop-up Ví sao + hộp Lịch sử ví, js/sao-dash.js) BẤM ĐÚP một dòng ⇒ thẻ đẹp để thầy CHỤP MÀN HÌNH gửi
   phụ huynh: ảnh tròn của em, số sao cộng/trừ, lý do, ngày, lời nhắn của thầy.
   Mỗi LÝ DO một chủ đề (màu · biểu tượng · nhãn · lời nhắn) — đoán theo từ khoá trong lý do + dấu sao:
     thưởng: thành tích/thi đấu (vàng 🏆) · giúp bạn (hồng 💖) · chăm học/tiến bộ (xanh lá 📚) · khác (tím ✨)
     trừ   : đổi quà (tím 🎁 — vẫn là tin vui) · điều chỉnh/bấm nhầm (xám) · an toàn (cam ⛑️) · nề nếp (vàng cam 📢)
             · bài tập (xanh dương 📝) · đạo đức/trung thực (đỏ 🚫) · khác (đỏ cam ⚠️)
   Thưởng có pháo giấy + lấp lánh; trừ tông dịu, lời nhắn khích lệ (thẻ gửi phụ huynh — không bêu riếu).
   Nút "Chép lời nhắn" chép đoạn chữ gửi kèm qua Zalo. Tiền tố lớp `skh-` (đã kiểm không trùng hộp nào).
   API: SaoKhoe.mo({ ten, lop, av (html avatar), n, viec, ngay 'YYYY-MM-DD', nhom, conLai (ví đang có, tuỳ chọn) })
   ============================================================ */
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var khongDau = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); };
  var SAO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>';

  // chủ đề: tu = từ khoá (không dấu) · c1/c2 = màu dải đầu · nhat = nền nhạt · ic · nhan · loi (lời thầy)
  var CHU_DE = {
    thi: { tu: ['cuoc thi', 'thi ', 'giai', 'vo dich', 'chien thang', 'thang cuoc', 'cuoc dua', 'dua ', 'ket qua cao', 'diem 10', 'diem cao', 'diem tuyet doi', 'hang nhat', 'hang nhi', 'hang ba', 'top ', 'xuat sac', 'huy chuong', 'ky luc', 'thanh tich'],
      c1: '#FFD43B', c2: '#F08C00', nhat: '#FFF8E1', dam: '#B35C00', ic: '🏆', nhan: 'VINH DANH', loi: 'Chúc mừng em với thành tích thật xuất sắc! Thầy Andrew rất tự hào về em.' },
    giup: { tu: ['giup', 'chia se', 'tot bung', 'nhuong', 'ho tro', 'doan ket', 'quan tam', 'an ui', 'nhat duoc', 'tra lai'],
      c1: '#FF9EC4', c2: '#E64980', nhat: '#FFF0F6', dam: '#A61E4D', ic: '💖', nhan: 'HÀNH ĐỘNG ĐẸP', loi: 'Cảm ơn em vì tấm lòng tốt đẹp. Thầy Andrew trân trọng và khen ngợi em!' },
    hoc: { tu: ['phat bieu', 'tien bo', 'nop bai', 'cham', 'sieng', 'hoc tot', 'bai tap', 'doc ', 'hang hai', 'tich cuc', 'dung gio', 'som', 'thuoc bai', 'chuan bi', 'tap trung', 'gioi', 'hoan thanh', 'chuyen can', 'di hoc deu', 'lam bai day du'],
      c1: '#63E6BE', c2: '#0CA678', nhat: '#E6FCF5', dam: '#087F5B', ic: '📚', nhan: 'KHEN THƯỞNG', loi: 'Em đã rất cố gắng! Thầy Andrew khen ngợi và mong em tiếp tục phát huy.' },
    tot: { tu: [], c1: '#B197FC', c2: '#7048E8', nhat: '#F3F0FF', dam: '#5F3DC4', ic: '✨', nhan: 'KHEN THƯỞNG', loi: 'Thầy Andrew ghi nhận và khen ngợi em. Cố lên nhé, em làm tốt lắm!' },
    qua: { tu: ['doi qua', 'qua tang', 'nhan qua', 'mua qua', 'dung sao'],   // ⛔ không có 'doi ' trần: 'đội mũ' bỏ dấu cũng là 'doi'
      c1: '#DA77F2', c2: '#9C36B5', nhat: '#F8F0FC', dam: '#862E9C', ic: '🎁', nhan: 'ĐỔI QUÀ', loi: 'Em đã dùng những ngôi sao chăm chỉ tích luỹ để đổi quà. Chúc mừng em!', vui: true },
    sua: { tu: ['bam nham', 'nham', 'sua ', 'dieu chinh', 'ghi nham'],
      c1: '#ADB5BD', c2: '#6C757D', nhat: '#F1F3F5', dam: '#495057', ic: '🛠️', nhan: 'ĐIỀU CHỈNH', loi: 'Thầy Andrew điều chỉnh lại số sao do ghi nhầm trước đó.' },
    antoan: { tu: ['mu bao hiem', 'an toan', 'giao thong', 'nguy hiem', 'leo treo', 'chay nhay'],
      c1: '#FFC078', c2: '#F76707', nhat: '#FFF4E6', dam: '#C2410C', ic: '⛑️', nhan: 'NHẮC NHỞ AN TOÀN', loi: 'An toàn là trên hết! Thầy Andrew mong em ghi nhớ và thực hiện thật nghiêm túc nhé.' },
    nenep: { tu: ['noi leo', 'noi chuyen', 'trat tu', 'noi quy', 'di muon', 'den muon', 'tre gio', 'an trong gio', 'dien thoai', 'mat tap trung', 'dua nghich', 'nghich', 'on ao', 'lam on', 'vang khong phep', 'khong nghe loi'],
      c1: '#FFE066', c2: '#F59F00', nhat: '#FFF9DB', dam: '#A65E00', ic: '📢', nhan: 'NHẮC NHỞ NỀ NẾP', loi: 'Thầy Andrew mong em giữ nề nếp lớp học tốt hơn. Thầy tin em làm được!' },
    baitap: { tu: ['thieu bai', 'chua lam', 'khong lam', 'quen bai', 'quen vo', 'quen sach', 'bai tap', 'chua hoc', 'khong hoc', 'nop muon', 'chep bai'],
      c1: '#91A7FF', c2: '#3B5BDB', nhat: '#EDF2FF', dam: '#364FC7', ic: '📝', nhan: 'CẦN CỐ GẮNG', loi: 'Thầy Andrew tin lần sau em sẽ chuẩn bị bài đầy đủ hơn. Cố lên em nhé!' },
    daoduc: { tu: ['noi bay', 'trung thuc', 'gian lan', 'danh nhau', 'vo le', 'xuc pham', 'an cap', 'lay do', 'noi doi', 'quay cop', 'bat nat', 'che gieu'],
      c1: '#FFA8A8', c2: '#E03131', nhat: '#FFF5F5', dam: '#C92A2A', ic: '🚫', nhan: 'VI PHẠM', loi: 'Thầy Andrew mong em nhận ra lỗi và sửa đổi. Thầy luôn tin em sẽ tốt hơn mỗi ngày.' },
    nhacnho: { tu: [], c1: '#FFA94D', c2: '#E8590C', nhat: '#FFF4E6', dam: '#C2410C', ic: '⚠️', nhan: 'NHẮC NHỞ', loi: 'Thầy Andrew mong em rút kinh nghiệm và cố gắng hơn. Thầy tin em!' }
  };
  var THU_TU_CONG = ['thi', 'giup', 'hoc'], THU_TU_TRU = ['antoan', 'daoduc', 'qua', 'sua', 'baitap', 'nenep'];
  function chonChuDe(viec, n) {
    var k = ' ' + khongDau(viec).replace(/[^a-z0-9]+/g, ' ') + ' ';
    var ds = n >= 0 ? THU_TU_CONG : THU_TU_TRU, kq = n >= 0 ? 'tot' : 'nhacnho';
    ds.some(function (ma) { if (CHU_DE[ma].tu.some(function (t) { return k.indexOf(' ' + t) >= 0; })) { kq = ma; return true; } return false; });
    return kq;
  }
  var THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function chuNgay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if (!m) return '';
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return THU[d.getDay()] + ', ' + m[3] + '/' + m[2] + '/' + m[1];
  }
  function phaoGiay(cd) {   // pháo giấy dải đầu (thưởng) — vị trí/màu ngẫu nhiên nhưng nằm trong dải
    var mau = ['#fff', '#FFF3BF', cd.c1, '#FFFFFFAA', '#FFE3E3', '#D3F9D8'], h = '';
    for (var i = 0; i < 26; i++) {
      var x = Math.round(Math.random() * 100), y = Math.round(Math.random() * 92), r = Math.round(Math.random() * 180), tron = i % 3 === 0;
      h += '<i class="skh-pg' + (tron ? ' tron' : '') + '" style="left:' + x + '%;top:' + y + '%;background:' + mau[i % mau.length] + ';transform:rotate(' + r + 'deg);animation-delay:' + (Math.random() * 1.6).toFixed(2) + 's"></i>';
    }
    return h;
  }

  var _mo = null;
  function dong() {
    if (!_mo) return;
    var m = _mo; _mo = null;
    window.removeEventListener('keydown', m.phim, true);
    m.nen.classList.remove('mo');
    setTimeout(function () { m.nen.remove(); }, 180);
  }
  function mo(x) {
    dong();
    x = x || {};
    var n = Number(x.n) || 0, ma = chonChuDe(x.viec, n), cd = CHU_DE[ma], cong = n >= 0;
    var vui = cong || cd.vui;
    var nen = document.createElement('div');
    nen.className = 'skh-nen' + (vui ? ' vui' : ' tru');
    nen.style.cssText = '--c1:' + cd.c1 + ';--c2:' + cd.c2 + ';--nhat:' + cd.nhat + ';--dam:' + cd.dam;
    var soChu = (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
    var duoiSo = cong ? 'sao thưởng' : ma === 'qua' ? 'sao đã dùng' : 'sao bị trừ';
    nen.innerHTML =
      '<div class="skh-khung" role="dialog" aria-modal="true" aria-label="Thẻ sao của ' + esc(x.ten) + '">' +
        '<div class="skh-the">' +
          '<div class="skh-dau">' + (vui ? phaoGiay(cd) : '<i class="skh-vong v1"></i><i class="skh-vong v2"></i>') +
            '<span class="skh-ic-nen" aria-hidden="true">' + cd.ic + '</span>' +
            '<div class="skh-brand">ANDREW CLASSES</div>' +
            '<div class="skh-nhan"><span>' + cd.ic + '</span>' + esc(cd.nhan) + '</div>' +
          '</div>' +
          '<div class="skh-giua">' +
            '<div class="skh-av-khung">' + (vui ? '<i class="skh-lap l1">✦</i><i class="skh-lap l2">✦</i><i class="skh-lap l3">✧</i>' : '') +
              '<div class="skh-av-vong">' + (x.av || '') + '</div>' +
              '<div class="skh-so">' + SAO + '<b>' + soChu + '</b></div>' +
            '</div>' +
            '<h2 class="skh-ten">' + esc(x.ten || '') + '</h2>' +
            (x.lop ? '<div class="skh-lop">' + esc(x.lop) + '</div>' : '') +
            '<div class="skh-ly"><small>' + (cong ? 'Được thưởng ' : ma === 'qua' ? 'Đã dùng ' : 'Bị trừ ') + Math.abs(n) + ' ' + duoiSo.split(' ')[0] + ' vì</small>' + esc(x.viec || '') + '</div>' +
            '<p class="skh-loi">' + esc(cd.loi) + '</p>' +
          '</div>' +
          '<div class="skh-chan"><span>📅 ' + esc(chuNgay(x.ngay)) + '</span>' + (x.conLai != null ? '<span>' + SAO + 'Ví sao: <b>' + esc(x.conLai) + '</b></span>' : '') + '</div>' +
          '<div class="skh-ky">Thầy Andrew</div>' +
        '</div>' +
        '<div class="skh-nut"><button type="button" data-chep>📋 Chép lời nhắn</button><button type="button" data-dong>Đóng</button></div>' +
      '</div>';
    document.body.appendChild(nen);
    if (window.avKhoDe) { try { window.avKhoDe(nen); } catch (e) { } }   // ảnh thật trong kho (dashboard)
    requestAnimationFrame(function () { nen.classList.add('mo'); });
    var m = _mo = { nen: nen, phim: function (e) { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); dong(); } } };
    window.addEventListener('keydown', m.phim, true);   // pha bắt ở window ⇒ chạy TRƯỚC Esc của pop-up Ví sao bên dưới
    nen.addEventListener('click', function (e) { if (e.target === nen || e.target.closest('[data-dong]')) dong(); });
    nen.querySelector('[data-chep]').onclick = function () {
      var chu = '⭐ ANDREW CLASSES — ' + cd.nhan + '\n' + 'Em ' + (x.ten || '') + (x.lop ? ' (' + x.lop + ')' : '') + ' ' +
        (cong ? 'được thưởng ' : ma === 'qua' ? 'đã dùng ' : 'bị trừ ') + Math.abs(n) + ' sao ngày ' + chuNgay(x.ngay) + '.\n' +
        'Lý do: ' + (x.viec || '') + '\n' + cd.loi;
      var b = this, xong = function () { b.textContent = '✓ Đã chép'; setTimeout(function () { b.textContent = '📋 Chép lời nhắn'; }, 1800); };
      var cu = function () { var o = document.createElement('textarea'); o.value = chu; o.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(o); o.select(); try { document.execCommand('copy'); } catch (e) { } o.remove(); xong(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(chu).then(xong, cu); else cu();
    };
  }
  window.SaoKhoe = { mo: mo, chonChuDe: chonChuDe };
})();
