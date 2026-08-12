import fs from 'fs';
import path from 'path';
import readline from 'node:readline/promises';
import process from 'node:process';
import { fileURLToPath } from 'url';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const CONFIG_FILE=path.join(__dirname,'config.json');
function loadConfig(){try{return JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8'))}catch{return{server:'',username:'',signApiKey:''}}}
function saveConfig(c){fs.writeFileSync(CONFIG_FILE,JSON.stringify(c,null,2),'utf8')}
function str(v){return v==null?'':String(v).trim()}
function user(u={}){return{uniqueId:String(u.uniqueId??u.userId??''),userId:String(u.userId??u.uniqueId??''),nickname:String(u.nickname??u.uniqueId??'TikTok'),avatar:u?.profilePicture?.urls?.[0]??u?.avatarThumb?.urlList?.[0]??u?.avatarMedium?.urlList?.[0]??''}}
function giftImage(d={}){const e=d.extendedGiftInfo||{},g=d.giftDetails||{};return str(e.pictureUrl)||str(e.image?.urlList?.[0])||str(e.icon?.urlList?.[0])||str(g.giftImage?.urlList?.[0])||str(g.image?.urlList?.[0])}
function resolveGift(d={}){const g=d.giftDetails||{},e=d.extendedGiftInfo||{};return{giftId:str(d.giftId??g.giftId??e.id),giftType:Number(g.giftType??d.giftType??0),giftName:str(g.giftName)||str(d.giftName)||str(e.name)||'Presente TikTok',giftImage:giftImage(d),repeatCount:Math.max(1,Number(d.repeatCount??1)||1),repeatEnd:d.repeatEnd===true,diamondCount:Number(g.diamondCount??d.diamondCount??0)||0}}

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

async function relay(event,data){try{const r=await fetch(`${cfg.server}/api/relay`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event,data})});const text=await r.text();let body={};try{body=text?JSON.parse(text):{}}catch{body={error:text}}if(!r.ok){console.error(`ERRO ${r.status}:`,body.error||body);return null}return body}catch(e){console.error('ERRO ao enviar para o jogo:',e?.message||e);return null}}

const connection=new TikTokLiveConnection(cfg.username,{...(cfg.signApiKey?{signApiKey:cfg.signApiKey}:{}),enableExtendedGiftInfo:true});
connection.on(WebcastEvent.LIKE,d=>{const n=Math.max(0,Number(d.likeCount||0));if(!n)return;relay('tap',{user:user(d.user),count:n}).catch(()=>{})});
connection.on(WebcastEvent.GIFT,d=>{const g=resolveGift(d);relay('gift',{user:user(d.user),...g}).then(r=>{if(r?.ok)console.log(`🎁 ${g.giftName} | ID ${g.giftId||'?'} | x${g.repeatCount} | ${d.user?.nickname||d.user?.uniqueId||'usuario'}`)}).catch(()=>{})});
connection.on(ControlEvent.CONNECTED,()=>console.log('✅ WebSocket TikTok conectado.'));
connection.on(ControlEvent.DISCONNECTED,()=>console.log('⚠️ LIVE desconectada.'));
connection.on(ControlEvent.ERROR,e=>console.error('TikTok:',e?.message||e));
try{const info=await connection.connect();console.log(`✅ CONECTADO A @${cfg.username}`);console.log(`Room ID: ${info?.roomId||connection.roomId||'detectado'}`);console.log('✅ TAPs e presentes estao sendo enviados ao jogo.');}catch(e){console.error('Falha ao conectar:',e?.message||e);process.exit(1)}
