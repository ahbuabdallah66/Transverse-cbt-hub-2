/**
 * Hardware & Canvas Fingerprinting Engine
 * Produces a stable, unique Hardware ID (HID) based on hardware-level attributes:
 * - Canvas 2D render pipeline (GPU rasterization, anti-aliasing curve, blend algorithms)
 * - WebGL unmasked vendor & renderer (physical GPU model)
 * - System architecture (hardwareConcurrency, deviceMemory)
 * - Screen geometry & pixel depth
 * - AudioContext dynamics
 */

function generateCanvasSignature(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas-2d';

    // Complex geometry, blending, and text baseline to extract rasterizer differences
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', sans-serif";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.fillText('CBT-LOCK-ID: 739.02 α', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('CBT-LOCK-ID: 739.02 α', 4, 17);

    // Canvas arc and composite
    ctx.beginPath();
    ctx.arc(50, 40, 15, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = 'rgb(255, 0, 128)';
    ctx.fill();

    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

function getWebGLHardwareInfo(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return { vendor: 'no-webgl', renderer: 'no-webgl' };

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return {
        vendor: gl.getParameter(gl.VENDOR) || 'generic-vendor',
        renderer: gl.getParameter(gl.RENDERER) || 'generic-renderer',
      };
    }

    return {
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unmasked-vendor',
      renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unmasked-renderer',
    };
  } catch {
    return { vendor: 'webgl-err', renderer: 'webgl-err' };
  }
}

/**
 * Murmur-style 32-bit hash function for string inputs
 */
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export interface HardwareFingerprint {
  hardwareId: string; // Formatted unique ID e.g. "HID-8a7f-4319-be82"
  gpuRenderer: string;
  cores: number;
  memoryGb?: number;
  screenRes: string;
  colorDepth: number;
  canvasHash: string;
}

/**
 * Computes the unique deterministic Hardware ID from machine properties
 */
export function generateHardwareFingerprint(): HardwareFingerprint {
  const canvasSig = generateCanvasSignature();
  const canvasHash = cyrb53(canvasSig);
  const webgl = getWebGLHardwareInfo();

  const nav = typeof window !== 'undefined' ? window.navigator : ({} as any);
  const scr = typeof window !== 'undefined' ? window.screen : ({} as any);

  const cores = nav.hardwareConcurrency || 4;
  const memoryGb = (nav as any).deviceMemory || 8;
  const screenRes = `${scr.width || 1920}x${scr.height || 1080}@${window.devicePixelRatio || 1}`;
  const colorDepth = scr.colorDepth || 24;
  const platform = nav.platform || 'platform';

  // Combine immutable hardware components
  const rawEntropy = [
    canvasHash,
    webgl.vendor,
    webgl.renderer,
    cores,
    memoryGb,
    screenRes,
    colorDepth,
    platform,
  ].join(':::');

  const primaryHash = cyrb53(rawEntropy, 1024);
  const secondaryHash = cyrb53(rawEntropy, 2048);

  const formattedHardwareId = `HID-${primaryHash.substring(0, 4)}-${primaryHash.substring(4, 8)}-${secondaryHash.substring(0, 4)}`.toUpperCase();

  return {
    hardwareId: formattedHardwareId,
    gpuRenderer: webgl.renderer,
    cores,
    memoryGb,
    screenRes,
    colorDepth,
    canvasHash,
  };
}

export function getOrCreateDeviceId(): string {
  const STORAGE_KEY = 'cbt_unique_hardware_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    const fp = generateHardwareFingerprint();
    deviceId = fp.hardwareId;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}

export function getStoredUserSession(): { email: string; accessCode: string; fullName: string; gradeLevel: string } | null {
  const raw = localStorage.getItem('cbt_active_authenticated_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredUserSession(session: { email: string; accessCode: string; fullName: string; gradeLevel: string }): void {
  localStorage.setItem('cbt_active_authenticated_user', JSON.stringify(session));
  localStorage.setItem('cbt_active_access_code', session.accessCode);
}

export function clearStoredUserSession(): void {
  localStorage.removeItem('cbt_active_authenticated_user');
  localStorage.removeItem('cbt_active_access_code');
}

export function getStoredAccessCode(): string | null {
  return localStorage.getItem('cbt_active_access_code');
}

export function saveStoredAccessCode(code: string): void {
  localStorage.setItem('cbt_active_access_code', code);
}
