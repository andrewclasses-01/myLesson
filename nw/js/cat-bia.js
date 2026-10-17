/* ============================================================
   nw/js/cat-bia.js — KHUNG CHỈNH / CẮT ẢNH BÌA trang cá nhân (15/10/2026, web v1.346.0 — thầy yêu cầu "tương tự ảnh đại diện").
   Bộ cắt ảnh đại diện (js/cat-anh.js) là khung VUÔNG dùng chung cho dashboard + KT đầu vào ⇒ không đụng vào; ảnh bìa có bộ riêng:
     • khung tỉ lệ bìa trên máy tính (2,8 : 1); kéo ảnh để đặt vị trí; phóng to/thu nhỏ bằng thanh trượt, lăn chuột, chụm 2 ngón
       (ảnh luôn phủ kín khung — không có viền trống)
     • đường nét đứt = phần còn thấy trên ĐIỆN THOẠI (bìa thấp hơn, hai bên bị cắt bớt)
     • nút "Chọn ảnh khác" ngay trong hộp
     • ⭐ v1.367.0 (17/10/2026, thầy yêu cầu) — thanh ĐỘ SÁNG 50–160 % (xem trước CSS brightness, lúc xuất nhân thẳng điểm ảnh)
   CatBia.mo(file, { tieuDe, nutDung }) ⇒ Promise<Blob JPEG 1400×500 | null (bấm Hủy)>.
   ============================================================ */
