# Trò chơi - Gấu Trúc Xanh 🐼

**Tiếng Việt** · [English](#english)

Trang trò chơi miễn phí cho bé 2–7 tuổi: **Bé Tập Tô Màu** (tô tranh 2D, tô tượng 3D) và 4 trò chơi: Cờ tướng, Cờ vua, Rubik 3D, Xếp hình. Giao diện tiếng Việt, nút to, ít chữ.

- **Miễn phí**, không quảng cáo, không mua thêm, không trò chuyện, không liên kết ra ngoài.
- **Không cần đăng nhập, không dữ liệu cá nhân.** Tiến độ, ván cờ và bộ sưu tập chỉ lưu trong `localStorage` của máy. Trang chỉ đếm ẩn danh số lượt chơi (xem [Firebase](#firebase)); phòng chơi online chỉ chứa nước cờ.
- **PWA**: cài được lên màn hình chính, dùng được khi không có mạng sau lần mở đầu tiên.

## Tính năng

**Tô tranh 2D (37 tranh SVG)**

| Nhóm | Tranh |
| --- | --- |
| Con vật (12 con giáp) | Chuột, Trâu, Hổ, Mèo, Rồng, Rắn, Ngựa, Dê, Khỉ, Gà, Chó, Lợn |
| Xe cộ | Ô tô, Xe buýt, Máy bay, Thuyền, Tàu hoả, Tên lửa |
| Trái cây | Táo, Chuối, Cam, Dưa hấu, Dâu, Nho |
| Số và chữ | 1, 2, 3, A, B, C |
| Thiên nhiên | Bướm, Hoa, Mặt trời, Gấu trúc, Cây, Cầu vồng, Cá |

- Chạm vào một vùng để đổ màu, hoặc dùng cọ vẽ tự do.
- 24 màu, 3 cỡ cọ, tẩy, hoàn tác, xoá hết, nút **Tô mẫu** (tự tô màu gợi ý).
- Tô xong: pháo giấy + nhạc vui (tạo bằng Web Audio, không có tệp âm thanh).
- Lưu ảnh PNG, chia sẻ bằng Web Share API, xem lại trong **Tranh của bé**.

**Tô tượng 3D (8 tượng)**: Gấu trúc, Mèo, Chó, Thỏ, Voi, Khủng long, Ô tô, Bướm.

- Tượng dựng hoàn toàn bằng mã từ khối cơ bản của Three.js (cầu, hộp, trụ, nón, vòng). Không tải mô hình `.glb/.obj` nào.
- Kéo để xoay, chụm hai ngón để phóng to, chạm một bộ phận để tô.
- Cọ vẽ trực tiếp lên bề mặt tượng (raycast lên canvas texture), tẩy, hoàn tác, xoá hết, tô mẫu.
- Nút **Tự xoay**, lưu ảnh PNG theo đúng góc nhìn hiện tại.

## Trò chơi (v2)

Mỗi trò được tải riêng (dynamic import) khi bé mở.

- **Cờ tướng**: bàn 9×10, đủ luật (cung, sông, cản Mã, chặn mắt Tượng, Pháo cần ngòi, lộ mặt Tướng, chiếu, chiếu bí, hết nước đi là thua).
- **Cờ vua**: luật do `chess.js` kiểm tra (nhập thành, bắt Tốt qua đường, phong cấp, chiếu bí, hoà).
- Cả hai loại cờ có màn chọn kiểu chơi:
  - **Chơi với máy**: Dễ (nước ngẫu nhiên), Khó (ăn quân lợi nhất trong 1 nước), Cực khó (minimax alpha-beta sâu 3).
  - **Hai bé một máy**.
  - **Chơi với bạn qua ID**: một bé tạo phòng, nhận mã 5 chữ số; bé kia nhập mã để vào. Cần Firebase.
  - Đi lại, ván mới; ván đang chơi được lưu trong máy.
- **Rubik 3D**: vuốt trên khối để xoay một tầng, vuốt bên ngoài để xoay cả khối, chụm để phóng to; xáo trộn, làm lại, đếm lần xoay, đồng hồ, kỷ lục.
- **Xếp hình**: 37 tranh tô màu làm hình ghép, 2×2 / 3×3 / 4×4; chạm một mảnh rồi chạm ô của nó; xem mẫu, pháo giấy, kỷ lục lưu trong máy.
- **Quản trị**: chỉ tài khoản Google của chủ trang xem được thống kê ẩn danh.

## Firebase

Chỉ dùng cho phòng chơi online, bộ đếm ẩn danh và đăng nhập quản trị. Không có cấu hình thì mọi thứ khác vẫn chạy, nút online báo "Chơi online cần cấu hình Firebase — xem hướng dẫn".

1. Firebase console → tạo project → **Build → Realtime Database → Create database**.
2. **Project settings → Your apps → Web app**: chép cấu hình vào biến môi trường (xem `.env.example`; trên Vercel: Settings → Environment Variables). Không đưa vào git.
3. **Realtime Database → Rules**: dán nội dung `database.rules.json` rồi Publish.
4. **Authentication → Sign-in method → Google → Enable**; **Authentication → Settings → Authorized domains**: thêm tên miền của trang.

Quy tắc: phòng `rooms/{mã 5 số}` ai có mã mới đọc/ghi được (không liệt kê được danh sách phòng); `stats` khách chỉ được cộng 1 vào bộ đếm, chỉ quản trị viên đọc được.

Thử trên máy với emulator (cần Java 21+):

```bash
npx firebase-tools emulators:start --only database,auth --project demo-gau-truc-xanh
VITE_FIREBASE_EMULATOR=1 npm run build && npm run preview
ONLINE=1 node scripts/e2e-games.mjs
```

## Chạy trên máy

```bash
npm install
npm run dev      # máy chủ phát triển
npm run build    # kiểm tra kiểu + build vào dist/
npm run lint     # oxlint
npm test         # unit test logic tô màu (vitest)
```

Kiểm thử giao diện ở khung 390px (cần Chrome/Chromium):

```bash
npm run build && npx vite preview --port 4173 &
CHROME=/duong/dan/chrome node scripts/e2e.mjs shots
```

## Cấu trúc

- `src/lib/paint.ts` – logic tô màu thuần (đổ màu, nét cọ, hoàn tác, xoá, hoàn thành), có unit test.
- `src/data/` – dữ liệu tranh SVG, mỗi vùng có mã và màu gợi ý.
- `src/three/statues.ts` – định nghĩa tượng bằng khối cơ bản; `src/three/view.ts` – dựng và tô bằng Three.js.
- `src/components/` – màn hình và công cụ.

---

## English

"Trò chơi - Gấu Trúc Xanh" (Games - Green Panda): a free game hub for Vietnamese children aged 2–7, with the **Bé Tập Tô Màu** colouring section (2D pictures, 3D statues) and four games: Xiangqi, chess, a 3D Rubik's cube and jigsaw puzzles. The UI is in Vietnamese, with big buttons and very little text.

- **Free**: no ads, no purchases, no chat, no external links.
- **No login needed, no personal data.** Progress, games and the gallery live only in the device's `localStorage`. The site keeps anonymous play counters, and online rooms hold only the moves (Firebase Realtime Database, optional).
- **PWA**: installable, works offline after the first load.

### Features

- **37 SVG pictures** in 5 categories: animals (all 12 Vietnamese zodiac animals), vehicles, fruits, numbers and letters, nature.
- Tap a region to fill it, or paint freely with a brush. 24 colours, 3 brush sizes, eraser, undo, clear all, and a "Tô mẫu" button that fills in suggested colours.
- Confetti and a Web Audio jingle (no audio files) when a picture is finished.
- Save as PNG, share through the Web Share API, and a local gallery.
- **8 Three.js statues** (panda, cat, dog, rabbit, elephant, dinosaur, car, butterfly) built in code from primitives only. No model files are downloaded.
- Drag to rotate, pinch to zoom, tap a part to paint it, brush directly on the surface (raycast onto canvas textures), auto-rotate, PNG snapshot from the current camera angle.

- **Games (v2)**, each lazy-loaded: Xiangqi and chess (vs computer at three levels, two players on one device, or online by room code), a Three.js 3×3 Rubik's cube, and jigsaw puzzles (2×2 / 3×3 / 4×4) made from the colouring pictures.
- **Firebase** (optional): set the `VITE_FIREBASE_*` variables from `.env.example`, publish `database.rules.json`, and enable Google sign-in for the owner-only statistics page. Without them everything offline still works.

### Development

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
```

`scripts/e2e.mjs` is a Playwright smoke test on a 390px viewport; run it against `vite preview` with `CHROME` pointing at a Chrome binary.

Stack: React 19, Vite, TypeScript, Tailwind CSS 4, Three.js, vite-plugin-pwa, Vitest.

## License

MIT
