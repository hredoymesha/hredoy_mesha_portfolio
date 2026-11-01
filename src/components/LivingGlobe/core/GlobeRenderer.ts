// LivingGlobe — Core Three.js globe renderer
// Manages scene, camera, renderer, and animation loop
// Creates one shared globe instance used by all visualization modes

import { HIGHLIGHT_BORDERS } from '../data/borders';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { CITIES } from '../data/cities';
import { dayNightVertexShader, dayNightFragmentShader } from '../shaders/dayNight';
import { atmosphereVertexShader, atmosphereFragmentShader } from '../shaders/atmosphere';
import { sunDirection } from '../astronomy/sunPosition';

// Earth textures are served from this site (no third-party requests). Place the three 2k images in public/textures/.
// Source: Solar System Scope textures (CC BY 4.0), based on NASA Blue Marble Next Generation.
// Required credit when the globe is shown: "Textures: Solar System Scope (CC BY 4.0), based on NASA Blue Marble".
// If the files are missing, the globe falls back to a procedurally drawn Earth.
// Set by LivingGlobe after it checks that the real Earth images exist. When they do not,
// the globe draws its own Earth and makes no requests for missing files.
let earthTexturesAvailable = false;
export function setEarthTexturesAvailable(value: boolean): void {
  earthTexturesAvailable = value;
}

const EARTH_TEXTURES = {
  day: '/textures/earth-daymap-2k.jpg',
  night: '/textures/earth-nightmap-2k.jpg',
  clouds: '/textures/earth-clouds-2k.jpg',
};


