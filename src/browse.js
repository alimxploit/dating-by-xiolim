const db = require('./database');

function formatKartu(u) {
  const g = u.gender==='L'?'👨':'👩';
  return `${g} *${u.nama}*, ${u.umur} tahun\n📍 ${u.lokasi}\n\n💬 _${u.bio}_`;
}

async function kirimKartu(ctx, kandidat) {
  const keyboard = {reply_markup:{inline_keyboard:[[
    {text:'❌ Skip', callback_data:`skip_${kandidat.user_id}`},
    {text:'❤️ Suka', callback_data:`like_${kandidat.user_id}`},
  ]]}};
  if (kandidat.foto_id) {
    await ctx.replyWithPhoto(kandidat.foto_id, {caption:formatKartu(kandidat), parse_mode:'Markdown', ...keyboard});
  } else {
    await ctx.reply(formatKartu(kandidat), {parse_mode:'Markdown', ...keyboard});
  }
}

async function handleCari(ctx) {
  const id = ctx.from.id;
  if (!db.getUser(id)) return ctx.reply('❗ Kamu belum daftar!\nKetik /daftar untuk buat profil dulu.');
  const kandidat = db.getKandidat(id);
  if (!kandidat) return ctx.reply('😔 Tidak ada profil yang cocok saat ini.\nCoba lagi nanti ya!');
  await kirimKartu(ctx, kandidat);
}

// Kirim notif match ke dua user — dengan profil masing-masing
async function kirimNotifMatch(ctx, myUser, lawanUser) {
  const usernameA = myUser.username   ? `@${myUser.username}`   : myUser.nama;
  const usernameB = lawanUser.username? `@${lawanUser.username}` : lawanUser.nama;

  const pesanMatch = (target, lawan, lawanUsername) =>
    `💘 *Saling menyukai!*\n\nAku harap kalian bisa bersama 👀\n\nAyo mulai mengobrol ${lawanUsername}`;

  // Notif ke diri sendiri (myUser) — tampilkan profil lawan
  const captionA = formatKartu(lawanUser) + `\n\n💘 *Saling menyukai!*\n\nAku harap kalian bisa bersama 👀\n\nAyo mulai mengobrol ${usernameB}`;
  if (lawanUser.foto_id) {
    await ctx.replyWithPhoto(lawanUser.foto_id, {caption:captionA, parse_mode:'Markdown'});
  } else {
    await ctx.reply(captionA, {parse_mode:'Markdown'});
  }

  // Notif ke lawan — tampilkan profil myUser
  const captionB = formatKartu(myUser) + `\n\n💘 *Saling menyukai!*\n\nAku harap kalian bisa bersama 👀\n\nAyo mulai mengobrol ${usernameA}`;
  try {
    if (myUser.foto_id) {
      await ctx.telegram.sendPhoto(lawanUser.user_id, myUser.foto_id, {caption:captionB, parse_mode:'Markdown'});
    } else {
      await ctx.telegram.sendMessage(lawanUser.user_id, captionB, {parse_mode:'Markdown'});
    }
  } catch(e) { /* user belum start bot */ }
}

async function handleLike(ctx) {
  const myId   = ctx.from.id;
  const lawanId = parseInt(ctx.callbackQuery.data.replace('like_',''));
  await ctx.answerCbQuery('❤️ Kamu suka!');

  db.addLike(myId, lawanId);

  // Kirim notif "seseorang menyukaimu" ke lawan
  const myUser = db.getUser(myId);
  const lawanUser = db.getUser(lawanId);

  // Notif suka biasa ke lawan (belum match)
  if (!db.cekMatch(myId, lawanId)) {
    try {
      await ctx.telegram.sendMessage(
        lawanId,
        `💌 *Seseorang menyukai profilmu!*\n\nSiapa ya? Yuk /cari dan temukan siapa yang suka kamu 😊`,
        {parse_mode:'Markdown'}
      );
    } catch(e) {}
  }

  // Cek match
  if (db.cekMatch(myId, lawanId)) {
    db.createMatch(myId, lawanId);
    await kirimNotifMatch(ctx, myUser, lawanUser);
    return;
  }

  // Lanjut browse
  const next = db.getKandidat(myId);
  if (next) await kirimKartu(ctx, next);
  else await ctx.reply('😔 Tidak ada profil lain saat ini. Coba lagi nanti!');
}

async function handleSkip(ctx) {
  const myId    = ctx.from.id;
  const lawanId = parseInt(ctx.callbackQuery.data.replace('skip_',''));
  await ctx.answerCbQuery('Skip...');
  // Tandai sudah dilihat agar tidak muncul lagi
  db.addLike(myId, lawanId * -1); // trick: simpan id negatif sebagai "skip"
  // Sebenarnya cukup exclude via sub-query; kita reload saja
  const next = db.getKandidat(myId);
  if (next) await kirimKartu(ctx, next);
  else await ctx.reply('😔 Tidak ada profil lain saat ini. Coba lagi nanti!');
}

async function handleMatches(ctx) {
  const id = ctx.from.id;
  if (!db.getUser(id)) return ctx.reply('❗ Belum daftar! Ketik /daftar dulu.');
  const matches = db.getMatches(id);
  if (!matches.length) return ctx.reply('💔 Belum ada match nih. Yuk /cari dulu!');

  await ctx.reply(`💞 *Match kamu (${matches.length}):*`, {parse_mode:'Markdown'});
  for (const m of matches) {
    const g = m.gender==='L'?'👨':'👩';
    const un = m.username ? `@${m.username}` : '_(no username)_';
    const caption = formatKartu(m) + `\n\nUsername: ${un}`;
    const keyboard = {reply_markup:{inline_keyboard:[[
      {text:`💬 Chat dengan ${m.nama}`, callback_data:`chat_${m.user_id}`}
    ]]}};
    if (m.foto_id) await ctx.replyWithPhoto(m.foto_id, {caption, parse_mode:'Markdown', ...keyboard});
    else           await ctx.reply(caption, {parse_mode:'Markdown', ...keyboard});
  }
}

module.exports = { handleCari, handleLike, handleSkip, handleMatches };
