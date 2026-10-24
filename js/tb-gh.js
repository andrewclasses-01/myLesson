/* ============================================================
   js/tb-gh.js — ⭐ v1.418.0 (24/10/2026) THẺ TỔNG KẾT GIAO HỮU A SHOW SPEED MÙA 1 (thông báo kiểu `gh1`).
   Thầy duyệt mẫu `D:\OTHERS\CLAUDE\THONG BAO GIAO HUU MUA 1 - thiet ke\mau-v2`. Gửi bằng tools/gui-tb-giao-huu-mua1.js.
   js/thong-bao.js gặp thông báo kieu 'gh1' ⇒ ACTbGh.mo(o):
     o = { tb: thongBao (gh.cham / gh.thang top 10, gh.thangSao, gh.bac, gh.bacMax), p: phiếu tbNhan của em (so, sao, gh = thành tích riêng),
           anh: ảnh em (#nutMenu), ghi: () ⇒ Promise (đánh dấu đã nhận + phiếu sao, đường thông báo có sẵn), xong: () ⇒ hiện thông báo kế }
   3 màn trong MỘT thẻ khổ cố định 380×660 (như pop-up 20-10) thu phóng vừa màn ⇒ KHÔNG BAO GIỜ cuộn:
     ① 10 chiến binh chăm chỉ (huy hiệu) ② 10 cao thủ thắng nhiều (+5 ⭐) ③ phần thưởng của em + NHẬN THƯỞNG (sao bay vào avatar như pop-up 20-10).
   ⛔ KHÔNG hiện tổng số trận / số người (thầy chốt). Lớp CSS tiền tố `ghk-` (tự chèn). ⛔ ES5 (iPad đời cũ).
   ============================================================ */
