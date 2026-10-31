/* ============================================================
   js/tb-xh2.js — ⭐ 26/10/2026 THÔNG BÁO KHỞI ĐỘNG MÙA 2 · XẾP HẠNG THẾ GIỚI (thông báo kiểu `xh2`).
   Thầy duyệt mẫu `D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\thong-bao-mua2-v3`. Gửi bằng tools/gui-tb-xep-hang-mua2.js.
   js/thong-bao.js gặp thông báo kieu 'xh2' ⇒ ACTbXh2.mo(o):
     o = { tb: thongBao { tenMua, tu, den, saoHang{dong…ht}, gioVang{tu,den,nhan} }, ghi: () ⇒ Promise (đánh dấu đã xem, đường thông báo có sẵn), xong }
     o.trong = phần tử chứa ⇒ vẽ TĨNH (xem trước ở hộp Thông báo dashboard, js/tb-ql.js).
   4 màn trong MỘT thẻ khổ cố định 380×660 thu phóng vừa màn (khuôn thẻ tổng kết Giao hữu Mùa 1) ⇒ KHÔNG BAO GIỜ cuộn; vuốt ngang được.
   Thầy chốt: hiện MỘT lần · màn đầu KHÔNG có X, em bấm TIẾP tới màn cuối · màn cuối mới có X (đóng) + nút PHÂN HẠNG NGAY (mở thẳng sảnh
   nw/xephang.html) · không đóng bằng chạm nền. Lớp CSS tiền tố `xh2-` (tự chèn). ⛔ ES5 (iPad đời cũ).
   ============================================================ */