// Coordinate conversion: lat/lon → Three.js sphere position
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Procedural Earth texture generator
// Creates a bright, colorful Earth texture with visible continents, oceans, and grid lines
function createEarthTexture(width: number, height: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Bright blue ocean
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#1a5276');
  oceanGrad.addColorStop(0.1, '#2471a3');
  oceanGrad.addColorStop(0.3, '#2e86c1');
  oceanGrad.addColorStop(0.5, '#3498db');
  oceanGrad.addColorStop(0.7, '#2e86c1');
  oceanGrad.addColorStop(0.9, '#2471a3');
  oceanGrad.addColorStop(1, '#1a5276');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Continent shapes with bright green colors
  // Each continent drawn as multiple overlapping ellipses for more realistic shapes
  function drawLand(x: number, y: number, w: number, h: number, color: string, rotation: number = 0) {
    ctx.save();
    ctx.translate(x * width, y * height);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * width, h * height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const green = '#27ae60';       // Main land green
  const greenLight = '#2ecc71';  // Lighter green for variation
  const greenDark = '#1e8449';   // Darker green for mountains
  const desert = '#d4ac0d';      // Yellow-brown for deserts
  const tundra = '#82e0aa';      // Light green for northern areas
  const ice = '#eaf2f3';         // White for ice caps

  // === NORTH AMERICA ===
  drawLand(0.20, 0.28, 0.08, 0.06, green); // Western US/Canada
  drawLand(0.16, 0.22, 0.05, 0.04, tundra); // Alaska/Canada north
  drawLand(0.24, 0.32, 0.04, 0.05, greenLight); // Eastern US
  drawLand(0.22, 0.38, 0.03, 0.04, green); // Mexico/Central America
  drawLand(0.26, 0.14, 0.04, 0.03, ice); // Greenland

  // === SOUTH AMERICA ===
  drawLand(0.27, 0.55, 0.04, 0.06, green); // Brazil
  drawLand(0.25, 0.50, 0.03, 0.04, greenDark); // Andes
  drawLand(0.26, 0.62, 0.03, 0.05, greenLight); // Argentina
  drawLand(0.28, 0.68, 0.02, 0.03, green); // Southern cone

  // === EUROPE ===
  drawLand(0.48, 0.22, 0.04, 0.03, green); // Western Europe
  drawLand(0.50, 0.20, 0.03, 0.02, greenLight); // Scandinavia
  drawLand(0.52, 0.24, 0.03, 0.03, green); // Eastern Europe
  drawLand(0.47, 0.26, 0.02, 0.02, green); // Iberian peninsula
  drawLand(0.50, 0.27, 0.02, 0.02, green); // Italy

  // === AFRICA ===
  drawLand(0.50, 0.40, 0.06, 0.08, green); // West/Central Africa
  drawLand(0.52, 0.35, 0.05, 0.04, desert); // Sahara
  drawLand(0.53, 0.48, 0.04, 0.06, greenLight); // East Africa
  drawLand(0.52, 0.58, 0.03, 0.04, green); // Southern Africa
  drawLand(0.50, 0.32, 0.03, 0.02, green); // North Africa coast

  // === ASIA ===
  drawLand(0.60, 0.22, 0.06, 0.05, green); // Central Asia
  drawLand(0.65, 0.20, 0.08, 0.06, greenDark); // Siberia/Russia
  drawLand(0.62, 0.30, 0.04, 0.04, green); // China
  drawLand(0.60, 0.35, 0.03, 0.03, greenLight); // Southeast Asia
  drawLand(0.58, 0.38, 0.02, 0.04, green); // India
  drawLand(0.68, 0.32, 0.04, 0.03, green); // East Asia
  drawLand(0.72, 0.28, 0.03, 0.02, green); // Japan/Korea
  drawLand(0.64, 0.25, 0.04, 0.03, desert); // Middle East
  drawLand(0.70, 0.35, 0.03, 0.02, green); // Indonesia

  // === AUSTRALIA ===
  drawLand(0.78, 0.62, 0.05, 0.03, desert); // Australia interior
  drawLand(0.77, 0.60, 0.04, 0.02, green); // Australia coast
  drawLand(0.80, 0.66, 0.02, 0.02, greenLight); // Tasmania

  // === ANTARCTICA ===
  drawLand(0.50, 0.96, 0.30, 0.04, ice);

  // === ARCTIC ===
  drawLand(0.50, 0.04, 0.15, 0.03, ice);

  // Add subtle terrain texture noise
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    // Only add noise to land pixels (green channel > blue channel significantly)
    if (data[i + 1] > data[i + 2] + 20 && data[i + 1] > 50) {
      const noise = (Math.sin(x * 0.15) * Math.cos(y * 0.12) * 15) +
                     (Math.sin(x * 0.07 + y * 0.05) * 10) +
                     (Math.sin(x * 0.3) * Math.sin(y * 0.25) * 5);
      data[i] = Math.max(0, Math.min(255, data[i] + noise * 0.5));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.3));
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Draw latitude/longitude grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;

  // Latitude lines (horizontal)
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Longitude lines (vertical)
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Equator (brighter)
  const equatorY = height / 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, equatorY);
  ctx.lineTo(width, equatorY);
  ctx.stroke();

  // Prime meridian (brighter)
  const primeX = width / 2;
  ctx.beginPath();
  ctx.moveTo(primeX, 0);
  ctx.lineTo(primeX, height);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Create star field background
function createStars(count: number = 3000): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    // Distribute stars in a sphere
    const r = 80 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    // Star color variation (white to slightly blue/yellow)
    const colorChoice = Math.random();
    if (colorChoice > 0.9) {
      // Blue-white stars
      colors[i3] = 0.8;
      colors[i3 + 1] = 0.85;
      colors[i3 + 2] = 1.0;
    } else if (colorChoice > 0.8) {
      // Yellow stars
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.95;
      colors[i3 + 2] = 0.8;
    } else {
      // White stars
      colors[i3] = 1.0;
      colors[i3 + 1] = 1.0;
      colors[i3 + 2] = 1.0;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}

// Opening view: centred between Dhaka (90.4 E) and Helsinki (24.9 E), so both countries face the viewer.
const START_LON = 57.5;
const START_LAT_TILT = 0.55; // radians, tips the north pole toward the viewer
const START_ROT_Y = -((START_LON + 90) * Math.PI) / 180;

