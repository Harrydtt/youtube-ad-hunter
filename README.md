# 🎯 YouTube Ad Hunter v2.1

Extension Chrome giúp tự động skip quảng cáo trên YouTube.

## ✨ Tính năng

- **Auto-skip quảng cáo video** - Tua nhanh x16, nhảy đến cuối, click nút Skip
- **Ẩn quảng cáo static** - Banner, sidebar, overlay ads
- **Skip surveys** - Auto-đóng các popup khảo sát
- **MutationObserver** - Phản ứng nhanh khi quảng cáo xuất hiện
- **Auto-update selectors** - Tự động cập nhật class names từ GitHub (khi YouTube thay đổi)
- **Toggle dễ dàng** - Nút ON/OFF ngay trên header YouTube

## 📦 Cài đặt

1. Mở Chrome, vào `chrome://extensions/`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Load unpacked**
4. Chọn thư mục `Youtube_Extension`
5. Vào YouTube và xem thử video!

## 🎮 Cách sử dụng

Sau khi cài đặt, bạn sẽ thấy nút **🎯 Hunter: ON** màu đỏ trên header YouTube.

- **Click để Bật/Tắt** chức năng skip quảng cáo
- **ON** (đỏ): Tự động skip quảng cáo
- **OFF** (xám): Tắt, xem quảng cáo bình thường

---

## 🔄 Auto-Update Selectors

Extension tự động cập nhật CSS selectors từ GitHub mỗi 24 giờ.

### Setup GitHub URL (cho developers):

1. Fork repo này hoặc tạo repo mới
2. Upload file `selectors.json` lên repo
3. Sửa `SELECTORS_URL` trong `content.js`:

```javascript
const SELECTORS_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/selectors.json';
```

### Format selectors.json:

```json
{
    "version": "1.0.0",
    "skipSelectors": [".ytp-ad-skip-button", ...],
    "adHideSelectors": ["ytd-ad-slot-renderer", ...],
    "surveySelectors": [".ytp-ad-survey", ...]
}
```

---

## 📊 So sánh với các giải pháp khác

| Tính năng | Ad Hunter | uBlock Origin | AdBlock Plus | Brave |
|-----------|:---------:|:-------------:|:------------:|:-----:|
| **Hiệu quả** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cơ chế** | Skip video | Network block | Filter lists | Native block |
| **YouTube detection** | ✅ Khó | ⚠️ Có thể | ⚠️ Có thể | ✅ Khó |
| **Manifest V3** | ✅ OK | ⚠️ Giới hạn | ⚠️ Giới hạn | ✅ Native |
| **RAM usage** | 🟢 Thấp | 🟡 TB | 🟢 Thấp | 🟡 TB |
| **Tùy chỉnh** | ON/OFF | Rất nhiều | Acceptable Ads | Shields |
| **Auto-update selectors** | ✅ | ❌ | ❌ | ❌ |

### Ưu điểm Ad Hunter:
- ✅ **Không bị YouTube phát hiện** (không chặn network)
- ✅ **Manifest V3 friendly** (không dùng webRequest API)
- ✅ **Siêu nhẹ** (~250 dòng code)
- ✅ **Auto-update selectors** khi YouTube thay đổi

### Nhược điểm:
- ⚠️ Vẫn load quảng cáo (chỉ skip nhanh)
- ⚠️ Có thể thấy quảng cáo ~0.5s trước khi skip
- ⚠️ Chỉ hoạt động trên youtube.com

---

## 🧠 Logic Code

### Flow chính:

```
┌─────────────────────────────────────────────────────────┐
│        Extension khởi động (youtube.com)                │
└─────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │ Auto-update   │ │ Inject CSS    │ │ Start         │
    │ selectors     │ │ ẩn ads        │ │ MutationObserver
    │ từ GitHub     │ │               │ │               │
    └───────────────┘ └───────────────┘ └───────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │  runHunter() chạy mỗi 200ms │
              │  + khi DOM thay đổi         │
              └─────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │ Phát hiện .ad-showing?      │
              └─────────────────────────────┘
                    │ Yes           │ No
                    ▼               ▼
            ┌───────────────┐ ┌───────────────┐
            │ • Mute video  │ │ Reset video   │
            │ • Speed x16   │ │ về bình thường│
            │ • Skip to end │ │               │
            │ • Click Skip  │ │               │
            └───────────────┘ └───────────────┘
```

### Xử lý quảng cáo:

| Bước | Action | Mục đích |
|------|--------|----------|
| 1 | `video.muted = true` | Tắt tiếng quảng cáo |
| 2 | `video.playbackRate = 16` | Tua nhanh x16 |
| 3 | `video.currentTime = duration - 0.1` | Nhảy đến cuối |
| 4 | Click 10+ skip selectors | Bấm nút Skip |

---

## 📁 Cấu trúc thư mục

```
Youtube_Extension/
├── manifest.json     # Config extension (Manifest V3)
├── content.js        # Code chính
├── selectors.json    # Selectors (có thể host trên GitHub)
├── icons/            # Icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 📄 License

MIT License - Tự do sử dụng và chỉnh sửa.
