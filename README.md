# 💘 Jodoh Bot — Telegram

Bot pencari jodoh Telegram dengan fitur lengkap.

## Setup di Termux

```bash
# 1. Install Node.js
pkg update && pkg install nodejs

# 2. Kalau npm install error (native build)
pkg install python make clang

# 3. Masuk folder & install
cd jodoh-bot
npm install

# 4. Buat file .env
cp .env.example .env
nano .env
# Isi: BOT_TOKEN=token_dari_botfather

# 5. Jalankan
npm start
```

## Fitur

- Daftar profil (nama, umur, gender, lokasi, bio, foto)
- Edit profil per field (tap tombol di /profil)
- Browse profil orang lain, like / skip
- Notif saat seseorang menyukai profilmu
- Notif match — tampilkan profil + kata-kata matching
- Chat langsung antar match dalam bot
- Nonaktifkan / aktifkan profil

## Perintah

| Perintah | Fungsi |
|---|---|
| /start | Mulai bot |
| /daftar | Buat profil baru |
| /profil | Lihat & edit profil |
| /cari | Browse profil |
| /matches | Lihat match & mulai chat |
| /stopchat | Akhiri sesi chat |
| /nonaktif | Sembunyikan profil |
| /aktifkan | Aktifkan profil lagi |
| /batal | Batalkan proses saat ini |
