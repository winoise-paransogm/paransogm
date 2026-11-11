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
export async function animateFriend(scene,pet,action,slot){
  if(!scene||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  active.get(scene)?.();
  const image=scene.querySelector('.friend-image');
  if(!image)return;
  const stage=Number(image.closest('.pet').className.match(/stage-(\d)/)?.[1]??0);
  let sheet;try{sheet=await loadSheet(pet,stage);}catch{return;}
  if(!scene.isConnected)return;
  active.get(scene)?.();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  canvas.className=image.className+' play-pose sprite-motion';canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const name=action==='ornament'?ornamentActions[pet][slot]:action;
  const sequence=action==='snack'?[0,1,2,3,12,13,14,15,14,15,16,17,18,19]:action==='toy'?[0,1,2,3,4,5,6,7,8,9,10,11,16,17,18,19]:Array.from({length:4},(_,i)=>(actionRows[name]??1)*4+i).concat([16,17,18,19]);
  const duration=action==='snack'?3400:2800;
  const ornament=scene.querySelector('.ornament-active');
  if(ornament){
    scene.dataset.interaction=name;ornament.dataset.interaction=name;
    const fx=document.createElement('span');fx.className='interaction-effect effect-'+name;fx.innerHTML='<i></i><i></i><i></i>';ornament.append(fx);
  }
  let raf,observer;const start=performance.now();
  function cleanup(){cancelAnimationFrame(raf);observer?.disconnect();canvas.remove();image.style.removeProperty('visibility');scene.querySelectorAll('.interaction-effect').forEach(el=>el.remove());delete scene.dataset.interaction;delete scene.dataset.motionBeat;active.delete(scene);}
  active.set(scene,cleanup);image.after(canvas);image.style.visibility='hidden';
  observer=new MutationObserver(()=>{if(!scene.isConnected)cleanup();});observer.observe(document.querySelector('#app'),{childList:true});
  function tick(now){
    if(!scene.isConnected||now-start>=duration){cleanup();return;}
    const index=sequence[Math.min(sequence.length-1,Math.floor((now-start)/duration*sequence.length))];
    ctx.clearRect(0,0,256,256);ctx.drawImage(sheet,index%4*256,Math.floor(index/4)*256,256,256,0,0,256,256);
    scene.dataset.motionBeat=String(index);
    raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
}
