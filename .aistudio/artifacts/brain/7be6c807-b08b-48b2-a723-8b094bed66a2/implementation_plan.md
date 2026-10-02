# Mikma — Konfigurasi Lingkungan Lokal VS Code & Optimasi TypeScript

Menyempurnakan konfigurasi TypeScript serta ruang kerja VS Code pada aplikasi pembaca manga **Mikma** agar seluruh peringatan garis merah (*error indicator*) di editor hilang sepenuhnya setelah menjalankan `npm install` dan `npm run dev` di komputer lokal.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan jawaban Anda, Anda belum menjalankan perintah di terminal namun melihat indikator *error* pada beberapa baris kode saat membuka proyek di VS Code. Hal ini disebabkan oleh dua faktor utama:
> 1. **Folder `node_modules` belum terunduh** di komputer lokal sebelum perintah `npm install` dijalankan.
> 2. **Konfigurasi tipe global Node.js pada TypeScript** dan **aturan pemeriksaan CSS Tailwind v4 di VS Code** perlu disesuaikan agar editor VS Code mengenali objek global (`process`, `Buffer`, `__dirname`) serta sintaks direktif CSS modern tanpa menampilkan peringatan palsu.

- **Confirmed Decision 1 (Alur Eksekusi Lokal)**: Menggunakan alur standar terminal VS Code (`npm install` diikuti `npm run dev`) untuk menjalankan server lokal di `http://localhost:3000`.
- **Confirmed Decision 2 (Pembersihan Error Editor VS Code)**: Menyertakan dukungan tipe global Node.js pada konfigurasi kompilator TypeScript, aturan ruang kerja VS Code untuk sintaks CSS modern, serta dokumentasi langkah demi langkah berbahasa Indonesia agar proyek langsung berjalan mulus.

---

## 1. Overview & Core Concept

- **What It Does**: **Mikma** adalah aplikasi web pembaca dan katalog manga berbasis **MangaDex API** yang berjalan tanpa perlu login, dengan penyimpanan otomatis riwayat baca, penanda halaman terakhir, dan koleksi favorit di penyimpanan lokal peramban (`localStorage`).
- **Target Audience / Persona**: Pembaca manga yang menginginkan akses cepat ke katalog terjemahan Bahasa Indonesia dan Inggris, pencarian berdasarkan judul/penulis/genre, serta kemudahan menjalankan aplikasi secara mandiri di komputer lokal melalui VS Code.
- **Key Value**: Menghilangkan seluruh kendala teknis saat proyek dibuka di VS Code lokal sehingga pengembang atau pengguna dapat langsung menjalankan aplikasi hanya dengan dua perintah terminal (`npm install` dan `npm run dev`).

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Persiapan Lokal di VS Code**: Pengguna membuka folder proyek di VS Code, membuka terminal bawaan (`Ctrl + \``), menjalankan `npm install` untuk mengunduh dependensi (React, Vite, Express, Lucide, TypeScript), lalu menjalankan `npm run dev` untuk membuka **Mikma** di `http://localhost:3000`.
  2. **Pencarian & Filter Katalog MangaDex**: Pengguna mencari manga berdasarkan **Judul**, **Penulis/Ilustrator** (dengan *autocomplete* langsung dari MangaDex), atau memilih beberapa **Genre & Tema** sekaligus (mode *AND* / *OR*), disaring menurut status publikasi, demografi, tahun rilis, dan bahasa bab.
  3. **Membaca Manga & Penyimpanan Riwayat Lokal**: Pengguna memilih bab terjemahan, membaca dalam mode *Gulir Vertikal (Webtoon)*, *1 Halaman (LTR)*, atau *Manga RTL*, sementara posisi halaman disimpan otomatis ke `localStorage` tanpa login.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Editorial Archival Publication — memadukan estetika katalog literatur cetak dengan pembaca komik modern yang bersih dan bebas distraksi.
  - *Color Palette & Mood*:
    - Mode Kertas Arsip (Light): Latar utama `#FBF9F5` (`--background`), permukaan kartu `#F4F1EA`, teks utama `#1C1917` (`--foreground`), garis pemisah tipis `#E7E5E4`, dan aksen utama `#92400E` (`amber-800` / `--accent`).
    - Mode Tinta Sumi (Dark): Latar utama `#0C0C0E`, permukaan struktural `#18181B`, teks `#F5F5F4`, dan aksen `#D97706` (`amber-600`).
  - *Typography & Hierarchy*:
    - Judul & Tajuk Editorial: `Instrument Serif`
    - Antarmuka & Sinopsis: `Plus Jakarta Sans`
    - Nomor Bab, Halaman & Statistik: `JetBrains Mono` (`tabular-nums`)
  - *Component Styling & Layout*: Tata letak berpusat pada kontainer `1200px` dengan navigasi atas 3-zona (*Brand Wordmark*, *5 Tautan Navigasi*, *2 Aksi Utama*), metadata bersih tanpa kapsul/pil berlebihan (*Zero-Pill Discipline*), dan pembatas garis tipis (`1px`).
