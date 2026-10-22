# BẢN QUY TẮC VẬN HÀNH & TRIỂN KHAI HỆ THỐNG (DEPLOYMENT & SAFETY RULES)
**Dự án**: `t3.goxo.us`  
**Mã nguồn mới**: https://github.com/trungseodn/t3goxo  
**Mã nguồn gốc (Read-only)**: https://github.com/devzota/fb-bm-reel  
**Máy chủ VPS**: `169.58.210.160` (Thư mục dự án: `/root/ztreel-t3`)

---

## 1. NGUYÊN TẮC BẢO VỆ DỮ LIỆU & HỆ THỐNG VPS (BẤT DI BẤT DỊCH)

1. **Tuyệt đối không can thiệp nếu chưa có xác nhận**:
   * Không sửa đổi code, không xóa file, không rebuild container trên VPS nếu người dùng chưa duyệt yêu cầu và đồng ý triển khai.
2. **Bảo toàn 100% Volume & Database**:
   * Tuyệt đối **KHÔNG BAO GIỜ** sử dụng lệnh `docker compose down -v` hoặc `docker volume rm` trên các volume của hệ thống:
     * `ztreel3_postgres_data` (chứa toàn bộ 17 tables và dữ liệu hiện tại của dự án).
     * `ztreel3_redis_data` (dữ liệu queue & cache).
     * `ztreel3_storage` & `ztreel3_uploads` (video đã render, tài nguyên media tải lên).
3. **Quy trình Backup trước mỗi lần nâng cấp**:
   * Luôn thực hiện snapshot backup database Postgres trước bất kỳ thao tác deploy/migration nào:
     ```bash
     docker exec -i ztreel3_postgres_prod pg_dump -U root ztreel > /root/backup_ztreel_$(date +%Y%m%d_%H%M%S).sql
     ```
   * Luôn giữ nguyên và backup các file cấu hình môi trường: `/root/ztreel-t3/.env` và `/root/ztreel-t3/apps/api/.env`.
4. **Bảo vệ các script tác vụ riêng trên VPS**:
   * Không ghi đè hoặc xóa các script vận hành thực tế đang có trên VPS:
     * `run_render_t3.sh`
     * `distribute_and_render_t3.js` & `distribute_and_render_t3.sh`
     * `render_all_t3_videos.js`
5. **Cách ly hoàn toàn với các dự án khác trên VPS**:
   * Trên VPS `169.58.210.160` đang chạy đồng thời 2 dự án khác: `ztreel-app` (Instance khác) và `ztteam-url-fetcher`.
   * Mọi câu lệnh Docker/Compose **chỉ được tác động duy nhất** vào instance `ztreel3_*` (`ztreel3_api_prod`, `ztreel3_web_prod`, `ztreel3_postgres_prod`, `ztreel3_redis_prod`).

---

## 2. QUY TẮC QUẢN TRỊ MÃ NGUỒN GIT

1. **Cách ly tuyệt đối mã nguồn gốc**:
   * Kho gốc `devzota/fb-bm-reel` đã được cấu hình cấm push (`push = DISABLE`).
   * Không mở PR, không push commit nào lên `devzota/fb-bm-reel`.
2. **Kênh phát triển chính thống**:
   * Mọi tính năng, sửa lỗi và cập nhật đều được push trực tiếp lên kho Git mới của bạn:  
     👉 **`https://github.com/trungseodn/t3goxo`**
3. **Cập nhật Git trên VPS**:
   * Chỉ cập nhật `origin` trên VPS sang `trungseodn/t3goxo` khi bạn xác nhận.
   * Khi cập nhật, sử dụng chiến lược `git pull` an toàn (giữ nguyên các file untracked `.env` và các script render).

---

## 3. QUY TRÌNH PHÁT TRIỂN & DEPLOY CHUẨN

```
[1. Tiếp nhận Yêu cầu] 
         ↓
[2. Code & Test Local tại d:\projects\t3.goxo.us] 
         ↓
[3. Commit & Push lên github.com/trungseodn/t3goxo] 
         ↓
[4. Báo cáo thay đổi & Chờ Bạn Đồng Ý Deploy] 
         ↓ (Khi có lệnh "Đồng ý deploy")
[5. Backup DB trên VPS -> Pull Code -> Rebuild Container ztreel3_* -> Verify t3.goxo.us]
```

1. **Bước 1**: Nhận yêu cầu tính năng cụ thể từ bạn.
2. **Bước 2**: Thực hiện code và test logic tại thư mục local `d:\projects\t3.goxo.us`.
3. **Bước 3**: Commit rõ ràng và push lên `trungseodn/t3goxo`.
4. **Bước 4**: Báo cáo chi tiết các file đã sửa/thêm và xin xác nhận triển khai từ bạn.
5. **Bước 5**: Khi bạn đồng ý, kết nối SSH vào VPS:
   * Chạy script backup database.
   * Pull commit mới nhất từ `trungseodn/t3goxo`.
   * Build lại service cần thiết (ví dụ: `docker compose -f docker-compose.t3.yml up -d --build --no-deps api` hoặc `web`).
   * Kiểm tra log container (`docker logs --tail 50 ztreel3_api_prod`) và test truy cập `https://t3.goxo.us`.
   * Báo cáo hoàn tất.

---
*Tài liệu này là quy chuẩn bắt buộc cho mọi thao tác tiếp theo trên hệ thống.*
