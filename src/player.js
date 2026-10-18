import * as THREE from 'three';

export class WorldManager {
    constructor(scene) {
        this.scene = scene;
        this.chunks = [];
        this.chunkLength = 45;
        this.speed = 18;
        this.obstacles = [];
        this.coins = [];
        this.hearts = [];
        this.checkpoints = [];
        this.particles = [];
        this.activeShifts = [];

        this.materials = {
            road: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }),
            side: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 }),
            obstacle: new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3, metalness: 0.4 }),
            coin: new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.8 }),
            heart: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.2, metalness: 0.6 }),
            checkpoint: new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 }),
            building1: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 }),
            building2: new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.5 }),
            windowMat: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
            cloudMat: new THREE.MeshBasicMaterial({ color: 0xffffff }),
            chaosObstacle: new THREE.MeshStandardMaterial({ color: 0xd946ef, roughness: 0.3, metalness: 0.6 })
        };

        for (let i = 0; i < 6; i++) {
            this.spawnChunk(-i * this.chunkLength, 1);
        }
    }

    spawnChunk(zPosition, section) {
        const chunkGroup = new THREE.Group();
        chunkGroup.position.z = zPosition;

        const roadGeo = new THREE.PlaneGeometry(8.5, this.chunkLength);
        const road = new THREE.Mesh(roadGeo, this.materials.road);
        road.rotation.x = -Math.PI / 2;
        road.receiveShadow = true;
        chunkGroup.add(road);

        const sideGeo = new THREE.PlaneGeometry(35, this.chunkLength);
        const leftSide = new THREE.Mesh(sideGeo, this.materials.side);
        leftSide.rotation.x = -Math.PI / 2;
        leftSide.position.x = -21.75;
        leftSide.receiveShadow = true;
        chunkGroup.add(leftSide);

        const rightSide = new THREE.Mesh(sideGeo, this.materials.side);
        rightSide.rotation.x = -Math.PI / 2;
        rightSide.position.x = 21.75;
        rightSide.receiveShadow = true;
        chunkGroup.add(rightSide);

        for (let side = -1; side <= 1; side += 2) {
            const height = 10 + Math.random() * 10;
            const bMat = Math.random() > 0.5 ? this.materials.building1 : this.materials.building2;
            const building = new THREE.Mesh(new THREE.BoxGeometry(5, height, 16), bMat);
            building.position.set(side * 24, height / 2, (Math.random() - 0.5) * 20);
            building.castShadow = true;
            chunkGroup.add(building);
        }

        if (zPosition < -25) {
            this.generateChunkContent(chunkGroup, zPosition, section);
        }

        this.scene.add(chunkGroup);
        this.chunks.push({ group: chunkGroup, z: zPosition, section });
    }

    generateChunkContent(chunkGroup, chunkZ, section) {
        const lanes = [-2.5, 0, 2.5];
        const densityStep = section === 1 ? 16 : section === 2 ? 14 : 12;

        for (let zOffset = -15; zOffset <= 15; zOffset += densityStep) {
            const laneIndex = Math.floor(Math.random() * 3);
            const rand = Math.random();

            if (rand < 0.45 * (section * 0.35)) {
                const obsMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 1), this.materials.obstacle);
                obsMesh.position.set(lanes[laneIndex], 0.7, zOffset);
                obsMesh.castShadow = true;
                chunkGroup.add(obsMesh);
                this.obstacles.push({ mesh: obsMesh, lane: laneIndex, z: chunkZ + zOffset, type: 'block' });
            } else if (rand < 0.6) {
                const heart = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), this.materials.heart);
                heart.position.set(lanes[laneIndex], 1, zOffset);
                heart.castShadow = true;
                chunkGroup.add(heart);
                this.hearts.push({ mesh: heart, lane: laneIndex, z: chunkZ + zOffset, collected: false });
            } else {
                for (let c = 0; c < 3; c++) {
                    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.12, 16), this.materials.coin);
                    coin.rotation.z = Math.PI / 2;
                    coin.position.set(lanes[laneIndex], 1, zOffset + (c * 1.5 - 1.5));
                    coin.castShadow = true;
                    chunkGroup.add(coin);
                    this.coins.push({ mesh: coin, lane: laneIndex, z: chunkZ + zOffset + (c * 1.5 - 1.5), collected: false });
                }
            }
        }
    }

    spawnCoinBurst(x, y, z) {
        for (let i = 0; i < 6; i++) {
            const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), this.materials.coin);
            pMesh.position.set(x, y, z);
            this.scene.add(pMesh);
            this.particles.push({
                mesh: pMesh,
                vel: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 6 + 2, (Math.random() - 0.5) * 6),
                life: 0.4
            });
        }
    }

    triggerChaosShift(eventType) {
        if (eventType === 0) {
            this.obstacles.forEach(obs => {
                if (obs.mesh && Math.abs(obs.z) < 30) {
                    obs.mesh.material = this.materials.chaosObstacle;
                    this.activeShifts.push({ target: obs.mesh, type: 'rotate', progress: 0, duration: 0.8 });
                }
            });
        } else if (eventType === 1) {
            this.obstacles.forEach(obs => {
                if (obs.mesh && Math.abs(obs.z) < 30) {
                    obs.lane = obs.lane === 0 ? (Math.random() > 0.5 ? 1 : -1) : 0;
                    this.activeShifts.push({
                        target: obs.mesh,
                        type: 'slide',
                        startX: obs.mesh.position.x,
                        targetX: obs.lane * 2.5,
                        progress: 0,
                        duration: 0.6
                    });
                }
            });
        } else if (eventType === 2) {
            this.obstacles.forEach(obs => {
                if (obs.mesh && Math.abs(obs.z) < 30) {
                    this.activeShifts.push({
                        target: obs.mesh,
                        type: 'lower',
                        startY: obs.mesh.position.y,
                        targetY: -1.5,
                        progress: 0,
                        duration: 0.5
                    });
                }
            });
        }
    }

    update(delta, section) {
        this.speed = 18 + (section - 1) * 4;
        const moveDist = this.speed * delta;

        for (let i = this.activeShifts.length - 1; i >= 0; i--) {
            const shift = this.activeShifts[i];
            shift.progress += delta / shift.duration;
            const t = Math.min(shift.progress, 1);

            if (shift.type === 'rotate') shift.target.rotation.y = t * Math.PI * 0.5;
            else if (shift.type === 'slide') shift.target.position.x = THREE.MathUtils.lerp(shift.startX, shift.targetX, t);
            else if (shift.type === 'lower') shift.target.position.y = THREE.MathUtils.lerp(shift.startY, shift.targetY, t);

            if (t >= 1) this.activeShifts.splice(i, 1);
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta;
            p.mesh.position.addScaledVector(p.vel, delta);
            p.vel.y -= 15 * delta;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }

        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];
            chunk.z += moveDist;
            chunk.group.position.z = chunk.z;

            if (chunk.z > 25) {
                chunk.z -= this.chunks.length * this.chunkLength;
                chunk.group.position.z = chunk.z;

                while (chunk.group.children.length > 5) {
                    chunk.group.remove(chunk.group.children[5]);
                }
                this.generateChunkContent(chunk.group, chunk.z, section);
            }
        }

        this.obstacles.forEach(obs => { obs.z += moveDist; });
        this.obstacles = this.obstacles.filter(obs => obs.z < 18);

        this.coins.forEach(coin => {
            coin.z += moveDist;
            if (coin.mesh) coin.mesh.rotation.y += delta * 6;
        });
        this.coins = this.coins.filter(coin => coin.z < 18 && !coin.collected);

        this.hearts.forEach(heart => {
            heart.z += moveDist;
            if (heart.mesh) heart.mesh.rotation.y += delta * 4;
        });
        this.hearts = this.hearts.filter(heart => heart.z < 18 && !heart.collected);
    }

    reset() {
        this.chunks.forEach(c => this.scene.remove(c.group));
        this.chunks = [];
        this.obstacles = [];
        this.coins = [];
        this.hearts = [];
        this.activeShifts = [];
        this.particles.forEach(p => this.scene.remove(p.mesh));
        this.particles = [];

        for (let i = 0; i < 6; i++) {
            this.spawnChunk(-i * this.chunkLength, 1);
        }
    }
}
