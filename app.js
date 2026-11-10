import {pets,subjects} from './content.js';

const key='lion-grow-v2';
const root=document.querySelector('#app');
const goals=[75,90,105,120,140];
const decorationMilestones=[3,8,15,24,36,51];
const sets=[
  ['햇살 기둥','황금 금화 더미','햇살꽃 군락','태양 수정','황금 반딧불','태양 마법 문장'],
  ['달빛 기둥','달빛 금화 더미','달맞이꽃 군락','달빛 수정','은빛 별무리','초승달 마법 문장'],
  ['노을빛 기둥','노을 금화 더미','노을꽃 군락','노을 수정','여우불 무리','불꽃 마법 문장'],
];
const items=sets[0];
const themeName=['햇살 숲','달빛 정원','노을 숲'];
const emblems=[
  '<circle cx="24" cy="24" r="5"/><path d="M24 12v5m0 14v5M12 24h5m14 0h5M15 15l4 4m10 10 4 4M15 33l4-4m10-10 4-4"/>',
  '<path d="M27 12a12 12 0 1 0 8 18 12 12 0 0 1-8-18Z"/>',
  '<path d="M24 11c3 7 1 9 5 12l3-4c5 8 3 16-8 17-10 0-13-9-7-15 0 4 2 5 4 6-1-7 1-10 3-16Z"/>',
];
function glyph(pet,slot){
  const prop=['','coins','flowers','crystals'][slot];
  if(prop) return `<img class="gear-art forest-prop" src="forest-${prop}.png" alt="" aria-hidden="true">`;
  const paths={
    0:'<path d="M8 42 17 6h14l9 36M13 42l8-36m6 0 8 36"/><path d="M18 25h12M24 19v12"/>',
    4:'<path d="m24 4 3 10 10 3-10 3-3 10-3-10-10-3 10-3Zm14 24 2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM9 26l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/>',
    5:'<circle cx="24" cy="24" r="22"/><circle cx="24" cy="24" r="18" stroke-dasharray="1 3"/><path d="m24 4 18 30H6Zm0 40L6 14h36Z"/>'+emblems[pet],
  };
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">${paths[slot]}</svg>`;
}
function scenery(pet,equipped){
  const ids=worn({equipped});
  return ids.length?`<div class="forest-set gear-${pet}" aria-hidden="true">${ids.map(slot=>`<div class="forest-piece forest-slot-${slot}">${glyph(pet,slot)}</div>`).join('')}</div>`:'';
}
const worn=s=>Array.isArray(s.equipped)?s.equipped:Number.isInteger(s.equipped)?[s.equipped]:[];
const unlocked=s=>Math.max(s.legacyDecorations,decorationMilestones.filter(goal=>s.correct.length>=goal).length);
const fresh=pet=>({pet,xp:0,food:0,fed:0,stage:0,stageFed:0,correct:[],hinted:[],rewarded:[],active:null,equipped:[],legacyDecorations:0});
function read(k){try{return JSON.parse(localStorage.getItem(k))}catch{return null}}
let roster=read(key);
if(!Array.isArray(roster?.friends)){
  roster={active:null,friends:[null,null,null]};
  const old=read('lion-grow-v1');
  if(pets[old?.pet]&&Array.isArray(old.correct)){
    roster.active=old.pet;
    roster.friends[old.pet]={...fresh(old.pet),...old,stage:old.evolved?1:0,xp:old.evolved?0:old.xp,stageFed:old.evolved?0:old.fed,legacyDecorations:Math.min(items.length,Math.floor(old.correct.length/3))};
  }
}
for(const friend of roster.friends){
  if(friend && !Number.isInteger(friend.legacyDecorations)){
    friend.legacyDecorations=Math.min(items.length,Math.floor(friend.correct.length/3));
  }
}
let state=roster.friends[roster.active]??null;
let page=state?.active?'quiz':state?'home':'choose';
let pick=0,reset=false,selected=null,feedback=null,motion=false,storageError=false,feedTimer;
let subject=state?.active?.subject??0,question=state?.active?.question??0;
function save(){
  try{localStorage.setItem(key,JSON.stringify(roster));storageError=false}
  catch{storageError=true}
}
const forms=[
  ['아기 사자','장난꾸러기 사자','잎갈기 사자','꽃갈기 순찰자','햇살 도약 사자','태양 숲 수호자'],
  ['아기 토끼','귀쫑긋 토끼','바람귀 토끼','초승달 길잡이','별구름 토끼','달빛 정원 수호자'],
  ['아기 여우','꼬리춤 여우','쌍꼬리 길잡이','단풍 세꼬리','불꽃 네꼬리','노을 다섯꼬리 수호자'],
];
const stageName=(pet,stage)=>forms[pets.indexOf(pet)][stage];
const formNotes=[
  ['앞발을 낮추고 금방이라도 뛰놀 것 같아요.','한쪽 앞발을 들고 잎처럼 굽은 갈기를 펼쳤어요.','고개를 돌리자 꽃잎 갈기가 활짝 보여요.','햇살 무늬를 드러내며 힘차게 뛰어올라요.','왕관처럼 펼쳐진 갈기와 든든한 가슴이 숲을 지켜요.'],
  ['뒷발로 서서 작은 앞발을 모았어요.','바람에 귀를 날리며 가볍게 뛰어올라요.','초승달처럼 휜 귀를 세우고 옆으로 돌아봤어요.','작은 별처럼 폭신한 털을 펼치고 떠올라요.','길게 휘어진 귀와 진주빛 털 망토가 달빛을 닮았어요.'],
  ['꼬리를 높이 들고 고개를 갸웃해요.','두 꼬리를 휘날리며 뒤를 돌아봐요.','세 꼬리가 단풍 부채처럼 펼쳐졌어요.','불꽃 모양의 네 꼬리와 함께 뛰어올라요.','다섯 꼬리와 흰 얼굴 무늬가 노을 속에서 빛나요.'],
];
const button = (label,action,kind='primary',off=false) =>
  `<button type="button" class="${kind}" data-action="${action}" ${off?'disabled':''}>${label}</button>`;
