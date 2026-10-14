export const SAMPLE_RATE = 16000;
export const PRESETS = {
  gentle: { threshold: -42, minimum: 0.6, padding: 0.16 },
  balanced: { threshold: -36, minimum: 0.4, padding: 0.1 },
  tight: { threshold: -30, minimum: 0.28, padding: 0.07 },
};

export function analyze(samples, duration, settings, rate = SAMPLE_RATE) {
  const frame = Math.round(rate * 0.02);
  const envelope = [];
  const silences = [];
  let quietStart = null;
  const available = Math.min(duration, samples.length / rate);
  for (let offset = 0; offset < samples.length && offset / rate < available; offset += frame) {
    const end = Math.min(samples.length, offset + frame);
    let sum = 0;
    for (let i = offset; i < end; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / (end - offset));
    const db = 20 * Math.log10(Math.max(rms, 1e-7));
    const start = offset / rate;
    envelope.push({ time: start, rms, db });
    // A small hysteresis prevents noisy threshold crossings from fragmenting a pause.
    const quiet = db < settings.threshold + (quietStart === null ? 0 : 2);
    if (quiet && quietStart === null) quietStart = start;
    if (!quiet && quietStart !== null) {
      if (start - quietStart >= settings.minimum) silences.push({ start: quietStart, end: start });
      quietStart = null;
    }
  }
  if (quietStart !== null && available - quietStart >= settings.minimum) silences.push({ start: quietStart, end: available });
  // Completely silent inputs have no speech to preserve and should not become an empty file.
  const hasSpeech = envelope.some(item => item.db > settings.threshold + 4);
  const cuts = hasSpeech ? silences.map((silence, index) => ({
    id: index,
    start: Math.round((silence.start < 0.03 ? 0 : silence.start + settings.padding) * 1000) / 1000,
    end: Math.round((silence.end >= duration - 0.04 ? duration : silence.end - settings.padding) * 1000) / 1000,
    selected: true,
  })).filter(cut => cut.end - cut.start >= 0.06) : [];
  return { envelope, cuts, hasSpeech };
}

export function selectedCuts(cuts) { return cuts.filter(cut => cut.selected).sort((a, b) => a.start - b.start); }
export function removedDuration(cuts) { return selectedCuts(cuts).reduce((sum, cut) => sum + cut.end - cut.start, 0); }
export function keptRanges(cuts, duration) {
  let cursor = 0;
  const ranges = [];
  for (const cut of selectedCuts(cuts)) {
    const start = Math.max(cursor, Math.min(duration, cut.start));
    if (start > cursor) ranges.push({ start: cursor, end: start });
    cursor = Math.max(cursor, Math.min(duration, cut.end));
  }
  if (cursor < duration) ranges.push({ start: cursor, end: duration });
  return ranges;
}

export function editedTime(sourceTime, cuts) {
  return sourceTime - selectedCuts(cuts).reduce((total, cut) => total + Math.max(0, Math.min(sourceTime, cut.end) - cut.start), 0);
}

// PCM is cut on sample boundaries, so audio does not drift after many edits.
export function cutPCM(bytes, cuts, duration, sampleRate = 48000, channels = 2) {
  const source = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const sourceFrames = Math.floor(source.length / channels);
  const ranges = keptRanges(cuts, duration).map(range => ({
    start: Math.min(sourceFrames, Math.round(range.start * sampleRate)),
    end: Math.min(sourceFrames, Math.round(range.end * sampleRate)),
  }));
  const frames = ranges.reduce((sum, range) => sum + Math.max(0, range.end - range.start), 0);
  const result = new Int16Array(frames * channels);
  let offset = 0;
  const fadeFrames = Math.round(sampleRate * 0.004);
  for (const range of ranges) {
    const count = (range.end - range.start) * channels;
    result.set(source.subarray(range.start * channels, range.end * channels), offset);
    const fade = Math.min(fadeFrames, Math.floor((range.end - range.start) / 2));
    for (let frame = 0; frame < fade; frame++) {
      const gain = frame / fade;
      for (let channel = 0; channel < channels; channel++) {
        if (range.start > 0) result[offset + frame * channels + channel] *= gain;
        if (range.end < sourceFrames) result[offset + count - (frame + 1) * channels + channel] *= gain;
      }
    }
    offset += count;
  }
  return new Uint8Array(result.buffer);
}

export function videoFilter(cuts, quality = '1080') {
  const selected = selectedCuts(cuts);
  const filter = ['setpts=PTS-STARTPTS'];
  if (selected.length) {
    const remove = selected.map(cut => `gte(t,${cut.start.toFixed(3)})*lt(t,${cut.end.toFixed(3)})`).join('+');
    const elapsed = selected.map(cut => `${(cut.end - cut.start).toFixed(3)}*gte(PTS*TB,${cut.end.toFixed(3)})`).join('+');
    filter.push(`select='not(${remove})'`, `setpts='PTS-(${elapsed})/TB'`);
  }
  if (quality === 'original') filter.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
  else {
    const edge = quality === '720' ? 1280 : 1920;
    filter.push(`scale=w='min(${edge},iw)':h='min(${edge},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`);
  }
  filter.push('format=yuv420p');
  return filter.join(',');
}

export function clock(seconds, decimals = false) {
  const value = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(value / 60);
  const remaining = decimals ? (value % 60).toFixed(2).padStart(5, '0') : Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes.toString().padStart(2, '0')}:${remaining}`;
}
