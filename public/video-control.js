(()=>{
  const app=document.querySelector('.app');
  if(!app)return;
  const sock=(typeof socket!=='undefined'&&socket)?socket:io();
  const style=document.createElement('style');
  style.textContent=`
  .videoStage{display:none;position:relative;border:2px solid #6b2e82;border-radius:26px;overflow:hidden;background:#05060c;box-shadow:0 0 24px #7d25b322;animation:panelIn .55s ease both}
  .videoStage.on{display:block}
  .videoStage video{width:100%;height:100%;display:block;object-fit:cover;background:#000}
  .videoTag{position:absolute;left:18px;top:16px;z-index:3;background:#150c22cc;border:1px solid #8e2dc7;border-radius:18px;padding:8px 16px;font-size:20px;font-weight:900}
  .videoError{display:none;position:absolute;inset:0;z-index:2;align-items:center;justify-content:center;text-align:center;padding:40px;background:#090b13;color:#ff8e8e;font-size:24px;font-weight:800}.videoError.on{display:flex}
  .app.videoOn{grid-template-rows:330px minmax(0,1fr) 360px}.app.videoOn .cols{grid-template-rows:320px minmax(0,1fr)}
  .app.videoOn .panel h2{padding:15px 22px;font-size:25px}.app.videoOn .row{grid-template-columns:50px 50px minmax(0,1fr) auto}.app.videoOn .avatar{width:48px;height:48px}.app.videoOn .user,.app.videoOn .score{font-size:19px}.app.videoOn .top3{padding:10px 20px}.app.videoOn .winner .avatar{width:76px;height:76px}.app.videoOn .pod .avatar{width:65px;height:65px}.app.videoOn .bigCrown{font-size:56px}`;
  document.head.appendChild(style);
  const box=document.createElement('section');
  box.className='videoStage';
  box.innerHTML='<div class="videoTag">🎬 VÍDEO</div><video id="liveBottomVideo" loop playsinline autoplay muted preload="auto"></video><div id="videoError" class="videoError">Não foi possível reproduzir este endereço. Use um link direto para arquivo .mp4 ou .webm.</div>';
  app.appendChild(box);
  const video=box.querySelector('video');
  const error=box.querySelector('#videoError');
  let current='';
  const showError=(show)=>error.classList.toggle('on',!!show);
  video.addEventListener('canplay',()=>showError(false));
  video.addEventListener('playing',()=>showError(false));
  video.addEventListener('error',()=>showError(true));
  async function apply(s){
    const v=s?.video||{};
    const url=String(v.url||'').trim();
    const on=!!v.enabled&&!!url;
    box.classList.toggle('on',on);
    app.classList.toggle('videoOn',on);
    if(url!==current){
      current=url;
      showError(false);
      video.pause();
      video.removeAttribute('src');
      if(current){video.src=current;video.load()}
    }
    // Browser Source/autoplay is reliable only when muted.
    video.muted=true;
    if(on){
      try{await video.play();showError(false)}catch(e){showError(true)}
    }else{
      video.pause();
      showError(false);
    }
  }
  sock.on('state',apply);
})();