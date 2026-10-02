# Mikma — Pustaka Manga & Pembaca Lokal (MangaDex API)

**Mikma** adalah aplikasi web pembaca manga tanpa login yang menyimpan seluruh riwayat baca, posisi halaman terakhir, penanda bab selesai, serta koleksi favorit secara lokal di peramban (`localStorage`), didukung oleh katalog resmi **MangaDex API**.

---

## Mengapa Muncul Garis Merah (Error) Saat Pertama Kali Dibuka di VS Code?

Saat Anda baru mengunduh dan membuka folder proyek ini di **VS Code**, folder pustaka **`node_modules` belum terpasang**. Akibatnya, VS Code akan menampilkan garis merah pada baris seperti:
- `import React from 'react'`
- `import { ... } from 'lucide-react'`
- `import express from 'express'`

Begitu Anda menjalankan perintah **`npm install`**, seluruh garis merah tersebut akan otomatis hilang karena pustaka React, Vite, Express, Lucide, dan TypeScript sudah terunduh ke dalam folder `node_modules`.

---

## Cara Menjalankan Proyek di VS Code (Langkah demi Langkah)

### 1. Pastikan Node.js Sudah Terinstal di Komputer
Buka **Terminal** di VS Code (`Ctrl + \`` atau menu **Terminal > New Terminal**), lalu periksa apakah Node.js sudah terpasang:

```bash
node -v
npm -v
```
> Jika muncul nomor versi (disarankan **Node.js v18** atau **v20+ LTS**), lanjut ke langkah 2. Jika belum terinstal, unduh dan pasang terlebih dahulu dari [https://nodejs.org](https://nodejs.org).

### 2. Instal Semua Komponen & Dependensi (`node_modules`)
Di terminal VS Code pada folder proyek ini, jalankan perintah berikut dan tunggu hingga selesai:

```bash
npm install
```

### 3. Jalankan Server Pengembangan Lokal
Setelah proses `npm install` selesai tanpa kendala, jalankan:

```bash
npm run dev
```

Terminal akan menampilkan pesan:
```text
Mikma server running on http://0.0.0.0:3000
```
Buka peramban Anda (Chrome, Edge, Firefox, Brave) dan kunjungi alamat:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## Tips Tambahan di VS Code

- **Jika garis merah masih terlihat beberapa detik setelah `npm install`**:
  Tekan `Ctrl + Shift + P` (atau `Cmd + Shift + P` di Mac), ketik **`TypeScript: Restart TS Server`** atau **`Developer: Reload Window`**, lalu tekan `Enter` agar VS Code memuat ulang indeks folder `node_modules`.
- **Jangan menggunakan ekstensi "Live Server" (Port 5500)**:
  Aplikasi ini menggunakan React + TypeScript (`.tsx`) dan server Express + Vite. Selalu jalankan melalui terminal dengan perintah **`npm run dev`** di `http://localhost:3000`.