/** Thin white outlines of Bangladesh and Finland, drawn as real 3D lines so they stay sharp at any zoom. */
function createBorderLines(width: number, height: number) {
  const group = new THREE.Group();
  const geometries: LineGeometry[] = [];
  const core = new LineMaterial({ color: 0xffffff, linewidth: 1.1, alphaToCoverage: true });
  const glow = new LineMaterial({ color: 0xffffff, linewidth: 3.2, transparent: true, opacity: 0.14, depthWrite: false });
  const materials = [core, glow];
  materials.forEach((m) => m.resolution.set(width, height));
  for (const rings of Object.values(HIGHLIGHT_BORDERS)) {
    for (const ring of rings) {
      const positions: number[] = [];
      for (const [lon, lat] of ring) {
        const v = latLonToVector3(lat, lon, 1.007);
        positions.push(v.x, v.y, v.z);
      }
      positions.push(positions[0], positions[1], positions[2]); // close the outline
      const geometry = new LineGeometry();
      geometry.setPositions(positions);
      geometries.push(geometry);
      const glowLine = new Line2(geometry, glow);
      glowLine.renderOrder = 3;
      const coreLine = new Line2(geometry, core);
      coreLine.renderOrder = 4;
      group.add(glowLine, coreLine);
    }
  }
  return { group, geometries, materials };
}

