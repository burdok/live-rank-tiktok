import fs from 'fs';
import path from 'path';
import readline from 'node:readline/promises';
import process from 'node:process';
import { fileURLToPath } from 'url';
import { io } from 'socket.io-client';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const CONFIG_FILE=path.join(__dirname,'config.json');

function loadConfig(){
  try{
    const c=JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8'));
    return {server:c.server||'',username:c.username||''};
  }catch{return{server:'',username:''}}
}
function saveConfig(c){fs.writeFileSync(CONFIG_FILE,JSON.stringify({server:c.server,username:c.username},null,2),'utf8')}
function str(v){return v==null?'':String(v).trim()}
function normalizeServer(v){
  let s=str(v);
  if(!/^https?:\/\//i.test(s))s='https://'+s;
  try{return new URL(s).origin}catch{return s.replace(/\/+$/,'')}
}
function resolveGift(d={}){
  const g=d.giftDetails||{};
  return {
    giftId:str(d.giftId??g.giftId),
    giftType:Number(g.giftType??d.giftType??0),
    giftName:str(g.giftName)||str(d.giftName)||`Presente ${str(d.giftId??g.giftId)||'TikTok'}`,
    repeatCount:Math.max(1,Number(d.repeatCount??1)||1),
    repeatEnd:d.repeatEnd===true
  };
}

const rl=readline.createInterface({input:process.stdin,output:process.stdout});
let cfg=loadConfig();
console.log('========================================');
console.log(' LIVE RANK - CONECTOR TIKTOK');
console.log('========================================');
if(cfg.server&&cfg.username){
  cfg.server=normalizeServer(cfg.server);
  console.log(`Servidor: ${cfg.server}`);
  console.log(`TikTok: @${cfg.username}`);
  const keep=String(await rl.question('Usar configuracao salva? (S/n): ')).trim().toLowerCase();
  if(keep==='n'||keep==='nao'||keep==='não')cfg={server:'',username:''};
}
if(!cfg.server)cfg.server=normalizeServer(await rl.question('URL do jogo hospedado: '));
if(!cfg.username)cfg.username=String(await rl.question('Usuario TikTok da LIVE (sem @): ')).trim().replace(/^@+/, '');
if(!cfg.server||!cfg.username){console.error('Servidor e usuario sao obrigatorios.');process.exit(1)}
saveConfig(cfg);

console.log(`\nServidor normalizado: ${cfg.server}`);
const game=io(cfg.server,{
  path:'/socket.io',
  transports:['websocket','polling'],
  reconnection:true,
  reconnectionDelay:1000,
  timeout:10000
});
game.on('connect',()=>console.log('✅ Conectado ao servidor do jogo.'));
game.on('disconnect',()=>console.log('⚠️ Conexao com o jogo perdida; tentando reconectar...'));
game.on('connect_error',e=>console.error('Servidor do jogo:',e?.message||e));

const streaks=new Map();
// IMPORTANTE: Extended Gift Info fica DESATIVADO porque nosso jogo ja possui
// o catalogo completo Gift ID -> moedas. Isso evita a rota paga de room gifts.
const connection=new TikTokLiveConnection(cfg.username,{
  enableExtendedGiftInfo:false,
  processInitialData:false,
  fetchRoomInfoOnConnect:true
});

connection.on(WebcastEvent.LIKE,d=>{
  const n=Math.max(0,Number(d.likeCount||0));
  if(!n)return;
  game.emit('test-tap',{username:d.user?.uniqueId||d.user?.nickname||'usuario',count:n});
});

connection.on(WebcastEvent.GIFT,d=>{
  const g=resolveGift(d);
  const username=d.user?.uniqueId||d.user?.nickname||'usuario';
  const key=`${username}:${g.giftId}`;
  const current=Math.max(1,g.repeatCount);
  if(g.giftType===1){
    const prev=streaks.get(key)||0;
    const delta=Math.max(0,current-prev);
    for(let i=0;i<delta;i++)game.emit('test-gift-click',{username,giftId:g.giftId,giftName:g.giftName,coins:1});
    streaks.set(key,current);
    if(g.repeatEnd)streaks.delete(key);
  }else{
    for(let i=0;i<current;i++)game.emit('test-gift-click',{username,giftId:g.giftId,giftName:g.giftName,coins:1});
  }
  console.log(`🎁 ${g.giftName} | ID ${g.giftId||'?'} | x${current} | @${username}`);
});

connection.on(ControlEvent.CONNECTED,()=>console.log('✅ WebSocket TikTok conectado.'));
connection.on(ControlEvent.DISCONNECTED,()=>console.log('⚠️ LIVE desconectada.'));
connection.on(ControlEvent.ERROR,e=>console.error('TikTok:',e?.message||e));

try{
  const info=await connection.connect();
  console.log(`✅ CONECTADO A @${cfg.username}`);
  console.log(`Room ID: ${info?.roomId||connection.roomId||'detectado'}`);
  console.log('✅ Modo gratuito ativo: catálogo de presentes vem do próprio jogo.');
  console.log('✅ TAPs e presentes estão sendo enviados ao LIVE RANK.');
}catch(e){
  console.error('Falha ao conectar:',e?.message||e);
  console.error('\nSe aparecer erro EulerStream/Business, feche esta janela e execute novamente o INICIAR-CONECTOR.bat atualizado para instalar a versao 2.4.3.');
  process.exit(1);
}