const baseArt = (id,grown=false,pose="idle") => `<div class="pet pet-${id} pose-${pose} ${grown?'grown':''}" style="--pet-color:${pets[id].color}" role="img" aria-label="${grown?pets[id].grown:'아기 '+pets[id].name}"><span aria-hidden="true">${pets[id].icon}</span>${id!==0?`<img class="friend-image" src="pet-${id}-${pose==="sad"?(grown?"sad-grown":"sad"):(grown?"grown":"baby")}.png" alt="" width="420" height="630">${pose==="reveal"?`<img class="friend-image before-evolution" src="pet-${id}-baby.png" alt="" width="420" height="630">`:''}`:''}${id===0?`<i class="lion-cel open"></i><i class="lion-cel blink"></i><i class="lion-cel perk"></i><i class="lion-cel sad"></i><i class="lion-cel chew"></i><i class="lion-cel adult"></i>`:''}</div>`;
function picture(id,stage){
  if(stage>=1) return `pet-${id}-stage-${stage}.png`;
  return id===0?(stage?'lion-adult.png':'lion-open.png'):`pet-${id}-${stage?'grown':'baby'}.png`;
}
function art(id,stage,pose="idle"){
  if(stage===0&&pose!=="reveal"){
    const base=baseArt(id,stage===1,pose);
    return base;
  }
  return `<div class="pet pet-${id} mature-pet pose-${pose} stage-${stage}" role="img" aria-label="${stageName(pets[id],stage)}"><img class="friend-image" src="${picture(id,stage)}" alt="">${pose==='reveal'?`<img class="friend-image before-evolution" src="${picture(id,stage-1)}" alt="">`:''}</div>`;
}
const intro = (label,title,desc='') => `<div class="intro"><span class="eyebrow">${label}</span><h1 tabindex="-1">${title}</h1>${desc?`<p>${desc}</p>`:''}</div>`;

