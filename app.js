import {pets,subjects,questionsFor} from './content.js';
import {playQuizSound} from './quiz-sounds.js';
import {animateFriend,ornamentReaction,warmFriend} from './play-motion.js';

const key='lion-grow-v2';
const root=document.querySelector('#app');
const goals=[75,90,105,120,140];
const formerDecorationMilestones=[3,8,15,24,36,51];
const ornamentPrices=[2,3,4,5,6,8,3,4,5,6,7,9];
const positionFor=id=>id%6;
const foodArt=(pet)=>`<img class="food-icon" src="./props/food-${pet}.webp" alt="${pets[pet].food}">`;
const toyArt=pet=>`<img class="toy-icon" src="./props/${['cone','bell','leaf'][pet]}.webp" alt="">`;
// Positions refer to the whole habitat; images and touch targets share the same box.
const decorPositions=[
 [[4,8,24,21],[4,68,24,24],[76,53,23,36],[79,33,18,36],[75,7,23,22],[28,81,44,17],[3,55,24,32],[4,57,24,32],[74,57,25,33],[77,2,19,34],[64,75,34,23],[3,4,23,30]],
 [[3,8,23,23],[3,76,32,20],[73,40,26,49],[79,32,18,39],[75,8,23,21],[28,81,44,17],[3,52,24,38],[3,55,26,35],[73,76,25,20],[75,54,23,38],[72,57,27,36],[73,67,25,27]],
 [[76,75,23,23],[4,73,24,25],[74,42,25,48],[79,39,19,46],[75,6,23,23],[28,81,44,17],[3,40,23,43],[4,3,24,36],[75,66,23,29],[4,76,24,22],[75,58,23,36],[73,42,26,49]]
];
function placement(pet,slot){const [x,y,w,h]=decorPositions[pet][slot];return `--prop-x:${x}%;--prop-y:${y}%;--prop-w:${w}%;--prop-h:${h}%;`;}
const sets=[
  ['태양 왕관의 광채','왕실 황금 보물함','황금 장미 화분','태양석 오벨리스크','황금 반딧불 성좌','태양 수호 인장','해바라기 해시계','황금 모래시계','호박빛 분수','금빛 풍경','태양석 다리','벌집 등불'],
  ['달빛 초승달','달연꽃 연못','달꽃 정원 아치','유리 달등','은하 별자리','달의 물결 문양','은빛 초승달 하프','달빛 망원경','클로버 찻잔 세트','자수정 분수','버섯 회전목마','초롱꽃 오르골'],
  ['노을 불씨','노을 화로','붉은 여우 문','호박빛 등롱','춤추는 여우불','불꽃 마름모 인장','단풍 바람개비','붉은 잎 연','비취 향로','감 바구니','여우 탈 장식','구리 종 아치'],
];
const items=sets[0];
const themeName=['햇살 숲','달빛 정원','노을 숲'];
const physicalOrnaments=[
  ['royal-chest','golden-roses','emerald-obelisk'],
  ['lotus-pond','wisteria-arch','moon-lantern'],
  ['copper-brazier','maple-gate','amber-lantern'],
];
function glyph(pet,slot){
  const prop=physicalOrnaments[pet][slot-1]??`collection-${pet}-${slot}`;
  return `<img class="gear-art forest-prop" src="./ornaments/${prop}.webp" alt="" aria-hidden="true">`;
}
function scenery(pet,equipped,interactive=false,activeSlot=null){
  const ids=worn({equipped});
  return ids.length?`<div class="forest-set gear-${pet}" ${interactive?'':'aria-hidden="true"'}>${ids.map(slot=>`<div style="${placement(pet,slot)}" class="forest-piece placed-ornament ornament-${slot} forest-slot-${positionFor(slot)} ${slot>=6?'new-ornament':''} ${activeSlot===slot?'ornament-active':''}">${glyph(pet,slot)}${interactive?`<button class="ornament-touch" type="button" data-action="play-ornament:${slot}" aria-label="${sets[pet][slot]} 반응 보기"></button>`:''}</div>`).join('')}</div>`:'';
}
const worn=s=>Array.isArray(s.equipped)?s.equipped:Number.isInteger(s.equipped)?[s.equipped]:[];
const fresh=pet=>({pet,xp:0,food:0,fed:0,stage:0,stageFed:0,correct:[],hinted:[],rewarded:[],active:null,equipped:[],ownedOrnaments:[]});
function read(k){try{return JSON.parse(localStorage.getItem(k))}catch{return null}}
let roster=read(key);
if(!Array.isArray(roster?.friends)){
  roster={active:null,friends:[null,null,null]};
  const old=read('lion-grow-v1');
  if(pets[old?.pet]&&Array.isArray(old.correct)){
    roster.active=old.pet;
    roster.friends[old.pet]={...fresh(old.pet),...old,stage:old.evolved?1:0,xp:old.evolved?0:old.xp,stageFed:old.evolved?0:old.fed,ownedOrnaments:null,legacyDecorations:Math.min(items.length,Math.floor(old.correct.length/3))};
  }
}
for(const friend of roster.friends){
  if(!friend||Array.isArray(friend.ownedOrnaments)) continue;
  const previousCount=Math.max(friend.legacyDecorations??Math.floor(friend.correct.length/3),
    formerDecorationMilestones.filter(goal=>friend.correct.length>=goal).length);
  friend.ownedOrnaments=ornamentPrices.map((_,i)=>i).filter(i=>i<Math.min(6,previousCount)||worn(friend).includes(i));
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
function picture(id,stage){
  return `pet-${id}-stage-${stage}.webp`;
}
function art(id,stage,pose="idle"){
  return `<div class="pet pet-${id} mature-pet pose-${pose} stage-${stage}" role="img" aria-label="${stageName(pets[id],stage)}"><img class="friend-image" src="${picture(id,stage)}" alt="">${pose==='reveal'?`<img class="friend-image before-evolution" src="${picture(id,stage-1)}" alt="">`:''}</div>`;
}
const intro = (label,title,desc='') => `<div class="intro"><span class="eyebrow">${label}</span><h1 tabindex="-1">${title}</h1>${desc?`<p>${desc}</p>`:''}</div>`;

const playthings = [
  ['🌰 솔방울 굴리기','🌰','사자가 굴러온 솔방울에 앞발을 톡 올렸어요!'],
  ['🔔 달빛 방울 흔들기','🔔','토끼가 방울 소리에 맞춰 통통 뛰어요!'],
  ['🍁 낙엽 날리기','🍁','여우가 날아오는 낙엽을 꼬리 곁으로 받아요!'],
];
let openSubject=null;
let playing=false, playAction=null, playSlot=null;

function render(focus=true) {
  const previousPet=page==='home'?root.querySelector('.grove-scene > .pet'):null;
  const pet = pets[state?.pet];
  const goal=goals[state?.stage]; const ready=state&&goal&&state.xp>=goal&&state.stageFed>0;
  let html;
  if (page==='choose') {
    const featured = pick ?? (state?.pet === 0 ? 1 : 0);
    const friend = pets[featured];
    const savedFriend=roster.friends[featured];
    const displayName=stageName(friend,savedFriend?.stage??0);
    html=`<section class="opening opening-${featured} ${savedFriend?.stage?"":"opening-baby"}" aria-label="첫 만남">
      <div class="opening-art"><div class="opening-forest" aria-hidden="true"></div><div class="opening-floor" aria-hidden="true"></div>${savedFriend?`${scenery(featured,savedFriend.equipped)}<div class="opening-friend opening-saved">${art(featured,savedFriend.stage)}</div>`:`<img class="opening-friend" src="${picture(featured,0)}" alt="" fetchpriority="high">`}</div>
      <div class="opening-shade" aria-hidden="true"></div><div class="opening-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="opening-copy">
        <p class="opening-kicker"><span aria-hidden="true">✦</span> 사자대장</p>
        <h1 tabindex="-1">숲속친구들<br>키우기</h1>
        <p class="opening-guide">${savedFriend?"어떤 친구와 함께할까요? 지금 모습 그대로 이어서 키워요.":"퀴즈를 풀어 먹이를 얻고, 친구와 함께 자라요."}</p>
      </div>
      <div class="opening-controls">
        <span class="opening-caption">${savedFriend?`진화 ${savedFriend.stage} / 5`:"나의 첫 친구"} <b>${displayName}</b></span>
        <div class="pet-list" role="group" aria-label="캐릭터 선택">${pets.map((p,i)=>`<button class="pet-option ${featured===i?'picked':''}" data-action="pet:${i}" aria-pressed="${featured===i}" ${reset&&i===state.pet?'disabled':''}><span class="choice-icon" aria-hidden="true"><img src="${picture(i,roster.friends[i]?.stage??0)}" alt=""></span><strong>${p.name}</strong>${reset&&roster.friends[i]?`<small class="friend-progress">진화 ${roster.friends[i].stage}/5</small>`:''}</button>`).join('')}</div>
        <div class="actions">${button(reset?(savedFriend?displayName+' 이어 키우기':'새 친구 키우기'):`아기 ${friend.name}와 시작하기 <span aria-hidden="true">→</span>`,'start','primary',pick===null)}${reset?button('돌아가기','cancel','text-button'):''}</div>
      </div>
    </section>`;
  } else if(page==='home'){
    const xp=Math.min(state.xp,goal??0);
    const play=playing;
    const [toy,icon,reaction]=playthings[state.pet];
    html=`<div class="home-grid"><section class="home-grove"><div class="stage-top"><span class="tag">진화 ${state.stage} / 5</span><span class="tag food">${foodArt(state.pet)} 먹이 ${state.food}개</span></div><div class="reveal-stage grove-scene ${motion?'fed':''} ${playAction?`friend-play friend-${state.pet} play-${playAction}`:''}"><div class="habitat habitat-${state.pet}" aria-hidden="true"></div>${scenery(state.pet,state.equipped,play,playSlot)}${art(state.pet,state.stage,motion?'feeding':'idle')}${playAction&&playAction!=='ornament'?`<span class="play-prop" aria-hidden="true">${playAction==='snack'?foodArt(state.pet):toyArt(state.pet)}</span>`:''}${motion?`<span class="meal-fx" aria-hidden="true">${foodArt(state.pet)}</span>`:''}</div><div class="speech" role="status">${playAction==='snack'?'냠냠! 간식을 먹고 기분이 좋아졌어요!':playAction==='toy'?reaction:playAction==='ornament'?ornamentReaction(state.pet,playSlot):motion?'냠냠! 맛있어요!':ready?'이제 진화할 수 있어요!':goal?'함께 쑥쑥 자라요!':'오늘도 숲을 지켜요!'}</div>${play?`<div class="play-controls" aria-label="친구와 놀기">${button(foodArt(state.pet)+' 간식 주기','play-snack','secondary')}${button(toyArt(state.pet)+toy.replace(/^[^ ]+ /,''),'play-toy','secondary')}${button('놀이 마치기','play-end','text-button')}</div>`:''}</section><section class="panel ${ready?'evolution-ready':''}">${intro('나의 친구',stageName(pet,state.stage))}
    ${goal?`<div class="xp"><div><strong>성장 경험치</strong><b>${xp} / ${goal}</b></div><progress value="${xp}" max="${goal}" aria-label="성장 경험치"></progress></div>`:'<div class="done">✦ 다섯 번의 진화 완료</div>'}
    <p>${ready?'진화할 준비가 됐어요!':!goal?'퀴즈와 꾸미기를 계속 즐겨요.':xp===goal?'이번 단계에서 먹이를 한 번 주면 진화할 수 있어요.':state.food?'먹이를 주면 경험치가 올라요.':'단원 문제를 모두 맞히면 먹이를 받아요.'}</p>
    <div class="actions">${ready?button('진화하기','evolve'):''}${state.food&&!ready?button('먹이 주기','feed'):''}${!play?button('친구와 놀기','play-start'):''}${button('문제 풀러 가기','subjects',ready||state.food?'secondary':'primary')}<div class="care-links">${button('<span class="care-menu-art shop-menu-art" aria-hidden="true"><img src="./ornaments/royal-chest.webp" alt=""></span><span>장식 상점<small>숲을 꾸밀 보물 찾기</small></span><b aria-hidden="true">›</b>','wardrobe','care-menu shop-menu')}${button('<span class="care-menu-art friends-menu-art" aria-hidden="true">'+pets.map((_,i)=>`<img src="${picture(i,roster.friends[i]?.stage??0)}" alt="">`).join('')+'</span><span>다른 친구 선택<small>사자 · 토끼 · 여우 만나기</small></span><b aria-hidden="true">›</b>','choose-new','care-menu friends-menu')}</div></div></section></div>`;
  } else if(page==='wardrobe'){
    const owned=state.ownedOrnaments, wearing=worn(state);
    html=`<section class="panel wardrobe">${intro('장식 상점',themeName[state.pet],'모은 먹이로 장식을 사고, 산 장식은 숲에 놓거나 거둘 수 있어요. 같은 자리의 장식은 서로 바꿔 놓을 수 있어요.')}
    <div class="reveal-stage grove-scene"><div class="habitat habitat-${state.pet}" aria-hidden="true"></div>${scenery(state.pet,state.equipped)}${art(state.pet,state.stage,'idle')}</div>
    <p class="wardrobe-progress" role="status">${foodArt(state.pet)} 보유 먹이 ${state.food}개<br><small>보유 장식 ${owned.length} / ${items.length} · 배치 ${wearing.length}개</small></p>
    <div class="wardrobe-items gear-${state.pet}">${sets[state.pet].map((name,i)=>{
      const purchased=owned.includes(i), equipped=wearing.includes(i), price=ornamentPrices[i];
      return `<button class="option ${equipped?'picked':''}" data-action="${purchased?'equip':'buy-ornament'}:${i}" ${purchased?`aria-pressed="${equipped}"`:state.food<price?'disabled':''}><span class="gear-thumb">${glyph(state.pet,i)}</span><span class="gear-label">${name}<small>${purchased?(equipped?'숲에 놓음':'숲에 놓기'):`먹이 ${price}개 · ${state.food<price?'부족':'구매'}`}</small></span></button>`;
    }).join('')}</div>
    <div class="actions">${owned.some(id=>!wearing.some(placed=>positionFor(placed)===positionFor(id)))?button('빈자리에 장식 놓기','equip-all','secondary'):''}${wearing.length?button('장식 모두 거두기','unequip','text-button'):''}${button('육성 화면으로','home')}</div></section>`;
  } else if (page==='subjects') {
    const groups=[...new Set(subjects.map(unit=>unit.name))];
    html=intro('쉬는 시간 퀴즈','어떤 단원을 풀까요?','단원을 마치면 먹이가 자동으로 쌓여요.')+
      `<div class="quiz-companion">${art(state.pet,state.stage,'idle')}<p>과목을 펼쳐 단원을 골라요.</p></div>
      <div class="subject-list">${groups.map(name=>{
        const units=subjects.map((unit,index)=>({unit,index})).filter(({unit})=>unit.name===name);
        const unfinished=units.filter(({index})=>!state.rewarded.includes(index));
        const completed=units.filter(({index})=>state.rewarded.includes(index));
        function cards(entries,review){
          return entries.map(({unit,index})=>{
            const solved=unit.questions.filter((_,j)=>state.correct.includes(`${index}:${j}`)).length;
            return `<button class="subject" data-action="subject:${index}"><span><strong>${unit.unit}</strong><small>${review?'복습':`${solved} / ${unit.questions.length}문제`}</small></span><span aria-hidden="true">›</span></button>`;
          }).join('');
        }
        return `<details class="unit-group" ${openSubject===name?'open':''}><summary>${units[0].unit.icon} ${name} · 미완료 ${unfinished.length}</summary>
          <div class="unit-options">${cards(unfinished,false)}${completed.length?`<p>완료한 단원 · 복습</p>${cards(completed,true)}`:''}</div></details>`;
      }).join('')}</div><div class="actions">${button('육성 화면으로','home','secondary')}</div>`;
  } else if (page==='quiz') {
    const unit=subjects[subject];
    const pendingUnits=subjects.map((candidate,index)=>candidate.name===unit.name&&index!==subject&&!state.rewarded.includes(index)?index:-1).filter(index=>index>=0);
    const nextUnit=pendingUnits.find(index=>index>subject)??pendingUnits[0]??-1;
    const [prompt,options,,,explanation] = questionsFor(subject,state.pet)[question]; const last=question===unit.questions.length-1;
    const wrong=feedback?.type==='wrong', right=feedback?.type==='right';
    html=`<section class="quiz panel ${right?(feedback.reward?"reward-scene":"correct-scene"):""}"><div class="quiz-meta"><span class="tag">${unit.name} · ${unit.unit}</span><b>${question+1} / ${unit.questions.length}</b></div><div class="quiz-companion ${right?"cheer":""}">${art(state.pet,state.stage,wrong?"sad":"idle")}<p>${wrong?"천천히 다시 해 봐요.":right?(feedback.reward?"우와, 먹이를 찾았어요!":"해냈어요!"):"같이 풀어 봐요!"}</p></div>${intro('보기 중 하나를 골라요',prompt)}<div class="options" role="group" aria-label="답 보기">${options.map((value,i)=>`<button type="button" class="option ${selected===i?'picked':''}" data-action="option:${i}" aria-pressed="${selected===i}" ${feedback?'disabled':''}><span>${i+1}</span>${value}</button>`).join('')}</div>${wrong?`<div class="notice wrong" role="status"><div class="sad-pet" role="img" aria-label="아쉬워하는 ${pet.name}">${art(state.pet,state.stage,"sad")}<span aria-hidden="true">💧</span></div><div><strong>아쉬워요. 다시 풀어 볼까요?</strong>${feedback.hint?`<p>${feedback.hint}</p>`:''}</div></div>`:''}${right?`<div class="notice right ${feedback.reward?"reward-notice":"correct-notice"}" role="status"><span class="reward-icon" aria-hidden="true">${feedback.reward?foodArt(state.pet):'✓'}</span><span class="reward-rays" aria-hidden="true"></span><div><strong>${feedback.reward?`단원 완료! ${pet.food} 1개를 모아뒀어요.`:'정답이에요!'}</strong>${feedback.points&&state.stage<goals.length?'<p>경험치 +5</p>':''}${explanation?`<p>${explanation}</p>`:''}</div></div>`:''}<div class="actions">${wrong?button('다시 풀기','retry'):right?button(last?(nextUnit<0?'단원 고르기':'다음 단원 풀기'):'다음 문제',last?(nextUnit<0?'subjects':`subject:${nextUnit}`):'next'):button('정답 확인','check','primary',selected===null)}${right&&last?(nextUnit<0?button('육성 화면으로','home','text-button'):button('단원 고르기','subjects','text-button')):button('과목 고르기','subjects','text-button')}</div></section>`;
  } else {
    html=`<section class="result panel reveal-pet-${state.pet} reveal-level-${state.stage} ${motion?'transform':''}">${intro(`${state.stage}번째 진화 성공`,stageName(pet,state.stage),formNotes[state.pet][state.stage-1])}<div class="reveal-stage"><div class="habitat habitat-${state.pet}" aria-hidden="true"></div><div class="evolution-halo" aria-hidden="true"></div>${scenery(state.pet,state.equipped)}${art(state.pet,state.stage,"reveal")}</div><div class="actions">${button('새로운 모습 보기','home')}</div></section>`;
  }
  document.body.classList.toggle("opening-page",page==="choose");
  document.body.classList.toggle("quiz-page",page==="quiz"||page==="subjects");
  document.body.classList.toggle("care-page",page==="home"||page==="wardrobe"||page==="result");
  root.innerHTML=html+(storageError?'<p class="storage" role="status">이 브라우저에서 진행을 저장할 수 없어요. 화면을 닫기 전까지 플레이할 수 있어요.</p>':'');
  if(page==='home'){
    const nextPet=root.querySelector('.grove-scene > .pet');
    if(nextPet&&previousPet?.matches?.(`.pet-${state.pet}.stage-${state.stage}`)){
      previousPet.className=nextPet.className;nextPet.replaceWith(previousPet);
    }
    void warmFriend(state.pet,state.stage,root.querySelector('.grove-scene'));
  }
  root.inert=false;
  if(focus) root.querySelector('h1')?.focus();
}

root.addEventListener('click', event => {
  const control=event.target.closest('button[data-action]');
  if(!control || control.disabled) return;
  const [action,value]=control.dataset.action.split(':');
  clearTimeout(feedTimer);
  motion=false;
  playAction=null;
  playSlot=null;
  const isPlay=action.startsWith('play-');
  if(!isPlay) playing=false;
  switch(action) {
    case 'play-start':
    case 'play-end':
    case 'play-ornament':
    case 'play-snack':
    case 'play-toy':
      if(page!=='home') return;
      if(action==='play-start') playing=true;
      else if(action==='play-end') playing=false;
      else if(playing&&action==='play-ornament'){
        const slot=Number(value);
        if(!worn(state).includes(slot)) return;
        playSlot=slot;
        playAction='ornament';
      } else if(playing) playAction=action==='play-snack'?'snack':'toy';
      break;
    case 'pet': pick=Number(value); render(false); root.querySelector(`[data-action="pet:${pick}"]`)?.focus(); return;
    case 'start':
      if(pick===null || (reset && state.pet===pick)) return;
      state=roster.friends[pick]??fresh(pick); roster.friends[pick]=state; roster.active=pick; reset=false; page='home'; save(); break;
    case 'home': state.active=null; page='home'; save(); break;
    case 'subjects': openSubject=page==='quiz'?subjects[subject].name:null; state.active=null; page='subjects'; save(); break;
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
      const id=`${subject}:${question}`, [, ,answer,hint]=questionsFor(subject,state.pet)[question];
      if(selected!==answer) {
        feedback={type:'wrong',hint:state.hinted.includes(id)?null:hint};
        if(feedback.hint) state.hinted.push(id);
      } else {
        const points=!state.correct.includes(id);
        if(points){state.correct.push(id); if(state.stage<goals.length) state.xp+=5;}
        const reward=!state.rewarded.includes(subject)&&subjects[subject].questions.every((_,i)=>state.correct.includes(`${subject}:${i}`));
        if(reward) { state.rewarded.push(subject); state.food++; }
        feedback={type:'right',points,reward};
        state.active=question<subjects[subject].questions.length-1?{subject,question:question+1}:null;
      }
      playQuizSound(feedback.type);
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
    case 'buy-ornament': {
      const id=Number(value), price=ornamentPrices[id];
      if(page!=='wardrobe'||!price||state.ownedOrnaments.includes(id)||state.food<price) return;
      state.food-=price;
      state.ownedOrnaments.push(id);
      save(); break;
    }
    case 'equip': {
      const id=Number(value), current=worn(state);
      if(page!=='wardrobe'||!state.ownedOrnaments.includes(id)) return;
      state.equipped=current.includes(id)?current.filter(i=>i!==id):[...current.filter(placed=>positionFor(placed)!==positionFor(id)),id].sort((a,b)=>a-b);
      save(); break;
    }
    case 'equip-all': {
      if(page!=='wardrobe') return;
      const slots=new Map(worn(state).map(id=>[positionFor(id),id]));
      for(const id of state.ownedOrnaments) if(!slots.has(positionFor(id))) slots.set(positionFor(id),id);
      state.equipped=[...slots.values()];
      save(); break;
    }
    case 'unequip': if(page!=='wardrobe') return; state.equipped=[]; save(); break;
    case 'choose-new': reset=true; pick=state.pet===0?1:0; page='choose'; break;
    case 'cancel': reset=false; pick=null; page='home'; break;
    default: return;
  }
  const editingDecoration=['buy-ornament','equip','equip-all','unequip'].includes(action);
  render(!editingDecoration&&!isPlay);
  if(action==='play-start') root.querySelector('.grove-scene')?.classList.add('show-ornament-hints');
  if(isPlay){
    const target=action==='play-start'?'play-snack':action==='play-end'?'play-start':control.dataset.action;
    root.querySelector(`[data-action="${target}"]`)?.focus({preventScroll:true});
    if(action==='play-start'||action==='play-end') root.querySelector(`[data-action="${target}"]`)?.scrollIntoView({block:'nearest'});
    if(playAction) void animateFriend(root.querySelector('.grove-scene'),state.pet,playAction,playSlot);
  }
  if(editingDecoration) (root.querySelector(`[data-action="${action==='buy-ornament'?`equip:${value}`:control.dataset.action}"]`)??root.querySelector('.wardrobe-items button:not(:disabled)'))?.focus({preventScroll:true});
  if(action==='feed') {
    void animateFriend(root.querySelector('.grove-scene'),state.pet,'snack');
    feedTimer=setTimeout(()=>{
      const focused=document.activeElement?.dataset.action;
      motion=false; render(false);
      if(focused) root.querySelector(`[data-action="${focused}"]`)?.focus({preventScroll:true});
    },3550);
  }
  if(action==='check') root.querySelector('.actions button')?.focus();
  if(action==='retry') root.querySelector('.option')?.focus();
});
render(false);

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
  const video=intro.querySelector('.intro-video');
  const sound=intro.querySelector('.intro-sound');
  const audio=new Audio('./forest-opening.m4a');
  audio.preload='auto';
  sound.addEventListener('click',()=>{
    if(!audio.paused){
      audio.pause();
      sound.textContent='🔊 소리 켜기';
      return;
    }
    audio.currentTime=video.currentTime;
    audio.play().then(()=>{
      if(intro.open&&!video.paused) sound.textContent='🔇 소리 끄기';
      else audio.pause();
    }).catch(()=>{});
  });
  video.addEventListener('pause',()=>{
    audio.pause();
    sound.textContent='🔊 소리 켜기';
  });
  video.addEventListener('waiting',()=>audio.pause());
  video.addEventListener('playing',()=>{
    if(sound.textContent==='🔇 소리 끄기'){
      audio.currentTime=video.currentTime;
      audio.play().catch(()=>{sound.textContent='🔊 소리 켜기'});
    }
  });
  let touchStart=null, wheelAt=-Infinity;
  function bounce(delta){
    if(!delta||!intro.classList.contains('intro-video-playing')||video.classList.contains('intro-bounce'))return;
    video.style.setProperty('--intro-push',delta>0?'10px':'-10px');
    video.classList.add('intro-bounce');
  }
  video.addEventListener('animationend',()=>video.classList.remove('intro-bounce'));
  intro.addEventListener('touchstart',event=>{
    touchStart=event.touches.length===1?event.touches[0].clientY:null;
  },{passive:true});
  intro.addEventListener('touchmove',event=>{
    if(touchStart===null||event.touches.length!==1)return;
    const delta=event.touches[0].clientY-touchStart;
    if(Math.abs(delta)<14)return;
    touchStart=null;
    bounce(delta);
  },{passive:true});
  intro.addEventListener('wheel',event=>{
    event.preventDefault();
    const now=performance.now();
    if(now-wheelAt>180)bounce(-event.deltaY);
    wheelAt=now;
  },{passive:false});

  function playFallback(){
    clearTimeout(timer);
    if(!intro.open||intro.classList.contains('intro-playing'))return;
    video.pause();
    sound.hidden=true;
    intro.classList.remove('intro-video-playing');
    for(const img of intro.querySelectorAll('img[data-src]')) img.src=img.dataset.src;
    intro.classList.add('intro-playing');
    timer=setTimeout(finish,5000);
  }
  intro.addEventListener('close',()=>{clearTimeout(timer);video.pause()},{once:true});
  video.addEventListener('ended',finish,{once:true});
  video.addEventListener('error',playFallback,{once:true});
  video.addEventListener('playing',()=>{
    if(!intro.open||intro.classList.contains('intro-playing'))return;
    clearTimeout(timer);
    intro.classList.add('intro-video-playing');
    sound.hidden=false;
    timer=setTimeout(finish,11000);
  },{once:true});
  intro.showModal();
  video.src='./forest-opening.mp4';
  timer=setTimeout(playFallback,2200);
  video.play().catch(playFallback);
}

if(typeof window!=='undefined')playOpening();


