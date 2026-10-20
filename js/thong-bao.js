/* ============================================================
   js/thong-bao.js — ⭐ v1.379.0 (20/10/2026) THÔNG BÁO TRANG CHỦ phía HỌC SINH (lop.html + khoa.html).
   Thầy tạo ở dashboard (hộp "Thông báo", js/tb-ql.js) ⇒ mỗi em nhận một phiếu `tbNhan/<mãTB>_<số HS>` { tb, so, m, t, lop, sao, nhan:false }.
   · Em mở trang ⇒ tìm phiếu của mình (truy vấn m == ID đăng nhập trong vé ve-doc.js), phiếu chưa xác nhận + thông báo `thongBao/<mãTB>`
     còn "Đang hiện" ⇒ hiện pop-up (js/tb-pop.js). Nhiều thông báo ⇒ lần lượt từng cái, cũ trước.
   · Bấm nút xác nhận ⇒ MỘT lượt ghi: tbNhan.nhan = true (+ nhanLuc), có thưởng sao thì kèm phiếu `saoDot/tb_<mãTB>_<số>` (+N) ⇒ hàm
     apDotSao cộng ví. Luật tools/dang-luat-thong-bao.js: đúng em, đúng N, một lần, thông báo phải đang hiện. Xong rồi thì không hiện nữa.
   · Thầy "đăng nhập thay em" / "xem như em" ⇒ không hiện. Pop-up quà 20-10 (js/qua-2010.js) đang mở ⇒ chờ nó đóng rồi mới hiện.
   ⛔ ES5 (iPad đời cũ).
   ============================================================ */
(function () {
  'use strict';
  if (window.__tbEm || window.__thayVao) return;
  window.__tbEm = 1;

  function layVe() {
    return new Promise(function (xong) {
      var lan = 0;
      (function thu() {
        var o = null;
        try { o = JSON.parse(localStorage.getItem('awc_ve') || 'null'); } catch (e) { o = null; }
        if (o && o.t && o.het > Date.now()) {
          try {
            var p = o.t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            while (p.length % 4) p += '=';
            return xong(JSON.parse(decodeURIComponent(escape(atob(p)))));
          } catch (e) { return xong(null); }
        }
        if (++lan > 24) return xong(null);
        setTimeout(thu, 500);
      })();
    });
  }

  function timDs() {
    return layVe().then(function (c) {
      if (!c || c.hs !== true || c.chiXem || !c.ma || !window.AWChat || !AWChat.kho) return null;
      return AWChat.kho().then(function (f) {
        var q = f.fs.query(f.fs.collection(f.db, 'tbNhan'), f.fs.where('m', '==', String(c.ma)));
        return f.fs.getDocs(q).then(function (s) {
          var cho = [];
          s.forEach(function (d) { var x = d.data() || {}; if (x.nhan === false && x.tb) cho.push({ id: d.id, tb: String(x.tb), so: String(x.so || ''), t: x.t || '', lop: x.lop || '', sao: Number(x.sao) || 0 }); });
          if (!cho.length) return { f: f, ds: [] };
          return Promise.all(cho.map(function (p) {
            return f.fs.getDoc(f.fs.doc(f.db, 'thongBao', p.tb)).then(function (d) { p.tbd = d.exists() ? d.data() : null; return p; }, function () { p.tbd = null; return p; });
          })).then(function (ds) {
            ds = ds.filter(function (p) { return p.tbd && p.tbd.tt === 'dang'; });
            ds.sort(function (a, b) { return (a.tbd.dangLuc || 0) - (b.tbd.dangLuc || 0); });
            return { f: f, ds: ds };
          });
        });
      });
    })['catch'](function () { return null; });
  }

  function napCss() {
    return new Promise(function (xong) {
      if (document.getElementById('tbpCss')) return xong();
      var l = document.createElement('link');
      l.id = 'tbpCss'; l.rel = 'stylesheet'; l.href = 'css/tb-pop.css?v=1';
      l.onload = l.onerror = function () { xong(); };
      document.head.appendChild(l);
      setTimeout(xong, 4000);
    });
  }
  // Chờ pop-up quà 20-10 (nếu đang mở) đóng hẳn.
  function choTrong() {
    return new Promise(function (xong) {
      (function xem() { if (document.querySelector('.q20-phu, .tbp-phu')) setTimeout(xem, 700); else xong(); })();
    });
  }

  function ghi(f, p) {
    var b = f.fs.writeBatch(f.db), luc = Date.now();
    b.update(f.fs.doc(f.db, 'tbNhan', p.id), { nhan: true, nhanLuc: luc });
    if (p.sao > 0) {
      b.set(f.fs.doc(f.db, 'saoDot', 'tb_' + p.id), {
        nguon: 'thongBao', lop: String(p.lop || ''), ngay: new Date(luc + 7 * 3600e3).toISOString().slice(0, 10),
        nhom: String(p.tbd.ten || 'Thông báo').slice(0, 80), ai: 'Thầy Andrew',
        dong: [{ so: p.so, n: p.sao, viec: String(p.tbd.ten || 'Thông báo của thầy').slice(0, 110), app: 'Thầy Andrew' }], tao: luc
      });
    }
    return b.commit();
  }

  function hienLanLuot(f, ds, i) {
    if (i >= ds.length) return;
    var p = ds[i];
    choTrong().then(napCss).then(function () {
      var img = document.querySelector('#nutMenu img');
      var tb = Object.assign({}, p.tbd, { sao: p.sao });
      var nen = ACTbPop.dung(tb, { ten: p.t, anh: img && img.getAttribute('src') });
      document.body.appendChild(nen);
      var nut = nen.querySelector('.tbp-nut'), bao = nen.querySelector('.tbp-bao');
      var tiep = function () { setTimeout(function () { hienLanLuot(f, ds, i + 1); }, 900); };
      nut.onclick = function () {
        nut.disabled = true; bao.textContent = '';
        ghi(f, p).then(function () { ACTbPop.bay(nen, nut, p.sao, tiep); }, function (e) {
          nut.disabled = false;
          var ma = (e && e.code) || '';
          if (/permission/i.test(ma)) {
            // Đã xác nhận ở máy/tab khác, hoặc thầy vừa dừng thông báo ⇒ đóng, không hiện lại.
            f.fs.getDoc(f.fs.doc(f.db, 'tbNhan', p.id)).then(function (d) {
              var x = d.exists() ? d.data() : {};
              if (x.nhan === true) { nen.classList.add('tbp-tat'); setTimeout(function () { nen.remove(); tiep(); }, 600); return; }
              return f.fs.getDoc(f.fs.doc(f.db, 'thongBao', p.tb)).then(function (t) {
                if (!t.exists() || t.data().tt !== 'dang') { nen.classList.add('tbp-tat'); setTimeout(function () { nen.remove(); tiep(); }, 600); }
                else bao.textContent = 'Chưa gửi được — em tải lại trang thử nhé.';
              });
            })['catch'](function () { bao.textContent = 'Chưa gửi được — em tải lại trang thử nhé.'; });
            return;
          }
          bao.textContent = 'Chưa gửi được (mạng yếu?) — em bấm lại nhé.';
        });
      };
    });
  }

  function chay() {
    if (!window.ACTbPop) return;
    timDs().then(function (r) { if (r && r.ds.length) hienLanLuot(r.f, r.ds, 0); });
  }
  if (document.readyState === 'complete') setTimeout(chay, 900);
  else window.addEventListener('load', function () { setTimeout(chay, 900); });
})();
