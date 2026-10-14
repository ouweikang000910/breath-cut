import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, PRESETS, keptRanges, removedDuration, editedTime, cutPCM, videoFilter } from '../src/audio.mjs';

function speechWithPauses() {
  const rate = 1000, duration = 5;
  const samples = new Float32Array(rate * duration);
  for (let i = 0; i < samples.length; i++) {
    if ((i >= 500 && i < 1500) || (i >= 2500 && i < 4200)) samples[i] = Math.sin(i * 0.4) * 0.3;
  }
  return analyze(samples, duration, PRESETS.balanced, rate);
}

test('identifies leading, middle and trailing pauses while protecting speech edges', () => {
  const { cuts } = speechWithPauses();
  assert.equal(cuts.length, 3);
  assert.deepEqual(cuts.map(({ start, end }) => [start, end]), [[0, 0.4], [1.6, 2.4], [4.3, 5]]);
  assert.ok(Math.abs(removedDuration(cuts) - 1.9) < 0.001);
});
test('completely silent inputs preserve the original instead of removing everything', () => {
  const { cuts, hasSpeech } = analyze(new Float32Array(32000), 2, PRESETS.tight);
  assert.deepEqual(cuts, []); assert.equal(hasSpeech, false);
});
test('short pauses survive the minimum pause threshold', () => {
  const samples = new Float32Array(3000).fill(0.2);
  samples.fill(0, 1000, 1200);
  assert.equal(analyze(samples, 3, PRESETS.balanced, 1000).cuts.length, 0);
});
test('manual keep decisions are respected in playback, metrics and export ranges', () => {
  const { cuts } = speechWithPauses(); cuts[1].selected = false;
  assert.deepEqual(keptRanges(cuts, 5), [{ start: 0.4, end: 4.3 }]);
  assert.ok(Math.abs(editedTime(3, cuts) - 2.6) < 0.001);
  assert.ok(Math.abs(removedDuration(cuts) - 1.1) < 0.001);
});
test('PCM cutting preserves stereo alignment and exact sample length over many cuts', () => {
  const rate = 1000, duration = 100, channels = 2;
  const samples = new Int16Array(rate * duration * channels);
  for (let frame = 0; frame < rate * duration; frame++) { samples[frame * 2] = 10000; samples[frame * 2 + 1] = -10000; }
  const cuts = Array.from({ length: 99 }, (_, i) => ({ start: i + 0.413, end: i + 0.617, selected: true }));
  const output = cutPCM(new Uint8Array(samples.buffer), cuts, duration, rate, channels);
  assert.equal(output.byteLength, (100000 - 99 * 204) * 4);
  const pcm = new Int16Array(output.buffer);
  for (let i = 0; i < pcm.length; i += 2) assert.ok(Math.abs(pcm[i] + pcm[i + 1]) <= 1);
});
test('video filter preserves timestamps and uses only selected cuts', () => {
  const cuts = [{ start: 1.4, end: 2.8, selected: true }, { start: 4, end: 5, selected: false }];
  const filter = videoFilter(cuts, '720');
  assert.ok(filter.includes('gte(t,1.400)*lt(t,2.800)'));
  assert.ok(filter.includes('1.400*gte(PTS*TB,2.800)'));
  assert.ok(!filter.includes('5.000'));
  assert.ok(filter.includes('min(1280,iw)'));
});