function render(focus=true) {
  const pet = pets[state?.pet];
  const goal=goals[state?.stage]; const ready=state&&goal&&state.xp>=goal&&state.stageFed>0;
  let html;
  if (page==='choose') {
    const featured = pick ?? (state?.pet === 0 ? 1 : 0);
    const friend = pets[featured];
    const savedFriend=roster.friends[featured];
    const displayName=stageName(friend,savedFriend?.stage??0);
    html=`<section class="opening opening-${featured} ${savedFriend?.stage?"":"opening-baby"}" aria-label="첫 만남">
      <div class="opening-art"><div class="opening-forest" aria-hidden="true"></div><div class="opening-floor" aria-hidden="true"></div>${savedFriend?`${scenery(featured,savedFriend.equipped)}<div class="opening-friend opening-saved">${art(featured,savedFriend.stage)}</div>`:`<img class="opening-friend" src="${["opening-lion.png","opening-rabbit.png","opening-fox.png"][featured]}" alt="" fetchpriority="high">`}</div>
      <div class="opening-shade" aria-hidden="true"></div><div class="opening-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="opening-copy">
        <p class="opening-kicker"><span aria-hidden="true">✦</span> 사자대장</p>
        <h1 tabindex="-1">숲속친구들<br>키우기</h1>
        <p class="opening-guide">${savedFriend?"어떤 친구와 함께할까요? 지금 모습 그대로 이어서 키워요.":"퀴즈를 풀어 먹이를 얻고, 친구와 함께 자라요."}</p>
      </div>
      <div class="opening-controls">
        <span class="opening-caption">${savedFriend?`진화 ${savedFriend.stage} / 5`:"나의 첫 친구"} <b>${displayName}</b></span>
        <div class="pet-list" role="group" aria-label="캐릭터 선택">${pets.map((p,i)=>`<button class="pet-option ${featured===i?'picked':''}" data-action="pet:${i}" aria-pressed="${featured===i}" ${reset&&i===state.pet?'disabled':''}><span class="choice-icon" aria-hidden="true">${p.icon}</span><strong>${p.name}</strong>${reset&&roster.friends[i]?`<small class="friend-progress">진화 ${roster.friends[i].stage}/5</small>`:''}</button>`).join('')}</div>
        <div class="actions">${button(reset?(savedFriend?displayName+' 이어 키우기':'새 친구 키우기'):`아기 ${friend.name}와 시작하기 <span aria-hidden="true">→</span>`,'start','primary',pick===null)}${reset?button('돌아가기','cancel','text-button'):''}</div>
      </div>
    </section>`;
  } else if(page==='home'){
    const xp=Math.min(state.xp,goal??0);
    html=`<div class="home-grid"><section class="stage ${motion?'fed':''}"><div class="habitat" aria-hidden="true"></div><div class="stage-top"><span class="tag">진화 ${state.stage} / 5</span><span class="tag food">${pet.meal} 먹이 ${state.food}개</span></div>${scenery(state.pet,state.equipped)}${art(state.pet,state.stage,motion?'feeding':'idle')}${motion?`<span class="meal-fx" aria-hidden="true">${pet.meal}</span>`:''}<div class="speech" role="status">${motion?'냠냠! 맛있어요!':ready?'이제 진화할 수 있어요!':'함께 쑥쑥 자라요!'}</div></section><section class="panel ${ready?'evolution-ready':''}">${intro('나의 친구',stageName(pet,state.stage))}
    ${goal?`<div class="xp"><div><strong>성장 경험치</strong><b>${xp} / ${goal}</b></div><progress value="${xp}" max="${goal}" aria-label="성장 경험치"></progress></div>`:'<div class="done">✦ 다섯 번의 진화 완료</div>'}
    <p>${ready?'진화할 준비가 됐어요!':!goal?'퀴즈와 꾸미기를 계속 즐겨요.':xp===goal?'이번 단계에서 먹이를 한 번 주면 진화할 수 있어요.':state.food?'먹이를 주면 경험치가 올라요.':'단원 문제를 모두 맞히면 먹이를 받아요.'}</p>
    <div class="actions">${ready?button('진화하기','evolve'):''}${state.food&&!ready?button('먹이 주기','feed'):''}${button('문제 풀러 가기','subjects',ready||state.food?'secondary':'primary')}<div class="care-links">${button('꾸미기','wardrobe','text-button')}${button('다른 친구 키우기','choose-new','text-button')}</div></div></section></div>`;
  } else if(page==='wardrobe'){
    const count=unlocked(state), wearing=worn(state);
    html=`<section class="panel wardrobe">${intro('숲 꾸미기',themeName[state.pet],'장식을 눌러 숲에 놓거나 거둬요. 여섯 가지를 함께 놓을 수 있어요.')}
    <div class="reveal-stage"><div class="habitat" aria-hidden="true"></div>${scenery(state.pet,state.equipped)}${art(state.pet,state.stage,'idle')}</div><p class="wardrobe-progress">모은 장식 ${count} / 6 · 배치 ${wearing.length}개<br><small>${count<items.length?`다음 장식까지 새 문제 ${decorationMilestones[count]-state.correct.length}개`: '장식을 모두 모았어요!'}</small></p>
    <div class="wardrobe-items gear-${state.pet}">${sets[state.pet].map((name,i)=>`<button class="option ${wearing.includes(i)?'picked':''}" data-action="equip:${i}" aria-pressed="${wearing.includes(i)}" ${i>=count?'disabled':''}><span class="gear-thumb">${glyph(state.pet,i)}</span><span class="gear-label">${name}<small>${i>=count?`새 문제 ${decorationMilestones[i]}개 정답`:wearing.includes(i)?'숲에 놓음':'숲에 놓기'}</small></span></button>`).join('')}</div>
    <div class="actions">${count>wearing.length?button('모은 장식 모두 놓기','equip-all','secondary'):''}${wearing.length?button('장식 모두 거두기','unequip','text-button'):''}${button('육성 화면으로','home')}</div></section>`;
  } else if (page==='subjects') {
    html=intro('쉬는 시간 퀴즈','어떤 단원을 풀까요?','한 단원의 3문제를 모두 맞히면 전용 먹이를 받아요.')+
      `<div class="quiz-companion">${art(state.pet,state.stage,"idle")}<p>어떤 문제부터 풀어 볼까요?</p></div><div class="subject-list">${[...new Set(subjects.map(s=>s.name))].map(name=>`<details class="unit-group"><summary>${subjects.find(s=>s.name===name).icon} ${name}</summary><div class="unit-options">${subjects.map((s,i)=>s.name===name?`<button class="subject" data-action="subject:${i}"><span><strong>${s.unit}</strong><small>${state.rewarded.includes(i)?'복습':`${s.questions.filter((_,j)=>state.correct.includes(`${i}:${j}`)).length} / ${s.questions.length}문제`}</small></span><span aria-hidden="true">›</span></button>`:'').join('')}</div></details>`).join('')}</div><div class="actions">${button('육성 화면으로','home','secondary')}</div>`;
  } else if (page==='quiz') {
    const unit=subjects[subject];
    const [prompt,options,,,explanation] = unit.questions[question]; const last=question===unit.questions.length-1;
    const wrong=feedback?.type==='wrong', right=feedback?.type==='right';
    html=`<section class="quiz panel ${right?(feedback.reward?"reward-scene":"correct-scene"):""}"><div class="quiz-meta"><span class="tag">${unit.name} · ${unit.unit}</span><b>${question+1} / ${unit.questions.length}</b></div><div class="quiz-companion ${right?"cheer":""}">${art(state.pet,state.stage,wrong?"sad":"idle")}<p>${wrong?"천천히 다시 해 봐요.":right?(feedback.reward?"우와, 먹이를 찾았어요!":"해냈어요!"):"같이 풀어 봐요!"}</p></div>${intro('보기 중 하나를 골라요',prompt)}<div class="options" role="group" aria-label="답 보기">${options.map((value,i)=>`<button type="button" class="option ${selected===i?'picked':''}" data-action="option:${i}" aria-pressed="${selected===i}" ${feedback?'disabled':''}><span>${i+1}</span>${value}</button>`).join('')}</div>${wrong?`<div class="notice wrong" role="status"><div class="sad-pet" role="img" aria-label="아쉬워하는 ${pet.name}">${art(state.pet,state.stage,"sad")}<span aria-hidden="true">💧</span></div><div><strong>아쉬워요. 다시 풀어 볼까요?</strong>${feedback.hint?`<p>${feedback.hint}</p>`:''}</div></div>`:''}${right?`<div class="notice right ${feedback.reward?"reward-notice":"correct-notice"}" role="status"><span class="reward-icon" aria-hidden="true">${feedback.reward?pet.meal:'✓'}</span><span class="reward-rays" aria-hidden="true"></span><div><strong>${feedback.reward?`단원 완료! ${pet.food} 1개를 받았어요.`:'정답이에요!'}</strong>${feedback.points&&state.stage<goals.length?'<p>경험치 +5</p>':''}${feedback.item?`<p class="item-unlock">✦ 꾸미기 아이템 · ${feedback.item}</p>`:''}${explanation?`<p>${explanation}</p>`:''}</div></div>`:''}<div class="actions">${wrong?button('다시 풀기','retry'):right?button(last?(feedback.reward?'먹이 주러 가기':'육성 화면으로'):'다음 문제',last?'home':'next'):button('정답 확인','check','primary',selected===null)}${!(right&&last)?button('과목 고르기','subjects','text-button'):''}</div></section>`;
  } else {
    html=`<section class="result panel reveal-pet-${state.pet} reveal-level-${state.stage} ${motion?'transform':''}">${intro(`${state.stage}번째 진화 성공`,stageName(pet,state.stage),formNotes[state.pet][state.stage-1])}<div class="reveal-stage"><div class="habitat" aria-hidden="true"></div><div class="evolution-halo" aria-hidden="true"></div>${scenery(state.pet,state.equipped)}${art(state.pet,state.stage,"reveal")}</div><div class="actions">${button('새로운 모습 보기','home')}</div></section>`;
  }
  document.body.classList.toggle("opening-page",page==="choose");
  document.body.classList.toggle("quiz-page",page==="quiz"||page==="subjects");
  document.body.classList.toggle("care-page",page==="home"||page==="wardrobe"||page==="result");
  root.innerHTML=html+(storageError?'<p class="storage" role="status">이 브라우저에서 진행을 저장할 수 없어요. 화면을 닫기 전까지 플레이할 수 있어요.</p>':'');
  root.inert=false;
  if(focus) root.querySelector('h1')?.focus();
}

