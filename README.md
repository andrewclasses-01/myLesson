# Lesson in Andrew Classes — trang bài tập của học sinh

Trang web tĩnh cho học sinh **Andrew Classes** vào làm bài tập.
Một link duy nhất cho mọi lớp, mọi buổi: **https://andrewclasses.com**
(link cũ `andrewclasses-01.github.io/myLesson/` tự chuyển hướng về đây; file `CNAME` +
4 bản ghi A `185.199.108-111.153` ở portal.inet.vn, Bảo vệ/proxy TẮT)

Học sinh gõ **MỘT mã riêng của mình** (thầy đặt trong myStudent, tab Lớp học) → trang tự biết
em nào, lớp nào → thấy mọi bài của lớp mình → bấm vào bài là chơi ngay trong trang
(game lấy từ [AWord](https://aword.andrewclasses.com/), video lấy từ Google Drive).
Ngay dưới mỗi game có **bảng xếp hạng** đọc thẳng điểm từ kho AWord; đúng ngày sinh nhật
(`sinhNhat` dạng `MM-DD`, KHÔNG có năm) thì trang chúc mừng + pháo giấy.

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
| `index.html` | 3 màn: đăng nhập (MỘT ô mã) → trang lớp → trang một bài |
| `css/main.css` | Design thầy duyệt 08/07/2026: light-only, teal `#0E7C6E`, thẻ bo 18px |
| `js/app.js` | Toàn bộ logic — không framework, không thư viện ngoài |
| `config.js` | Tên site + số phiên bản + địa chỉ AWord + kho điểm Firebase (khóa công khai) |
| `assets/fonts.css` | Montserrat (Việt hoá) nhúng base64 — trang chạy cả khi mất mạng |
| `assets/avatar.jpg` | Ảnh chibi Teacher Andrew (kiêm favicon) |

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
`main.css` / `config.js` / `app.js` trong `index.html` là số chống cache —
quên tăng là máy học sinh chạy bản cũ (bài học bên mySpeaking, chặng 36).
