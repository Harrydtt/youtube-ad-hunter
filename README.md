# 🎯 YouTube Ad Hunter v3.3

Extension Chrome giúp tự động skip quảng cáo trên YouTube - Phiên bản Aggressive Mode.

## ✨ Tính năng chính

- **Auto-skip quảng cáo video** - Tua nhanh x16, nhảy đến cuối, click nút Skip
- **Xử lý mọi loại ads** - 1 Ad, 2 Ads liên tiếp, Mid-roll (ads giữa video)
- **Hỗ trợ Live Stream** - Mute + Speed x16 cho ads trên live/premiere
- **Ẩn quảng cáo static** - Banner, sidebar, overlay, Premium Promo, Shorts ads
- **Skip surveys** - Auto-đóng các popup khảo sát
- **MutationObserver** - Phản ứng nhanh khi quảng cáo xuất hiện
- **Auto-update selectors** - Tự động cập nhật từ GitHub mỗi 24h
- **Toggle dễ dàng** - Nút ON/OFF ngay trên header YouTube

---

## � Changelog v3.3

### Các trường hợp xử lý:

| Trường hợp | Cách xử lý | Thời gian |
|---|---|---|
| **1 Ad thường** | Mute + Speed x16 + Tua cuối + Click Skip | ~0.1s |
| **2 Ads liên tiếp** | Aggressive event listeners bắt Ad 2 ngay | ~1-2s chờ |
| **Mid-roll** | MutationObserver phát hiện `.ad-showing` | Ngay lập tức |
| **Bumper 6s** | `readyState` check trước khi tua | ~0.5s |
| **Live Stream ads** | Mute + Speed x16 (không tua Infinity) | Ads/16 giây |
| **Unskippable ads** | Speed x16 + Tua cuối | ~0.1s |

### Selectors mới (v3.1+):
- `.yt-mealbar-promo-renderer` - Ẩn thanh khuyến mãi Premium
- `ytd-reel-video-renderer .ytp-ad-overlay-container` - Shorts ads
- `ytd-merch-shelf-renderer` - Ẩn kệ bán merch

### Cải tiến kỹ thuật:
- **6 Event listeners** (`loadedmetadata`, `durationchange`, `play`, `playing`, `canplay`, `timeupdate`)
- **50ms interval** (nhanh gấp 4 lần so với 200ms cũ)
- **`isAdProcessing` flag** - Quản lý chính xác trạng thái ads
- **`readyState` check** - Đảm bảo metadata loaded trước khi tua

---

## � Cài đặt

1. Mở Chrome, vào `chrome://extensions/`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Load unpacked**
4. Chọn thư mục `Youtube_Extension`
5. Vào YouTube và xem thử video!

## 🎮 Cách sử dụng

Sau khi cài đặt, bạn sẽ thấy nút **🎯 Hunter: ON** màu đỏ trên header YouTube.

- **ON** (đỏ): Tự động skip quảng cáo
- **OFF** (xám): Tắt, xem quảng cáo bình thường

---

## 🧠 Logic xử lý Ads

```
┌─────────────────────────────────────────────────────────┐
│              Extension khởi động                        │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │ Auto-update │ │ Inject CSS  │ │ Start       │
   │ selectors   │ │ ẩn ads      │ │ Observer    │
   └─────────────┘ └─────────────┘ └─────────────┘
                          │
                          ▼
            ┌───────────────────────────┐
            │ runHunter() chạy mỗi 50ms │
            │ + 6 event listeners       │
            │ + MutationObserver        │
            └───────────────────────────┘
                          │
                          ▼
            ┌───────────────────────────┐
            │   Phát hiện .ad-showing?  │
            └───────────────────────────┘
                  │ Yes           │ No
                  ▼               ▼
          ┌─────────────┐   ┌─────────────┐
          │ killActiveAd│   │ Restore     │
          │ 1. Skip btn │   │ - muted=F   │
          │ 2. Mute     │   │ - speed=1   │
          │ 3. Speed x16│   │             │
          │ 4. Tua cuối │   │             │
          └─────────────┘   └─────────────┘
```

### Thứ tự xử lý trong `killActiveAd()`:

| Bước | Action | Điều kiện |
|------|--------|-----------|
| 1 | Click Skip buttons | Luôn thử |
| 2 | `video.muted = true` | Luôn áp dụng |
| 3 | `video.playbackRate = 16` | Luôn áp dụng |
| 4 | `video.currentTime = duration` | Chỉ khi duration hữu hạn |

---

## 🔄 Auto-Update Selectors

Extension tự động cập nhật CSS selectors từ GitHub mỗi 24 giờ.

**URL hiện tại:**
```
https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json
```

---

## 📊 So sánh với các giải pháp khác

| Tính năng | Ad Hunter | uBlock Origin | AdBlock Plus |
|-----------|:---------:|:-------------:|:------------:|
| **Cơ chế** | DOM Skip | Network block | Filter lists |
| **YouTube detection** | ✅ Khó | ⚠️ Có thể | ⚠️ Có thể |
| **Manifest V3** | ✅ OK | ⚠️ Giới hạn | ⚠️ Giới hạn |
| **RAM usage** | 🟢 Thấp | 🟡 TB | 🟢 Thấp |
| **Auto-update selectors** | ✅ | ❌ | ❌ |
| **Live Stream support** | ✅ | ✅ | ✅ |

---

## 📁 Cấu trúc thư mục

```
Youtube_Extension/
├── manifest.json     # Config extension (Manifest V3)
├── content.js        # Code chính (~240 lines)
├── selectors.json    # Selectors (hosted on GitHub)
├── icons/            # Icons 16/48/128px
└── README.md
```

## 📄 License

MIT License - Tự do sử dụng và chỉnh sửa.

---

**Made with ❤️ by Ad Hunter Team**