root.addEventListener('click', event => {
  const control=event.target.closest('button[data-action]');
  if(!control || control.disabled) return;
  const [action,value]=control.dataset.action.split(':');
  clearTimeout(feedTimer);
  motion=false;
  switch(action) {
    case 'pet': pick=Number(value); render(false); root.querySelector(`[data-action="pet:${pick}"]`)?.focus(); return;
    case 'start':
      if(pick===null || (reset && state.pet===pick)) return;
      state=roster.friends[pick]??fresh(pick); roster.friends[pick]=state; roster.active=pick; reset=false; page='home'; save(); break;
    case 'home': state.active=null; page='home'; save(); break;
    case 'subjects': state.active=null; page='subjects'; save(); break;
    case 'subject': {
      subject=Number(value);
      const first=subjects[subject].questions.findIndex((_,i)=>!state.correct.includes(`${subject}:${i}`));
      question=first<0?0:first; selected=null; feedback=null; page='quiz';
      state.active={subject,question}; save(); break;
    }
    case 'option': if(feedback) return; selected=Number(value); render(false); root.querySelector(`[data-action="option:${selected}"]`)?.focus(); return;
    case 'retry': selected=null; feedback=null; break;
    case 'check': {
      if(selected===null || feedback) return;
      const id=`${subject}:${question}`, [, ,answer,hint]=subjects[subject].questions[question];
      if(selected!==answer) {
        feedback={type:'wrong',hint:state.hinted.includes(id)?null:hint};
        if(feedback.hint) state.hinted.push(id);
      } else {
        const points=!state.correct.includes(id);
        const before=unlocked(state); if(points){state.correct.push(id); if(state.stage<goals.length) state.xp+=5;}
        const reward=!state.rewarded.includes(subject)&&subjects[subject].questions.every((_,i)=>state.correct.includes(`${subject}:${i}`));
        if(reward) { state.rewarded.push(subject); state.food++; }
        feedback={type:'right',points,reward,item:unlocked(state)>before?sets[state.pet][before]:null};
        state.active=question<subjects[subject].questions.length-1?{subject,question:question+1}:null;
      }
      save(); break;
    }
    case 'next': question++; selected=null; feedback=null; state.active={subject,question}; save(); break;
    case 'feed':
      if(!state.food||(goals[state.stage]&&state.xp>=goals[state.stage]&&state.stageFed)) return;
      state.food--; state.fed++; state.stageFed++; if(state.stage<goals.length) state.xp+=35;
      motion=true; save(); break;
    case 'evolve':
      const goal=goals[state.stage]; if(!goal||state.xp<goal||!state.stageFed) return;
      state.xp-=goal; state.stage++; state.stageFed=0; motion=true; page='result'; save(); break;
    case 'wardrobe': page='wardrobe'; break;
    case 'equip': {
      const id=Number(value), current=worn(state);
      if(page!=='wardrobe'||!Number.isInteger(id)||id<0||id>=unlocked(state)) return;
      state.equipped=current.includes(id)?current.filter(i=>i!==id):[...current,id].sort((a,b)=>a-b);
      save(); break;
    }
    case 'equip-all': if(page!=='wardrobe') return; state.equipped=Array.from({length:unlocked(state)},(_,i)=>i); save(); break;
    case 'unequip': if(page!=='wardrobe') return; state.equipped=[]; save(); break;
    case 'choose-new': reset=true; pick=state.pet===0?1:0; page='choose'; break;
    case 'cancel': reset=false; pick=null; page='home'; break;
    default: return;
  }
  const editingDecoration=['equip','equip-all','unequip'].includes(action);
  render(!editingDecoration);
  if(editingDecoration) (root.querySelector(`[data-action="${control.dataset.action}"]`)??root.querySelector('.wardrobe-items button:not(:disabled)'))?.focus({preventScroll:true});
  if(action==='feed') {
    feedTimer=setTimeout(()=>{
      const focused=document.activeElement?.dataset.action;
      motion=false; render(false);
      if(focused) root.querySelector(`[data-action="${focused}"]`)?.focus({preventScroll:true});
    },1250);
  }
  if(action==='check') root.querySelector('.actions button')?.focus();
  if(action==='retry') root.querySelector('.option')?.focus();
});
render(false);
const sprites = new Image();
sprites.onload = () => document.documentElement.classList.add('has-art');
sprites.src = 'pet-1-baby.png';
const lionSheet = new Image();
lionSheet.onload = () => document.documentElement.classList.add('has-lion');
lionSheet.src = 'lion-open.png';

























function playOpening(){
  if(!window.matchMedia||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const intro=document.querySelector('#forest-intro');
  if(typeof intro?.showModal!=='function')return;
  const skip=intro.querySelector('.intro-skip');
  let timer;
  function finish(){
    clearTimeout(timer);
    if(intro.open)intro.close();
    root.querySelector('h1')?.focus({preventScroll:true});
  }
  skip.addEventListener('click',finish,{once:true});
  intro.addEventListener('cancel',event=>{event.preventDefault();finish()},{once:true});
  const loaded=[...intro.querySelectorAll('img[data-src]')].map(img=>{
    img.src=img.dataset.src;
    return img.decode?.().catch(()=>{})??Promise.resolve();
  });
  intro.showModal();
  Promise.race([Promise.all(loaded),new Promise(resolve=>setTimeout(resolve,750))]).then(()=>{
    if(!intro.open)return;
    intro.classList.add('intro-playing');
    timer=setTimeout(finish,5000);
  });
}

if(typeof window!=='undefined')playOpening();


