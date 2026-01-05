# 🎯 YouTube Ad Hunter v11

Extension Chrome giúp chặn quảng cáo YouTube - Sử dụng kỹ thuật JSON Lobotomy + Pixel Beacon.

## ✨ Tính năng chính

### 🔪 Tier 1: JSON Lobotomy (Stealth)
- **Chặn ads từ gốc** - Hook vào `JSON.parse` để cắt dữ liệu quảng cáo
- **Pixel Beacon** - Fake lượt xem ads bằng `new Image()` (gửi kèm cookies)
- **Neutering** - Gán mảng rỗng `[]` thay vì xóa để tránh crash Player
- **Dynamic Config** - Tự cập nhật ad_keys từ GitHub mỗi 6 giờ

### ⚡ Tier 2: Speed/Skip (Fallback)
- **Tua x16 + Skip** - Xử lý khi Tier 1 miss
- **Mid-roll handling** - MutationObserver phát hiện ads giữa video
- **50ms interval** - Phản ứng cực nhanh

### 🛡️ Tính năng phụ
- **Ẩn quảng cáo static** - Banner, sidebar, overlay, Premium Promo
- **Skip surveys** - Auto-đóng popup khảo sát
- **Toggle Popup** - Bật/Tắt từng tính năng riêng biệt

---

## 🚀 Cài đặt

1. Download hoặc `git clone https://github.com/Harrydtt/youtube-ad-hunter.git`
2. Mở Chrome → `chrome://extensions/`
3. Bật **Developer mode** (góc phải trên)
4. Click **Load unpacked** → Chọn thư mục đã tải
5. Vào YouTube và xem thử!

---

## 🎮 Cách sử dụng

Click icon extension trên toolbar để mở popup với 2 toggle:

| Toggle | Chức năng |
|--------|-----------|
| **🔪 JSON Cut** | Chặn ads từ gốc dữ liệu JSON |
| **⚡ Logic 2** | Fallback tua x16 + click Skip |

> **Tip:** Để test riêng từng logic, tắt cái còn lại trong popup.

---

## 🧠 Cơ chế hoạt động

```
┌──────────────────────────────────────────────────────────┐
│              YouTube gửi dữ liệu video                   │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  inject.js: JSON.parse  │
              │  HOOK dữ liệu           │
              └─────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
   ┌─────────────┐                    ┌─────────────────┐
   │ Có ads?     │── No ─────────────▶│ Return data gốc │
   └─────────────┘                    └─────────────────┘
          │ Yes
          ▼
   ┌──────────────────┐
   │ 1. Clone ad data │
   │ 2. Fake via Pixel│
   │ 3. Neuter ads    │
   └──────────────────┘
          │
          ▼
   ┌───────────────────────────────────────────────────────┐
   │  Nếu vẫn còn ads → Logic 2 (Speed x16 + Skip) xử lý  │
   └───────────────────────────────────────────────────────┘
```

---

## 📋 Dynamic Config (GitHub)

File `hunter_config.json` chứa các keys có thể update từ xa:

```json
{
  "ad_keys": ["adPlacements", "playerAds", "adSlots", ...],
  "tracking_keys": ["impressionEndpoints", "start", "complete", ...]
}
```

> Khi YouTube đổi tên biến, chỉ cần update file này mà không cần update extension!

---

## 📁 Cấu trúc thư mục

```
Youtube_Extension/
├── manifest.json        # Config extension (Manifest V3)
├── content.js           # Logic 2 + UI
├── inject.js            # JSON Lobotomy + Pixel Beacon
├── popup.html/js        # Toggle controls
├── hunter_config.json   # Dynamic ad keys
├── selectors.json       # CSS selectors (auto-update)
└── icons/               # Icons 16/48/128px
```

---

## 📊 So sánh

| Tính năng | Ad Hunter v11 | uBlock Origin | AdBlock Plus |
|-----------|:-------------:|:-------------:|:------------:|
| **Cơ chế** | JSON Hook | Network block | Filter lists |
| **Detection risk** | 🟢 Thấp | 🟡 TB | 🟡 TB |
| **Manifest V3** | ✅ OK | ⚠️ Giới hạn | ⚠️ Giới hạn |
| **Auto-update config** | ✅ | ❌ | ❌ |
| **Fake impression** | ✅ | ❌ | ❌ |

---

## 📄 License

MIT License - Tự do sử dụng và chỉnh sửa.

---

**Made with ❤️ by Ad Hunter Team**
