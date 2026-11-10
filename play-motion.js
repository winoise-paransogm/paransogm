// Joint positions are normalized to each final-evolution portrait.
const rigs = [
  [[.74,.27,.24,.26],[.87,.88,.17,.18],[.17,.60,.16,.24]],
  [[.66,.33,.23,.23],[.44,.16,.25,.23],[.66,.69,.22,.22]],
  [[.81,.27,.22,.24],[.87,.90,.17,.16],[.24,.56,.25,.35]],
];
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

// Each beat moves head, paw/ear and tail/feet independently, then shifts the body.
const toyBeats = [
  [[-3,4, 1,-2, -3,2, -3,1],[5,-2, 15,-17, 5,-4, 8,-2],[4,5, 10,-5, -3,4, 9,1],[-3,-7, -4,-6, 6,-4, 1,-3]],
  [[1,7, -8,10, 2,6, -4,2],[5,-5, 12,-9, -8,8, 5,-19],[2,6, -5,8, 3,5, 9,1],[-5,-5, 9,-9, 8,6, 1,-14]],
  [[-6,5, -3,3, -8,5, -5,2],[8,-5, 7,-10, 14,-11, 7,-8],[5,2, 1,0, -9,7, 10,0],[-4,-6, -2,-4, 12,-8, 1,-3]],
];
const ornamentBeats = [
  [0,-8, 1,-7, -3,-7, 0,-3],
  [-6,8, -8,-7, 4,4, -7,1],
  [8,2, 7,-5, 8,-6, 8,-2],
  [-8,-3, -6,-5, -4,5, -7,-2],
  [6,-7, 3,-8, 10,-10, 4,-7],
  [0,5, 8,-15, 2,5, 2,-3],
];
const newBeats = [
  [[-9,2,0,-2,6,-3,-4,0],[6,5,4,-4,0,1,5,0],[5,-4,14,-15,-4,7,6,-2],[-5,-12,1,-3,6,-5,-2,-3],[5,-3,12,-12,3,6,13,-5],[-4,-2,-12,-14,5,-3,-7,-1]],
  [[-4,2,9,-9,12,-10,-5,-2],[7,-9,8,-13,0,5,7,-5],[1,9,-7,7,0,2,4,2],[6,-5,-5,-11,7,5,4,-18],[-7,-5,7,-9,12,6,9,-20],[1,-7,13,-13,0,3,0,-4]],
  [[-8,-3,2,-4,16,-9,-3,-2],[7,-13,4,-5,10,5,4,-8],[-8,8,-3,-3,-6,6,-7,1],[4,7,12,-13,5,-3,5,-2],[-8,-2,0,1,-12,10,-4,0],[5,-6,14,-15,7,3,6,-5]],
];
const rest = Array(8).fill(0);
const lerp = (a,b,t) => a+(b-a)*t;

export async function animateFriend(scene, pet, action, slot) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const image = scene.querySelector('.friend-image');
  try { await image.decode(); } catch { return; }
  if (!scene.isConnected) return;
  const canvas = document.createElement('canvas');
  canvas.className = image.className + ' play-pose';
  canvas.setAttribute('aria-hidden','true');
  const width = 230, height = Math.round(width*image.naturalHeight/image.naturalWidth);
  canvas.width=width;
  canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if (!ctx) return;
  ctx.drawImage(image,0,0,width,height);
  const source=ctx.getImageData(0,0,width,height);
  const frame=ctx.createImageData(width,height);
  const weights=rigs[pet].map(([cx,cy,rx,ry])=>{
    const grid=new Float32Array(width*height);
    for(let y=0;y<height;y++) for(let x=0;x<width;x++){
      const d=((x/width-cx)/rx)**2+((y/height-cy)/ry)**2;
      grid[y*width+x]=Math.exp(-2*d);
    }
    return grid;
  });
  let poses=toyBeats[pet];
  if(action==='snack') poses=[[3,6,3,-6,0,2,1,0],[0,-4,-2,-3,2,-3,0,-1],[3,5,2,0,-2,4,0,0],[-2,-4,0,-2,5,-4,0,-4]];
  if(action==='ornament'){
    const reach=slot<6?ornamentBeats[slot]:newBeats[pet][slot-6];
    poses=[reach.map(n=>-n*.35),reach,reach.map(n=>n*.55),reach.map(n=>n*.85)];
  }
  const sequence=[rest,...poses,rest];
  image.after(canvas);
  image.style.visibility='hidden';
  const start=performance.now();
  const duration=action==='toy'?2400:1700;
  function tick(now){
    if(!scene.isConnected) return;
    if(now-start>=duration){
      canvas.remove();
      image.style.removeProperty('visibility');
      return;
    }
    const pos=Math.max(0,(now-start)/duration)*(sequence.length-1);
    const step=Math.floor(pos), phase=pos-step, easing=phase*phase*(3-2*phase);
    const pose=sequence[step].map((n,i)=>lerp(n,sequence[step+1][i],easing));
    for(let y=0;y<height;y++) for(let x=0;x<width;x++){
      const pixel=y*width+x;
      const dx=weights[0][pixel]*pose[0]+weights[1][pixel]*pose[2]+weights[2][pixel]*pose[4];
      const dy=weights[0][pixel]*pose[1]+weights[1][pixel]*pose[3]+weights[2][pixel]*pose[5];
      const fromX=Math.round(x-dx),fromY=Math.round(y-dy);
      const alpha=(pixel*4)+3;
      if(fromX<0||fromX>=width||fromY<0||fromY>=height){frame.data[alpha]=0;continue;}
      const from=(fromY*width+fromX)*4;
      frame.data[alpha-3]=source.data[from];
      frame.data[alpha-2]=source.data[from+1];
      frame.data[alpha-1]=source.data[from+2];
      frame.data[alpha]=source.data[from+3];
    }
    ctx.putImageData(frame,0,0);
    canvas.style.transform=`translate(${pose[6]}%,${pose[7]}%)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
