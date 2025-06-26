import React, { useRef, useMemo } from 'react'
import { useFrame, extend, useThree } from '@react-three/fiber'
import { Line, Html, OrbitControls, Points, PointMaterial } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'

const HeatShader = {
  uniforms: {
    time:   { value: 0 },
    color1: { value: new THREE.Color(0x006644) },
    color2: { value: new THREE.Color(0x000000) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    varying vec2 vUv;
    void main(){
      vec2 uv = vUv - 0.5;
      float r = length(uv)*2.0;
      float ripple = sin(r*30.0 - time*8.0) * 0.1;
      float intensity = smoothstep(0.5, 0.0, r + ripple);
      vec3 c = mix(color2, color1, intensity);
      gl_FragColor = vec4(c, intensity*0.95);
    }
  `
}
extend({ HeatMaterial: ShaderMaterial })

export default function SphereScene() {
  const groupRef    = useRef()
  const coreRef     = useRef()
  const holeRef     = useRef()
  const particleRef = useRef()
  const mouse       = useRef({ x: 0, y: 0 })
  const { scene, pointer } = useThree()

  scene.background = new THREE.Color('#1a0e0e')

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    mouse.current.x = pointer.x * 0.35
    mouse.current.y = pointer.y * 0.35
    groupRef.current.rotation.x += (mouse.current.y - groupRef.current.rotation.x) * 0.05 + 0.002
    groupRef.current.rotation.y += (mouse.current.x - groupRef.current.rotation.y) * 0.05 + 0.005
    groupRef.current.children.forEach((node, idx) => {
      if (node.userData.isShell) {
        const s = 1 + 0.03 * Math.sin(t * 3 + idx)
        node.scale.set(s, s, s)
      }
    })
    coreRef.current.material.uniforms.time.value = t
    holeRef.current.rotation.x += 0.01
    holeRef.current.rotation.y += 0.007
    particleRef.current.rotation.y = t * 0.015
    particleRef.current.rotation.x = t * 0.008
  })

  const shells = useMemo(() => {
    return [2.0, 2.4, 2.8].map((r, i) => {
      const geo = new THREE.SphereGeometry(r, 64, 48)
      const mat = new THREE.MeshBasicMaterial({
        color:       new THREE.Color(0xffcc33),
        wireframe:   true,
        transparent: true,
        opacity:     0.3 + i * 0.1
      })
      return (
        <mesh
          key={i}
          geometry={geo}
          material={mat}
          rotation={[i * 0.2, i * 0.4, i * 0.1]}
          userData={{ isShell: true }}
        />
      )
    })
  }, [])

  const streams = useMemo(() => {
    const seg = 200
    return Array.from({ length: 6 }).map((_, i) => {
      const pts = Array.from({ length: seg }).map((_, j) => {
        const th = (j / (seg - 1)) * Math.PI * 2
        const rad = 2.5 + 0.3 * Math.sin(i + th * 3)
        return new THREE.Vector3(
          Math.cos(th + i) * rad,
          Math.sin(i * 1.3 + th) * 0.35,
          Math.sin(th + i) * rad
        )
      })
      return (
        <Line
          key={i}
          points={pts}
          color="#ffdd55"
          lineWidth={1.5}
          dashed
          dashSize={0.06}
          gapSize={0.1}
          opacity={0.7}
        />
      )
    })
  }, [])

  const holeGeo = new THREE.TorusKnotGeometry(0.6, 0.18, 200, 32, 2, 3)
  const holeMat = new THREE.MeshStandardMaterial({
    color:       0x220000,
    emissive:    0xbb4400,
    metalness:   0.9,
    roughness:   0.2,
    transparent: true,
    opacity:     0.8
  })

  const particles = useMemo(() => {
    const count = 4000
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const phi = Math.random() * Math.PI
      const th  = Math.random() * Math.PI * 2
      const r   = THREE.MathUtils.randFloat(5, 8)
      pos[3 * i]     = Math.sin(phi) * Math.cos(th) * r
      pos[3 * i + 1] = Math.cos(phi) * r * 0.5
      pos[3 * i + 2] = Math.sin(phi) * Math.sin(th) * r
    }
    return pos
  }, [])

  const labels = [
    { t: 'RELIABLE',           p: [0, 3.4, 0] },
    { t: 'SCALABILITY',        p: [3.2, 1.2, 0] },
    { t: 'BLAZINGLY FAST',     p: [2.8, 2.6, 1.2] },
    { t: 'HIGH COMPATIBILITY', p: [-3.2, 1.1, 0] },
    { t: 'WORKS WITH PGVECTOR',p: [-2.4, -2.4, 0] },
    { t: 'WORKS WITH LANGCHAIN',p: [2.4, -2.7, 0] }
  ]

  return (
    <>
      <EffectComposer multisampling={4}>
        <Bloom intensity={1.4} luminanceThreshold={0.1} luminanceSmoothing={0.7} />
        <DepthOfField focusDistance={0} focalLength={0.03} bokehScale={3} />
        <ChromaticAberration offset={[0.001, 0.001]} />
        <Vignette eskil={false} offset={0.18} darkness={1.7} />
      </EffectComposer>

      <group ref={particleRef}>
        <Points positions={particles}>
          <PointMaterial transparent size={0.02} color="#ffcc55" opacity={0.4} sizeAttenuation />
        </Points>
      </group>

      <group ref={groupRef}>
        {shells}
        {streams}
        <mesh ref={coreRef}>
          <sphereGeometry args={[1.2, 32, 16]} />
          <heatMaterial attach="material" args={[HeatShader]} />
        </mesh>
        <mesh ref={holeRef} geometry={holeGeo} material={holeMat} />
        {labels.map((lbl, i) => (
          <Html
            key={i}
            className="label"
            position={lbl.p}
            center
            distanceFactor={5}
            style={{
              color: '#ffee88',
              textShadow: '0 0 8px #ffee88'
            }}
            occlude
          >
            {lbl.t}
          </Html>
        ))}
      </group>

      <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.6} minPolarAngle={0.8} maxPolarAngle={Math.PI / 1.9} />
    </>
  )
}