(function () {
  'use strict';
  if (window.CatBia) return;
  var TI = 2.8, RA_W = 1400, RA_H = 500, Z_MAX = 4;
  var TI_DT = 2.15;   // bìa trên điện thoại ≈ 343 × 160
  var B_MIN = 0.5, B_MAX = 1.6;

  function css() {
    if (document.getElementById('catBiaCss')) return;
    var s = document.createElement('style'); s.id = 'catBiaCss';
    s.textContent =
      '.cb-nen{position:fixed;inset:0;z-index:120;background:rgba(16,24,22,.55);display:grid;place-items:center;padding:16px}' +
      '.cb-hop{width:min(680px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.3);padding:16px 18px 14px;font-family:var(--sans,Montserrat,sans-serif)}' +
      '.cb-hop h4{margin:0 0 12px;font-size:16px;font-weight:800;color:var(--ink,#16232A)}' +
      '.cb-khung{position:relative;overflow:hidden;border-radius:14px;background:#141817;touch-action:none;cursor:grab;margin:0 auto;user-select:none;-webkit-user-select:none}' +
      '.cb-khung.keo{cursor:grabbing}' +
      '.cb-khung img{position:absolute;left:0;top:0;max-width:none;pointer-events:none;user-select:none;transform-origin:0 0}' +
      '.cb-dt{position:absolute;top:0;bottom:0;border-left:1.5px dashed rgba(255,255,255,.85);border-right:1.5px dashed rgba(255,255,255,.85);pointer-events:none}' +
      '.cb-luoi{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .2s;background-image:linear-gradient(rgba(255,255,255,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.35) 1px,transparent 1px);background-size:33.34% 33.34%}' +
      '.cb-khung.keo .cb-luoi{opacity:1}' +
      '.cb-ghi{display:flex;align-items:center;gap:6px;margin:8px 2px 0;font-size:11.5px;font-weight:600;color:var(--muted,#5F7370)}' +
      '.cb-ghi i{display:inline-block;width:16px;border-top:1.5px dashed var(--muted,#5F7370)}' +
      '.cb-thanh{display:flex;align-items:center;gap:10px;margin-top:12px}' +
      '.cb-thanh input[type=range]{flex:1;accent-color:var(--accent,#0E7C6E)}' +
      '.cb-thanh .cb-nh{flex:none;width:74px;font:800 11px var(--sans,Montserrat,sans-serif);letter-spacing:.04em;color:var(--muted,#5F7370);text-transform:uppercase}' +
      '.cb-thanh .cb-so{flex:none;width:46px;height:30px;border-radius:9px;border:1px solid var(--line,#E0EAE7);background:#fff;cursor:pointer;color:var(--muted,#5F7370);font:800 12px var(--sans,Montserrat,sans-serif);font-variant-numeric:tabular-nums}' +
      '.cb-thanh .cb-n{width:30px;height:30px;border-radius:9px;border:1px solid var(--line,#E0EAE7);background:#fff;display:grid;place-items:center;cursor:pointer;color:var(--muted,#5F7370);font:800 16px/1 sans-serif}' +
      '.cb-chan{display:flex;align-items:center;gap:8px;margin-top:14px}' +
      '.cb-chan .cb-khac{margin-right:auto;border:0;background:none;color:var(--accent,#0E7C6E);font:800 13px var(--sans,Montserrat,sans-serif);cursor:pointer;padding:6px 0}' +
      '.cb-chan button.b{padding:10px 18px;border-radius:12px;font:800 13.5px var(--sans,Montserrat,sans-serif);cursor:pointer;border:1px solid var(--line,#E0EAE7);background:#fff;color:var(--ink,#16232A)}' +
      '.cb-chan button.b.chinh{background:var(--accent,#0E7C6E);border-color:var(--accent,#0E7C6E);color:#fff}' +
      '.cb-chan button.b:disabled{opacity:.5;cursor:default}';
    document.head.appendChild(s);
  }

  function docAnh(file) {
    return new Promise(function (ok, loi) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { ok({ im: im, url: url }); };
      im.onerror = function () { URL.revokeObjectURL(url); loi(new Error('Không đọc được ảnh này.')); };
      im.src = url;
    });
  }
  function chonTep(xong) {
    var i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = function () { if (i.files && i.files[0]) xong(i.files[0]); };
    i.click();
  }

  function mo(file, tuy) {
    tuy = tuy || {};
    css();
    var nen = document.createElement('div'); nen.className = 'cb-nen';
    nen.innerHTML = '<div class="cb-hop" role="dialog" aria-label="Chỉnh ảnh bìa"><h4></h4>' +
      '<div class="cb-khung"><img alt=""><div class="cb-luoi"></div><div class="cb-dt"></div></div>' +
      '<div class="cb-ghi"><i></i>Phần trong nét đứt là phần thấy được trên điện thoại · kéo ảnh để đặt vị trí</div>' +
      '<div class="cb-thanh"><span class="cb-nh">Phóng to</span><button type="button" class="cb-n" data-z="-" aria-label="Thu nhỏ">−</button><input type="range" data-cb-z min="1" max="' + Z_MAX + '" step="0.01" value="1" aria-label="Phóng to"><button type="button" class="cb-n" data-z="+" aria-label="Phóng to">+</button></div>' +
      '<div class="cb-thanh"><span class="cb-nh">Độ sáng</span><button type="button" class="cb-n" data-b="-" aria-label="Tối hơn">−</button><input type="range" data-cb-b min="' + B_MIN + '" max="' + B_MAX + '" step="0.01" value="1" aria-label="Độ sáng"><button type="button" class="cb-n" data-b="+" aria-label="Sáng hơn">+</button><button type="button" class="cb-so" data-b="0" title="Về 100%">100%</button></div>' +
      '<div class="cb-chan"><button type="button" class="cb-khac">Chọn ảnh khác</button><button type="button" class="b" data-thoi>Hủy bỏ</button><button type="button" class="b chinh" data-dung></button></div></div>';
    nen.querySelector('h4').textContent = tuy.tieuDe || 'Chỉnh ảnh bìa';
    nen.querySelector('[data-dung]').textContent = tuy.nutDung || 'Lưu';
    document.body.appendChild(nen);
    var khung = nen.querySelector('.cb-khung'), img = khung.querySelector('img'), thanh = nen.querySelector('[data-cb-z]');
    var thanhB = nen.querySelector('[data-cb-b]'), soB = nen.querySelector('.cb-so'), b = 1;
    var W = Math.round(Math.min(640, nen.querySelector('.cb-hop').clientWidth - 36)), H = Math.round(W / TI);
    khung.style.width = W + 'px'; khung.style.height = H + 'px';
    var dt = nen.querySelector('.cb-dt'), wDt = Math.round(H * TI_DT); dt.style.left = Math.round((W - wDt) / 2) + 'px'; dt.style.width = wDt + 'px';

    var A = null, s0 = 1, z = 1, x = 0, y = 0;            // ảnh · cỡ phủ tối thiểu · phóng · góc trên-trái ảnh trong khung
    function kep() {
      var s = s0 * z, w = A.im.naturalWidth * s, h = A.im.naturalHeight * s;
      x = Math.min(0, Math.max(W - w, x)); y = Math.min(0, Math.max(H - h, y));
    }
    function ve() { kep(); img.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (s0 * z) + ')'; }
    function datZ(zMoi, cx, cy) {             // phóng quanh điểm (cx, cy) của khung
      zMoi = Math.max(1, Math.min(Z_MAX, zMoi));
      if (cx == null) { cx = W / 2; cy = H / 2; }
      var k = zMoi / z; x = cx - (cx - x) * k; y = cy - (cy - y) * k; z = zMoi; thanh.value = z; ve();
    }
    function napTep(f) {
      return docAnh(f).then(function (a) {
        if (A) URL.revokeObjectURL(A.url);
        A = a; img.src = a.url;
        s0 = Math.max(W / a.im.naturalWidth, H / a.im.naturalHeight); z = 1; thanh.value = 1;
        x = (W - a.im.naturalWidth * s0) / 2; y = (H - a.im.naturalHeight * s0) / 2; ve();
      });
    }

    // kéo + chụm 2 ngón
    var diem = {}, keo = null;
    khung.addEventListener('pointerdown', function (e) {
      if (!A) return; khung.setPointerCapture(e.pointerId); diem[e.pointerId] = { x: e.clientX, y: e.clientY };
      khung.classList.add('keo'); keo = { x: x, y: y, z: z, d: null };
    });
    khung.addEventListener('pointermove', function (e) {
      if (!diem[e.pointerId] || !A) return;
      var cu = diem[e.pointerId]; diem[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ds = Object.keys(diem).map(function (k) { return diem[k]; });
      if (ds.length >= 2) {
        var d = Math.hypot(ds[0].x - ds[1].x, ds[0].y - ds[1].y), r = khung.getBoundingClientRect();
        if (keo.d) datZ(z * d / keo.d, (ds[0].x + ds[1].x) / 2 - r.left, (ds[0].y + ds[1].y) / 2 - r.top);
        keo.d = d;
      } else { x += e.clientX - cu.x; y += e.clientY - cu.y; ve(); }
    });
    function tha(e) { delete diem[e.pointerId]; if (!Object.keys(diem).length) { khung.classList.remove('keo'); keo = null; } else if (keo) keo.d = null; }
    khung.addEventListener('pointerup', tha); khung.addEventListener('pointercancel', tha);
    khung.addEventListener('wheel', function (e) {
      if (!A) return; e.preventDefault(); var r = khung.getBoundingClientRect();
      datZ(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    thanh.addEventListener('input', function () { datZ(Number(thanh.value)); });
    function datB(v) {
      b = Math.max(B_MIN, Math.min(B_MAX, Math.round(v * 100) / 100));
      img.style.filter = Math.abs(b - 1) < 0.005 ? '' : 'brightness(' + b + ')'; thanhB.value = b; soB.textContent = Math.round(b * 100) + '%';
    }
    thanhB.addEventListener('input', function () { datB(Number(thanhB.value)); });
    nen.querySelectorAll('[data-b]').forEach(function (n) { n.onclick = function () { var k = n.getAttribute('data-b'); datB(k === '0' ? 1 : b + (k === '+' ? 0.1 : -0.1)); }; });
    nen.querySelectorAll('[data-z]').forEach(function (b) { b.onclick = function () { datZ(z * (b.getAttribute('data-z') === '+' ? 1.15 : 1 / 1.15)); }; });

    return new Promise(function (ok) {
      function xong(kq) { if (A) URL.revokeObjectURL(A.url); document.removeEventListener('keydown', phim, true); nen.remove(); ok(kq); }
      function phim(e) { if (e.key === 'Escape') { e.stopPropagation(); xong(null); } }
      document.addEventListener('keydown', phim, true);
      nen.querySelector('[data-thoi]').onclick = function () { xong(null); };
      nen.addEventListener('mousedown', function (e) { if (e.target === nen) xong(null); });
      nen.querySelector('.cb-khac').onclick = function () { chonTep(function (f) { napTep(f).catch(function (e) { alert(e.message); }); }); };
      nen.querySelector('[data-dung]').onclick = function () {
        if (!A) return;
        var nut = this; nut.disabled = true;
        var s = s0 * z, cv = document.createElement('canvas'); cv.width = RA_W; cv.height = RA_H;
        var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, RA_W, RA_H);
        g.imageSmoothingQuality = 'high';
        g.drawImage(A.im, -x / s, -y / s, W / s, H / s, 0, 0, RA_W, RA_H);
        if (Math.abs(b - 1) >= 0.005) {        // ảnh luôn phủ kín khung ⇒ nhân thẳng cả khung
          var d = g.getImageData(0, 0, RA_W, RA_H), p = d.data;
          for (var i = 0; i < p.length; i += 4) { p[i] *= b; p[i + 1] *= b; p[i + 2] *= b; }
          g.putImageData(d, 0, 0);
        }
        cv.toBlob(function (b) { nut.disabled = false; if (b) xong(b); }, 'image/jpeg', 0.86);
      };
      napTep(file).catch(function (e) { xong(null); if (window.NW && NW.toast) NW.toast(e.message, true); });
    });
  }

  window.CatBia = { mo: mo };
})();
