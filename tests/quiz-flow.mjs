import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {pets,subjects,questionsFor} from '../content.js';

// Run the production renderer and delegated click handler with a minimal DOM.
// This checks state transitions; it does not substitute for a browser layout test.
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
function session(store=new Map(),failSave=false,browser=null){
 let handler;
 const root={innerHTML:'',querySelector:()=>null,addEventListener:(_,fn)=>handler=fn};
 const context={pets,subjects,questionsFor,playQuizSound:()=>{},warmFriend:()=>{},animateFriend:()=>{},ornamentReaction:()=>'',document:{querySelector:()=>root,body:{classList:{toggle:()=>{}}}},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>{if(failSave)throw Error('quota');store.set(k,v)}},clearTimeout,setTimeout};
 if(browser)context.window=browser;
 vm.createContext(context);vm.runInContext(source,context);
 return {root,store,click(action){handler({target:{closest:()=>({dataset:{action},disabled:false})}})},get roster(){return JSON.parse(store.get('lion-grow-v2'))},get state(){const r=this.roster;return r.friends[r.active]}};
}
const results=[];
function test(name,fn){fn();results.push(name)}
function start(){const s=session();s.click('start');return s}
function answer(s,unit,index){s.click('option:'+questionsFor(unit)[index][2]);s.click('check')}
function finish(s,unit){for(let i=0;i<3;i++){answer(s,unit,i);if(i<2)s.click('next')}}
function complete(){const s=start();s.click('subject:0');finish(s,0);return s}

