const db = require('./database');

async function handleMulaiChat(ctx) {
  const myId    = ctx.from.id;
  const lawanId = parseInt(ctx.callbackQuery.data.replace('chat_',''));

  if (!db.isMatch(myId, lawanId)) {
    await ctx.answerCbQuery('❌ Kalian belum match!');
    return;
  }

  await ctx.answerCbQuery('💬 Memulai chat...');
  db.startChat(myId, lawanId);

  const lawan  = db.getUser(lawanId);
  const myUser = db.getUser(myId);
  const lawanUn = lawan.username  ? `@${lawan.username}`  : lawan.nama;
  const myUn    = myUser.username ? `@${myUser.username}` : myUser.nama;

  await ctx.reply(
    `💬 *Sesi chat dimulai dengan ${lawanUn}!*\n\nSetiap pesan yang kamu kirim akan diteruskan ke dia.\nKetik /stopchat untuk mengakhiri.`,
    {parse_mode:'Markdown'}
  );

  try {
    await ctx.telegram.sendMessage(
      lawanId,
      `💬 *${myUn} mengajakmu ngobrol!*\n\nBalas pesan di sini dan akan dikirim ke dia.\nKetik /stopchat untuk berhenti.`,
      {parse_mode:'Markdown'}
    );
  } catch(e) {}
}

async function handlePesanChat(ctx) {
  const myId    = ctx.from.id;
  const session = db.getChatAktif(myId);
  if (!session) return false;

  const lawanId = db.getLawan(session, myId);
  const myUser  = db.getUser(myId);
  const nama    = myUser.username ? `@${myUser.username}` : myUser.nama;

  try {
    if (ctx.message.photo) {
      const foto = ctx.message.photo[ctx.message.photo.length-1];
      const cap  = ctx.message.caption ? `📸 *${nama}:* ${ctx.message.caption}` : `📸 *${nama}* mengirim foto`;
      await ctx.telegram.sendPhoto(lawanId, foto.file_id, {caption:cap, parse_mode:'Markdown'});
    } else if (ctx.message.sticker) {
      await ctx.telegram.sendMessage(lawanId, `😄 *${nama}* mengirim stiker:`, {parse_mode:'Markdown'});
      await ctx.telegram.sendSticker(lawanId, ctx.message.sticker.file_id);
    } else if (ctx.message.text) {
      await ctx.telegram.sendMessage(lawanId, `💬 *${nama}:* ${ctx.message.text}`, {parse_mode:'Markdown'});
    }
  } catch(e) {
    await ctx.reply('❌ Gagal kirim pesan. Mungkin lawan chat sudah tidak aktif.');
  }
  return true;
}

async function handleStopChat(ctx) {
  const myId    = ctx.from.id;
  const session = db.getChatAktif(myId);
  if (!session) return ctx.reply('❗ Kamu tidak sedang dalam sesi chat.');

  const lawanId = db.getLawan(session, myId);
  const myUser  = db.getUser(myId);
  const nama    = myUser.username ? `@${myUser.username}` : myUser.nama;

  db.endChat(myId);
  await ctx.reply('👋 Sesi chat diakhiri. Ketik /matches untuk chat dengan orang lain.');

  try {
    await ctx.telegram.sendMessage(
      lawanId,
      `👋 *${nama}* mengakhiri sesi chat.\nKetik /matches untuk mulai chat baru.`,
      {parse_mode:'Markdown'}
    );
  } catch(e) {}
}

module.exports = { handleMulaiChat, handlePesanChat, handleStopChat };
