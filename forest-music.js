import {SAMPLE_RATE,BAR_SECONDS,LOOP_BARS,eventsForBar,synthesize,windChannel,roomImpulse} from './forest-composition.js';
const button=document.querySelector('.forest-music');
const AudioEngine=window.AudioContext||window.webkitAudioContext;
let context,master,music,nature,room,send;
let timer,bar=0,nextBar=0,wanted=false,pending=false;
const samples=new Map(),activeSources=new Set();
const MAX_SAMPLES=72;

function bufferFor(instrument,pitch,duration){
 const key=`${instrument}:${pitch}:${duration.toFixed(3)}`;
 if(samples.has(key))return samples.get(key);
 const data=synthesize(instrument,pitch,duration),buffer=context.createBuffer(1,data.length,SAMPLE_RATE);
 buffer.copyToChannel(data,0);
 if(samples.size>=MAX_SAMPLES)samples.delete(samples.keys().next().value);
 samples.set(key,buffer);return buffer;
}
function createEngine(){
 context=new AudioEngine();master=context.createGain();master.gain.value=0;
 const compressor=context.createDynamicsCompressor();
 compressor.threshold.value=-16;compressor.knee.value=16;compressor.ratio.value=2;
 compressor.attack.value=.02;compressor.release.value=.3;
 master.connect(compressor).connect(context.destination);
 music=context.createGain();music.gain.value=.95;music.connect(master);
 nature=context.createGain();nature.gain.value=.045;nature.connect(master);
 room=context.createConvolver();
 const impulse=context.createBuffer(2,Math.ceil(SAMPLE_RATE*2.6),SAMPLE_RATE);
 for(let c=0;c<2;c++)impulse.copyToChannel(roomImpulse(c),c);
 room.buffer=impulse;send=context.createGain();send.gain.value=.28;
 music.connect(send).connect(room).connect(master);
 const breeze=context.createBufferSource(),left=windChannel(0),right=windChannel(1);
 const wind=context.createBuffer(2,left.length,SAMPLE_RATE);
 wind.copyToChannel(left,0);wind.copyToChannel(right,1);
 breeze.buffer=wind;breeze.loop=true;breeze.connect(nature);breeze.start();
 nextBar=context.currentTime+.12;
}
function play(event,start){
 const source=context.createBufferSource();source.buffer=bufferFor(event.instrument,event.pitch,event.duration);
 const gain=context.createGain();gain.gain.value=event.gain;source.connect(gain);let panner;
 if(typeof context.createStereoPanner==='function'){
  panner=context.createStereoPanner();panner.pan.value=event.pan;gain.connect(panner).connect(music);
 }else gain.connect(music);
 activeSources.add(source);
 source.onended=()=>{activeSources.delete(source);source.disconnect();gain.disconnect();panner?.disconnect()};
 source.start(start+event.offset);
}
function schedule(){
 if(!wanted||document.hidden||context.state!=='running')return;
 // Skip missed bars rather than playing a burst of notes after tab throttling.
 if(nextBar<context.currentTime-.05){
  const skipped=Math.ceil((context.currentTime-nextBar+.12)/BAR_SECONDS);
  bar=(bar+skipped)%LOOP_BARS;nextBar+=skipped*BAR_SECONDS;
 }
 while(nextBar<context.currentTime+.22){
  for(const event of eventsForBar(bar))play(event,nextBar);
  bar=(bar+1)%LOOP_BARS;nextBar+=BAR_SECONDS;
 }
}
function sceneVolume(){
 if(!context)return;
 const quiz=document.body.classList.contains('quiz-page');
 music.gain.setTargetAtTime(quiz?.5:.95,context.currentTime,.45);
 nature.gain.setTargetAtTime(quiz?.025:.045,context.currentTime,.45);
}
function show(){
 button.setAttribute('aria-pressed',String(wanted));
 button.setAttribute('aria-label',wanted?'숲 배경 음악 끄기':'숲 배경 음악 켜기');
 button.querySelector('span:last-child').textContent=wanted?'음악 켜짐':'음악 꺼짐';
 button.disabled=pending;
}
function clearScheduler(){if(timer!==undefined)clearInterval(timer);timer=undefined}
async function setPlaying(value){
 if(pending)return;
 pending=true;show();
 try{
  wanted=value;
  if(value){
   if(!context)createEngine();
   if(!document.hidden){
    await context.resume();
    if(document.hidden){await context.suspend();return}
    sceneVolume();master.gain.setTargetAtTime(.85,context.currentTime,.35);
    schedule();clearScheduler();timer=setInterval(schedule,100);
   }
  }else if(context){
   clearScheduler();master.gain.setTargetAtTime(0,context.currentTime,.045);
   await new Promise(resolve=>setTimeout(resolve,220));await context.suspend();
  }
 }catch{
  wanted=false;clearScheduler();
  if(master&&context)master.gain.setValueAtTime(0,context.currentTime);
  if(context)try{await context.suspend()}catch{}
 }finally{pending=false;show()}
}
if(AudioEngine&&button){
 button.hidden=false;show();
 button.title='숲의 아침 · 하프와 플루트 계열 음색, 바람과 새소리';
 button.addEventListener('click',()=>void setPlaying(!wanted));
 new MutationObserver(sceneVolume).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{
  if(!context)return;
  if(document.hidden){clearScheduler();void context.suspend().catch(()=>{})}
  else if(wanted&&!pending){void setPlaying(true)}
 });
 window.addEventListener('pagehide',()=>{
  wanted=false;clearScheduler();if(master)master.gain.setValueAtTime(0,context.currentTime);
  if(context)void context.suspend().catch(()=>{});
 });
 window.addEventListener('pageshow',()=>show());
}
