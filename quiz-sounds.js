const AudioEngine = window.AudioContext || window.webkitAudioContext;
const chimes = {
  right: [659.25, 783.99, 1046.5],
  wrong: [392, 293.66],
};
let context;
let enabled=true;
try{enabled=localStorage.getItem('forest-quiz-sound')!=='off'}catch{}
const soundButton=document.querySelector('.forest-effects');
function showSoundSetting(){
  if(!soundButton) return;
  soundButton.hidden=false;
  soundButton.setAttribute('aria-pressed',String(enabled));
  soundButton.textContent=enabled?'효과음 켜짐':'효과음 꺼짐';
}
soundButton?.addEventListener('click',()=>{
  enabled=!enabled;
  try{localStorage.setItem('forest-quiz-sound',enabled?'on':'off')}catch{}
  showSoundSetting();
});
if(AudioEngine) showSoundSetting();

export async function playQuizSound(result) {
  if (!AudioEngine || !enabled) return;
  try {
    context ??= new AudioEngine();
    if (context.state !== 'running') await context.resume();
    const start = context.currentTime + .015;
    chimes[result].forEach((frequency, index) => {
      const at = start + index * .085;
      const tone = context.createOscillator();
      const envelope = context.createGain();
      tone.type = result === 'right' ? 'triangle' : 'sine';
      tone.frequency.value = frequency;
      envelope.gain.setValueAtTime(.0001, at);
      envelope.gain.exponentialRampToValueAtTime(.085, at + .018);
      envelope.gain.exponentialRampToValueAtTime(.0001, at + .18);
      tone.connect(envelope).connect(context.destination);
      tone.start(at);
      tone.stop(at + .19);
    });
  } catch {
    // An unavailable audio device must not interrupt grading.
  }
}

