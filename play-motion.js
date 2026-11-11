const ornaments = [
  ['왕관의 빛을 따라 사자가 고개를 들었어요!','사자가 앞발을 내밀자 보물함이 반짝여요!','사자가 고개를 숙여 장미 향을 맡아요!','사자가 태양석에 코를 가까이 대고 살펴봐요!','사자가 반딧불을 따라 시선을 옮겨요!','사자가 앞발로 태양 인장을 톡 건드려요!'],
  ['토끼가 초승달을 보며 귀를 쫑긋 세워요!','토끼가 몸을 낮춰 잔물결을 들여다봐요!','토끼가 아치 쪽을 향해 폴짝 뛰어요!','토끼가 고개를 돌려 달등을 바라봐요!','토끼가 귀를 흔들며 별빛을 좇아요!','토끼가 달의 물결 위로 가볍게 뛰어요!'],
  ['여우가 노을빛을 보고 꼬리를 활짝 펼쳐요!','여우가 몸을 낮추고 화로의 불꽃을 살펴봐요!','여우가 문 쪽으로 고개를 돌리고 꼬리를 흔들어요!','여우가 고개를 들어 등롱을 바라봐요!','여우가 여우불을 따라 꼬리를 살랑여요!','여우가 앞발로 불꽃 인장을 톡 찍어요!'],
];
const newReactions = [
  ['사자가 해시계 그림자를 따라 고개를 돌려요!','사자가 모래가 떨어지는 쪽으로 고개를 갸웃해요!','사자가 물방울을 앞발로 톡 건드려요!','사자가 고개를 들고 풍경 소리를 들어요!','사자가 다리 쪽으로 한 걸음 성큼 내디뎌요!','사자가 등불에 앞발을 내밀어요!'],
  ['토끼가 앞발을 들어 하프 줄을 튕겨요!','토끼가 귀를 세우고 망원경 너머를 들여다봐요!','토끼가 찻잔 쪽으로 고개를 낮춰요!','토끼가 분수 물방울을 피해 폴짝 뛰어요!','토끼가 회전목마를 따라 두 번 뛰어요!','토끼가 오르골 소리에 귀를 까딱거려요!'],
  ['여우가 바람개비를 따라 고개와 꼬리를 흔들어요!','여우가 연을 보며 고개를 높이 들어요!','여우가 향로 쪽으로 코를 가까이 대요!','여우가 감 바구니에 앞발을 내밀어요!','여우가 탈을 살피며 고개를 갸웃해요!','여우가 종을 향해 앞발을 들어 올려요!'],
];
export const ornamentReaction = (pet,slot) => slot<6?ornaments[pet][slot]:newReactions[pet][slot-6];

