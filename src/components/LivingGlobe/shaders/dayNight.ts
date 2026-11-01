// LivingGlobe — Day/Night terminator shader
// Renders a smooth transition between day and night hemispheres
// with a realistic twilight band

export const dayNightVertexShader = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vPosition;
  
  void main() {
    vWorldNormal = normalize(normal); // object space: matches the Earth-fixed Sun direction
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * vec4(vPosition, 1.0);
  }
`;

export const dayNightFragmentShader = /* glsl */ `
  precision mediump float;
  
  uniform vec3 sunDirection;
  uniform vec3 nightColor;
  uniform float nightOpacity;
  uniform float twilightWidth;
  
  varying vec3 vWorldNormal;
  
  void main() {
    // Dot product between surface normal and sun direction
    // Positive = facing sun (day), Negative = facing away (night)
    float NdotL = dot(normalize(vWorldNormal), sunDirection);
    
    // Smooth twilight transition
    // twilightWidth controls the softness of the terminator line
    float dayFactor = smoothstep(-twilightWidth, twilightWidth, NdotL);
    
    // Night overlay: opaque on night side, transparent on day side
    float nightAmount = 1.0 - dayFactor;
    
    gl_FragColor = vec4(nightColor, nightAmount * nightOpacity);
  }
`;
