import React, { useCallback, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import * as THREE from 'three';
import { ThreeCanvas } from './ThreeCanvas';

interface Coin {
  mesh: THREE.Mesh;
  vy: number;
  vx: number;
  spin: number;
  life: number;
}

export function PiCoinBurst({ amount, onComplete }: { amount: number; onComplete?: () => void }) {
  const coins = useRef<Coin[]>([]);
  const opacity = useRef(new Animated.Value(1)).current;
  const completed = useRef(false);

  const onSetup = useCallback(({ scene }: { scene: THREE.Scene }) => {
    const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 32);

    for (let i = 0; i < 5; i++) {
      const coinMat = new THREE.MeshStandardMaterial({
        color: 0xFFD700, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 1,
      });
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.set((Math.random() - 0.5) * 2, -1, 0);
      coin.rotation.x = Math.PI / 2;
      scene.add(coin);

      coins.current.push({
        mesh: coin,
        vy: 0.05 + Math.random() * 0.05,
        vx: (Math.random() - 0.5) * 0.03,
        spin: Math.random() * 0.1,
        life: 1.0,
      });
    }

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const pl = new THREE.PointLight(0xFFD700, 3, 10);
    pl.position.set(0, 0, 3);
    scene.add(pl);
  }, []);

  const onFrame = useCallback(() => {
    let allDone = true;
    for (const coin of coins.current) {
      if (coin.life <= 0) continue;
      allDone = false;
      coin.mesh.position.y += coin.vy;
      coin.mesh.position.x += coin.vx;
      coin.mesh.rotation.y += coin.spin;
      coin.life -= 0.015;
      (coin.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, coin.life);
    }
    if (allDone && !completed.current) {
      completed.current = true;
      onComplete?.();
    }
  }, [onComplete]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <ThreeCanvas onSetup={onSetup} onFrame={onFrame} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none',
  },
});
