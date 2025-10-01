
/**
 * KOBLLUX Blue‑1 Shader (toon + glow rim)
 * Returns THREE.ShaderMaterial tuned with a soft blue core and golden rim.
 */
function createBlue1Material(THREE, opts={}){
  const color = new THREE.Color(opts.color || '#4aa8ff');
  const glowColor = new THREE.Color(opts.glowColor || '#ffd166'); // golden rim
  const uniforms = {
    uColor: { value: color },
    uGlow:  { value: glowColor },
    uTime:  { value: 0 },
    uGlowStrength: { value: opts.glowStrength != null ? opts.glowStrength : 1.1 }
  };
  const vert = `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    uniform float uTime;
    void main(){
      vNormal = normalize(normalMatrix * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      vec4 mvPosition = viewMatrix * wp;
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  const frag = `
    precision highp float;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    uniform vec3 uColor;
    uniform vec3 uGlow;
    uniform float uGlowStrength;
    // simple toon steps
    float toonShade(float ndl){
      if (ndl > 0.9) return 1.0;
      if (ndl > 0.5) return 0.75;
      if (ndl > 0.2) return 0.45;
      return 0.25;
    }
    void main(){
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewDir);
      vec3 L = normalize(vec3(0.6, 0.8, 0.5)); // key light dir
      float ndl = max(dot(N, L), 0.0);
      float shade = toonShade(ndl);
      // Fresnel rim
      float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.5);
      vec3 base = uColor * shade;
      vec3 rimGlow = uGlow * rim * uGlowStrength;
      vec3 col = base + rimGlow;
      // subtle bloom-like lift
      col += vec3(0.05);
      gl_FragColor = vec4(col, 0.92);
    }
  `;
  return new THREE.ShaderMaterial({
    uniforms, vertexShader: vert, fragmentShader: frag, transparent: true
  });
}