(function () {
  'use strict';
  if (window.ACTbXh2) return;
  var W = 380, H = 660, SO_MAN = 4;
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var HANG = { an: ['?', '#5E8574', '#2B4A3C', '#13261D'], dong: ['Đồng', '#E7A16B', '#8A4B22', '#5B2E12'], bac: ['Bạc', '#EEF3F7', '#9AA7B4', '#56616E'], vang: ['Vàng', '#FFE08A', '#F0A91E', '#8F5A00'],
    bk: ['Bạch kim', '#B7FFF0', '#2CC9B0', '#0B6B63'], kc: ['Kim cương', '#C8E6FF', '#4DA3FF', '#1E3FA8'], ct: ['Cao thủ', '#E5C9FF', '#A35CFF', '#4B1C8F'], ht: ['Huyền thoại', '#FFD3D8', '#FF4D6A', '#7A0C22'] };
  var _n = 0;
  function hh(k, bac, co) {
    var h = HANG[k], id = 'xh2g' + (++_n), cao = k === 'ct' || k === 'ht';
    return '<span class="xh2-hh" style="width:' + co + 'px;height:' + Math.round(co * 1.1) + 'px"><svg viewBox="0 0 100 110"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + h[1] + '"/><stop offset=".55" stop-color="' + h[2] + '"/><stop offset="1" stop-color="' + h[3] + '"/></linearGradient></defs>' +
      (cao ? '<path d="M14 30 4 14l18 8M86 30l10-16-18 8" fill="' + h[2] + '" stroke="' + h[3] + '" stroke-width="2"/>' : '') +
      (k === 'ht' ? '<path d="M30 18 38 6l12 10 12-10 8 12" fill="#FFD36A" stroke="#8F5A00" stroke-width="2"/>' : '') +
      '<path d="M50 8 88 24v34c0 24-17 40-38 46C29 98 12 82 12 58V24Z" fill="url(#' + id + ')" stroke="' + h[3] + '" stroke-width="3"/>' +
      '<path d="M50 20 76 31v26c0 17-12 29-26 34-14-5-26-17-26-34V31Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>' +
      '<path d="M50 36l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" fill="rgba(255,255,255,.9)"/></svg>' + (bac ? '<i>' + bac + '</i>' : '') + '</span>';
  }
  var IC_DIA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';
  var IC_KIEM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/></svg>';
  function hai(n) { return (n < 10 ? '0' : '') + n; }
  function ngay(ms) { var d = new Date(ms); return hai(d.getDate()) + '/' + hai(d.getMonth() + 1); }
  function gio(ms) { var d = new Date(ms); return hai(d.getHours()) + ':' + hai(d.getMinutes()); }
  function phut(p) { return hai(Math.floor(p / 60)) + ':' + hai(p % 60); }
  function conLai(ms) { ms = Math.max(0, ms); var d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60; return d ? d + ' ngày ' + h + ' giờ' : h + ' giờ ' + m + ' phút'; }

  function napCss() {
    if (document.getElementById('xh2Css')) return;
    if (!document.getElementById('xh2Font')) {
      var l = document.createElement('link'); l.id = 'xh2Font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Saira:ital,wght@0,700;0,800;1,800&family=Be+Vietnam+Pro:wght@500;600;700&display=swap'; document.head.appendChild(l);
    }
    var s = document.createElement('style'); s.id = 'xh2Css';
    s.textContent =
      '.xh2-phu{--n:#3DF58A;--n2:#9BFFC4;--cy:#37D7FF;--cy2:#B4F0FF;--c:#E6FFF1;--m:#8DB9A2;--vg:#FFC94A;--do:#FF5F6D;--vien2:rgba(230,255,241,.10);' +
        '--g:"Saira","Barlow Condensed","Arial Narrow",Arial,sans-serif;--f:"Be Vietnam Pro",Montserrat,system-ui,sans-serif;' +
        'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;background:rgba(3,12,8,.66);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);' +
        'transition:opacity .45s;font-family:var(--f);-webkit-tap-highlight-color:transparent;color:var(--c)}' +
      '.xh2-phu *{box-sizing:border-box;margin:0;padding:0}.xh2-phu.xh2-tat{opacity:0;pointer-events:none}' +
      '.xh2-phu.xh2-trong{position:absolute;z-index:auto;-webkit-backdrop-filter:none;backdrop-filter:none;pointer-events:none}' +
      '.xh2-co{width:380px;height:660px;flex:none;transform-origin:50% 50%}' +
      '.xh2-the{position:relative;width:380px;height:660px;border-radius:28px;overflow:hidden;display:flex;flex-direction:column;' +
        'background:radial-gradient(120% 70% at 50% 0%,#0F3A28 0%,#0A2418 40%,#020A06 100%);box-shadow:0 30px 80px rgba(0,0,0,.6),inset 0 0 0 1px rgba(61,245,138,.25);animation:xh2-vao .5s cubic-bezier(.2,1.3,.4,1)}' +
      '.xh2-trong .xh2-the{animation:none}@keyframes xh2-vao{from{transform:scale(.86);opacity:0}}' +
      '.xh2-x{position:absolute;top:14px;right:14px;z-index:5;width:36px;height:36px;border-radius:50%;border:1px solid rgba(230,255,241,.18);background:rgba(0,0,0,.35);color:var(--c);display:grid;place-items:center;font:600 18px/1 var(--f);cursor:pointer}' +
      '.xh2-cham{position:absolute;top:28px;left:22px;display:flex;gap:6px;z-index:5}.xh2-cham i{width:18px;height:4px;border-radius:3px;background:rgba(230,255,241,.18)}.xh2-cham i.on{background:var(--n);box-shadow:0 0 8px var(--n)}' +
      '.xh2-man{flex:1;display:none;flex-direction:column;padding:62px 22px 0;min-height:0}.xh2-man.mo{display:flex;animation:xh2-truot .35s cubic-bezier(.22,.9,.3,1)}' +
      '@keyframes xh2-truot{from{opacity:0;transform:translateX(24px)}}' +
      '.xh2-chan{padding:14px 22px 20px;display:flex;gap:8px}' +
      '.xh2-nut{flex:1;border:0;border-radius:14px;padding:15px 10px;background:linear-gradient(180deg,#5BFFA0,#22C46C);color:#03150C;font:italic 800 18px/1 var(--g);letter-spacing:.06em;cursor:pointer;' +
        'box-shadow:0 0 22px rgba(61,245,138,.4),inset 0 -3px 0 rgba(0,0,0,.18)}.xh2-nut:disabled{opacity:.6}' +
      '.xh2-nut.phu{flex:none;width:56px;background:rgba(230,255,241,.08);color:var(--c);box-shadow:none;font-style:normal}' +
      '.xh2-bao{text-align:center;font-size:12px;color:#FFC2C8;padding:0 22px;min-height:0}' +
      '.xh2-dau{display:flex;align-items:center;gap:10px}' +
      '.xh2-mua{display:inline-flex;align-items:center;font:800 11px/1 var(--g);letter-spacing:.2em;color:#03150C;background:var(--vg);border-radius:6px;padding:6px 9px}' +
      '.xh2-game{font:800 11px/1 var(--g);letter-spacing:.24em;color:var(--n2)}' +
      '.xh2-the h2{margin-top:10px;font:italic 800 46px/.92 var(--g);letter-spacing:.01em;text-shadow:0 0 22px rgba(61,245,138,.45)}.xh2-the h2 em{font-style:inherit;color:var(--n2)}' +
      '.xh2-phude{margin-top:10px;color:var(--m);font-size:14px;line-height:1.45}' +
      '.xh2-the h3{font:italic 800 26px/1 var(--g);letter-spacing:.03em}.xh2-the h3 small{display:block;font:600 13px/1.4 var(--f);font-style:normal;color:var(--m);margin-top:6px;letter-spacing:0}' +
      '.xh2-hero{align-self:center;margin:8px 0 2px;position:relative}.xh2-hero::before{content:"";position:absolute;inset:-30px;background:radial-gradient(circle,rgba(61,245,138,.25),transparent 65%);z-index:-1}' +
      '.xh2-hh{display:inline-grid;place-items:center;position:relative;flex:none}.xh2-hh svg{display:block;width:100%;height:100%;overflow:visible}' +
      '.xh2-hh i{position:absolute;bottom:13%;font:italic 800 11px/1 var(--g);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8)}' +
      '.xh2-y3{display:flex;flex-direction:column;gap:6px;margin-top:10px}' +
      '.xh2-y3>div{display:grid;grid-template-columns:36px 1fr;gap:10px;align-items:center;padding:9px 12px;border-radius:12px;background:rgba(230,255,241,.05);border:1px solid var(--vien2);font-size:13.5px;line-height:1.4}' +
      '.xh2-y3>div>span{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:18px;background:rgba(61,245,138,.12)}' +
      '.xh2-ngay{margin-top:auto;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,201,74,.35);background:linear-gradient(90deg,rgba(255,201,74,.14),rgba(255,201,74,.03))}' +
      '.xh2-ngay small{display:block;color:var(--m);font-size:11.5px}.xh2-ngay b{font:800 15px/1.2 var(--g);color:var(--vg)}.xh2-ngay .xh2-dem{text-align:right;font:800 16px/1.1 var(--g)}' +
      '.xh2-thang{display:flex;flex-direction:column;gap:5px;margin-top:12px}' +
      '.xh2-thang>div{display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;padding:6px 10px;border-radius:11px;background:rgba(230,255,241,.04);border:1px solid var(--vien2)}' +
      '.xh2-thang b{font:800 16px/1.1 var(--g)}.xh2-thang small{display:block;font:600 11.5px/1.3 var(--f);color:var(--m)}' +
      '.xh2-thang .xh2-d{font:700 12px/1 var(--g);color:var(--m);text-align:right}.xh2-thang .xh2-d u{display:block;text-decoration:none;font-size:10.5px;color:var(--cy2);margin-top:3px}' +
      '.xh2-diem{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px}.xh2-diem>div{text-align:center;padding:8px 4px;border-radius:10px;background:rgba(230,255,241,.05)}' +
      '.xh2-diem b{display:block;font:800 17px/1.1 var(--g)}.xh2-diem small{font-size:11px;color:var(--m)}' +
      '.xh2-thuong{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:14px}' +
      '.xh2-thuong>div{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:center;padding:9px 10px;border-radius:12px;background:rgba(230,255,241,.05);border:1px solid var(--vien2)}' +
      '.xh2-thuong>div.ht{grid-column:1/-1;border-color:rgba(255,77,106,.45);background:linear-gradient(90deg,rgba(255,77,106,.14),rgba(0,0,0,.1))}' +
      '.xh2-thuong .xh2-hh{grid-row:span 2}.xh2-thuong b{font:800 15px/1 var(--g)}.xh2-thuong em{font:800 16px/1 var(--g);font-style:normal;color:var(--vg)}' +
      '.xh2-chuy{margin-top:12px;font-size:12.5px;line-height:1.4;color:var(--m);display:grid;grid-template-columns:20px 1fr;gap:6px}.xh2-chuy b{color:var(--c)}' +
      '.xh2-buoc{display:flex;flex-direction:column;gap:10px;margin-top:14px}' +
      '.xh2-b1{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start}' +
      '.xh2-b1>i{width:30px;height:30px;border-radius:50%;background:var(--n);color:#03150C;display:grid;place-items:center;font:800 15px/1 var(--g);font-style:normal}' +
      '.xh2-b1 p{margin:4px 0 6px;font-size:13.5px;line-height:1.4}' +
      '.xh2-go{display:flex;gap:6px;align-items:center;padding:6px;border-radius:999px;background:#fff;width:100%}.xh2-go span{flex:1;height:28px;border-radius:999px;background:#EEF2F1}' +
      '.xh2-go .k{width:30px;height:30px;border-radius:50%;background:#16232A;color:#9BFFC4;display:grid;place-items:center;box-shadow:0 0 0 3px rgba(61,245,138,.6);animation:xh2-tho 1.6s infinite}' +
      '.xh2-go .k svg{width:16px;height:16px}.xh2-go .s{width:30px;height:30px;border-radius:50%;background:#3E7BFA}' +
      '@keyframes xh2-tho{50%{box-shadow:0 0 0 7px rgba(61,245,138,.12),0 0 20px rgba(61,245,138,.8)}}' +
      '.xh2-mthe{border-radius:12px;padding:10px;background:linear-gradient(135deg,#0E3A25,#04140B);border:1.5px solid var(--n);display:flex;align-items:center;gap:10px;box-shadow:0 0 16px rgba(61,245,138,.3)}' +
      '.xh2-mthe .ic{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#1DE07A,#8CFFBF);color:#04200F;display:grid;place-items:center;flex:none}.xh2-mthe .ic svg{width:19px;height:19px}' +
      '.xh2-mthe b{display:block;font:italic 800 17px/1 var(--g);color:var(--n2)}.xh2-mthe small{font-size:10.5px;color:#A9D8BF}' +
      '.xh2-h3b{display:flex;align-items:center;gap:10px}.xh2-h3b p{margin:4px 0;flex:1}' +
      '.xh2-tim{flex:none;border-radius:9px;padding:8px 10px;border:1.5px solid rgba(61,245,138,.55);background:rgba(61,245,138,.1);color:var(--n2);font:italic 800 13px/1 var(--g);letter-spacing:.06em;white-space:nowrap}' +
      '@media (prefers-reduced-motion:reduce){.xh2-phu *{animation:none!important;transition:none!important}}';
    document.head.appendChild(s);
  }

  // suất 4 hạng cao (26/10): mặc định HT top 1 ≥1800 · CT 2–3 ≥1600 · KC 4–6 ≥1400 · BK 7–12 ≥1100 (thông báo mang t.suat của mùa)
  function viTri(suat) {
    var ds = Array.isArray(suat) && suat.length ? suat : [{ t: 'ht', n: 1, san: 1800 }, { t: 'ct', n: 2, san: 1600 }, { t: 'kc', n: 3, san: 1400 }, { t: 'bk', n: 6, san: 1100 }];
    var o = { n: {} }, i = 0; ds.forEach(function (x) { o[x.t] = x.n > 1 ? (i + 1) + '–' + (i + x.n) : String(i + 1); o[x.t + 'San'] = x.san; o.n[x.t] = x.n; i += x.n; }); o.tong = i; return o;
  }
  function manHtml(t, i) {
    var b = Date.now(), sap = b < (t.tu || 0), mua = E(t.tenMua || 'Mùa 2'), sao = t.saoHang || {}, g = t.gioVang || {}, v = viTri(t.suat);
    if (i === 0) return '<div class="xh2-dau"><span class="xh2-mua">★ ' + mua.toUpperCase() + '</span><span class="xh2-game">A SHOW SPEED</span></div><h2>XẾP HẠNG<br><em>THẾ GIỚI</em></h2>' +
      '<p class="xh2-phude">Thi đấu xếp hạng với các đối thủ từ nhiều lớp khác.</p><div class="xh2-hero">' + hh('kc', 'I', 64) + '</div>' +
      '<div class="xh2-y3"><div><span>⚔</span><div><b>Đấu 1–1</b> với bạn <b>cùng hạng</b> ở mọi lớp</div></div><div><span>🏆</span><div><b>7 hạng</b> từ Đồng đến Huyền thoại</div></div>' +
      '<div><span>⭐</span><div><b>' + v.tong + ' suất</b> Bạch kim trở lên cho top đầu</div></div></div>' +
      (t.tu ? '<div class="xh2-ngay"><div><small>' + mua + (sap ? ' mở lúc' : ' kết thúc') + '</small><b>' + gio(sap ? t.tu : t.den) + ' · ' + ngay(sap ? t.tu : t.den) + '</b></div><div class="xh2-dem">' + conLai((sap ? t.tu : t.den) - b) + '<small>' + (sap ? 'nữa' : 'còn lại') + '</small></div></div>' : '');
    if (i === 1) return '<h3>7 HẠNG<small>Đồng–Vàng theo điểm · 4 hạng trên chỉ <b style="color:var(--c)">' + v.tong + ' suất</b></small></h3><div class="xh2-thang">' +
      [['ht', 'Top đầu toàn giải', 'Top ' + v.ht, '≥' + v.htSan + ' điểm'], ['ct', '', 'Top ' + v.ct, '≥' + v.ctSan + ' điểm'], ['kc', '', 'Top ' + v.kc, '≥' + v.kcSan + ' điểm'], ['bk', '', 'Top ' + v.bk, '≥' + v.bkSan + ' điểm'],
        ['vang', 'Mốc an toàn', '800', 'A2'], ['bac', '', '300', 'A1–A2'], ['dong', 'Thua không mất điểm', '0', 'A1']].map(function (x) {
        return '<div>' + hh(x[0], '', 30) + '<div><b style="color:' + HANG[x[0]][1] + '">' + HANG[x[0]][0] + '</b>' + (x[1] ? '<small>' + x[1] + '</small>' : '') + '</div><span class="xh2-d">' + x[2] + '<u>' + x[3] + '</u></span></div>';
      }).join('') + '</div><div class="xh2-diem"><div><b style="color:var(--n)">▲</b><small>Thắng</small></div><div><b>＝</b><small>Hòa</small></div><div><b style="color:var(--do)">▼</b><small>Thua</small></div></div>';   // 27/10 thầy: không ghi số điểm từng trận
    if (i === 2) return '<h3>PHẦN THƯỞNG<small>Bạch kim trở lên: theo <b style="color:var(--c)">thứ hạng lúc hết mùa</b>. Đồng · Bạc · Vàng: theo điểm cao nhất. Đấu 1 trận là có quà.</small></h3><div class="xh2-thuong">' +
      ['ht', 'ct', 'kc', 'bk', 'vang', 'bac', 'dong'].map(function (k) { return '<div' + (k === 'ht' ? ' class="ht"' : '') + '>' + hh(k, '', k === 'ht' ? 40 : 32) + '<b>' + HANG[k][0] + '</b><em>+' + (sao[k] || 0) + ' ⭐</em></div>'; }).join('') + '</div>' +
      '<div class="xh2-chuy">' + (g.nhan > 1 ? '<span>⚡</span><span><b>Giờ vàng ' + phut(g.tu) + '–' + phut(g.den) + '</b>: điểm cộng ×' + String(g.nhan).replace('.', ',') + '</span>' : '') +
      '<span>🔥</span><span><b>3 trận thắng liền</b>: được thêm điểm</span><span>🚪</span><span>Bỏ trận giữa chừng: <b>thua</b> và khoá 2 phút</span></div>';
    return '<h3>CÁCH THAM GIA<small>Vào đấu ngay trong ô tin nhắn của lớp.</small></h3><div class="xh2-buoc">' +
      '<div class="xh2-b1"><i>1</i><div><p>Bấm nút <b>⚔</b> cạnh ô tin nhắn</p><div class="xh2-go"><span></span><b class="k">' + IC_KIEM + '</b><b class="s"></b></div></div></div>' +
      '<div class="xh2-b1"><i>2</i><div><p>Chọn <b>Xếp hạng thế giới</b></p><div class="xh2-mthe"><span class="ic">' + IC_DIA + '</span><div><b>XẾP HẠNG THẾ GIỚI</b><small>Thi đấu với đối thủ từ nhiều lớp khác</small></div></div></div></div>' +
      '<div class="xh2-b1"><i>3</i><div class="xh2-h3b"><p>Bấm <b>TÌM TRẬN</b> — đấu 5 trận phân hạng để máy xếp hạng cho em</p><span class="xh2-tim">TÌM TRẬN</span></div></div></div>';
  }

  function mo(o) {
    napCss();
    var t = o.tb || {}, man = o.man || 0;
    var nen = document.createElement('div'); nen.className = 'xh2-phu' + (o.trong ? ' xh2-trong' : '');
    if (!o.trong) { nen.setAttribute('role', 'dialog'); nen.setAttribute('aria-modal', 'true'); nen.setAttribute('aria-label', 'Thông báo Xếp hạng thế giới'); }
    nen.innerHTML = '<div class="xh2-co"><div class="xh2-the"><div class="xh2-cham"></div><div class="xh2-xo"></div>' +
      [0, 1, 2, 3].map(function (i) { return '<section class="xh2-man" data-i="' + i + '">' + manHtml(t, i) + '</section>'; }).join('') +
      '<p class="xh2-bao" role="alert"></p><div class="xh2-chan"></div></div></div>';
    (o.trong || document.body).appendChild(nen);
    var co = nen.querySelector('.xh2-co');
    function vua() {
      var w = o.trong ? (o.trongW || 375) : window.innerWidth, h = o.trong ? (o.trongH || 812) : window.innerHeight;
      co.style.transform = 'scale(' + Math.min(1.25, (w - 20) / W, (h - 20) / H).toFixed(4) + ')';
    }
    vua();
    if (o.trong) { ve(); return nen; }
    window.addEventListener('resize', vua);
    var dangGhi = false;
    function ve() {
      var cuoi = man === SO_MAN - 1;
      [].forEach.call(nen.querySelectorAll('.xh2-man'), function (m) { m.classList.toggle('mo', +m.getAttribute('data-i') === man); });
      nen.querySelector('.xh2-cham').innerHTML = [0, 1, 2, 3].map(function (i) { return '<i' + (i === man ? ' class="on"' : '') + '></i>'; }).join('');
      nen.querySelector('.xh2-xo').innerHTML = cuoi && !o.trong ? '<button type="button" class="xh2-x" data-k="x" aria-label="Đóng">✕</button>' : '';
      nen.querySelector('.xh2-chan').innerHTML = (man ? '<button type="button" class="xh2-nut phu" data-k="lui" aria-label="Lùi">‹</button>' : '') +
        '<button type="button" class="xh2-nut" data-k="' + (cuoi ? 'vao' : 'tiep') + '">' + (cuoi ? 'PHÂN HẠNG NGAY' : 'TIẾP') + '</button>';
    }
    function ket(diTiep) {
      if (dangGhi) return; dangGhi = true;
      var bao = nen.querySelector('.xh2-bao'); bao.textContent = '';
      [].forEach.call(nen.querySelectorAll('.xh2-chan button, .xh2-x'), function (b) { b.disabled = true; });
      var p = o.ghi ? o.ghi() : Promise.resolve();
      p.then(function () { dong(diTiep); }, function (er) {
        if (er && er.daXong) return dong(diTiep);
        dangGhi = false; ve(); bao.textContent = (er && er.chu) || 'Chưa gửi được (mạng yếu?) — em bấm lại nhé.';
      });
    }
    function dong(diTiep) {
      window.removeEventListener('resize', vua);
      if (diTiep) { location.href = (/\/nw\//.test(location.pathname) ? '' : 'nw/') + 'xephang.html'; return; }
      nen.classList.add('xh2-tat');
      setTimeout(function () { nen.remove(); if (o.xong) o.xong(); }, 480);
    }
    nen.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b || b.disabled) return;
      var k = b.getAttribute('data-k');
      if (k === 'tiep') { man = Math.min(SO_MAN - 1, man + 1); ve(); }
      else if (k === 'lui') { man = Math.max(0, man - 1); ve(); }
      else if (k === 'x') ket(false);
      else if (k === 'vao') ket(true);
    });
    var x0 = null;
    nen.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    nen.addEventListener('touchend', function (e) {
      if (x0 == null || dangGhi) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) { man = Math.max(0, Math.min(SO_MAN - 1, man + (dx < 0 ? 1 : -1))); ve(); }
    });
    ve();
    try { nen.querySelector('[data-k]').focus(); } catch (e) { }
    return nen;
  }
  window.ACTbXh2 = { mo: mo };
})();
