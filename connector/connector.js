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
function loadConfig(){try{return JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8'))}catch{return{server:'',username:'',signApiKey:''}}}
function saveConfig(c){fs.writeFileSync(CONFIG_FILE,JSON.stringify(c,null,2),'utf8')}
function str(v){return v==null?'':String(v).trim()}
function resolveGift(d={}){const g=d.giftDetails||{},e=d.extendedGiftInfo||{};return{giftId:str(d.giftId??g.giftId??e.id),giftType:Number(g.giftType??d.giftType??0),giftName:str(g.giftName)||str(d.giftName)||str(e.name)||'Presente TikTok',repeatCount:Math.max(1,Number(d.repeatCount??1)||1),repeatEnd:d.repeatEnd===true}}

const rl=readline.createInterface({input:process.stdin,output:process.stdout});
let cfg=loadConfig();
console.log('========================================');
console.log(' LIVE RANK - CONECTOR TIKTOK');
console.log('========================================');
if(cfg.server&&cfg.username){
  console.log(`Servidor: ${cfg.server}`);
  console.log(`TikTok: @${cfg.username}`);
  const keep=String(await rl.question('Usar configuracao salva? (S/n): ')).trim().toLowerCase();
  if(keep==='n'||keep==='nao'||keep==='não')cfg={server:'',username:'',signApiKey:''};
}
if(!cfg.server)cfg.server=String(await rl.question('URL do jogo hospedado: ')).trim().replace(/\/+$/,'');
if(!cfg.username)cfg.username=String(await rl.question('Usuario TikTok da LIVE (sem @): ')).trim().replace(/^@+/,'');
if(!cfg.signApiKey)cfg.signApiKey=String(await rl.question('Sign API Key (opcional - ENTER para vazio): ')).trim();
if(!cfg.server||!cfg.username){console.error('Servidor e usuario sao obrigatorios.');process.exit(1)}
saveConfig(cfg);

const game=io(cfg.server,{transports:['websocket','polling'],reconnection:true,reconnectionDelay:1000});
game.on('connect',()=>console.log('✅ Conectado ao servidor do jogo.'));
game.on('disconnect',()=>console.log('⚠️ Conexao com o jogo perdida; tentando reconectar...'));
game.on('connect_error',e=>console.error('Servidor do jogo:',e?.message||e));

const streaks=new Map();
const connection=new TikTokLiveConnection(cfg.username,{...(cfg.signApiKey?{signApiKey:cfg.signApiKey}:{}),enableExtendedGiftInfo:true});
connection.on(WebcastEvent.LIKE,d=>{const n=Math.max(0,Number(d.likeCount||0));if(!n)return;game.emit('test-tap',{username:d.user?.uniqueId||d.user?.nickname||'usuario',count:n})});
connection.on(WebcastEvent.GIFT,d=>{
  const g=resolveGift(d),username=d.user?.uniqueId||d.user?.nickname||'usuario',key=`${username}:${g.giftId}`,current=Math.max(1,g.repeatCount);
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
try{const info=await connection.connect();console.log(`✅ CONECTADO A @${cfg.username}`);console.log(`Room ID: ${info?.roomId||connection.roomId||'detectado'}`);console.log('✅ TAPs e presentes estao sendo enviados ao jogo.');}catch(e){console.error('Falha ao conectar:',e?.message||e);process.exit(1)}
