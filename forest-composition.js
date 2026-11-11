// Original woodland score, synthesized without recordings or external samples.
export const SAMPLE_RATE=22050;
export const PULSE=60/(72*3);
export const BAR_SECONDS=PULSE*6;
export const LOOP_BARS=64;
const chords=[
 [50,57,61,66],[47,54,57,62],[43,50,54,59],[45,52,57,62],
 [50,57,64,66],[42,49,52,57],[43,50,57,59],[45,52,57,61],
];
// Four 16-bar phrases. Empty entries leave space for ambience.
const phrases=[
 [[74,3],[78,3],[76,6],[],[73,3],[74,3],[69,6],[],[71,3],[74,3],[78,4],[],[76,3],[73,3],[74,6],[]],
 [[78,3],[81,3],[83,4],[],[81,3],[78,3],[76,6],[],[74,3],[78,3],[76,4],[],[73,3],[71,3],[69,6],[]],
 [[71,4],[],[74,4],[],[73,4],[],[69,6],[],[66,3],[69,3],[71,4],[],[73,4],[],[74,6],[]],
 [[74,3],[78,3],[76,6],[],[73,3],[74,3],[81,6],[],[78,3],[76,3],[74,4],[],[73,3],[69,3],[74,6],[]],
];
export function eventsForBar(index){
 const bar=((index%LOOP_BARS)+LOOP_BARS)%LOOP_BARS;
 const section=Math.floor(bar/16),local=bar%16,chord=chords[Math.floor(local/2)],events=[];
 const push=(instrument,pitch,beat,duration,gain,pan=0)=>events.push({instrument,pitch,offset:beat*PULSE,duration,gain,pan});
 if(bar%2===0){
  chord.slice(1).forEach((pitch,i)=>push('pad',pitch,0,BAR_SECONDS*2,.055,[-.38,0,.38][i]));
  push('bass',chord[0]-12,0,BAR_SECONDS*2,.12);
 }
 const order=bar%2?[1,2,3,2]:[0,2,1,3];
 (section===2?[0,3]:[0,1.5,3,4.5]).forEach((beat,i)=>push('harp',chord[order[i]]+12,beat,2.6,section===2?.07:.105,(i%2?1:-1)*.3));
 const melody=phrases[section][local];
 if(melody.length)push('flute',melody[0],.2,Math.min(melody[1]*PULSE,BAR_SECONDS-.08),.105,.12);
 if(local===7||local===15)push('bell',chord[2]+24,3,2.8,.025,-.45);
 if(bar%8===3)push('bird',0,1.3,1.1,.014,bar%16<8?-.65:.65);
 return events;
}
function seeded(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296*2-1}}
const hz=p=>440*2**((p-69)/12);
export function synthesize(instrument,pitch,duration,rate=SAMPLE_RATE){
 const tail=instrument==='pad'?1.7:instrument==='flute'?.42:0;
 const length=Math.ceil((duration+tail)*rate),samples=new Float32Array(length);
 const noise=seeded(7103+pitch*31+instrument.length),frequency=hz(pitch);let breath=0;
 for(let i=0;i<length;i++){
  const t=i/rate;let value=0;
  if(instrument==='harp'){
   for(let h=1;h<=9;h++)value+=Math.sin(2*Math.PI*frequency*h*t+.08*h)*Math.exp(-t*(1.35+h*.47))/h**1.65;
   value*=Math.min(1,t/.008)*.58;
  }else if(instrument==='flute'){
   breath=breath*.72+noise()*.28;
   const attack=1-Math.exp(-t/.065),release=t>duration?Math.exp(-(t-duration)*12):1;
   const phase=2*Math.PI*frequency*t+.022*Math.sin(2*Math.PI*4.6*t)*Math.min(1,t/.3);
   value=(Math.sin(phase)+.13*Math.sin(phase*2)+.045*Math.sin(phase*3)+breath*.055)*attack*release*.48;
  }else if(instrument==='pad'){
   const envelope=Math.min(1,t/1.15)*(t>duration?Math.exp(-(t-duration)*3.2):1);
   value=(Math.sin(2*Math.PI*frequency*.9987*t)+Math.sin(2*Math.PI*frequency*1.0013*t)+.2*Math.sin(4*Math.PI*frequency*t))*envelope*.2;
  }else if(instrument==='bass'){
   value=(Math.sin(2*Math.PI*frequency*t)+.12*Math.sin(4*Math.PI*frequency*t))*(1-Math.exp(-t/.06))*Math.exp(-t*.65)*.5;
  }else if(instrument==='bell'){
   value=(Math.sin(2*Math.PI*frequency*t)*Math.exp(-t*2)+.18*Math.sin(2*Math.PI*frequency*2.756*t)*Math.exp(-t*4))*(1-Math.exp(-t/.004))*.38;
  }else if(instrument==='bird'){
   const chirp=t%.32,phrase=Math.floor(t/.32);
   const envelope=chirp<.17?Math.sin(Math.PI*chirp/.17)**2:0;
   const phase=2*Math.PI*(2150*chirp+820*.045*(1-Math.exp(-chirp/.045)))+phrase*.7;
   value=Math.sin(phase)*envelope*Math.exp(-t*.8)*.4;
  }
  const edge=Math.min(1,i/(rate*.006),(length-1-i)/(rate*.04));
  samples[i]=value*Math.max(0,edge);
 }
 return samples;
}
export function windChannel(channel,rate=SAMPLE_RATE){
 const data=new Float32Array(rate*8),noise=seeded(9182+channel*717);let low=0,soft=0;
 for(let i=0;i<data.length;i++){
  low=.985*low+.015*noise();soft=.7*soft+.3*noise();const t=i/rate;
  data[i]=(low*1.8+soft*.035)*(.6+.18*Math.sin(2*Math.PI*t/8)+.08*Math.sin(2*Math.PI*t/4+channel));
 }
 const overlap=rate;
 for(let i=0;i<overlap;i++){
  const mix=.5-.5*Math.cos(Math.PI*i/overlap);
  data[data.length-overlap+i]=data[data.length-overlap+i]*(1-mix)+data[i]*mix;
 }
 return data.subarray(overlap);
}
export function roomImpulse(channel,rate=SAMPLE_RATE){
 const data=new Float32Array(Math.ceil(rate*2.6)),noise=seeded(612+channel*491);let low=0;
 for(let i=0;i<data.length;i++){low=.64*low+.36*noise();data[i]=i<rate*.025?0:low*Math.exp(-i/rate*2.9)*.22}
 for(const [delay,gain]of [[.038,.22],[.073,.15],[.117,.1]])data[Math.floor((delay+channel*.003)*rate)]+=gain;
 return data;
}
