// SphereScene.jsx
import React, { useRef, useMemo } from 'react';
import { useFrame, extend, useThree } from '@react-three/fiber';
import { Line, Html, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ShaderMaterial } from 'three';

// Custom ripple‐heat shader for the core glow
const HeatShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color(0x00ffff) },
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
    uniform vec3 color;
    varying vec2 vUv;
    void main(){
      // radial ripple
      vec2 uv = vUv - 0.5;
      float r = length(uv)*2.0;
      float ripple = 0.1 * sin(20.0*r - time*4.0);
      float intensity = smoothstep(0.4, 0.0, r + ripple);
      gl_FragColor = vec4(color * intensity, intensity);
    }
  `
};
extend({ HeatMaterial: ShaderMaterial });

export default function SphereScene() {
  const groupRef = useRef();
  const coreRef  = useRef();
  const { size } = useThree();
  // mouse tilt
  const mouse = useRef({ x: 0, y: 0 });

  // on each frame: rotate shells, pulse core, mouse‐tilt group
  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    // update mouse tilt target
    mouse.current.x = (pointer.x) * 0.3;
    mouse.current.y = (pointer.y) * 0.3;

    // smooth group tilt + auto‐spin
    groupRef.current.rotation.x += (mouse.current.y - groupRef.current.rotation.x)*0.05 + 0.002;
    groupRef.current.rotation.y += (mouse.current.x - groupRef.current.rotation.y)*0.05 + 0.004;

    // pulse outer shells
    groupRef.current.children.forEach((node,i)=>{
      if(node.isMesh){
        const scale = 1 + 0.02 * Math.sin(t*3 + i);
        node.scale.set(scale, scale, scale);
      }
    });

    // animate core shader
    coreRef.current.material.uniforms.time.value = t;
  });

  // generate multiple tilted wireframe shells
  const shells = useMemo(() => {
    const shells = [];
    const radii = [2.0, 2.3, 2.6];
    radii.forEach((r, i) => {
      const geo = new THREE.SphereGeometry(r, 48, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        wireframe: true,
        transparent: true,
        opacity: 0.4 - i*0.1
      });
      shells.push(
        <mesh key={`shell-${i}`} geometry={geo} material={mat}
          rotation={[i*0.4, i*0.6, i*0.2]} />
      );
    });
    return shells;
  }, []);

  // generate flowing streamlines
  const streams = useMemo(() => {
    const seg = 200;
    const tubes = [];
    for(let i=0; i<6; i++){
      const curve = new THREE.CatmullRomCurve3(
        new Array(seg).fill().map((_,j)=>{
          const t = j/(seg-1)*Math.PI*2;
          const radius = 2.4 + 0.2*Math.sin(i + t*3);
          const x = Math.cos(t + i)*radius;
          const y = Math.sin(i*1.2 + t*2)*0.3;
          const z = Math.sin(t + i)*radius;
          return new THREE.Vector3(x,y,z);
        })
      );
      tubes.push(
        <Line key={`stream-${i}`}
          points={curve.getPoints(200)}
          color={new THREE.Color(0x00ffff).convertSRGBToLinear()}
          lineWidth={1.2}
          dashed
          dashSize={0.05}
          gapSize={0.1}
          opacity={0.5}
        />
      );
    }
    return tubes;
  }, []);

  // labels exactly like image
  const labels = [
    { text:'RELIABLE',         pos:[0,3.2,0] },
    { text:'SCALABILITY',      pos:[3,1,0] },
    { text:'BLAZINGLY FAST',   pos:[2,2.5,1] },
    { text:'HIGH COMPATIBILITY',pos:[-3,1,0] },
    { text:'WORKS WITH PGVECTOR',pos:[-2,-2.2,0] },
    { text:'WORKS WITH LANGCHAIN',pos:[2,-2.5,0] }
  ];

  return (
    <>
      {/* postprocessing: bloom, DOF, vignette */}
      <EffectComposer>
        <Bloom intensity={1.2} luminanceThreshold={0.1} luminanceSmoothing={0.9} />
        <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} />
        <Vignette eskil={false} offset={0.1} darkness={1.2} />
      </EffectComposer>

      <group ref={groupRef}>
        {/* outer wire shells */}
        {shells}

        {/* flowing neon streams */}
        {streams}

        {/* central glowing core */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[1.2, 32, 16]} />
          <heatMaterial attach="material" args={[HeatShader]} />
        </mesh>

        {/* text labels */}
        {labels.map((lbl,i)=>(
          <Html
            key={i}
            className="label"
            position={lbl.pos}
            center
            distanceFactor={4}
            occlude
            onPointerOver={e=>e.stopPropagation()}
          >
            {lbl.text}
          </Html>
        ))}
      </group>

      {/* interactive controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.6}
        minPolarAngle={0.8}
        maxPolarAngle={Math.PI/1.8}
      />
    </>
  );
}
