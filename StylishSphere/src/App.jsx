import React from 'react';
import { Canvas } from '@react-three/fiber';
import SphereScene from './components/SphereScene';

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 70 }}
      gl={{ antialias: true, toneMappingExposure: 1.1, alpha: true }}
      style={{ width: '100vw', height: '100vh' }}
    >
      {}
      <ambientLight intensity={0.15} />
      <directionalLight color="#7aff9a" position={[5, 5, 5]} intensity={0.4} />
      {}
      <SphereScene />
    </Canvas>
  );
}
