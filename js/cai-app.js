/* ============================================================
   cai-app.js — nút "Cài app vào máy" (web v1.245.0, 04/10/2026)
   Thầy chốt 04/10: andrewclasses.com cài được như app (giống AWord) — máy tính +
   màn hình chính iPhone/Android. Tệp khai báo: manifest.webmanifest (đường TƯƠNG ĐỐI
   ⇒ trang thử andrewclasses-thu dùng chung). Icon: assets/icons/ (dáng 4A, xanh T1).
   ⛔ KHÔNG service worker (giống AWord): web đẩy bản mới liên tục, chạy ngoại tuyến dễ
   kẹt em ở bản cũ.

   Dùng chung 3 menu ☰:
     · học sinh  — js/vi-qua.js `dungMenu` (lop/khoa/bai/bai-sp)
     · myNetwork — nw/js/thanh.js `veSide`
     · dashboard — nút #caiApp trong pop-up ☰ (#mnDs)
   API: CaiApp.daCai() · CaiApp.mo() · CaiApp.gan(nut) · CaiApp.IC (icon svg cho menu)

   ⛔ PHẢI nạp ĐỒNG BỘ (không defer) và TRƯỚC script dựng menu: lop.html dựng menu
   ngay lúc chạy script đầu trang. Nạp sớm còn để kịp bắt sự kiện `beforeinstallprompt`.
   ============================================================ */
