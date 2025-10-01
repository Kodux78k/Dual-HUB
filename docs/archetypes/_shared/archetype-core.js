
/* Archetype core — platonic solid + audio-reactive "breath" + Blue‑1 material */
(function(){
  const qs = new URLSearchParams(location.search);
  const ARCH = (document.documentElement.getAttribute('data-arch') || qs.get('arch') || 'atlas').toLowerCase();
  const SHAPE = (document.documentElement.getAttribute('data-shape') || qs.get('shape') || '').toLowerCase();
  const PLAIN = qs.has('plain') || document.documentElement.hasAttribute('data-plain');
  const USE_LOCAL_AUDIO = qs.get('audio') === 'local';

  let scene, camera, renderer, solid, wire, clock, targetScale = 1, currentScale = 1;
  let analyser = null, audioCtx = null, micStream = null, rmsSmoothed = 0;

  function mapShape(arch, hint){
    if (hint) return hint;
    switch(arch){
      case 'atlas': return 'cube';
      case 'nova': return 'icosa';
      case 'vitalis': return 'dodeca';
      case 'pulse': return 'octa';
      case 'artemis': return 'tetra';
      case 'serena': return 'sphere';
      case 'kaos': return 'tetra';
      case 'genus': return 'cube';
      case 'lumine': return 'octa';
      case 'rhea': return 'sphere';
      case 'solus': return 'dodeca';
      case 'aion': return 'icosa';
      default: return 'icosa';
    }
  }

  function geometryFor(name){
    switch(name){
      case 'tetra': return new THREE.TetrahedronGeometry(1.2, 0);
      case 'cube': case 'box': return new THREE.BoxGeometry(1.8, 1.8, 1.8);
      case 'octa': return new THREE.OctahedronGeometry(1.4, 0);
      case 'dodeca': return new THREE.DodecahedronGeometry(1.35, 0);
      case 'sphere': return new THREE.SphereGeometry(1.25, 42, 42);
      case 'icosa': default: return new THREE.IcosahedronGeometry(1.35, 0);
    }
  }

  function init(){
    // Scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 100);
    camera.position.z = 4.4;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const k = new THREE.PointLight(0x88ccff, 1.2, 60); k.position.set(-4, 3, 6); scene.add(k);
    const f = new THREE.PointLight(0xffd166, 0.9, 60); f.position.set(5, -3, 5); scene.add(f);

    // Solid + wire
    const base = mapShape(ARCH, SHAPE);
    const geo = geometryFor(base);
    const mat = (typeof createBlue1Material === 'function') ? createBlue1Material(THREE, { color: '#4aa8ff', glowColor: '#ffd166', glowStrength: 1.0 }) : new THREE.MeshStandardMaterial({ color: 0x4aa8ff, emissive: 0x223344, metalness: 0.35, roughness: 0.2, transparent: true, opacity: 0.92 });
    solid = new THREE.Mesh(geo, mat);
    scene.add(solid);

    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.5 });
    wire = new THREE.LineSegments(edges, lineMat);
    scene.add(wire);

    clock = new THREE.Clock();

    // Sizing
    addEventListener('resize', onResize);

    // Audio: parent broadcast or local mic fallback
    if (USE_LOCAL_AUDIO) {
      tryLocalMic();
    } else {
      window.addEventListener('message', onMsg, false);
      // also start a gentle idle pulsing in case no messages arrive
    }

    // Plain mode: transparent bg ensures parent "no overlay" variant works
    if (PLAIN) {
      document.body.style.background = 'transparent';
    }

    animate();
  }

  function onMsg(ev){
    const data = ev && ev.data || {};
    if (data && data.type === 'arch-audio') {
      const rms = Math.max(0, Math.min(1, Number(data.rms) || 0));
      // Low-pass smooth
      rmsSmoothed = rmsSmoothed * 0.85 + rms * 0.15;
      targetScale = 1.0 + rmsSmoothed * 0.55;
    }
  }

  async function tryLocalMic(){
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream = stream;
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
    } catch (e) {
      // ignore; stays idle pulse
    }
  }

  function computeLocalRMS(){
    if (!analyser) return 0;
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / buf.length);
  }

  function onResize(){
    const w = innerWidth, h = innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate(){
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    // idle breathing
    const idle = 1.0 + Math.sin(t * 1.5) * 0.03;
    if (analyser) {
      const rms = computeLocalRMS();
      rmsSmoothed = rmsSmoothed * 0.85 + rms * 0.15;
      targetScale = 1.0 + rmsSmoothed * 0.55;
    }
    // Ease scale
    currentScale += (targetScale - currentScale) * 0.08;
    const s = Math.max(0.6, currentScale * idle);
    solid.scale.set(s, s, s);
    wire.scale.set(s, s, s);
    // Motion
    solid.rotation.y = t * 0.35;
    solid.rotation.x = Math.sin(t * 0.27) * 0.15;
    wire.rotation.copy(solid.rotation);
    renderer.render(scene, camera);
  }

  // Boot
  window.addEventListener('DOMContentLoaded', () => {
    try {
      init();
    } catch (e) {
      const p = document.createElement('p');
      p.textContent = 'WebGL indisponível.';
      p.style.cssText = 'font:14px/1.4 system-ui;color:#ccc;padding:8px';
      document.body.appendChild(p);
    }
  });
})();