- **Interactive Feedback & Motion**: Transisi halus `150ms–200ms` pada kartu sampul, indikator muat per halaman di pembaca manga, tombol muat ulang per halaman jika koneksi sibuk, serta *fallback* sampul otomatis sehingga tidak pernah menampilkan gambar rusak.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Konfigurasi TypeScript ramah VS Code (Client + Server)**
  - *Chosen Approach*: Menambahkan deklarasi tipe `"node"` bersama `"vite/client"` pada konfigurasi TypeScript agar VS Code mengenali variabel lingkungan dan objek server (`process`, `Buffer`, `path`) tanpa mengorbankan pemeriksaan tipe komponen React.
  - *Why*: Secara bawaan, pembatasan `types: ["vite/client"]` saja membuat VS Code menandai kode server proxy (`Buffer`, `process.env`) sebagai *error* merah meskipun kompilasi Vite berhasil.
  - *Alternatives Considered*: Memisahkan konfigurasi TypeScript menjadi beberapa berkas terpisah, namun satu konfigurasi terpadu lebih sederhana bagi pengguna yang baru membuka proyek di VS Code.

- **Decision 2: Penanganan Peringatan Direktif CSS Tailwind v4 di VS Code**
  - *Chosen Approach*: Menyediakan pengaturan ruang kerja VS Code yang menginstruksikan pemeriksa CSS bawaan untuk mengabaikan aturan `@import "tailwindcss"` dan `@layer` milik Tailwind v4, serta menambahkan panduan lengkap cara instalasi Node.js dan eksekusi lokal.
  - *Why*: Pemeriksa CSS standar VS Code sering menandai sintaks `@layer` atau `@import "tailwindcss"` sebagai peringatan kuning/merah jika belum dikonfigurasi.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LINGKUNGAN LOKAL VS CODE (PORT 3000)                 │
│                                                                         │
│  1. Instalasi Pustaka : `npm install` (Mengunduh React, Vite, Express)  │
│  2. Menjalankan Server: `npm run dev` (Menjalankan Express + Vite)      │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ANTARMUKA KLIEN (MIKMA)                         │
│                                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────┐  │
│  │  Katalog & Pencarian │  │   Halaman Detail &   │  │ Pembaca Manga │  │
│  │  (Judul, Penulis,    │─▶│   Daftar Bab         │─▶│ (Vertikal /   │  │
│  │   Multi-Genre, Sort) │  │   (Filter Bahasa ID) │  │  LTR / RTL)   │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └───────┬───────┘  │
│             │                         │                      │          │
│             ▼                         ▼                      ▼          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │        PENYIMPANAN LOKAL PERAMBAN (localStorage - Tanpa Login)    │  │
│  │   • Riwayat Baca & Halaman Terakhir   • Koleksi & Catatan Pribadi │  │
│  │   • Penanda Bab Selesai Dibaca        • Ekspor / Impor JSON       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SERVER PROXY LOKAL (/api/*)                         │
│                                                                         │
│  • /api/mangadex/* ──▶ Meneruskan query ke https://api.mangadex.org     │
│  • /api/cover/*    ──▶ Memuat sampul dari uploads.mangadex.org          │
│  • /api/page       ──▶ Memuat halaman bab dari server MangaDex@Home     │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Filter Katalog (`SearchFilters`)**: Menyimpan kata kunci judul, mode target pencarian (`all`, `title`, `author`), penulis terpilih (`AuthorOption`), daftar ID genre (`tagIds`), mode kombinasi genre (`AND`/`OR`), status publikasi, demografi, bahasa bab, tahun rilis, dan urutan.
  - **Riwayat Baca Lokal (`ReadingHistoryEntry`)**: Menyimpan ID manga, judul, sampul, ID bab, nomor bab, indeks halaman terakhir (`currentPage`), total halaman (`totalPages`), dan waktu baca terakhir.
  - **Koleksi Lokal (`LibraryEntry`)**: Menyimpan daftar manga yang ditandai pengguna beserta status baca (*Sedang Dibaca*, *Ingin Dibaca*, *Selesai*, *Ditunda*) dan catatan pribadi.
- **Interactive Component & State Mapping**:
  - **Panel Pencarian & Filter**: Mengelola *debounce* pencarian penulis ke `/api/mangadex/author`, pemilihan multi-genre dari `/api/mangadex/manga/tag`, dan memperbarui state filter utama untuk memuat ulang katalog secara reaktif.
  - **Tampilan Detail Manga**: Memuat daftar bab dari `/api/mangadex/manga/:id/feed`, menyinkronkan status bab yang sudah dibaca dari `localStorage`, dan menyediakan tombol *Lanjutkan Membaca* langsung ke halaman terakhir.
  - **Pembaca Manga**: Mengambil URL halaman dari `/api/mangadex/at-home/server/:chapterId`, melacak halaman aktif menggunakan `IntersectionObserver` (mode vertikal) atau navigasi halaman tunggal (LTR/RTL), dan menyimpan progres ke `localStorage` setiap kali halaman berpindah.
