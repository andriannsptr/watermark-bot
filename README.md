# 🖼️ Watermark Studio & Bot 

**Watermark Studio & Bot** adalah aplikasi web desktop berbasis Node.js untuk menambahkan watermark pada foto secara batch dengan **Live Interactive Preview**, **Folder Scanner**, **Watermark Teks & Logo PNG**, serta pemrosesan gambar C++ berkecepatan tinggi menggunakan `sharp`.

![License](https://img.shields.io/badge/License-ISC-blue.svg)
![Node](https://img.shields.io/badge/Node.js-v24.0%2B-green.svg)
![Express](https://img.shields.io/badge/Express-v4.19-lightgrey.svg)
![Sharp](https://img.shields.io/badge/Sharp-v0.33-blueviolet.svg)

---

## ✨ Fitur Utama

- **📁 Local Target Folder Scanner**: Cukup masukkan path folder di komputer lokal Anda (contoh: `D:\Photos` atau `C:\Users\Pictures`), aplikasi akan otomatis me-scan seluruh foto (`.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`, `.tiff`).
- **🎨 Watermark Customization Studio**:
  - **Mode Teks**: Teks kustom, pilihan font (Inter, Outfit, Impact, Arial, Serif, dll), warna font + hex picker, ukuran skala (%), drop shadow effect.
  - **Mode PNG Logo**: Drag & drop uploader logo PNG transparan, skala ukuran logo (%), opacity slider.
  - **Posisi Grid**: 9-anchor grid positioning (Top-Left, Center, Bottom-Right, dll.), custom margin offset X/Y, dan mode **Tiled Pattern (Pattern berulang)**.
  - **Transformasi**: Opacity/transparansi (0–100%) dan rotasi sudut (-180° hingga 180°).
- **👁️ Live Interactive Preview Canvas**: Hasil pengaturan watermark dirender secara langsung (real-time) pada canvas interaktif sebelum proses batch dijalankan.
- **⚡ High-Speed Batch Processing**: Menggunakan engine `sharp` C++ multi-threaded yang mampu memproses ratusan foto secara bersamaan dengan progress bar & log eksekusi real-time.
- **📂 Auto Output & Windows Explorer Launcher**: Foto otomatis tersimpan ke folder hasil (`<FolderTarget>\watermarked` atau custom path) dilengkapi tombol **"Buka Folder Hasil"** untuk membuka Windows Explorer secara instan.
- **📱 Fully Responsive Design**: Tampilan UI modern dark glassmorphism yang responsif di layar desktop maupun perangkat mobile.

---

## 🛠️ Teknologi & Stack

- **Backend**: Node.js & Express.js
- **Image Processing Engine**: `sharp`
- **File Upload**: `multer`
- **Frontend Dashboard**: HTML5, Vanilla CSS3 (Glassmorphism UI, Responsive Grid), JavaScript (ES Modules, HTML5 Canvas Live Renderer)

---

## 🚀 Cara Install & Menjalankan

### 1. Clone Repository
```bash
git clone https://github.com/andriannsptr/watermark-bot.git
cd watermark-bot
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Jalankan Aplikasi
```bash
npm start
```

### 4. Buka Web Dashboard
Akses aplikasi melalui browser:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📖 Panduan Penggunaan

1. Buka dashboard di `http://localhost:3000`.
2. Masukkan **Path Folder Foto Target** pada panel kiri (contoh: `D:\Photos\Acara`) lalu klik tombol **Scan**.
3. Pilih mode watermark (**Teks Watermark** atau **Upload PNG Logo**).
4. Sesuaikan posisi (grid 3x3 / Tiled), ukuran, opacity, dan rotasi sambil melihat hasil pada **Live Interactive Preview**.
5. Klik **⚡ MULAI PROSES WATERMARK** untuk memproses foto terpilih.
6. Klik **Buka Folder Hasil** untuk langsung melihat foto yang telah di-watermark di Windows File Explorer.

---

## 📄 Lisensi

Project ini dilisensikan di bawah **ISC License**.

---

Dibuat dengan ❤️ oleh **[andriannsptr](https://github.com/andriannsptr)**
