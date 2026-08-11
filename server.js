import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.json());
app.use(express.static(publicDir));

app.get('/live', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'live-rank-tiktok' });
});

const PORT = process.env.PORT || 8091;

let state = {
  connected: false,
  username: '',
  paused: false,
  taps: {},
  gifts: {},
  lastChampion: null,
  lastGift: null,
  startedAt: Date.now()
};
let connection = null;

const cleanUser = (data = {}) => {
  const user = data.user || {};
  return {
    id: String(user.userId || user.uniqueId || user.nickname || 'anon'),
    username: user.uniqueId ? '@' + String(user.uniqueId).replace(/^@/, '') : '@usuario',
    nickname: user.nickname || user.uniqueId || 'Usuário',
    avatar: user.profilePictureUrl || user.avatarThumb?.urlList?.[0] || user.avatarMedium?.urlList?.[0] || ''
  };
};

function giftCoins(data) {
  const d = data.giftDetails || {};
  const e = data.extendedGiftInfo || {};
  const base = Number(d.diamondCount ?? d.price ?? e.diamondCount ?? e.price ?? data.diamondCount ?? 1) || 1;
  const repeat = Number(data.repeatCount || 1) || 1;
  return base * repeat;
}

function rankings() {
  const tapRank = Object.values(state.taps).sort((a,b)=>b.taps-a.taps).slice(0,10);
  const giftRank = Object.values(state.gifts).sort((a,b)=>b.coins-a.coins).slice(0,10);
  const top3 = giftRank.slice(0,3);
  return { tapRank, giftRank, top3 };
}

function emitState() {
  io.emit('state', { ...state, ...rankings() });
}

function addTap(user, count) {
  if (state.paused) return;
  const n = Math.max(0, Number(count || 0));
  const old = state.taps[user.id] || { ...user, taps: 0 };
  old.taps += n;
  state.taps[user.id] = old;
  emitState();
}

function addGift(user, gift) {
  if (state.paused) return;
  const old = state.gifts[user.id] || { ...user, coins: 0, giftCount: 0 };
  old.coins += gift.coins;
  old.giftCount += gift.repeatCount || 1;
  old.lastGiftName = gift.name;
  old.lastGiftImage = gift.image || '';
  state.gifts[user.id] = old;
  state.lastGift = { ...user, ...gift, at: Date.now() };
  const currentLeader = rankings().giftRank[0];
  if (currentLeader) state.lastChampion = { ...currentLeader, at: Date.now() };
  io.emit('gift-event', state.lastGift);
  emitState();
}

async function disconnectTikTok() {
  try { connection?.disconnect(); } catch {}
  connection = null;
  state.connected = false;
  emitState();
}

async function connectTikTok(username) {
  await disconnectTikTok();
  const clean = String(username || '').trim().replace(/^@/, '');
  if (!clean) throw new Error('Informe o usuário do TikTok.');
  state.username = '@' + clean;
  connection = new TikTokLiveConnection(clean, { enableExtendedGiftInfo: true });

  connection.on(ControlEvent.CONNECTED, () => {
    state.connected = true;
    emitState();
  });
  connection.on(ControlEvent.DISCONNECTED, () => {
    state.connected = false;
    emitState();
  });
  connection.on(ControlEvent.ERROR, err => io.emit('connector-error', String(err?.message || err)));

  connection.on(WebcastEvent.LIKE, data => {
    addTap(cleanUser(data), data.likeCount || 0);
  });

  connection.on(WebcastEvent.GIFT, data => {
    const giftType = data.giftDetails?.giftType;
    if (giftType === 1 && !data.repeatEnd) return;
    const user = cleanUser(data);
    const gift = {
      giftId: data.giftId,
      name: data.giftDetails?.giftName || data.extendedGiftInfo?.name || `Presente ${data.giftId || ''}`,
      repeatCount: Number(data.repeatCount || 1),
      coins: giftCoins(data),
      image: data.extendedGiftInfo?.image?.urlList?.[0] || data.giftDetails?.giftImage?.urlList?.[0] || ''
    };
    addGift(user, gift);
  });

  const result = await connection.connect();
  state.connected = true;
  emitState();
  return result;
}

io.on('connection', socket => {
  socket.emit('state', { ...state, ...rankings() });

  socket.on('connect-tiktok', async username => {
    try {
      const result = await connectTikTok(username);
      socket.emit('connect-result', { ok: true, roomId: result?.roomId });
    } catch (err) {
      state.connected = false;
      emitState();
      socket.emit('connect-result', { ok: false, error: String(err?.message || err) });
    }
  });

  socket.on('disconnect-tiktok', disconnectTikTok);
  socket.on('pause', value => { state.paused = !!value; emitState(); });
  socket.on('reset-taps', () => { state.taps = {}; emitState(); });
  socket.on('reset-gifts', () => { state.gifts = {}; state.lastChampion = null; state.lastGift = null; emitState(); });
  socket.on('reset-all', () => { state.taps = {}; state.gifts = {}; state.lastChampion = null; state.lastGift = null; state.startedAt = Date.now(); emitState(); });

  socket.on('test-tap', payload => {
    const user = { id: payload?.username || 'testeTap', username: '@' + String(payload?.username || 'teste_tap').replace(/^@/,''), nickname: payload?.username || 'Teste TAP', avatar: '' };
    addTap(user, Number(payload?.count || 100));
  });

  socket.on('test-gift', payload => {
    const user = { id: payload?.username || 'testeGift', username: '@' + String(payload?.username || 'teste_presente').replace(/^@/,''), nickname: payload?.username || 'Teste Presente', avatar: '' };
    addGift(user, { giftId:'TESTE', name: payload?.giftName || 'Leão', repeatCount: 1, coins: Number(payload?.coins || 1000), image:'' });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LIVE RANK rodando em http://localhost:${PORT}`);
  console.log(`Tela da live: http://localhost:${PORT}/live`);
  console.log(`Painel admin: http://localhost:${PORT}/admin`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
