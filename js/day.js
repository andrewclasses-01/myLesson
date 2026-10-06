/* ============================================================
   day.js — THÔNG BÁO ĐẨY trên andrewclasses.com (web v1.255.0, 06/10/2026 — thầy chốt "đợt 3").

   Web Push chuẩn: trình duyệt đăng ký bằng khoá CÔNG KHAI VAPID dưới (cặp với khoá RIÊNG ở Secret Manager DAY_VAPID_RIENG,
   máy chủ myLesson-app may-chu/functions/day-thong-bao.js). Mỗi máy bật = 1 tài liệu `dayThietBi/<sha1(endpoint)>`
   { uid, ma, thay, lops[], tatLop[], sub{endpoint,keys}, ua, luc, goc } — luật: tools/dang-luat-day-thong-bao.js.
   Service worker ../sw-day.js CHỈ nhận đẩy (không lưu trang ⇒ không kẹt bản cũ).

   iPhone: iOS ≥ 16.4 và PHẢI mở bằng icon trên MÀN HÌNH CHÍNH (Safari thường không có PushManager) ⇒ hướng dẫn cài app.
   Xin quyền PHẢI nằm ngay trong cú bấm (Notification.requestPermission là lệnh chờ ĐẦU TIÊN của bat()).

   API: ACDay.gan(nut) — gắn vào mục menu (nhãn tự đổi theo trạng thái) · ACDay.trangThai() · ACDay.bat() · ACDay.tat()
        ACDay.tatLopDs() / ACDay.datTatLop(lop, tat) — TẮT THÔNG BÁO NHÓM LỚP (lưu nwUsers/<uid>/rieng/tatLop + chép vào máy)
        ACDay.moGuiThay() — hộp THẦY GỬI THÔNG BÁO (dashboard, hàm máy chủ dayThayGui)
   ============================================================ */
