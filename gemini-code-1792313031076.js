import * as THREE from 'three';
import { Player } from './player.js';
import { WorldManager } from './world.js';
import { InputManager } from './input.js';
import { audio } from './audio.js';

class Game {
    constructor() {
        this.state = 'MENU';
        this.score = 0;
        this.coins = 0;
        this.section = 1;
        this.winScore = 600;
        this.elapsedSeconds = 0;

        this.chaosTimer = 0;
        this.nextChaosInterval = 10;
        this.warningTimer = 0;
        this.isWarningActive = false;

        this.bestScore = this.loadBestScore();

        this.initEngine();
        this.initListeners();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    loadBestScore() {
        try {
            const saved = localStorage.getItem('chaos_run_best');
            return saved ? parseInt(saved, 10) : 0;
        } catch (e) {
            return 0;
        }
    }

    saveBestScore(val) {
        try {
            if (val > this.bestScore) {
                this.bestScore = val;
                localStorage.setItem('chaos_run_best', val.toString());
            }
        } catch (e) {}
    }

    initEngine() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x38bdf8);
        this.scene.fog = new THREE.FogExp2(0x38bdf8, 0.018);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 4.5, 7.8);
        this.camera.lookAt(0, 1.5, -2);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(15, 28, 12);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        this.player = new Player();
        this.scene.add(this.player.mesh);

        this.world = new WorldManager(this.scene);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initListeners() {
        this.input = new InputManager();

        const moveLeftAction = () => { if (this.state === 'PLAYING') this.player.moveLeft(); };
        const moveRightAction = () => { if (this.state === 'PLAYING') this.player.moveRight(); };
        const jumpAction = () => { if (this.state === 'PLAYING') { this.player.jump(); audio.playJump(); } };
        const dashAction = () => {
            if (this.state === 'PLAYING') {
                if (this.player.dash()) {
                    audio.playDash();
                    this.triggerFlash('dash');
                }
            }
        };
        const pauseAction = () => {
            if (this.state === 'PLAYING') this.pauseGame();
            else if (this.state === 'PAUSED') this.resumeGame();
        };
        const restartAction = () => { this.startGame(); };

        this.input.on('ArrowLeft', moveLeftAction);
        this.input.on('KeyA', moveLeftAction);
        this.input.on('SwipeLeft', moveLeftAction);

        this.input.on('ArrowRight', moveRightAction);
        this.input.on('KeyD', moveRightAction);
        this.input.on('SwipeRight', moveRightAction);

        this.input.on('ArrowUp', jumpAction);
        this.input.on('KeyW', jumpAction);
        this.input.on('Space', jumpAction);
        this.input.on('SwipeUp', jumpAction);

        this.input.on('ShiftLeft', dashAction);
        this.input.on('ShiftRight', dashAction);
        this.input.on('KeyP', pauseAction);
        this.input.on('KeyR', restartAction);

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('win-restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('menu-restart-btn').addEventListener('click', () => this.startGame());

        document.getElementById('best-score-val').innerText = this.bestScore;
    }

    triggerFlash(type) {
        const flash = document.getElementById('screen-flash');
        flash.className = type;
        setTimeout(() => { flash.className = ''; }, 200);
    }

    startGame() {
        this.state = 'PLAYING';
        this.score = 0;
        this.coins = 0;
        this.section = 1;
        this.elapsedSeconds = 0;
        this.chaosTimer = 0;
        this.warningTimer = 0;
        this.isWarningActive = false;

        this.player.reset();
        this.player.setGoldenReward(false);
        this.world.reset();

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.add('hidden');
        document.getElementById('win-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('chaos-warning').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');

        const tut = document.getElementById('tutorial-banner');
        tut.classList.remove('hidden');
        setTimeout(() => { tut.classList.add('hidden'); }, 5000);
    }

    pauseGame() {
        this.state = 'PAUSED';
        document.getElementById('pause-screen').classList.remove('hidden');
    }

    resumeGame() {
        this.state = 'PLAYING';
        document.getElementById('pause-screen').classList.add('hidden');
    }

    gameOver() {
        this.saveBestScore(Math.floor(this.score));
        this.state = 'GAMEOVER';
        audio.playCrash();
        this.triggerFlash('damage');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('chaos-warning').classList.add('hidden');
        document.getElementById('final-score').innerText = Math.floor(this.score);
        document.getElementById('gameover-screen').classList.remove('hidden');
    }

    winGame() {
        this.saveBestScore(Math.floor(this.score));
        this.state = 'WIN';
        audio.playWin();
        this.player.setGoldenReward(true);
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('chaos-warning').classList.add('hidden');
        document.getElementById('win-score').innerText = Math.floor(this.score);
        document.getElementById('win-coins').innerText = this.coins;
        document.getElementById('win-screen').classList.remove('hidden');
    }

    checkCollisions() {
        if (this.player.isDashing) return;

        for (let obs of this.world.obstacles) {
            if (obs.mesh.position.y < -0.5) continue;

            if (Math.abs(obs.z - this.player.mesh.position.z) < 0.85) {
                if (Math.abs(obs.mesh.position.x - this.player.mesh.position.x) < 1.0) {
                    this.player.health--;
                    audio.playCrash();
                    this.triggerFlash('damage');
                    obs.z += 5;

                    if (this.player.health <= 0) {
                        this.gameOver();
                    }
                    return;
                }
            }
        }

        for (let heart of this.world.hearts) {
            if (!heart.collected && Math.abs(heart.z - this.player.mesh.position.z) < 0.85) {
                if (Math.abs(heart.mesh.position.x - this.player.mesh.position.x) < 1.0) {
                    heart.collected = true;
                    this.scene.remove(heart.mesh);
                    if (this.player.health < this.player.maxHealth) {
                        this.player.health++;
                        audio.playHeal();
                        this.triggerFlash('heal');
                    }
                }
            }
        }

        for (let coin of this.world.coins) {
            if (!coin.collected && Math.abs(coin.z - this.player.mesh.position.z) < 0.85) {
                if (Math.abs(coin.mesh.position.x - this.player.mesh.position.x) < 1.0) {
                    coin.collected = true;
                    this.world.spawnCoinBurst(coin.mesh.position.x, coin.mesh.position.y, coin.mesh.position.z);
                    this.scene.remove(coin.mesh);
                    this.coins += 1;
                    audio.playCoin();
                    document.getElementById('coins-val').innerText = this.coins;
                }
            }
        }
    }

    animate() {
        requestAnimationFrame(this.animate);
        const delta = this.clock ? this.clock.getDelta() : 0.016;
        if (!this.clock) this.clock = new THREE.Clock();

        if (this.state === 'PLAYING') {
            this.elapsedSeconds += delta;
            const mins = Math.floor(this.elapsedSeconds / 60);
            const secs = Math.floor(this.elapsedSeconds % 60);
            document.getElementById('timer-val').innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

            this.score += delta * 12;
            document.getElementById('score-val').innerText = Math.floor(this.score);

            if (this.score >= 400) this.section = 3;
            else if (this.score >= 200) this.section = 2;
            else this.section = 1;

            document.getElementById('section-val').innerText = this.section;

            let heartsStr = '';
            for (let i = 0; i < this.player.health; i++) heartsStr += '❤️';
            document.getElementById('health-val').innerText = heartsStr;

            if (this.score >= this.winScore) {
                this.winGame();
                return;
            }

            this.chaosTimer += delta;
            if (!this.isWarningActive && this.chaosTimer >= this.nextChaosInterval - 2.5) {
                this.isWarningActive = true;
                this.warningTimer = 2.5;
                document.getElementById('chaos-warning').classList.remove('hidden');
            }

            if (this.isWarningActive) {
                this.warningTimer -= delta;
                if (this.warningTimer <= 0) {
                    this.isWarningActive = false;
                    document.getElementById('chaos-warning').classList.add('hidden');
                    const chaosType = Math.floor(Math.random() * 3);
                    this.world.triggerChaosShift(chaosType);
                    audio.playShift();
                    this.chaosTimer = 0;
                }
            }

            const dashEl = document.getElementById('dash-val');
            if (this.player.dashCooldown <= 0) {
                dashEl.innerText = 'READY';
                dashEl.style.color = '#22c55e';
            } else {
                dashEl.innerText = Math.ceil(this.player.dashCooldown) + 's';
                dashEl.style.color = '#f43f5e';
            }

            const fallStatus = this.player.update(delta);
            if (fallStatus === 'fallen') {
                audio.playCrash();
                this.triggerFlash('damage');
                if (this.player.health <= 0) {
                    this.gameOver();
                }
            }

            this.world.update(delta, this.section);
            this.checkCollisions();

            const targetCamX = this.player.mesh.position.x * 0.35;
            this.camera.position.x += (targetCamX - this.camera.position.x) * 6 * delta;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});