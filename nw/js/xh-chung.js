/* ============================================================
   xh-chung.js — DÙNG CHUNG cho XẾP HẠNG THEO MÙA (sảnh nw/xephang.html + trận nw/xhtran.html) · 25/10/2026, Đợt 1.
   Mẫu thầy duyệt: D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\mau-v5\xep-hang-mau-v5.html
   window.XH = { HANG, hh(ma,bac,co) huy hiệu SVG, veHH(goc), hangTu(diem), hien('vang:II') → {ma,bac,ten}, av(ten,anh,i),
                 esc, dongHo(ms), muaHienTai(f), BanPhim (bàn phím riêng gõ Telex — điện thoại không bật bàn phím máy) }
   Luật điểm/hạng: máy chủ myLesson/app/may-chu/functions/xep-hang.js (đổi một bên thì đổi bên kia).
   ============================================================ */
(function () {
  'use strict';
  var HANG = {
    an: { ten: '?', a: '#5E8574', b: '#2B4A3C', c: '#13261D' },
    dong: { ten: 'Đồng', a: '#E7A16B', b: '#8A4B22', c: '#5B2E12', tu: 0 },
    bac: { ten: 'Bạc', a: '#EEF3F7', b: '#9AA7B4', c: '#56616E', tu: 300 },
    vang: { ten: 'Vàng', a: '#FFE08A', b: '#F0A91E', c: '#8F5A00', tu: 800 },
    bk: { ten: 'Bạch kim', a: '#B7FFF0', b: '#2CC9B0', c: '#0B6B63' },
    kc: { ten: 'Kim cương', a: '#C8E6FF', b: '#4DA3FF', c: '#1E3FA8' },
    ct: { ten: 'Cao thủ', a: '#E5C9FF', b: '#A35CFF', c: '#4B1C8F' },
    ht: { ten: 'Huyền thoại', a: '#FFD3D8', b: '#FF4D6A', c: '#7A0C22' }
  };
  var THU_TU = ['dong', 'bac', 'vang'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dem = 0;
  function hh(ma, bac, co) {
    var h = HANG[ma] || HANG.an, id = 'xhg' + (dem++), cao = ma === 'ct' || ma === 'ht';
    var canh = cao ? '<path d="M14 30 4 14l18 8M86 30l10-16-18 8" fill="' + h.b + '" stroke="' + h.c + '" stroke-width="2"/>' : '';
    var mien = ma === 'ht' ? '<path d="M30 18 38 6l12 10 12-10 8 12" fill="#FFD36A" stroke="#8F5A00" stroke-width="2"/>' : '';
    var giua = ma === 'an' ? '<text x="50" y="68" text-anchor="middle" font-family="Saira,sans-serif" font-weight="800" font-size="40" fill="rgba(255,255,255,.85)">?</text>'
      : '<path d="M50 36l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" fill="rgba(255,255,255,.9)"/>';
    return '<svg viewBox="0 0 100 110" role="img" aria-label="' + esc(h.ten + ' ' + (bac || '')) + '"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + h.a + '"/><stop offset=".55" stop-color="' + h.b + '"/><stop offset="1" stop-color="' + h.c + '"/></linearGradient></defs>'
      + canh + mien + '<path d="M50 8 88 24v34c0 24-17 40-38 46C29 98 12 82 12 58V24Z" fill="url(#' + id + ')" stroke="' + h.c + '" stroke-width="3" style="filter:drop-shadow(0 0 8px ' + h.b + '88)"/>'
      + '<path d="M50 20 76 31v26c0 17-12 29-26 34-14-5-26-17-26-34V31Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>' + giua + '</svg>'
      + (bac ? '<i style="font-size:' + Math.max(10, co * 0.13) + 'px">' + esc(bac) + '</i>' : '');
  }
  function veHH(goc) {
    [].forEach.call((goc || document).querySelectorAll('[data-hh]'), function (e) {
      var co = +e.dataset.co || 40; e.style.width = co + 'px'; e.style.height = (co * 1.1) + 'px'; e.innerHTML = hh(e.dataset.hh, e.dataset.bac, co);
    });
  }
  function hhTag(ma, bac, co, lop) { return '<span class="xh-hh' + (lop ? ' ' + lop : '') + '" data-hh="' + esc(ma) + '" data-bac="' + esc(bac || '') + '" data-co="' + (co || 40) + '"></span>'; }
  // 26/10 SUẤT: Đồng/Bạc/Vàng theo điểm (Vàng từ 800) · Bạch kim → Huyền thoại theo SUẤT (thứ hạng toàn trường + điểm sàn), cờ s do máy chủ ghi.
  var SUAT_MAC = [{ t: 'ht', n: 2, san: 1800 }, { t: 'ct', n: 2, san: 1600 }, { t: 'kc', n: 3, san: 1400 }, { t: 'bk', n: 6, san: 1100 }];
  function suatCua(M) { return (M && Array.isArray(M.suat) && M.suat.length) ? M.suat : SUAT_MAC; }
  function laSuat(s) { return s === 'ht' || s === 'ct' || s === 'kc' || s === 'bk'; }
  // { ht:'1', ct:'2–3', kc:'4–6', bk:'7–12' } + tổng suất
  function viTriSuat(M) {
    var o = {}, i = 0; suatCua(M).forEach(function (x) { o[x.t] = x.n > 1 ? (i + 1) + '–' + (i + x.n) : String(i + 1); o[x.t + 'San'] = x.san; i += x.n; }); o.tong = i; return o;
  }
  // điểm (+ suất s đang giữ) → hạng hiện. s: 'ht'|'ct'|'kc'|'bk' (true = ht, dữ liệu cũ)
  function hangTu(d, s) {
    if (d == null) return { ma: 'an', bac: '', ten: 'Chưa xếp hạng' };
    if (s === true) s = 'ht';
    if (laSuat(s)) return { ma: s, bac: '', ten: HANG[s].ten, suat: true };
    var ma = 'dong'; THU_TU.forEach(function (k) { if (d >= HANG[k].tu) ma = k; });
    var i = Math.min(2, Math.floor((d - HANG[ma].tu) / 100)), bac = ['III', 'II', 'I'][i];
    // 31/10 bậc I kéo tới hạng kế (Bạc I = 500→800, rộng 300) ⇒ thanh đi trọn bậc, không về 0 mỗi 100 điểm. Vàng I: lên tiếp phải giành SUẤT
    var san = HANG[ma].tu + i * 100, tiep = THU_TU[THU_TU.indexOf(ma) + 1];
    var len = i < 2 ? san + 100 : tiep ? HANG[tiep].tu : null;
    return { ma: ma, bac: bac, ten: HANG[ma].ten + ' ' + bac, trongBac: len ? d - san : null, len: len, rong: len ? len - san : null };
  }
  // 🛡 khiên (máy chủ sanBac): vượt mốc 100 nào thì 3 trận thua tới không tụt dưới mốc đó; từ 1000 mốc là 1000
  function mocKhien(d) { return d >= 1000 ? 1000 : Math.floor((d || 0) / 100) * 100; }
  // chuỗi hạng trên trận ('vang:II' · 'kc:' · 'xl:3')
  function hien(s) {
    var p = String(s || '').split(':');
    if (p[0] === 'xl') return { ma: 'an', bac: '', ten: 'Phân hạng ' + (p[1] || '1') + '/5' };
    var h = HANG[p[0]] || HANG.an;
    return { ma: HANG[p[0]] ? p[0] : 'an', bac: p[1] || '', ten: h.ten + (p[1] ? ' ' + p[1] : '') };
  }
  var MAU = ['#3DF58A', '#37D7FF', '#FFC94A', '#FF8FA0', '#B98CFF', '#7CF0D4'];
  function chuTat(ten) { var t = String(ten || '?').trim().split(/\s+/); return (t.length > 1 ? t[t.length - 2][0] + t[t.length - 1][0] : t[0].slice(0, 2)).toUpperCase(); }
  function mau(ten) { var s = 0; String(ten || '').split('').forEach(function (c) { s += c.charCodeAt(0); }); return MAU[s % MAU.length]; }
  function av(ten, anh, lop) {
    return '<span class="xh-av' + (lop ? ' ' + lop : '') + '" style="' + (anh ? "background:#0B2A1C url('" + esc(anh) + "') center/cover" : 'background:' + mau(ten)) + '">' + (anh ? '' : esc(chuTat(ten))) + '</span>';
  }
  function dongHo(ms) { ms = Math.max(0, ms); var s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function conLai(ms) {
    ms = Math.max(0, ms); var d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    return d > 0 ? d + ' ngày ' + ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) : ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ':' + ('0' + Math.floor(ms / 1000) % 60).slice(-2);
  }
  function ngayGio(ms) { var d = new Date(ms); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function phutChu(p) { return ('0' + Math.floor(p / 60)).slice(-2) + ':' + ('0' + p % 60).slice(-2); }
  // mùa hiện tại: { mua, M } (M null = chưa có mùa)
  async function muaHienTai(f) {
    var c = await f.fs.getDoc(f.fs.doc(f.db, 'caiDat', 'xepHang'));
    var mua = c.exists() ? String(c.data().mua || '') : '';
    if (!mua) return { mua: '', M: null };
    var s = await f.fs.getDoc(f.fs.doc(f.db, 'xhMua', mua));
    return { mua: mua, M: s.exists() ? s.data() : null };
  }
  // trạng thái mùa theo giờ
  function ttMua(M, bay) {
    if (!M) return 'khong';
    if (M.tt === 'chot') return 'chot';
    if (bay < M.tu) return 'sap';
    if (bay >= M.den) return 'het';
    if (M.tt === 'dung') return 'dung';
    return M.tt === 'mo' ? 'mo' : 'sap';
  }
  function gioVangNay(M, bay) {
    var g = M && M.gioVang; if (!g || !(g.nhan > 1)) return false;
    var d = new Date(bay), p = d.getHours() * 60 + d.getMinutes();
    return g.tu <= g.den ? p >= g.tu && p < g.den : p >= g.tu || p < g.den;
  }

  // ── TELEX ── gõ "dduowcj khoong" ⇒ "được không" (mỗi từ tính lại từ các phím đã gõ)
  var BANG = ['aáàảãạ', 'ăắằẳẵặ', 'âấầẩẫậ', 'eéèẻẽẹ', 'êếềểễệ', 'iíìỉĩị', 'oóòỏõọ', 'ôốồổỗộ', 'ơớờởỡợ', 'uúùủũụ', 'ưứừửữự', 'yýỳỷỹỵ'];
  var NGUYEN = 'aăâeêioôơuưy';
  function laNguyen(c) { return NGUYEN.indexOf(String(c).toLowerCase()) >= 0; }
  function hoa(c, up) { return up ? c.toUpperCase() : c; }
  function telexTu(raw) {
    var out = [], dau = 0, k;
    for (var n = 0; n < raw.length; n++) {
      var ch = raw[n], lo = ch.toLowerCase(), up = ch !== lo;
      if ('sfrxj'.indexOf(lo) >= 0 && out.some(laNguyen)) { var d = 'sfrxj'.indexOf(lo) + 1; if (dau === d) { dau = 0; out.push(ch); } else dau = d; continue; }
      if (lo === 'z' && dau) { dau = 0; continue; }
      if (lo === 'd' && out.length && out[out.length - 1].toLowerCase() === 'd') { out[out.length - 1] = hoa('đ', out[out.length - 1] !== 'd'); continue; }
      if ('aeo'.indexOf(lo) >= 0) {
        for (k = out.length - 1; k >= 0 && laNguyen(out[k]); k--) { if (out[k].toLowerCase() === lo) { out[k] = hoa({ a: 'â', e: 'ê', o: 'ô' }[lo], out[k] !== lo); break; } }
        if (k >= 0 && laNguyen(out[k])) continue;
      }
      if (lo === 'w') {
        var j = -1; for (k = out.length - 1; k >= 0; k--) if (laNguyen(out[k])) { j = k; break; }
        if (j >= 0) {
          var a = out[j].toLowerCase(), b = j > 0 ? out[j - 1].toLowerCase() : '';
          if (a === 'o' && b === 'u') { out[j - 1] = hoa('ư', out[j - 1] !== 'u'); out[j] = hoa('ơ', out[j] !== 'o'); continue; }
          var m = { a: 'ă', o: 'ơ', u: 'ư' }[a]; if (m) { out[j] = hoa(m, out[j] !== a); continue; }
        }
        out.push(hoa('ư', up)); continue;
      }
      out.push(ch);
    }
    if (!dau) return out.join('');
    var v = [];
    out.forEach(function (c, i) {
      if (!laNguyen(c)) return; var tr = i > 0 ? out[i - 1].toLowerCase() : '';
      if (i < out.length - 1 && laNguyen(out[i + 1]) && ((c.toLowerCase() === 'u' && tr === 'q') || (c.toLowerCase() === 'i' && tr === 'g'))) return;
      v.push(i);
    });
    if (!v.length) return out.join('');
    var chon = -1; v.forEach(function (i) { if ('ăâêôơư'.indexOf(out[i].toLowerCase()) >= 0) chon = i; });
    if (chon < 0) chon = v.length === 1 ? v[0] : v.length >= 3 ? v[1] : (v[v.length - 1] < out.length - 1 ? v[1] : v[0]);
    var c0 = out[chon], lc = c0.toLowerCase(); BANG.forEach(function (h) { if (h[0] === lc) out[chon] = hoa(h[dau], c0 !== lc); });
    return out.join('');
  }
  // Bàn phím riêng: o = { goc (phần tử chứa phím), o (ô hiện chữ), goiY, gui(chu) }
  function BanPhim(o) {
    var GO = '', SHIFT = false, EMO = false;
    var HANG_P = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'], EMOJI = ['😄', '😂', '😅', '😎', '🤩', '😮', '😭', '😡', '👍', '👏', '💪', '🔥', '⚔', '🏆', '❤️', '🍀', 'GG', '!', '?', '.'];
    function chu() { return GO.split(' ').map(telexTu).join(' '); }
    function veO() { o.o.innerHTML = GO ? esc(chu()) + '<s></s>' : '<em>' + esc(o.goiY()) + '</em><s></s>'; }
    function phim(x, lop, nhan) { return '<button type="button"' + (lop ? ' class="' + lop + '"' : '') + ' data-p="' + esc(x) + '">' + (nhan || esc(SHIFT && x.length === 1 ? x.toUpperCase() : x)) + '</button>'; }
    function ve() {
      var h = '';
      if (EMO) { for (var r = 0; r < 2; r++) h += '<div>' + EMOJI.slice(r * 10, r * 10 + 10).map(function (x) { return phim(x); }).join('') + '</div>'; h += '<div>' + phim('⌫', 'r') + '</div>'; }
      else {
        h += '<div>' + HANG_P[0].split('').map(function (x) { return phim(x); }).join('') + '</div>';
        h += '<div>' + HANG_P[1].split('').map(function (x) { return phim(x); }).join('') + '</div>';
        h += '<div>' + phim('⇧', 'r' + (SHIFT ? ' on' : ''), '⇧') + HANG_P[2].split('').map(function (x) { return phim(x); }).join('') + phim('⌫', 'r') + '</div>';
      }
      h += '<div>' + phim('☺', 'r', EMO ? 'abc' : '😄') + phim(' ', 'cach', 'Telex') + phim('↵', 'di', 'GỬI') + '</div>';
      o.goc.innerHTML = h;
    }
    function bam(p) {
      if (p === '⇧') SHIFT = !SHIFT;
      else if (p === '☺') EMO = !EMO;
      else if (p === '⌫') GO = Array.from(GO).slice(0, -1).join('');
      else if (p === '↵') { var c = chu().trim(); if (c) o.gui(c); return; }
      else { GO += SHIFT ? p.toUpperCase() : p; SHIFT = false; }
      veO(); ve();
    }
    o.goc.addEventListener('pointerdown', function (e) { var b = e.target.closest('button'); if (!b) return; e.preventDefault(); bam(b.dataset.p); });
    ve(); veO();
    return {
      xoa: function () { GO = ''; SHIFT = false; veO(); ve(); },
      phimMay: function (e) {   // bàn phím thật (máy tính đang ở bố cục hẹp)
        if (e.key === 'Enter') { e.preventDefault(); return bam('↵'); }
        if (e.key === 'Backspace') { e.preventDefault(); return bam('⌫'); }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); GO += e.key; veO(); }
      },
      veLai: veO
    };
  }

  window.XH = { HANG: HANG, THU_TU: THU_TU, hh: hh, veHH: veHH, hhTag: hhTag, hangTu: hangTu, mocKhien: mocKhien, SUAT_MAC: SUAT_MAC, suatCua: suatCua, laSuat: laSuat, viTriSuat: viTriSuat, hien: hien, av: av, esc: esc, chuTat: chuTat,
    dongHo: dongHo, conLai: conLai, ngayGio: ngayGio, phutChu: phutChu, muaHienTai: muaHienTai, ttMua: ttMua, gioVangNay: gioVangNay,
    telexTu: telexTu, BanPhim: BanPhim };
})();
