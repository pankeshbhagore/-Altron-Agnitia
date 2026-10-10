import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { Report } from "../types";
import { simulate } from "../harden";
import { playPing, playBlock, playAlarm } from "../sfx";

type Mode = "baseline" | "hardened";
const ALL_CONTROLS = { sast_gate: true, patch_sqli: true, gitleaks_gate: true, trivy_gate: true, opa_policy: true };

// theme colors (hex ints for three)
const COL = {
  bg: 0x0B0514, ground: 0x07030C, line: 0x332244,
  steel: 0xA960FF, green: 0x00F5D4, amber: 0xFEE440, red: 0xFF006E, crit: 0xFF006E,
  ink: 0xFFFFFF,
};
const STAGE_HEX: Record<string, number> = {
  pipeline: COL.green, runtime: COL.amber, missed: COL.red, remediated: COL.steel, "n/a": 0x94a3b8,
};

export default function Simulation3D({ report }: { report: Report }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const ctrl = useRef({ playing: false, restart: false, mode: "baseline" as Mode, speed: 1 });
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<Mode>("baseline");
  const [log, setLog] = useState<{ t: string; level: string }[]>([]);
  const [hud, setHud] = useState({ score: report.posture_before.score, grade: report.posture_before.grade, blast: 0, step: "idle" });
  const pushLog = useRef<(t: string, level: string) => void>(() => {});
  const resetLog = useRef<() => void>(() => {});

  useEffect(() => { ctrl.current.mode = mode; }, [mode]);
  useEffect(() => { ctrl.current.playing = playing; }, [playing]);
  pushLog.current = (t, level) => setLog((p) => [...p, { t, level }]);
  resetLog.current = () => setLog([]);

  useEffect(() => {
    const mount = mountRef.current!;
    const W = () => mount.clientWidth;
    const H = () => mount.clientHeight;

    // sims
    const baseSim = simulate(report.scenarios, {});
    const hardSim = simulate(report.scenarios, ALL_CONTROLS);
    const nameById: Record<string, string> = Object.fromEntries(report.scenarios.map((s) => [s.id, s.name]));
    nameById["entry"] = "Attacker"; nameById["impact"] = "Data / Admin compromise";
    const mitreById: Record<string, string> = Object.fromEntries(report.scenarios.map((s) => [s.id, s.mitre]));
    const grantsById: Record<string, string[]> = Object.fromEntries(report.scenarios.map((s) => [s.id, s.grants ?? []]));

    // layout: order baseline chain left→right, zig-zag in Z
    const order = baseSim.chain.order;
    const path = ["entry", ...order, "impact"];
    const n = path.length;
    const pos: Record<string, THREE.Vector3> = {};
    const labelY: Record<string, number> = {};
    path.forEach((id, i) => {
      const x = -10.5 + (21 * i) / (n - 1);
      const z = i === 0 || i === n - 1 ? 0 : (i % 2 ? 3.4 : -3.4);
      pos[id] = new THREE.Vector3(x, 0.6, z);
      // back row (z<0) sits higher on screen → lift its label; front row drops its label
      labelY[id] = z < 0 ? 2.15 : z > 0 ? 1.35 : 1.7;
    });

    // scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COL.bg);
    scene.fog = new THREE.Fog(COL.bg, 24, 44);

    const camera = new THREE.PerspectiveCamera(46, W() / H(), 0.1, 100);
    camera.position.set(0, 14.5, 15.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W(), H());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(W(), H());
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0";
    labelRenderer.domElement.style.left = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    mount.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.target.set(0, 0.2, 0.2); controls.minDistance = 9; controls.maxDistance = 38;
    controls.maxPolarAngle = Math.PI / 2.1;

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(6, 14, 8); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -16; key.shadow.camera.right = 16;
    key.shadow.camera.top = 16; key.shadow.camera.bottom = -16;
    key.shadow.bias = -0.0004;
    scene.add(key);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe7f2, 0.5));

    // ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(26, 64),
      new THREE.MeshStandardMaterial({ color: COL.ground, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.position.y = -0.01;
    scene.add(ground);
    const grid = new THREE.GridHelper(52, 52, COL.line, COL.line);
    (grid.material as THREE.Material).opacity = 0.35; (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    // nodes
    type NodeObj = { mesh: THREE.Mesh; ring: THREE.Mesh; label: CSS2DObject; baseColor: number; id: string };
    const nodes: Record<string, NodeObj> = {};
    const mkLabel = (id: string, yOff: number) => {
      const div = document.createElement("div");
      div.style.cssText =
        "font-family:'IBM Plex Sans',sans-serif;font-size:10.5px;font-weight:600;color:#FFFFFF;max-width:200px;" +
        "background:rgba(11, 5, 20, 0.85);border:1px solid rgba(169, 96, 255, 0.3);border-radius:7px;padding:3px 8px;" +
        "box-shadow:0 0 12px rgba(169, 96, 255, 0.15);white-space:nowrap;transform:translateY(-6px)";
      const nm = nameById[id] || id;
      const mit = mitreById[id] ? `<span style="font-family:'IBM Plex Mono';color:#667085;font-weight:500"> · ${mitreById[id]}</span>` : "";
      div.innerHTML = `${nm.length > 22 ? nm.slice(0, 21) + "…" : nm}${mit}`;
      const obj = new CSS2DObject(div);
      obj.position.set(0, yOff, 0);
      return obj;
    };
    path.forEach((id) => {
      const isEntry = id === "entry", isImpact = id === "impact";
      const geo = isEntry ? new THREE.OctahedronGeometry(0.85)
        : isImpact ? new THREE.IcosahedronGeometry(1.15, 1)
        : new THREE.SphereGeometry(0.85, 32, 32);
      const baseColor = isEntry ? COL.steel : isImpact ? COL.crit : 0xffffff;
      const mat = new THREE.MeshStandardMaterial({
        color: baseColor, roughness: 0.35, metalness: 0.1,
        emissive: new THREE.Color(isEntry ? COL.steel : 0x000000), emissiveIntensity: isEntry ? 0.35 : 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos[id]); mesh.castShadow = true;
      scene.add(mesh);
      // shield ring (hidden until hardened/compromised)
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.35, 0.07, 12, 48),
        new THREE.MeshStandardMaterial({ color: COL.green, emissive: COL.green, emissiveIntensity: 0.4, roughness: 0.4 })
      );
      ring.position.copy(pos[id]); ring.rotation.x = Math.PI / 2; ring.visible = false;
      scene.add(ring);
      const label = mkLabel(id, labelY[id]); mesh.add(label);
      nodes[id] = { mesh, ring, label, baseColor, id };
    });

    // edges (tubes) along the path
    const edges: { tube: THREE.Mesh; from: string; to: string }[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = pos[path[i]], b = pos[path[i + 1]];
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y += 1.1;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 40, 0.06, 10, false),
        new THREE.MeshStandardMaterial({ color: COL.line, roughness: 0.8, transparent: true, opacity: 0.9 })
      );
      scene.add(tube);
      edges.push({ tube, from: path[i], to: path[i + 1] });
    }

    // packet
    const packet = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.red, emissiveIntensity: 1.3, roughness: 0.2 })
    );
    packet.visible = false; packet.castShadow = true; scene.add(packet);
    const packetLight = new THREE.PointLight(COL.red, 2.2, 6); packet.add(packetLight);

    // curves for animation
    const curves = edges.map((e) => {
      const a = pos[e.from], b = pos[e.to];
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y += 1.1;
      return new THREE.QuadraticBezierCurve3(a, mid, b);
    });

    // animation state machine
    let seg = 0, segT = 0, phase: "idle" | "run" | "done" = "idle";
    let compromised = new Set<string>();
    const setNodeStage = (id: string, hex: number, emissive = 0.85) => {
      const nd = nodes[id]; (nd.mesh.material as THREE.MeshStandardMaterial).color.setHex(hex);
      (nd.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(hex);
      (nd.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = emissive;
    };

    function reset(curMode: Mode) {
      seg = 0; segT = 0; phase = "idle"; compromised = new Set();
      resetLog.current();
      edges.forEach((e) => (e.tube.material as THREE.MeshStandardMaterial).color.setHex(COL.line));
      path.forEach((id) => {
        const nd = nodes[id];
        const isEntry = id === "entry";
        (nd.mesh.material as THREE.MeshStandardMaterial).color.setHex(isEntry ? COL.steel : 0xffffff);
        (nd.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(isEntry ? COL.steel : 0x000000);
        (nd.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isEntry ? 0.35 : 0;
        nd.mesh.scale.setScalar(1);
        nd.ring.visible = curMode === "hardened" && !isEntry; // shields up when hardened
      });
      packet.visible = false;
      const sim = curMode === "hardened" ? hardSim : baseSim;
      setHud({ score: sim.score, grade: sim.grade, blast: 0, step: curMode === "hardened" ? "defended — shields up" : "armed" });
      pushLog.current(curMode === "hardened"
        ? "Twin hardened · all shift-left gates enabled · shields up"
        : "Twin armed · isolated network · egress blocked", "info");
    }

    reset(ctrl.current.mode);

    let raf = 0; let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      controls.update();

      const curMode = ctrl.current.mode;
      if (ctrl.current.restart) { ctrl.current.restart = false; reset(curMode); }

      // pulses
      const t = now / 1000;
      if (phase === "done" && compromised.has("impact")) {
        nodes["impact"].mesh.scale.setScalar(1 + Math.sin(t * 4) * 0.06);
      }
      if (curMode === "hardened") {
        path.forEach((id) => { if (id !== "entry" && nodes[id].ring.visible)
          nodes[id].ring.scale.setScalar(1 + Math.sin(t * 3 + pos[id].x) * 0.05); });
      }
      nodes["entry"] && (nodes["entry"].mesh.rotation.y += dt * 0.5);

      if (phase === "run" && ctrl.current.playing) {
        if (curMode === "hardened") {
          // packet launches then is blocked at first target with a shield flash
          packet.visible = true;
          segT += dt * 0.6 * ctrl.current.speed;
          const c = curves[0]; const p = c.getPoint(Math.min(segT, 0.62));
          packet.position.copy(p);
          if (segT >= 0.62) {
            // blocked at the first shift-left gate (runs once — phase flips to done)
            playBlock();
            pushLog.current(`✓ ${nameById[path[1]]} — blocked at pipeline gate (shield held)`, "ok");
            pushLog.current("Attack contained · chain never reaches production", "ok");
            setHud((h) => ({ ...h, step: "contained ✓", blast: 0 }));
            packet.visible = false;
            phase = "done";
          }
        } else {
          // baseline: traverse each segment, compromise nodes one by one
          packet.visible = true;
          segT += dt * 0.5 * ctrl.current.speed;
          const c = curves[seg];
          const p = c.getPoint(Math.min(segT, 1));
          packet.position.copy(p);
          // color the tube as traversed
          if (segT > 0.02) {
            const stage = (report.scenarios.find((s) => s.id === edges[seg].to)?.stage) || "missed";
            (edges[seg].tube.material as THREE.MeshStandardMaterial).color.setHex(STAGE_HEX[stage] ?? COL.red);
          }
          if (segT >= 1) {
            const tgt = path[seg + 1];
            compromised.add(tgt);
            if (tgt === "impact") {
              playAlarm();
              setNodeStage("impact", COL.crit, 1.1);
              pushLog.current("⚠ Data / Admin compromise — full breach", "breach");
              setHud((h) => ({ ...h, step: "breached ⚠", blast: baseSim.chain.blast_radius.length }));
              phase = "done"; packet.visible = false;
            } else {
              playPing();
              const sc = report.scenarios.find((s) => s.id === tgt);
              const stageHex = STAGE_HEX[sc?.stage ?? "missed"] ?? COL.red;
              setNodeStage(tgt, stageHex);
              nodes[tgt].mesh.scale.setScalar(1.18);
              const grants = (grantsById[tgt] || []).join(", ");
              pushLog.current(`⚠ ${nameById[tgt]} (${mitreById[tgt]}) exploited${grants ? " → grants " + grants : ""}`, "breach");
              setHud((h) => ({ ...h, blast: Math.min(baseSim.chain.blast_radius.length, h.blast + (grantsById[tgt]?.length || 1)), step: "breaching…" }));
              seg++; segT = 0;
            }
          } else {
            const tgt = path[seg + 1];
            if (nodes[tgt]) nodes[tgt].mesh.scale.setScalar(1 + Math.sin(t * 6) * 0.03);
          }
        }
      }

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    // expose a "begin" that flips phase to run on first play
    const beginIfNeeded = () => { if (phase === "idle") { phase = "run"; playPing(); } };
    const playWatch = setInterval(() => { if (ctrl.current.playing) beginIfNeeded(); }, 100);

    const onResize = () => {
      camera.aspect = W() / H(); camera.updateProjectionMatrix();
      renderer.setSize(W(), H()); labelRenderer.setSize(W(), H());
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf); clearInterval(playWatch);
      window.removeEventListener("resize", onResize); ro.disconnect();
      controls.dispose(); renderer.dispose();
      mount.removeChild(renderer.domElement); mount.removeChild(labelRenderer.domElement);
    };
  }, [report]);

  // controls
  const onMode = (m: Mode) => {
    setMode(m); setPlaying(false);
    ctrl.current.mode = m; ctrl.current.playing = false; ctrl.current.restart = true;
  };
  const onPlay = () => setPlaying((p) => !p);
  const onRestart = () => { ctrl.current.restart = true; setPlaying(true); };

  const logColor: Record<string, string> = { info: "var(--code-dim)", ok: "var(--green)", breach: "var(--red)", score: "var(--steel)" };

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 300px", gap: 16 }}>
      <div className="panel" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
        <div ref={mountRef} style={{ width: "100%", height: 520, position: "relative" }} />
        {/* overlay controls */}
        <div style={{ position: "absolute", left: 14, bottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={onPlay} style={btn(playing ? "var(--amber)" : "var(--steel)")}>{playing ? "⏸ pause" : "▶ play"}</button>
          <button onClick={onRestart} style={btn("var(--muted)")}>↺ restart</button>
          <div className="toggle" style={{ marginLeft: 6 }}>
            <button className={mode === "baseline" ? "on" : ""} onClick={() => onMode("baseline")}>Baseline</button>
            <button className={mode === "hardened" ? "on" : ""} onClick={() => onMode("hardened")}>Hardened</button>
          </div>
        </div>
        <div style={{ position: "absolute", right: 14, top: 14, display: "flex", gap: 10 }}>
          <Hud label="SCORE" value={`${hud.score}`} sub={hud.grade} color={hud.grade === "A" ? "var(--green)" : hud.grade === "F" ? "var(--red)" : "var(--amber)"} />
          <Hud label="BLAST" value={`${hud.blast}`} sub="assets" color="var(--red)" />
        </div>
        <div style={{ position: "absolute", left: 14, top: 14, fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
          drag to orbit · scroll to zoom · <b style={{ color: "var(--ink)" }}>{hud.step}</b>
        </div>
      </div>
      {/* step log */}
      <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
        <p className="cap">KILL-CHAIN LOG</p>
        <div style={{ flex: 1, overflowY: "auto", maxHeight: 420, fontFamily: "var(--mono)", fontSize: 12.5, lineHeight: 1.7 }}>
          {log.length === 0 && <div style={{ color: "var(--dim)" }}>press play to run the simulation.</div>}
          {log.map((e, i) => (
            <div key={i} style={{ color: logColor[e.level] ?? "var(--muted)", marginBottom: 2 }}>
              <span style={{ color: "var(--dim)" }}>{String(i + 1).padStart(2, "0")} </span>{e.t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return { background: "var(--panel)", border: `1px solid ${color}`, color, borderRadius: 8,
    padding: "7px 13px", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600,
    boxShadow: "0 1px 3px rgba(16,24,40,.12)", cursor: "pointer" };
}
function Hud({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10,
      padding: "8px 12px", textAlign: "center", boxShadow: "var(--shadow-sm)", minWidth: 62, backdropFilter: "blur(8px)" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)" }}>{sub}</div>
    </div>
  );
}
