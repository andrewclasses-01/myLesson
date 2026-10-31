/* ============================================================
   xh-chung.js — DÙNG CHUNG cho XẾP HẠNG THEO MÙA (sảnh nw/xephang.html + trận nw/xhtran.html) · 25/10/2026, Đợt 1.
   Mẫu thầy duyệt: D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\mau-v5\xep-hang-mau-v5.html
   window.XH = { HANG, hh(ma,bac,co) huy hiệu SVG, bt(ten,co) biểu tượng game, doiEmoji(html), veHH(goc), hangTu(diem), hien('vang:II') → {ma,bac,ten}, av(ten,anh,i),
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
  // 26/10 SUẤT: Đồng/Bạc/Vàng theo điểm (Vàng từ 800) · Bạch kim → Huyền thoại theo SUẤT (thứ hạng toàn giải + điểm sàn), cờ s do máy chủ ghi.
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

  // ── BIỂU TƯỢNG GAME ── 31/10/2026 thầy chốt: bỏ emoji chung, vẽ riêng theo phong cách huy hiệu (gradient + viền tối + vệt sáng).
  //   Mẫu duyệt: D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\ket-qua-dong-v2. XH.bt('lua', 18) · XH.doiEmoji(html) đổi emoji (chat cũ, bàn phím điện thoại) sang hình.
  var V = 'stroke="#071A10" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
  var SANG = 'fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.4" stroke-linecap="round"';
  function g(id, a, b, c) { return '<linearGradient id="btg-' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset=".55" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient>'; }
  var DEFS = g('vang', '#FFF1B8', '#FFC94A', '#C77A00') + g('lua', '#FFE08A', '#FF8A3D', '#D9302B') + g('xanh', '#D6F8FF', '#37D7FF', '#1767B8') +
    g('neon', '#D9FFE9', '#3DF58A', '#139A55') + g('do', '#FFC2C8', '#FF5F6D', '#A3122B') + g('bac', '#FFFFFF', '#C9D3DC', '#6E7B88') +
    g('tim', '#EBD6FF', '#A35CFF', '#55209E') + g('mat', '#FFF4BF', '#FFD45A', '#E89A12') + g('gach', '#FFB48A', '#D9653A', '#7E2A10') + g('nau', '#E2B88A', '#A86A3A', '#5B3415');
  var mat = '<circle cx="16" cy="16" r="13" fill="url(#btg-mat)" ' + V + '/><path d="M9 8.5a9 9 0 0 1 6-2.6" ' + SANG + '/>';
  var matDo = '<circle cx="16" cy="16" r="13" fill="url(#btg-do)" ' + V + '/><path d="M9 8.5a9 9 0 0 1 6-2.6" ' + SANG + '/>';
  var D = 'fill="#071A10"', NET = 'fill="none" stroke="#071A10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var giot = function (x, y) { return '<path d="M' + x + ' ' + y + 'c1.6 2.4 2.6 3.8 2.6 5a2.6 2.6 0 0 1-5.2 0c0-1.2 1-2.6 2.6-5Z" fill="url(#btg-xanh)" ' + V + '/>'; };
  var tay = '<path d="M2 30v-6.5C2 18 6 13.5 11 13.5c4.5 0 6.5 3.5 7.6 6.9l1.2-7.8c-2.2-.8-2.8-4.2-1.2-6.4 1.8-2.6 6.4-3.4 9-1.6 2.4 1.8 2.4 5.4 1 7.4l-.2 13c0 3.4-2.2 5-5.4 5Z" fill="url(#btg-mat)" ' + V + '/>' +
    '<path d="M3.2 26.6c4.6 1.6 11 1.6 16.4-.6" fill="none" stroke="rgba(143,90,0,.45)" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M18.2 7.2h4M17.9 9.4h4.4M18.6 11.5h3.8" fill="none" stroke="rgba(7,26,16,.6)" stroke-width="1.3" stroke-linecap="round"/>' +
    '<path d="M21.6 5.2c2.2-.6 4 .4 4.4 2.6" fill="none" stroke="rgba(7,26,16,.6)" stroke-width="1.3" stroke-linecap="round"/>' +
    '<path d="M5.2 20.2c1-2.6 3.2-4.4 6-4.6" ' + SANG + '/>' +
    '<path d="M4.6 11.4 2.8 9.2M8.6 9.4 8.2 6.6M12.8 9.8l1-2.6" stroke="#FFC94A" stroke-width="2" stroke-linecap="round"/>';
  var tim = '<path d="M16 27.5S3.5 20.5 3.5 11.8A6.3 6.3 0 0 1 16 9.4a6.3 6.3 0 0 1 12.5 2.4C28.5 20.5 16 27.5 16 27.5Z" fill="url(#btg-do)" ' + V + '/><path d="M8 10.5a3 3 0 0 1 3.5-2" ' + SANG + '/>';
  var lua = '<path d="M16 2.8c1.2 5 7.6 7.3 7.6 14.6a7.6 7.6 0 0 1-15.2 0c0-3.4 1.6-5.6 3.3-7.2.1 2.7 1.2 4.2 2.7 4.8C13.6 11.2 14.8 7 16 2.8Z" fill="url(#btg-lua)" ' + V + '/>' +
    '<path d="M16 15.2c2.1 2.2 3.6 3.6 3.6 5.8a3.6 3.6 0 0 1-7.2 0c0-2 1.5-3.2 3.6-5.8Z" fill="#FFE9A0"/>';
  var cup = '<path d="M9.5 6.5H5.5v2.3a4.3 4.3 0 0 0 4.6 4.3M22.5 6.5h4v2.3a4.3 4.3 0 0 1-4.6 4.3" fill="none" stroke="#071A10" stroke-width="4"/><path d="M9.5 6.5H5.5v2.3a4.3 4.3 0 0 0 4.6 4.3M22.5 6.5h4v2.3a4.3 4.3 0 0 1-4.6 4.3" fill="none" stroke="#FFC94A" stroke-width="1.8"/>' +
    '<path d="M8.5 4h15v7.5a7.5 7.5 0 0 1-15 0Z" fill="url(#btg-vang)" ' + V + '/><rect x="13.8" y="18.5" width="4.4" height="4" fill="url(#btg-vang)" ' + V + '/><rect x="9.5" y="22.3" width="13" height="5.2" rx="1.6" fill="url(#btg-nau)" ' + V + '/><path d="M11.5 6.5v4.5" ' + SANG + '/>';
  var S = {
    // ---------- GIAO DIỆN ----------
    lua: lua,
    set: '<path d="M18.5 2.8 6.5 18.2h7.2l-2.2 11L24.5 13h-7.3l3.3-10.2Z" fill="url(#btg-vang)" ' + V + '/><path d="M16.5 6 11 13" ' + SANG + '/>',
    khien: '<path d="M16 2.8 27 7v8.2c0 7-4.8 12-11 14-6.2-2-11-7-11-14V7Z" fill="url(#btg-xanh)" ' + V + '/><path d="M16 7.2 22.8 10v5.4c0 4.6-2.8 8-6.8 9.6" ' + SANG + '/><path d="M16 9.5v13" stroke="rgba(7,26,16,.35)" stroke-width="1.4"/>',
    moc: '<path d="M16 2.8a8.4 8.4 0 0 1 8.4 8.4c0 6.2-8.4 18-8.4 18s-8.4-11.8-8.4-18A8.4 8.4 0 0 1 16 2.8Z" fill="url(#btg-do)" ' + V + '/><circle cx="16" cy="11.2" r="3.4" fill="#FFF" ' + V + '/><path d="M10.6 8.6a6 6 0 0 1 3-3" ' + SANG + '/>',
    gach: '<rect x="3.5" y="8" width="25" height="17" rx="2" fill="url(#btg-gach)" ' + V + '/><path d="M3.5 13.7h25M3.5 19.3h25M12 8v5.7M21 8v5.7M7.5 13.7v5.6M16.5 13.7v5.6M25 13.7v5.6M12 19.3V25M21 19.3V25" stroke="#071A10" stroke-width="1.4"/><path d="M6 10.6h4" ' + SANG + '/>',
    tay: tay,
    mat: '<path d="M2.8 16S7.8 7.5 16 7.5 29.2 16 29.2 16 24.2 24.5 16 24.5 2.8 16 2.8 16Z" fill="url(#btg-bac)" ' + V + '/><circle cx="16" cy="16" r="5.4" fill="url(#btg-xanh)" ' + V + '/><circle cx="16" cy="16" r="2.2" ' + D + '/><circle cx="17.6" cy="14.4" r="1.1" fill="#fff"/>',
    tim: tim,
    khoa: '<path d="M10.5 14v-3.5a5.5 5.5 0 0 1 11 0V14" fill="none" stroke="#071A10" stroke-width="5"/><path d="M10.5 14v-3.5a5.5 5.5 0 0 1 11 0V14" fill="none" stroke="#C9D3DC" stroke-width="2.4"/>' +
      '<rect x="6.5" y="13.5" width="19" height="14.5" rx="3" fill="url(#btg-vang)" ' + V + '/><path d="M16 18.5v4" stroke="#071A10" stroke-width="2.6" stroke-linecap="round"/><path d="M9.5 16v6" ' + SANG + '/>',
    sao: '<path d="M16 2.8l3.9 8 8.8 1.2-6.4 6.1 1.6 8.7L16 22.6 8.1 26.8l1.6-8.7-6.4-6.1 8.8-1.2Z" fill="url(#btg-vang)" ' + V + '/><path d="M13.6 9.8l-1.4 2.8" ' + SANG + '/>',
    cup: cup,
    huy: '<path d="M9.5 2.8h5.2l3.2 8.6h-5.2Z" fill="url(#btg-do)" ' + V + '/><path d="M22.5 2.8h-5.2l-3.2 8.6h5.2Z" fill="url(#btg-xanh)" ' + V + '/><circle cx="16" cy="20" r="8.6" fill="url(#btg-vang)" ' + V + '/><circle cx="16" cy="20" r="5.4" fill="none" stroke="rgba(143,90,0,.55)" stroke-width="1.4"/><path d="M11.4 16.6a5.6 5.6 0 0 1 2.8-2.4" ' + SANG + '/>',
    co: '<path d="M7 3.5v25" stroke="#071A10" stroke-width="3.6" stroke-linecap="round"/><path d="M7 3.5v25" stroke="#C9D3DC" stroke-width="1.6" stroke-linecap="round"/><path d="M8.5 5h18v12.5h-18Z" fill="#F4FFF8" ' + V + '/>' +
      '<path d="M8.5 5h4.5v4.2H8.5ZM17.5 5H22v4.2h-4.5ZM13 9.2h4.5v4.1H13ZM22 9.2h4.5v4.1H22ZM8.5 13.3h4.5v4.2H8.5ZM17.5 13.3H22v4.2h-4.5Z" ' + D + '/>',
    giam: '<rect x="3.5" y="4" width="25" height="24" rx="4" fill="url(#btg-bac)" ' + V + '/><path d="M7.5 9.5l5.5 5.5 4-3 7.5 8" fill="none" stroke="#071A10" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M7.5 9.5l5.5 5.5 4-3 7.5 8" fill="none" stroke="#FF5F6D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 21h6v-6" fill="none" stroke="#FF5F6D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    gio: '<rect x="13" y="2.8" width="6" height="3.4" rx="1" fill="url(#btg-bac)" ' + V + '/><path d="M23.6 7.6l2 2" stroke="#071A10" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="18" r="11" fill="url(#btg-bac)" ' + V + '/><circle cx="16" cy="18" r="8" fill="#F4FFF8"/>' +
      '<path d="M16 18V12.5" stroke="#071A10" stroke-width="2.2" stroke-linecap="round"/><path d="M16 18l3.6 2.4" stroke="#FF5F6D" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="18" r="1.4" ' + D + '/>',
    chu: '<rect x="3" y="5.5" width="26" height="21" rx="5" fill="url(#btg-xanh)" ' + V + '/><text x="16" y="21.5" text-anchor="middle" font-family="Saira,sans-serif" font-weight="800" font-style="italic" font-size="13" fill="#071A10">Aa</text><path d="M6.5 9h5" ' + SANG + '/>',
    cua: '<rect x="6" y="3.5" width="15" height="25" rx="1.6" fill="url(#btg-nau)" ' + V + '/><circle cx="17.5" cy="16.5" r="1.4" fill="#FFC94A" ' + V + '/>' +
      '<path d="M19.5 16.5h9.5M25.5 12.8l3.7 3.7-3.7 3.7" fill="none" stroke="#071A10" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.5 16.5h9.5M25.5 12.8l3.7 3.7-3.7 3.7" fill="none" stroke="#FF5F6D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    trang: '<path d="M20.5 3.2A12.6 12.6 0 1 0 28.8 23 10.4 10.4 0 0 1 20.5 3.2Z" fill="url(#btg-vang)" ' + V + '/><path d="M9 9.5a9 9 0 0 1 3.5-3.2" ' + SANG + '/><circle cx="25" cy="8" r="1.3" fill="#FFF1B8"/>',
    nguoi: '<circle cx="16" cy="10.5" r="6.2" fill="url(#btg-neon)" ' + V + '/><path d="M4.5 28.5c0-6.4 5.2-10.5 11.5-10.5s11.5 4.1 11.5 10.5Z" fill="url(#btg-neon)" ' + V + '/><path d="M12.6 7.6a3.5 3.5 0 0 1 2.4-1.4" ' + SANG + '/>',
    cam: '<circle cx="16" cy="16" r="11.5" fill="none" stroke="#071A10" stroke-width="6.4"/><circle cx="16" cy="16" r="11.5" fill="none" stroke="url(#btg-do)" stroke-width="3.6"/><path d="M8 8l16 16" stroke="#071A10" stroke-width="6.4"/><path d="M8 8l16 16" stroke="#FF5F6D" stroke-width="3.6"/>',
    len: '<path d="M16 3.5 27.5 16h-6.5v12.5H11V16H4.5Z" fill="url(#btg-neon)" ' + V + '/><path d="M16 7.5 10 14" ' + SANG + '/>',
    dung: '<path d="M6 16.5l6.5 6.5L26 9.5" fill="none" stroke="#071A10" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 16.5l6.5 6.5L26 9.5" fill="none" stroke="#3DF58A" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
    sai: '<path d="M8.5 8.5l15 15M23.5 8.5l-15 15" fill="none" stroke="#071A10" stroke-width="6" stroke-linecap="round"/><path d="M8.5 8.5l15 15M23.5 8.5l-15 15" fill="none" stroke="#FF5F6D" stroke-width="3.2" stroke-linecap="round"/>',
    // ---------- CHAT (thay bộ emoji bàn phím + câu nhanh) ----------
    cuoi: mat + '<path d="M10 13.2q2-3 4 0M18 13.2q2-3 4 0" ' + NET + '/><path d="M9.2 17.5h13.6a6.8 6.8 0 0 1-13.6 0Z" ' + D + '/><path d="M12.5 22.6a5 3 0 0 0 7 0" fill="#FF8FA0"/>',
    cuoiKhoc: mat + '<path d="M9 11l4.2 2.4L9 15.8M23 11l-4.2 2.4 4.2 2.4" ' + NET + '/><path d="M8.6 18h14.8a7.4 7.4 0 0 1-14.8 0Z" ' + D + '/>' + giot(4.4, 15) + giot(27.6, 15),
    moHoi: mat + '<path d="M10 13.6q2-2.6 4 0M18 13.6q2-2.6 4 0" ' + NET + '/><path d="M10 18.5h12a6 6 0 0 1-12 0Z" ' + D + '/>' + giot(25, 3.6),
    ngau: mat + '<path d="M5.8 11.6h20.4v1.8c0 3.4-2 4.8-4.4 4.8s-3.4-1.3-3.9-3.2h-3.8c-.5 1.9-1.5 3.2-3.9 3.2s-4.4-1.4-4.4-4.8Z" ' + D + '/><path d="M8.4 13.2h2.4" stroke="#6FE3FF" stroke-width="1.4" stroke-linecap="round"/><path d="M12 22.4q4.4 2.2 8.4-1.2" ' + NET + '/>',
    saoMat: mat + '<path d="M11.5 8.6l1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4ZM20.5 8.6l1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4Z" fill="#FF5F6D" stroke="#071A10" stroke-width="1"/><path d="M10 19h12a6 6 0 0 1-12 0Z" ' + D + '/>',
    ngac: mat + '<circle cx="11.5" cy="13" r="1.9" ' + D + '/><circle cx="20.5" cy="13" r="1.9" ' + D + '/><path d="M9.5 9q2-1.6 4-.6M18.5 8.4q2-1 4 .6" ' + NET + ' stroke-width="1.6"/><ellipse cx="16" cy="21" rx="3" ry="3.6" ' + D + '/>',
    khoc: mat + '<path d="M9.6 13.6q2 1.8 4 0M18.4 13.6q2 1.8 4 0" ' + NET + '/><path d="M10 14.6v11M22 14.6v11" stroke="#37D7FF" stroke-width="2.8" stroke-linecap="round" opacity=".9"/><path d="M12.4 23q3.6-4 7.2 0" ' + NET + '/>',
    gian: matDo + '<path d="M9 10.6l4.6 2.4M23 10.6l-4.6 2.4" ' + NET + '/><circle cx="12.2" cy="15" r="1.7" ' + D + '/><circle cx="19.8" cy="15" r="1.7" ' + D + '/><path d="M11.6 23q4.4-3.6 8.8 0" ' + NET + '/>',
    like: '<rect x="4" y="14.5" width="6.2" height="13" rx="1.4" fill="url(#btg-xanh)" ' + V + '/><path d="M10.2 15.6 15 6.4c2.2-.2 3.6 1.6 3 4.2l-.6 2.8h6.6a2.6 2.6 0 0 1 2.5 3.2l-2 8.4a3.2 3.2 0 0 1-3.1 2.5H10.2Z" fill="url(#btg-mat)" ' + V + '/><path d="M18.6 18.4h5.6M18.6 22.2h4.6" stroke="rgba(7,26,16,.4)" stroke-width="1.3" stroke-linecap="round"/><path d="M14 10.6l-1.6 3" ' + SANG + '/>',
    voTay: '<path d="M7.5 21 13 9.5c.8-1.6 3-1.2 3 .6l-.4 3.6 4.4-5.4c1-1.2 3-.4 2.6 1.2L21 13l2.4-1.6c1.4-.8 2.8.8 1.8 2.2L17.4 25a6.6 6.6 0 0 1-9.9-4Z" fill="url(#btg-mat)" ' + V + '/>' +
      '<path d="M4 9.5 6.2 11.5M6.4 5.2l1 2.8M10.6 3.8l-.2 2.8" stroke="#FFC94A" stroke-width="2" stroke-linecap="round"/><path d="M11 17.5l2.6-5" ' + SANG + '/>',
    kiem: '<path d="M5 5l15.5 15.5M27 5 11.5 20.5" stroke="#071A10" stroke-width="5" stroke-linecap="round"/><path d="M5 5l15.5 15.5M27 5 11.5 20.5" stroke="url(#btg-bac)" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M17.5 23.5l6-6M8.5 17.5l6 6" stroke="#071A10" stroke-width="4.6" stroke-linecap="round"/><path d="M17.5 23.5l6-6M8.5 17.5l6 6" stroke="#FFC94A" stroke-width="2.2" stroke-linecap="round"/><path d="M22.5 22.5l4 4M9.5 22.5l-4 4" stroke="#071A10" stroke-width="4" stroke-linecap="round"/><path d="M22.5 22.5l4 4M9.5 22.5l-4 4" stroke="#A86A3A" stroke-width="2" stroke-linecap="round"/>',
    co4: '<path d="M16 17.5c1.5 4 2 7.5 1 11" fill="none" stroke="#071A10" stroke-width="3.4" stroke-linecap="round"/><path d="M16 17.5c1.5 4 2 7.5 1 11" fill="none" stroke="#139A55" stroke-width="1.6" stroke-linecap="round"/>' +
      ['M16 16c-4.5 0-8-2.8-8-6.2a3.6 3.6 0 0 1 6.6-2C16 9.5 16 12.6 16 16Z', 'M16 16c0-4.5 2.8-8 6.2-8a3.6 3.6 0 0 1 2 6.6C22.5 16 19.4 16 16 16Z', 'M16 16c4.5 0 8 2.8 8 6.2a3.6 3.6 0 0 1-6.6 2C16 22.5 16 19.4 16 16Z', 'M16 16c0 4.5-2.8 8-6.2 8a3.6 3.6 0 0 1-2-6.6C9.5 16 12.6 16 16 16Z']
        .map(function (p) { return '<path d="' + p + '" fill="url(#btg-neon)" ' + V + '/>'; }).join(''),
    batTay: '<path d="M2.5 13.5 9 10l4 3.5-5.5 7L2.5 18Z" fill="url(#btg-xanh)" ' + V + '/><path d="M29.5 13.5 23 10l-4 3.5 5.5 7 5-2.5Z" fill="url(#btg-neon)" ' + V + '/>' +
      '<path d="M8.5 13.2 14 10.4c1.4-.7 3-.6 4.2.2l5.6 3.6-2 7.4-6.2 4.2c-1 .7-2.4.5-3.1-.5L7.6 19.6Z" fill="url(#btg-mat)" ' + V + '/><path d="M12.6 17.6l3 2.6M14.4 15.6l3.4 2.8M17.2 13.8l3 2.4" stroke="rgba(7,26,16,.45)" stroke-width="1.3" stroke-linecap="round"/>'
  };
  // emoji cũ → tên biểu tượng (để dịch chat cũ + bàn phím điện thoại)
  var TU_EMOJI = { '🔥': 'lua', '⚡': 'set', '🛡': 'khien', '📌': 'moc', '🧱': 'gach', '💪': 'tay', '👁': 'mat', '♥': 'tim', '❤': 'tim', '🔒': 'khoa', '⭐': 'sao', '🏆': 'cup', '🥇': 'huy', '🏁': 'co',
    '📉': 'giam', '⏱': 'gio', '🔤': 'chu', '🚪': 'cua', '🌙': 'trang', '👤': 'nguoi', '🚫': 'cam', '✓': 'dung', '✕': 'sai',
    '😄': 'cuoi', '😂': 'cuoiKhoc', '😅': 'moHoi', '😎': 'ngau', '🤩': 'saoMat', '😮': 'ngac', '😭': 'khoc', '😡': 'gian', '👍': 'like', '👏': 'voTay', '⚔': 'kiem', '🍀': 'co4', '🤝': 'batTay', '😆': 'cuoi' };
  function napBT() {
    if (document.getElementById('bt-sprite')) return;
    document.body.insertAdjacentHTML('afterbegin', '<svg id="bt-sprite" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>' + DEFS + '</defs>' +
      Object.keys(S).map(function (k) { return '<symbol id="bt-' + k + '" viewBox="0 0 32 32">' + S[k] + '</symbol>'; }).join('') + '</svg>');
  }
  if (document.body) napBT(); else document.addEventListener('DOMContentLoaded', napBT);
  function bt(ten, co, lop) { return '<svg class="xh-bt' + (lop ? ' ' + lop : '') + '" width="' + (co || 18) + '" height="' + (co || 18) + '" aria-hidden="true"><use href="#bt-' + ten + '"/></svg>'; }
  var RE_EMOJI = new RegExp('(' + Object.keys(TU_EMOJI).sort(function (a, b) { return b.length - a.length; }).join('|') + ')️?', 'g');
  function doiEmoji(html, co) { return String(html).replace(RE_EMOJI, function (_, e) { return bt(TU_EMOJI[e], co || 17); }); }

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
    var HANG_P = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'], EMOJI = ['😄', '😂', '😅', '😎', '🤩', '😮', '😭', '😡', '👍', '👏', '💪', '🔥', '⚔', '🏆', '❤', '🍀', '🤝', 'GG', '!', '?'];   // vẫn gửi ký tự emoji (dashboard/máy cũ đọc được), máy em vẽ thành biểu tượng game
    function chu() { return GO.split(' ').map(telexTu).join(' '); }
    function veO() { o.o.innerHTML = GO ? doiEmoji(esc(chu())) + '<s></s>' : '<em>' + esc(o.goiY()) + '</em><s></s>'; }
    function phim(x, lop, nhan) { return '<button type="button"' + (lop ? ' class="' + lop + '"' : '') + ' data-p="' + esc(x) + '">' + (nhan || doiEmoji(esc(SHIFT && x.length === 1 ? x.toUpperCase() : x), 24)) + '</button>'; }
    function ve() {
      var h = '';
      if (EMO) { for (var r = 0; r < 2; r++) h += '<div>' + EMOJI.slice(r * 10, r * 10 + 10).map(function (x) { return phim(x); }).join('') + '</div>'; h += '<div>' + phim('⌫', 'r') + '</div>'; }
      else {
        h += '<div>' + HANG_P[0].split('').map(function (x) { return phim(x); }).join('') + '</div>';
        h += '<div>' + HANG_P[1].split('').map(function (x) { return phim(x); }).join('') + '</div>';
        h += '<div>' + phim('⇧', 'r' + (SHIFT ? ' on' : ''), '⇧') + HANG_P[2].split('').map(function (x) { return phim(x); }).join('') + phim('⌫', 'r') + '</div>';
      }
      h += '<div>' + phim('☺', 'r', EMO ? 'abc' : bt('cuoi', 22)) + phim(' ', 'cach', 'Telex') + phim('↵', 'di', 'GỬI') + '</div>';
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
    telexTu: telexTu, BanPhim: BanPhim, bt: bt, doiEmoji: doiEmoji };
})();
