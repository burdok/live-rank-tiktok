(()=>{
  const sock=(typeof socket!=='undefined'&&socket)?socket:io();
  const style=document.createElement('style');
  style.textContent=`
  .finishOverlay{position:absolute;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(circle at center,#3b0b54ee 0,#08030fF5 55%,#02030afa 100%)}
  .finishOverlay.show{display:flex;animation:finishFlash .45s ease both}
  .finishTitle{position:absolute;top:115px;left:0;right:0;text-align:center;font-size:66px;font-weight:1000;letter-spacing:3px;color:#fff;text-shadow:0 0 22px #ffb000,0 0 45px #d946ef;animation:titleBoom .75s cubic-bezier(.2,.9,.2,1.2) both}
  .finishCards{width:92%;display:grid;grid-template-columns:1fr 1fr;gap:34px;position:relative;z-index:5}
  .finishCard{min-height:620px;border-radius:38px;padding:42px 28px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(180deg,#14172a,#090b13);border:5px solid #7a42ff;box-shadow:0 0 55px #7a42ff55;animation:cardBoom .8s cubic-bezier(.18,.9,.18,1.2) both}
  .finishCard.gift{border-color:#ffb000;box-shadow:0 0 65px #ffb00066;animation-delay:.08s}.finishCard.tap{border-color:#4de6ff;box-shadow:0 0 65px #4de6ff55;animation-delay:.16s}
  .finishKind{font-size:32px;font-weight:1000;letter-spacing:1px;margin-bottom:22px}.finishCrown{font-size:120px;line-height:1;filter:drop-shadow(0 0 22px #ffb000);animation:crownBoom 1s ease-in-out infinite alternate}
  .finishAvatar{width:210px;height:210px;border-radius:50%;overflow:hidden;border:7px solid #d946ef;background:#22263a;display:grid;place-items:center;font-size:54px;font-weight:1000;margin:18px 0}.finishAvatar img{width:100%;height:100%;object-fit:cover}
  .finishName{max-width:100%;font-size:42px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.finishScore{font-size:54px;font-weight:1000;margin-top:16px}.gift .finishScore{color:#ffd34d}.tap .finishScore{color:#72efff}
  .burst{position:absolute;left:50%;top:50%;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 -390px 0 #ffb000,275px -275px 0 #d946ef,390px 0 0 #4de6ff,275px 275px 0 #ff4d8d,0 390px 0 #65ff9b,-275px 275px 0 #ffd34d,-390px 0 0 #a66cff,-275px -275px 0 #ff7b4d;animation:burst 1.25s ease-out infinite;opacity:.9}
  .finishConfetti{position:absolute;inset:0;pointer-events:none;z-index:2;background-image:radial-gradient(circle,#ffd34d 0 5px,transparent 6px),radial-gradient(circle,#d946ef 0 5px,transparent 6px),radial-gradient(circle,#4de6ff 0 5px,transparent 6px);background-size:110px 120px,140px 150px,170px 135px;animation:confettiFall 2.6s linear infinite}
  @keyframes finishFlash{0%{opacity:0;filter:brightness(3)}100%{opacity:1;filter:brightness(1)}}@keyframes titleBoom{0%{transform:scale(.2);opacity:0}70%{transform:scale(1.16);opacity:1}100%{transform:scale(1)}}
  @keyframes cardBoom{0%{transform:translateY(160px) scale(.5) rotate(-5deg);opacity:0}75%{transform:translateY(-12px) scale(1.04) rotate(1deg);opacity:1}100%{transform:none;opacity:1}}@keyframes crownBoom{from{transform:rotate(-8deg) scale(1)}to{transform:rotate(8deg) scale(1.12)}}@keyframes burst{0%{transform:translate(-50%,-50%) scale(.15);opacity:1}80%{transform:translate(-50%,-50%) scale(1);opacity:.8}100%{transform:translate(-50%,-50%) scale(1.15);opacity:0}}@keyframes confettiFall{from{background-position:0 -160px,30px -220px,80px -180px}to{background-position:0 1920px,30px 1840px,80px 1880px}}
  `;
  document.head.appendChild(style);
  const host=document.querySelector('.app');if(!host)return;
  const overlay=document.createElement('div');overlay.className='finishOverlay';overlay.innerHTML='<div class="finishConfetti"></div><div class="burst"></div><div class="finishTitle">🏆 FIM DA RODADA 🏆</div><div class="finishCards"><div class="finishCard gift" id="finishGift"></div><div class="finishCard tap" id="finishTap"></div></div>';
  host.appendChild(overlay);
  const avatar=u=>u?.avatar?`<div class="finishAvatar"><img src="${u.avatar}" alt=""></div>`:`<div class="finishAvatar">${(u?.username||'?').replace('@','').slice(0,2).toUpperCase()}</div>`;
  const fmt=n=>Number(n||0).toLocaleString('pt-BR');
  const card=(u,type)=>u?`<div class="finishKind">${type==='gift'?'🎁 CAMPEÃO PRESENTES':'👆 CAMPEÃO TAP'}</div><div class="finishCrown">👑</div>${avatar(u)}<div class="finishName">${u.username||'@usuario'}</div><div class="finishScore">${fmt(type==='gift'?u.coins:u.taps)} ${type==='gift'?'🪙':'⚡'}</div>`:`<div class="finishKind">${type==='gift'?'🎁 PRESENTES':'👆 TAP'}</div><div class="finishCrown">👑</div><div class="finishName">Sem participante</div><div class="finishScore">0</div>`;
  let hideTimer=null;
  sock.on('timer-finished',data=>{
    document.getElementById('finishGift').innerHTML=card(data?.giftWinner,'gift');
    document.getElementById('finishTap').innerHTML=card(data?.tapWinner,'tap');
    overlay.classList.remove('show');void overlay.offsetWidth;overlay.classList.add('show');
    clearTimeout(hideTimer);hideTimer=setTimeout(()=>overlay.classList.remove('show'),9000);
  });
})();