(function () {
  'use strict';
  if (window.ACDay) return;
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var GOC = SRC.replace(/js\/day\.js.*$/, '');
  var KHOA_CONG_KHAI = 'BCCpzKHeGNtwbW2lIo705hxvQPAc2g6U44L4HiwJ8ngFceTFgB2KJTK5JBaLclmCONFKG92MkUXLH-op7BqD6Ko';
  var HAM_GUI = 'https://asia-southeast1-aword-70dae.cloudfunctions.net/dayThayGui';
  var K_BAT = 'ac_day_bat', K_MOC = 'ac_day_moc';
  var UA = navigator.userAgent || '';
  var LA_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } return null; }
  function an(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function laApp() {
    try { if (window.matchMedia('(display-mode: standalone)').matches) return true; } catch (e) { }
    return navigator.standalone === true;
  }
  function coPush() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext; }
  function dangThayEm() { return !!(window.__thayVao || /[?&]thayvao=1/.test(location.search) || (window.NW && NW.chiXem && NW.chiXem())); }

  // 'bat' · 'tat' · 'chan' (đã chặn quyền) · 'canCai' (iPhone chưa mở bằng app) · 'cuIOS' (app nhưng iOS cũ) · 'khong' (không hỗ trợ)
  function trangThai() {
    if (!coPush()) return LA_IOS ? (laApp() ? 'cuIOS' : 'canCai') : 'khong';
    if (Notification.permission === 'denied') return 'chan';
    return Notification.permission === 'granted' && ls(K_BAT) === '1' ? 'bat' : 'tat';
  }

  // ---------- Firebase + người đang đăng nhập (chung app với nw-phien.js / nw/js/loi.js) ----------
  var _fb = null;
  function nap(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function fb() {
    if (window.NW && NW.fb) return NW.fb();
    if (window.NWP && NWP.fb) return NWP.fb();
    if (!_fb) _fb = nap(GOC + 'js/nw-phien.js?v=8').then(function () { return NWP.fb(); });
    return _fb;
  }
  function toi() {
    return fb().then(function (f) {
      var lay = f.auth.currentUser ? Promise.resolve(f.auth.currentUser) : new Promise(function (res) { var stop = f.au.onAuthStateChanged(f.auth, function (u) { stop(); res(u || null); }); });
      return lay.then(function (u) {
        if (!u) return null;
        return u.getIdTokenResult().then(function (r) {
          var c = r.claims || {}, hs = c.hs === true;
          return { f: f, u: u, uid: u.uid, hs: hs, thay: !hs && c.thay === true, ma: hs ? String(c.ma || '') : 'GV', lops: hs && c.lops ? String(c.lops).split(',') : [] };
        });
      });
    });
  }

  function u8(b64) {
    var p = '='.repeat((4 - b64.length % 4) % 4), s = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }
  function sha1(s) {
    return crypto.subtle.digest('SHA-1', new TextEncoder().encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
    });
  }
  function dangKySw() {
    return navigator.serviceWorker.register(GOC + 'sw-day.js', { scope: GOC }).then(function (reg) {
      return navigator.serviceWorker.ready.then(function () { return reg; });
    });
  }

  // ---------- tắt thông báo NHÓM LỚP ----------
  var _tatLop = null;
  function tatLopDs() {
    if (_tatLop) return _tatLop;
    _tatLop = toi().then(function (me) {
      if (!me) return [];
      return me.f.fs.getDoc(me.f.fs.doc(me.f.db, 'nwUsers', me.uid, 'rieng', 'tatLop')).then(function (s) {
        var d = s.exists() ? s.data() : {}; return Array.isArray(d.ds) ? d.ds.filter(function (x) { return typeof x === 'string'; }) : [];
      });
    }).catch(function () { _tatLop = null; return []; });
    return _tatLop;
  }
  function datTatLop(lop, tat) {
    return Promise.all([toi(), tatLopDs()]).then(function (kq) {
      var me = kq[0], ds = kq[1].filter(function (x) { return x !== lop; });
      if (!me) throw new Error('chua-dang-nhap');
      if (tat) ds.push(lop);
      ds = ds.slice(0, 60);
      _tatLop = Promise.resolve(ds);
      var fs = me.f.fs, db = me.f.db;
      return fs.setDoc(fs.doc(db, 'nwUsers', me.uid, 'rieng', 'tatLop'), { ds: ds, luc: Date.now() }).then(function () {
        // chép sang mọi máy đã bật của mình (máy chủ lọc theo tatLop của từng máy — không phải đọc thêm lúc gửi)
        return fs.getDocs(fs.query(fs.collection(db, 'dayThietBi'), fs.where('uid', '==', me.uid))).then(function (s) {
          var b = fs.writeBatch(db); s.forEach(function (d) { b.update(d.ref, { tatLop: ds }); }); return b.commit();
        }).catch(function (e) { console.warn('[day] chép tắt lớp sang máy', e); });
      }).then(function () {
        try { window.dispatchEvent(new CustomEvent('ac-tn-tat', { detail: { ds: ds } })); } catch (e) { }
        return ds;
      });
    });
  }

  // ---------- lưu máy ----------
  function luuMay(me, sub) {
    var j = sub.toJSON ? sub.toJSON() : sub;
    var o = { endpoint: String(j.endpoint || ''), keys: { p256dh: String((j.keys || {}).p256dh || ''), auth: String((j.keys || {}).auth || '') } };
    return Promise.all([sha1(o.endpoint), tatLopDs()]).then(function (kq) {
      var id = kq[0];
      var doc = { uid: me.uid, ma: me.ma, thay: me.thay, lops: me.lops, tatLop: kq[1], sub: o, ua: UA.slice(0, 160), luc: Date.now(), goc: GOC.slice(0, 200) };
      return me.f.fs.setDoc(me.f.fs.doc(me.f.db, 'dayThietBi', id), doc).then(function () {
        ls(K_MOC, [me.uid, me.lops.join(','), id, new Date().toISOString().slice(0, 10)].join('|'));
        return id;
      });
    });
  }

  function bat() {
    if (dangThayEm()) return Promise.reject(new Error('thay-em'));
    // ⛔ xin quyền là lệnh chờ ĐẦU TIÊN (iPhone đòi nằm trong cú bấm)
    var hoi = Notification.permission === 'granted' ? Promise.resolve('granted') : Notification.requestPermission();
    return Promise.resolve(hoi).then(function (q) {
      if (q !== 'granted') throw new Error(q === 'denied' ? 'chan' : 'tu-choi');
      return Promise.all([dangKySw(), toi()]);
    }).then(function (kq) {
      var reg = kq[0], me = kq[1];
      if (!me) throw new Error('chua-dang-nhap');
      return reg.pushManager.getSubscription().then(function (s) {
        return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(KHOA_CONG_KHAI) });
      }).then(function (sub) { return luuMay(me, sub); });
    }).then(function () { ls(K_BAT, '1'); veNut(); });
  }
  // ⭐ v1.256.0 (06/10/2026, thầy chốt) — ĐĂNG XUẤT là GỠ thông báo của máy này: xoá tài liệu máy (lúc phiên CÒN sống) + huỷ
  //   đăng ký đẩy. Quyền thông báo của trình duyệt giữ nguyên ⇒ đăng nhập lại, bấm "Bật thông báo" là bật ngay (không hỏi lại).
  //   Tối đa 2,5 giây — mạng chậm cũng không giữ chân nút Đăng xuất.
  function goKhiThoat() {
    return Promise.race([tatNgam(), new Promise(function (r) { setTimeout(r, 2500); })]);
  }
  function tatNgam() {
    ls(K_BAT, null); ls(K_MOC, null);
    if (!('serviceWorker' in navigator)) return Promise.resolve();
    return navigator.serviceWorker.getRegistration(GOC).then(function (reg) {
      return reg && reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (!sub) return;
      return sha1(sub.endpoint).then(function (id) {
        return toi().then(function (me) { if (me) return me.f.fs.deleteDoc(me.f.fs.doc(me.f.db, 'dayThietBi', id)).catch(function () { }); });
      }).catch(function () { }).then(function () { return sub.unsubscribe(); });
    }).catch(function (e) { console.warn('[day] gỡ', e); });
  }
  function tat() {
    ls(K_BAT, null); ls(K_MOC, null);
    var xong = !('serviceWorker' in navigator) ? Promise.resolve() : navigator.serviceWorker.getRegistration(GOC).then(function (reg) {
      return reg && reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (!sub) return;
      return sha1(sub.endpoint).then(function (id) {
        return toi().then(function (me) { if (me) return me.f.fs.deleteDoc(me.f.fs.doc(me.f.db, 'dayThietBi', id)).catch(function () { }); });
      }).then(function () { return sub.unsubscribe(); });
    });
    return xong.catch(function (e) { console.warn('[day] tắt', e); }).then(veNut);
  }
  // Mỗi lần mở trang (đã bật): đảm bảo còn đăng ký + tài liệu máy đúng người/lớp; làm mới mỗi ngày (endpoint có thể đổi).
  function dongBo() {
    if (trangThai() !== 'bat' || dangThayEm()) return;
    Promise.all([dangKySw(), toi()]).then(function (kq) {
      var reg = kq[0], me = kq[1]; if (!me) return;
      // v1.256.0 — người KHÁC đăng nhập trên trình duyệt này (người trước không bấm Đăng xuất) ⇒ KHÔNG chuyển máy sang người mới
      //   (họ chưa từng bật) — gỡ hẳn; người mới muốn nhận thì tự bấm "Bật thông báo".
      var uidCu = String(ls(K_MOC) || '').split('|')[0];
      if (uidCu && uidCu !== me.uid) return tatNgam().then(veNut);
      return reg.pushManager.getSubscription().then(function (s) {
        return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(KHOA_CONG_KHAI) });
      }).then(function (sub) {
        return sha1(sub.endpoint).then(function (id) {
          var moc = [me.uid, me.lops.join(','), id, new Date().toISOString().slice(0, 10)].join('|');
          if (ls(K_MOC) !== moc) return luuMay(me, sub);
        });
      });
    }).catch(function (e) { console.warn('[day] đồng bộ máy', e); });
  }

  // ---------- hộp nhỏ (cùng dáng hộp "Cài app" js/cai-app.js) ----------
  var CSS = '.dy-nen{position:fixed;inset:0;z-index:2147483000;background:rgba(15,25,30,.45);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .18s ease}' +
    '.dy-nen.mo{opacity:1}' +
    '.dy-hop{position:relative;width:min(400px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#16232A;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.25);padding:24px 22px 20px;font-family:Montserrat,"Segoe UI",system-ui,sans-serif}' +
    '.dy-hop h3{margin:0 0 8px;font-size:18px;font-weight:800;line-height:1.3;text-align:center}' +
    '.dy-hop p{margin:0 0 10px;font-size:14px;color:#5F7370;line-height:1.5;text-align:center}' +
    '.dy-hop ol{margin:6px 0 0;padding:0 0 0 20px;font-size:14px;line-height:1.6}' +
    '.dy-ic{display:grid;place-items:center;width:64px;height:64px;margin:0 auto 12px;border-radius:50%;background:#E4F3F0;color:#0E7C6E}' +
    '.dy-ic svg{width:32px;height:32px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.dy-nut{display:block;width:100%;margin-top:14px;border:0;border-radius:14px;background:#0E7C6E;color:#fff;font:800 15px/1 Montserrat,"Segoe UI",system-ui,sans-serif;letter-spacing:.04em;padding:15px;cursor:pointer}' +
    '.dy-nut.phu{background:#EEF2F1;color:#16232A;margin-top:8px}.dy-nut.nguy{background:#E5383B}.dy-nut:disabled{opacity:.6;cursor:default}' +
    '.dy-lops{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 4px}' +
    '.dy-lops label{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:999px;background:#F0F4F3;font-size:13.5px;font-weight:700;cursor:pointer}' +
    '.dy-lops input{margin:0}' +
    '.dy-hop .dy-o{width:100%;box-sizing:border-box;border:1.5px solid #D9E3E1;border-radius:12px;padding:10px 12px;font:500 15px/1.4 "Segoe UI",system-ui,sans-serif;margin:4px 0 6px;resize:vertical}' +
    '.dy-hop .dy-nh{display:block;font-size:13px;font-weight:800;margin:10px 0 2px;color:#16232A}' +
    '.dy-hop .dy-bao{min-height:18px;font-size:13px;text-align:center;color:#0E7C6E;margin:8px 0 0}';
  var CHUONG = '<svg viewBox="0 0 24 24"><path d="M6.2 8.5a5.8 5.8 0 0 1 11.6 0c0 6.5 2.7 8.3 2.7 8.3H3.5s2.7-1.8 2.7-8.3"/><path d="M10.4 20.5a1.8 1.8 0 0 0 3.2 0"/></svg>';
  var CHUONG_TAT = '<svg viewBox="0 0 24 24"><path d="M6.2 8.5a5.8 5.8 0 0 1 9.9-4.1M17.8 9.3c.3 5.6 2.7 7.5 2.7 7.5H7"/><path d="M10.4 20.5a1.8 1.8 0 0 0 3.2 0"/><path d="M3 3l18 18"/></svg>';
  function hop(html) {
    if (!document.getElementById('dyCss')) { var st = document.createElement('style'); st.id = 'dyCss'; st.textContent = CSS; document.head.appendChild(st); }
    var nen = document.createElement('div'); nen.className = 'dy-nen';
    nen.innerHTML = '<div class="dy-hop" role="dialog" aria-modal="true">' + html + '</div>';
    function dong() { nen.classList.remove('mo'); document.removeEventListener('keydown', phim); setTimeout(function () { nen.remove(); }, 200); }
    function phim(e) { if (e.key === 'Escape') dong(); }
    nen.addEventListener('click', function (e) { if (e.target === nen || e.target.closest('[data-dy-dong]')) dong(); });
    document.addEventListener('keydown', phim);
    document.body.appendChild(nen);
    requestAnimationFrame(function () { nen.classList.add('mo'); });
    return { nen: nen, dong: dong, $: function (s) { return nen.querySelector(s); } };
  }
  function baoHop(tieuDe, chu, nutChu) {
    return hop('<div class="dy-ic">' + CHUONG + '</div><h3>' + tieuDe + '</h3>' + chu + '<button type="button" class="dy-nut" data-dy-dong>' + (nutChu || 'ĐÃ HIỂU') + '</button>');
  }

  // ---------- mục menu ----------
  var NUT = [];
  var NHAN = {
    bat: ['Thông báo đang bật', 'Bấm để tắt trên máy này'],
    tat: ['Bật thông báo', 'Báo ngay khi có tin nhắn mới'],
    canCai: ['Bật thông báo', 'Cần mở bằng app trên màn hình chính'],
    cuIOS: ['Bật thông báo', 'Cần iOS 16.4 trở lên'],
    chan: ['Thông báo đang bị chặn', 'Mở lại trong cài đặt máy'],
    khong: ['Thông báo', 'Trình duyệt này chưa hỗ trợ']
  };
  function veNut() {
    var t = trangThai(), n = NHAN[t];
    NUT.forEach(function (nut) {
      // ⛔ không dùng [hidden]: .sb-item có display:flex đè mất (bẫy đã gặp ở nút Cài app)
      nut.style.display = (t === 'khong' || dangThayEm()) ? 'none' : '';
      var a = nut.querySelector('.nh, .ten'), b = nut.querySelector('.mo-ta, .mo');
      if (a) a.textContent = n[0];
      if (b) b.textContent = n[1];
    });
  }
  function bamNut() {
    var t = trangThai();
    if (t === 'tat') {
      bat().then(function () {
        baoHop('Đã bật thông báo', '<p>Có tin nhắn mới, máy sẽ báo ngay — kể cả khi không mở trang.</p>');
      }, function (e) {
        var m = String(e && e.message);
        if (m === 'chan') moHuongDanChan();
        else if (m === 'tu-choi') baoHop('Chưa bật được', '<p>Em chưa bấm <b>Cho phép</b>. Bấm lại mục này rồi chọn <b>Cho phép</b> nhé.</p>');
        else if (m === 'thay-em') baoHop('Đang mở thay em', '<p>Không bật thông báo cho máy của thầy bằng tài khoản em.</p>');
        else { console.warn('[day] bật', e); baoHop('Chưa bật được', '<p>Có lỗi khi bật thông báo (' + an(m).slice(0, 80) + '). Em tải lại trang rồi thử lại nhé.</p>'); }
        veNut();
      });
      return;
    }
    if (t === 'bat') {
      var h = hop('<div class="dy-ic">' + CHUONG + '</div><h3>Tắt thông báo trên máy này?</h3><p>Máy này sẽ không báo tin nhắn mới nữa. Máy khác vẫn giữ nguyên.</p>' +
        '<button type="button" class="dy-nut nguy" data-dy-tat>TẮT THÔNG BÁO</button><button type="button" class="dy-nut phu" data-dy-dong>Giữ nguyên</button>');
      h.$('[data-dy-tat]').onclick = function () { h.dong(); tat(); };
      return;
    }
    if (t === 'canCai') {
      var h2 = hop('<div class="dy-ic">' + CHUONG + '</div><h3>Thêm vào màn hình chính trước nhé</h3>' +
        '<p>Trên iPhone, thông báo chỉ chạy khi mở Andrew Classes bằng <b>icon trên màn hình chính</b>.</p>' +
        '<p>Cài xong, mở app từ icon đó, đăng nhập rồi bấm lại <b>Bật thông báo</b> trong menu ☰.</p>' +
        '<button type="button" class="dy-nut" data-dy-cai>XEM CÁCH CÀI</button><button type="button" class="dy-nut phu" data-dy-dong>Để sau</button>');
      h2.$('[data-dy-cai]').onclick = function () { h2.dong(); if (window.CaiApp) CaiApp.mo(); };
      return;
    }
    if (t === 'cuIOS') { baoHop('Cần cập nhật iPhone', '<p>Thông báo cần <b>iOS 16.4</b> trở lên. Em vào <b>Cài đặt → Cài đặt chung → Cập nhật phần mềm</b> nhé.</p>'); return; }
    if (t === 'chan') moHuongDanChan();
  }
  function moHuongDanChan() {
    var ds = LA_IOS
      ? '<ol><li>Mở <b>Cài đặt</b> của iPhone → <b>Thông báo</b>.</li><li>Chọn <b>Andrew Classes</b>.</li><li>Bật <b>Cho phép thông báo</b>, rồi mở lại app.</li></ol>'
      : '<ol><li>Bấm biểu tượng <b>ổ khoá / cài đặt</b> ở đầu thanh địa chỉ.</li><li>Mục <b>Thông báo</b> → chọn <b>Cho phép</b>.</li><li>Tải lại trang rồi bấm lại <b>Bật thông báo</b>.</li></ol>';
    baoHop('Thông báo đang bị chặn', '<p>Máy này đã chặn thông báo của Andrew Classes. Mở lại như sau:</p>' + ds);
  }
  function gan(nut) {
    if (!nut || nut.getAttribute('data-dy')) return;
    nut.setAttribute('data-dy', '1');
    NUT.push(nut);
    nut.addEventListener('click', bamNut);
    veNut();
  }

  // ---------- THẦY GỬI THÔNG BÁO (dashboard) ----------
  function moGuiThay() {
    var h = hop('<div class="dy-ic">' + CHUONG + '</div><h3>Gửi thông báo</h3><p>Đẩy tới máy các em đã bật thông báo.</p>' +
      '<span class="dy-nh">Gửi tới</span><div class="dy-lops" id="dyLops"><label><input type="checkbox" value="*"> Tất cả học sinh</label></div>' +
      '<span class="dy-nh">Tiêu đề</span><input class="dy-o" id="dyTieu" maxlength="60" value="Thầy Andrew">' +
      '<span class="dy-nh">Nội dung</span><textarea class="dy-o" id="dyChu" rows="3" maxlength="200" placeholder="VD: Tối nay 20:00 có bài mới, các em vào làm nhé!"></textarea>' +
      '<p class="dy-bao" id="dyBao"></p><button type="button" class="dy-nut" id="dyGui">GỬI</button><button type="button" class="dy-nut phu" data-dy-dong>Đóng</button>');
    var lops = h.$('#dyLops');
    fetch((window.AC_GOC_DL || GOC) + 'data/lop.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (dl) {
      (dl.lop || []).concat(dl.khoa || []).forEach(function (l) {
        var g = String(l.tenGoc || l.maLop), ten = /[a-z]{3,}/i.test(g.normalize('NFD').replace(/[̀-ͯ]/g, '')) ? g : 'Lớp ' + g;
        lops.insertAdjacentHTML('beforeend', '<label><input type="checkbox" value="' + an(l.maLop) + '"> ' + an(ten) + '</label>');
      });
    }).catch(function () { h.$('#dyBao').textContent = 'Chưa tải được danh sách lớp — vẫn gửi được "Tất cả học sinh".'; });
    h.$('#dyGui').onclick = function () {
      var chon = Array.prototype.map.call(lops.querySelectorAll('input:checked'), function (x) { return x.value; });
      var tatCa = chon.indexOf('*') >= 0, chu = h.$('#dyChu').value.trim(), bao = h.$('#dyBao'), nut = this;
      if (!chu) { bao.textContent = 'Thầy gõ nội dung trước nhé.'; return; }
      if (!tatCa && !chon.length) { bao.textContent = 'Thầy chọn lớp (hoặc Tất cả học sinh).'; return; }
      nut.disabled = true; bao.textContent = 'Đang gửi…';
      toi().then(function (me) {
        if (!me) throw new Error('Chưa đăng nhập phiên thầy.');
        return me.u.getIdToken();
      }).then(function (tk) {
        return fetch(HAM_GUI, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
          body: JSON.stringify({ data: { tatCa: tatCa, lops: tatCa ? [] : chon, tieuDe: h.$('#dyTieu').value.trim(), chu: chu } }) });
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j.error) throw new Error(j.error.message || 'lỗi máy chủ');
        var k = j.result || {};
        bao.textContent = k.soMay ? 'Đã gửi tới ' + k.gui + '/' + k.soMay + ' máy.' : 'Chưa máy nào trong các lớp này bật thông báo.';
        nut.disabled = false;
      }).catch(function (e) { bao.textContent = 'Chưa gửi được: ' + String(e && e.message || e).slice(0, 120); nut.disabled = false; });
    };
  }

  window.ACDay = { trangThai: trangThai, bat: bat, tat: tat, goKhiThoat: goKhiThoat, gan: gan, veNut: veNut, tatLopDs: tatLopDs, datTatLop: datTatLop, moGuiThay: moGuiThay, IC: { chuong: CHUONG, chuongTat: CHUONG_TAT } };
  setTimeout(dongBo, 3000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') veNut(); });
})();