test('90 units, 270 structurally valid questions, 30 units per subject',()=>{
 assert.equal(subjects.length,90);
 for(const name of ['통합과학','통합사회','한국사'])assert.equal(subjects.filter(u=>u.name===name).length,30);
 const prompts=new Set();
 for(let u=0;u<90;u++){
  assert.equal(questionsFor(u).length,3);
  for(const q of questionsFor(u)){
   assert.equal(q[1].length,4);assert.equal(new Set(q[1]).size,4);
   assert.ok(Number.isInteger(q[2])&&q[2]>=0&&q[2]<4);
   assert.ok(q[0]&&q[3]&&q[4]);assert.ok(!prompts.has(q[0]));prompts.add(q[0]);
  }
 }
 assert.equal(subjects[0].unit,'먹이 사슬');
 assert.equal(subjects[1].unit,'일상 속 기본권');
 assert.equal(subjects[2].unit,'세종과 한글');
 assert.equal(subjects[60].unit,'탐구 · 원소와 주기율');
});
test('hint persists on retry, repeat error and reload; second error offers concept',()=>{
 const s=start();s.click('subject:0');s.click('option:0');s.click('check');
 assert.ok(s.root.innerHTML.includes(subjects[0].questions[0][3]));
 s.click('retry');assert.ok(s.root.innerHTML.includes('힌트 다시 보기'));
 s.click('option:0');s.click('check');
 assert.ok(s.root.innerHTML.includes('핵심 개념 보기'));
 const r=session(s.store);assert.ok(r.root.innerHTML.includes('핵심 개념 보기'));
 assert.equal(r.state.attempts['0:0'],2);
});
test('selection survives reload',()=>{const s=start();s.click('subject:0');s.click('option:1');const r=session(s.store);assert.equal(r.state.active.selected,1);assert.ok(!r.root.innerHTML.includes('data-action="check" disabled'))});
test('correct explanation survives reload until next is clicked',()=>{const s=start();s.click('subject:0');answer(s,0,0);const r=session(s.store);assert.equal(r.state.active.question,0);assert.equal(r.state.active.feedback.type,'right');assert.ok(r.root.innerHTML.includes('정답이에요!'));r.click('next');assert.equal(r.state.active.question,1);assert.equal(r.state.active.feedback,null)});
test('double check and repeated reload never duplicate XP or food',()=>{const s=complete();const before={xp:s.state.xp,food:s.state.food};s.click('check');const r=session(s.store);r.click('check');assert.deepEqual({xp:r.state.xp,food:r.state.food},before)});
test('completion survives reload and always offers home and next unit',()=>{const s=complete();const r=session(s.store);assert.ok(r.root.innerHTML.includes('단원 완료!'));assert.ok(r.root.innerHTML.includes('data-action="home"'));assert.ok(r.root.innerHTML.includes('다음 단원 풀기'));r.click('home');assert.equal(r.state.active,null);assert.ok(session(r.store).root.innerHTML.includes('home-grid'))});
test('review grants one food per three unique answers, without repeat XP',()=>{const s=complete();s.click('review:0');answer(s,0,0);s.click('check');assert.equal(s.state.reviewProgress.length,1);const r=session(s.store);r.click('check');assert.equal(r.state.reviewProgress.length,1);r.click('next');answer(r,0,1);assert.equal(r.state.food,1);r.click('next');answer(r,0,2);assert.equal(r.state.food,2);assert.equal(r.state.xp,15);assert.equal(r.state.reviewProgress.length,0);r.click('review:0');finish(r,0);assert.equal(r.state.food,3)});
test('review progress carries between units and cannot duplicate a pending credit',()=>{const s=complete();s.click('review:0');answer(s,0,0);s.click('subjects');s.click('review:0');answer(s,0,0);assert.equal(s.state.reviewProgress.length,1);s.click('next');answer(s,0,1);s.click('next');answer(s,0,2);assert.equal(s.state.food,2)});
test('mistakes are retained for review and removed when reviewed correctly',()=>{const s=start();s.click('subject:0');s.click('option:0');s.click('check');s.click('retry');answer(s,0,0);assert.ok(s.state.reviewNeeded.includes('0:0'));s.click('subjects');assert.ok(s.root.innerHTML.includes('오답 1문제 복습'));s.click('review-wrong:0');assert.equal(s.state.active.queue.length,1);answer(s,0,0);assert.ok(!s.state.reviewNeeded.includes('0:0'));assert.equal(s.state.reviewProgress.length,1);assert.ok(s.root.innerHTML.includes('복습 완료!'))});
test('unfinished quiz can resume from unit list and home',()=>{const s=start();s.click('subject:0');s.click('option:1');s.click('subjects');assert.ok(s.root.innerHTML.includes('이어서 풀기'));s.click('home');assert.ok(s.root.innerHTML.includes('이어서 풀기'));s.click('resume');assert.equal(s.state.active.selected,1);assert.ok(s.root.innerHTML.includes('aria-pressed="true"'))});
test('old v2 progress, existing question IDs and ornaments migrate intact',()=>{
 const friend={pet:0,xp:40,food:8,fed:2,stage:1,stageFed:0,correct:['0:0','0:1','0:2'],hinted:['0:0'],rewarded:[0],active:{subject:3,question:1},equipped:[3,8],ownedOrnaments:[3,8]};
 const store=new Map([['lion-grow-v2',JSON.stringify({active:0,friends:[friend,null,null]})]]);
 const s=session(store);s.click('option:0');
 for(const k of ['xp','food','fed','stage','stageFed','correct','hinted','rewarded','equipped','ownedOrnaments'])assert.deepEqual(s.state[k],friend[k]);
 assert.equal(s.state.active.question,1);assert.equal(s.state.active.mode,'learn');assert.deepEqual(s.state.reviewNeeded,[]);
});
test('friend learning records and review rewards stay independent',()=>{const s=complete();s.click('home');s.click('choose-new');s.click('pet:1');s.click('start');assert.equal(s.state.food,0);s.click('subject:0');finish(s,0);assert.equal(s.state.food,1);assert.equal(s.roster.friends[0].food,1);assert.equal(s.roster.friends[0].correct.length,3)});
test('full curriculum yields 90 food and supports five evolutions plus all ornaments',()=>{
 const s=start();for(let u=0;u<90;u++){s.click('subject:'+u);finish(s,u)}
 assert.equal(s.state.food,90);assert.equal(s.state.xp,1350);assert.equal(s.state.correct.length,270);
 s.click('home');for(let i=0;i<5;i++){s.click('feed');s.click('evolve');s.click('home')}
 assert.equal(s.state.stage,5);assert.equal(s.state.food,85);
 s.click('wardrobe');for(let i=0;i<12;i++)s.click('buy-ornament:'+i);
 assert.equal(s.state.ownedOrnaments.length,12);assert.equal(s.state.food,23);
});
test('subject icons and reward instructions render correctly',()=>{const s=start();s.click('subjects');assert.ok(!s.root.innerHTML.includes('<summary>undefined'));assert.ok(s.root.innerHTML.includes('<summary>🌿'));assert.ok(s.root.innerHTML.includes('복습 정답 3개마다'))});
test('failed persistence warns user without breaking quiz',()=>{const s=session(new Map(),true);s.click('start');s.click('subject:0');answer(s,0,0);assert.ok(s.root.innerHTML.includes('진행을 저장할 수 없어요'));assert.ok(s.root.innerHTML.includes('정답이에요!'))});
test('browser history supports returning to the unfinished quiz',()=>{
 const events={},stack=[];
 const browser={history:{state:null,replaceState(v){this.state=v;stack[stack.length-1]=v},pushState(v){this.state=v;stack.push(v)}},addEventListener:(type,fn)=>events[type]=fn,matchMedia:()=>({matches:true})};
 const s=session(new Map(),false,browser);s.click('start');s.click('subjects');s.click('subject:0');s.click('option:1');s.click('subjects');events.popstate({state:{forestQuiz:true,page:'quiz'}});assert.ok(s.root.innerHTML.includes('data-action="check"'));assert.equal(s.state.active.selected,1);
});
test('effect mute persists and prevents audio creation independently of music',()=>{
 let click,created=0;const store=new Map([['forest-quiz-sound','off']]);
 const button={setAttribute(){},addEventListener:(_,fn)=>click=fn};
 const c={window:{AudioContext:function(){created++;throw Error('test audio')}},document:{querySelector:()=>button},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../quiz-sounds.js',import.meta.url),'utf8').replace('export async function','async function'),c);
 vm.runInContext("playQuizSound('right')",c);assert.equal(created,0);click();assert.equal(store.get('forest-quiz-sound'),'on');vm.runInContext("playQuizSound('right')",c);assert.equal(created,1);
});
console.log(JSON.stringify({passed:results.length,checks:results},null,2));
