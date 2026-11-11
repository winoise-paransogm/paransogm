import {createPuppetRenderer,puppetPose} from './puppet-motion.js';
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

const active=new WeakMap(),pending=new WeakMap(),feedingAssets=new Map();
const feedingTrials=new Map([['0:0',{motion:'./motion/feeding-0-0.webp',idle:'./motion/feeding-idle-0-0.webp',duration:3360}]]);
function loadFeedingTrial(config){
 if(!feedingAssets.has(config.motion))feedingAssets.set(config.motion,(async()=>{
  const idle=new Image();idle.src=config.idle;const response=await fetch(config.motion);
  if(!response.ok)throw new Error('Feeding animation unavailable');
  const blob=await response.blob();await idle.decode();idle.motionFit=1;idle.motionFloor=0;return {blob,idle};
 })().catch(error=>{feedingAssets.delete(config.motion);throw error;}));
 return feedingAssets.get(config.motion);
}
function makeSurface(image){
 const canvas=document.createElement('canvas'),rect=image.getBoundingClientRect();
 const density=Math.max(1,Math.min(3,window.devicePixelRatio||1));
 canvas.width=Math.max(256,Math.min(768,Math.round((rect.width||256)*density)));
 canvas.height=Math.max(1,Math.round(canvas.width*(rect.height||256)/(rect.width||256)));
 canvas.className=image.className+' play-pose sprite-motion';canvas.setAttribute('aria-hidden','true');return canvas;
}
function watch(body,cleanup){const observer=new MutationObserver(()=>{if(!body.isConnected)cleanup()});observer.observe(document.querySelector('#app'),{childList:true,subtree:true});return observer;}
async function sourceFor(image,pet,stage){
 const config=feedingTrials.get(`${pet}:${stage}`);if(config)try{return (await loadFeedingTrial(config)).idle;}catch{}
 await image.decode();return image;
}
export function warmFriend(pet,stage,scene){
 const image=scene?.querySelector('.friend-image'),body=image?.closest('.pet');if(!body)return Promise.resolve();
 return sourceFor(image,pet,stage).then(source=>{
  if(!body.isConnected||active.has(body))return;
  const canvas=makeSurface(image),renderer=createPuppetRenderer(canvas,source,pet,stage);renderer.render(puppetPose(pet,'idle',0));
  let observer,disposed=false;const controller={canvas,source,idle:true,done:Promise.resolve(),cleanup(){
   if(disposed)return;disposed=true;observer?.disconnect();renderer.dispose();canvas.remove();image.style.removeProperty('visibility');if(active.get(body)===controller)active.delete(body);
  }};
  active.set(body,controller);image.after(canvas);image.style.visibility='hidden';observer=watch(body,controller.cleanup);
 }).catch(()=>null);
}
async function playFeedingTrial(body,image,config,job){
 let assets;try{assets=await loadFeedingTrial(config);}catch{return false;}
 if(!body.isConnected||pending.get(body)!==job)return true;
 const url=URL.createObjectURL(assets.blob),overlay=new Image();overlay.src=url;
 try{await overlay.decode();}catch{URL.revokeObjectURL(url);return false;}
 if(!body.isConnected||pending.get(body)!==job){URL.revokeObjectURL(url);return true;}
 let resolveDone;const done=new Promise(resolve=>resolveDone=resolve);let observer,timer,disposed=false;
 const controller={canvas:overlay,source:assets.idle,done,idle:false,cleanup(){
  if(disposed)return;disposed=true;clearTimeout(timer);observer?.disconnect();overlay.remove();URL.revokeObjectURL(url);image.style.removeProperty('visibility');resolveDone();if(active.get(body)===controller)active.delete(body);
 }};
 overlay.className=image.className+' play-pose sprite-motion';overlay.setAttribute('aria-hidden','true');
 active.get(body)?.cleanup();active.set(body,controller);image.after(overlay);image.style.visibility='hidden';observer=watch(body,controller.cleanup);
 // The encoded last frame is the same idle pose. Keep it mounted; changing src can flash.
 timer=setTimeout(()=>{if(!body.isConnected){controller.cleanup();return;}controller.idle=true;URL.revokeObjectURL(url);resolveDone();},config.duration);
 return true;
}
export async function animateFriend(scene,pet,action,slot){
 if(!scene||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const image=scene.querySelector('.friend-image'),body=image?.closest('.pet');if(!body)return;
 const job={};pending.set(body,job);const previous=active.get(body);
 // One current action and the latest requested next action: no cut pose or accumulated queue.
 if(previous&&!previous.idle&&previous.done)await previous.done;
 if(!body.isConnected||pending.get(body)!==job)return;
 const stage=Number(body.className.match(/stage-(\d)/)?.[1]??0),trial=action==='snack'?feedingTrials.get(`${pet}:${stage}`):null;
 if(trial&&await playFeedingTrial(body,image,trial,job))return;
 let source;try{source=await sourceFor(image,pet,stage);}catch{return;}
 if(!body.isConnected||pending.get(body)!==job)return;
 const canvas=makeSurface(image);let renderer;try{renderer=createPuppetRenderer(canvas,source,pet,stage);}catch{return;}
 renderer.render(puppetPose(pet,'idle',0));
 const name=action==='ornament'?ornamentActions[pet]?.[slot]:action,duration=action==='snack'?3400:action==='toy'?3000:2600;
 const ornament=scene.querySelector('.ornament-active');let fx;
 if(ornament){scene.dataset.interaction=name;ornament.dataset.interaction=name;fx=document.createElement('span');fx.className='interaction-effect effect-'+name;fx.innerHTML='<i></i><i></i><i></i>';ornament.append(fx);}
 let resolveDone;const done=new Promise(resolve=>resolveDone=resolve);let observer,raf,disposed=false;
 const controller={canvas,source,done,idle:false,cleanup(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();renderer.dispose();canvas.remove();fx?.remove();image.style.removeProperty('visibility');delete scene.dataset.interaction;resolveDone();if(active.get(body)===controller)active.delete(body);
 }};
 active.get(body)?.cleanup();active.set(body,controller);image.after(canvas);image.style.visibility='hidden';observer=watch(body,controller.cleanup);
 const start=performance.now();
 function tick(now){
  if(!body.isConnected){controller.cleanup();return;}
  const elapsed=Math.max(0,now-start),t=Math.min(1,elapsed/duration);
  renderer.render(puppetPose(pet,t===1?'idle':name,t,elapsed));
  if(t===1){controller.idle=true;fx?.remove();delete scene.dataset.interaction;resolveDone();return;}
  raf=requestAnimationFrame(tick);
 }
 raf=requestAnimationFrame(tick);
}
