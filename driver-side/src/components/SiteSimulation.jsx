import React, { useEffect, useMemo, useRef } from 'react';

// Live vector simulation of the machine on site. Everything that moves is driven by the operating mode:
//   digging     boom / stick / bucket cycle into the trench, dust at the bucket, tracks creep
//   travelling  the whole site scrolls past, tracks and rollers turn, the machine bobs
//   idling      engine idle: light vibration and exhaust only
//   slope_alert the scene tilts with the machine
// The operator silhouette disappears when the cab camera reports no driver, and a worker appears at the
// distance the proximity radar reports.

const W = 1025, H = 526;
const PIVOT = { x: 612, y: 232 };       // boom foot, on the front of the house
const BOOM_LEN = 294, STICK_LEN = 237;
const rad = (d) => (d * Math.PI) / 180;

const YELLOW = '#FFCD11', YELLOW_HI = '#FFDB4D', YELLOW_DK = '#C79A00', INK = '#15110a', STEEL = '#2a2c31';

// Seeded pebbles so the soil texture is stable between renders.
function pebbles(n, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: n }, () => ({
    x: rnd() * W, y: 270 + rnd() * 256, r: 1.5 + rnd() * 6,
    c: ['#a7804f', '#7b5a35', '#b58d5a', '#5a3f22', '#c49a66'][Math.floor(rnd() * 5)], o: 0.35 + rnd() * 0.5,
  }));
}

const EMBERS = [[70, 470, 2.4], [180, 452, 2], [330, 480, 2.6], [520, 430, 2], [610, 470, 2.4], [760, 440, 2], [880, 480, 2.6], [940, 424, 2], [420, 458, 2.2], [250, 500, 2]].map(([x, y, r]) => ({ x, y, r }));
// Where each part's red spot sits (machine coordinates). hydraulics / boom / bucket are placed each frame.
const FAULT_SPOT = { engine: { x: 790, y: 214 }, cooling: { x: 858, y: 246 }, fuel: { x: 840, y: 284 }, undercarriage: { x: 676, y: 336 }, cab: { x: 655, y: 268 } };
const PART_LABEL = { engine: 'Engine', cooling: 'Cooling', hydraulics: 'Hydraulics', fuel: 'Fuel tank', undercarriage: 'Undercarriage', cab: 'Cab', boom: 'Boom', bucket: 'Bucket' };
const SOIL_PATH = 'M0,326 L138,326 L190,418 L395,418 L428,366 L1025,366 L1025,526 L0,526 Z';
const TRENCH_LINE = 'M138,326 L190,418 L395,418 L428,366';

