# QUY TẮC BẢO MẬT khi build (Andrew Classes)

Áp dụng cho mọi trang web / app dùng chung Firebase của Andrew Classes. Đọc trước khi thêm kho dữ liệu,
đổi luật, làm đăng nhập, chat, bảng điểm.

1. **Mỗi kho dữ liệu phải trả lời được: ai được ghi?** Nếu ai cũng ghi được thì luật phải giới hạn chặt nội dung
   (độ dài, kiểu, khoảng giá trị hợp lý) và ghi rõ lý do trong chú thích luật.
2. **Không tin thông tin người dùng tự khai** (tên, vai trò, tích giáo viên, lớp). Luật phải đối chiếu với hồ sơ
   hoặc phiên đăng nhập.
3. **Không để mã đăng nhập xuất hiện** trong dữ liệu ai cũng đọc được (chat, bảng điểm, file JSON tĩnh).
4. **Mật khẩu không bao giờ suy ra từ dữ liệu công khai** (mã, tên, ngày sinh).
5. **Không commit khoá bí mật** (khoá quản trị, debug token) lên kho công khai.
6. **Đổi luật Firestore chỉ bằng công cụ trong `tools/`**: sửa tại chỗ từ bản đang chạy, kiểm bằng phép thử thật,
   giữ đường lùi, dọn dữ liệu thử.
7. **Phát hiện dữ liệu lạ: sao lưu trước, xoá sau**, và không liên hệ người để lại thông tin liên lạc trong đó.

Hồ sơ chi tiết giữ ở kho riêng tư của thầy.
