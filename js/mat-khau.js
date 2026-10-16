/* ============================================================
   js/mat-khau.js — ⭐ web v1.356.0 (16/10/2026, thầy chốt mẫu v2) LUẬT MẬT KHẨU HỌC SINH — MỘT NƠI DUY NHẤT.
   Dùng ở: màn "Đặt mật khẩu riêng" lần đầu (index.html + js/nw-dangnhap.js) và hộp "Đổi mật khẩu" menu Network (nw/js/thanh.js).
   6 điều kiện (tích ✓ dần khi gõ): ≥ 8 ký tự · không dấu cách · chỉ chữ KHÔNG DẤU, số, ký hiệu · có cả chữ và số
     · không chứa tên / ngày sinh / ID · không phải mật khẩu quá dễ đoán. + hai lần nhập giống nhau.
   Mật khẩu CŨ (đặt trước 16/10, có thể có dấu cách) vẫn đăng nhập bình thường — luật chỉ áp khi ĐẶT MỚI.
   Mẫu thầy duyệt: D:\OTHERS\CLAUDE\myLesson - thiet ke mat khau\mau-v2.html. ⛔ Viết ES5 như js/chung.js (iPad đời cũ).
   ============================================================ */
(function (g) {
  'use strict';
  var TOI_THIEU = 8;
  var PHO_BIEN = ['12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234', '11223344', 'password', 'password1',
    'matkhau', 'matkhau1', 'abcd1234', 'abc12345', 'qwerty', 'qwerty123', 'qwertyui', 'asdfghjk', 'iloveyou', 'andrewclasses', 'andrew',
    'abcdefgh', 'zxcvbnm1', 'a1b2c3d4', '1q2w3e4r'];
  function khongDau(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }

  // ai = { ma: ID đăng nhập (HỌTÊN+ddmmyyyy), ten: tên gọi } — thiếu gì thì bỏ qua phần đó
  function kiem(mk, ai) {
    ai = ai || {};
    var t = String(mk || ''), l = t.toLowerCase(), ma = String(ai.ma || '').replace(/\s+/g, '').toLowerCase();
    var m = /^([a-z]+)(\d{2})(\d{2})(\d{4})$/.exec(ma);
    var tu = khongDau(ai.ten).split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3; });
    var dinhDanh = (m ? [m[1], m[2] + m[3] + m[4], m[2] + m[3] + m[4].slice(2), m[2] + m[3]] : (ma ? [ma] : [])).concat(tu);
    var chuoiLap = /^(.)\1+$/.test(t) || '01234567890123456789'.indexOf(t) >= 0 || '98765432109876543210'.indexOf(t) >= 0 ||
      'abcdefghijklmnopqrstuvwxyz'.indexOf(l) >= 0;
    var co = t.length > 0;
    return [
      { ma: 'dai', chu: 'Ít nhất ' + TOI_THIEU + ' ký tự', dat: t.length >= TOI_THIEU },
      { ma: 'cach', chu: 'Không có dấu cách', dat: co && !/\s/.test(t) },
      { ma: 'dau', chu: 'Chỉ chữ không dấu, số và ký hiệu (tắt bộ gõ tiếng Việt)', dat: co && /^[\x21-\x7e]+$/.test(t.replace(/\s/g, '')) },
      { ma: 'chuSo', chu: 'Có cả chữ và số', dat: /[a-z]/i.test(t) && /\d/.test(t) },
      { ma: 'rieng', chu: 'Không chứa tên, ngày sinh hay ID của em', dat: co && !dinhDanh.some(function (x) { return x && l.indexOf(x) >= 0; }) },
      { ma: 'khoDoan', chu: 'Không phải mật khẩu quá dễ đoán (12345678, password…)', dat: co && PHO_BIEN.indexOf(l) < 0 && !chuoiLap && !/^(.{1,4})\1+$/.test(l) }
    ];
  }
  function thieu(kq) {
    var x = kq.filter(function (y) { return !y.dat; });
    return x.length ? 'Mật khẩu chưa đạt: ' + x.map(function (y) { return y.chu.charAt(0).toLowerCase() + y.chu.slice(1); }).join('; ') + '.' : '';
  }
  var MEO = '<details class="mk-meo"><summary>Mẹo đặt mật khẩu dễ nhớ mà khó đoán</summary><ul>' +
    '<li>Ghép 2–3 từ em thích + một con số: <b>meoDen7sao</b>, <b>banhMi3trung</b>.</li>' +
    '<li>Không dùng tên, ngày sinh, số điện thoại — bạn bè đoán ra ngay.</li>' +
    '<li>Không cho bạn nào biết mật khẩu, kể cả bạn thân.</li>' +
    '<li>Gõ khi đã <b>tắt bộ gõ tiếng Việt</b> (Unikey/Telex) để lần sau gõ lại khớp.</li></ul></details>';

  // ---- CSS (chèn một lần, dùng chung cả hai nơi) ----
  function cssMotLan() {
    if (document.getElementById('acMkCss')) return;
    var s = document.createElement('style'); s.id = 'acMkCss';
    s.textContent =
      '.mk-ds{list-style:none;margin:-4px 0 12px;padding:10px 12px;border-radius:12px;background:var(--accent-soft,#e8f5f2);display:grid;gap:5px}' +
      '.mk-ds li{display:flex;align-items:center;gap:8px;font-size:12.5px;line-height:1.35;color:var(--muted,#5b6b6a)}' +
      '.mk-ds li i{flex:none;width:17px;height:17px;border-radius:50%;border:1.6px solid #b8c4c2;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:900;color:#fff;transition:background-color .15s,border-color .15s}' +
      '.mk-ds li.dat{color:#14634f}.mk-ds li.dat i{background:#16a34a;border-color:#16a34a}.mk-ds li.dat i::before{content:"✓"}' +
      '.mk-ds li.sai{color:#c0392b;font-weight:700}.mk-ds li.sai i{background:#e74c3c;border-color:#e74c3c}.mk-ds li.sai i::before{content:"!"}' +
      '.mk-khop{margin:-4px 0 12px;font-size:12.5px;font-weight:700;text-align:center}.mk-khop.dat{color:#16a34a}.mk-khop.sai{color:#c0392b}' +
      '.mk-meo{margin:0 0 12px;font-size:12.5px;color:var(--muted,#5b6b6a)}' +
      '.mk-meo summary{cursor:pointer;font-weight:800;color:var(--accent,#0e7c6e);text-align:center;list-style:none}.mk-meo summary::-webkit-details-marker{display:none}' +
      '.mk-meo ul{margin:8px 0 0;padding-left:18px;line-height:1.5}' +
      '.mk-o{position:relative;margin-bottom:12px}.mk-o input{padding-right:48px}' +
      '.mk-o .id-eye{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:9px;display:grid;place-items:center;color:var(--muted,#5b6b6a);background:none;border:0;cursor:pointer}' +
      '.mk-o .id-eye:hover{background:var(--accent-soft,#e8f5f2);color:var(--accent,#0e7c6e)}' +
      '.mk-o .id-eye svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.pop .mk-ds{margin-top:0}.pop .mk-meo summary{text-align:left}';
    document.head.appendChild(s);
  }

  // ---- nút MẮT hiện/ẩn (y hệt js/nw-dangnhap.js — Lucide eye / eye-off); ô phải nằm trong khung position:relative (.mk-o) ----
  var IC_MAT = '<svg viewBox="0 0 24 24"><path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/></svg>';
  var IC_MAT_TAT = '<svg viewBox="0 0 24 24"><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.97 0 8.46 3.37 9.94 6.65a1 1 0 0 1 0 .7 10.8 10.8 0 0 1-1.44 2.49"/><path d="M14.08 14.16a3 3 0 0 1-4.24-4.24"/><path d="M17.48 17.5A10.75 10.75 0 0 1 2.06 12.35a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.45-5.14"/><path d="m2 2 20 20"/></svg>';
  function datMat(nut, hien) {
    var o = nut.previousElementSibling;
    o.type = hien ? 'text' : 'password';
    nut.innerHTML = hien ? IC_MAT_TAT : IC_MAT;
    nut.title = hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'; nut.setAttribute('aria-label', nut.title);
  }
  function ganMat(o) {
    if (!o || (o.nextElementSibling && o.nextElementSibling.className === 'id-eye')) return;
    cssMotLan();
    var nut = document.createElement('button'); nut.type = 'button'; nut.className = 'id-eye';
    o.insertAdjacentElement('afterend', nut); datMat(nut, false);
    nut.addEventListener('mousedown', function (e) { e.preventDefault(); });   // giữ con trỏ trong ô
    nut.addEventListener('click', function () {
      var a = o.selectionStart, b = o.selectionEnd;
      datMat(nut, o.type === 'password'); o.focus();
      try { o.setSelectionRange(a, b); } catch (e) { }
    });
  }

  // ---- gắn danh sách tích vào một cặp ô: o = { mk, mk2, ds, khop (phần tử), ai: function () { return {ma, ten}; } }
  //      trả { kiemLuu(): '' nếu đạt, hoặc câu báo lỗi; ve(); dat(bool) } ----
  function gan(o) {
    cssMotLan();
    var daBam = false;
    function ve() {
      var mk = o.mk.value, mk2 = o.mk2.value, kq = kiem(mk, o.ai ? o.ai() : null);
      o.ds.innerHTML = kq.map(function (x) { return '<li class="' + (x.dat ? 'dat' : (daBam ? 'sai' : '')) + '"><i></i>' + x.chu + '</li>'; }).join('');
      if (o.khop) {
        if (!mk2) o.khop.hidden = true;
        else { o.khop.hidden = false; o.khop.className = 'mk-khop ' + (mk === mk2 ? 'dat' : 'sai'); o.khop.textContent = mk === mk2 ? '✓ Hai lần nhập giống nhau' : 'Hai lần nhập chưa giống nhau'; }
      }
      return kq;
    }
    o.mk.addEventListener('input', ve); o.mk2.addEventListener('input', ve);
    ve();
    return {
      ve: function () { daBam = false; return ve(); },
      kiemLuu: function () {
        daBam = true; var kq = ve(), c = thieu(kq);
        if (c) return c;
        if (o.mk.value !== o.mk2.value) return 'Hai lần nhập chưa giống nhau.';
        return '';
      }
    };
  }

  g.ACMatKhau = { TOI_THIEU: TOI_THIEU, kiem: kiem, thieu: thieu, MEO: MEO, gan: gan, ganMat: ganMat, css: cssMotLan };
})(window);