(function () {
  'use strict';
  if (window.CaiApp) return;

  // Gốc web tính từ CHÍNH file này (…/js/cai-app.js) ⇒ đúng cả trang gốc, trang nw/ và trang thử.
  var GOC = (function () {
    var s = document.currentScript && document.currentScript.src;
    try { return new URL('../', s || location.href).href; } catch (e) { return ''; }
  })();
  var ICON = GOC + 'assets/icons/icon-192.png?v=2';   // v1.246.0 icon S3 sáng hơn, bản bo góc

  var hoiCai = null;          // sự kiện beforeinstallprompt giữ lại (Chrome/Edge/Android)
  var vuaCai = false;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); hoiCai = e; });
  window.addEventListener('appinstalled', function () {
    vuaCai = true; hoiCai = null;
    Array.prototype.forEach.call(document.querySelectorAll('[data-cai-app]'), function (n) { n.style.display = 'none'; });
  });

  var UA = navigator.userAgent || '';
  var LA_IOS = /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
  var LA_ANDROID = /Android/.test(UA);
  // Trình duyệt NHÚNG trong app chat (Zalo, Facebook, Messenger, Instagram…) không cài được ⇒ bảo em mở bằng trình duyệt.
  var LA_NHUNG = /Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly/i.test(UA);
  var LA_SAFARI_MAC = !LA_IOS && /Macintosh/.test(UA) && /Safari\//.test(UA) && !/Chrome|Chromium|Edg\//.test(UA);
  var LA_FIREFOX = /Firefox\//.test(UA) && !LA_IOS;

  function daCai() {
    if (vuaCai) return true;
    if (window.navigator.standalone === true) return true;      // iPhone mở từ màn hình chính
    try {
      return ['standalone', 'minimal-ui', 'window-controls-overlay', 'fullscreen'].some(function (m) {
        return window.matchMedia('(display-mode: ' + m + ')').matches;
      });
    } catch (e) { return false; }
  }

  // SVG TRẦN như icon menu sẵn có (vi-qua.js, nw/js/loi.js): nét/màu do CSS của menu chủ lo; trong hộp dưới đây do `.ca-hop svg` lo.
  var P = function (d) { return '<svg viewBox="0 0 24 24">' + d + '</svg>'; };
  var IC = {
    caiApp: P('<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M12 7.5v7m0 0l-3-3m3 3l3-3"/><path d="M10 18.5h4"/>'),
    chiaSe: P('<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>'),
    themMh: P('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>'),
    chamDoc: P('<circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/>'),
    dong: P('<path d="M6 6l12 12M18 6L6 18"/>')
  };

  // ---------- hộp hướng dẫn ----------
  var CSS = '' +
    '.ca-nen{position:fixed;inset:0;z-index:2147483000;background:rgba(15,25,30,.45);display:flex;align-items:center;justify-content:center;padding:16px;' +
      'opacity:0;transition:opacity .18s ease}' +
    '.ca-nen.mo{opacity:1}' +
    '.ca-hop{position:relative;width:min(400px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#16232A;border-radius:20px;' +
      'box-shadow:0 20px 60px rgba(0,0,0,.25);padding:24px 22px 20px;font-family:Montserrat,"Segoe UI",system-ui,sans-serif;' +
      'transform:translateY(10px) scale(.98);transition:transform .22s cubic-bezier(.22,.9,.3,1)}' +
    '.ca-nen.mo .ca-hop{transform:none}' +
    '.ca-x{position:absolute;top:10px;right:10px;width:34px;height:34px;border:0;border-radius:50%;background:#EEF2F1;color:#5F7370;cursor:pointer;display:grid;place-items:center}' +
    '.ca-hop svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.ca-x svg{width:18px;height:18px}' +
    '.ca-dau{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;margin-bottom:16px}' +
    '.ca-dau img{width:72px;height:72px;border-radius:17px;box-shadow:0 6px 18px rgba(14,124,110,.3)}' +
    '.ca-dau h3{margin:0;font-size:18px;font-weight:800;line-height:1.3}' +
    '.ca-dau p{margin:0;font-size:13.5px;color:#5F7370;line-height:1.5}' +
    '.ca-buoc{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}' +
    '.ca-buoc li{display:flex;align-items:center;gap:12px;background:#F4F8F7;border-radius:14px;padding:11px 12px;font-size:14px;line-height:1.45}' +
    '.ca-so{flex:none;width:26px;height:26px;border-radius:50%;background:#0E7C6E;color:#fff;font-weight:800;font-size:13px;display:grid;place-items:center}' +
    '.ca-ic{display:inline-flex;vertical-align:-5px;width:22px;height:22px;color:#0E7C6E;margin:0 2px}' +
    '.ca-ic svg{width:22px;height:22px}' +
    '.ca-nut{display:block;width:100%;margin-top:16px;border:0;border-radius:14px;background:#0E7C6E;color:#fff;font:800 15px/1 Montserrat,"Segoe UI",system-ui,sans-serif;' +
      'letter-spacing:.04em;padding:15px;cursor:pointer}' +
    '.ca-nut:hover{filter:brightness(1.07)}' +
    '.ca-nut.phu{background:#EEF2F1;color:#16232A;margin-top:8px}' +
    '.ca-ghi{margin:14px 0 0;font-size:12.5px;color:#5F7370;line-height:1.5;text-align:center}' +
    '@media (prefers-reduced-motion:reduce){.ca-nen,.ca-hop{transition:none}}';

  function napCss() {
    if (document.getElementById('caCss')) return;
    var st = document.createElement('style'); st.id = 'caCss'; st.textContent = CSS;
    document.head.appendChild(st);
  }
  function ic(ten) { return '<span class="ca-ic">' + IC[ten] + '</span>'; }
  function buoc(ds) {
    return '<ol class="ca-buoc">' + ds.map(function (b, i) { return '<li><span class="ca-so">' + (i + 1) + '</span><span>' + b + '</span></li>'; }).join('') + '</ol>';
  }
  // CHỈ iPhone: app ngoài màn hình chính có kho nhớ RIÊNG, không chung với Safari. Android/máy tính dùng chung với trình duyệt.
  var GHI_DN = 'Lần đầu mở app, em đăng nhập lại ID Andrew Classes một lần.';

  function noiDung() {
    var dau = function (tieuDe, phu) {
      return '<div class="ca-dau"><img src="' + ICON + '" alt=""><h3>' + tieuDe + '</h3><p>' + phu + '</p></div>';
    };
    var DAU_CHUNG = dau('Cài Andrew Classes vào máy', 'Mở nhanh như một ứng dụng — không cần mở trình duyệt, không cần gõ địa chỉ.');
    if (LA_NHUNG) {
      return dau('Mở bằng trình duyệt trước nhé', 'Em đang xem trong ứng dụng chat (Zalo, Facebook…) — ở đây không cài được app.') +
        buoc(['Bấm ' + ic('chamDoc') + ' ở góc trên màn hình.',
              'Chọn <b>Mở bằng trình duyệt</b> (' + (LA_IOS ? 'Safari' : 'Chrome') + ').',
              'Trong trình duyệt, mở menu ☰ rồi bấm lại <b>Cài app vào máy</b>.']) +
        '<button type="button" class="ca-nut" data-ca-dong>ĐÃ HIỂU</button>';
    }
    if (hoiCai) {
      return DAU_CHUNG + '<button type="button" class="ca-nut" data-ca-cai>CÀI NGAY</button>' +
        '<button type="button" class="ca-nut phu" data-ca-dong>Để sau</button>';
    }
    if (LA_IOS) {
      return DAU_CHUNG +
        buoc(['Bấm nút <b>Chia sẻ</b> ' + ic('chiaSe') + (/iPad/.test(UA) || navigator.maxTouchPoints > 1 && !/iPhone/.test(UA) ? ' ở thanh trên cùng.' : ' ở thanh dưới cùng của Safari.'),
              'Kéo xuống, chọn <b>Thêm vào MH chính</b> ' + ic('themMh') + '.',
              'Bấm <b>Thêm</b> ở góc trên bên phải — icon Andrew Classes hiện trên màn hình chính.']) +
        '<p class="ca-ghi">' + GHI_DN + '</p>' +
        '<button type="button" class="ca-nut" data-ca-dong>ĐÃ HIỂU</button>';
    }
    if (LA_ANDROID) {
      return DAU_CHUNG +
        buoc(['Bấm ' + ic('chamDoc') + ' ở góc trên bên phải Chrome.',
              'Chọn <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào màn hình chính</b>.',
              'Bấm <b>Cài đặt</b> — icon Andrew Classes hiện trên màn hình chính.']) +
        '<button type="button" class="ca-nut" data-ca-dong>ĐÃ HIỂU</button>';
    }
    if (LA_SAFARI_MAC) {
      return DAU_CHUNG +
        buoc(['Trên thanh menu Safari, bấm <b>Tệp</b> (File).', 'Chọn <b>Thêm vào Dock…</b> (Add to Dock).', 'Bấm <b>Thêm</b>.']) +
        '<button type="button" class="ca-nut" data-ca-dong>ĐÃ HIỂU</button>';
    }
    if (LA_FIREFOX) {
      return dau('Firefox chưa cài được app', 'Thầy khuyên mở andrewclasses.com bằng <b>Chrome</b> hoặc <b>Edge</b>, rồi bấm lại <b>Cài app vào máy</b> trong menu ☰.') +
        '<button type="button" class="ca-nut" data-ca-dong>ĐÃ HIỂU</button>';
    }
    // Chrome/Edge máy tính nhưng trình duyệt chưa đưa lời mời cài (đã từ chối trước đó, hoặc trang chưa nạp xong).
    return DAU_CHUNG +
      buoc(['Nhìn cuối <b>thanh địa chỉ</b>, bấm biểu tượng cài đặt ' + ic('caiApp') + '.',
            'Không thấy? Mở menu ' + ic('chamDoc') + ' của trình duyệt → <b>Cài đặt Andrew Classes</b> (Chrome: mục <b>Truyền, lưu và chia sẻ</b>; Edge: mục <b>Ứng dụng</b>).',
            'Bấm <b>Cài đặt</b> — app có icon riêng trên màn hình và thanh tác vụ.']) +
      '<button type="button" class="ca-nut" data-ca-dong>ĐÃ HIỂU</button>';
  }

  function mo() {
    napCss();
    var cu = document.getElementById('caNen'); if (cu) cu.remove();
    var nen = document.createElement('div'); nen.className = 'ca-nen'; nen.id = 'caNen';
    nen.innerHTML = '<div class="ca-hop" role="dialog" aria-modal="true" aria-label="Cài app vào máy">' +
      '<button type="button" class="ca-x" data-ca-dong aria-label="Đóng">' + IC.dong + '</button>' + noiDung() + '</div>';
    function dong() {
      nen.classList.remove('mo'); document.removeEventListener('keydown', phim);
      setTimeout(function () { nen.remove(); }, 200);
    }
    function phim(e) { if (e.key === 'Escape') dong(); }
    nen.addEventListener('click', function (e) {
      if (e.target === nen || e.target.closest('[data-ca-dong]')) { dong(); return; }
      if (e.target.closest('[data-ca-cai]') && hoiCai) {
        var ev = hoiCai; hoiCai = null;
        ev.prompt();
        (ev.userChoice || Promise.resolve({}))['finally'](dong);
      }
    });
    document.addEventListener('keydown', phim);
    document.body.appendChild(nen);
    requestAnimationFrame(function () { nen.classList.add('mo'); });
  }

  // Gắn vào một nút có sẵn: ẩn khi đã mở bằng app, bấm là mở hộp. Menu nào tự dựng nút thì gọi gan() cho nút đó.
  function gan(nut) {
    if (!nut) return;
    nut.setAttribute('data-cai-app', '1');
    if (daCai()) nut.style.display = 'none';   // ⛔ không dùng [hidden]: .sb-item có display:flex đè mất
    nut.addEventListener('click', function () { mo(); });
  }

  window.CaiApp = { daCai: daCai, mo: mo, gan: gan, IC: IC };
})();
