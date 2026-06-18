const db = require('./database');

const LABEL = {
  nama:'📛 Nama', umur:'🎂 Umur', gender:'⚧ Gender',
  cari:'💞 Mencari', lokasi:'📍 Kota', bio:'✍️ Bio', foto:'📸 Foto',
};
const STEPS = ['nama','umur','gender','cari','lokasi','bio','foto'];
const nextStep = (s) => STEPS[STEPS.indexOf(s)+1] || null;

const temp = {};

async function tanya(ctx, step, isEdit=false) {
  const pre = isEdit ? `✏️ *Edit ${LABEL[step]}*\n\n` : `📝 *Langkah: ${LABEL[step]}*\n\n`;
  switch(step) {
    case 'nama':
      return ctx.reply(`${pre}Siapa nama panggilanmu?`, {parse_mode:'Markdown'});
    case 'umur':
      return ctx.reply(`${pre}Berapa umurmu sekarang? _(17–60)_`, {parse_mode:'Markdown'});
    case 'gender':
      return ctx.reply(`${pre}Kamu seorang?`, {parse_mode:'Markdown', reply_markup:{inline_keyboard:[
        [{text:'👨 Laki-laki', callback_data:'wiz_gender_L'}],
        [{text:'👩 Perempuan',  callback_data:'wiz_gender_P'}],
      ]}});
    case 'cari':
      return ctx.reply(`${pre}Kamu lagi cari siapa?`, {parse_mode:'Markdown', reply_markup:{inline_keyboard:[
        [{text:'👨 Laki-laki', callback_data:'wiz_cari_L'}],
        [{text:'👩 Perempuan',  callback_data:'wiz_cari_P'}],
      ]}});
    case 'lokasi':
      return ctx.reply(`${pre}Kamu tinggal di kota mana?\n_(contoh: Jakarta, Bandung)_`, {parse_mode:'Markdown'});
    case 'bio':
      return ctx.reply(`${pre}Ceritain singkat tentang dirimu:`, {parse_mode:'Markdown'});
    case 'foto':
      return ctx.reply(`${pre}Kirim foto profilmu!`, {parse_mode:'Markdown'});
  }
}

async function mulaiDaftar(ctx) {
  const id = ctx.from.id;
  temp[id] = { user_id:id, username: ctx.from.username||'' };
  db.setWizard(id, 'nama', 'daftar', null);
  await ctx.reply('📝 *Buat Profil Baru*\n\nIkuti langkahnya ya. Ketik /batal untuk membatalkan.', {parse_mode:'Markdown'});
  return tanya(ctx, 'nama');
}

async function mulaiEdit(ctx, field) {
  const id = ctx.from.id;
  const user = db.getUser(id);
  if (!user) return ctx.reply('❗ Kamu belum punya profil. Ketik /daftar dulu.');
  temp[id] = {...user};
  db.setWizard(id, field, 'edit', field);
  return tanya(ctx, field, true);
}

async function handleInput(ctx) {
  const id = ctx.from.id;
  const wiz = db.getWizard(id);
  if (!wiz) return false;

  const isEdit = wiz.mode === 'edit';
  const step   = wiz.step;
  const text   = ctx.message?.text;
  const photo  = ctx.message?.photo;

  if (!temp[id]) temp[id] = db.getUser(id) || {user_id:id, username:ctx.from.username||''};

  switch(step) {
    case 'nama':
      if (!text||text.length<2) { await ctx.reply('❌ Nama minimal 2 karakter!'); return true; }
      temp[id].nama = text; break;
    case 'umur':
      const umur = parseInt(text);
      if (isNaN(umur)||umur<17||umur>60) { await ctx.reply('❌ Umur harus 17–60 tahun!'); return true; }
      temp[id].umur = umur; break;
    case 'lokasi':
      if (!text||text.length<2) { await ctx.reply('❌ Isi nama kota dulu!'); return true; }
      temp[id].lokasi = text; break;
    case 'bio':
      if (!text||text.length<5) { await ctx.reply('❌ Bio minimal 5 karakter!'); return true; }
      temp[id].bio = text; break;
    case 'foto':
      if (!photo) { await ctx.reply('📸 Kirim foto ya, bukan teks!'); return true; }
      temp[id].foto_id = photo[photo.length-1].file_id; break;
    default: return true;
  }

  if (isEdit) {
    const field = wiz.field;
    db.updateField(id, field, temp[id][field]);
    db.clearWizard(id);
    delete temp[id];
    await ctx.reply(`✅ *${LABEL[field]}* berhasil diperbarui!`, {parse_mode:'Markdown'});
    return showProfil(ctx, id, true);
  }

  const next = nextStep(step);
  if (next) {
    db.setWizard(id, next, 'daftar', null);
    await tanya(ctx, next);
  } else {
    db.upsertUser(temp[id]);
    db.clearWizard(id);
    delete temp[id];
    await ctx.reply('🎉 *Profil berhasil dibuat!*\n\nKetik /cari untuk mulai cari jodoh!', {parse_mode:'Markdown'});
  }
  return true;
}

