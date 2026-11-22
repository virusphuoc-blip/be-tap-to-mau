# Bé Tập Tô Màu 🎨

**Tiếng Việt** · [English](#english)

Ứng dụng web tô màu miễn phí cho bé 2–7 tuổi: tô tranh 2D và **tô tượng 3D**. Giao diện tiếng Việt, nút to, ít chữ.

- **Miễn phí**, không quảng cáo, không mua thêm, không trò chuyện, không liên kết ra ngoài.
- **Không đăng nhập, không máy chủ, không thu thập dữ liệu.** Tiến độ và bộ sưu tập chỉ lưu trong `localStorage` của máy.
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

A free colouring web app for Vietnamese children aged 2–7, with 2D pictures and **3D statue colouring**. The UI is in Vietnamese, with big buttons and very little text.

- **Free**: no ads, no purchases, no chat, no external links.
- **No login, no backend, no data collection.** Progress and the gallery live only in the device's `localStorage`.
- **PWA**: installable, works offline after the first load.

### Features

- **37 SVG pictures** in 5 categories: animals (all 12 Vietnamese zodiac animals), vehicles, fruits, numbers and letters, nature.
- Tap a region to fill it, or paint freely with a brush. 24 colours, 3 brush sizes, eraser, undo, clear all, and a "Tô mẫu" button that fills in suggested colours.
- Confetti and a Web Audio jingle (no audio files) when a picture is finished.
- Save as PNG, share through the Web Share API, and a local gallery.
- **8 Three.js statues** (panda, cat, dog, rabbit, elephant, dinosaur, car, butterfly) built in code from primitives only. No model files are downloaded.
- Drag to rotate, pinch to zoom, tap a part to paint it, brush directly on the surface (raycast onto canvas textures), auto-rotate, PNG snapshot from the current camera angle.

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
