interface PreviewDocumentOptions {
  code: string;
  duration: number;
  background: string;
  ink: string;
  previewId: string;
  fps?: number;
}

export function cleanAnimationSource(code: string) {
  return code.trim().replace(/^```(?:tsx|jsx|typescript|javascript)?\s*\r?\n/i, "").replace(/\r?\n```\s*$/, "").trim();
}

function scriptValue(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function createSparkPreviewDocument(options: PreviewDocumentOptions) {
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Problem E Security: Restrictive Content Security Policy boundary -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-eval' 'unsafe-inline' 'self' https://unpkg.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src data: blob: https:; media-src data: blob:; connect-src 'none';">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Bangers&family=Montserrat:ital,wght@0,700;0,800;0,900;1,900&family=Poppins:wght@800;900&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; }
html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Inter, system-ui, sans-serif;
}
/* Problem D: Fixed 1080x1920 virtual composition scaled proportionally */
#stage-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
#root {
  position: absolute;
  width: 1080px;
  height: 1920px;
  transform-origin: center center;
  overflow: hidden;
}
#root > * { width: 100% !important; height: 100% !important; min-height: 100% !important; }
</style>
<script>
const PREVIEW_ID = ${scriptValue(options.previewId)};
let previewFailed = false;
let animationFrameId = 0;
function sendPreviewMessage(type, data) {
  window.parent.postMessage(Object.assign({ type: type, previewId: PREVIEW_ID }, data || {}), '*');
}
function failPreview(error) {
  if (previewFailed) return;
  previewFailed = true;
  cancelAnimationFrame(animationFrameId);
  sendPreviewMessage('SPARK_RENDER_ERROR', { message: error && error.message ? error.message : String(error) });
}
window.addEventListener('error', function(event) {
  const source = event.filename || '';
  const scriptPath = source.split(/[?#]/)[0];
  const injectedScript = scriptPath === 'all.iife.js' || scriptPath.endsWith('/all.iife.js') || /^(?:chrome|moz|safari)-extension:/.test(source);
  const sandboxServiceWorker = /service.?worker/i.test(event.message || '') && /sandbox|allow-same-origin/i.test(event.message || '');
  if (injectedScript && sandboxServiceWorker) {
    event.preventDefault();
    return;
  }
  if (event.target && event.target.tagName === 'SCRIPT' && event.target.dataset.sparkRuntime) {
    failPreview(new Error('Could not load ' + event.target.dataset.sparkRuntime + '. Check the connection and retry the preview.'));
  } else if (event.message) {
    failPreview(event.error || new Error(event.message));
  }
}, true);
window.addEventListener('unhandledrejection', function(event) { failPreview(event.reason); });
</script>
<script data-spark-runtime="React" src="/api/preview-runtime?module=react"></script>
<script>window.react = window.React;</script>
<script data-spark-runtime="React DOM" src="/api/preview-runtime?module=react-dom"></script>
<script data-spark-runtime="Framer Motion" src="/api/preview-runtime?module=framer-motion"></script>
<script data-spark-runtime="Lucide icons" src="/api/preview-runtime?module=lucide-react"></script>
<script data-spark-runtime="the animation compiler" src="https://unpkg.com/@babel/standalone@7.24.0/babel.min.js"></script>
</head><body><div id="stage-container"><div id="root"></div></div>
<script>
(function() {
  if (previewFailed) return;
  // Guard SVG Element attributes against NaN values from animations or Lucide icons
  try {
    const origSetAttr = SVGElement.prototype.setAttribute;
    SVGElement.prototype.setAttribute = function(name, val) {
      if (val === 'NaN' || (typeof val === 'number' && Number.isNaN(val))) {
        val = '0';
      }
      return origSetAttr.call(this, name, val);
    };
    const origSetAttrNS = SVGElement.prototype.setAttributeNS;
    SVGElement.prototype.setAttributeNS = function(ns, name, val) {
      if (val === 'NaN' || (typeof val === 'number' && Number.isNaN(val))) {
        val = '0';
      }
      return origSetAttrNS.call(this, ns, name, val);
    };
  } catch(e) {}

  const rawCode = ${scriptValue(cleanAnimationSource(options.code))};
  const rawDuration = Number(${scriptValue(options.duration)});
  const TOTAL_DURATION = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 15;
  const FPS = Number(${scriptValue(options.fps || 60)}) || 60;
  const COMP_WIDTH = 1080;
  const COMP_HEIGHT = 1920;

  const containerEl = document.getElementById('stage-container');
  const rootEl = document.getElementById('root');
  rootEl.style.background = ${scriptValue(options.background)};
  rootEl.style.color = ${scriptValue(options.ink)};

  function updateScale() {
    if (!containerEl || !rootEl) return;
    const cw = containerEl.clientWidth || window.innerWidth || 360;
    const ch = containerEl.clientHeight || window.innerHeight || 640;
    const scale = Math.min(cw / COMP_WIDTH, ch / COMP_HEIGHT);
    rootEl.style.transform = 'scale(' + scale + ')';
  }
  window.addEventListener('resize', updateScale);
  updateScale();

  let layerEditMode = false;
  let layerOffsets = {};
  let activeLayerDrag = null;
  let wasPlayingBeforeLayerEdit = false;
  function getLayerPath(element) {
    const path = [];
    let node = element;
    while (node && node !== rootEl) {
      const parent = node.parentNode;
      if (!parent) return null;
      path.unshift(Array.prototype.indexOf.call(parent.childNodes, node));
      node = parent;
    }
    return node === rootEl ? path : null;
  }
  function applyLayerOffsets() {
    rootEl.querySelectorAll('*').forEach(function(node) {
      node.style.cursor = layerEditMode ? 'move' : '';
    });
    Object.keys(layerOffsets).forEach(function(key) {
      let node = rootEl;
      key.split('.').map(Number).forEach(function(index) { node = node && node.childNodes[index]; });
      if (node && node.style) {
        const offset = layerOffsets[key];
        node.style.translate = offset.x + 'px ' + offset.y + 'px';
      }
    });
  }
  function findEditableLayer(target) {
    let node = target instanceof Element ? target : target && target.parentElement;
    while (node && node !== rootEl) {
      if (node instanceof HTMLElement) {
        const hasText = (node.innerText || '').trim().length > 0;
        const hasImage = node.tagName === 'IMG' || node.querySelector('img,svg,canvas,video') ||
          (node.style.backgroundImage && node.style.backgroundImage !== 'none');
        if (hasText || hasImage) return node;
      }
      node = node.parentElement;
    }
    return null;
  }
  document.addEventListener('pointerdown', function(event) {
    if (!layerEditMode || event.button !== 0) return;
    const node = findEditableLayer(event.target);
    const path = node && getLayerPath(node);
    if (!node || !path || !path.length) return;
    event.preventDefault();
    event.stopPropagation();
    const key = path.join('.');
    const base = layerOffsets[key] || { x: 0, y: 0 };
    activeLayerDrag = {
      node: node, key: key, startX: event.clientX, startY: event.clientY,
      baseX: base.x, baseY: base.y,
      scale: rootEl.getBoundingClientRect().width / COMP_WIDTH || 1
    };
    node.style.outline = '2px solid #E4491B';
    node.style.outlineOffset = '3px';
  }, true);
  document.addEventListener('pointermove', function(event) {
    if (!activeLayerDrag) return;
    event.preventDefault();
    const drag = activeLayerDrag;
    const offset = {
      x: Math.round(drag.baseX + (event.clientX - drag.startX) / drag.scale),
      y: Math.round(drag.baseY + (event.clientY - drag.startY) / drag.scale)
    };
    layerOffsets[drag.key] = offset;
    drag.node.style.translate = offset.x + 'px ' + offset.y + 'px';
  }, true);
  document.addEventListener('pointerup', function() {
    if (!activeLayerDrag) return;
    activeLayerDrag.node.style.outline = '';
    activeLayerDrag.node.style.outlineOffset = '';
    activeLayerDrag = null;
    sendPreviewMessage('SPARK_LAYER_POSITIONS', { positions: layerOffsets });
  }, true);
  window.addEventListener('message', function(event) {
    if (!event.data || event.data.previewId !== PREVIEW_ID) return;
    if (event.data.type === 'EDIT_LAYERS') {
      const enabled = Boolean(event.data.enabled);
      if (enabled && !layerEditMode) {
        wasPlayingBeforeLayerEdit = isPlaying;
        isPlaying = false;
        sendTime();
      } else if (!enabled && layerEditMode) {
        isPlaying = wasPlayingBeforeLayerEdit;
        sendTime();
      }
      layerEditMode = enabled;
      document.body.style.cursor = layerEditMode ? 'move' : '';
      applyLayerOffsets();
    } else if (event.data.type === 'SET_LAYER_POSITIONS' && event.data.positions) {
      layerOffsets = event.data.positions;
      applyLayerOffsets();
    }
  });

  let currentTime = 0;
  let isPlaying = true;
  let lastTime = performance.now();
  let lastMessageTime = -Infinity;
  let rootInstance;
  let ComponentToRender;

  function requireModule(name) {
    if (name === 'react') return window.React;
    if (name === 'react-dom' || name === 'react-dom/client') return window.ReactDOM;
    if (name === 'framer-motion' || name === 'motion' || name === 'motion/react') return window.Motion || window.FramerMotion;
    if (name === 'lucide-react') return window.LucideReact;
    throw new Error('The preview does not support the imported module "' + name + '". Regenerate using the supported animation libraries.');
  }

  function sendTime() {
    sendPreviewMessage('SPARK_TIME_UPDATE', { currentTime: currentTime, isPlaying: isPlaying });
  }

  function renderFrame() {
    if (previewFailed || !rootInstance) return;
    try {
      const safeTime = Number.isFinite(currentTime) && currentTime >= 0 ? Math.min(TOTAL_DURATION, currentTime) : 0;
      const safeFrame = Math.floor(safeTime * FPS);
      ReactDOM.flushSync(function() {
        rootInstance.render(React.createElement(RuntimeBoundary, null,
          React.createElement(ComponentToRender, {
            duration: TOTAL_DURATION,
            currentTime: safeTime,
            time: safeTime,
            fps: FPS,
            frame: safeFrame,
            width: COMP_WIDTH,   // Exactly 1080px virtual composition
            height: COMP_HEIGHT, // Exactly 1920px virtual composition
            isPlaying: isPlaying
          })
        ));
      });
      applyLayerOffsets();
    } catch (error) { failPreview(error); }
  }

  function tick(now) {
    if (previewFailed) return;
    if (isPlaying) {
      const delta = Math.max(0, now - lastTime) / 1000;
      currentTime = (currentTime + delta) % TOTAL_DURATION;
      if (!Number.isFinite(currentTime) || currentTime < 0) currentTime = 0;
      renderFrame();
      if (now - lastMessageTime >= 100) { sendTime(); lastMessageTime = now; }
    }
    lastTime = now;
    if (!previewFailed) animationFrameId = requestAnimationFrame(tick);
  }

  let RuntimeBoundary;
  try {
    if (!rawCode) throw new Error('No animation code was returned. Retry Spark to generate the video.');
    if (!window.React || !window.ReactDOM || !window.Babel || !(window.Motion || window.FramerMotion) || !window.LucideReact) {
      throw new Error('An animation dependency failed to load. Retry the preview.');
    }
    RuntimeBoundary = class extends React.Component {
      constructor(props) { super(props); this.state = { failed: false }; }
      static getDerivedStateFromError() { return { failed: true }; }
      componentDidCatch(error) { failPreview(error); }
      render() { return this.state.failed ? null : this.props.children; }
    };
    const transformed = Babel.transform(rawCode, {
      presets: [['env', { modules: 'commonjs', targets: { chrome: '100' } }], ['react', { runtime: 'classic' }], 'typescript'],
      filename: 'animation.tsx'
    }).code;
    const animationModule = { exports: {} };
    new Function('require', 'module', 'exports', transformed + '\\n//# sourceURL=spark-animation.js')(requireModule, animationModule, animationModule.exports);
    ComponentToRender = animationModule.exports.default || animationModule.exports.GeneratedReel || animationModule.exports.FullReel;
    if (!ComponentToRender) throw new Error('No exported animation component was found. Retry Spark.');
    rootInstance = ReactDOM.createRoot(rootEl);
    renderFrame();
    if (!previewFailed) {
      sendPreviewMessage('SPARK_MOUNTED');
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(tick);
    }
  } catch (error) { failPreview(error); }

  window.addEventListener('message', function(event) {
    if (event.source !== window.parent || !event.data || event.data.previewId !== PREVIEW_ID || previewFailed) return;
    if (event.data.type === 'SET_PLAYING') {
      isPlaying = Boolean(event.data.isPlaying);
      lastTime = performance.now();
      renderFrame();
      sendTime();
    } else if (event.data.type === 'SEEK') {
      const requestedTime = Number(event.data.time);
      currentTime = Number.isFinite(requestedTime) ? Math.max(0, Math.min(TOTAL_DURATION, requestedTime)) : 0;
      lastTime = performance.now();
      renderFrame();
      sendTime();
    } else if (event.data.type === 'STEP_FRAME') {
      const targetFrame = Number(event.data.frame);
      if (Number.isFinite(targetFrame)) {
        isPlaying = false;
        currentTime = Math.max(0, Math.min(TOTAL_DURATION, targetFrame / FPS));
        lastTime = performance.now();
        renderFrame();
        sendPreviewMessage('FRAME_RENDERED', { frame: targetFrame, currentTime: currentTime });
      }
    }
  });

  window.addEventListener('pagehide', function() { cancelAnimationFrame(animationFrameId); });
})();
</script></body></html>`;
}