(function () {
  'use strict';
  if (window.ACTbGh) return;
  var W = 380, H = 660;
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var GOC = window.AC_GOC_DL || '';
  var SAO = '<svg viewBox="0 0 24 24"><path fill="#FFD84D" stroke="#E8A400" d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>';
  var KIEM = '<svg viewBox="0 0 24 24"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/></svg>';

  function napCss() {
    if (document.getElementById('ghkCss')) return;
    if (!document.getElementById('ghkFont')) {
      var l = document.createElement('link'); l.id = 'ghkFont'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800;1,900&display=swap'; document.head.appendChild(l);
    }
    var s = document.createElement('style'); s.id = 'ghkCss';
    s.textContent =
      '.ghk-phu{--n:#3DF58A;--n2:#9BFFC4;--c:#E6FFF1;--m:rgba(230,255,241,.66);--v:#FFD84D;--cd:"Barlow Condensed",Montserrat,sans-serif;--f:Montserrat,system-ui,sans-serif;' +
        'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;background:radial-gradient(120% 80% at 50% 30%,rgba(61,245,138,.22),rgba(2,10,6,.86));' +
        '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:opacity .5s;font-family:var(--f);-webkit-tap-highlight-color:transparent}' +
      '.ghk-phu *{box-sizing:border-box;margin:0;padding:0}.ghk-phu.tbp-tat{opacity:0;pointer-events:none}' +
      '.ghk-phu.ghk-trong{position:absolute;z-index:auto;-webkit-backdrop-filter:none;backdrop-filter:none;pointer-events:none}.ghk-trong .tbp-the.ghk{animation:none}' +
      '.ghk-co{width:380px;height:660px;flex:none;transform-origin:50% 50%}' +
      '.ghk-phu .tbp-the.ghk{position:relative;width:380px;max-width:none;height:660px;max-height:none;border-radius:28px;overflow:hidden;color:var(--c);display:flex;flex-direction:column;' +
        'background:radial-gradient(130% 55% at 50% 0%,rgba(61,245,138,.26),transparent 62%),radial-gradient(120% 90% at 50% 30%,#0A2418 0%,#04110B 60%,#020A06 100%);' +
        'box-shadow:0 30px 80px -20px rgba(61,245,138,.45),0 0 0 1px rgba(61,245,138,.25) inset;animation:ghk-vao .7s cubic-bezier(.22,.9,.3,1) both}' +
      '.ghk-phu .tbp-the.ghk.tbp-di{animation:tbp-di .55s cubic-bezier(.6,0,.4,1) forwards}' +
      '@keyframes ghk-vao{from{opacity:0;transform:translateY(30px) scale(.9)}}' +
      '.ghk::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;background:repeating-linear-gradient(115deg,transparent 0 46px,rgba(61,245,138,.035) 46px 48px)}' +
      '.ghk-dau{position:relative;flex:none;padding:16px 20px 0}' +
      '.ghk-brand{display:flex;align-items:center;gap:7px;font:800 9.5px/1 var(--f);letter-spacing:.22em;color:var(--n2)}' +
      '.ghk-brand svg{width:14px;height:14px;stroke:var(--n);fill:none;stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round}' +
      '.ghk-cham{margin-left:auto;display:flex;gap:4px}.ghk-cham i{width:18px;height:4px;border-radius:2px;transform:skewX(-20deg);background:rgba(61,245,138,.2)}.ghk-cham i.on{background:var(--n);box-shadow:0 0 8px var(--n)}' +
      '.ghk-t{margin-top:9px;font:900 italic 31px/1 var(--cd);text-transform:uppercase;letter-spacing:.01em;color:#fff;text-shadow:0 0 22px rgba(61,245,138,.55)}.ghk-t em{font-style:inherit;color:var(--n)}' +
      '.ghk-pill{display:inline-flex;margin-top:7px;padding:4px 11px;transform:skewX(-12deg);background:rgba(61,245,138,.12);border:1px solid rgba(61,245,138,.5);border-radius:4px;font:800 11px/1.25 var(--f);color:var(--n2)}.ghk-pill>span{display:inline-block;transform:skewX(12deg)}' +
      '.ghk-buc{position:relative;flex:none;display:grid;grid-template-columns:1fr 1.18fr 1fr;align-items:end;gap:7px;padding:26px 14px 0}' +
      '.ghk-c{position:relative;text-align:center;padding:10px 4px 9px;border-radius:14px;background:linear-gradient(180deg,rgba(61,245,138,.14),rgba(61,245,138,.03));border:1px solid rgba(61,245,138,.22);min-width:0}' +
      '.ghk-c.h1{padding-top:14px;background:linear-gradient(180deg,rgba(255,216,77,.22),rgba(61,245,138,.05));border-color:rgba(255,216,77,.55);box-shadow:0 0 24px rgba(255,216,77,.12)}' +
      '.ghk-c.toi{border-color:var(--n);box-shadow:0 0 0 1.5px var(--n),0 0 22px rgba(61,245,138,.55)}' +
      '.ghk-hc{position:absolute;top:-13px;left:50%;transform:translateX(-50%);font-size:21px;line-height:1}' +
      '.ghk-c .ghk-ten{margin-top:6px;font:800 12px/1.15 var(--f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.ghk-c .ghk-so{margin-top:4px;font:900 italic 25px/1 var(--cd);color:var(--n);text-shadow:0 0 14px rgba(61,245,138,.5)}.ghk-c.h1 .ghk-so{color:var(--v);text-shadow:0 0 14px rgba(255,216,77,.45)}' +
      '.ghk-so small{font:800 9.5px var(--f);font-style:normal;color:var(--m);margin-left:2px}' +
      '.ghk-c .ghk-phu2{margin-top:3px;font:600 9.5px/1.25 var(--f);color:var(--m);white-space:nowrap}' +
      '.ghk-luoi{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 14px 0}' +
      '.ghk-o{position:relative;display:flex;align-items:center;gap:6px;height:56px;padding:0 8px 0 5px;border-radius:11px;background:rgba(61,245,138,.07);border:1px solid rgba(61,245,138,.14);overflow:hidden;min-width:0}' +
      '.ghk-o .ghk-h{width:13px;flex:none;text-align:center;font:900 italic 16px/1 var(--cd);color:rgba(230,255,241,.5)}' +
      '.ghk-o .ghk-g{flex:1;min-width:0}.ghk-o .ghk-ten{font:800 11px/1.15 var(--f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.ghk-o .ghk-phu2{margin-top:2px;display:flex;align-items:center;gap:4px;font:600 9px/1 var(--f);color:var(--m);white-space:nowrap}' +
      '.ghk-o .ghk-so{flex:none;text-align:right;font:900 italic 18px/1 var(--cd);color:var(--n)}.ghk-o .ghk-so small{display:block;font:700 8.5px/1.1 var(--f);font-style:normal;color:var(--m);margin:0}' +
      '.ghk-o .ghk-vach{position:absolute;left:0;bottom:0;height:2px;background:var(--n);opacity:.55}' +
      '.ghk-o.toi{background:linear-gradient(90deg,rgba(61,245,138,.28),rgba(61,245,138,.08));border-color:var(--n);box-shadow:0 0 14px rgba(61,245,138,.35)}.ghk-o.em{border-style:dashed}' +
      '.ghk-o.trong{justify-content:center;font:800 10px var(--f);color:var(--m);letter-spacing:.1em}' +
      '.ghk-lop{display:inline-block;padding:1.5px 5px;border-radius:4px;background:rgba(61,245,138,.16);color:var(--n2);font:800 8.5px/1.3 var(--f);letter-spacing:.02em;white-space:nowrap}.ghk-c .ghk-lop{margin-top:4px}' +
      '.ghk-tag{display:inline-block;margin-left:4px;padding:1px 5px;border-radius:4px;background:var(--n);color:#03150C;font:900 8.5px/1.3 var(--f);vertical-align:1px}' +
      '.ghk-av{position:relative;flex:none;display:grid;place-items:center;border-radius:50%;overflow:hidden;color:#03150C;font-weight:900;background:var(--n);box-shadow:0 0 0 2px rgba(61,245,138,.55);margin:0 auto}' +
      '.ghk-o .ghk-av{margin:0}.ghk-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
      '.ghk-avk{position:relative;display:inline-block}.ghk-avk .ghk-hh{position:absolute;right:-5px;bottom:-3px;line-height:0}' +
      '.ghk-c.h1 .ghk-av{box-shadow:0 0 0 2.5px var(--v),0 0 18px rgba(255,216,77,.5)}' +
      '.ghk-chan{margin-top:auto;flex:none;display:flex;gap:8px;padding:12px 16px 16px}' +
      '.ghk-nut{flex:1;height:46px;border:0;border-radius:12px;cursor:pointer;font:900 italic 19px/1 var(--cd);letter-spacing:.07em;text-transform:uppercase;color:#03150C;' +
        'background:linear-gradient(180deg,#7DFFB6,#22D877);box-shadow:0 0 22px rgba(61,245,138,.45),inset 0 1px 0 rgba(255,255,255,.55)}' +
      '.ghk-nut.lui{flex:none;width:86px;background:transparent;border:1.5px solid rgba(61,245,138,.55);color:var(--n2);box-shadow:none}' +
      '.ghk-nut.vang{background:linear-gradient(180deg,#FFE680,#F2B300);box-shadow:0 0 22px rgba(255,216,77,.45),inset 0 1px 0 rgba(255,255,255,.6)}.ghk-nut:disabled{opacity:.6}' +
      '.ghk-kl{flex:none;display:flex;align-items:center;gap:14px;padding:16px 20px 0}.ghk-kl .ghk-av{margin:0;box-shadow:0 0 0 3px var(--n),0 0 26px rgba(61,245,138,.55)}' +
      '.ghk-kl .ghk-ten{font:900 italic 27px/1 var(--cd);color:#fff}' +
      '.ghk-chip{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.ghk-chip span{padding:3px 7px;border-radius:5px;background:rgba(61,245,138,.1);font:700 10px/1.2 var(--f);color:var(--m)}.ghk-chip b{color:#fff}' +
      '.ghk-the{flex:none;margin:9px 16px 0;padding:10px 12px;border-radius:13px;background:rgba(61,245,138,.07);border:1px solid rgba(61,245,138,.18)}' +
      '.ghk-the .ghk-tr{display:flex;align-items:center;gap:9px}.ghk-the .ghk-ic{width:30px;height:30px;flex:none;border-radius:9px;display:grid;place-items:center;font-size:16px;background:rgba(61,245,138,.14)}' +
      '.ghk-the .ghk-g{flex:1;min-width:0}.ghk-the b{display:block;font:800 12.5px/1.2 var(--f)}.ghk-the small{display:block;margin-top:2px;font:600 10px/1.3 var(--f);color:var(--m)}' +
      '.ghk-the .ghk-sao{flex:none;font:900 italic 25px/1 var(--cd);color:var(--v)}.ghk-the.khong{opacity:.5}.ghk-the.khong .ghk-sao{color:var(--m)}' +
      '.ghk-bac{display:grid;grid-template-columns:repeat(10,1fr);gap:3px;margin-top:8px}' +
      '.ghk-bac i{height:20px;border-radius:4px;transform:skewX(-12deg);background:rgba(61,245,138,.1);font:800 8px/20px var(--f);font-style:normal;text-align:center;color:rgba(230,255,241,.45)}' +
      '.ghk-bac i.co{background:linear-gradient(180deg,#7DFFB6,#22D877);color:#03150C}.ghk-bac i.toi{outline:1.5px solid #fff;outline-offset:1px}' +
      '.ghk-hhk{flex:none;display:flex;align-items:center;gap:12px;margin:9px 16px 0;padding:10px 12px;border-radius:13px;background:radial-gradient(120% 140% at 0% 50%,rgba(255,216,77,.22),rgba(61,245,138,.05));border:1px solid rgba(255,216,77,.45)}' +
      '.ghk-hhk b{display:block;font:900 italic 18px/1.05 var(--cd);text-transform:uppercase;color:var(--v)}.ghk-hhk small{display:block;margin-top:3px;font:600 10px/1.35 var(--f);color:var(--m)}' +
      '.ghk-hhk .ghk-xem{display:inline-flex;align-items:center;gap:4px;margin-top:5px;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,.3);font:800 11px var(--f);color:#fff}' +
      '.ghk-tong{flex:none;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;font:800 11px var(--f);color:var(--m);letter-spacing:.08em;text-transform:uppercase}' +
      '.ghk-tong b{font:900 italic 40px/1 var(--cd);color:var(--v);letter-spacing:0;text-shadow:0 0 22px rgba(255,216,77,.5)}.ghk-tong svg{width:28px;height:28px}' +
      '.ghk-dv{flex:none;margin:14px 16px 0;padding:14px;border-radius:13px;background:rgba(61,245,138,.07);text-align:center;font:600 12px/1.55 var(--f);color:var(--m)}.ghk-dv b{color:#fff}' +
      '.ghk-bao{min-height:14px;text-align:center;font:700 11px var(--f);color:#FFB4A8;padding:0 16px}' +
      '.ghk-hhn{display:inline-block;vertical-align:-0.08em;margin-left:3px;flex:none}';
    document.head.appendChild(s);
  }

  // ── HUY HIỆU "Chiến binh A Show Speed · Mùa 1" (cùng hình với js/huy-hieu.js) ──
  var _i = 0;
  function huyHieu(w, lon) {
    var id = 'ghk' + (++_i), h = Math.round(w * (lon ? 1.18 : 1.12));
    return '<svg class="ghk-hhn" width="' + w + '" height="' + h + '" viewBox="0 0 64 ' + (lon ? 76 : 72) + '" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0A0"/><stop offset=".5" stop-color="#FFC531"/><stop offset="1" stop-color="#D88A00"/></linearGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E3A25"/><stop offset="1" stop-color="#03150C"/></linearGradient></defs>' +
      '<path d="M32 3 57 12v20c0 17-11 29-25 36C18 61 7 49 7 32V12z" fill="url(#' + id + 'a)" stroke="#FFF6CC" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M32 10 51 17v15c0 13-8 22.5-19 28.5C21 54.5 13 45 13 32V17z" fill="url(#' + id + 'b)"/>' +
      '<path d="M36 15 22 38h9l-4 17 15-25h-9z" fill="#C9FFE0" stroke="#3DF58A" stroke-width="1.6" stroke-linejoin="round"/>' +
      (lon ? '<g fill="#FFE57A"><path d="M14 4l1.3 2.7 3 .3-2.3 2 .7 2.9L14 10.4l-2.7 1.5.7-2.9-2.3-2 3-.3z"/><path d="M50 4l1.3 2.7 3 .3-2.3 2 .7 2.9L50 10.4l-2.7 1.5.7-2.9-2.3-2 3-.3z"/></g>' +
        '<rect x="12" y="58" width="40" height="15" rx="4" fill="#12B866" stroke="#FFF6CC" stroke-width="1.5"/><text x="32" y="69" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="900" font-size="9" fill="#fff" letter-spacing="1">MÙA 1</text>' : '') + '</svg>';
  }
  function hhTen(h) { return huyHieu(Math.max(8, Math.round(h / 1.12))); }
  function av(e, d, src) {
    var chu = String(e.ten || '?').trim().split(/\s+/).slice(-2).map(function (t) { return t.charAt(0); }).join('').toUpperCase();
    var u = src || (e.anh ? GOC + e.anh : '');
    return '<span class="ghk-av" style="width:' + d + 'px;height:' + d + 'px;font-size:' + Math.round(d * .36) + 'px">' + E(chu) + (u ? '<img src="' + E(u) + '" alt="" onerror="this.remove()">' : '') + '</span>';
  }
  function lop(e) { return '<span class="ghk-lop">' + E(e.lop) + '</span>'; }

  function mo(o) {
    napCss();
    var g = (o.tb && o.tb.gh) || {}, DS = { cham: g.cham || [], thang: g.thang || [] }, my = (o.p && o.p.gh) || {};
    var THANG_SAO = g.thangSao || 5, BAC = g.bac || 10, BAC_MAX = g.bacMax || 10, SO = String(o.p.so || '');
    var TOI = { so: SO, ten: my.ten || ACTbPopTen(o.p.t), lop: o.p.lop || '', anh: '', n: my.n || 0, T: my.T || 0, H: my.H || 0, B: my.B || 0 };
    var anhToi = o.anh || (my.anh ? GOC + my.anh : '');
    var MAN = 1;
    var laToi = function (e) { return String(e.so) === SO; };
    var trong = function (loai) { return DS[loai].filter(laToi)[0]; };

    // o.trong = phần tử chứa ⇒ vẽ TĨNH bên trong (xem trước ở hộp Thông báo dashboard, js/tb-ql.js): không phủ màn, không bấm, o.man = màn cần xem
    var nen = document.createElement('div'); nen.className = 'ghk-phu' + (o.trong ? ' ghk-trong' : '');
    nen.innerHTML = '<div class="ghk-co"><div class="tbp-the ghk" role="dialog" aria-modal="true" aria-label="Tổng kết giao hữu A Show Speed mùa 1"></div></div>';
    (o.trong || document.body).appendChild(nen);
    var co = nen.querySelector('.ghk-co'), the = nen.querySelector('.ghk');
    function vua() {
      var w = o.trong ? (o.trongW || 375) : window.innerWidth, h = o.trong ? (o.trongH || 812) : window.innerHeight;
      var s = Math.min(1.25, (w - 20) / W, (h - 20) / H); co.style.transform = 'scale(' + s.toFixed(4) + ')';
    }
    if (!o.trong) window.addEventListener('resize', vua);
    vua();
    if (o.man) MAN = o.man;

    function dau(t, pill) {
      return '<div class="ghk-dau"><div class="ghk-brand">' + KIEM + 'A SHOW SPEED · GIAO HỮU MÙA 1<span class="ghk-cham"><i class="on"></i><i class="' + (MAN > 1 ? 'on' : '') + '"></i><i class="' + (MAN > 2 ? 'on' : '') + '"></i></span></div>' +
        '<h2 class="ghk-t">' + t + '</h2>' + (pill ? '<div class="ghk-pill"><span>' + pill + '</span></div>' : '') + '</div>';
    }
    function bang(loai, so) {
      var ds = DS[loai], hh = loai === 'cham'; if (!ds.length) return '';
      var dinh = hh ? ds[0].n : ds[0].T;
      var c = function (e, i) {
        if (!e) return '<div></div>';
        var s = so(e);
        return '<div class="ghk-c' + (i === 0 ? ' h1' : '') + (laToi(e) ? ' toi' : '') + '"><span class="ghk-hc">' + ['🥇', '🥈', '🥉'][i] + '</span>' +
          '<span class="ghk-avk">' + av(e, i === 0 ? 70 : 58, laToi(e) ? anhToi : '') + (hh ? '<span class="ghk-hh">' + huyHieu(i === 0 ? 17 : 15) + '</span>' : '') + '</span>' +
          '<div class="ghk-ten">' + E(e.ten) + (laToi(e) ? '<span class="ghk-tag">EM</span>' : '') + '</div>' + lop(e) +
          '<div class="ghk-so">' + s[0] + '<small>' + s[1] + '</small></div><div class="ghk-phu2">' + s[2] + '</div></div>';
      };
      var o2 = function (e, h, em) {
        var s = so(e), v = hh ? e.n : e.T;
        return '<div class="ghk-o' + (laToi(e) ? ' toi' : '') + (em ? ' em' : '') + '"><span class="ghk-h">' + h + '</span>' + av(e, 34, laToi(e) ? anhToi : '') +
          '<div class="ghk-g"><div class="ghk-ten">' + E(e.ten) + (laToi(e) ? '<span class="ghk-tag">EM</span>' : '') + '</div><div class="ghk-phu2">' + lop(e) + (hh ? (em ? '' : hhTen(10)) : s[3]) + '</div></div>' +
          '<div class="ghk-so">' + s[0] + '<small>' + s[1] + '</small></div>' + (em ? '' : '<i class="ghk-vach" style="width:' + Math.round(100 * v / Math.max(1, dinh)) + '%"></i>') + '</div>';
      };
      var h = '<div class="ghk-buc">' + c(ds[1], 1) + c(ds[0], 0) + c(ds[2], 2) + '</div><div class="ghk-luoi">';
      for (var k = 3; k < ds.length; k++) h += o2(ds[k], k + 1);
      if (trong(loai) || !TOI.n) h += '<div class="ghk-o trong">' + (hh ? '+ HUY HIỆU' : '+' + THANG_SAO + ' ⭐ / BẠN') + '</div>';
      else h += o2(TOI, hh ? my.hc : my.ht, true);
      return h + '</div>';
    }
    function dongEm(loai) {
      var hang = loai === 'cham' ? my.hc : my.ht;
      if (trong(loai)) return '🎉 Em đứng hạng ' + hang + ' trong bảng này!';
      if (!TOI.n) return 'Mùa sau em cùng ra sân nhé!';
      if (loai === 'cham') return 'Em hạng ' + hang + (my.canC ? ' · thiếu ' + my.canC + ' trận nữa là vào top 10' : '');
      return 'Em hạng ' + hang + ' · ' + TOI.T + ' trận thắng — mùa sau bứt phá nhé!';
    }
    function ketLuan() {
      var sT = my.sTran || 0, topT = !!my.sThang, topC = !!my.hh, tong = Number(o.p.sao) || 0, coQua = tong > 0 || topC;
      var h = dau(coQua ? 'Phần thưởng <em>của em</em>' : 'Cảm ơn em <em>đã đồng hành</em>', '') +
        '<div class="ghk-kl"><span class="ghk-avk">' + av(TOI, 76, anhToi) + (topC ? '<span class="ghk-hh">' + huyHieu(26) + '</span>' : '') + '</span><div><div class="ghk-ten">' + E(TOI.ten) + '</div>' +
        '<div class="ghk-chip"><span>' + E(TOI.lop) + '</span><span><b>' + TOI.n + '</b> trận</span>' + (TOI.n ? '<span><b>' + TOI.T + '</b>T · ' + TOI.H + 'H · ' + TOI.B + 'B</span>' : '') + '</div></div></div>';
      if (coQua) {
        var bac = ''; for (var i = 0; i < BAC_MAX; i++) bac += '<i class="' + (sT > i ? 'co' : '') + (sT === i + 1 ? ' toi' : '') + '">' + (i + 1) * BAC + (i === BAC_MAX - 1 ? '+' : '') + '</i>';
        h += '<div class="ghk-the' + (sT ? '' : ' khong') + '"><div class="ghk-tr"><span class="ghk-ic">🔥</span><div class="ghk-g"><b>Chăm thi đấu · ' + TOI.n + ' trận</b><small>' +
          (sT >= BAC_MAX ? 'Đạt bậc cao nhất!' : 'Thêm ' + ((sT + 1) * BAC - TOI.n) + ' trận là lên bậc ' + (sT + 1)) + '</small></div><span class="ghk-sao">+' + sT + '</span></div><div class="ghk-bac">' + bac + '</div></div>';
        h += '<div class="ghk-the' + (topT ? '' : ' khong') + '"><div class="ghk-tr"><span class="ghk-ic">⚡</span><div class="ghk-g"><b>Top 10 thắng nhiều</b><small>' +
          (topT ? 'Hạng ' + my.ht + ' · ' + TOI.T + ' trận thắng' : 'Hạng ' + my.ht + ' · top 10 cần ' + my.canT + ' trận thắng') + '</small></div><span class="ghk-sao">' + (topT ? '+' + (my.sThang || THANG_SAO) : '—') + '</span></div></div>';
        if (topC) h += '<div class="ghk-hhk">' + huyHieu(54, true) + '<div><b>Chiến binh A Show Speed</b><small>Top 10 chăm chỉ · gắn sau tên em</small><span class="ghk-xem">' + E(TOI.ten) + hhTen(11) + '</span></div></div>';
        h += '<div class="ghk-tong">Tổng <b>+' + tong + '</b>' + SAO + '</div>';
      } else h += '<div class="ghk-dv">' + (TOI.n ? 'Em đấu <b>' + TOI.n + ' trận</b> — hãy cố gắng hơn trong mùa sau.<br>' : '') + 'Luyện tập với máy trong hộp ⚔ để sẵn sàng cho <b>mùa 2</b> nhé!</div>';
      return h + '<div class="ghk-chan"><button type="button" class="ghk-nut lui" data-di="2">‹ Lùi</button><button type="button" class="ghk-nut' + (coQua ? ' vang' : '') + '" data-nhan>' + (coQua ? 'Nhận thưởng' : 'Đóng') + '</button></div><div class="ghk-bao" aria-live="polite"></div>';
    }
    function ve() {
      var h;
      if (MAN === 1) h = dau('10 chiến binh <em>chăm chỉ</em>', dongEm('cham')) + bang('cham', function (e) { return [e.n, 'trận', e.ngay + ' ngày · ' + e.doiThu + ' đối thủ', '']; }) +
        '<div class="ghk-chan"><button type="button" class="ghk-nut" data-di="2">Tiếp theo ›</button></div>';
      else if (MAN === 2) h = dau('10 cao thủ <em>thắng nhiều</em>', dongEm('thang')) + bang('thang', function (e) { return [e.T, 'thắng', e.n + ' trận · ' + e.tyLe + '%', '<span>' + (e.tyLe == null ? '' : e.tyLe + '%') + '</span>']; }) +
        '<div class="ghk-chan"><button type="button" class="ghk-nut lui" data-di="1">‹ Lùi</button><button type="button" class="ghk-nut" data-di="3">Quà của em ›</button></div>';
      else h = ketLuan();
      the.innerHTML = h;
    }
    the.addEventListener('click', function (e) {
      var d = e.target.closest('[data-di]'); if (d) { MAN = +d.getAttribute('data-di'); ve(); return; }
      var n = e.target.closest('[data-nhan]'); if (!n) return;
      n.disabled = true; var bao = the.querySelector('.ghk-bao'); if (bao) bao.textContent = '';
      Promise.resolve(o.ghi()).then(function () {
        window.removeEventListener('resize', vua);
        if (window.ACTbPop && ACTbPop.bay) ACTbPop.bay(nen, n, Number(o.p.sao) || 0, o.xong);
        else { nen.remove(); if (o.xong) o.xong(); }
      }, function (er) {
        n.disabled = false;
        if (er && er.daXong) { window.removeEventListener('resize', vua); nen.remove(); if (o.xong) o.xong(); return; }
        if (bao) bao.textContent = (er && er.chu) || 'Chưa gửi được (mạng yếu?) — em bấm lại nhé.';
      });
    });
    ve();
    return nen;
  }
  function ACTbPopTen(t) { return window.ACTbPop && ACTbPop.tenGoi ? ACTbPop.tenGoi(t) : String(t || '').trim().split(/\s+/).slice(-2).join(' '); }
  window.ACTbGh = { mo: mo, huyHieu: huyHieu };
})();
