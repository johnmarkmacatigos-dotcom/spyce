import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import * as THREE from 'three';
import { ThreeCanvas } from './ThreeCanvas';

export function OnboardingGlobe() {
  let globe: THREE.Mesh;
  let particles: THREE.Points;
  let ring1: THREE.Mesh, ring2: THREE.Mesh;

  const onSetup = useCallback(({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }) => {
    camera.position.z = 4;

    // Globe
    const geoSphere = new THREE.SphereGeometry(1.5, 64, 64);
    const matGlobe = new THREE.MeshPhongMaterial({
      color: 0x0A0A0A,
      emissive: 0xFF3300,
      emissiveIntensity: 0.08,
      wireframe: true,
    });
    globe = new THREE.Mesh(geoSphere, matGlobe);
    scene.add(globe);

    // Orbit rings
    const ring1Geo = new THREE.TorusGeometry(2.2, 0.015, 8, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xFF6B2B, opacity: 0.4, transparent: true });
    ring1 = new THREE.Mesh(ring1Geo, ringMat);
    ring1.rotation.x = Math.PI / 3;
    scene.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(2.6, 0.01, 8, 100);
    ring2 = new THREE.Mesh(ring2Geo, ringMat.clone());
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    scene.add(ring2);

    // Floating particles (Pi coins)
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.8 + Math.random() * 1.5;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0xFF6B2B, size: 0.05, transparent: true, opacity: 0.6 });
    particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Ambient + directional light
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dirLight = new THREE.DirectionalLight(0xFF6B2B, 1);
    dirLight.position.set(3, 3, 5);
    scene.add(dirLight);
  }, []);

  const onFrame = useCallback((clock: THREE.Clock) => {
    const t = clock.getElapsedTime();
    if (globe) globe.rotation.y = t * 0.15;
    if (particles) particles.rotation.y = -t * 0.05;
    if (ring1) ring1.rotation.z = t * 0.3;
    if (ring2) ring2.rotation.z = -t * 0.2;
  }, []);

  return <ThreeCanvas onSetup={onSetup} onFrame={onFrame} style={styles.globe} />;
}

const styles = StyleSheet.create({
  globe: { flex: 1 },
});
