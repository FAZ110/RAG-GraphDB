import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { motion } from "motion/react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
} from "d3-force";

interface SimNode {
  id: number;
  r: number;
  group: 0 | 1 | 2;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink {
  source: number | SimNode;
  target: number | SimNode;
}

const NODE_SPECS: Array<{ id: number; group: 0 | 1 | 2; r: number }> = [
  { id: 0, group: 0, r: 16 },
  { id: 1, group: 1, r: 10 },
  { id: 2, group: 1, r: 10 },
  { id: 3, group: 1, r: 10 },
  { id: 4, group: 1, r: 10 },
  { id: 5, group: 1, r: 9 },
  { id: 6, group: 1, r: 9 },
  { id: 7, group: 2, r: 6 },
  { id: 8, group: 2, r: 6 },
  { id: 9, group: 2, r: 6 },
  { id: 10, group: 2, r: 6 },
  { id: 11, group: 2, r: 6 },
  { id: 12, group: 2, r: 6 },
  { id: 13, group: 2, r: 6 },
  { id: 14, group: 2, r: 6 },
  { id: 15, group: 2, r: 5 },
  { id: 16, group: 2, r: 5 },
  { id: 17, group: 2, r: 5 },
  { id: 18, group: 2, r: 5 },
  { id: 19, group: 2, r: 6 },
  { id: 20, group: 2, r: 5 },
  { id: 21, group: 2, r: 6 },
  { id: 22, group: 2, r: 5 },
  { id: 23, group: 2, r: 6 },
  { id: 24, group: 2, r: 5 },
];

const LINK_SPECS: Array<[number, number]> = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  [1, 7], [1, 8], [1, 15],
  [2, 9], [2, 10],
  [3, 11], [3, 12], [3, 16],
  [4, 13], [4, 14],
  [5, 17], [5, 18],
  [6, 10], [6, 11],
  [1, 2], [3, 4], [5, 6],
  [2, 19], [4, 20], [5, 21],
  [6, 22], [1, 23], [3, 24],
  [19, 8], [20, 14], [21, 18],
];

