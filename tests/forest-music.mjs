import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as score from '../forest-composition.js';
const checks=[];
async function test(name,fn){await fn();checks.push(name)}
await test('64-bar score is longer than 100 seconds with four different phrases',()=>{
 assert.equal(score.LOOP_BARS,64);assert.ok(score.BAR_SECONDS*64>100);
 const signatures=[0,16,32,48].map(i=>JSON.stringify(Array.from({length:16},(_,j)=>score.eventsForBar(i+j))));
 assert.equal(new Set(signatures).size,4);
 assert.deepEqual(score.eventsForBar(64),score.eventsForBar(0));
});
await test('all notes have finite bounded timings, gains and stereo positions',()=>{
 for(let i=0;i<64;i++)for(const e of score.eventsForBar(i)){
  assert.ok(e.offset>=0&&e.offset<score.BAR_SECONDS);assert.ok(e.duration>0&&e.duration<6);
  assert.ok(e.gain>0&&e.gain<=.12);assert.ok(Math.abs(e.pan)<=1);assert.ok(Number.isFinite(e.pitch));
 }
});
await test('all unique instrument samples are finite, below full scale and silent at both edges',()=>{
 const keys=new Set();let count=0;
 for(let i=0;i<64;i++)for(const e of score.eventsForBar(i)){
  const key=JSON.stringify([e.instrument,e.pitch,e.duration]);if(keys.has(key))continue;keys.add(key);
  const data=score.synthesize(e.instrument,e.pitch,e.duration);
  assert.equal(Math.abs(data[0]),0);assert.equal(Math.abs(data.at(-1)),0);let energy=0;
  for(const v of data){assert.ok(Number.isFinite(v)&&Math.abs(v)<1);energy+=v*v}
  assert.ok(energy>0);count++;
 }
 assert.ok(count<=72);
});
await test('wind and reverb use distinct stereo channels and smooth loop edges',()=>{
 const left=score.windChannel(0),right=score.windChannel(1);assert.equal(left.length,right.length);
 assert.notDeepEqual(left,right);assert.ok(Math.abs(left[0]-left.at(-1))<.025);
 for(const values of [left,right,score.roomImpulse(0),score.roomImpulse(1)])for(const v of values)assert.ok(Number.isFinite(v)&&Math.abs(v)<1);
});

function environment({failResume=false,stereo=true}={}){
 const listeners={},documentListeners={},windowListeners={},intervals=new Map(),sources=[],gains=[];let nextTimer=0,quiz=false;
 const param=()=>({value:0,setTargetAtTime(v){this.value=v},setValueAtTime(v){this.value=v}});
 const node=()=>({connect(target){return target},disconnect(){}});
 const button={hidden:true,disabled:false,attrs:{},label:{},setAttribute(k,v){this.attrs[k]=v},querySelector(){return this.label},addEventListener(k,fn){listeners[k]=fn}};
 class AudioContext{
  constructor(){this.currentTime=0;this.state='suspended';this.destination=node();if(!stereo)this.createStereoPanner=undefined;AudioContext.instance=this}
  createGain(){const n={...node(),gain:param()};gains.push(n);return n}
  createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()}}
  createBuffer(channels,length,rate){return {channels,length,sampleRate:rate,copyToChannel(){}}}
  createConvolver(){return node()}
  createBufferSource(){const n={...node(),start(at){this.started=at??0},stop(){}};sources.push(n);return n}
  createStereoPanner(){return {...node(),pan:param()}}
  async resume(){if(failResume)throw Error('audio unavailable');this.state='running'}
  async suspend(){this.state='suspended'}
 }
 const document={hidden:false,body:{classList:{contains:()=>quiz}},querySelector:()=>button,addEventListener:(k,fn)=>documentListeners[k]=fn};
 const window={AudioContext,addEventListener:(k,fn)=>windowListeners[k]=fn};
 let onScene;
 const sandbox={...score,document,window,MutationObserver:class{constructor(fn){onScene=fn}observe(){}},setInterval(fn){const id=++nextTimer;intervals.set(id,fn);return id},clearInterval(id){intervals.delete(id)},setTimeout:fn=>{fn();return 1}};
 vm.createContext(sandbox);
 vm.runInContext(fs.readFileSync(new URL('../forest-music.js',import.meta.url),'utf8').replace(/^import .*\n/,''),sandbox);
 return {button,sources,gains,intervals,listeners,document,documentListeners,windowListeners,get context(){return AudioContext.instance},async play(v){await vm.runInContext(`setPlaying(${v})`,sandbox)},scene(v){quiz=v;onScene()},tick(){for(const fn of intervals.values())fn()}};
}
await test('music requires user action, then fades in and pauses cleanly',async()=>{
 const e=environment();assert.equal(e.context,undefined);assert.equal(e.button.attrs['aria-pressed'],'false');
 await e.play(true);assert.equal(e.context.state,'running');assert.equal(e.intervals.size,1);assert.equal(e.button.attrs['aria-pressed'],'true');
 await e.play(false);assert.equal(e.context.state,'suspended');assert.equal(e.intervals.size,0);assert.equal(e.button.disabled,false);
});
await test('quiz scene reduces music volume and home restores it',async()=>{
 const e=environment();await e.play(true);const home=e.gains[1].gain.value;e.scene(true);assert.ok(e.gains[1].gain.value<home);e.scene(false);assert.equal(e.gains[1].gain.value,home);
});
await test('long scheduler gaps skip missed bars without a catch-up burst',async()=>{
 const e=environment();await e.play(true);const n=e.sources.length;e.context.currentTime=3600;e.tick();assert.ok(e.sources.length-n<12);
});
await test('background and page exit suspend audio and stop scheduling',async()=>{
 const e=environment();await e.play(true);e.document.hidden=true;e.documentListeners.visibilitychange();assert.equal(e.intervals.size,0);assert.equal(e.context.state,'suspended');
 e.document.hidden=false;await e.play(true);assert.equal(e.context.state,'running');e.windowListeners.pagehide();assert.equal(e.context.state,'suspended');assert.equal(e.intervals.size,0);
});
await test('audio errors reset the button; missing stereo panner has a mono fallback',async()=>{
 const bad=environment({failResume:true});await bad.play(true);assert.equal(bad.button.attrs['aria-pressed'],'false');assert.equal(bad.button.disabled,false);assert.equal(bad.intervals.size,0);
 const mono=environment({stereo:false});await mono.play(true);assert.equal(mono.context.state,'running');
});
console.log(JSON.stringify({passed:checks.length,checks,loopSeconds:score.BAR_SECONDS*64},null,2));
