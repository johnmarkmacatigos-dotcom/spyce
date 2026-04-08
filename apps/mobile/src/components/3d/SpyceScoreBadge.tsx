import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as THREE from 'three';
import { ThreeCanvas } from './ThreeCanvas';

export function SpyceScoreBadge({ score }: { score: number }) {
  let torus: THREE.Mesh;
  let iMesh: THREE.InstancedMesh;

  const onSetup = useCallback(({ scene }: { scene: THREE.Scene }) => {
    // Outer glow ring
    const torusGeo = new THREE.TorusGeometry(1.2, 0.08, 16, 100);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0xFF6B2B, emissive: 0xFF6B2B, emissiveIntensity: 0.6, roughness: 0.2,
    });
    torus = new THREE.Mesh(torusGeo, torusMat);
    scene.add(torus);

    // Score disc
    const discGeo = new THREE.CylinderGeometry(1, 1, 0.15, 64);
    const discMat = new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.3, metalness: 0.8 });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2;
    scene.add(disc);

    // Flame particles (instanced)
    const flameGeo = new THREE.ConeGeometry(0.06, 0.3, 8);
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xFF6B2B, emissive: 0xE84040, emissiveIntensity: 1 });
    iMesh = new THREE.InstancedMesh(flameGeo, flameMat, 12);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      matrix.setPosition(Math.cos(angle) * 1.4, Math.sin(angle) * 1.4, 0);
      iMesh.setMatrixAt(i, matrix);
    }
    iMesh.instanceMatrix.needsUpdate = true;
    scene.add(iMesh);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pointLight = new THREE.PointLight(0xFF6B2B, 2, 10);
    pointLight.position.set(2, 2, 3);
    scene.add(pointLight);
  }, []);

  const onFrame = useCallback((clock: THREE.Clock) => {
    const t = clock.getElapsedTime();
    if (torus) {
      torus.rotation.z = t * 0.5;
      torus.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
    }
  }, []);

  return (
    <View style={styles.container}>
      <ThreeCanvas onSetup={onSetup} onFrame={onFrame} />
      <View style={styles.scoreOverlay}>
        <Text style={styles.scoreNum}>{score}</Text>
        <Text style={styles.scoreLabel}>SPYCE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 120, height: 120, position: 'relative' },
  scoreOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { color: '#FF6B2B', fontSize: 24, fontWeight: '900' },
  scoreLabel: { color: '#FFFFFF88', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
});
