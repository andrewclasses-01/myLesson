/* ============================================================
   cat-anh.js — BỘ CẮT ẢNH ĐẠI DIỆN DÙNG CHUNG (v1.251.0, 05/10/2026 — thầy chốt).
   Mọi nơi đổi ảnh đại diện đều qua đây: dashboard (thầy đổi ảnh học sinh), KT ĐẦU VÀO (js/ktdv-ql.js),
   trang cá nhân myNetwork (nw/canhan.html — em tự đổi / thầy đổi ảnh mình).
   • Kéo ảnh để đặt vị trí · PHÓNG TO / THU NHỎ: thanh trượt (bấm 2 icon ảnh nhỏ/lớn ở 2 đầu), lăn chuột, chụm 2 ngón.
     Thu nhỏ được tới mức thấy TRỌN ảnh (phần thừa nền trắng) — ảnh chụp quá sát mặt vẫn căn được.
   • XOAY: thanh trượt ±45° (ảnh nghiêng) + nút xoay 90° (ảnh điện thoại nằm ngang); bấm số độ = về 0°.
   • LỚP PHỦ: ngoài vòng tròn tối mờ, viền tròn trắng mảnh; dáng ĐẦU-VAI một nét liền mảnh + lòng sáng rất nhẹ;
     lưới 3×3 chỉ hiện khi đang kéo/chụm/xoay. Nút "Khung đầu-vai" bật/tắt dáng (nhớ theo máy).
   • Vòng tròn = phần hiện ra ở mọi nơi (avatar tròn); góc vuông ngoài vòng vẫn được lưu (myStudent/myTeam dùng ảnh vuông).
   Mô hình: tâm ảnh (c.x, c.y) trong toạ độ khung O×O · cỡ s = O/min(w,h)·z · góc c.r (độ). Kẹp: quy tâm khung về
     toạ độ ẢNH (xoay ngược) rồi kẹp theo nửa cạnh khung đã xoay ⇒ ảnh đủ lớn thì luôn phủ kín khung vuông.
   Hai cách dùng:
     CatAnh.gan(khung, nguon, {o}) ⇒ Promise<ctl>   — vẽ bộ cắt VÀO một phần tử có sẵn (dashboard dùng trong hộp #adNen).
     CatAnh.mo(nguon, {tieuDe, nutDung}) ⇒ Promise<ctl|null> — hộp nổi riêng (Hủy bỏ / Lưu); null = Hủy bỏ.
   nguon = File/Blob/URL. ctl = { xuat(n,q) ⇒ base64 JPEG (không tiền tố), xuatBlob(n,q) ⇒ Promise<Blob>,
     canhGoc() ⇒ số điểm ảnh GỐC nằm trong khung (ảnh nhỏ thì đừng phóng vô ích), huy() }.
   ============================================================ */