// Each item has a named action rather than a shared lateral nudge.
export const ornamentActions = [
  ['look','reach','sniff','inspect','follow','stamp','follow','inspect','splash','listen','step','reach'],
  ['perk','inspect','hop','look','follow','hop','pluck','look','sip','splash','double-hop','listen'],
  ['sway','warm','sway','look','follow','stamp','sway','look','sniff','reach','inspect','ring'],
];
const sheets=new Map();
const active=new WeakMap();
function loadSheet(pet,stage){
  const path=`./motion/friend-${pet}-${stage}.webp`;
  if(!sheets.has(path)) sheets.set(path,(async()=>{const img=new Image();img.src=path;await img.decode();return img;})().catch(error=>{sheets.delete(path);throw error;}));
  return sheets.get(path);
}
const actionRows={look:1,reach:0,sniff:1,inspect:1,follow:1,stamp:0,perk:1,hop:2,'double-hop':2,splash:0,listen:1,step:2,pluck:0,sip:3,sway:2,warm:1,ring:0};
// First trial uses newly drawn consecutive key poses and baked motion-compensated frames.
const feedingTrials=new Map([['0:0',{motion:'./motion/feeding-0-0.webp',idle:'./motion/feeding-idle-0-0.webp',duration:3360}]]);
const feedingAssets=new Map();
function loadFeedingTrial(config){
  if(!feedingAssets.has(config.motion))feedingAssets.set(config.motion,(async()=>{
    const idle=new Image();idle.src=config.idle;
    const response=await fetch(config.motion);if(!response.ok)throw new Error('Feeding animation unavailable');
    const blob=await response.blob();await idle.decode();return {blob,idle};
  })().catch(error=>{feedingAssets.delete(config.motion);throw error;}));
  return feedingAssets.get(config.motion);
}
async function playFeedingTrial(scene,body,image,config,job){
  let assets;try{assets=await loadFeedingTrial(config);}catch{return false;}
  if(!body.isConnected||pending.get(body)!==job)return true;
  const url=URL.createObjectURL(assets.blob),overlay=new Image();overlay.src=url;
  try{await overlay.decode();}catch{URL.revokeObjectURL(url);return false;}
  if(!body.isConnected||pending.get(body)!==job){URL.revokeObjectURL(url);return true;}
  active.get(body)?.cleanup();
  const rect=image.getBoundingClientRect();overlay.width=384;overlay.height=Math.round(384*(rect.height||256)/(rect.width||256));
  overlay.className=image.className+' play-pose sprite-motion';overlay.setAttribute('aria-hidden','true');
  let observer,timer,disposed=false;
  const controller={canvas:overlay,idle:false,snapshot:()=>copySurface(overlay),cleanup(){
    if(disposed)return;disposed=true;clearTimeout(timer);observer?.disconnect();overlay.remove();URL.revokeObjectURL(url);image.style.removeProperty('visibility');
    if(active.get(body)===controller)active.delete(body);
  }};
  active.set(body,controller);image.after(overlay);image.style.visibility='hidden';
  observer=new MutationObserver(()=>{if(!body.isConnected)controller.cleanup()});observer.observe(document.querySelector('#app'),{childList:true,subtree:true});
  timer=setTimeout(()=>{if(!body.isConnected){controller.cleanup();return;}controller.idle=true;URL.revokeObjectURL(url);},config.duration);
  return true;
}
export function warmFriend(pet,stage,scene){
  return loadSheet(pet,stage).then(async sheet=>{
    const image=scene?.querySelector('.friend-image'),body=image?.closest('.pet');
    const trial=feedingTrials.get(`${pet}:${stage}`);let idle;
    if(trial)try{idle=(await loadFeedingTrial(trial)).idle;}catch{}
    if(!body?.isConnected||active.has(body))return sheet;
    const canvas=makeSurface(image),ctx=canvas.getContext('2d');if(!ctx)return sheet;
    drawContained(ctx,idle??sheet,canvas.width,canvas.height,1,idle?null:0);image.after(canvas);image.style.visibility='hidden';
    let observer;const controller={canvas,idle:true,snapshot:()=>copySurface(canvas),cleanup(){observer?.disconnect();canvas.remove();image.style.removeProperty('visibility');if(active.get(body)===controller)active.delete(body);}};
    active.set(body,controller);observer=new MutationObserver(()=>{if(!body.isConnected)controller.cleanup()});
    observer.observe(document.querySelector('#app'),{childList:true,subtree:true});return sheet;
  }).catch(()=>null);
}
function makeSurface(image){
  const canvas=document.createElement('canvas'),rect=image.getBoundingClientRect();
  canvas.width=384;canvas.height=Math.max(1,Math.round(384*(rect.height||256)/(rect.width||256)));
  canvas.className=image.className+' play-pose sprite-motion';canvas.setAttribute('aria-hidden','true');return canvas;
}
function copySurface(canvas){const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;const ctx=copy.getContext('2d');if(canvas.naturalWidth)drawContained(ctx,canvas,copy.width,copy.height);else ctx.drawImage(canvas,0,0);return copy;}
const pending=new WeakMap();
const ease=t=>t*t*(3-2*t);
function drawContained(ctx,source,width,height,alpha=1,cell=null){
  const sw=cell!==null?256:source.naturalWidth,sh=cell!==null?256:source.naturalHeight;
  const scale=Math.min(width/sw,height/sh),w=sw*scale,h=sh*scale;
  ctx.globalAlpha=alpha;
  if(cell!==null)ctx.drawImage(source,cell%4*256,Math.floor(cell/4)*256,256,256,(width-w)/2,height-h,w,h);
  else ctx.drawImage(source,(width-w)/2,height-h,w,h);
}
function sequenceFor(action,name){
  if(action==='snack')return [0,1,2,3,12,13,14,15,14,15,16,17,18,19,0];
  if(action==='toy')return [0,1,2,3,4,5,6,7,8,9,10,11,7,4,0];
  const first=(actionRows[name]??1)*4;
  // Return through adjacent poses; looking at a lamp should not suddenly turn into a jump.
  return [0,first,first+1,first+2,first+3,first+2,first+1,first,0];
}
export async function animateFriend(scene,pet,action,slot){
  if(!scene||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const image=scene.querySelector('.friend-image'),body=image?.closest('.pet');
  if(!body)return;
  const job={};pending.set(body,job);
  const stage=Number(body.className.match(/stage-(\d)/)?.[1]??0);
  const trial=action==='snack'?feedingTrials.get(`${pet}:${stage}`):null;
  if(trial&&await playFeedingTrial(scene,body,image,trial,job))return;
  let sheet;try{[sheet]=await Promise.all([loadSheet(pet,stage),image.decode()]);}catch{return;}
  if(!body.isConnected||pending.get(body)!==job)return;
  // Keep the last visible pose when another decoration is tapped during an action.
  const prior=active.get(body),snapshot=prior?.idle?null:prior?.snapshot();prior?.cleanup();
  const canvas=makeSurface(image);
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const name=action==='ornament'?ornamentActions[pet]?.[slot]:action;
  const sequence=sequenceFor(action,name),duration=action==='snack'?3400:action==='toy'?3000:2600;
  const ornament=scene.querySelector('.ornament-active');let fx;
  if(ornament){
    scene.dataset.interaction=name;ornament.dataset.interaction=name;
    fx=document.createElement('span');fx.className='interaction-effect effect-'+name;fx.innerHTML='<i></i><i></i><i></i>';ornament.append(fx);
  }
  const {width,height}=canvas;const entry=240,exit=300;
  let raf,observer,finished=false;const start=performance.now();
  function cleanup(){
    if(finished)return;finished=true;cancelAnimationFrame(raf);observer?.disconnect();canvas.remove();
    image.style.removeProperty('visibility');fx?.remove();delete scene.dataset.interaction;delete scene.dataset.motionBeat;
    if(active.get(body)?.canvas===canvas)active.delete(body);
  }
  const controller={canvas,cleanup,idle:false,snapshot:()=>copySurface(canvas)};active.set(body,controller);
  function rest(alpha){
    if(snapshot){ctx.globalAlpha=alpha;ctx.drawImage(snapshot,0,0,width,height);}
    else drawContained(ctx,sheet,width,height,alpha,0);
  }
  function pose(index,alpha){drawContained(ctx,sheet,width,height,alpha,index);}
  function tick(now){
    if(!body.isConnected){cleanup();return;}
    const elapsed=Math.max(0,now-start);ctx.clearRect(0,0,width,height);
    // Add premultiplied layers so overlapping opaque fur stays opaque during the blend.
    ctx.globalCompositeOperation='lighter';
    if(elapsed<entry){const t=ease(elapsed/entry);rest(1-t);pose(sequence[0],t);}
    else if(elapsed>duration-exit){const t=ease(Math.min(1,(elapsed-duration+exit)/exit));pose(sequence.at(-1),1-t);pose(0,t);}
    else{
      const position=(elapsed-entry)/(duration-entry-exit)*(sequence.length-1);
      const from=Math.min(sequence.length-2,Math.floor(position)),t=ease(position-from);
      pose(sequence[from],1-t);pose(sequence[from+1],t);
      scene.dataset.motionBeat=String(sequence[from]);
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    if(elapsed>=duration){controller.idle=true;delete scene.dataset.motionBeat;fx?.remove();delete scene.dataset.interaction;return;}raf=requestAnimationFrame(tick);
  }
  // Draw the current appearance before hiding it: no empty canvas on the first frame.
  rest(1);image.after(canvas);image.style.visibility='hidden';
  observer=new MutationObserver(()=>{if(!body.isConnected)cleanup();});observer.observe(document.querySelector('#app'),{childList:true,subtree:true});
  raf=requestAnimationFrame(tick);
}
