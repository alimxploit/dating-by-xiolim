require('dotenv').config();
const { Telegraf } = require('telegraf');
const db = require('./database');
const wiz = require('./wizard');
const { handleCari, handleLike, handleSkip, handleMatches } = require('./browse');
const { handleMulaiChat, handlePesanChat, handleStopChat } = require('./chat');

if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN tidak ditemukan! Buat file .env dulu.');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
db.initDB();

// ─── /start ───────────────────────────────────────────
bot.start(async (ctx) => {
  const user = db.getUser(ctx.from.id);
  if (user) {
    return ctx.reply(
      `👋 Halo lagi, *${user.nama}*! Mau ngapain?`,
      {parse_mode:'Markdown', reply_markup:{keyboard:[
        ['🔍 Cari Jodoh','💞 Matches'],
        ['👤 Profil Saya','✏️ Edit Profil'],
        ['🔴 Nonaktifkan'],
      ], resize_keyboard:true}}
    );
  }
  await ctx.reply(
    '💘 *Selamat datang di Jodoh Bot!*\n\nBot ini bantu kamu temukan pasangan yang cocok.\n\nAyo buat profilmu dulu!',
    {parse_mode:'Markdown'}
  );
  return wiz.mulaiDaftar(ctx);
});

// ─── Daftar / Edit ────────────────────────────────────
bot.command('daftar', (ctx) => wiz.mulaiDaftar(ctx));
bot.command('batal',  (ctx) => wiz.batalWizard(ctx));
bot.command('profil', (ctx) => wiz.showProfil(ctx, ctx.from.id, true));

// ─── Cari & Match ─────────────────────────────────────
bot.command('cari',     handleCari);
bot.command('matches',  handleMatches);
bot.command('stopchat', handleStopChat);

bot.command('nonaktif', async (ctx) => {
  db.setAktif(ctx.from.id, 0);
  ctx.reply('🔴 Profilmu disembunyikan. Ketik /aktifkan untuk aktif lagi.');
});
bot.command('aktifkan', async (ctx) => {
  db.setAktif(ctx.from.id, 1);
  ctx.reply('🟢 Profilmu aktif lagi! Yuk /cari jodoh.');
});

bot.command('help', (ctx) => ctx.reply(
  '📖 *Daftar Perintah:*\n\n'+
  '/daftar — Buat profil baru\n'+
  '/profil — Lihat & edit profilmu\n'+
  '/cari — Lihat profil orang lain\n'+
  '/matches — Lihat semua match\n'+
  '/stopchat — Akhiri sesi chat\n'+
  '/nonaktif — Sembunyikan profil\n'+
  '/aktifkan — Aktifkan profil lagi\n'+
  '/batal — Batalkan proses saat ini',
  {parse_mode:'Markdown'}
));

// ─── Keyboard menu ────────────────────────────────────
bot.hears('🔍 Cari Jodoh',    handleCari);
bot.hears('💞 Matches',       handleMatches);
bot.hears('👤 Profil Saya',   (ctx) => wiz.showProfil(ctx, ctx.from.id, true));
bot.hears('✏️ Edit Profil',   (ctx) => wiz.showProfil(ctx, ctx.from.id, true));
bot.hears('🔴 Nonaktifkan',   async (ctx) => {
  db.setAktif(ctx.from.id, 0);
  ctx.reply('🔴 Profilmu disembunyikan. Ketik /aktifkan untuk aktif lagi.');
});

// ─── Callback Query ───────────────────────────────────
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  // Wizard (daftar/edit button gender & cari)
  if (data.startsWith('wiz_')) {
    const handled = await wiz.handleCallback(ctx);
    if (handled) return;
  }

  // Tombol edit field dari profil
  if (data.startsWith('edit_')) {
    const field = data.replace('edit_','');
    await ctx.answerCbQuery();
    return wiz.mulaiEdit(ctx, field);
  }

  if (data.startsWith('like_'))  return handleLike(ctx);
  if (data.startsWith('skip_'))  return handleSkip(ctx);
  if (data.startsWith('chat_'))  return handleMulaiChat(ctx);

  await ctx.answerCbQuery('❓ Aksi tidak dikenal');
});

// ─── Semua pesan masuk ────────────────────────────────
bot.on('message', async (ctx) => {
  const id = ctx.from.id;

  // 1. Sedang dalam wizard (daftar / edit)
  if (db.getWizard(id)) {
    const handled = await wiz.handleInput(ctx);
    if (handled) return;
  }

  // 2. Sedang dalam sesi chat
  const session = db.getChatAktif(id);
  if (session) {
    const handled = await handlePesanChat(ctx);
    if (handled) return;
  }

  // 3. Pesan biasa — arahkan ke menu
  if (ctx.message?.text && !ctx.message.text.startsWith('/')) {
    return ctx.reply('Gunakan tombol menu atau ketik /help untuk melihat perintah.');
  }
});

// ─── Error handler ────────────────────────────────────
bot.catch((err, ctx) => {
  console.error('Error:', err);
  ctx.reply('❌ Terjadi error, coba lagi ya!').catch(()=>{});
});

// ─── Launch ───────────────────────────────────────────
bot.launch().then(() => console.log('🤖 Jodoh Bot aktif!'));
process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