async function handleCallback(ctx) {
  const data = ctx.callbackQuery.data;
  const id   = ctx.from.id;
  const wiz  = db.getWizard(id);
  if (!wiz) return false;

  let field, val;
  if (data.startsWith('wiz_gender_'))      { field='gender'; val=data.replace('wiz_gender_',''); }
  else if (data.startsWith('wiz_cari_'))   { field='cari';   val=data.replace('wiz_cari_','');   }
  else return false;

  if (!temp[id]) temp[id] = db.getUser(id)||{user_id:id,username:ctx.from.username||''};
  temp[id][field] = val;
  await ctx.answerCbQuery(val==='L'?'👨 Laki-laki dipilih!':'👩 Perempuan dipilih!');

  if (wiz.mode==='edit') {
    db.updateField(id, field, val);
    db.clearWizard(id);
    delete temp[id];
    await ctx.reply(`✅ *${LABEL[field]}* berhasil diperbarui!`, {parse_mode:'Markdown'});
    return showProfil(ctx, id, true);
  }

  const next = nextStep(field);
  if (next) { db.setWizard(id, next, 'daftar', null); await tanya(ctx, next); }
  return true;
}

async function batalWizard(ctx) {
  const id = ctx.from.id;
  db.clearWizard(id);
  delete temp[id];
  await ctx.reply('❌ Dibatalkan.', {reply_markup:{remove_keyboard:true}});
}

async function showProfil(ctx, userId, withEditBtn=false) {
  const u = db.getUser(userId);
  if (!u) return;
  const g = u.gender==='L'?'👨':'👩';
  const caption =
    `${g} *${u.nama}*, ${u.umur} tahun\n`+
    `📍 ${u.lokasi}\n`+
    `💬 _${u.bio}_\n\n`+
    `🔍 Mencari: ${u.cari==='L'?'Laki-laki 👨':'Perempuan 👩'}\n`+
    `Status: ${u.aktif?'🟢 Aktif':'🔴 Nonaktif'}`;

  const editKeyboard = withEditBtn ? {reply_markup:{inline_keyboard:[
    [{text:'📛 Nama',   callback_data:'edit_nama'},   {text:'🎂 Umur',  callback_data:'edit_umur'}],
    [{text:'📍 Kota',   callback_data:'edit_lokasi'}, {text:'✍️ Bio',   callback_data:'edit_bio'}],
    [{text:'⚧ Gender',  callback_data:'edit_gender'}, {text:'💞 Cari',  callback_data:'edit_cari'}],
    [{text:'📸 Foto',   callback_data:'edit_foto'}],
  ]}} : {};

  if (u.foto_id) await ctx.replyWithPhoto(u.foto_id, {caption, parse_mode:'Markdown', ...editKeyboard});
  else           await ctx.reply(caption, {parse_mode:'Markdown', ...editKeyboard});
}

module.exports = { mulaiDaftar, mulaiEdit, handleInput, handleCallback, batalWizard, showProfil };
