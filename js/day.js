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
  var HAM_XEM_NHAC = 'https://asia-southeast1-aword-70dae.cloudfunctions.net/nhacHanXemTruoc';   // v1.257.0
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
  // ⭐ v1.290.0 (09/10/2026, thầy chốt) — TẮT TẠM: mỗi phần tử danh sách là "MÃLỚP" (tắt hẳn, như cũ) hoặc "MÃLỚP@<ms hết hạn>"
  //   (tắt tạm 1/3/5/8 giờ · đến 7h sáng mai). Giữ nguyên MỘT danh sách chuỗi ⇒ KHÔNG cần đổi luật kho (dayThietBi.tatLop là list,
  //   rieng/tatLop.ds là list); máy chủ dayTinLop đọc cùng khuôn (hết hạn = bật lại, không ai phải dọn). Bản trang CŨ coi
  //   "A1C@…" là mã lạ ⇒ chỉ mất tắt tạm, không hỏng gì.
  //   ĐỒNG BỘ 3 nơi (Quản lý & bảo mật › Thông báo · ⋮ ô chat dashboard · ⋯ nhóm lớp trang Tin nhắn): cùng đọc/ghi nwUsers/<uid>/rieng/tatLop;
  //   cùng trình duyệt báo nhau qua localStorage (sự kiện storage) + 'ac-tn-tat'; máy khác đọc lại khi quay lại trang (≥ 20 giây).
  var K_TAT = 'ac_tat_lop';
  var _tatLop = null, TAT_RAW = null, TAT_DOC_LUC = 0, TAT_HEN = null;
  function docTat(ds) {   // { maLop: 'han' | ms hết hạn } — chỉ phần CÒN hiệu lực
    var o = {}, nay = Date.now();
    (ds || []).forEach(function (s) {
      if (typeof s !== 'string' || !s) return;
      var i = s.lastIndexOf('@');
      if (i < 0) { o[s] = 'han'; return; }
      var lop = s.slice(0, i), den = Number(s.slice(i + 1)) || 0;
      if (lop && den > nay && o[lop] !== 'han' && !(o[lop] > den)) o[lop] = den;
    });
    return o;
  }
  function ghiTat(o) { return Object.keys(o).map(function (k) { return o[k] === 'han' ? k : k + '@' + Math.round(o[k]); }); }
  function dsHieuLuc() { return Object.keys(docTat(TAT_RAW)); }
  function phatTat() {
    var ds = dsHieuLuc();
    clearTimeout(TAT_HEN);                     // hết hạn tắt tạm sớm nhất ⇒ báo lại (chuông/số đỏ đổi đúng lúc)
    var o = docTat(TAT_RAW), som = 0;
    Object.keys(o).forEach(function (k) { if (o[k] !== 'han' && (!som || o[k] < som)) som = o[k]; });
    if (som) TAT_HEN = setTimeout(phatTat, Math.min(2147483000, som - Date.now() + 500));
    try { window.dispatchEvent(new CustomEvent('ac-tn-tat', { detail: { ds: ds, cai: o } })); } catch (e) { }
  }
  function napTat(moi) {   // danh sách THÔ trong kho
    if (_tatLop && !moi) return _tatLop;
    _tatLop = toi().then(function (me) {
      if (!me) return [];
      return me.f.fs.getDoc(me.f.fs.doc(me.f.db, 'nwUsers', me.uid, 'rieng', 'tatLop')).then(function (s) {
        var d = s.exists() ? s.data() : {}; return Array.isArray(d.ds) ? d.ds.filter(function (x) { return typeof x === 'string'; }) : [];
      });
    }).then(function (ds) {
      var doi = JSON.stringify(ds) !== JSON.stringify(TAT_RAW);
      TAT_RAW = ds; TAT_DOC_LUC = Date.now();
      if (doi) phatTat();
      return ds;
    }).catch(function () { _tatLop = null; return TAT_RAW || []; });
    return _tatLop;
  }
  // Mã các lớp ĐANG tắt (hẳn hoặc tạm còn hạn) — giữ khuôn cũ cho tn-pop-ds.js / nw/js/chat.js.
  function tatLopDs() { return napTat().then(function () { return dsHieuLuc(); }); }
  // Trạng thái một lớp: { tat: false } | { tat: 'han' } | { tat: 'tam', den: ms }. Đồng bộ (bản đã đọc), dùng sau tatLopDs()/caiTat().
  function dangTat(lop) {
    var v = docTat(TAT_RAW)[lop];
    return v === 'han' ? { tat: 'han' } : v ? { tat: 'tam', den: v } : { tat: false };
  }
  function caiTat(moi) { return napTat(moi).then(function () { return docTat(TAT_RAW); }); }
  // Các mức tắt (thầy chốt 09/10): 1 · 3 · 5 · 8 giờ · đến 7h sáng mai · tắt hẳn (đến khi bật lại).
  var MUC_TAT = [{ k: '1', chu: 'Tắt 1 giờ' }, { k: '3', chu: 'Tắt 3 giờ' }, { k: '5', chu: 'Tắt 5 giờ' }, { k: '8', chu: 'Tắt 8 giờ' },
    { k: 'sang', chu: 'Tắt đến 7h sáng mai' }, { k: 'han', chu: 'Tắt đến khi bật lại' }];
  function denCua(k) {
    if (k === 'han') return 'han';
    if (k === 'sang') {   // 7:00 kế tiếp (đang 0h–6h59 ⇒ 7h sáng nay)
      var d = new Date(); if (d.getHours() >= 7) d.setDate(d.getDate() + 1);
      d.setHours(7, 0, 0, 0); return d.getTime();
    }
    return Date.now() + (Number(k) || 1) * 3600e3;
  }
  function chuTat(tt) {   // "Đang bật" · "Đã tắt" · "Tắt đến 15:30" · "Tắt đến 07:00 mai"
    if (!tt || !tt.tat) return 'Đang bật';
    if (tt.tat === 'han') return 'Đã tắt';
    var d = new Date(tt.den), nay = new Date(), hh = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var homNay = d.toDateString() === nay.toDateString();
    nay.setDate(nay.getDate() + 1);
    return 'Tắt đến ' + hh + (homNay ? '' : d.toDateString() === nay.toDateString() ? ' mai' : ' ' + d.getDate() + '/' + (d.getMonth() + 1));
  }
  // tat: true | 'han' = tắt hẳn · false = bật · số ms (mốc hết hạn) = tắt tạm · '1'/'3'/'5'/'8'/'sang' = mức trong MUC_TAT.
  function datTatLop(lop, tat) {
    return Promise.all([toi(), napTat()]).then(function (kq) {
      var me = kq[0];
      if (!me) throw new Error('chua-dang-nhap');
      if (typeof tat === 'string' && tat !== 'han') tat = denCua(tat);
      var o = docTat(kq[1]);   // dọn luôn các mốc đã hết hạn
      delete o[lop];
      if (tat === true || tat === 'han') o[lop] = 'han';
      else if (typeof tat === 'number' && tat > Date.now()) o[lop] = tat;
      var ds = ghiTat(o).slice(0, 60);
      TAT_RAW = ds; TAT_DOC_LUC = Date.now(); _tatLop = Promise.resolve(ds);
      ls(K_TAT, JSON.stringify({ uid: me.uid, ds: ds, luc: Date.now() }));   // trang khác cùng trình duyệt nghe 'storage'
      var fs = me.f.fs, db = me.f.db;
      return fs.setDoc(fs.doc(db, 'nwUsers', me.uid, 'rieng', 'tatLop'), { ds: ds, luc: Date.now() }).then(function () {
        // chép sang mọi máy đã bật của mình (máy chủ lọc theo tatLop của từng máy — không phải đọc thêm lúc gửi)
        return fs.getDocs(fs.query(fs.collection(db, 'dayThietBi'), fs.where('uid', '==', me.uid))).then(function (s) {
          var b = fs.writeBatch(db); s.forEach(function (d) { b.update(d.ref, { tatLop: ds }); }); return b.commit();
        }).catch(function (e) { console.warn('[day] chép tắt lớp sang máy', e); });
      }).then(function () {
        phatTat();
        return dsHieuLuc();
      });
    });
  }
  window.addEventListener('storage', function (e) {
    if (e.key !== K_TAT || !e.newValue) return;
    try { var v = JSON.parse(e.newValue); if (Array.isArray(v.ds)) { TAT_RAW = v.ds; TAT_DOC_LUC = Date.now(); _tatLop = Promise.resolve(v.ds); phatTat(); } } catch (x) { }
  });
  // Quay lại trang (máy khác có thể vừa đổi) ⇒ đọc lại kho, tối đa 1 lần / 20 giây; chỉ khi trang đã từng đọc.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && TAT_RAW && Date.now() - TAT_DOC_LUC > 20000) napTat(true);
  });

  // ---------- MÁY ĐÃ BẬT THÔNG BÁO của người đang đăng nhập (v1.290.0 — bảng Thông báo trên dashboard) ----------
  function tenMay(ua) {
    ua = String(ua || '');
    var may = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Điện thoại Android' : /Windows/.test(ua) ? 'Máy tính Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Máy Mac' : /Linux/.test(ua) ? 'Máy Linux' : 'Máy khác';
    var tr = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return may + (tr ? ' · ' + tr : '');
  }
  function idMayNay() { return String(ls(K_MOC) || '').split('|')[2] || ''; }
  function mayCuaToi() {
    return toi().then(function (me) {
      if (!me) throw new Error('chua-dang-nhap');
      var fs = me.f.fs;
      return fs.getDocs(fs.query(fs.collection(me.f.db, 'dayThietBi'), fs.where('uid', '==', me.uid))).then(function (s) {
        var nay = trangThai() === 'bat' ? idMayNay() : '', ds = [];
        s.forEach(function (d) { var x = d.data() || {}; ds.push({ id: d.id, ten: tenMay(x.ua), luc: Number(x.luc) || 0, mayNay: d.id === nay }); });
        return ds.sort(function (a, b) { return (b.mayNay - a.mayNay) || (b.luc - a.luc); });
      });
    });
  }
  function goMay(id) {
    if (id && id === idMayNay() && trangThai() === 'bat') return tat();
    return toi().then(function (me) {
      if (!me) throw new Error('chua-dang-nhap');
      return me.f.fs.deleteDoc(me.f.fs.doc(me.f.db, 'dayThietBi', id));
    });
  }

  // ---------- lưu máy ----------
  function luuMay(me, sub) {
    var j = sub.toJSON ? sub.toJSON() : sub;
    var o = { endpoint: String(j.endpoint || ''), keys: { p256dh: String((j.keys || {}).p256dh || ''), auth: String((j.keys || {}).auth || '') } };
    return Promise.all([sha1(o.endpoint), napTat()]).then(function (kq) {   // v1.290.0 — chép danh sách THÔ (kèm tắt tạm)
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
          if (ls(K_MOC) === moc) return;
          // v1.290.0 — máy này đã bị GỠ từ máy khác (bảng "Máy đã bật thông báo" trên dashboard): cùng id cũ mà tài liệu không còn
          //   ⇒ tắt hẳn ở đây, KHÔNG tự đăng ký lại (bản cũ mỗi ngày luuMay lại ⇒ gỡ xong hôm sau máy tự hiện lại).
          //   Đọc tài liệu không có ⇒ luật trả permission-denied (resource null) ⇒ coi như đã bị gỡ.
          if (String(ls(K_MOC) || '').split('|')[2] === id) {
            return me.f.fs.getDoc(me.f.fs.doc(me.f.db, 'dayThietBi', id)).then(function (d) { return d.exists(); }, function (e) {
              if (e && e.code === 'permission-denied') return false; throw e;
            }).then(function (con) {
              if (con) return luuMay(me, sub);
              return sub.unsubscribe().catch(function () { }).then(function () { ls(K_BAT, null); ls(K_MOC, null); veNut(); });
            });
          }
          return luuMay(me, sub);
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
    '.dy-hop .dy-bao{min-height:18px;font-size:13px;text-align:center;color:#0E7C6E;margin:8px 0 0}' +
    /* v1.257.0 — hộp NHẮC HẠN BÀI */
    '.dy-hop.rong{width:min(560px,100%)}' +
    '.dy-cong{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#F4F8F7;border-radius:14px;padding:12px 14px;font-size:14.5px;font-weight:700}' +
    '.dy-cong input{width:22px;height:22px;accent-color:#0E7C6E}' +
    '.dy-chips{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}' +
    '.dy-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 6px 6px 12px;border-radius:999px;background:#E4F3F0;color:#0B6156;font-size:13.5px;font-weight:800}' +
    '.dy-chip button{border:0;background:#fff;color:#5F7370;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1}' +
    '.dy-them{display:flex;gap:6px;align-items:center}.dy-them input{width:70px}' +
    '.dy-hop select{border:1.5px solid #D9E3E1;border-radius:10px;padding:8px;font:600 14px "Segoe UI",system-ui,sans-serif;background:#fff}' +
    '.dy-them .dy-o{margin:0}.dy-nho{border:0;border-radius:10px;background:#0E7C6E;color:#fff;font-weight:800;padding:9px 12px;cursor:pointer}' +
    '.dy-lop{display:grid;grid-template-columns:1fr auto;gap:6px 8px;align-items:center;font-size:14px;margin:6px 0 2px}' +
    '.dy-lop .dy-rieng{grid-column:1/-1;margin:0 0 4px}' +
    '.dy-ds{font-size:13.5px;line-height:1.5;max-height:240px;overflow:auto;background:#F7FAF9;border-radius:12px;padding:8px 10px;margin-top:6px}' +
    '.dy-ds b{color:#16232A}.dy-hop .x{color:#8A9A97}.dy-ds > div{padding:4px 0;border-bottom:1px solid #E8EFED}.dy-ds > div:last-child{border:0}';
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

  // ---------- ⭐ v1.257.0 (06/10/2026, thầy chốt) — TỰ NHẮC HẠN BÀI: hộp cài đặt (dashboard, cột trái "Nhắc hạn bài") ----------
  // Kho `cauHinhNhac/chung` = { bat, moc:[phút], lop:{ <mã lớp>: { tat:true } | { moc:[phút] } }, capNhat } — hàm máy chủ nhacHanBai đọc.
  // Thiếu tài liệu = mặc định BẬT, mốc 1 ngày + 2 tiếng. "Xem trước" = hàm nhacHanXemTruoc (chỉ tính, không gửi).
  var MOC_MAC_DINH = [1440, 120];
  function chuMoc(p) { return p % 1440 === 0 ? (p / 1440) + ' ngày' : (p % 60 === 0 ? (p / 60) + ' giờ' : p + ' phút'); }
  function docMocGio(s) {   // "24, 3, 1.5" (giờ) -> [phút]
    return String(s || '').split(/[,;\s]+/).map(function (x) { return Math.round(parseFloat(x) * 60); })   // số lẻ dùng dấu chấm: 1.5
      .filter(function (x) { return x > 0 && x <= 14 * 1440; }).slice(0, 6);
  }
  function goiHam(url, data) {
    return toi().then(function (me) { if (!me) throw new Error('Chưa đăng nhập phiên thầy.'); return me.u.getIdToken(); }).then(function (tk) {
      return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify({ data: data || {} }) });
    }).then(function (r) { return r.json(); }).then(function (j) { if (j.error) throw new Error(j.error.message || 'lỗi máy chủ'); return j.result || {}; });
  }
  function tenLopHien(l) { var g = String(l.tenGoc || l.maLop); return /[a-z]{3,}/i.test(g.normalize('NFD').replace(/[̀-ͯ]/g, '')) ? g : 'Lớp ' + g; }
  function moNhacHan() {
    var h = hop('<div class="dy-ic">' + CHUONG + '</div><h3>Nhắc hạn bài</h3><p>Tự đẩy thông báo tới máy các em <b>chưa làm xong</b> trước hạn. 22h–6h không gửi (dời sang 6:00).</p>' +
      '<label class="dy-cong">Tự nhắc hạn bài<input type="checkbox" id="nhBat" checked></label>' +
      '<span class="dy-nh">Nhắc trước hạn</span><div class="dy-chips" id="nhMoc"></div>' +
      '<div class="dy-them"><input class="dy-o" id="nhSo" type="number" min="1" max="336" value="3"><select id="nhDv"><option value="60">giờ</option><option value="1440">ngày</option><option value="1">phút</option></select><button type="button" class="dy-nho" id="nhThem">+ Thêm mốc</button></div>' +
      '<span class="dy-nh">Từng lớp</span><div id="nhLop"><p class="x">Đang tải…</p></div>' +
      '<p class="dy-bao" id="nhBao"></p>' +
      '<button type="button" class="dy-nut" id="nhLuu">LƯU</button>' +
      '<button type="button" class="dy-nut phu" id="nhXem">Xem trước: ai sẽ được nhắc (48 giờ tới)</button>' +
      '<div class="dy-ds" id="nhKq" hidden></div>' +
      '<span class="dy-nh">Đã nhắc gần đây</span><div class="dy-ds" id="nhNk"><span class="x">Đang tải…</span></div>' +
      '<button type="button" class="dy-nut phu" data-dy-dong>Đóng</button>');
    h.$('.dy-hop').classList.add('rong');
    var CFG = { bat: true, moc: MOC_MAC_DINH.slice(), lop: {} }, DS_LOP = [];
    function veMoc() {
      CFG.moc.sort(function (a, b) { return b - a; });
      h.$('#nhMoc').innerHTML = CFG.moc.length ? CFG.moc.map(function (p, i) { return '<span class="dy-chip">' + chuMoc(p) + '<button type="button" data-xoa="' + i + '" aria-label="Bỏ">×</button></span>'; }).join('') : '<span class="x">Chưa có mốc nào</span>';
    }
    function veLop() {
      h.$('#nhLop').innerHTML = DS_LOP.map(function (l) {
        var c = CFG.lop[l.ma] || {}, kieu = c.tat ? 'tat' : (c.moc && c.moc.length ? 'rieng' : 'chung');
        return '<div class="dy-lop" data-lop="' + an(l.ma) + '"><span>' + an(l.ten) + '</span><select data-kieu><option value="chung"' + (kieu === 'chung' ? ' selected' : '') + '>Theo cài đặt chung</option>' +
          '<option value="tat"' + (kieu === 'tat' ? ' selected' : '') + '>Không nhắc</option><option value="rieng"' + (kieu === 'rieng' ? ' selected' : '') + '>Mốc riêng</option></select>' +
          '<input class="dy-o dy-rieng" data-gio placeholder="Số giờ trước hạn, cách nhau dấu phẩy — vd: 24, 3" value="' + (kieu === 'rieng' ? c.moc.map(function (p) { return Math.round(p / 6) / 10; }).join(', ') : '') + '"' + (kieu === 'rieng' ? '' : ' hidden') + '></div>';
      }).join('') || '<p class="x">Chưa tải được danh sách lớp.</p>';
    }
    h.$('#nhMoc').addEventListener('click', function (e) { var b = e.target.closest('[data-xoa]'); if (!b) return; CFG.moc.splice(+b.getAttribute('data-xoa'), 1); veMoc(); });
    h.$('#nhThem').onclick = function () {
      var p = Math.round((+h.$('#nhSo').value || 0) * (+h.$('#nhDv').value || 60));
      if (!(p > 0 && p <= 14 * 1440)) { h.$('#nhBao').textContent = 'Mốc phải từ 1 phút tới 14 ngày.'; return; }
      if (CFG.moc.length >= 6) { h.$('#nhBao').textContent = 'Tối đa 6 mốc.'; return; }
      if (CFG.moc.indexOf(p) < 0) CFG.moc.push(p);
      h.$('#nhBao').textContent = ''; veMoc();
    };
    h.$('#nhLop').addEventListener('change', function (e) {
      var s = e.target.closest('[data-kieu]'); if (!s) return;
      s.parentNode.querySelector('[data-gio]').hidden = s.value !== 'rieng';
    });
    toi().then(function (me) {
      if (!me) throw new Error('Chưa đăng nhập phiên thầy.');
      var fs = me.f.fs, db = me.f.db;
      fs.getDoc(fs.doc(db, 'cauHinhNhac', 'chung')).then(function (s) {
        if (s.exists()) { var d = s.data() || {}; CFG.bat = d.bat !== false; CFG.moc = Array.isArray(d.moc) && d.moc.length ? d.moc.slice() : MOC_MAC_DINH.slice(); CFG.lop = d.lop || {}; }
        h.$('#nhBat').checked = CFG.bat; veMoc(); veLop();
      }).catch(function (e) { h.$('#nhBao').textContent = 'Chưa đọc được cài đặt: ' + String(e && e.message || e).slice(0, 80); veMoc(); });
      fs.getDocs(fs.query(fs.collection(db, 'nhacHanDaGui'), fs.orderBy('luc', 'desc'), fs.limit(12))).then(function (s) {
        var ra = [];
        s.forEach(function (d) {
          var x = d.data() || {}, co = x.emCoMay || 0;
          ra.push('<div><b>' + an(x.lop) + ' · ' + an(x.bai) + (x.so ? ' · chặng ' + x.so : '') + '</b> <span class="x">(hạn ' + an(x.gio || '') + ', nhắc lúc ' +
            new Date(x.luc).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' }) + ')</span><br>' +
            (x.soEm ? x.soEm + ' em chưa xong · ' + co + ' em nhận được' + (x.soEm > co ? ' · <span class="x">' + (x.soEm - co) + ' em chưa bật thông báo</span>' : '') : 'cả lớp đã xong — không gửi') + '</div>');
        });
        h.$('#nhNk').innerHTML = ra.join('') || '<span class="x">Chưa nhắc lần nào.</span>';
      }).catch(function () { h.$('#nhNk').innerHTML = '<span class="x">Chưa đọc được nhật ký.</span>'; });
    }).catch(function (e) { h.$('#nhBao').textContent = String(e && e.message || e); veMoc(); });
    fetch((window.AC_GOC_DL || GOC) + 'data/lop.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (dl) {
      DS_LOP = (dl.lop || []).concat(dl.khoa || []).map(function (l) { return { ma: l.maLop, ten: tenLopHien(l) }; });
      veLop();
    }).catch(function () { veLop(); });
    h.$('#nhLuu').onclick = function () {
      var bao = h.$('#nhBao'), nut = this, lop = {};
      Array.prototype.forEach.call(h.$('#nhLop').querySelectorAll('[data-lop]'), function (r) {
        var kieu = r.querySelector('[data-kieu]').value, ma = r.getAttribute('data-lop');
        if (kieu === 'tat') lop[ma] = { tat: true };
        else if (kieu === 'rieng') { var m = docMocGio(r.querySelector('[data-gio]').value); if (m.length) lop[ma] = { moc: m }; }
      });
      if (!CFG.moc.length) { bao.textContent = 'Cần ít nhất một mốc nhắc.'; return; }
      nut.disabled = true; bao.textContent = 'Đang lưu…';
      toi().then(function (me) {
        if (!me) throw new Error('Chưa đăng nhập phiên thầy.');
        return me.f.fs.setDoc(me.f.fs.doc(me.f.db, 'cauHinhNhac', 'chung'), { bat: h.$('#nhBat').checked, moc: CFG.moc.slice(0, 6), lop: lop, capNhat: Date.now() });
      }).then(function () { CFG.lop = lop; bao.textContent = '✓ Đã lưu. Máy chủ áp dụng từ lượt kiểm kế tiếp (15 phút/lần).'; nut.disabled = false; },
        function (e) { bao.textContent = 'Chưa lưu được: ' + String(e && e.message || e).slice(0, 100); nut.disabled = false; });
    };
    h.$('#nhXem').onclick = function () {
      var kq = h.$('#nhKq'), nut = this; kq.hidden = false; kq.innerHTML = '<span class="x">Máy chủ đang tính…</span>'; nut.disabled = true;
      goiHam(HAM_XEM_NHAC).then(function (r) {
        nut.disabled = false;
        var ds = (r.ds || []).sort(function (a, b) { return a.moc - b.moc; });
        kq.innerHTML = ds.length ? ds.map(function (x) {
          return '<div><b>' + an(x.lop) + ' · ' + an(x.bai) + (x.so ? ' · chặng ' + x.so : '') + '</b> <span class="x">hạn ' + an(x.gio) + '</span><br>' +
            (x.em.length ? x.em.map(function (t, i) { return an(t) + (x.coMay[i] ? ' 🔔' : ''); }).join(', ') : '<span class="x">cả lớp đã xong</span>') + '</div>';
        }).join('') + '<div class="x">🔔 = em đã bật thông báo (nhận được nhắc). Bài chỉ có worksheet / bài nghe không tính.</div>' : '<span class="x">Không có bài nào hết hạn trong 48 giờ tới.</span>';
      }, function (e) { nut.disabled = false; kq.innerHTML = '<span class="x">Chưa xem được: ' + an(String(e && e.message || e).slice(0, 120)) + '</span>'; });
    };
  }

  window.ACDay = { trangThai: trangThai, bat: bat, tat: tat, goKhiThoat: goKhiThoat, gan: gan, veNut: veNut, tatLopDs: tatLopDs, datTatLop: datTatLop,
    caiTat: caiTat, dangTat: dangTat, chuTat: chuTat, MUC_TAT: MUC_TAT, mayCuaToi: mayCuaToi, goMay: goMay,   // v1.290.0
    moGuiThay: moGuiThay, moNhacHan: moNhacHan, IC: { chuong: CHUONG, chuongTat: CHUONG_TAT } };
  setTimeout(dongBo, 3000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') veNut(); });
})();