export default function SiteSimulation({ mode = 'idling', alerts = [], faults = [], dynamicTargets = [], tilt = 0, className = '', style }) {
  const modeRef = useRef(mode);
  const tiltRef = useRef(tilt);
  const targetRef = useRef(null);
  modeRef.current = mode;
  tiltRef.current = tilt;

  const driverPresent = !alerts.some(a => a.type === 'DRIVER_ABSENT');
  const human = dynamicTargets.filter(t => t.type === 'human').sort((a, b) => a.distanceM - b.distanceM)[0] || null;
  targetRef.current = human;

  const dots = useMemo(() => pebbles(150, 7), []);

  const r = useRef({});   // refs to the parts we animate
  const faultEls = useRef({});   // red defect markers, keyed by machine part
  const set = (k) => (el) => { r.current[k] = el; };

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf, last = performance.now(), t = 0, world = 0, track = 0, roll = 0;
    const el = r.current;

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; t += dt;
      const m = modeRef.current;
      const digging = m === 'digging' || m === 'excavating';
      const travelling = m === 'travelling';
      const slope = m === 'slope_alert';

      // ── arm ────────────────────────────────────────────────────────────────
      const cyc = t * 0.8 * Math.PI * 2 / 2.2;                    // one dig cycle ≈ 2.7 s
      let boom = 207.8, stick = 106.5, bucket = 8;
      if (digging) {
        boom += Math.sin(cyc) * 3.5;
        stick += Math.sin(cyc + 0.6) * 11;
        bucket += 22 + Math.sin(cyc + 1.6) * 26;
      } else if (travelling) {
        boom = 212 + Math.sin(t * 2.2) * 0.8; stick = 118; bucket = 40;     // arm tucked while driving
      } else {
        boom += Math.sin(t * 1.1) * 0.6; stick += Math.sin(t * 0.9) * 0.8; bucket += 14;
      }
      const E = { x: PIVOT.x + BOOM_LEN * Math.cos(rad(boom)), y: PIVOT.y + BOOM_LEN * Math.sin(rad(boom)) };
      const T = { x: E.x + STICK_LEN * Math.cos(rad(stick)), y: E.y + STICK_LEN * Math.sin(rad(stick)) };
      el.boom?.setAttribute('transform', `translate(${PIVOT.x} ${PIVOT.y}) rotate(${boom})`);
      el.stick?.setAttribute('transform', `translate(${E.x} ${E.y}) rotate(${stick})`);
      el.bucket?.setAttribute('transform', `translate(${T.x} ${T.y}) rotate(${bucket})`);

      // hydraulic cylinders follow the links
      const at = (o, len, a, off) => ({ x: o.x + len * Math.cos(rad(a)) + off * Math.sin(rad(a)), y: o.y + len * Math.sin(rad(a)) - off * Math.cos(rad(a)) });
      const setLine = (k, a, b) => { const n = el[k]; if (n) { n.setAttribute('x1', a.x); n.setAttribute('y1', a.y); n.setAttribute('x2', b.x); n.setAttribute('y2', b.y); } };
      setLine('cylBoom', { x: 660, y: 262 }, at(PIVOT, 120, boom, 22));
      setLine('cylStick', at(PIVOT, 205, boom, 22), at(E, 42, stick, -20));
      setLine('cylBucket', at(E, 150, stick, -20), at(T, -20, bucket + stick, 0));

      // work light on the boom: a beam onto the dig
      const lamp = at(PIVOT, 235, boom, -22);
      const gx = T.x + 28, gy = T.y + 74;
      el.lamp?.setAttribute('cx', lamp.x.toFixed(1)); el.lamp?.setAttribute('cy', lamp.y.toFixed(1));
      el.beam?.setAttribute('points', `${lamp.x.toFixed(1)},${lamp.y.toFixed(1)} ${(gx - 74).toFixed(1)},${gy.toFixed(1)} ${(gx + 44).toFixed(1)},${(gy + 5).toFixed(1)}`);
      el.beamCore?.setAttribute('points', `${lamp.x.toFixed(1)},${lamp.y.toFixed(1)} ${(gx - 32).toFixed(1)},${gy.toFixed(1)} ${(gx + 14).toFixed(1)},${(gy + 2).toFixed(1)}`);
      el.beamPool?.setAttribute('cx', (gx - 14).toFixed(1)); el.beamPool?.setAttribute('cy', (gy + 2).toFixed(1));
      (el.embers || []).forEach((c, i) => c && c.setAttribute('opacity', (0.15 + 0.6 * Math.abs(Math.sin(t * 1.3 + i * 1.9))).toFixed(2)));

      // defect markers that ride on moving parts
      const fe = faultEls.current;
      if (fe.hydraulics) { const a = { x: 660, y: 262 }, b = at(PIVOT, 120, boom, 22); fe.hydraulics.setAttribute('transform', `translate(${((a.x + b.x) / 2).toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)})`); }
      if (fe.boom) { const p = at(PIVOT, 150, boom, 0); fe.boom.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`); }
      if (fe.bucket) {
        const c = Math.cos(rad(bucket)), sn = Math.sin(rad(bucket));
        fe.bucket.setAttribute('transform', `translate(${(T.x + (-8) * c - 76 * sn).toFixed(1)} ${(T.y + (-8) * sn + 76 * c).toFixed(1)})`);
      }

      // ── machine motion ─────────────────────────────────────────────────────
      const vib = travelling ? Math.sin(t * 14) * 1.3 : digging ? Math.sin(t * 9) * 0.5 : Math.sin(t * 11) * 0.35;
      el.machine?.setAttribute('transform', `translate(0 ${vib.toFixed(2)})`);
      const speed = travelling ? 150 : digging ? 6 : 0;
      track += speed * dt; roll += speed * dt * 2.2;
      el.track?.setAttribute('stroke-dashoffset', (-track).toFixed(1));
      (el.rollers || []).forEach((g, i) => g && g.setAttribute('transform', `rotate(${roll.toFixed(1)} ${g.dataset.cx} ${g.dataset.cy})`));

      // ── world scroll while travelling (machine faces left, world moves right) ─
      if (travelling) {
        world = (world + 120 * dt) % W;
      } else {
        // arriving on site: glide back to the aligned position so the bucket meets the trench
        const target = world > W / 2 ? W : 0;
        world += (target - world) * Math.min(1, dt * 2.5);
        if (Math.abs(target - world) < 0.4) world = 0;
      }
      el.world?.setAttribute('transform', `translate(${world.toFixed(1)} 0)`);
      el.hills?.setAttribute('transform', `translate(${(world * 0.25 % W).toFixed(1)} 0)`);

      // ── slope tilt ─────────────────────────────────────────────────────────
      const tiltDeg = slope ? Math.max(6, tiltRef.current || 0) * 0.6 : 0;
      el.tilt?.setAttribute('transform', `rotate(${(tiltDeg + (slope ? Math.sin(t * 2) * 0.5 : 0)).toFixed(2)} 690 366)`);

      // ── dust at the bucket while digging, exhaust smoke always ─────────────
      (el.dust || []).forEach((c, i) => {
        if (!c) return;
        const p = ((t * 0.9 + i * 0.17) % 1);
        const on = digging && bucket > 20;
        c.setAttribute('cx', (T.x + 10 + i * 9 + p * 26).toFixed(1));
        c.setAttribute('cy', (T.y + 66 - p * 44).toFixed(1));
        c.setAttribute('r', (4 + p * 12).toFixed(1));
        c.setAttribute('opacity', on ? ((1 - p) * 0.5).toFixed(2) : '0');
      });
      (el.smoke || []).forEach((c, i) => {
        if (!c) return;
        const p = ((t * 0.45 + i * 0.33) % 1);
        c.setAttribute('cx', (790 + Math.sin(p * 6 + i) * 6 - p * 18).toFixed(1));
        c.setAttribute('cy', (186 - p * 60).toFixed(1));
        c.setAttribute('r', (3 + p * 9).toFixed(1));
        c.setAttribute('opacity', ((1 - p) * (travelling || digging ? 0.4 : 0.22)).toFixed(2));
      });

      // ── worker at the distance the radar reports ───────────────────────────
      const w = targetRef.current;
      if (el.worker) {
        if (w) {
          const x = 905 + Math.min(w.distanceM, 15) * 7;
          el.worker.setAttribute('transform', `translate(${x.toFixed(1)} 366)`);
          el.worker.setAttribute('opacity', '1');
          const breach = w.distanceM < 3;
          el.workerRing?.setAttribute('opacity', breach ? String(0.5 + 0.5 * Math.sin(t * 8)) : '0');
        } else el.worker.setAttribute('opacity', '0');
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const rollerXs = [548, 596, 644, 692, 740, 788];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMax meet" className={className} style={style} role="img" aria-label="Live simulation of the machine on site">
      <defs>
        <linearGradient id="sim-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfe0ee" /><stop offset="1" stopColor="#f4f8fb" /></linearGradient>
        <linearGradient id="sim-soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9a7448" /><stop offset="1" stopColor="#5f4226" /></linearGradient>
        <linearGradient id="sim-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dccbad" /><stop offset="1" stopColor="#c8b28f" /></linearGradient>
        <linearGradient id="sim-yellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={YELLOW_HI} /><stop offset="1" stopColor={YELLOW} /></linearGradient>
        <linearGradient id="sim-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1c3a4d" /><stop offset="1" stopColor="#0c1a24" /></linearGradient>
        <clipPath id="sim-soil-clip"><path d={SOIL_PATH} /></clipPath>
        <clipPath id="sim-frame"><rect width={W} height={H} /></clipPath>
        <filter id="sim-glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <radialGradient id="sim-vignette" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.10" /></radialGradient>

        {/* The repeatable site: props, far ground, trench and soil */}
        <g id="sim-site">
          {/* barrier */}
          <g transform="translate(8 200)">
            <rect x="6" y="6" width="9" height="62" fill="#2a2a2e" /><rect x="163" y="6" width="9" height="62" fill="#2a2a2e" />
            <rect x="0" y="8" width="178" height="22" fill="#1b1b1f" />
            {Array.from({ length: 11 }, (_, i) => <polygon key={i} points={`${i * 16},8 ${i * 16 + 10},8 ${i * 16 + 4},30 ${i * 16 - 6},30`} fill="#b48a1c" opacity="0.7" />)}
          </g>
          {/* cones */}
          {[235, 925].map(x => (
            <g key={x} transform={`translate(${x} 262)`}>
              <polygon points="-3,-62 3,-62 22,0 -22,0" fill="#c4581f" /><polygon points="-9,-38 9,-38 12,-24 -12,-24" fill="#d9d4c8" opacity="0.85" /><rect x="-26" y="0" width="52" height="7" rx="2" fill="#1c1c20" />
            </g>
          ))}
          {/* far ground */}
          <rect x="0" y="262" width={W} height="110" fill="url(#sim-far)" />
          {/* left mound */}
          <path d="M0,326 L0,292 Q30,268 62,285 Q90,272 118,300 Q136,312 142,326 Z" fill="#8a6a45" />
          <path d="M0,326 L0,300 Q28,286 50,300 Q76,290 96,312 L110,326 Z" fill="#a07c50" opacity="0.8" />
          <path d="M138,326 L190,418 L395,418 L428,366 L428,326 Z" fill="#3d2a16" />
          {/* soil with the trench cut out of it */}
          <path d={SOIL_PATH} fill="url(#sim-soil)" />
          <g clipPath="url(#sim-soil-clip)">
            {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity={d.o} />)}
          </g>
          <path d={TRENCH_LINE} fill="none" stroke={YELLOW} strokeWidth="2.6" strokeLinejoin="round" filter="url(#sim-glow)" opacity="0.95" />
        </g>
      </defs>

      <g clipPath="url(#sim-frame)">
      <rect width={W} height={H} fill="url(#sim-sky)" />
      {/* distant hills (parallax) */}
      <g ref={set('hills')}>
        {[-W, 0, W].map(o => (
          <path key={o} transform={`translate(${o} 0)`} d="M0,250 Q90,190 190,232 Q300,170 430,226 Q560,180 690,228 Q820,186 930,222 L1025,232 L1025,270 L0,270 Z" fill="#bccad6" />
        ))}
      </g>

      <g ref={set('tilt')}>
        <g ref={set('world')}>
          {[-W, 0, W].map(o => <use key={o} href="#sim-site" x={o} />)}
        </g>

        {/* worker near the machine */}
        <g ref={set('worker')} opacity="0" transform="translate(940 366)">
          <ellipse ref={set('workerRing')} cx="0" cy="2" rx="26" ry="6" fill="none" stroke="#ef4444" strokeWidth="3" opacity="0" />
          <rect x="-9" y="-46" width="7" height="46" rx="3" fill="#20242c" /><rect x="2" y="-46" width="7" height="46" rx="3" fill="#20242c" />
          <rect x="-13" y="-92" width="26" height="50" rx="8" fill="#e8622a" /><rect x="-13" y="-76" width="26" height="6" fill="#e6e1c8" /><rect x="-13" y="-62" width="26" height="6" fill="#e6e1c8" />
          <circle cx="0" cy="-104" r="10" fill="#c99a76" /><path d="M-12,-105 Q0,-124 12,-105 Z" fill="#f2f0e8" />
        </g>

        {/* work-light beam and ground embers */}
        <polygon ref={set('beam')} points="0,0 0,0 0,0" fill="#ffe27a" opacity="0.16" />
        <polygon ref={set('beamCore')} points="0,0 0,0 0,0" fill="#ffe27a" opacity="0.22" />
        <ellipse ref={set('beamPool')} cx="300" cy="400" rx="52" ry="8" fill="#ffe08a" opacity="0.22" />
        {EMBERS.map((e, i) => <circle key={i} ref={(c) => { (r.current.embers ||= [])[i] = c; }} cx={e.x} cy={e.y} r={e.r} fill="#FFCD11" opacity="0.4" />)}

        {/* the machine */}
        <g ref={set('machine')}>
          {/* undercarriage */}
          <rect x="503" y="302" width="345" height="63" rx="31" fill="#141414" stroke={YELLOW} strokeWidth="5" />
          <rect x="512" y="311" width="327" height="45" rx="22" fill="none" stroke="#3a3a3e" strokeWidth="6" strokeDasharray="12 9" ref={set('track')} />
          {rollerXs.map((cx, i) => (
            <g key={cx}>
              <circle cx={cx} cy="334" r={i === 0 || i === rollerXs.length - 1 ? 19 : 12} fill="#1d1d21" stroke="#3b3b40" strokeWidth="3" />
              <g ref={(g) => { if (g) { g.dataset.cx = cx; g.dataset.cy = 334; (r.current.rollers ||= [])[i] = g; } }}>
                <line x1={cx - 8} y1="334" x2={cx + 8} y2="334" stroke="#63636a" strokeWidth="3" strokeLinecap="round" />
              </g>
            </g>
          ))}
          <rect x="518" y="292" width="320" height="16" rx="6" fill="url(#sim-yellow)" />

          {/* house + counterweight */}
          <rect x="733" y="203" width="139" height="89" rx="10" fill="url(#sim-yellow)" stroke={YELLOW_DK} strokeWidth="2" />
          <rect x="752" y="186" width="96" height="22" rx="6" fill="#1d1d21" />
          <rect x="776" y="158" width="4" height="30" fill="#222" /><rect x="814" y="150" width="4" height="38" fill="#222" />
          <rect x="765" y="234" width="84" height="34" rx="6" fill="#111114" />
          <text x="807" y="258" textAnchor="middle" fontSize="19" fontWeight="800" fill="#fff" fontFamily="Barlow, system-ui, sans-serif">320 GC</text>
          <rect x="603" y="277" width="270" height="16" rx="5" fill="url(#sim-yellow)" />

          {/* cab */}
          <path d="M606,292 L606,175 Q606,154 628,154 L718,154 Q736,154 736,176 L736,292 Z" fill="#15151a" stroke="#0a0a0c" strokeWidth="3" />
          <path d="M618,282 L618,178 Q618,166 630,166 L668,166 L668,282 Z" fill="url(#sim-glass)" />
          <path d="M676,282 L676,166 L716,166 Q726,166 726,178 L726,282 Z" fill="url(#sim-glass)" />
          <path d="M624,172 L640,172 L626,204 Z" fill="#fff" opacity="0.07" />
          {driverPresent && (
            <g>
              <circle cx="649" cy="205" r="9" fill={YELLOW} /><path d="M634,240 Q634,220 649,220 Q664,220 664,240 L664,262 L634,262 Z" fill={YELLOW} />
            </g>
          )}

          {/* hydraulic cylinders */}
          <line ref={set('cylBoom')} x1="660" y1="262" x2="700" y2="200" stroke={STEEL} strokeWidth="10" strokeLinecap="round" />
          <line ref={set('cylStick')} x1="0" y1="0" x2="0" y2="0" stroke={STEEL} strokeWidth="9" strokeLinecap="round" />
          <line ref={set('cylBucket')} x1="0" y1="0" x2="0" y2="0" stroke={STEEL} strokeWidth="8" strokeLinecap="round" />

          {/* boom */}
          <g ref={set('boom')} transform={`translate(${PIVOT.x} ${PIVOT.y}) rotate(207.8)`}>
            <path d={`M0,-16 Q150,-4 ${BOOM_LEN},-14 L${BOOM_LEN},14 Q150,46 0,16 Z`} fill="url(#sim-yellow)" stroke={YELLOW_DK} strokeWidth="2" />
            <g transform="translate(150 12) rotate(180)">
              <polygon points="-44,-13 40,-13 46,13 -38,13" fill="#111" /><polygon points="-52,-13 -38,13 -52,13" fill="#d8232a" />
              <text x="0" y="8" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff" fontFamily="Barlow, system-ui, sans-serif">CAT</text>
            </g>
            <circle cx="0" cy="0" r="13" fill="#1d1d21" stroke={YELLOW_DK} strokeWidth="3" />
          </g>

          {/* stick */}
          <g ref={set('stick')} transform="translate(352 95) rotate(106.5)">
            <path d={`M0,-14 L${STICK_LEN},-9 L${STICK_LEN},9 Q120,30 0,15 Z`} fill="url(#sim-yellow)" stroke={YELLOW_DK} strokeWidth="2" />
            <circle cx="0" cy="0" r="12" fill="#1d1d21" stroke={YELLOW_DK} strokeWidth="3" />
          </g>

          {/* bucket */}
          <g ref={set('bucket')} transform="translate(285 322) rotate(20)">
            <path d="M-8,-10 L26,-8 Q44,26 30,66 L-30,72 Q-40,30 -8,-10 Z" fill="url(#sim-yellow)" stroke={YELLOW_DK} strokeWidth="2.5" />
            <path d="M-30,72 L-36,84 L-22,76 L-12,88 L-2,74 L10,88 L18,72 L30,66" fill="#c9c9cf" stroke="#8b8b92" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="10" fill="#1d1d21" stroke={YELLOW_DK} strokeWidth="3" />
          </g>

          {/* defects: a red spot on the part that is at fault */}
          {faults.map(f => {
            const pos = FAULT_SPOT[f.part];
            return (
              <g key={f.part} ref={(g) => { if (g) faultEls.current[f.part] = g; else delete faultEls.current[f.part]; }} transform={pos ? `translate(${pos.x} ${pos.y})` : 'translate(0 0)'}>
                <title>{f.label}</title>
                <circle r="10" fill="none" stroke="#ef4444" strokeWidth="2.5">
                  <animate attributeName="r" values="9;30" dur="1.3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.95;0" dur="1.3s" repeatCount="indefinite" />
                </circle>
                <circle r="9" fill="#ef4444" stroke="#fff" strokeWidth="2.5" filter="url(#sim-glow)" />
                <text x="15" y="-13" fontSize="15" fontWeight="700" fill="#fecaca" stroke="#160606" strokeWidth="4" paintOrder="stroke" fontFamily="Barlow, system-ui, sans-serif">{PART_LABEL[f.part] || f.part}</text>
              </g>
            );
          })}

          <circle ref={set('lamp')} cx="0" cy="0" r="6" fill="#fff7cf" filter="url(#sim-glow)" />

          {/* exhaust + bucket dust */}
          {[0, 1, 2].map(i => <circle key={i} ref={(c) => { (r.current.smoke ||= [])[i] = c; }} cx="790" cy="186" r="4" fill="#888" opacity="0" />)}
        </g>
        {[0, 1, 2, 3, 4].map(i => <circle key={i} ref={(c) => { (r.current.dust ||= [])[i] = c; }} cx="300" cy="380" r="5" fill="#b9884a" opacity="0" />)}
      </g>

      <rect width={W} height={H} fill="url(#sim-vignette)" pointerEvents="none" />
      </g>
    </svg>
  );
}