(function () {
  'use strict';
  if (window.CatAnh) return;

  var KHOA_KHUNG = 'catAnhKhungMo';
  var XOAY_MAX = 45;
  var SV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var IC = {   // Lucide: image · rotate-ccw · scan-face · rotate-cw-square
    anh: function (n) { return SV + ' width="' + n + '" height="' + n + '"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>'; },
    giua: SV + ' width="15" height="15"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    khung: SV + ' width="15" height="15"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/></svg>',
    xoay90: SV + ' width="17" height="17"><path d="M12 5H6a2 2 0 0 0-2 2v3"/><path d="m9 8 3-3-3-3"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2"/></svg>'
  };
  // Dáng đầu-vai (hệ 0–100 của khung vuông) — MỘT nét liền: vai trái ⇒ cổ ⇒ quanh đầu ⇒ cổ ⇒ vai phải.
  // Thầy chỉnh 05/10 (theo ảnh mẫu avatar vàng): đỉnh đầu sát trần 11 %, cằm ~60 %, đầu rộng 40 % — người to hơn để rõ mặt.
  var DANG = 'M2 100C3 85 13 75 28 71C36 69 40.5 67 41.5 63L41.5 58.5C34.5 54 30 45.5 30 35C30 21 39 11 50 11' +
    'C61 11 70 21 70 35C70 45.5 65.5 54 58.5 58.5L58.5 63C59.5 67 64 69 72 71C87 75 97 85 98 100';

  function cssMot() {
    if (document.getElementById('catAnhCss')) return;
    var st = document.createElement('style');
    st.id = 'catAnhCss';
    var RANH = '#DCE4E2';
    st.textContent =
      '.ca-vung{--ca-xanh:var(--xanh,#0F766E);display:flex;flex-direction:column;align-items:center;gap:12px}' +
      '.ca-khung{position:relative;overflow:hidden;border-radius:18px;background:#141817;touch-action:none;cursor:grab;flex:none;user-select:none;-webkit-user-select:none;box-shadow:0 1px 2px rgba(0,0,0,.08),0 8px 24px rgba(0,0,0,.12);margin-bottom:4px}' +
      '.ca-khung.keo{cursor:grabbing}' +
      '.ca-khung img{position:absolute;left:0;top:0;max-width:none;user-select:none;pointer-events:none;transform-origin:50% 50%}' +
      '.ca-phu{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}' +
      '.ca-phu .toi{fill:rgba(12,16,15,.62);transition:fill .2s}' +
      '.ca-khung.keo .ca-phu .toi{fill:rgba(12,16,15,.45)}' +
      '.ca-phu .vong{fill:none;stroke:rgba(255,255,255,.95);stroke-width:1.5}' +
      '.ca-phu .luoi{stroke:rgba(255,255,255,.38);stroke-width:1;opacity:0;transition:opacity .2s}' +
      '.ca-khung.keo .ca-phu .luoi{opacity:1}' +
      '.ca-phu .dang{fill:rgba(255,255,255,.07);stroke:rgba(255,255,255,.82);stroke-width:1.25;stroke-linejoin:round;stroke-linecap:round;' +
        'filter:drop-shadow(0 0 1.5px rgba(0,0,0,.45));transition:opacity .2s}' +
      '.ca-khung.tat-khung .ca-phu .dang{opacity:0}' +
      '.ca-cu{display:flex;align-items:center;gap:10px;width:100%;max-width:300px;color:var(--nhat,#6B7C79)}' +
      '.ca-cu button{flex:none;display:grid;place-items:center;width:30px;height:30px;padding:0;border:0;border-radius:8px;background:none;color:inherit;cursor:pointer;font:inherit}' +
      '.ca-cu button:hover{color:var(--ca-xanh);background:rgba(15,118,110,.08)}' +
      '.ca-cu .ca-do{width:40px;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}' +
      '.ca-cu input[type=range]{flex:1;min-width:0;height:20px;margin:0;background:none;-webkit-appearance:none;appearance:none;cursor:pointer}' +
      // rãnh tô màu từ --a tới --b (zoom: 0 ⇒ giá trị · xoay: giữa ⇒ giá trị)
      '.ca-cu input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:linear-gradient(to right,' + RANH + ' var(--a,0%),var(--ca-xanh) var(--a,0%),var(--ca-xanh) var(--b,0%),' + RANH + ' var(--b,0%))}' +
      '.ca-cu input[type=range]::-moz-range-track{height:4px;border-radius:4px;background:linear-gradient(to right,' + RANH + ' var(--a,0%),var(--ca-xanh) var(--a,0%),var(--ca-xanh) var(--b,0%),' + RANH + ' var(--b,0%))}' +
      '.ca-cu input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;margin-top:-7px;border-radius:50%;background:#fff;border:0;box-shadow:0 0 0 1px rgba(0,0,0,.08),0 2px 6px rgba(0,0,0,.22)}' +
      '.ca-cu input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#fff;border:0;box-shadow:0 0 0 1px rgba(0,0,0,.08),0 2px 6px rgba(0,0,0,.22)}' +
      '.ca-phu-nut{display:flex;gap:8px;justify-content:center;margin-top:2px}' +
      '.ca-phu-nut button{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;border:1px solid var(--vien,#DCE4E2);background:#fff;' +
        'font-family:inherit;font-size:12.5px;font-weight:600;line-height:1;color:#3D4B49;cursor:pointer;transition:background .15s,border-color .15s,color .15s}' +
      '.ca-phu-nut button:hover{border-color:var(--ca-xanh);color:var(--ca-xanh)}' +
      '.ca-phu-nut button.bat{background:rgba(15,118,110,.09);border-color:transparent;color:var(--ca-xanh)}' +
      '.ca-nen{position:fixed;inset:0;z-index:9500;background:rgba(12,20,19,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:12px}' +
      '.ca-hop{background:#fff;color:#16232A;border-radius:22px;box-shadow:0 24px 64px rgba(0,0,0,.28);padding:20px 20px 16px;width:min(372px,100%);max-height:100%;overflow:auto;font-family:inherit}' +
      '.ca-hop h4{margin:0 0 16px;font-size:16px;font-weight:800;text-align:center;letter-spacing:.01em}' +
      '.ca-chan{display:flex;gap:8px;margin-top:18px}' +
      '.ca-chan button{flex:1;font:inherit;font-weight:700;font-size:14px;height:42px;border-radius:12px;border:0;background:#EEF2F1;color:#2B3A38;cursor:pointer}' +
      '.ca-chan button:hover{background:#E3E9E8}' +
      '.ca-chan button.chinh{background:var(--xanh,#0F766E);color:#fff}' +
      '.ca-chan button.chinh:hover{filter:brightness(1.08)}';
    document.head.appendChild(st);
  }

  function khungMo() { try { return localStorage.getItem(KHOA_KHUNG) !== '0'; } catch (e) { return true; } }
  function nhoKhung(bat) { try { localStorage.setItem(KHOA_KHUNG, bat ? '1' : '0'); } catch (e) {} }

  function napAnh(nguon) {
    return new Promise(function (ok, hong) {
      var url = (typeof nguon === 'string') ? nguon : URL.createObjectURL(nguon);
      var tam = typeof nguon !== 'string';
      var im = new Image();
      im.onload = function () { ok({ el: im, w: im.naturalWidth, h: im.naturalHeight, url: url, tam: tam }); };
      im.onerror = function () { if (tam) URL.revokeObjectURL(url); hong(new Error('Không đọc được ảnh này (thử ảnh JPG/PNG khác).')); };
      if (!tam && !/^(data|blob):/.test(url)) im.crossOrigin = 'anonymous';
      im.src = url;
    });
  }

  // Lớp phủ vẽ theo điểm ảnh thật của khung (O×O) ⇒ nét luôn mảnh đều, không bị co giãn.
  function lopPhu(O) {
    var r = O / 2, k = O / 100, t1 = O / 3, t2 = O * 2 / 3, id = 'caCat' + Math.random().toString(36).slice(2, 8);
    return '<svg class="ca-phu" viewBox="0 0 ' + O + ' ' + O + '" aria-hidden="true">' +
      '<defs><clipPath id="' + id + '"><circle cx="' + r + '" cy="' + r + '" r="' + r + '"/></clipPath></defs>' +
      '<path class="toi" fill-rule="evenodd" d="M0 0H' + O + 'V' + O + 'H0Z M' + r + ' 0a' + r + ' ' + r + ' 0 1 0 0.01 0Z"/>' +
      '<g class="luoi" clip-path="url(#' + id + ')"><path d="M' + t1 + ' 0V' + O + 'M' + t2 + ' 0V' + O + 'M0 ' + t1 + 'H' + O + 'M0 ' + t2 + 'H' + O + '"/></g>' +
      '<g clip-path="url(#' + id + ')"><path class="dang" transform="scale(' + k + ')" vector-effect="non-scaling-stroke" d="' + DANG + '"/></g>' +
      '<circle class="vong" cx="' + r + '" cy="' + r + '" r="' + (r - 0.75) + '"/>' +
      '</svg>';
  }

  function gan(khung, nguon, tuy) {
    cssMot();
    tuy = tuy || {};
    var O = Math.round(tuy.o || 280);
    return napAnh(nguon).then(function (A) {
      var phu = Math.min(A.w, A.h) / Math.max(A.w, A.h);   // z nhỏ nhất = thấy trọn ảnh
      var Z_MAX = 6;
      var c = { z: 1, x: 0, y: 0, r: 0, q: 0 };              // q = số lần xoay 90°, r = góc tinh chỉnh (±45°)
      var coKhung = khungMo();
      khung.innerHTML =
        '<div class="ca-vung">' +
          '<div class="ca-khung' + (coKhung ? '' : ' tat-khung') + '" style="width:' + O + 'px;height:' + O + 'px">' +
            '<img alt="" draggable="false">' + lopPhu(O) +
          '</div>' +
          '<div class="ca-cu">' +
            '<button type="button" data-ca="nho" title="Thu nhỏ" aria-label="Thu nhỏ">' + IC.anh(14) + '</button>' +
            '<input type="range" data-ca-z min="' + phu.toFixed(3) + '" max="' + Z_MAX + '" step="0.01" value="1" aria-label="Phóng to / thu nhỏ">' +
            '<button type="button" data-ca="to" title="Phóng to" aria-label="Phóng to">' + IC.anh(20) + '</button>' +
          '</div>' +
          '<div class="ca-cu">' +
            '<button type="button" data-ca="xoay90" title="Xoay 90°" aria-label="Xoay 90 độ">' + IC.xoay90 + '</button>' +
            '<input type="range" data-ca-r min="-' + XOAY_MAX + '" max="' + XOAY_MAX + '" step="0.5" value="0" aria-label="Xoay ảnh">' +
            '<button type="button" class="ca-do" data-ca="r0" title="Về 0°">0°</button>' +
          '</div>' +
          '<div class="ca-phu-nut">' +
            '<button type="button" data-ca="khung" class="' + (coKhung ? 'bat' : '') + '" title="Hiện/ẩn dáng đầu và vai">' + IC.khung + 'Khung đầu-vai</button>' +
            '<button type="button" data-ca="giua" title="Đặt lại như lúc đầu">' + IC.giua + 'Đặt lại</button>' +
          '</div>' +
        '</div>';
      var kh = khung.querySelector('.ca-khung'), im = kh.querySelector('img');
      var trZ = khung.querySelector('[data-ca-z]'), trR = khung.querySelector('[data-ca-r]'), soDo = khung.querySelector('.ca-do');
      im.src = A.url;

      function tiLe() { return O / Math.min(A.w, A.h) * c.z; }
      function goc() { return (c.q * 90 + c.r) * Math.PI / 180; }
      // Kẹp tâm ảnh: tâm khung quy về toạ độ ảnh (xoay ngược); nửa cạnh khung đã xoay = r(|cos|+|sin|).
      function kep() {
        var s = tiLe(), a = goc(), cs = Math.cos(a), sn = Math.sin(a);
        var hw = A.w * s / 2, hh = A.h * s / 2, e = O / 2 * (Math.abs(cs) + Math.abs(sn));
        var vx = O / 2 - c.x, vy = O / 2 - c.y;
        var u = vx * cs + vy * sn, v = -vx * sn + vy * cs;          // R(−a)·v
        var mu = Math.abs(hw - e), mv = Math.abs(hh - e);            // ảnh lớn: phủ kín · ảnh nhỏ: nằm gọn trong khung
        u = Math.max(-mu, Math.min(mu, u)); v = Math.max(-mv, Math.min(mv, v));
        c.x = O / 2 - (u * cs - v * sn); c.y = O / 2 - (u * sn + v * cs);   // R(a)·(u,v)
      }
      function toMau(tr, a, b) { tr.style.setProperty('--a', a.toFixed(1) + '%'); tr.style.setProperty('--b', b.toFixed(1) + '%'); }
      function ve() {
        var s = tiLe(), w = A.w * s, h = A.h * s;
        im.style.width = w + 'px'; im.style.height = h + 'px';
        im.style.transform = 'translate(' + (c.x - w / 2) + 'px,' + (c.y - h / 2) + 'px) rotate(' + (c.q * 90 + c.r) + 'deg)';
        trZ.value = c.z; toMau(trZ, 0, (c.z - phu) / (Z_MAX - phu) * 100);
        trR.value = c.r; var p = (c.r + XOAY_MAX) / (2 * XOAY_MAX) * 100; toMau(trR, Math.min(50, p), Math.max(50, p));
        var tong = ((c.q * 90 + c.r) % 360 + 540) % 360 - 180;
        soDo.textContent = (Math.round(tong * 2) / 2) + '°';
      }
      // phóng quanh điểm (px,py) của khung — mặc định tâm khung
      function phong(z, px, py) {
        if (px == null) { px = O / 2; py = O / 2; }
        var s0 = tiLe(); c.z = Math.max(phu, Math.min(Z_MAX, z)); var s1 = tiLe();
        c.x = px - (px - c.x) * s1 / s0; c.y = py - (py - c.y) * s1 / s0;
        kep(); ve();
      }
      // xoay quanh TÂM KHUNG (thứ đang nhìn ở giữa vòng tròn đứng yên)
      function xoay(q, r) {
        var a0 = goc(); c.q = ((q % 4) + 4) % 4; c.r = Math.max(-XOAY_MAX, Math.min(XOAY_MAX, r)); var d = goc() - a0;
        var vx = c.x - O / 2, vy = c.y - O / 2, cs = Math.cos(d), sn = Math.sin(d);
        c.x = O / 2 + vx * cs - vy * sn; c.y = O / 2 + vx * sn + vy * cs;
        kep(); ve();
      }
      function datLai() {
        c.z = 1; c.r = 0; c.q = 0; var s = tiLe();
        c.x = O / 2;
        c.y = A.h > A.w ? A.h * s / 2 : O / 2;   // ảnh dọc: đầu thường ở phía trên ⇒ bám mép trên
        kep(); ve();
      }
      datLai();

      trZ.addEventListener('input', function () { phong(+trZ.value); });
      trR.addEventListener('input', function () { kh.classList.add('keo'); xoay(c.q, +trR.value); });
      trR.addEventListener('change', function () { kh.classList.remove('keo'); });
      ['pointerup', 'pointercancel'].forEach(function (t) { trR.addEventListener(t, function () { kh.classList.remove('keo'); }); });
      khung.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-ca]');
        if (!b) return;
        var v = b.getAttribute('data-ca');
        if (v === 'nho') phong(c.z / 1.2);
        else if (v === 'to') phong(c.z * 1.2);
        else if (v === 'xoay90') xoay(c.q + 1, c.r);
        else if (v === 'r0') xoay(c.q, 0);
        else if (v === 'giua') datLai();
        else if (v === 'khung') {
          coKhung = !coKhung; nhoKhung(coKhung);
          kh.classList.toggle('tat-khung', !coKhung); b.classList.toggle('bat', coKhung);
        }
      });
      kh.addEventListener('wheel', function (e) {
        e.preventDefault();
        var r = kh.getBoundingClientRect();
        phong(c.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top);
      }, { passive: false });

      // kéo 1 ngón / chuột · chụm 2 ngón để phóng
      var tro = {}, keo = null, chum = null;
      function hai() { var k = Object.keys(tro); return k.length === 2 ? [tro[k[0]], tro[k[1]]] : null; }
      function batDauChum() {
        var p = hai(); if (!p) return;
        var r = kh.getBoundingClientRect();
        chum = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1, z: c.z,
          mx: (p[0].x + p[1].x) / 2 - r.left, my: (p[0].y + p[1].y) / 2 - r.top, cx: c.x, cy: c.y };
        keo = null;
      }
      kh.addEventListener('pointerdown', function (e) {
        tro[e.pointerId] = { x: e.clientX, y: e.clientY };
        try { kh.setPointerCapture(e.pointerId); } catch (x) {}
        kh.classList.add('keo');
        if (Object.keys(tro).length >= 2) batDauChum();
        else keo = { x: e.clientX, y: e.clientY, cx: c.x, cy: c.y };
        e.preventDefault();
      });
      kh.addEventListener('pointermove', function (e) {
        if (!tro[e.pointerId]) return;
        tro[e.pointerId] = { x: e.clientX, y: e.clientY };
        var p = hai();
        if (p && chum) {
          var r = kh.getBoundingClientRect();
          var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
          var mx = (p[0].x + p[1].x) / 2 - r.left, my = (p[0].y + p[1].y) / 2 - r.top;
          // đặt lại về lúc bắt đầu chụm rồi phóng quanh trung điểm, cộng thêm phần trung điểm đã dời
          c.x = chum.cx; c.y = chum.cy; c.z = chum.z;
          phong(chum.z * d / chum.d, chum.mx, chum.my);
          c.x += mx - chum.mx; c.y += my - chum.my; kep(); ve();
        } else if (keo) {
          c.x = keo.cx + e.clientX - keo.x; c.y = keo.cy + e.clientY - keo.y;
          kep(); ve();
        }
      });
      function tha(e) {
        delete tro[e.pointerId];
        chum = null;
        var k = Object.keys(tro);
        if (k.length === 1) keo = { x: tro[k[0]].x, y: tro[k[0]].y, cx: c.x, cy: c.y };
        else { keo = null; kh.classList.remove('keo'); }
      }
      kh.addEventListener('pointerup', tha); kh.addEventListener('pointercancel', tha);

      function veVao(n) {
        var s = tiLe(), cv = document.createElement('canvas');
        cv.width = cv.height = n;
        var g = cv.getContext('2d'), k = n / O, w = A.w * s * k, h = A.h * s * k;
        g.fillStyle = '#fff'; g.fillRect(0, 0, n, n);
        g.imageSmoothingQuality = 'high';
        g.translate(c.x * k, c.y * k); g.rotate(goc());
        g.drawImage(A.el, -w / 2, -h / 2, w, h);
        return cv;
      }
      return {
        xuat: function (n, q) { return veVao(n).toDataURL('image/jpeg', q || 0.86).split(',')[1]; },
        xuatBlob: function (n, q) { var cv = veVao(n); return new Promise(function (ok) { cv.toBlob(ok, 'image/jpeg', q || 0.86); }); },
        canhGoc: function () { return Math.round(O / tiLe()); },
        huy: function () { if (A.tam) URL.revokeObjectURL(A.url); }
      };
    });
  }

  function mo(nguon, tuy) {
    cssMot();
    tuy = tuy || {};
    var nen = document.createElement('div');
    nen.className = 'ca-nen';
    nen.innerHTML = '<div class="ca-hop" role="dialog" aria-label="Căn ảnh đại diện"><h4></h4><div class="ca-than"></div>' +
      '<div class="ca-chan"><button type="button" data-ca-thoi>Hủy bỏ</button><button type="button" class="chinh" data-ca-dung></button></div></div>';
    nen.querySelector('h4').textContent = tuy.tieuDe || 'Căn ảnh đại diện';
    nen.querySelector('[data-ca-dung]').textContent = tuy.nutDung || 'Lưu';
    document.body.appendChild(nen);
    var O = Math.max(200, Math.min(300, window.innerWidth - 64));
    return gan(nen.querySelector('.ca-than'), nguon, { o: O }).then(function (ctl) {
      return new Promise(function (ok) {
        function xong(kq) { document.removeEventListener('keydown', phim, true); nen.remove(); if (!kq) ctl.huy(); ok(kq); }
        function phim(e) { if (e.key === 'Escape') { e.stopPropagation(); xong(null); } }
        document.addEventListener('keydown', phim, true);
        nen.querySelector('[data-ca-thoi]').onclick = function () { xong(null); };
        nen.querySelector('[data-ca-dung]').onclick = function () { xong(ctl); };
        nen.addEventListener('click', function (e) { if (e.target === nen) xong(null); });
      });
    }, function (e) { nen.remove(); throw e; });
  }

  window.CatAnh = { gan: gan, mo: mo };
})();
