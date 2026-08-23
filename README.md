# Lesson in Andrew Classes — trang bài tập của học sinh

Trang web tĩnh cho học sinh **Andrew Classes** vào làm bài tập.
Một link duy nhất cho mọi lớp, mọi buổi: **https://andrewclasses.com**
(link cũ `andrewclasses-01.github.io/myLesson/` tự chuyển hướng về đây; file `CNAME` +
4 bản ghi A `185.199.108-111.153` ở portal.inet.vn, Bảo vệ/proxy TẮT)

Học sinh gõ **MỘT mã riêng của mình** (thầy đặt trong myStudent, tab Lớp học) → trang tự biết
em nào, lớp nào → thấy mọi bài của lớp mình → bấm vào bài là chơi ngay trong trang
(game lấy từ [AWord](https://aword.andrewclasses.com/), bài nghe lấy từ kho `myLesson-audio`).
Ngay cạnh mỗi game có **bảng xếp hạng cả lớp** đọc thẳng điểm từ kho AWord.

**Thầy** gõ **mã quản lý** ở cùng ô đó thì vào `dashboard.html` (trang quản lý, đang dựng).
Mã quản lý cất trong `config.js` dạng **băm SHA-256** (`QUAN_LY_BAM`) — đọc file không suy
ngược ra mã. ⚠️ Không phải bảo mật thật, chỉ chặn người tình cờ đọc file.

## ⭐ v1.9.0 (23/08/2026) — MỘT TRANG THÀNH NHIỀU TRANG

Trước v1.9.0 cả web là một file `index.html` + `js/app.js` với 3 màn. Từ v1.9.0, bộ mẫu
thầy chốt ở `mau-web` đã thành trang thật, mỗi màn một trang:

| Trang | Vai trò |
|---|---|
| `index.html` | Chỉ còn màn ĐĂNG NHẬP (+ ngăn thông tin). Vào được thì chuyển sang trang dưới |
| `lop.html` | Trang chính của lớp — cột thẻ bài tập + khung chat (chat đang khoá, chưa có kho tin) |
| `bai.html` | Một bài tập — **dùng chung cho WORDS · DICTS · READING**, khác nhau chỉ ở `khoi[]` |
| `bai-sp.html` | Bài SPEAKING SLIDE (Canva + danh sách tự báo nộp video) |
| `dashboard.html` | **Trang quản lý của thầy** (v1.10.0) — xem mục ngay dưới |
| `js/chung.js` | Dùng chung: đọc dữ liệu · danh tính em · điểm AWord · hạn nộp |
| `js/dangnhap.js` | Riêng màn đăng nhập (thay `js/app.js` cũ — file đó đã bỏ, còn trong git) |

⭐ `bai.html?id=<mã bài>` là đường vào một bài. Thêm `&nhu=<mã đăng nhập>` để **xem như một
em** — app myLesson dùng đường này cho nút xem nhanh, KHÔNG ghi gì vào máy.

## ⭐ v1.10.0 (23/08/2026) — TRANG QUẢN LÝ (`dashboard.html`)

Vào bằng **mã quản lý** ở màn đăng nhập, hoặc bấm tab **CLASSES** trong app myLesson. Máy nào
đã gõ đúng mã một lần thì nhớ luôn (cờ `mylesson_ql`), lần sau vào thẳng; nút **Thoát** quên đi.

Ba tầng, xoay quanh câu hỏi thầy hỏi mỗi ngày — *bài nào sắp hết hạn mà lớp còn nhiều em chưa làm*:

1. **Dải số** — lớp · học sinh · bài đang giao · bài đã đẩy · em chưa có mã.
2. **CẦN NHẮC** (trên cùng) — mọi lớp, bài có hạn trong khoảng −3 ➜ +10 ngày, xếp gấp trước,
   kèm số em chưa xong và nút **Chép tên em chưa xong** (dán thẳng vào Zalo; máy không cho chép
   tự động thì mở hộp để bôi đen chép tay).
3. **Theo lớp** — chọn lớp → từng bài: hạn + đồng hồ + thanh tiến độ; bấm mở ra thấy từng act
   (template · mã · bao nhiêu em xong), dòng bài viết tay, và **ai chưa xong / ai đã xong**.
   Nút **Xem trang của học sinh** mở đúng trang đó như một em đang thấy.

Cột phải: **sinh nhật 7 ngày tới** · **em chưa có mã** · **top của lớp** đang chọn.

⚠️ **Tốn hạn mức Firebase**: mỗi act là một lượt đọc kho điểm AWord. Trang CHỈ đọc điểm của
(a) bài trong khoảng hạn −3 ➜ +10 ngày và (b) lớp đang chọn, đọc tối đa 6 lượt cùng lúc, và
`js/chung.js` còn nhớ 60 giây. ⛔ Đừng sửa thành "đọc hết mọi bài mọi lớp cho tiện".

⚠️ Ba thứ CHƯA có dữ liệu thật nên đang ẩn/khoá, đừng tưởng là lỗi: **ví sao** (ẩn hẳn),
**chat lớp** (khoá, hiện dòng "đang xây dựng"), **tên bài đẹp + giờ hạn** (app Đợt 2 mới gõ
được; tạm lấy DẠNG bài và cuối ngày buổi học).

## Ai cập nhật trang này

Không ai sửa tay. Toàn bộ nội dung do **app myLesson** trên máy thầy ghi ra rồi đẩy lên:

```
data/lop.json   ← lớp + học sinh (app lấy từ myStudent)
data/bai.json   ← bài của từng lớp
```

Mọi file còn lại (`index.html`, `css/`, `js/`, `assets/`) là khung trang, rất ít khi đổi.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Màn đăng nhập (MỘT ô mã) + ngăn thông tin |
| `lop.html` · `bai.html` · `bai-sp.html` · `dashboard.html` | Xem bảng ở mục v1.9.0 bên trên |
| `css/main.css` | Design thầy duyệt 08/07/2026: light-only, teal `#0E7C6E`, thẻ bo 18px |
| `js/chung.js` · `js/dangnhap.js` | Toàn bộ logic — không framework, không thư viện ngoài |
| `config.js` | Tên site + số phiên bản + địa chỉ AWord + kho điểm Firebase (khóa công khai) |
| `assets/fonts.css` | Montserrat (Việt hoá) nhúng base64 — trang chạy cả khi mất mạng |
| `assets/avatar-tron.jpg` | Ảnh Teacher Andrew (kiêm favicon + icon bấm mở menu ở màn đăng nhập, v1.8.0) |
| `assets/avatar.jpg` | Ảnh chibi cũ — hết dùng từ v1.8.0, GIỮ LẠI không xoá (đường lùi) |

## Vì sao AWord phải ở CÙNG tài khoản GitHub

`andrewclasses-01.github.io/myLesson/` và `andrewclasses-01.github.io/AWord/` là **cùng một nhà**,
nên trang này nhúng game AWord và truyền sẵn tên học sinh sang được:
`AWord/play.html?g=<mã bài giao>&n=<TÊN EM>`.

Nhờ vậy các em không phải gõ tên → bảng xếp hạng và báo cáo của thầy không còn tên viết sai.
**Chuyển web sang tài khoản GitHub khác là mất tính năng này.**

## Chạy thử ở máy

```
python -m http.server 8130 --directory "E:\LAP TRINH APP\myLesson\web"
```
rồi mở http://localhost:8130

## ⚠ Sửa css/js/config là PHẢI tăng `?v=` trong index.html

GitHub Pages + trình duyệt học sinh giữ cache khoảng 10 phút. Số `?v=` sau
`main.css` / `config.js` / `chung.js` / `dangnhap.js` là số chống cache —
quên tăng là máy học sinh chạy bản cũ (bài học bên mySpeaking, chặng 36).
⛔ Từ v1.9.0 số này nằm trong **5 trang**, sửa là phải sửa cả năm.