// Globe renderer class
export class GlobeRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private globe: THREE.Mesh;
  private atmosphere: THREE.Mesh;
  private cloudLayer: THREE.Mesh;
  private markers: THREE.Group;
  private dayNightOverlay: THREE.Mesh;
  private borderGroup!: THREE.Group;
  private borderGeometries: LineGeometry[] = [];
  private borderMaterials: LineMaterial[] = [];
  private sunEarthFixed = new THREE.Vector3(1, 0, 0);
  private stars: THREE.Points;
  private directionalLight: THREE.DirectionalLight;
  private animationId: number = 0;
  private isRunning = false;

  // Rotation state
  private rotationX = START_LAT_TILT;
  private rotationY = START_ROT_Y;
  private targetRotationX = START_LAT_TILT;
  private targetRotationY = START_ROT_Y;
  private autoRotate = false; // the view stays where the visitor puts it
  private autoRotateSpeed = 0.001;
  private baseZoom = 3; // camera distance that shows the whole globe for the current shape of the box
  private zoom = 3;
  private targetZoom = 3;
  private cloudRotationOffset = 0;
  private reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Damping factors for smooth camera movement
  private damping = 0.05;
  

  // Callbacks
  private onRender?: () => void;

  constructor(private container: HTMLElement) {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.baseZoom = this.fitZoom(container.clientWidth || 1, container.clientHeight || 1);
    this.zoom = this.targetZoom = this.baseZoom;
    this.camera.position.z = this.zoom;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(5, 3, 5);
    this.scene.add(this.directionalLight);

    // Globe sphere with NASA-based textures
    const geometry = new THREE.SphereGeometry(1, 128, 64);
    const textureLoader = new THREE.TextureLoader();

    // Day map: real image if present, otherwise the procedurally drawn Earth
    let earthDayTexture: THREE.Texture;
    let nightTexture: THREE.Texture;
    if (earthTexturesAvailable) {
      earthDayTexture = textureLoader.load(EARTH_TEXTURES.day, undefined, undefined, () => {
        console.warn('Earth texture load failed, using procedural fallback');
        const fallbackTexture = createEarthTexture(2048, 1024);
        (this.globe.material as THREE.ShaderMaterial).uniforms.dayTexture.value = fallbackTexture;
        (this.globe.material as THREE.ShaderMaterial).needsUpdate = true;
      });
      nightTexture = textureLoader.load(EARTH_TEXTURES.night);
    } else {
      earthDayTexture = createEarthTexture(2048, 1024);
      const black = document.createElement('canvas');
      black.width = black.height = 2;
      const bctx = black.getContext('2d');
      if (bctx) {
        bctx.fillStyle = '#000';
        bctx.fillRect(0, 0, 2, 2);
      }
      nightTexture = new THREE.CanvasTexture(black);
    }
    earthDayTexture.colorSpace = THREE.SRGBColorSpace;
    nightTexture.colorSpace = THREE.SRGBColorSpace;

    // Custom shader material for day/night blending
    const earthMaterial = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: earthDayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        twilightWidth: { value: 0.15 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        void main() {
          vUv = uv;
          // Object-space normal: the Sun direction is given in Earth-fixed coordinates, so the
          // day/night line stays correct however the globe is turned.
          vWorldNormal = normalize(normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        uniform float twilightWidth;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        void main() {
          vec3 normal = normalize(vWorldNormal);
          float NdotL = dot(normal, sunDirection);
          float dayFactor = smoothstep(-twilightWidth, twilightWidth, NdotL);
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          // Night side: city lights plus a faint moonlit view of land and sea so it never goes fully black.
          vec3 nightColor = texture2D(nightTexture, vUv).rgb * 1.6 + dayColor * 0.09 * vec3(0.55, 0.7, 1.0);
          vec3 color = mix(nightColor, dayColor * (max(0.0, NdotL) * 0.55 + 0.5), dayFactor);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    this.globe = new THREE.Mesh(geometry, earthMaterial);
    this.scene.add(this.globe);

    // Cloud layer (slightly larger sphere with cloud texture)
    const cloudGeometry = new THREE.SphereGeometry(1.01, 64, 32);
    const cloudTexture = earthTexturesAvailable ? textureLoader.load(EARTH_TEXTURES.clouds) : null;
    const cloudMaterial = new THREE.MeshStandardMaterial({
      // The cloud image is grey on black (no transparency), so it is used as the opacity map.
      ...(cloudTexture ? {alphaMap: cloudTexture} : {}),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.cloudLayer = new THREE.Mesh(cloudGeometry, cloudMaterial);
    this.cloudLayer.visible = cloudTexture !== null;
    this.scene.add(this.cloudLayer);

    // Atmosphere glow (reduced intensity for realism)
    const atmosphereGeometry = new THREE.SphereGeometry(1.04, 64, 32);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        glowColor: { value: new THREE.Color(0x4a90d9) },
        intensity: { value: 0.3 },
        power: { value: 3.0 },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(this.atmosphere);

    // City markers
    this.markers = new THREE.Group();
    this.scene.add(this.markers);
    this.createMarkers();

    // Day/night overlay
    const dayNightGeometry = new THREE.SphereGeometry(1.005, 64, 32);
    const dayNightMaterial = new THREE.ShaderMaterial({
      vertexShader: dayNightVertexShader,
      fragmentShader: dayNightFragmentShader,
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        nightColor: { value: new THREE.Color(0x050510) },
        nightOpacity: { value: 0.6 },
        twilightWidth: { value: 0.12 },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    this.dayNightOverlay = new THREE.Mesh(dayNightGeometry, dayNightMaterial);
    this.dayNightOverlay.visible = false;
    this.scene.add(this.dayNightOverlay);

    // Stars
    this.stars = createStars(3000);
    this.scene.add(this.stars);

    // White outlines of Bangladesh and Finland
    const borders = createBorderLines(this.container.clientWidth || 1, this.container.clientHeight || 1);
    this.borderGroup = borders.group;
    this.borderGeometries = borders.geometries;
    this.borderMaterials = borders.materials;
    this.scene.add(this.borderGroup);

    // Start with the real Sun position for the current time
    this.updateSunDirection(new Date());
  }

  private createMarkers() {
    CITIES.forEach((city) => {
      const pos = latLonToVector3(city.lat, city.lon, 1.02);
      const color = city.id === 'dhaka' ? 0xf59e0b : 0x3b82f6;

      // Marker dot
      const markerGeo = new THREE.SphereGeometry(0.012, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(pos);
      this.markers.add(marker);

      // Pulse ring
      const ringGeo = new THREE.RingGeometry(0.015, 0.022, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      this.markers.add(ring);
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.update();
      this.renderer.render(this.scene, this.camera);
      this.onRender?.();
    };
    animate();
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationId);
  }

  private update() {
    // Smooth damping for rotation
    this.rotationX += (this.targetRotationX - this.rotationX) * this.damping;
    this.rotationY += (this.targetRotationY - this.rotationY) * this.damping;
    this.zoom += (this.targetZoom - this.zoom) * this.damping;

    // Auto rotation
    if (this.autoRotate) {
      this.targetRotationY += this.autoRotateSpeed;
    }

    // Apply rotation to all globe objects
    const rotX = this.rotationX;
    const rotY = this.rotationY;

    this.globe.rotation.x = rotX;
    this.globe.rotation.y = rotY;
    this.cloudLayer.rotation.x = rotX;
    this.cloudLayer.rotation.y = rotY + this.cloudRotationOffset;
    if (!this.reducedMotion) this.cloudRotationOffset += 0.0002; // clouds stay still for visitors who asked for less motion
    this.atmosphere.rotation.x = rotX;
    this.atmosphere.rotation.y = rotY;
    this.markers.rotation.x = rotX;
    this.markers.rotation.y = rotY;
    this.dayNightOverlay.rotation.x = rotX;
    this.dayNightOverlay.rotation.y = rotY;
    this.borderGroup.rotation.x = rotX;
    this.borderGroup.rotation.y = rotY;

    // The light for the cloud layer follows the real Sun, turned together with the globe
    this.directionalLight.position.copy(this.sunEarthFixed).applyEuler(this.globe.rotation).multiplyScalar(5);

    // Update camera zoom
    this.camera.position.z = this.zoom;
  }

  updateSunDirection(date: Date) {
    const sunDir = sunDirection(date);
    const sunVec = new THREE.Vector3(sunDir.x, sunDir.y, sunDir.z).normalize();
    this.sunEarthFixed.copy(sunVec);

    // Update day/night overlay shader
    const dnMaterial = this.dayNightOverlay.material as THREE.ShaderMaterial;
    dnMaterial.uniforms.sunDirection.value.copy(sunVec);

    // Update Earth shader sun direction for day/night blending
    const earthMaterial = this.globe.material as THREE.ShaderMaterial;
    if (earthMaterial.uniforms) {
      earthMaterial.uniforms.sunDirection.value.copy(sunVec);
    }

  }

  // Set the current visualization mode
  setMode(mode: 'living-globe' | 'day-night') {
    this.dayNightOverlay.visible = mode === 'day-night';

    // Adjust lighting based on mode
    const ambientLight = this.scene.children.find(
      (obj) => obj instanceof THREE.AmbientLight
    ) as THREE.AmbientLight | undefined;

    if (mode === 'day-night') {
      if (ambientLight) ambientLight.intensity = 0.15;
      this.directionalLight.intensity = 1.5;
    } else {
      if (ambientLight) ambientLight.intensity = 0.4;
      this.directionalLight.intensity = 1.0;
    }
  }

  rotate(deltaX: number, deltaY: number) {
    this.targetRotationY += deltaX * 0.005;
    this.targetRotationX += deltaY * 0.005;
    this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX));
  }

  zoomIn(amount: number) {
    this.targetZoom = Math.max(1.5, this.targetZoom - amount);
  }

  zoomOut(amount: number) {
    this.targetZoom = Math.min(Math.max(6, this.baseZoom + 1), this.targetZoom + amount);
  }

  resetView() {
    this.targetRotationX = START_LAT_TILT;
    this.targetRotationY = START_ROT_Y;
    this.targetZoom = this.baseZoom;
    this.autoRotate = false;
  }

  setAutoRotate(enabled: boolean) {
    this.autoRotate = enabled;
  }

  isAutoRotating(): boolean {
    return this.autoRotate;
  }

  /** Distance at which the whole globe fits the box, also in a narrow (portrait) box. */
  private fitZoom(width: number, height: number): number {
    const aspect = width / height;
    return Math.max(3, 2.8 / aspect);
  }

  resize(width: number, height: number) {
    if (width > 0 && height > 0) {
      const wasAtBase = Math.abs(this.targetZoom - this.baseZoom) < 0.01;
      this.baseZoom = this.fitZoom(width, height);
      if (wasAtBase) this.targetZoom = this.baseZoom;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // follows browser zoom and moving between screens
      this.renderer.setSize(width, height);
      this.borderMaterials.forEach((m) => m.resolution.set(width, height));
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  dispose() {
    this.stop();
    this.renderer.dispose();
    this.globe.geometry.dispose();
    (this.globe.material as THREE.Material).dispose();
    this.cloudLayer.geometry.dispose();
    (this.cloudLayer.material as THREE.Material).dispose();
    this.atmosphere.geometry.dispose();
    (this.atmosphere.material as THREE.Material).dispose();
    this.dayNightOverlay.geometry.dispose();
    (this.dayNightOverlay.material as THREE.Material).dispose();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.borderGeometries.forEach((g) => g.dispose());
    this.borderMaterials.forEach((m) => m.dispose());
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setOnRender(callback: () => void) {
    this.onRender = callback;
  }
}
