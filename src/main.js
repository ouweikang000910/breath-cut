import { FFmpeg } from '@ffmpeg/ffmpeg';
import { analyze, PRESETS, selectedCuts, removedDuration, editedTime, cutPCM, videoFilter, clock } from './audio.mjs';
import './style.css';
import './neon.css';

const icons = {
  wave: '<path d="M3 10v4m4-7v10m5-14v18m5-14v10m4-7v4"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.2 8.2 12.3 12.3M8.2 15.8 20.5 3.5M14 10l-4 4"/>',
  shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  link: '<path d="m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
  chevron: '<path d="m8 5 7 7-7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>',
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`;
const siteBase = import.meta.env.BASE_URL;
const siteURL = new URL(siteBase, location.origin).href;
document.querySelector('#app').innerHTML = `
  <header class="header"><div class="header-inner">
    <a class="brand" href="${siteBase}" aria-label="气口剪辑首页"><span class="brand-icon">${icon('wave')}</span><span>气口剪辑<span class="brand-en">BREATHCUT</span></span></a>
    <nav aria-label="网页导航"><button id="help" class="text-button">使用说明</button><span class="nav-divider"></span><button id="share" class="text-button">${icon('link')} 复制链接</button></nav>
  </div></header>
  <main>
    <section class="intro"><div><div class="eyebrow"><span></span> 为每一个认真表达的人</div>
      <h1>剪掉多余气口，<span>让表达一气呵成。</span></h1>
      <p>导入口播视频，自动剪掉冗长停顿和低音量气口。<br class="mobile-break">保留你的语气，只让节奏更好一点。</p>
      <div class="intro-tags"><span>${icon('shield')} 视频不离开浏览器</span><span>${icon('check')} 无需登录 · 无需 API Key</span></div>
    </div><div class="intro-art" aria-hidden="true"><div class="art-heading"><span>一点停顿，刚刚好</span><span class="art-dot"></span></div>
      <div class="art-wave before"><span class="art-bars"></span><i></i><span class="art-bars"></span><i></i><span class="art-bars short"></span><i></i><span class="art-bars"></span></div>
      <div class="art-middle"><span>剪掉多余留白</span><span>↓</span></div>
      <div class="art-wave after"><span class="art-bars"></span><span class="art-bars"></span><span class="art-bars short"></span><span class="art-bars"></span></div>
      <div class="art-footer">原本的声音，更流畅的表达 ${icon('scissors')}</div>
    </div></section>
    <div class="workspace-heading"><div class="workspace-title">剪辑工作台 <span>WORKSPACE</span></div><ol class="steps"><li class="active" id="step-1"><b>1</b>导入视频</li><li>${icon('chevron')}</li><li id="step-2"><b>2</b>自动剪辑</li><li>${icon('chevron')}</li><li id="step-3"><b>3</b>预览导出</li></ol></div>
    <div class="workspace">
      <section class="editor card" aria-label="视频与剪辑预览">
        <div class="panel-heading"><div>${icon('film')} <strong id="video-label">视频预览</strong><span id="file-detail" class="muted"></span></div><button id="replace" class="text-button small" hidden>更换视频</button></div>
        <input id="file" type="file" accept=".mp4,.mov,.m4v,.webm,.mkv,video/*" hidden>
        <div id="dropzone" class="dropzone" role="button" tabindex="0" aria-label="选择或拖入一个口播视频">
          <div class="upload-symbol">${icon('upload')}</div><h2>把口播视频拖到这里</h2><p>或选择一个视频，剩下的交给我们</p><span class="button primary choose-label">选择视频 ${icon('arrow')}</span><span class="format-note">MP4 / MOV / WebM / MKV · 最大 200 MB · 最长 5 分钟</span>
        </div>
        <div id="video-wrap" class="video-wrap" hidden><video id="video" controls playsinline preload="metadata"></video><div id="preview-badge" class="preview-badge">原视频</div></div>
        <div class="preview-toolbar"><div class="segmented" aria-label="预览模式"><button id="original" class="selected" aria-pressed="true">原视频</button><button id="edited" aria-pressed="false" disabled>${icon('scissors')} 剪辑预览</button></div><span class="preview-hint" id="preview-hint">分析后可对比剪辑节奏</span></div>
        <div class="timeline-section"><div class="timeline-heading"><strong>声音时间线</strong><div class="legend"><span><i class="blue"></i>保留声音</span><span><i class="orange"></i>待剪片段</span></div></div><div id="wave-wrap" class="wave-wrap"><canvas id="wave" aria-label="音频波形，橙色区域是选中的剪除片段" role="img"></canvas><span id="wave-empty">导入并分析后，这里会显示声音波形</span><div id="playhead" class="playhead" hidden></div></div><div class="time-ruler"><span>00:00</span><span id="ruler-mid">—</span><span id="ruler-end">00:00</span></div></div>
        <div id="cuts-panel" class="cuts-panel" hidden><div class="cuts-heading"><strong>识别到 <span id="cut-count">0</span> 处可剪停顿</strong><label><input id="select-all" type="checkbox" checked> 全选剪除</label></div><p class="cuts-hint">勾选的片段会被剪掉。可以先试听，再决定是否保留。</p><div id="cuts-list" class="cuts-list"></div><div id="no-cuts" class="no-cuts" hidden></div></div>
      </section>
      <aside class="settings card" aria-label="剪辑设置"><div class="panel-heading">${icon('scissors')} <strong>剪辑设置</strong><span class="tiny-tag">可随时调整</span></div>
        <div class="settings-body"><label class="section-label">选择你喜欢的节奏</label><div class="presets" id="presets">
          <button data-preset="gentle"><span class="preset-symbol">∿</span><span><strong>自然舒缓</strong><small>只剪长停顿，保留更多呼吸</small></span><i></i></button>
          <button data-preset="balanced" class="active"><span class="preset-symbol">≋</span><span><strong>流畅适中 <em>推荐</em></strong><small>减少留白，适合大多数口播</small></span><i></i></button>
          <button data-preset="tight"><span class="preset-symbol">ϟ</span><span><strong>紧凑利落</strong><small>节奏更快，适合短视频</small></span><i></i></button>
        </div><div class="settings-divider"></div>
        <div class="range-field"><label for="minimum">最短识别停顿 <output id="minimum-value">0.40 秒</output></label><input id="minimum" type="range" min="0.2" max="1.5" step="0.05" value="0.4"><div class="range-labels"><span>连小停顿也剪</span><span>只剪长停顿</span></div></div>
        <div class="range-field"><label for="padding">句子两端保护 <output id="padding-value">0.10 秒</output></label><input id="padding" type="range" min="0.04" max="0.3" step="0.01" value="0.1"><div class="range-labels"><span>更紧凑</span><span>更自然</span></div></div>
        <details class="advanced"><summary>高级设置 <span>＋</span></summary><div class="range-field"><label for="threshold">低音量阈值 <output id="threshold-value">-36 dB</output></label><input id="threshold" type="range" min="-55" max="-20" step="1" value="-36"><p>数值越大，剪得越多；轻声说话可调低。</p></div></details>
        <div class="settings-divider"></div><label class="section-label" for="quality">导出画质</label><select id="quality"><option value="1080">高清 · 最长边 1920 px</option><option value="720">快速 · 最长边 1280 px</option><option value="original">原分辨率</option></select><p class="quality-note">保持原比例，导出通用 MP4 格式</p>
        <div class="tip">${icon('info')}<p>清晰的单人口播效果更好。背景音乐和较响的呼吸可能影响识别，导出前建议预览。</p></div>
      </div></aside>
    </div>
    <section class="export-bar card" aria-label="剪辑操作"><div class="metrics"><div><span>原视频</span><strong id="original-duration">—<small>秒</small></strong></div><span class="metric-arrow">${icon('arrow')}</span><div><span>剪辑后</span><strong id="edited-duration">—<small>秒</small></strong></div><div class="saved-metric"><span>节省时间</span><strong id="saved-duration">—<small>秒</small></strong></div></div><div class="export-actions"><button id="cancel" class="button secondary" hidden>取消处理</button><button id="download" class="button secondary" hidden>${icon('download')} 下载 MP4</button><button id="action" class="button primary" disabled>${icon('scissors')} 开始自动剪辑 ${icon('arrow')}</button></div></section>
    <div id="status" class="status" role="status" aria-live="polite"><span id="status-text">从一条口播视频开始，让剪辑简单一点。</span><div id="progress-track" class="progress-track" hidden><div id="progress-fill"></div></div></div>
    <footer><span class="footer-brand">${icon('wave')} 气口剪辑</span><span>把时间留给表达。</span><span>${icon('shield')} 本机处理 · 不上传视频</span></footer>
  </main>
  <dialog id="help-dialog"><button id="close-help" class="dialog-close" aria-label="关闭说明">${icon('close')}</button><span class="eyebrow">简单三步</span><h2>留住表达，剪掉等待。</h2><ol class="help-steps"><li><b>01</b><div><strong>导入口播视频</strong><p>选择或拖入 5 分钟以内、200 MB 以下的视频。文件只留在你的浏览器内存中。</p></div></li><li><b>02</b><div><strong>自动识别，调到喜欢的节奏</strong><p>选择剪辑力度，点击开始。工具根据音量识别停顿与较轻的气口，可逐个试听、取消剪除。</p></div></li><li><b>03</b><div><strong>预览，导出，分享</strong><p>“剪辑预览”会跳过选中的片段。确认后导出 MP4，再点击下载。关闭页面会清除当前视频。</p></div></li></ol><div class="help-note">首次处理需下载约 32 MB 的剪辑引擎。建议使用电脑端 Chrome 或 Edge；导出速度取决于视频长度、画质和设备性能。这里按音量判断停顿，不会自动识别口误或所有呼吸声。</div><button id="got-it" class="button primary">开始使用 ${icon('arrow')}</button></dialog>
  <div id="toast" class="toast" role="status" hidden></div>
`;

const $ = id => document.getElementById(id);
const state = { file: null, url: null, duration: 0, samples: null, envelope: [], cuts: [], analyzed: false, mode: 'original', busy: false, stage: '', progress: 0, engine: null, engineHasFile: false, input: '', output: null, token: 0, fetchAbort: null, logs: [] };
const settings = () => ({ threshold: +$('threshold').value, minimum: +$('minimum').value, padding: +$('padding').value });
const selected = () => selectedCuts(state.cuts);

function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { $('toast').hidden = true; }, 3500); }
function status(message, progress = null, error = false) {
  $('status-text').textContent = message;
  $('status').classList.toggle('error', error);
  $('progress-track').hidden = progress === null;
  if (progress !== null) $('progress-fill').style.width = `${Math.max(1, Math.min(100, progress))}%`;
}
function clearOutput() {
  if (state.output) { URL.revokeObjectURL(state.output); status('剪辑设置已改变，请重新导出成片。'); }
  state.output = null;
  $('download').hidden = true;
}
function controls() {
  $('action').disabled = !state.file || state.busy;
  $('action').innerHTML = state.busy ? '<span class="spinner"></span> 正在处理…' : state.analyzed ? `${icon('download')} ${state.output ? '重新导出' : '导出 MP4'} ${icon('arrow')}` : `${icon('scissors')} 开始自动剪辑 ${icon('arrow')}`;
  $('cancel').hidden = !state.busy;
  $('replace').disabled = state.busy;
  $('download').disabled = state.busy;
  $('file').disabled = state.busy;
  document.querySelectorAll('.settings button, .settings input, .settings select, #cuts-panel input, #cuts-panel button').forEach(node => node.disabled = state.busy);
  $('select-all').disabled = state.busy || state.cuts.length === 0;
  $('edited').disabled = !state.analyzed || state.busy;
  $('step-1').classList.toggle('done', !!state.file);
  $('step-1').classList.toggle('active', !state.file);
  $('step-2').classList.toggle('active', !!state.file && !state.analyzed);
  $('step-2').classList.toggle('done', state.analyzed);
  $('step-3').classList.toggle('active', state.analyzed);
}
function metrics() {
  const removed = removedDuration(state.cuts);
  const fmt = value => `${value.toFixed(1)}<small>秒</small>`;
  $('original-duration').innerHTML = state.file ? fmt(state.duration) : '—<small>秒</small>';
  $('edited-duration').innerHTML = state.analyzed ? fmt(state.duration - removed) : '—<small>秒</small>';
  $('saved-duration').innerHTML = state.analyzed ? fmt(removed) : '—<small>秒</small>';
  $('ruler-mid').textContent = state.duration ? clock(state.duration / 2) : '—';
  $('ruler-end').textContent = clock(state.duration);
}
function setMode(mode) {
  state.mode = mode;
  $('original').classList.toggle('selected', mode === 'original');
  $('edited').classList.toggle('selected', mode === 'edited');
  $('original').setAttribute('aria-pressed', String(mode === 'original'));
  $('edited').setAttribute('aria-pressed', String(mode === 'edited'));
  $('preview-badge').textContent = mode === 'original' ? '原视频' : '剪辑预览 · 自动跳过待剪片段';
  $('preview-badge').classList.toggle('is-edited', mode === 'edited');
  $('preview-hint').textContent = mode === 'edited' ? '播放时跳过橙色片段，导出后即为实际成片' : state.analyzed ? '点击橙色片段试听，勾选决定是否剪除' : '分析后可对比剪辑节奏';
}

async function loadFile(file) {
  if (!file || state.busy) return;
  if (!/\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name)) { toast('请选择 MP4、MOV、M4V、WebM 或 MKV 视频。'); return; }
  if (file.size > 200 * 1024 * 1024) { toast('视频超过 200 MB，请先压缩或截取片段。'); return; }
  if (file.size === 0) { toast('文件为空，请重新选择视频。'); return; }
  state.token++;
  if (state.url) URL.revokeObjectURL(state.url);
  if (state.engine) { state.engine.terminate(); state.engine = null; }
  state.file = file; state.url = URL.createObjectURL(file); state.duration = 0; state.samples = null; state.envelope = []; state.cuts = []; state.analyzed = false; state.engineHasFile = false;
  clearOutput(); setMode('original');
  $('video-label').textContent = file.name;
  $('file-detail').textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
  $('replace').hidden = false; $('dropzone').hidden = true; $('video-wrap').hidden = false;
  $('cuts-panel').hidden = true; $('wave-empty').hidden = false;
  $('video').src = state.url;
  $('file').value = '';
  status('视频已准备好。选择节奏后，点击“开始自动剪辑”。');
  metrics(); controls(); drawWave();
}

$('video').addEventListener('loadedmetadata', () => {
  const video = $('video');
  if (Number.isFinite(video.duration)) state.duration = video.duration;
  $('file-detail').textContent = `${(state.file.size / 1024 / 1024).toFixed(1)} MB · ${video.videoWidth} × ${video.videoHeight}`;
  if (state.duration > 300.1) { status('视频超过 5 分钟，请更换为较短的片段。', null, true); $('action').disabled = true; }
  metrics();
});
$('video').addEventListener('error', () => { if (state.file) status('浏览器暂不能直接预览该编码，可尝试自动剪辑并导出为 MP4。'); });
$('file').addEventListener('change', event => loadFile(event.target.files[0]));
$('replace').addEventListener('click', () => $('file').click());
$('dropzone').addEventListener('click', () => $('file').click());
$('dropzone').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('file').click(); } });
document.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) { event.preventDefault(); $('dropzone').classList.add('dragover'); } });
document.addEventListener('dragleave', event => { if (!event.relatedTarget) $('dropzone').classList.remove('dragover'); });
document.addEventListener('drop', event => { event.preventDefault(); $('dropzone').classList.remove('dragover'); loadFile(event.dataTransfer?.files[0]); });

async function checkedFetch(url, abort) {
  const response = await fetch(url, { signal: abort.signal });
  if (!response.ok) throw new Error('剪辑引擎下载失败，请检查网络后重试。');
  return response.arrayBuffer();
}
async function ensureEngine(token) {
  if (state.engine?.loaded) return state.engine;
  if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') throw new Error('浏览器不支持视频处理，请换用最新版电脑端 Chrome 或 Edge。');
  state.stage = 'load'; status('首次使用：正在下载剪辑引擎（约 32 MB）…', 4);
  const ffmpeg = new FFmpeg(); state.engine = ffmpeg;
  ffmpeg.on('log', ({ message }) => {
    state.logs.push(message); if (state.logs.length > 100) state.logs.shift();
    const match = message.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (match && state.stage === 'analyze') state.probedDuration = +match[1] * 3600 + +match[2] * 60 + +match[3];
  });
  ffmpeg.on('progress', ({ progress }) => {
    if (!state.busy || !Number.isFinite(progress)) return;
    const fraction = Math.max(0, Math.min(1, progress));
    if (state.stage === 'analyze') status('正在读取声音、寻找停顿…', 30 + fraction * 55);
    if (state.stage === 'audio') status('正在准备精确剪辑的音频…', 10 + fraction * 15);
    if (state.stage === 'export') status('正在合成 MP4，请保持页面打开…', 30 + fraction * 65);
  });
  state.fetchAbort = new AbortController();
  const parts = await Promise.all(['engine/core-1.bin', 'engine/core-2.bin'].map(path => checkedFetch(`${siteBase}${path}`, state.fetchAbort)));
  if (token !== state.token) throw new Error('cancelled');
  const wasmURL = URL.createObjectURL(new Blob(parts, { type: 'application/wasm' }));
  try { await ffmpeg.load({ coreURL: new URL(`${siteBase}engine/ffmpeg-core.js`, location.origin).href, wasmURL }); }
  finally { URL.revokeObjectURL(wasmURL); }
  return ffmpeg;
}
async function ensureInput(ffmpeg) {
  if (state.engineHasFile) return;
  state.input = `input.${state.file.name.split('.').pop().toLowerCase()}`;
  await ffmpeg.writeFile(state.input, new Uint8Array(await state.file.arrayBuffer()));
  state.engineHasFile = true;
}
async function execChecked(ffmpeg, args) {
  const result = await ffmpeg.exec(['-hide_banner', '-y', ...args]);
  if (result !== 0) {
    const logs = state.logs.join('\n');
    if (/does not contain any stream|matches no streams|Stream map.*matches no/i.test(logs)) throw new Error('没有找到音轨。请换一个带声音的视频。');
    throw new Error('视频处理失败。请尝试通用 H.264 MP4，或降低画质、缩短视频后重试。');
  }
}
async function analyzeFile(token) {
  const ffmpeg = await ensureEngine(token);
  state.stage = 'analyze'; state.logs = []; state.probedDuration = 0;
  status('正在读取视频声音…', 25);
  await ensureInput(ffmpeg);
  await execChecked(ffmpeg, ['-i', state.input, '-map', '0:a:0', '-t', '301', '-vn', '-af', 'aresample=async=1:first_pts=0', '-ac', '1', '-ar', '16000', '-f', 'f32le', 'analysis.raw']);
  const bytes = await ffmpeg.readFile('analysis.raw');
  await ffmpeg.deleteFile('analysis.raw');
  if (token !== state.token) return;
  if (state.probedDuration) state.duration = state.probedDuration;
  state.samples = new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4));
  if (state.duration <= 0) state.duration = state.samples.length / 16000;
  if (state.duration > 300.1) throw new Error('视频超过 5 分钟，请先截取较短的片段。');
  if (state.samples.length === 0) throw new Error('音轨为空，无法识别气口。');
  state.analyzed = true;
  recalculate();
  setMode('edited');
  const count = state.cuts.length;
  status(count ? `识别完成：找到 ${count} 处可剪停顿。预览确认后，导出 MP4。` : '识别完成，没有发现可剪停顿。可调整设置后再次查看。');
}
function recalculate() {
  if (!state.samples) return;
  const result = analyze(state.samples, state.duration, settings());
  state.envelope = result.envelope; state.cuts = result.cuts;
  state.hasSpeech = result.hasSpeech;
  clearOutput(); renderCuts(); metrics(); drawWave(); controls();
}

async function exportFile(token) {
  $('video').pause(); clearOutput();
  const ffmpeg = await ensureEngine(token);
  await ensureInput(ffmpeg);
  state.stage = 'audio'; status('正在准备音频…', 8);
  await execChecked(ffmpeg, ['-i', state.input, '-map', '0:a:0', '-vn', '-af', 'aresample=async=1:first_pts=0', '-ac', '2', '-ar', '48000', '-f', 's16le', 'audio.pcm']);
  let pcm = await ffmpeg.readFile('audio.pcm'); await ffmpeg.deleteFile('audio.pcm');
  const editedPCM = cutPCM(pcm, state.cuts, state.duration); pcm = null;
  if (!editedPCM.length) throw new Error('剪辑后没有可导出的声音，请保留一些片段。');
  await ffmpeg.writeFile('edited.pcm', editedPCM);
  state.stage = 'export'; status('正在合成 MP4，请保持页面打开…', 30);
  const outputDuration = state.duration - removedDuration(state.cuts);
  await execChecked(ffmpeg, ['-i', state.input, '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'edited.pcm', '-map', '0:v:0', '-map', '1:a:0', '-vf', videoFilter(state.cuts, $('quality').value), '-vsync', 'vfr', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', outputDuration.toFixed(3), '-movflags', '+faststart', 'result.mp4']);
  const result = await ffmpeg.readFile('result.mp4');
  await ffmpeg.deleteFile('result.mp4'); await ffmpeg.deleteFile('edited.pcm');
  if (token !== state.token) return;
  state.output = URL.createObjectURL(new Blob([result], { type: 'video/mp4' }));
  $('download').hidden = false;
  status(`导出完成 · ${(result.byteLength / 1024 / 1024).toFixed(1)} MB。点击“下载 MP4”保存成片。`);
  toast('成片已准备好，可以下载了。');
}
$('action').addEventListener('click', async () => {
  if (state.busy || !state.file) return;
  if (state.duration > 300.1) { status('视频超过 5 分钟，请更换较短的片段。', null, true); return; }
  state.busy = true; const token = ++state.token; controls();
  try { if (state.analyzed) await exportFile(token); else await analyzeFile(token); }
  catch (error) {
    if (token !== state.token) return;
    const message = error?.message || String(error);
    status(/memory|out of bounds|Aborted|RuntimeError/i.test(message) ? '浏览器内存不足。请关闭其他标签页，改用较短视频或“快速”画质后重试。' : message.includes('终止') ? '处理已取消。' : message, null, true);
    state.engine?.terminate(); state.engine = null; state.engineHasFile = false;
  } finally { if (token === state.token) { state.busy = false; state.stage = ''; controls(); } }
});
$('cancel').addEventListener('click', () => {
  state.token++; state.fetchAbort?.abort(); state.engine?.terminate(); state.engine = null; state.engineHasFile = false; state.busy = false; state.stage = ''; controls(); status('处理已取消。视频仍在，可以调整后重试。');
});
$('download').addEventListener('click', () => {
  if (!state.output) return;
  const link = document.createElement('a'); link.href = state.output; link.download = `${state.file.name.replace(/\.[^.]+$/, '')}_气口剪辑.mp4`; document.body.append(link); link.click(); link.remove();
});

function updateSettingLabels() {
  $('minimum-value').textContent = `${(+$('minimum').value).toFixed(2)} 秒`;
  $('padding-value').textContent = `${(+$('padding').value).toFixed(2)} 秒`;
  $('threshold-value').textContent = `${$('threshold').value} dB`;
  for (const id of ['minimum', 'padding', 'threshold']) {
    const node = $(id); node.style.setProperty('--range-fill', `${((+node.value - +node.min) / (+node.max - +node.min)) * 100}%`);
  }
}
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
  const preset = PRESETS[button.dataset.preset];
  Object.entries(preset).forEach(([key, value]) => $(key).value = value);
  document.querySelectorAll('[data-preset]').forEach(node => node.classList.toggle('active', node === button));
  updateSettingLabels(); recalculate();
}));
for (const id of ['minimum', 'padding', 'threshold']) $(id).addEventListener('input', () => { updateSettingLabels(); document.querySelectorAll('[data-preset]').forEach(node => node.classList.remove('active')); recalculate(); });
$('quality').addEventListener('change', () => { clearOutput(); controls(); });

function renderCuts() {
  $('cuts-panel').hidden = false; $('wave-empty').hidden = true;
  $('cut-count').textContent = state.cuts.length;
  $('cuts-list').replaceChildren();
  $('no-cuts').hidden = state.cuts.length > 0;
  $('no-cuts').textContent = state.hasSpeech ? '没有发现可剪停顿。试试“紧凑利落”，或在高级设置中提高阈值。' : '声音过轻或接近静音，暂不自动剪除。请检查原视频声音，或降低音量阈值。';
  state.cuts.forEach((cut, index) => {
    const row = document.createElement('div'); row.className = `cut-row${cut.selected ? '' : ' kept'}`;
    row.innerHTML = `<label><input type="checkbox" ${cut.selected ? 'checked' : ''} aria-label="剪除第 ${index + 1} 个停顿"><span class="cut-number">${String(index + 1).padStart(2, '0')}</span><span class="cut-times">${clock(cut.start, true)} <span>—</span> ${clock(cut.end, true)}</span><span class="cut-duration">${(cut.end - cut.start).toFixed(2)} 秒</span></label><button class="listen" aria-label="试听第 ${index + 1} 个停顿">${icon('play')} 试听</button>`;
    row.querySelector('input').addEventListener('change', event => { cut.selected = event.target.checked; row.classList.toggle('kept', !cut.selected); clearOutput(); syncSelectAll(); metrics(); drawWave(); controls(); });
    row.querySelector('button').addEventListener('click', () => { setMode('original'); $('video').currentTime = Math.max(0, cut.start - 0.5); $('video').play().catch(() => toast('请点击视频的播放按钮试听。')); });
    $('cuts-list').append(row);
  });
  syncSelectAll();
}
function syncSelectAll() { const count = selected().length; $('select-all').checked = count === state.cuts.length && count > 0; $('select-all').indeterminate = count > 0 && count < state.cuts.length; $('select-all').disabled = !state.cuts.length; }
$('select-all').addEventListener('change', event => { state.cuts.forEach(cut => cut.selected = event.target.checked); clearOutput(); renderCuts(); metrics(); drawWave(); controls(); });
$('original').addEventListener('click', () => setMode('original'));
$('edited').addEventListener('click', () => setMode('edited'));

function drawWave() {
  const canvas = $('wave'); const parent = $('wave-wrap'); const dpr = devicePixelRatio || 1;
  const width = parent.clientWidth; const height = parent.clientHeight;
  canvas.width = width * dpr; canvas.height = height * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#4b3942'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
  if (!state.envelope.length || !state.duration) return;
  for (const cut of selected()) { ctx.fillStyle = '#592438'; ctx.fillRect(cut.start / state.duration * width, 0, (cut.end - cut.start) / state.duration * width, height); }
  const bars = Math.floor(width / 4);
  const maxRms = Math.max(0.03, ...state.envelope.map(item => item.rms));
  const active = selected();
  for (let i = 0; i < bars; i++) {
    const from = Math.floor(i / bars * state.envelope.length); const to = Math.max(from + 1, Math.floor((i + 1) / bars * state.envelope.length));
    let rms = 0; for (let j = from; j < to; j++) rms = Math.max(rms, state.envelope[j]?.rms || 0);
    const time = i / bars * state.duration;
    ctx.fillStyle = active.some(cut => time >= cut.start && time < cut.end) ? '#a78e9b' : '#ff435f';
    const barHeight = Math.max(3, Math.sqrt(rms / maxRms) * (height - 16));
    ctx.fillRect(i * 4 + 1, (height - barHeight) / 2, 2, barHeight);
  }
}
new ResizeObserver(drawWave).observe($('wave-wrap'));
$('wave-wrap').addEventListener('click', event => { if (state.duration && state.file) $('video').currentTime = (event.clientX - event.currentTarget.getBoundingClientRect().left) / event.currentTarget.clientWidth * state.duration; });
function playbackUpdate() {
  const video = $('video');
  if (state.file && state.duration) {
    $('playhead').hidden = !state.analyzed; $('playhead').style.left = `${video.currentTime / state.duration * 100}%`;
    if (state.mode === 'edited' && !video.paused && !video.seeking) {
      const cut = selected().find(item => video.currentTime >= item.start && video.currentTime < item.end - 0.005);
      if (cut) { if (cut.end >= state.duration - 0.03) { video.pause(); video.currentTime = Math.max(0, state.duration - 0.01); } else video.currentTime = cut.end; }
    }
    if (state.mode === 'edited' && state.analyzed) $('preview-hint').textContent = `${clock(editedTime(video.currentTime, state.cuts))} / ${clock(state.duration - removedDuration(state.cuts))} · 导出后为连续成片`;
  }
  requestAnimationFrame(playbackUpdate);
}
requestAnimationFrame(playbackUpdate);
$('help').addEventListener('click', () => $('help-dialog').showModal());
for (const id of ['close-help', 'got-it']) $(id).addEventListener('click', () => $('help-dialog').close());
$('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
$('share').addEventListener('click', async () => { try { await navigator.clipboard.writeText(siteURL); toast('链接已复制，分享给朋友即可使用。'); } catch { toast('请复制浏览器地址栏中的链接进行分享。'); } });
window.addEventListener('beforeunload', event => { if (state.busy) { event.preventDefault(); event.returnValue = ''; } });
updateSettingLabels(); metrics(); controls();
