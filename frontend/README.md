# Socially frontend

Giao diện React cho 5 màn hình thuộc dự án Stitch **TechCommerce UI Kit**: Trang Chủ, Trang Cá Nhân, Reels, Messenger và Gợi ý kết bạn. `frontend/` được tổ chức theo hướng `components`, `features`, `pages`, `routes`, `hooks`, `services`, `store` và `styles`.

## Chạy local

```powershell
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`. Dùng `npm run build` để kiểm tra bản production.

## Cấu trúc

- `src/components/common` và `src/components/layout`: thành phần dùng chung, thanh điều hướng, bố cục.
- `src/features/feed`: thành phần đặc thù của bảng tin.
- `src/pages`: năm màn hình tương ứng các route `/`, `/profile`, `/reels`, `/messages`, `/friends`.
- `src/routes`: cấu hình React Router.
- `src/hooks/useSocialQueries.js`: các hook React Query (`useQuery`) lấy dữ liệu hiển thị.
- `src/services`: ranh giới truy cập dữ liệu và fixtures cho giai đoạn UI.
- `src/store/useSocialStore.js`: Zustand lưu tương tác giao diện trong localStorage.
- `src/styles`: token, bố cục và CSS responsive.

## Phạm vi giai đoạn UI

Bảng tin, trang cá nhân, Reels, tin nhắn và gợi ý kết bạn đang dùng dữ liệu mẫu từ `src/services/mockData.js`. Các thao tác đăng bài, thích, lưu, bình luận, theo dõi, gửi lời mời và nhắn tin hoạt động cục bộ trong trình duyệt. Ảnh và video hiện là minh họa CSS; Reels chưa phát video thật.

Khi tích hợp backend, thay các hàm trong `src/services/socialService.js` bằng request tới API gateway. `user-service` hiện cung cấp tài khoản/hồ sơ/follow, `post-service` cung cấp CRUD bài viết theo người dùng. Backend hiện chưa có API bảng tin tổng hợp, Reels, tin nhắn hay gợi ý kết bạn. Các service nội bộ tin cậy header `X-User-ID`, vì vậy frontend không nên gửi header đó trực tiếp từ trình duyệt đến các service khi triển khai public; gateway phải xác thực và tự gắn danh tính.
