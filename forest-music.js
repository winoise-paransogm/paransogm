// A 16-bar orchestral loop in D major, played only after an explicit tap.
const button = document.querySelector('.forest-music');
const chords = [
  [38, 57, 62, 66], [33, 57, 61, 64], [35, 54, 59, 62], [31, 55, 59, 62],
  [30, 57, 62, 66], [31, 55, 59, 67], [28, 55, 59, 64], [33, 57, 61, 67],
  [38, 57, 62, 66], [37, 57, 61, 64], [35, 54, 59, 62], [31, 55, 59, 67],
  [28, 55, 59, 64], [31, 55, 59, 66], [33, 57, 62, 64], [33, 57, 61, 67],
];
const melody = [
  [69, 74, 76, 78], [76, 73, 69], [71, 74, 78], [76, 74, 71],
  [69, 74, 78, 81], [79, 78, 74], [76, 71, 67], [69, 73, 76],
  [78, 81, 83, 86], [85, 81, 76], [78, 81, 83], [86, 83, 79],
  [76, 79, 83], [81, 79, 78], [76, 74, 69], [73, 76, 69],
];
const beat = 60 / 72;
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
    const [bass, ...strings] = chords[bar];
    const swell = bar >= 8 && bar < 12 ? 1.22 : 1;
    note(bass, nextBar, 3.9 * beat, .058 * swell, 'sine', .5, .8);
    strings.forEach((pitch, index) => {
      note(pitch, nextBar, 3.9 * beat, .025 * swell, 'triangle', .7, .85, index * 2 - 2);
      note(pitch + 12, nextBar, 3.8 * beat, .009 * swell, 'sine', .9, .85, 3);
    });
    for (const [index, pitch] of [strings[0], strings[2], strings[1], strings[2] + 12].entries()) {
      note(pitch, nextBar + index * beat, .32, .018, 'triangle', .025, .72);
    }
    melody[bar].forEach((pitch, index, phrase) => {
      const offset = (phrase.length === 3 ? [0, 1.5, 2.5] : [0, 1, 2, 3])[index];
      const length = (index === phrase.length - 1 ? 3.88 - offset : .86) * beat;
      note(pitch, nextBar + offset * beat, length, .045, 'sine', .14, .46);
      note(pitch + 12, nextBar + offset * beat, length, .006, 'sine', .16, .4);
    });
    nextBar += 4 * beat;
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
