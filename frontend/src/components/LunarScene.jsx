/**
 * LunarScene.jsx  — Rocket Landing AI
 * ─────────────────────────────────────────────────────────────────────────────
 * Full Three.js / R3F scene.
 *
 * COORDINATE CONTRACT (unchanged from original):
 *   obs[0]  x      → Three.js X  ×4
 *   obs[1]  y      → Three.js Y  ×3  (clamped ≥ 0.45)
 *   obs[4]  angle  → rotation.z  (negated)
 *   action 0=idle 1=left-thruster 2=main-engine 3=right-thruster
 *
 * Only this file is modified.  No backend, hooks, or other components changed.
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Shared materials (created once, never recreated)
// ─────────────────────────────────────────────────────────────────────────────
const MAT = {
  // Lunar regolith — light grey so the dark lander stands out
  regolith: new THREE.MeshStandardMaterial({ color: '#9aa0a8', roughness: 0.97, metalness: 0.0 }),
  // Landing-pad concrete
  padBase:  new THREE.MeshStandardMaterial({ color: '#3a4050', roughness: 0.75, metalness: 0.15 }),
  // Primary aluminium structure
  alum:     new THREE.MeshStandardMaterial({ color: '#c8cfd8', roughness: 0.28, metalness: 0.82, envMapIntensity: 1.2 }),
  // Darker aluminium (struts / brackets)
  alumDark: new THREE.MeshStandardMaterial({ color: '#7a8898', roughness: 0.42, metalness: 0.75 }),
  // Gold multi-layer insulation (MLI) — the iconic gold foil
  mli:      new THREE.MeshStandardMaterial({ color: '#c8840a', roughness: 0.18, metalness: 0.9, emissive: '#3a2200', emissiveIntensity: 0.12 }),
  // White thermal paint (upper stage)
  whitePaint: new THREE.MeshStandardMaterial({ color: '#dce8f0', roughness: 0.35, metalness: 0.25 }),
  // Engine bell — dark oxidised metal
  bell:     new THREE.MeshStandardMaterial({ color: '#4a3820', roughness: 0.35, metalness: 0.88, side: THREE.FrontSide }),
  // Footpad — flat dark metal
  footpad:  new THREE.MeshStandardMaterial({ color: '#2a3540', roughness: 0.55, metalness: 0.7 }),
  // Antenna wire
  antenna:  new THREE.MeshStandardMaterial({ color: '#c0c8d0', roughness: 0.3, metalness: 0.95 }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Procedural lunar terrain
// ─────────────────────────────────────────────────────────────────────────────
function LunarSurface() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(36, 18, 180, 90)
    const pos = g.attributes.position

    // Deterministic pseudo-random
    const rng = s => { const v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v) }

    const craters = [
      [-5.5, -2.5, 1.4], [4.2, 1.8, 1.0], [8.0, -3.5, 1.8],
      [-9.0,  3.2, 1.1], [1.5, -4.2, 0.7], [-3.5, 4.5, 1.3],
      [10.5,  2.2, 0.9], [-12, -1.0, 1.6], [6.5,  4.0, 0.8],
    ]

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      let h = 0

      // Low-frequency undulation
      h += Math.sin(x * 0.28) * 0.09 + Math.cos(z * 0.55) * 0.06
      h += Math.sin(x * 0.9 + z * 0.6) * 0.025

      // Craters — bowl shape with ejecta rim
      for (const [cx, cz, r] of craters) {
        const d = Math.sqrt((x - cx) ** 2 + (z - cz) ** 2)
        if (d < r * 2.4) {
          const t = d / r
          if (t < 1.0) h -= (1 - t * t * t) * r * 0.22        // bowl
          else if (t < 1.5) h += (t - 1.0) * r * 0.09         // raised rim
        }
      }

      // Surface rocks (sparse high-frequency bumps)
      const bump = rng(i * 3.7 + 1.9)
      if (bump > 0.96) h += rng(i * 1.3 + 7.2) * 0.18

      pos.setZ(i, h)
    }
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <primitive object={geo} />
      <primitive object={MAT.regolith} />
    </mesh>
  )
}

// Scatter a handful of rock meshes on the surface
const ROCK_POSITIONS = [
  [-3.8, 0, -2.2], [5.5, 0, -1.5], [-7.0, 0, 2.0],
  [2.5, 0, 3.5],  [9.0, 0, 1.0],  [-1.5, 0, -3.8],
  [4.0, 0, 2.8],  [-5.0, 0, -0.8],
]
function Rocks() {
  return (
    <group>
      {ROCK_POSITIONS.map(([x, y, z], i) => {
        const s = 0.06 + (i % 3) * 0.04
        return (
          <mesh key={i} position={[x, s * 0.5, z]} castShadow>
            <dodecahedronGeometry args={[s, 0]} />
            <primitive object={MAT.alumDark} />
          </mesh>
        )
      })}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Landing pad
// ─────────────────────────────────────────────────────────────────────────────
function LandingPad() {
  return (
    <group position={[0, 0.012, 0]}>
      {/* Concrete base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.1, 40]} />
        <primitive object={MAT.padBase} />
      </mesh>
      {/* Outer marker ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1.1, 40]} />
        <meshStandardMaterial color="#38beff" emissive="#38beff" emissiveIntensity={0.55} />
      </mesh>
      {/* Inner precision ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.36, 32]} />
        <meshStandardMaterial color="#38beff" emissive="#38beff" emissiveIntensity={0.7} />
      </mesh>
      {/* Cross-hairs */}
      {[0, Math.PI / 2].map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, r]}>
          <planeGeometry args={[2.0, 0.055]} />
          <meshStandardMaterial color="#38beff" emissive="#38beff" emissiveIntensity={0.45} />
        </mesh>
      ))}
      {/* Corner beacon lights */}
      {[[-0.85, 0.06, -0.85],[0.85, 0.06, -0.85],[-0.85, 0.06, 0.85],[0.85, 0.06, 0.85]].map(([x,y,z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#38beff" emissive="#38beff" emissiveIntensity={2.5} />
          </mesh>
          <pointLight color="#38beff" intensity={0.6} distance={2.2} />
        </group>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine bell (lathe-profile for realistic nozzle shape)
// ─────────────────────────────────────────────────────────────────────────────
function EngineBell({ position }) {
  const geo = useMemo(() => {
    // Radial profile of a bell nozzle: throat → expansion
    const pts = [
      new THREE.Vector2(0.025, 0.00),   // throat inlet
      new THREE.Vector2(0.032, 0.02),
      new THREE.Vector2(0.048, 0.05),
      new THREE.Vector2(0.072, 0.10),
      new THREE.Vector2(0.098, 0.16),
      new THREE.Vector2(0.118, 0.22),   // bell exit
    ]
    return new THREE.LatheGeometry(pts, 20)
  }, [])

  return (
    <mesh position={position} rotation={[Math.PI, 0, 0]} castShadow>
      <primitive object={geo} />
      <primitive object={MAT.bell} />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Landing leg assembly (one leg, replicated ×4)
// leg_left  → legs 0 & 2  (i%2===0)
// leg_right → legs 1 & 3
// ─────────────────────────────────────────────────────────────────────────────
function LandingLeg({ angle, isContact }) {
  const spread = 0.64    // horizontal reach from body centre
  const drop   = -0.46   // vertical position of footpad

  // Strut goes from body attachment [0,0,0] to footpad position
  const footX = Math.sin(angle) * spread
  const footZ = Math.cos(angle) * spread
  const footY = drop

  const strutLen = Math.sqrt(footX**2 + footY**2 + footZ**2)
  const strutDir = new THREE.Vector3(footX, footY, footZ).normalize()
  const axis    = new THREE.Vector3(0, 1, 0).cross(strutDir).normalize()
  const rotAngle = Math.acos(new THREE.Vector3(0, 1, 0).dot(strutDir))
  const q = new THREE.Quaternion().setFromAxisAngle(axis, rotAngle)

  // Diagonal brace: halfway along the strut, angles back toward the body
  const braceTopX = Math.sin(angle) * 0.12
  const braceTopZ = Math.cos(angle) * 0.12
  const braceTopY = -0.22

  return (
    <group>
      {/* Primary structural strut */}
      <mesh
        position={[footX / 2, footY / 2, footZ / 2]}
        quaternion={q}
        castShadow
      >
        <cylinderGeometry args={[0.018, 0.024, strutLen, 8]} />
        <primitive object={MAT.alumDark} />
      </mesh>

      {/* Diagonal brace */}
      {(() => {
        const bx = (braceTopX + footX) / 2
        const by = (braceTopY + footY) / 2
        const bz = (braceTopZ + footZ) / 2
        const bLen = Math.sqrt(
          (footX - braceTopX)**2 + (footY - braceTopY)**2 + (footZ - braceTopZ)**2
        )
        const bDir = new THREE.Vector3(footX - braceTopX, footY - braceTopY, footZ - braceTopZ).normalize()
        const bAxis = new THREE.Vector3(0, 1, 0).cross(bDir).normalize()
        const bRot = new THREE.Quaternion().setFromAxisAngle(bAxis, Math.acos(new THREE.Vector3(0,1,0).dot(bDir)))
        return (
          <mesh position={[bx, by, bz]} quaternion={bRot} castShadow>
            <cylinderGeometry args={[0.011, 0.011, bLen, 6]} />
            <primitive object={MAT.alumDark} />
          </mesh>
        )
      })()}

      {/* Footpad — flat disc */}
      <mesh position={[footX, footY, footZ]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.095, 0.095, 0.018, 12]} />
        <meshStandardMaterial
          color={isContact ? '#00e5a0' : '#2a3540'}
          roughness={0.55}
          metalness={0.7}
          emissive={isContact ? '#00e5a0' : '#000000'}
          emissiveIntensity={isContact ? 0.6 : 0}
        />
      </mesh>

      {/* Contact glow */}
      {isContact && (
        <pointLight
          position={[footX, footY + 0.05, footZ]}
          color="#00e5a0"
          intensity={0.5}
          distance={0.8}
        />
      )}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Full lunar lander spacecraft
// ─────────────────────────────────────────────────────────────────────────────
function LanderModel({ telemetry }) {
  const groupRef   = useRef()
  const thrustRef  = useRef()
  const thrustLRef = useRef()
  const thrustRRef = useRef()
  const mainThrust = useRef(0)
  const leftThrust = useRef(0)
  const rightThrust= useRef(0)

  // Four legs at 45 ° / 135 ° / 225 ° / 315 °
  const legAngles = [
    Math.PI * 0.25,    // front-right
    Math.PI * 0.75,    // front-left
    Math.PI * 1.25,    // back-left
    Math.PI * 1.75,    // back-right
  ]

  useFrame((_, delta) => {
    if (!groupRef.current || telemetry.x === null) return

    const tx = telemetry.x * 4
    const ty = Math.max(0.52, telemetry.y * 3)
    const rz = -(telemetry.angle ?? 0)
    const k12 = 1 - Math.exp(-12 * delta)
    const k14 = 1 - Math.exp(-14 * delta)

    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, tx,  k12)
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, ty,  k12)
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, rz,  k14)

    const action = telemetry.action ?? -1

    // Main engine
    const mTarget = action === 2 ? 1 : 0
    mainThrust.current = THREE.MathUtils.lerp(mainThrust.current, mTarget, 1 - Math.exp(-18 * delta))
    if (thrustRef.current) {
      const s = mainThrust.current
      thrustRef.current.scale.set(s, s, s)
      thrustRef.current.material.opacity = s * 0.85
    }

    // Left thruster (action=3 fires left engine)
    const lTarget = action === 3 ? 1 : 0
    leftThrust.current = THREE.MathUtils.lerp(leftThrust.current, lTarget, 1 - Math.exp(-22 * delta))
    if (thrustLRef.current) {
      const s = leftThrust.current * 0.55
      thrustLRef.current.scale.set(s, s, s)
    }

    // Right thruster (action=1 fires right engine)
    const rTarget = action === 1 ? 1 : 0
    rightThrust.current = THREE.MathUtils.lerp(rightThrust.current, rTarget, 1 - Math.exp(-22 * delta))
    if (thrustRRef.current) {
      const s = rightThrust.current * 0.55
      thrustRRef.current.scale.set(s, s, s)
    }
  })

  const legContact = [
    telemetry.legLeft,  // leg 0
    telemetry.legRight, // leg 1
    telemetry.legLeft,  // leg 2
    telemetry.legRight, // leg 3
  ]

  return (
    <group ref={groupRef} position={[0, 2.5, 0]}>

      {/* ── Descent stage (lower, wider, gold MLI) ──────────────────── */}
      <group position={[0, 0, 0]}>
        {/* Main structural box — octagonal cross-section */}
        <mesh castShadow>
          <cylinderGeometry args={[0.30, 0.32, 0.28, 8]} />
          <primitive object={MAT.mli} />
        </mesh>

        {/* MLI panel strips around the body */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.sin(a) * 0.31, 0, Math.cos(a) * 0.31]} rotation={[0, -a, 0]} castShadow>
              <boxGeometry args={[0.04, 0.24, 0.01]} />
              <primitive object={MAT.alum} />
            </mesh>
          )
        })}

        {/* Fuel tanks visible on sides (two cylinders, ±X) */}
        {[-1, 1].map((sx, i) => (
          <mesh key={i} position={[sx * 0.22, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.095, 0.095, 0.22, 12]} />
            <primitive object={MAT.alum} />
          </mesh>
        ))}

        {/* Bottom thrust frame ring */}
        <mesh position={[0, -0.155, 0]} castShadow>
          <torusGeometry args={[0.22, 0.018, 8, 20]} />
          <primitive object={MAT.alumDark} />
        </mesh>

        {/* Engine bell */}
        <EngineBell position={[0, -0.19, 0]} />

        {/* Main engine plume */}
        <mesh ref={thrustRef} position={[0, -0.46, 0]} scale={0}>
          <coneGeometry args={[0.11, 0.52, 12]} />
          <meshStandardMaterial
            color="#6ec8ff"
            emissive="#2080ff"
            emissiveIntensity={3.5}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Engine glow light */}
        {telemetry.action === 2 && (
          <pointLight position={[0, -0.55, 0]} color="#5ab8ff" intensity={3.5} distance={4.5} />
        )}

        {/* Landing legs */}
        {legAngles.map((angle, i) => (
          <LandingLeg key={i} angle={angle} isContact={legContact[i]} />
        ))}
      </group>

      {/* ── Ascent stage (upper, lighter, white paint) ───────────────── */}
      <group position={[0, 0.29, 0]}>
        {/* Main cylinder */}
        <mesh castShadow>
          <cylinderGeometry args={[0.20, 0.22, 0.32, 10]} />
          <primitive object={MAT.whitePaint} />
        </mesh>

        {/* Forward window / sensor bay */}
        <mesh position={[0.18, 0.04, 0]} castShadow>
          <boxGeometry args={[0.04, 0.08, 0.10]} />
          <meshStandardMaterial color="#0a2040" roughness={0.05} metalness={0.9} envMapIntensity={1.5} />
        </mesh>

        {/* RCS thruster quads (four tiny boxes) */}
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => (
          <mesh key={i} position={[Math.sin(a) * 0.21, 0.04, Math.cos(a) * 0.21]} castShadow>
            <boxGeometry args={[0.035, 0.035, 0.035]} />
            <primitive object={MAT.alumDark} />
          </mesh>
        ))}

        {/* Docking port top */}
        <mesh position={[0, 0.20, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.05, 12]} />
          <primitive object={MAT.alum} />
        </mesh>

        {/* Top dome */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <sphereGeometry args={[0.09, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <primitive object={MAT.alum} />
        </mesh>

        {/* Antennas */}
        {[
          { pos: [0.0, 0.24, 0.0], len: 0.18, tilt: [0.4, 0, 0] },
          { pos: [0.0, 0.24, 0.0], len: 0.14, tilt: [-0.3, 0.3, 0] },
        ].map(({ pos, len, tilt }, i) => (
          <group key={i} position={pos} rotation={tilt}>
            <mesh castShadow>
              <cylinderGeometry args={[0.005, 0.003, len, 5]} />
              <primitive object={MAT.antenna} />
            </mesh>
            {/* Antenna tip */}
            <mesh position={[0, len / 2, 0]}>
              <sphereGeometry args={[0.009, 6, 6]} />
              <primitive object={MAT.antenna} />
            </mesh>
          </group>
        ))}

        {/* Lateral RCS plumes */}
        <mesh
          ref={thrustLRef}
          position={[-0.225, 0.04, 0]}
          rotation={[0, 0, Math.PI / 2]}
          scale={0}
        >
          <coneGeometry args={[0.04, 0.20, 8]} />
          <meshStandardMaterial
            color="#ffcc44"
            emissive="#ff8800"
            emissiveIntensity={3}
            transparent opacity={0.82}
            depthWrite={false}
          />
        </mesh>
        <mesh
          ref={thrustRRef}
          position={[0.225, 0.04, 0]}
          rotation={[0, 0, -Math.PI / 2]}
          scale={0}
        >
          <coneGeometry args={[0.04, 0.20, 8]} />
          <meshStandardMaterial
            color="#ffcc44"
            emissive="#ff8800"
            emissiveIntensity={3}
            transparent opacity={0.82}
            depthWrite={false}
          />
        </mesh>
      </group>

    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Trajectory trail (unchanged logic, copied from original)
// ─────────────────────────────────────────────────────────────────────────────
function TrajectoryTrail({ trailRef }) {
  const lineRef = useRef()

  useFrame(() => {
    const trail = trailRef.current
    if (!lineRef.current || trail.length < 2) return
    const points = trail.map(p => new THREE.Vector3(p.x * 4, Math.max(0.52, p.y * 3), 0))
    lineRef.current.geometry.setFromPoints(points)
  })

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="#38beff" opacity={0.4} transparent linewidth={1} />
    </line>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera rig (same lerp logic as original)
// ─────────────────────────────────────────────────────────────────────────────
function CameraRig({ telemetry }) {
  const { camera } = useThree()
  useFrame((_, delta) => {
    if (telemetry.x === null) return
    const tx = telemetry.x * 4
    const ty = Math.max(0.52, telemetry.y * 3)
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, tx * 0.28, 1 - Math.exp(-2 * delta))
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2.2 + ty * 0.35, 1 - Math.exp(-2 * delta))
  })
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene root (same Canvas / OrbitControls API as original)
// ─────────────────────────────────────────────────────────────────────────────
export default function LunarScene({ telemetry, trailRef, isRunning }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 3.5, 9], fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      dpr={[1, 1.5]}
    >
      {/* ── Lighting ─────────────────────────────────────────────────────── */}

      {/* Dim ambient so shadows stay dark */}
      <ambientLight intensity={0.08} />

      {/* Primary sun — bright, slightly warm */}
      <directionalLight
        position={[10, 16, 6]}
        intensity={2.2}
        color="#fff5e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
      />

      {/* Fill / earthshine — cool blue from below */}
      <directionalLight position={[-6, 3, -4]} intensity={0.35} color="#8ab0ff" />

      {/* Rim light — separates craft from dark sky */}
      <directionalLight position={[0, 2, -10]} intensity={0.5} color="#aac8ff" />

      {/* Stars */}
      <Stars radius={90} depth={55} count={4500} factor={4} saturation={0.05} fade speed={0.2} />

      {/* Gentle depth fog */}
      <fog attach="fog" color="#04060d" near={18} far={32} />

      {/* ── Scene objects ─────────────────────────────────────────────────── */}
      <LunarSurface />
      <Rocks />
      <LandingPad />
      <LanderModel telemetry={telemetry} />
      {isRunning && <TrajectoryTrail trailRef={trailRef} />}

      {/* ── Camera & controls (same props as original) ─────────────────── */}
      <CameraRig telemetry={telemetry} />
      <OrbitControls
        target={[0, 1, 0]}
        enablePan={false}
        minDistance={4}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2.1}
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  )
}