export function InteractiveGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const draggingRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 520 });
  const [tick, setTick] = useState(0);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const [nodes] = useState<SimNode[]>(() =>
    NODE_SPECS.map((n, i) => ({
      ...n,
      x: 400 + (((i * 37) % 60) - 30),
      y: 260 + (((i * 53) % 60) - 30),
    })),
  );

  const links = useMemo<SimLink[]>(
    () => LINK_SPECS.map(([s, t]) => ({ source: s, target: t })),
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setDims({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setDims({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const sim = forceSimulation<SimNode>(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => {
            const src = l.source as SimNode;
            const tgt = l.target as SimNode;
            if (src.group === 0 || tgt.group === 0) return 160;
            return 110;
          })
          .strength(0.3),
      )
      .force("charge", forceManyBody<SimNode>().strength(-520))
      .force("collide", forceCollide<SimNode>((d) => d.r + 10).strength(0.9))
      .force("center", forceCenter(dims.w / 2, dims.h / 2).strength(0.02))
      .force("x", forceX(dims.w / 2).strength(0.015))
      .force("y", forceY(dims.h / 2).strength(0.025))
      .alphaDecay(0.02)
      .velocityDecay(0.35);

    sim.on("tick", () => {
      const mouse = mouseRef.current;
      if (mouse) {
        const R = 120;
        for (const n of nodes) {
          if (draggingRef.current === n.id || n.x == null || n.y == null) continue;
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const t = 1 - d / R;
            const f = t * t * 1.6;
            n.vx = (n.vx ?? 0) + (dx / d) * f;
            n.vy = (n.vy ?? 0) + (dy / d) * f;
          }
        }
      }

      const time = performance.now() / 1000;
      for (const n of nodes) {
        if (draggingRef.current === n.id) continue;
        const phase = n.id * 0.73;
        n.vx = (n.vx ?? 0) + Math.sin(time * 0.45 + phase) * 0.05;
        n.vy = (n.vy ?? 0) + Math.cos(time * 0.37 + phase * 1.31) * 0.05;
      }

      const pad = 14;
      for (const n of nodes) {
        if (n.x == null || n.y == null) continue;
        const r = n.r + pad;
        if (n.x < r) n.x = r;
        if (n.x > dims.w - r) n.x = dims.w - r;
        if (n.y < r) n.y = r;
        if (n.y > dims.h - r) n.y = dims.h - r;
      }
      setTick((t) => (t + 1) % 1_000_000);
    });

    sim.alphaTarget(0.04).restart();
    simRef.current = sim;
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [dims.w, dims.h, nodes, links]);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.force("center", forceCenter(dims.w / 2, dims.h / 2).strength(0.02));
    sim.force("x", forceX(dims.w / 2).strength(0.015));
    sim.force("y", forceY(dims.h / 2).strength(0.025));
    sim.alpha(0.4).restart();
  }, [dims.w, dims.h]);

  const toSvg = (clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * dims.w,
      y: ((clientY - r.top) / r.height) * dims.h,
    };
  };

  const handleMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = toSvg(e.clientX, e.clientY);
    if (!p) return;
    if (draggingRef.current !== null) {
      const id = draggingRef.current;
      const n = nodes.find((nn) => nn.id === id);
      if (n) {
        n.fx = p.x;
        n.fy = p.y;
      }
      simRef.current?.alphaTarget(0.3).restart();
    } else {
      mouseRef.current = p;
      simRef.current?.alphaTarget(0.08).restart();
    }
  };

  const handleLeave = () => {
    mouseRef.current = null;
    simRef.current?.alphaTarget(0.04);
  };

  const handleNodeDown = (e: ReactPointerEvent<SVGGElement>, id: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = id;
    setDraggingId(id);
    const n = nodes.find((nn) => nn.id === id);
    if (n) {
      n.fx = n.x ?? 0;
      n.fy = n.y ?? 0;
    }
    simRef.current?.alphaTarget(0.3).restart();
  };

  const handleUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const id = draggingRef.current;
    if (id !== null) {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      const n = nodes.find((nn) => nn.id === id);
      if (n) {
        n.fx = null;
        n.fy = null;
      }
      draggingRef.current = null;
      setDraggingId(null);
      simRef.current?.alphaTarget(0.04);
    }
  };

  void tick;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        className="w-full h-full touch-none select-none"
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="atlasHalo" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.06" />
            <stop offset="55%" stopColor="#0f172a" stopOpacity="0.015" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={dims.w} height={dims.h} fill="url(#atlasHalo)" />

        <g stroke="#cbd5e1" strokeWidth={1}>
          {links.map((l, i) => {
            const s = l.source as SimNode;
            const t = l.target as SimNode;
            if (s.x == null || t.x == null) return null;
            return <line key={i} x1={s.x} y1={s.y!} x2={t.x} y2={t.y!} />;
          })}
        </g>

        <g>
          {nodes.map((n) => {
            if (n.x == null || n.y == null) return null;
            const isCenter = n.group === 0;
            const isMid = n.group === 1;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                style={{
                  cursor: draggingId === n.id ? "grabbing" : "grab",
                }}
                onPointerDown={(e) => handleNodeDown(e, n.id)}
              >
                <circle r={n.r + 10} fill="transparent" />
                {isCenter && (
                  <motion.circle
                    r={n.r + 6}
                    fill="none"
                    stroke="#0f172a"
                    strokeOpacity="0.2"
                    strokeWidth={1}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: [0.7, 1.6, 1.6], opacity: [0, 0.5, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <circle
                  r={n.r}
                  fill={isCenter ? "#0f172a" : "#ffffff"}
                  stroke="#0f172a"
                  strokeWidth={isCenter ? 0 : isMid ? 1.4 : 1.1}
                  strokeOpacity={isMid ? 1 : 0.7}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
