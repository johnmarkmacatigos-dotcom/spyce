import React, { useRef, useCallback } from 'react';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

interface ThreeCanvasProps {
  onSetup: (params: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: any }) => void;
  onFrame?: (clock: THREE.Clock) => void;
  style?: any;
}

export function ThreeCanvas({ onSetup, onFrame, style }: ThreeCanvasProps) {
  const rafRef = useRef<number>();
  const sceneRef = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: any }>();

  const onContextCreate = useCallback(async (gl: any) => {
    const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;

    const renderer = new Renderer({ gl });
    renderer.setSize(w, h);
    renderer.setPixelRatio(2);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.z = 5;

    const clock = new THREE.Clock();
    sceneRef.current = { scene, camera, renderer };

    onSetup({ scene, camera, renderer });

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      onFrame?.(clock);
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      // Dispose all geometries and materials
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [onSetup, onFrame]);

  return <GLView style={[{ flex: 1 }, style]} onContextCreate={onContextCreate} />;
}
