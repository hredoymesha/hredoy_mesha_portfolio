// LivingGlobe — Atmosphere glow shader
// Renders a subtle atmospheric rim glow around the Earth
// using Fresnel-like effect (stronger at edges, weaker at center)

export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPos.xyz;
    gl_Position = projectionMatrix * viewPos;
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  precision mediump float;
  
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float power;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    // Calculate Fresnel factor: 1.0 at edges, 0.0 at center
    vec3 viewDir = normalize(-vViewPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    
    // Raise to power for sharper falloff
    float glow = pow(fresnel, power) * intensity;
    
    gl_FragColor = vec4(glowColor, glow);
  }
`;
