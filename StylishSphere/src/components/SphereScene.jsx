import React, { useRef, useMemo } from 'react'
import { useFrame, extend, useThree } from '@react-three/fiber'
import { Line, Html, OrbitControls, Points, PointMaterial } from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
  ChromaticAberration
} from '@react-three/postprocessing'
import * as THREE from 'three'
import { ShaderMaterial } from 'three'


const HeatShader = {
  uniforms: {
    time:   { value: 0 },
    color1: { value: new THREE.Color(0x884422) }, 
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
      float ripple = sin(r*30.0 - time*8.0) * 0.15;
      float intensity = smoothstep(0.6, 0.0, r + ripple);
      vec3 c = mix(color2, color1, intensity);
      gl_FragColor = vec4(c, intensity*0.92);
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

  
  scene.background = new THREE.Color('#0d0707')

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    
    mouse.current.x = pointer.x * 0.4
    mouse.current.y = pointer.y * 0.4

    
    groupRef.current.rotation.x += (mouse.current.y - groupRef.current.rotation.x) * 0.05 + 0.002
    groupRef.current.rotation.y += (mouse.current.x - groupRef.current.rotation.y) * 0.05 + 0.006
    groupRef.current.rotation.z += 0.001  

    
    groupRef.current.children.forEach((node, idx) => {
      if (node.userData.isShell) {
        const scale = 1 + 0.025 * Math.sin(t * 2.5 + idx)
        node.scale.set(scale, scale, scale)
      }
    })

    
    coreRef.current.material.uniforms.time.value = t

    
    holeRef.current.rotation.x += 0.012
    holeRef.current.rotation.y += 0.008

    
    particleRef.current.rotation.y = t * 0.02
    particleRef.current.rotation.x = t * 0.01
  })

  
  const shells = useMemo(() => {
    return [2.0, 2.5, 3.0].map((r, i) => {
      const geo = new THREE.SphereGeometry(r, 64, 48)
      const mat = new THREE.MeshBasicMaterial({
        color:       new THREE.Color(0xff9933),
        wireframe:   true,
        transparent: true,
        opacity:     0.25 + i * 0.08
      })
      return (
        <mesh
          key={`shell-${i}`}
          geometry={geo}
          material={mat}
          rotation={[i * 0.3, i * 0.6, i * 0.15]}
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
        const rad = 2.5 + 0.3 * Math.sin(i + th * 2.8)
        return new THREE.Vector3(
          Math.cos(th + i) * rad,
          Math.sin(i * 1.3 + th) * 0.4,
          Math.sin(th + i) * rad
        )
      })
      return (
        <Line
          key={`stream-${i}`}
          points={pts}
          color="#ffaa33"
          lineWidth={1.6}
          dashed
          dashSize={0.05}
          gapSize={0.12}
          opacity={0.75}
        />
      )
    })
  }, [])

  
  const holeGeo = new THREE.TorusKnotGeometry(0.7, 0.2, 200, 32, 2, 3)
  const holeMat = new THREE.MeshStandardMaterial({
    color:       0x110000,
    emissive:    0xaa3300,
    metalness:   0.95,
    roughness:   0.15,
    transparent: true,
    opacity:     0.85
  })

  
  const particles = useMemo(() => {
    const count = 5000
    const posArr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const phi = Math.random() * Math.PI
      const th  = Math.random() * Math.PI * 2
      const r   = THREE.MathUtils.randFloat(6, 9)
      posArr[3 * i]     = Math.sin(phi) * Math.cos(th) * r
      posArr[3 * i + 1] = Math.cos(phi) * r * 0.3
      posArr[3 * i + 2] = Math.sin(phi) * Math.sin(th) * r
    }
    return posArr
  }, [])

  
  const labels = [
    { t: 'RELIABLE',            p: [0, 3.6, 0] },
    { t: 'SCALABILITY',         p: [3.4, 1.4, 0] },
    { t: 'LIGHTNING FAST',      p: [2.9, 3.0, 1.4] },
    { t: 'HIGH COMPATIBILITY',  p: [-3.4, 1.3, 0] },
    { t: 'PGVECTOR INTEGRATION',p: [-2.6, -2.6, 0] },
    { t: 'LANGCHAIN SUPPORT',   p: [2.6, -2.9, 0] }
  ]

  return (
    <>
      <EffectComposer multisampling={4}>
        <Bloom intensity={1.6} luminanceThreshold={0.12} luminanceSmoothing={0.8}/>
        <DepthOfField focusDistance={0} focalLength={0.04} bokehScale={3.5}/>
        <ChromaticAberration offset={[0.002,0.002]}/>
        <Vignette eskil={false} offset={0.2} darkness={1.8}/>
      </EffectComposer>

      <group ref={particleRef}>
        <Points positions={particles}>
          <PointMaterial
            transparent
            size={0.025}
            color="#ffaa33"
            opacity={0.45}
            sizeAttenuation
          />
        </Points>
      </group>

      <group ref={groupRef}>
        {shells}
        {streams}

        <mesh ref={coreRef}>
          <sphereGeometry args={[1.3, 32, 16]}/>
          <heatMaterial attach="material" args={[HeatShader]}/>
        </mesh>

        <mesh ref={holeRef} geometry={holeGeo} material={holeMat}/>

        {labels.map((lbl,i)=>(
          <Html
            key={`label-${i}`}
            className="label"
            position={lbl.p}
            center
            distanceFactor={5}
            occlude
            style={{
              color: '#ffeeaa',
              textShadow: '0 0 12px #ffeeaa',
              fontSize: '16px',
              fontWeight: 600
            }}
          >
            {lbl.t}
          </Html>
        ))}
      </group>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.7}
        minPolarAngle={0.8}
        maxPolarAngle={Math.PI/2}
      />
    </>
  )
}
