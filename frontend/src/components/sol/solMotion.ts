import * as THREE from 'three';

export interface SolMotionState {
  clientX: number;
  clientY: number;
  clickPulse: number;
  lastClickTime: number;
  lastClickPos: { x: number; y: number } | null;
}

export const solMotionState: SolMotionState = {
  clientX: typeof window !== 'undefined' ? window.innerWidth / 2 : 640,
  clientY: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
  clickPulse: 0,
  lastClickTime: 0,
  lastClickPos: null
};

let listenersInitialized = false;

export function initSolMotionListeners(): () => void {
  if (typeof window === 'undefined' || listenersInitialized) {
    return () => {};
  }
  listenersInitialized = true;

  const onPointerMove = (e: PointerEvent) => {
    solMotionState.clientX = e.clientX;
    solMotionState.clientY = e.clientY;
  };

  const onPointerDown = (e: PointerEvent) => {
    solMotionState.clickPulse = 1.0;
    solMotionState.lastClickTime = performance.now();
    solMotionState.lastClickPos = { x: e.clientX, y: e.clientY };
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });

  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    listenersInitialized = false;
  };
}

/**
 * Computes smooth target yaw, pitch, roll, and physical position offsets for SolAvatar
 * based on the cursor position relative to the avatar container on screen.
 */
export function calculateSolGaze(
  rect: DOMRect | null,
  isHovered: boolean,
  delta: number,
  currentRot: THREE.Euler,
  currentPos: THREE.Vector3,
  clockTime: number
): {
  rotation: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  emissiveBoost: number;
} {
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Default to bottom-right position if no DOMRect is available
  let avatarCenterX = screenWidth - 70;
  let avatarCenterY = screenHeight - 70;

  if (rect && rect.width > 0 && rect.height > 0) {
    avatarCenterX = rect.left + rect.width / 2;
    avatarCenterY = rect.top + rect.height / 2;
  }

  // Vector from avatar center to mouse cursor
  const dx = solMotionState.clientX - avatarCenterX;
  const dy = solMotionState.clientY - avatarCenterY;

  // Normalized screen offsets
  const nx = dx / (screenWidth || 1);
  const ny = dy / (screenHeight || 1);

  // Target yaw: robot turns left/right to look directly toward cursor
  // When cursor is far to the left (nx < 0), yaw rotates to face left
  const targetYaw = THREE.MathUtils.clamp(nx * 1.25, -1.25, 0.5);

  // Target pitch: tilts upward when cursor is above avatar (ny < 0)
  const targetPitch = THREE.MathUtils.clamp(ny * 0.55, -0.6, 0.35);

  // Target roll: subtle aerodynamic lean into rotation
  const targetRoll = THREE.MathUtils.clamp(nx * 0.14, -0.15, 0.15);

  // Hover response: leans forward towards user
  const hoverPitchOffset = isHovered ? -0.14 : 0;
  const hoverZOffset = isHovered ? 0.08 : 0;

  // Click physics: responsive spring bounce & energetic nod
  const timeSinceClick = (performance.now() - solMotionState.lastClickTime) / 1000;
  let clickBounceY = 0;
  let clickNodX = 0;

  if (timeSinceClick < 0.6) {
    const envelope = Math.exp(-timeSinceClick * 6.5);
    clickBounceY = Math.sin(timeSinceClick * 22) * 0.09 * envelope;
    clickNodX = Math.sin(timeSinceClick * 18) * 0.12 * envelope;
  }

  // Decay click pulse for visor lighting
  solMotionState.clickPulse = THREE.MathUtils.damp(solMotionState.clickPulse, 0, 5, delta);

  // Smooth lerp for rotations
  const lerpSpeed = isHovered ? 6.5 : 4.5;
  const rotX = THREE.MathUtils.lerp(currentRot.x, targetPitch + hoverPitchOffset + clickNodX, delta * lerpSpeed);
  const rotY = THREE.MathUtils.lerp(currentRot.y, targetYaw, delta * lerpSpeed);
  const rotZ = THREE.MathUtils.lerp(currentRot.z, targetRoll, delta * lerpSpeed);

  // Parallax floating drift
  const driftX = THREE.MathUtils.clamp(nx * 0.12, -0.15, 0.15);
  const driftY = THREE.MathUtils.clamp(-ny * 0.08, -0.1, 0.1);
  const naturalBob = Math.sin(clockTime * 2.2) * 0.055;

  const posX = THREE.MathUtils.lerp(currentPos.x, driftX, delta * 3.5);
  const posY = THREE.MathUtils.lerp(currentPos.y, -1.35 + naturalBob + driftY + clickBounceY, delta * 5);
  const posZ = THREE.MathUtils.lerp(currentPos.z, hoverZOffset, delta * 4);

  return {
    rotation: { x: rotX, y: rotY, z: rotZ },
    position: { x: posX, y: posY, z: posZ },
    emissiveBoost: solMotionState.clickPulse
  };
}
