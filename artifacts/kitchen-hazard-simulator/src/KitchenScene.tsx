import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { Hazard, Zone } from './gameData';

type Target = { zone: Zone; hazard: Hazard; complete: boolean };
type Props = { targets: Target[]; onInspect: (zoneId: string) => void; mobileKeys: string[] };
type Camera = { x: number; z: number; yaw: number; pitch: number };
type Projected = { x: number; y: number; depth: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function KitchenScene({ targets, onInspect, mobileKeys }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>({ x: 0, z: -8, yaw: 0, pitch: 0 });
  const keysRef = useRef(new Set<string>());
  const targetsRef = useRef(targets);
  const onInspectRef = useRef(onInspect);
  const [nearby, setNearby] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  targetsRef.current = targets;
  onInspectRef.current = onInspect;

  const inspect = useCallback((zoneId: string) => onInspectRef.current(zoneId), []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
        keysRef.current.add(event.code);
      }
      if (event.code === 'KeyE' && nearby) inspect(nearby);
    };
    const keyup = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    const lockChange = () => setLocked(document.pointerLockElement === canvasRef.current);
    const mouseMove = (event: globalThis.MouseEvent) => {
      if (document.pointerLockElement === canvasRef.current) {
        cameraRef.current.yaw += event.movementX * 0.0024;
        cameraRef.current.pitch = clamp(cameraRef.current.pitch - event.movementY * 0.0018, -0.28, 0.35);
      }
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    document.addEventListener('pointerlockchange', lockChange);
    document.addEventListener('mousemove', mouseMove);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      document.removeEventListener('pointerlockchange', lockChange);
      document.removeEventListener('mousemove', mouseMove);
    };
  }, [inspect, nearby]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let previous = performance.now();
    let lastNearby: string | null = null;

    const project = (x: number, y: number, z: number, width: number, height: number): Projected => {
      const camera = cameraRef.current;
      const dx = x - camera.x;
      const dz = z - camera.z;
      const right = dx * Math.cos(camera.yaw) - dz * Math.sin(camera.yaw);
      const forward = dx * Math.sin(camera.yaw) + dz * Math.cos(camera.yaw);
      const vertical = y - 1.62;
      const cp = Math.cos(camera.pitch);
      const sp = Math.sin(camera.pitch);
      const depth = forward * cp + vertical * sp;
      const focal = width * 0.82;
      if (depth < 0.12) return { x: -9999, y: -9999, depth };
      return {
        x: width / 2 + right * focal / depth,
        y: height * 0.49 - (vertical * cp - forward * sp) * focal / depth,
        depth,
      };
    };

    const polygon = (points: [number, number, number][], color: string, alpha = 1) => {
      const p = points.map(([x, y, z]) => project(x, y, z, canvas.width, canvas.height));
      if (p.some((point) => point.depth < 0.12)) return;
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.moveTo(p[0].x, p[0].y);
      p.slice(1).forEach((point) => ctx!.lineTo(point.x, point.y));
      ctx!.closePath();
      ctx!.fill();
      ctx!.globalAlpha = 1;
    };

    const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, top?: string, side?: string) => {
      const x0 = x - w / 2; const x1 = x + w / 2;
      const y0 = y; const y1 = y + h;
      const z0 = z - d / 2; const z1 = z + d / 2;
      const faces = [
        { pts: [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]], shade: top ?? color },
        { pts: [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]], shade: side ?? color },
        { pts: [[x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1]], shade: side ?? color },
        { pts: [[x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1]], shade: color },
        { pts: [[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]], shade: color },
      ] as { pts: [number, number, number][]; shade: string }[];
      faces.sort((a, b) => {
        const avg = (face: typeof a) => face.pts.reduce((sum, p) => sum + (p[0] - cameraRef.current.x) * Math.sin(cameraRef.current.yaw) + (p[2] - cameraRef.current.z) * Math.cos(cameraRef.current.yaw), 0) / 4;
        return avg(b) - avg(a);
      });
      faces.forEach((face) => polygon(face.pts, face.shade));
    };

    const line = (a: [number, number, number], b: [number, number, number], color: string, width = 2) => {
      const pa = project(...a, canvas.width, canvas.height);
      const pb = project(...b, canvas.width, canvas.height);
      if (pa.depth <= 0 || pb.depth <= 0) return;
      ctx!.strokeStyle = color; ctx!.lineWidth = width;
      ctx!.beginPath(); ctx!.moveTo(pa.x, pa.y); ctx!.lineTo(pb.x, pb.y); ctx!.stroke();
    };

    const drawHazard = (hazard: Hazard, x: number, z: number, now: number) => {
      const gold = '#e9b867'; const vermilion = '#ed786b'; const steel = '#a7b6ad';
      switch (hazard.visual) {
        case 'handle':
          box(x, .94, z, .75, .15, .66, '#444e49', '#647169');
          box(x + .67, 1.02, z - .05, .62, .07, .09, '#b37b4e');
          box(x + 1.04, 1.02, z - .05, .12, .11, .1, '#d29b60');
          break;
        case 'oil':
          box(x, .94, z, .76, .17, .63, '#493a2d', '#9b6941');
          ctx!.fillStyle = '#c87543'; ctx!.beginPath();
          const oil = project(x, 1.13, z, canvas.width, canvas.height);
          if (oil.depth > 0) { ctx!.ellipse(oil.x, oil.y, Math.max(4, 35 / oil.depth), Math.max(2, 9 / oil.depth), 0, 0, Math.PI * 2); ctx!.fill(); }
          break;
        case 'oven':
          box(x, .05, z, 1.1, 1.2, .78, '#59645f', '#78857d');
          box(x, .34, z - .4, .76, .49, .05, '#1f2825', '#bd8d56');
          break;
        case 'tap':
          box(x, .94, z, 1, .11, .62, '#8c9a91', '#b6c0b8');
          box(x + .04, 1.2, z + .08, .08, .47, .08, '#a5b5ac');
          box(x + .22, 1.4, z + .08, .45, .08, .08, '#a5b5ac');
          line([x + .43,1.35,z + .08], [x + .43,.97,z + .08], '#75c4ca', 3);
          break;
        case 'bottle':
          box(x, .96, z, .27, .47, .25, '#c48a49', '#dfac62');
          box(x, 1.45, z, .12, .1, .12, '#d7c9a9');
          break;
        case 'puddle': {
          const p = project(x, .03, z, canvas.width, canvas.height);
          if (p.depth > .12) {
            ctx!.fillStyle = '#79b9b8'; ctx!.globalAlpha = .62;
            ctx!.beginPath(); ctx!.ellipse(p.x, p.y, Math.max(9, 45 / p.depth), Math.max(3, 12 / p.depth), -.1, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1;
          }
          break;
        }
        case 'knife':
          box(x, .98, z, .64, .025, .08, '#b9c4ba');
          line([x - .18,.995,z], [x + .38,.995,z], steel, 4);
          line([x - .34,.995,z], [x - .16,.995,z], '#986142', 5);
          break;
        case 'food':
          box(x, .99, z, .53, .22, .42, '#be8650', '#d0a26a');
          box(x, 1.24, z, .53, .025, .42, '#d9b987', '#e3c99d');
          break;
        case 'roll':
          box(x, 1, z, .58, .32, .27, '#e5ddc8', '#faf1db');
          line([x - .45,1.04,z], [x + .38,1.04,z], '#ddd2b8', 2);
          break;
        case 'box':
          box(x, 2.38, z, .8, .56, .65, '#ac774a', '#d0a06b');
          line([x - .39,2.65,z], [x + .39,2.65,z], '#e0b178', 2);
          break;
        case 'stack':
          box(x, .98, z, .67, .28, .55, '#87948b', '#adb6ac');
          box(x + .1, 1.29, z - .04, .67, .29, .55, '#c08953', '#d8a26b');
          box(x - .03, 1.59, z - .08, .67, .27, .55, '#738178', '#9ba79d');
          break;
        case 'ladder':
          line([x - .27,.05,z], [x - .23,1.7,z], '#c48b4d', 4);
          line([x + .25,.05,z + .18], [x + .2,1.7,z + .18], '#c48b4d', 4);
          for (let i = 0; i < 5; i++) line([x - .25,.24 + i * .28,z + .02], [x + .23,.24 + i * .28,z + .16], '#d6a268', 3);
          break;
        case 'door':
          box(x + .28, .12, z, .95, 1.85, .1, '#64736b', '#89958b');
          line([x - .2,.16,z], [x - .2,1.7,z], '#e1b873', 3);
          break;
        case 'fallen':
          box(x, .05, z, .46, .13, .4, '#d4a464', '#e8c17e');
          box(x + .16, .09, z + .16, .28, .15, .24, '#8d9d6e', '#b3be83');
          break;
        case 'cord':
          box(x, 1.03, z, .5, .7, .43, '#68776d', '#89948b');
          line([x + .24,.76,z], [x + .68,.17,z + .15], vermilion, 4);
          line([x + .68,.17,z + .15], [x + .95,.19,z + .15], '#c4c9bd', 4);
          break;
        case 'water-appliance':
          box(x, .17, z, 1.17, .17, .8, '#76b6b5', '#93ceca');
          box(x - .1, .3, z, .66, .62, .55, '#74847a', '#a5afa5');
          line([x + .24,.67,z - .1], [x + .54,.2,z - .14], vermilion, 3);
          break;
        case 'toaster':
          box(x, .95, z, .75, .45, .55, '#a4ada4', '#c5ccc2');
          box(x, 1.18, z - .28, .4, .04, .04, vermilion);
          break;
      }
      const marker = project(x, hazard.visual === 'puddle' || hazard.visual === 'fallen' ? .18 : 1.85, z, canvas.width, canvas.height);
      if (marker.depth > 0 && marker.x > -80 && marker.x < canvas.width + 80) {
        const radius = Math.max(5, 14 / marker.depth);
        const bob = Math.sin(now / 380) * 2;
        ctx!.strokeStyle = '#e7c87d'; ctx!.lineWidth = 1.5;
        ctx!.beginPath(); ctx!.arc(marker.x, marker.y + bob, radius, 0, Math.PI * 2); ctx!.stroke();
        ctx!.fillStyle = gold; ctx!.beginPath(); ctx!.arc(marker.x, marker.y + bob, 2.5, 0, Math.PI * 2); ctx!.fill();
      }
    };

    const render = (time: number) => {
      const width = canvas.clientWidth; const height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * devicePixelRatio) || canvas.height !== Math.round(height * devicePixelRatio)) {
        canvas.width = Math.round(width * devicePixelRatio); canvas.height = Math.round(height * devicePixelRatio);
      }
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      const w = width; const h = height;
      ctx!.fillStyle = '#161e1b'; ctx!.fillRect(0, 0, w, h);
      const keys = keysRef.current;
      const camera = cameraRef.current;
      let forward = Number(keys.has('KeyW') || keys.has('ArrowUp') || mobileKeys.includes('forward')) - Number(keys.has('KeyS') || keys.has('ArrowDown') || mobileKeys.includes('back'));
      let strafe = Number(keys.has('KeyD') || keys.has('ArrowRight') || mobileKeys.includes('right')) - Number(keys.has('KeyA') || keys.has('ArrowLeft') || mobileKeys.includes('left'));
      const len = Math.hypot(forward, strafe) || 1;
      const pace = 3.3 * Math.min(0.04, Math.max(0, (time - previous) / 1000));
      const nx = camera.x + (Math.sin(camera.yaw) * forward + Math.cos(camera.yaw) * strafe) / len * pace;
      const nz = camera.z + (Math.cos(camera.yaw) * forward - Math.sin(camera.yaw) * strafe) / len * pace;
      const obstructed = (x: number, z: number) => targetsRef.current.some(({ zone }) => Math.abs(x - zone.position[0]) < 1.05 && Math.abs(z - zone.position[1]) < .85);
      if (Math.abs(nx) < 6.8 && !obstructed(nx, camera.z)) camera.x = nx;
      if (nz > -8.5 && nz < 8.3 && !obstructed(camera.x, nz)) camera.z = nz;
      previous = time;
      const bg = ctx!.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#182421'); bg.addColorStop(.55, '#26332d'); bg.addColorStop(1, '#202621');
      ctx!.fillStyle = bg; ctx!.fillRect(0, 0, w, h);
      polygon([[-7,0,-9],[7,0,-9],[7,0,9],[-7,0,9]], '#444741');
      polygon([[-7,0,9],[7,0,9],[7,4,9],[-7,4,9]], '#35423c');
      polygon([[-7,0,-9],[-7,0,9],[-7,4,9],[-7,4,-9]], '#2c3934');
      polygon([[7,0,9],[7,0,-9],[7,4,-9],[7,4,9]], '#2b3833');
      polygon([[-7,4,9],[7,4,9],[7,4,-9],[-7,4,-9]], '#222c28');
      for (let x = -6; x <= 6; x += 1.2) line([x,.006,-8.5],[x,.006,8.5], '#66665b', .7);
      for (let z = -8; z <= 8; z += 1.2) line([-6.5,.008,z],[6.5,.008,z], '#66665b', .7);
      // Stainless back line, extraction canopy and overhead work lights.
      box(0, 2.95, 8.35, 12.8, 1.8, .55, '#617069', '#859187', '#4a5750');
      box(-4.5, 3.68, 7.96, 4, .42, 1.25, '#849088', '#b0b8ae');
      box(0, 3.68, 7.96, 3.9, .42, 1.25, '#849088', '#b0b8ae');
      box(4.5, 3.68, 7.96, 4, .42, 1.25, '#849088', '#b0b8ae');
      for (const x of [-5, -1.7, 1.7, 5]) {
        const lamp = project(x, 3.86, 5.4, w, h);
        if (lamp.depth > .1) {
          ctx!.fillStyle = '#d8d5b0'; ctx!.globalAlpha = .65;
          ctx!.beginPath(); ctx!.ellipse(lamp.x, lamp.y, Math.max(9, 80 / lamp.depth), Math.max(2, 8 / lamp.depth), 0, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1;
        }
      }
      for (const { zone, hazard, complete } of targetsRef.current) {
        const [x, z] = zone.position;
        // Zone-specific working equipment and stainless work benches.
        if (zone.id === 'cooking') {
          box(x, .03, z, 2.3, .92, 1.2, '#59645e', '#a5afa7');
          box(x, .96, z, 1.8, .15, 1, '#909c93', '#bec6bb');
          for (let i = -1; i <= 1; i += 2) { box(x + i * .53, 1.12, z, .55, .08, .55, '#292e2b', '#707970'); }
          box(x, 1.85, z + .48, 2.3, 1.25, .18, '#67736a', '#9ba69b');
        } else if (zone.id === 'sink') {
          box(x, .9, z, 2.25, .86, 1.15, '#6b7b72', '#b4beb5');
          box(x, 1.35, z - .2, .86, .12, .72, '#77877e', '#9ca99f');
          box(x - .63, 1.13, z + .04, .08, .08, .08, '#b5beb3');
        } else if (zone.id === 'prep') {
          box(x, .92, z, 2.35, .88, 1.13, '#596961', '#c2c8b8');
          box(x, 1.4, z - .44, 2.32, .06, .1, '#857352', '#b39b70');
        } else if (zone.id === 'storage') {
          for (const y of [.5, 1.42, 2.32]) box(x, y, z + .45, 2.05, .08, .78, '#9a9e90', '#c4c3b1');
          for (const xx of [-.96, .96]) box(x + xx, .06, z + .55, .1, 2.65, .75, '#69766e');
        } else if (zone.id === 'refrigerator') {
          box(x, .08, z + .55, 1.8, 2.55, .82, '#738179', '#a3ada2');
          box(x, 1.32, z + .1, 1.54, 2.35, .07, '#53625a', '#829086');
          line([x + .5,.45,z + .03], [x + .5,2.05,z + .03], '#d5bd8a', 3);
        } else {
          box(x, .9, z, 2.2, .88, 1.12, '#64736a', '#b3bbb0');
          box(x - .5, 1.6, z - .15, .7, .5, .65, '#67786e', '#9da89e');
          box(x + .48, 1.54, z - .15, .7, .6, .65, '#69766e', '#aab4a8');
        }
        // Signage anchors each work area without naming its hidden condition.
        const sign = project(x, 2.85, z + .96, w, h);
        if (sign.depth > .2 && sign.x > -140 && sign.x < w + 140) {
          const sw = Math.max(54, Math.min(160, 172 / sign.depth));
          const sh = Math.max(19, 35 / sign.depth);
          ctx!.fillStyle = '#28342f'; ctx!.fillRect(sign.x - sw / 2, sign.y - sh / 2, sw, sh);
          ctx!.strokeStyle = '#829184'; ctx!.lineWidth = 1; ctx!.strokeRect(sign.x - sw / 2, sign.y - sh / 2, sw, sh);
          ctx!.font = `600 ${Math.max(8, Math.min(12, 12 / sign.depth))}px "DM Sans", sans-serif`;
          ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'; ctx!.fillStyle = '#dbe0d6';
          ctx!.fillText(zone.name.toUpperCase(), sign.x, sign.y);
        }
        const hx = x + (zone.id === 'cooking' ? .55 : 0);
        const hz = z - (zone.id === 'refrigerator' ? .2 : .5);
        if (!complete) drawHazard(hazard, hx, hz, time);
        else {
          const done = project(hx, .13, hz, w, h);
          if (done.depth > .1) { ctx!.fillStyle = '#b8d877'; ctx!.font = '500 13px "DM Mono", monospace'; ctx!.textAlign = 'center'; ctx!.fillText('SAFE', done.x, done.y); }
        }
      }
      const available = targetsRef.current.filter((item) => !item.complete).map((item) => ({
        id: item.zone.id,
        d: Math.hypot(camera.x - item.zone.position[0], camera.z - item.zone.position[1]),
        point: project(item.zone.position[0], 1.75, item.zone.position[1] - .5, w, h),
      })).filter((t) => t.d < 3.7);
      const nearest = available.sort((a, b) => a.d - b.d)[0];
      const nextNearby = nearest?.id ?? null;
      if (lastNearby !== nextNearby) { lastNearby = nextNearby; setNearby(nextNearby); }
      // Small reticle and peripheral vignette retain a first-person reading.
      const vignette = ctx!.createRadialGradient(w / 2, h / 2, h * .15, w / 2, h / 2, Math.max(w, h) * .72);
      vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,.38)');
      ctx!.fillStyle = vignette; ctx!.fillRect(0, 0, w, h);
      if (nearest) {
        const p = nearest.point;
        const r = 18;
        ctx!.strokeStyle = '#d4ec83'; ctx!.lineWidth = 1.5;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, r, 0, Math.PI * 2); ctx!.stroke();
        ctx!.fillStyle = '#d4ec83'; ctx!.beginPath(); ctx!.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx!.fill();
      } else {
        ctx!.strokeStyle = 'rgba(232,235,222,.65)'; ctx!.lineWidth = 1;
        ctx!.beginPath(); ctx!.moveTo(w / 2 - 7,h / 2); ctx!.lineTo(w / 2 + 7,h / 2); ctx!.moveTo(w / 2,h / 2 - 7); ctx!.lineTo(w / 2,h / 2 + 7); ctx!.stroke();
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [mobileKeys]);

  const clickScene = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left; const y = event.clientY - rect.top;
    const camera = cameraRef.current;
    const width = rect.width; const height = rect.height;
    const clicked = targetsRef.current.map(({ zone, complete }) => {
      if (complete) return { id: zone.id, d: Infinity };
      const dx = zone.position[0] - camera.x; const dz = zone.position[1] - camera.z;
      const right = dx * Math.cos(camera.yaw) - dz * Math.sin(camera.yaw);
      const depth = dx * Math.sin(camera.yaw) + dz * Math.cos(camera.yaw);
      if (depth < .1) return { id: zone.id, d: Infinity };
      const focal = width * .82;
      const px = width / 2 + right * focal / depth;
      const py = height * .49 - (1.75 - 1.62) * focal / depth;
      const d = Math.hypot(camera.x - zone.position[0], camera.z - zone.position[1]);
      return { id: zone.id, d: d < 4.1 && Math.hypot(px - x, py - y) < 72 ? Math.hypot(px - x, py - y) : Infinity };
    }).sort((a, b) => a.d - b.d)[0];
    if (clicked && Number.isFinite(clicked.d)) inspect(clicked.id);
    else if (!locked) canvasRef.current?.requestPointerLock?.();
  };

  const lookByDrag = useRef(false);
  return (
    <div className="scene-wrap" data-testid="scene-kitchen">
      <canvas
        ref={canvasRef}
        className="kitchen-canvas"
        aria-label="Walkable first-person 3D commercial kitchen. Use WASD or arrow keys to move and mouse to look."
        onClick={clickScene}
        onMouseDown={() => { lookByDrag.current = true; }}
        onMouseUp={() => { lookByDrag.current = false; }}
        onMouseMove={(event) => {
          if (lookByDrag.current && document.pointerLockElement !== canvasRef.current) {
            cameraRef.current.yaw += event.movementX * .0026;
            cameraRef.current.pitch = clamp(cameraRef.current.pitch - event.movementY * .002, -.28, .35);
          }
        }}
        onContextMenu={(event) => event.preventDefault()}
        tabIndex={0}
        data-testid="canvas-kitchen"
      />
      <div className="scene-edge-label"><span className="live-dot" /> LIVE WALKTHROUGH</div>
      {nearby && (
        <button className="scene-inspect" onClick={() => inspect(nearby)} data-testid={`button-inspect-${nearby}`}>
          Inspect nearby <span>↵</span>
        </button>
      )}
      <div className="scene-coordinate" aria-hidden="true"><span>CAM</span> {cameraRef.current.x.toFixed(1)} / {cameraRef.current.z.toFixed(1)}</div>
      {locked && <button className="lock-release" onClick={() => document.exitPointerLock()} data-testid="button-release-pointer">Release mouse · Esc</button>}
    </div>
  );
}
