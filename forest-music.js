// A bright woodland dance with a lilting 6/8 pulse.
const button = document.querySelector('.forest-music');
const chords = [
  [48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [40, 59, 64, 67],
  [41, 60, 65, 69], [48, 60, 64, 67], [43, 59, 62, 67], [48, 60, 64, 67],
  [41, 60, 65, 69], [48, 60, 64, 67], [45, 60, 64, 69], [43, 59, 62, 67],
  [41, 60, 65, 69], [50, 62, 65, 69], [43, 59, 62, 67], [48, 60, 64, 67],
];
const melody = [
  [76, 79, 81, 79], [74, 76, 74, 71], [72, 76, 81, 84], [83, 79, 76, 74],
  [77, 81, 79, 77], [76, 72, 76, 79], [74, 79, 77, 74], [72, 76, 79, 76],
  [81, 84, 86, 84], [79, 76, 79, 81], [84, 81, 76, 72], [74, 79, 83, 79],
  [81, 77, 76, 77], [74, 77, 81, 77], [79, 77, 74, 71], [72, 76, 79, 72],
];
const pulse = 60 / (96 * 3);
let context;
let output;
let timer;
let bar = 0;
let nextBar;

function note(pitch, start, length, volume, waveform, attack, release, detune = 0) {
  const voice = context.createOscillator();
  const envelope = context.createGain();
  voice.type = waveform;
  voice.frequency.value = 440 * 2 ** ((pitch - 69) / 12);
  voice.detune.value = detune;
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(volume, start + attack);
  envelope.gain.exponentialRampToValueAtTime(Math.max(.0001, volume * .58), start + length);
  envelope.gain.exponentialRampToValueAtTime(.0001, start + length + release);
  voice.connect(envelope).connect(output);
  voice.start(start);
  voice.stop(start + length + release + .02);
}

function schedule() {
  while (nextBar < context.currentTime + .25) {
    const [bass, root, third, fifth] = chords[bar];
    note(bass, nextBar, pulse * 1.6, .048, 'sine', .025, .22);
    note(bass + 12, nextBar + pulse * 3, pulse * 1.35, .031, 'triangle', .018, .14);
    [root, fifth, third, fifth, third + 12].forEach((pitch, index) => {
      note(pitch, nextBar + (index + 1) * pulse, pulse * .8, .020, 'triangle', .012, .15);
    });
    const rhythm = bar % 2 === 0 ? [0, 1, 3, 4] : [0, 2, 3, 5];
    melody[bar].forEach((pitch, index) => {
      const start = nextBar + rhythm[index] * pulse;
      const length = ((rhythm[index + 1] ?? 6) - rhythm[index]) * pulse * .78;
      note(pitch, start, length, .061, 'sine', .012, .14);
      note(pitch + 12, start, .07, .012, 'sine', .009, .1);
    });
    nextBar += 6 * pulse;
    bar = (bar + 1) % chords.length;
  }
}

function showPlaying(playing) {
  button.setAttribute('aria-pressed', String(playing));
  button.querySelector('span:last-child').textContent = playing ? '음악 켜짐' : '음악 꺼짐';
}

const AudioEngine = window.AudioContext || window.webkitAudioContext;
if (AudioEngine) {
  button.hidden = false;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      if (timer !== undefined) {
        await context.suspend();
        clearInterval(timer);
        timer = undefined;
        showPlaying(false);
      } else {
        if (!context) {
          context = new AudioEngine();
          output = context.createGain();
          output.gain.value = .44;
          output.connect(context.destination);
          nextBar = .06;
        }
        await context.resume();
        nextBar = Math.max(nextBar, context.currentTime + .06);
        schedule();
        timer = setInterval(schedule, 100);
        showPlaying(true);
      }
    } catch {
      showPlaying(false);
    } finally {
      button.disabled = false;
    }
  });
}
