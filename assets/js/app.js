/* ------------------------------------------------------------------
           1. SYNTHESIZER SOUND ENGINE (Web Audio API)
        ------------------------------------------------------------------ */
        let audioEnabled = true;
        let audioCtx = null;

        function initAudio() {
            if (!audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContext();
            }
        }

        function playSound(type) {
            if (!audioEnabled) return;
            initAudio();
            if (audioCtx.state === 'suspended') audioCtx.resume();

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            const now = audioCtx.currentTime;

            if (type === 'click') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
                osc.start(now); osc.stop(now + 0.04);
            } else if (type === 'score') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.setValueAtTime(1040, now + 0.08);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
                osc.start(now); osc.stop(now + 0.2);
            } else if (type === 'shoot') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(850, now);
                osc.frequency.linearRampToValueAtTime(120, now + 0.05);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
                osc.start(now); osc.stop(now + 0.05);
            } else if (type === 'bounce') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(640, now + 0.06);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
                osc.start(now); osc.stop(now + 0.06);
            } else if (type === 'explosion') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(140, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
                osc.start(now); osc.stop(now + 0.22);
            } else if (type === 'gameover') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(50, now + 0.45);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
                osc.start(now); osc.stop(now + 0.45);
            }
        }

        function toggleAudio() {
            audioEnabled = !audioEnabled;
            document.getElementById('soundIcon').className = audioEnabled ? "fa-solid fa-volume-high text-cyber-cyan" : "fa-solid fa-volume-xmark text-gray-500";
            document.getElementById('soundText').innerText = audioEnabled ? "افکت: روشن" : "افکت: خاموش";
            if (audioEnabled) playSound('click');
        }

        /* ------------------------------------------------------------------
           1b. AMBIENT MUSIC ENGINE (generative, mellow, Web Audio API)
        ------------------------------------------------------------------ */
        let musicEnabled = true;
        try { if (localStorage.getItem('cyber_music') === 'off') musicEnabled = false; } catch (e) {}
        let musicBus = null, musicNodes = null, musicTimer = null;
        let musicNextTime = 0, musicStep = 0, musicStarted = false;
        const MUSIC_BPM = 72;
        const EIGHTH = 60 / MUSIC_BPM / 2;
        const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);
        // Am9 - Fmaj7 - Cmaj7 - G6/9 : dreamy, slow, soft
        const MUSIC_CHORDS = [
            { bass: 45, pad: [57, 60, 64, 67, 71] },
            { bass: 41, pad: [53, 57, 60, 64, 67] },
            { bass: 48, pad: [55, 60, 64, 67, 71] },
            { bass: 43, pad: [55, 59, 62, 64, 69] }
        ];
        const ARP_PATTERN = [1,0,1,1,0,1,0,1, 1,0,0,1,0,1,1,0];

        function buildImpulse(ctx, seconds, decay) {
            const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
            const buf = ctx.createBuffer(2, len, rate);
            for (let c = 0; c < 2; c++) {
                const d = buf.getChannelData(c);
                for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
            }
            return buf;
        }

        function setupMusicGraph() {
            if (musicBus) return;
            initAudio();
            const comp = audioCtx.createDynamicsCompressor();
            comp.connect(audioCtx.destination);
            musicBus = audioCtx.createGain();
            musicBus.gain.value = 0;
            musicBus.connect(comp);

            const dry = audioCtx.createGain();
            dry.gain.value = 0.8;
            dry.connect(musicBus);

            const reverb = audioCtx.createConvolver();
            reverb.buffer = buildImpulse(audioCtx, 3, 2.6);
            const wet = audioCtx.createGain();
            wet.gain.value = 0.55;
            reverb.connect(wet); wet.connect(musicBus);

            const delay = audioCtx.createDelay(1.5);
            delay.delayTime.value = EIGHTH * 3;
            const fb = audioCtx.createGain(); fb.gain.value = 0.35;
            const dlp = audioCtx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2200;
            const echoOut = audioCtx.createGain(); echoOut.gain.value = 0.5;
            delay.connect(dlp); dlp.connect(fb); fb.connect(delay);
            dlp.connect(echoOut); echoOut.connect(musicBus); echoOut.connect(reverb);

            musicNodes = { dry, reverb, delay };
        }

        function playPadNote(freq, t, dur) {
            const filt = audioCtx.createBiquadFilter();
            filt.type = 'lowpass'; filt.frequency.value = 1100; filt.Q.value = 0.4;
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.022, t + 1.6);
            g.gain.setTargetAtTime(0.0001, t + dur, 0.7);
            [['triangle', 4], ['sine', -4]].forEach(([type, det]) => {
                const o = audioCtx.createOscillator();
                o.type = type; o.frequency.value = freq; o.detune.value = det;
                o.connect(filt);
                o.start(t); o.stop(t + dur + 4);
            });
            filt.connect(g);
            g.connect(musicNodes.dry); g.connect(musicNodes.reverb);
        }

        function playBass(freq, t, dur) {
            const filt = audioCtx.createBiquadFilter();
            filt.type = 'lowpass'; filt.frequency.value = 420;
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.13, t + 0.08);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            [[freq * 2, 1], [freq, 0.6]].forEach(([f, v]) => {
                const o = audioCtx.createOscillator();
                const og = audioCtx.createGain(); og.gain.value = v;
                o.type = 'sine'; o.frequency.value = f;
                o.connect(og); og.connect(filt);
                o.start(t); o.stop(t + dur + 0.1);
            });
            filt.connect(g); g.connect(musicNodes.dry);
        }

        function playPluck(freq, t, vel) {
            const filt = audioCtx.createBiquadFilter();
            filt.type = 'lowpass'; filt.frequency.value = 2800;
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(vel, t + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
            const o = audioCtx.createOscillator();
            o.type = 'triangle'; o.frequency.value = freq;
            const o2 = audioCtx.createOscillator();
            const g2 = audioCtx.createGain(); g2.gain.value = 0.25;
            o2.type = 'sine'; o2.frequency.value = freq * 2;
            o.connect(filt); o2.connect(g2); g2.connect(filt);
            filt.connect(g);
            g.connect(musicNodes.dry); g.connect(musicNodes.reverb); g.connect(musicNodes.delay);
            o.start(t); o.stop(t + 1.5);
            o2.start(t); o2.stop(t + 1.5);
        }

        function scheduleMusicStep(step, t) {
            const chord = MUSIC_CHORDS[Math.floor(step / 16) % MUSIC_CHORDS.length];
            const pos = step % 16;
            if (pos === 0) chord.pad.forEach(m => playPadNote(midiToFreq(m), t, 16 * EIGHTH));
            if (pos === 0 || pos === 8) playBass(midiToFreq(chord.bass), t, 8 * EIGHTH);
            if (ARP_PATTERN[pos] && Math.random() < 0.8) {
                const notes = chord.pad.map(m => m + 12);
                const idx = (pos * 3 + Math.floor(step / 16)) % notes.length;
                playPluck(midiToFreq(notes[idx]), t, 0.05 + Math.random() * 0.035);
            }
        }

        function musicTick() {
            if (!audioCtx || !musicEnabled) return;
            while (musicNextTime < audioCtx.currentTime + 0.6) {
                scheduleMusicStep(musicStep, musicNextTime);
                musicNextTime += EIGHTH;
                musicStep++;
            }
        }

        function startMusic() {
            if (!musicEnabled) return;
            setupMusicGraph();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            if (!musicStarted) {
                musicStarted = true;
                musicStep = 0;
                musicNextTime = audioCtx.currentTime + 0.15;
                musicTimer = setInterval(musicTick, 150);
            }
            musicBus.gain.cancelScheduledValues(audioCtx.currentTime);
            musicBus.gain.setTargetAtTime(0.9, audioCtx.currentTime, 0.6);
        }

        function stopMusic() {
            if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
            musicStarted = false;
            if (musicBus && audioCtx) {
                musicBus.gain.cancelScheduledValues(audioCtx.currentTime);
                musicBus.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15);
            }
        }

        function updateMusicButton() {
            document.getElementById('musicIcon').className = musicEnabled ? "fa-solid fa-music text-cyber-cyan" : "fa-solid fa-music text-gray-500";
            document.getElementById('musicText').innerText = musicEnabled ? "موسیقی: روشن" : "موسیقی: خاموش";
        }

        function toggleMusic() {
            musicEnabled = !musicEnabled;
            try { localStorage.setItem('cyber_music', musicEnabled ? 'on' : 'off'); } catch (e) {}
            updateMusicButton();
            if (musicEnabled) startMusic(); else stopMusic();
            playSound('click');
        }

        // Browsers block audio until the first user gesture, so music starts on first interaction.
        function unlockMusic() {
            if (!musicEnabled) return;
            if (!musicStarted) startMusic();
            else if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        }
        ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(ev => window.addEventListener(ev, unlockMusic, { passive: true }));
        document.addEventListener('visibilitychange', () => {
            if (!audioCtx) return;
            if (document.hidden) audioCtx.suspend();
            else if (musicEnabled || audioEnabled) audioCtx.resume();
        });
        updateMusicButton();

        /* ------------------------------------------------------------------
           2. INTERACTIVE BACKGROUND PARTICLES
        ------------------------------------------------------------------ */
        const bgCanvas = document.getElementById('bgCanvas');
        const bgCtx = bgCanvas.getContext('2d', { alpha: true });
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let bgParticles = [];
        let bgAnimationId = null;

        function resizeBgCanvas() {
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeBgCanvas);
        resizeBgCanvas();

        for (let i = 0; i < 70; i++) {
            bgParticles.push({
                x: Math.random() * bgCanvas.width,
                y: Math.random() * bgCanvas.height,
                size: Math.random() * 2 + 0.5,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                color: Math.random() > 0.5 ? '#00f3ff' : '#ff0055'
            });
        }

        function animateBg() {
            if (document.hidden || prefersReducedMotion || !bgCtx) { bgAnimationId = null; return; }
            bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
            bgParticles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > bgCanvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > bgCanvas.height) p.vy *= -1;
                bgCtx.fillStyle = p.color;
                bgCtx.beginPath();
                bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                bgCtx.fill();
            });
            bgAnimationId = requestAnimationFrame(animateBg);
        }
        if (!prefersReducedMotion) animateBg();
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { if (bgAnimationId) cancelAnimationFrame(bgAnimationId); bgAnimationId = null; }
            else if (!prefersReducedMotion && !bgAnimationId) animateBg();
        });

        /* ------------------------------------------------------------------
           3. SCORES MANAGEMENT
        ------------------------------------------------------------------ */
        function readStoredScore(key, legacyKey) {
            try {
                const raw = localStorage.getItem(key) ?? (legacyKey ? localStorage.getItem(legacyKey) : null) ?? '0';
                const value = Number.parseInt(raw, 10);
                return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 1000000000) : 0;
            } catch (error) { return 0; }
        }
        const scores = {
            drive: readStoredScore('cyber_hs_drive', 'cyber_hs_snake'),
            space: readStoredScore('cyber_hs_space'),
            memory: readStoredScore('cyber_hs_memory'),
            pong: readStoredScore('cyber_hs_pong'),
            dodge: readStoredScore('cyber_hs_dodge'),
            flap: readStoredScore('cyber_hs_flap'),
            target: readStoredScore('cyber_hs_target')
        };

        function updateHighScoresDisplay() {
            document.getElementById('high-score-drive').innerText = scores.drive;
            document.getElementById('high-score-space').innerText = scores.space;
            document.getElementById('high-score-memory').innerText = scores.memory;
            document.getElementById('high-score-pong').innerText = scores.pong;
            ['dodge','flap','target'].forEach(g => { const el = document.getElementById('high-score-' + g); if (el) el.innerText = scores[g]; });
            document.getElementById('totalScoreDisplay').innerText = Object.values(scores).reduce((a,b) => a+b, 0);
        }
        updateHighScoresDisplay();

        function saveHighScore(game, score) {
            if (score > scores[game]) {
                scores[game] = score;
                try { localStorage.setItem(`cyber_hs_${game}`, String(Math.max(0, Math.floor(score)))); } catch (error) { /* Session score still works if storage is unavailable. */ }
                updateHighScoresDisplay();
                return true;
            }
            return false;
        }

        /* ------------------------------------------------------------------
           4. GAME MODAL & CONTROLLER ENGINE
        ------------------------------------------------------------------ */
        let activeGame = null;
        let gameLoopId = null;
        const gameCanvas = document.getElementById('gameCanvas');
        const ctx = gameCanvas.getContext('2d');
        const gameModal = document.getElementById('gameModal');
        const gameOverlay = document.getElementById('gameOverlay');
        const memoryContainer = document.getElementById('memoryContainer');
        const memoryGrid = document.getElementById('memoryGameGrid');
        const memoryCountdown = document.getElementById('memoryCountdown');

        // Global Key State Listener
        const keys = {};
        const GAME_KEYS = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyS','KeyD'];
        window.addEventListener('keydown', e => {
            keys[e.code] = true;
            // Stop arrows/space from scrolling the page while a game is open
            if (activeGame && GAME_KEYS.includes(e.code)) e.preventDefault();
            if (e.code === 'Escape' && activeGame) closeGameModal();
        });
        window.addEventListener('keyup', e => keys[e.code] = false);
        window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

        // Cap game loops at 60fps so speed is the same on 90/120/144Hz screens
        let nextFrameTime = 0;
        function rafLimited(fn) {
            return requestAnimationFrame(function tick(t) {
                if (t < nextFrameTime - 1.5) { gameLoopId = requestAnimationFrame(tick); return; }
                nextFrameTime = (t - nextFrameTime > 50) ? t + 1000 / 60 : nextFrameTime + 1000 / 60;
                fn();
            });
        }

        // Pointer position converted to canvas coordinates (the canvas may be scaled by CSS on small screens)
        function canvasPoint(e) {
            const rect = gameCanvas.getBoundingClientRect();
            const pt = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
            return {
                x: (pt.clientX - rect.left) * gameCanvas.width / rect.width,
                y: (pt.clientY - rect.top) * gameCanvas.height / rect.height
            };
        }

        // Remove handlers left over from a previous game
        function resetCanvasHandlers() {
            ['onmousemove','onmousedown','onmouseup','onmouseleave','ontouchmove','ontouchstart','ontouchend','onclick','oncontextmenu'].forEach(h => gameCanvas[h] = null);
        }

        function launchGame(gameType) {
            playSound('click');
            if (gameLoopId) cancelAnimationFrame(gameLoopId);
            if (memoryTimer) clearInterval(memoryTimer);
            resetCanvasHandlers();
            driveState = spaceState = pongState = extraState = memoryState = null;
            memoryGrid.innerHTML = '';
            memoryCountdown.classList.add('hidden');
            activeGame = gameType;
            gameModal.classList.remove('hidden');

            const title = document.getElementById('modalGameTitle');
            const icon = document.getElementById('modalGameIcon');
            const hint = document.getElementById('gameControlsHint');

            memoryContainer.classList.add('hidden');
            gameCanvas.classList.remove('hidden');
            gameCanvas.style.aspectRatio = '1 / 1';

            const drivePicker = document.getElementById('driveModePicker');
            if (drivePicker) drivePicker.classList.toggle('hidden', gameType !== 'drive');

            if (gameType === 'drive') {
                title.innerText = "رانندگی شهری (City Driver)";
                icon.className = "fa-solid fa-car-side text-cyan-300";
                hint.innerHTML = `<i class="fa-solid fa-gamepad text-cyan-300"></i> گاز و ترمز لمسی | تغییر دوربین از بالای صفحه | WASD / جهت‌نما`;
                updateDriveModeButtons();
            } else if (gameType === 'space') {
                title.innerText = "مدافع فضا (Cyber Laser Shooter)";
                icon.className = "fa-solid fa-shuttle-space text-cyber-purple";
                hint.innerHTML = `<i class="fa-solid fa-crosshairs text-cyber-purple"></i> شلیک خودکار دوگانه | جابه‌جایی با لمس/موس یا WASD`;
            } else if (gameType === 'memory') {
                title.innerText = "حافظه سایبری (Cyber Memory 5s)";
                icon.className = "fa-solid fa-brain text-cyber-lime";
                hint.innerHTML = `<i class="fa-solid fa-stopwatch text-cyber-lime"></i> ۵ ثانیه زمان حفظ اولیه | انیمیشن سه بعدی کارت‌ها`;
                gameCanvas.classList.add('hidden');
                memoryContainer.classList.remove('hidden');
                memoryContainer.classList.add('flex');
            } else if (gameType === 'pong') {
                title.innerText = "دژ سایبری (Cyber Pong Brick Breaker)";
                icon.className = "fa-solid fa-table-tennis-paddle-ball text-cyber-cyan";
                hint.innerHTML = `<i class="fa-solid fa-hand-pointer text-cyber-cyan"></i> جابه‌جایی پین‌بال با لمس/موس یا کلیدهای چپ/راست`;
            } else if (gameType === 'dodge' || gameType === 'flap' || gameType === 'target') {
                const cfg = {
                    dodge: ["فرار نئونی (Neon Dodge)", "fa-meteor text-yellow-300", "با لمس یا کلیدهای چپ و راست حرکت کن."],
                    flap: ["پرش سایبری (Neon Flap)", "fa-dove text-pink-300", "برای پرش صفحه را لمس کن یا Space بزن."],
                    target: ["شکار هدف (Target Rush)", "fa-bullseye text-green-300", "هدف‌های سبز را لمس کن؛ ۳۰ ثانیه وقت داری."]
                }[gameType];
                title.innerText = cfg[0];
                icon.className = "fa-solid " + cfg[1];
                hint.innerHTML = `<i class="fa-solid fa-gamepad"></i> ${cfg[2]}`;
            }

            document.getElementById('currentScore').innerText = '0';
            showOverlay('آماده‌اید؟', 'برای شروع بازی کلیک کنید.');
        }

        function closeGameModal() {
            playSound('click');
            if (gameLoopId) cancelAnimationFrame(gameLoopId);
            if (memoryTimer) clearInterval(memoryTimer);
            resetCanvasHandlers();
            for (const k in keys) keys[k] = false;
            gameModal.classList.add('hidden');
            activeGame = null;
        }

        function showOverlay(title, message, isGameOver = false) {
            document.getElementById('overlayTitle').innerText = title;
            document.getElementById('overlayMessage').innerText = message;
            document.getElementById('startGameBtn').innerText = isGameOver ? "تلاش مجدد" : "شروع بازی";
            gameOverlay.classList.remove('hidden');
        }

        function hideOverlay() {
            gameOverlay.classList.add('hidden');
        }

        function startGameLogic() {
            playSound('click');
            hideOverlay();
            if (gameLoopId) cancelAnimationFrame(gameLoopId);
            document.getElementById('currentScore').innerText = '0';
            for (const k in keys) keys[k] = false;
            resetCanvasHandlers();

            if (activeGame === 'drive') initDriveGame();
            else if (activeGame === 'space') initSpaceGame();
            else if (activeGame === 'memory') initMemoryGame();
            else if (activeGame === 'pong') initPongGame();
            else if (['dodge','flap','target'].includes(activeGame)) initExtraGame(activeGame);
        }

        /* ------------------------------------------------------------------
           5. GAME 1: CITY DRIVER — third-person city traffic driving
           Original implementation inspired by mobile driving simulators.
        ------------------------------------------------------------------ */
        let driveState = null;
        const driveConfig = { mode: 'free', camera: 'rear' };

        function setDriveMode(mode) {
            driveConfig.mode = mode === 'missions' ? 'missions' : 'free';
            updateDriveModeButtons();
            playSound('click');
        }

        function updateDriveModeButtons() {
            const free = document.getElementById('modeFreeBtn');
            const mission = document.getElementById('modeMissionBtn');
            if (!free || !mission) return;
            const active = 'rounded-xl border border-cyan-400 bg-cyan-400/20 text-cyan-100 px-3 py-2 text-xs font-bold';
            const inactive = 'rounded-xl border border-gray-600 bg-gray-900/60 text-gray-300 px-3 py-2 text-xs font-bold';
            free.className = driveConfig.mode === 'free' ? active : inactive;
            mission.className = driveConfig.mode === 'missions' ? active : inactive;
        }

        function toggleDriveCamera() {
            if (!driveState) return;
            driveConfig.camera = driveConfig.camera === 'rear' ? 'hood' : 'rear';
            driveState.camera = driveConfig.camera;
            playSound('click');
        }

        function initDriveGame() {
            gameCanvas.width = 400;
            gameCanvas.height = 560;
            gameCanvas.style.aspectRatio = '5 / 7';
            driveState = {
                playerX: 200, targetX: 200, speed: 0, distance: 0, score: 0,
                roadOffset: 0, spawn: 0, traffic: [], particles: [],
                gameOver: false, gas: false, brake: false, steering: 0,
                lastTime: performance.now(), mode: driveConfig.mode, camera: driveConfig.camera,
                missionType: ['pass', 'distance', 'safe'][Math.floor(Math.random()*3)],
                missionTarget: 0, missionDone: false, passed: 0,
                survived: 0, nearMisses: 0, lastNear: 0
            };
            driveState.missionTarget = driveState.missionType === 'pass' ? 8 : driveState.missionType === 'distance' ? 300 : 1800;
            const controlAt = (e, down) => {
                if (!driveState || driveState.gameOver) return;
                const p = canvasPoint(e);
                if (p.y > 455 && p.x >= 285) { driveState.gas = down; driveState.brake = false; driveState.steering = 0; }
                else if (p.y > 455 && p.x <= 105) { driveState.brake = down; driveState.gas = false; driveState.steering = 0; }
                else if (p.y > 455 && p.x > 105 && p.x < 285) {
                    driveState.steering = down ? Math.max(-1, Math.min(1, (p.x - 195) / 48)) : 0;
                    driveState.gas = false; driveState.brake = false;
                }
                else if (down) driveState.targetX = Math.max(88, Math.min(312, p.x));
            };
            gameCanvas.onmousemove = e => {
                if (!driveState) return;
                if (e.buttons) controlAt(e, true);
            };
            gameCanvas.onmousedown = e => controlAt(e, true);
            gameCanvas.onmouseup = gameCanvas.onmouseleave = () => {
                if (driveState) { driveState.gas = false; driveState.brake = false; driveState.steering = 0; }
            };
            gameCanvas.ontouchstart = e => { e.preventDefault(); controlAt(e, true); };
            gameCanvas.ontouchmove = e => { e.preventDefault(); if (e.touches.length) controlAt(e, true); };
            gameCanvas.ontouchend = e => {
                if (driveState) { driveState.gas = false; driveState.brake = false; driveState.steering = 0; }
            };
            gameCanvas.onclick = e => {
                const p = canvasPoint(e);
                if (!driveState) return;
                if (p.y >= 8 && p.y <= 54 && p.x >= 145 && p.x <= 255) { toggleDriveCamera(); return; }
                if (p.y < 440 && p.y >= 92) driveState.targetX = Math.max(88, Math.min(312, p.x));
            };
            gameLoopId = rafLimited(driveLoop);
        }

        function driveRoadAt(y) {
            const t = Math.max(0, Math.min(1, (y - 92) / 468));
            const half = 66 + 139 * Math.pow(t, .92);
            const center = 200 + Math.sin((driveState ? driveState.roadOffset : 0) * .006) * (t * 15);
            return { left:center-half, right:center+half, center, half, t };
        }

        function drawCityCar(x, y, w, h, color, player = false, tilt = 0) {
            ctx.save(); ctx.translate(x,y); ctx.rotate(tilt);
            ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0,h*.15,w*.7,h*.55,0,0,Math.PI*2); ctx.fill();
            // Tires
            ctx.fillStyle='#17191d';
            ctx.fillRect(-w*.48,-h*.28,w*.17,h*.27); ctx.fillRect(w*.31,-h*.28,w*.17,h*.27);
            ctx.fillRect(-w*.48,h*.18,w*.17,h*.27); ctx.fillRect(w*.31,h*.18,w*.17,h*.27);
            // Body viewed from behind
            const body=ctx.createLinearGradient(-w/2,0,w/2,0);
            body.addColorStop(0,'#252b32'); body.addColorStop(.16,color); body.addColorStop(.5,player?'#e8f4f7':color); body.addColorStop(.82,color); body.addColorStop(1,'#20252b');
            ctx.fillStyle=body; ctx.beginPath();
            ctx.moveTo(-w*.42,h*.48); ctx.lineTo(-w*.48,h*.22); ctx.lineTo(-w*.43,-h*.18);
            ctx.lineTo(-w*.28,-h*.43); ctx.quadraticCurveTo(0,-h*.52,w*.28,-h*.43);
            ctx.lineTo(w*.43,-h*.18); ctx.lineTo(w*.48,h*.22); ctx.lineTo(w*.42,h*.48);
            ctx.quadraticCurveTo(0,h*.58,-w*.42,h*.48); ctx.fill();
            // Rear windshield and roof
            ctx.fillStyle='#172b3b'; ctx.beginPath();
            ctx.moveTo(-w*.29,-h*.19); ctx.lineTo(-w*.18,-h*.39); ctx.quadraticCurveTo(0,-h*.44,w*.18,-h*.39);
            ctx.lineTo(w*.29,-h*.19); ctx.lineTo(w*.25,-h*.015); ctx.lineTo(-w*.25,-h*.015); ctx.closePath(); ctx.fill();
            ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=1; ctx.stroke();
            // Trunk and bumper
            ctx.fillStyle='rgba(10,15,22,.25)'; ctx.fillRect(-w*.31,h*.02,w*.62,h*.13);
            ctx.fillStyle='#333b44'; ctx.fillRect(-w*.39,h*.34,w*.78,h*.09);
            // Tail lamps
            ctx.shadowColor='#ff233d'; ctx.shadowBlur=player?13:6; ctx.fillStyle='#ff263f';
            ctx.fillRect(-w*.39,h*.19,w*.2,h*.12); ctx.fillRect(w*.19,h*.19,w*.2,h*.12);
            ctx.shadowBlur=0; ctx.fillStyle='#ffb0a9'; ctx.fillRect(-w*.35,h*.205,w*.11,h*.035); ctx.fillRect(w*.24,h*.205,w*.11,h*.035);
            // Plate
            ctx.fillStyle='#e6edf1'; ctx.fillRect(-w*.13,h*.36,w*.26,h*.065);
            ctx.fillStyle='#263746'; ctx.fillRect(-w*.09,h*.375,w*.18,h*.025);
            if(player){
                ctx.fillStyle='rgba(255,255,255,.22)'; ctx.fillRect(-w*.03,-h*.38,w*.06,h*.22);
                ctx.fillStyle='#fff'; ctx.fillRect(-w*.35,h*.47,w*.7,h*.025);
            }
            ctx.restore();
        }

        function spawnDriveTraffic() {
            const lane=Math.floor(Math.random()*3), y=112;
            const b=driveRoadAt(y), laneW=(b.right-b.left)/3;
            const colors=['#e9edf0','#c83b43','#3f79b7','#d4b34b','#5d6875','#4b9879'];
            driveState.traffic.push({lane,x:b.left+laneW*(lane+.5),y,color:colors[Math.floor(Math.random()*colors.length)],w:18,h:34,speed:.35+Math.random()*.8});
        }
        function driveBurst(x,y,color,count=12){
            for(let i=0;i<count;i++)driveState.particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:1,size:1.5+Math.random()*3,color});
        }

        function driveLoop() {
            const s=driveState;
            if(!s||s.gameOver||activeGame!=='drive')return;
            const now=performance.now(),dt=Math.min(1.8,(now-s.lastTime)/16.67||1);s.lastTime=now;
            const left=keys['ArrowLeft']||keys['KeyA']||s.steering<0, right=keys['ArrowRight']||keys['KeyD']||s.steering>0;
            const gas=s.gas||keys['ArrowUp']||keys['KeyW'], brake=s.brake||keys['ArrowDown']||keys['KeyS'];
            const targetSpeed=gas?12.5:brake?0:2.2;
            // Smooth throttle ramp, firm brakes and gentle coasting for a more car-like feel.
            const accel = gas ? .105 : brake ? .24 : .022;
            s.speed += (targetSpeed-s.speed)*Math.min(.42, accel*dt);
            if(left)s.targetX-=4.0*dt; if(right)s.targetX+=4.0*dt;
            if (s.steering) s.targetX += s.steering * 4.6 * dt;
            s.targetX=Math.max(75,Math.min(325,s.targetX)); s.playerX+=(s.targetX-s.playerX)*Math.min(.26,.17*dt);
            s.roadOffset=(s.roadOffset+s.speed*dt)%500; s.distance+=s.speed*dt*.09; s.survived+=dt;
            s.spawn+=dt; if(s.spawn>Math.max(34,(s.mode === 'missions' ? 66 : 82)-s.distance*.07)){spawnDriveTraffic();s.spawn=0;}
            for(let i=s.traffic.length-1;i>=0;i--){
                const c=s.traffic[i]; c.y+=(s.speed*.75+c.speed)*dt;
                const b=driveRoadAt(c.y),laneW=(b.right-b.left)/3;c.x=b.left+laneW*(c.lane+.5);
                if(c.y>410&&c.y<520&&Math.abs(c.x-s.playerX)<29){
                    s.gameOver=true;driveBurst(s.playerX,472,'#ff304b',24);playSound('explosion');
                    const isNew=saveHighScore('drive',s.score);
                    showOverlay('تصادف کردی! 🚘',`امتیاز: ${s.score} • ${isNew?'رکورد جدید!':'دوباره رانندگی کن'}`,true);return;
                }
                if(c.y>530){
                    s.passed++;
                    if(Math.abs(c.x-s.playerX)<50&&s.survived-s.lastNear>25){s.score+=20;s.nearMisses++;s.lastNear=s.survived;}else s.score+=5;
                    s.traffic.splice(i,1);
                }
            }
            for(let i=s.particles.length-1;i>=0;i--){const p=s.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=.035*dt;if(p.life<=0)s.particles.splice(i,1);}
            s.score=Math.max(s.score,Math.floor(s.distance*2)); document.getElementById('currentScore').innerText=s.score;
            if (s.mode === 'missions' && !s.missionDone) {
                const done = (s.missionType === 'pass' && s.passed >= s.missionTarget) ||
                    (s.missionType === 'distance' && s.distance >= s.missionTarget) ||
                    (s.missionType === 'safe' && s.survived >= s.missionTarget);
                if (done) {
                    s.missionDone = true; s.gameOver = true; s.score += 100;
                    const isNew = saveHighScore('drive', s.score);
                    playSound('score');
                    showOverlay('مأموریت کامل شد! 🏁', `آفرین! امتیاز نهایی: ${s.score} ${isNew ? '• رکورد جدید!' : ''}`, true);
                    return;
                }
            }

            // Bright daytime city and moving sidewalks
            const sky=ctx.createLinearGradient(0,0,0,560);sky.addColorStop(0,'#83c9f3');sky.addColorStop(.45,'#d7edf7');sky.addColorStop(1,'#f1f4e9');ctx.fillStyle=sky;ctx.fillRect(0,0,400,560);
            ctx.fillStyle='#fff2bd';ctx.beginPath();ctx.arc(323,62,23,0,Math.PI*2);ctx.fill();
            // Distant city blocks
            for(let i=0;i<17;i++){
                const x=i*25-8,h=35+((i*29)%72),w=18+(i%3)*3;
                ctx.fillStyle=['#b5c6d1','#9fb5c4','#c4d2d9'][i%3];ctx.fillRect(x,102-h,w,h+14);
                ctx.fillStyle='#e7d9a7';for(let wy=108-h;wy<105;wy+=12)for(let wx=x+4;wx<x+w-3;wx+=7)ctx.fillRect(wx,wy,3,4);
            }
            // Grass strips, sidewalks, curbs, perspective road
            const top=driveRoadAt(92),bottom=driveRoadAt(560);
            ctx.fillStyle='#8fba8b';ctx.fillRect(0,92,400,468);
            ctx.fillStyle='#c7c9c6';ctx.beginPath();ctx.moveTo(top.left-18,92);ctx.lineTo(top.left,92);ctx.lineTo(bottom.left,560);ctx.lineTo(bottom.left-35,560);ctx.closePath();ctx.fill();
            ctx.beginPath();ctx.moveTo(top.right,92);ctx.lineTo(top.right+18,92);ctx.lineTo(bottom.right+35,560);ctx.lineTo(bottom.right,560);ctx.closePath();ctx.fill();
            ctx.fillStyle='#3b4146';ctx.beginPath();ctx.moveTo(top.left,92);ctx.lineTo(top.right,92);ctx.lineTo(bottom.right,560);ctx.lineTo(bottom.left,560);ctx.closePath();ctx.fill();
            // Curb dashes and road surface detail
            for(let y=95;y<560;y+=25){const yy=95+((y-95+s.roadOffset*1.4)%465),b=driveRoadAt(yy),scale=.25+.75*((yy-92)/468);
                ctx.fillStyle='#f0f0e8';ctx.fillRect(b.left-2,yy,4,Math.max(3,scale*9));ctx.fillRect(b.right-2,yy,4,Math.max(3,scale*9));
                ctx.fillStyle='rgba(255,255,255,.045)';ctx.fillRect(b.left+5,yy,b.right-b.left-10,1);
            }
            for(let lane=1;lane<=2;lane++)for(let y=96;y<560;y+=75){const yy=96+((y-96+s.roadOffset*1.55)%464),b=driveRoadAt(yy),x=b.left+(b.right-b.left)*lane/3,h=3+((yy-92)/468)*17;
                ctx.fillStyle='#f2f2e7';ctx.fillRect(x-1,yy,2,h);
            }
            // Traffic, player sedan and dust
            s.traffic.slice().sort((a,b)=>a.y-b.y).forEach(c=>{const scale=.45+.8*Math.max(0,(c.y-92)/468);drawCityCar(c.x,c.y,c.w*scale,c.h*scale,c.color,false,0);});
            if (s.camera === 'rear') {
                drawCityCar(s.playerX,464,61,91,'#2788cf',true,(right?-.035:0)+(left?.035:0));
            } else {
                // Lightweight cockpit/hood view; the same road simulation is reused.
                const dash = ctx.createLinearGradient(0,424,0,560);
                dash.addColorStop(0,'#263b49'); dash.addColorStop(.35,'#18232d'); dash.addColorStop(1,'#090d12');
                ctx.fillStyle=dash; ctx.beginPath(); ctx.moveTo(45,560); ctx.lineTo(105,454); ctx.quadraticCurveTo(200,424,295,454); ctx.lineTo(355,560); ctx.closePath(); ctx.fill();
                ctx.strokeStyle='#617988'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(105,454); ctx.quadraticCurveTo(200,424,295,454); ctx.stroke();
                ctx.fillStyle='#0a121a'; ctx.beginPath(); ctx.roundRect(139,488,122,47,10); ctx.fill();
                ctx.strokeStyle='#456171'; ctx.strokeRect(150,496,100,27);
                ctx.fillStyle='#b7f3ff'; ctx.font='bold 17px Orbitron, sans-serif'; ctx.textAlign='center'; ctx.fillText(Math.round(s.speed*15)+'',200,515);
                ctx.fillStyle='#9fc4d3'; ctx.font='9px Vazirmatn, sans-serif'; ctx.fillText('KM/H',200,528);
                ctx.strokeStyle='#111820'; ctx.lineWidth=9; ctx.beginPath(); ctx.arc(200,566,37,Math.PI*1.08,Math.PI*1.92); ctx.stroke();
                ctx.strokeStyle='#4c606c'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(200,566,37,Math.PI*1.08,Math.PI*1.92); ctx.stroke();
            }
            s.particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);});ctx.globalAlpha=1;
            // Instrument cluster
            ctx.fillStyle='rgba(13,25,35,.84)';ctx.fillRect(12,12,130,55);ctx.strokeStyle='rgba(255,255,255,.25)';ctx.strokeRect(12,12,130,55);
            ctx.fillStyle='#d7eefa';ctx.font='bold 10px Vazirmatn, sans-serif';ctx.textAlign='left';ctx.fillText('CITY DRIVER',22,28);
            ctx.fillStyle='#fff';ctx.font='bold 21px Orbitron, sans-serif';ctx.fillText(Math.round(s.speed*15)+'',22,51);ctx.font='10px Vazirmatn, sans-serif';ctx.fillText('KM/H',65,50);
            ctx.fillStyle='rgba(13,25,35,.9)';ctx.strokeStyle='rgba(90,220,255,.85)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(150,12,100,35,9);ctx.fill();ctx.stroke();
            ctx.fillStyle='#bdf6ff';ctx.font='bold 10px Vazirmatn, sans-serif';ctx.textAlign='center';ctx.fillText(s.camera === 'rear' ? 'دوربین: پشت' : 'دوربین: کابین',200,33);
            ctx.fillStyle='rgba(13,25,35,.78)';ctx.fillRect(258,12,130,55);ctx.fillStyle='#fff';ctx.textAlign='left';ctx.font='bold 10px Vazirmatn, sans-serif';ctx.fillText('مسافت',268,28);ctx.font='bold 17px Orbitron, sans-serif';ctx.fillText(Math.floor(s.distance)+' m',268,49);ctx.fillStyle='#f5d76e';ctx.font='bold 11px Vazirmatn, sans-serif';ctx.fillText('امتیاز '+s.score,268,61);
            // Premium touch controls: brake, analog steering wheel and accelerator pedal.
            const pedal=(x,y,w,h,label,active,accent)=>{
                ctx.save(); ctx.shadowColor=accent; ctx.shadowBlur=active?15:4;
                const grad=ctx.createLinearGradient(x,y,x+w,y+h);grad.addColorStop(0,active?'rgba(70,205,255,.92)':'rgba(25,43,56,.88)');grad.addColorStop(1,active?'rgba(18,116,175,.96)':'rgba(7,15,23,.9)');
                ctx.fillStyle=grad;ctx.strokeStyle=accent;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x,y,w,h,13);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
                ctx.fillStyle='#fff';ctx.font='bold 12px Vazirmatn, sans-serif';ctx.textAlign='center';ctx.fillText(label,x+w/2,y+h/2+4);ctx.restore();
            };
            pedal(12,478,84,68,brake?'ترمز فعال':'ترمز',brake,'#ff647c');
            pedal(304,478,84,68,gas?'گاز • شتاب':'گاز',gas,'#45e3ff');
            // Steering wheel ring with spokes; drag left/right on it to steer.
            ctx.save();
            const wheelX=195, wheelY=512, wheelR=34, wheelTurn=(s.steering || ((right?1:0)-(left?1:0)))*.65;
            ctx.translate(wheelX,wheelY);ctx.rotate(wheelTurn);
            ctx.shadowColor='#54dfff';ctx.shadowBlur=7;ctx.strokeStyle='rgba(4,9,15,.98)';ctx.lineWidth=12;ctx.beginPath();ctx.arc(0,0,wheelR,0,Math.PI*2);ctx.stroke();
            ctx.shadowBlur=0;ctx.strokeStyle='#4edfff';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,wheelR,0,Math.PI*2);ctx.stroke();
            ctx.strokeStyle='#b8f5ff';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(0,-wheelR+2);ctx.moveTo(-2,1);ctx.lineTo(-wheelR*.68,wheelR*.42);ctx.moveTo(2,1);ctx.lineTo(wheelR*.68,wheelR*.42);ctx.stroke();
            ctx.fillStyle='#10212b';ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7eeaff';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
            ctx.fillStyle='rgba(190,240,255,.85)';ctx.font='9px Vazirmatn, sans-serif';ctx.textAlign='center';ctx.fillText('فرمان را بکش',195,558);
            ctx.fillStyle='rgba(13,25,35,.68)';ctx.fillRect(45,72,310,23);ctx.fillStyle='#fff';ctx.font='11px Vazirmatn, sans-serif';ctx.textAlign='center';
            const missionLabel = s.mode === 'free' ? 'رانندگی آزاد • برای تغییر دوربین، بالای صفحه را لمس کن' :
                (s.missionType === 'pass' ? `مأموریت: سبقت از ${s.missionTarget} خودرو (${Math.min(s.passed,s.missionTarget)}/${s.missionTarget})` :
                 s.missionType === 'distance' ? `مأموریت: طی کردن ${s.missionTarget} متر (${Math.min(Math.floor(s.distance),s.missionTarget)}/${s.missionTarget})` :
                 `مأموریت: ${s.missionTarget/60} ثانیه بدون تصادف (${Math.min(Math.floor(s.survived/60),s.missionTarget/60)}/${s.missionTarget/60})`);
            ctx.fillText(missionLabel,200,88);
            gameLoopId=rafLimited(driveLoop);
        }

        /* ------------------------------------------------------------------
           6. GAME 2: CYBER LASER SHOOTER (AUTO-FIRE & DUAL LASERS)
        ------------------------------------------------------------------ */
        let spaceState = null;

        function initSpaceGame() {
            gameCanvas.width = 400;
            gameCanvas.height = 400;

            spaceState = {
                playerX: 200,
                playerY: 340,
                bullets: [],
                enemies: [],
                particles: [],
                score: 0,
                lastShootTime: 0,
                gameOver: false
            };

            const updateShipPos = (e) => {
                const p = canvasPoint(e);
                spaceState.playerX = p.x;
                spaceState.playerY = Math.max(180, Math.min(360, p.y));
            };

            gameCanvas.onmousemove = (e) => { if (spaceState) updateShipPos(e); };
            gameCanvas.ontouchmove = (e) => { if (spaceState) updateShipPos(e); };
            gameCanvas.ontouchstart = (e) => { if (spaceState) updateShipPos(e); };

            gameLoopId = rafLimited(spaceLoop);
        }

        function addExplosionParticles(x, y, color) {
            for (let i = 0; i < 12; i++) {
                spaceState.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    life: 1.0,
                    color: color
                });
            }
        }

        function spaceLoop() {
            if (!spaceState || spaceState.gameOver || activeGame !== 'space') return;

            // Keyboard Movement Support
            if (keys['ArrowLeft'] || keys['KeyA']) spaceState.playerX -= 6;
            if (keys['ArrowRight'] || keys['KeyD']) spaceState.playerX += 6;
            if (keys['ArrowUp'] || keys['KeyW']) spaceState.playerY -= 6;
            if (keys['ArrowDown'] || keys['KeyS']) spaceState.playerY += 6;

            spaceState.playerX = Math.max(20, Math.min(gameCanvas.width - 20, spaceState.playerX));
            spaceState.playerY = Math.max(180, Math.min(gameCanvas.height - 30, spaceState.playerY));

            const now = Date.now();

            // Auto Dual Laser Shooting
            if (now - spaceState.lastShootTime > 110) {
                playSound('shoot');
                spaceState.bullets.push({ x: spaceState.playerX - 12, y: spaceState.playerY - 15, w: 3, h: 14 });
                spaceState.bullets.push({ x: spaceState.playerX + 12, y: spaceState.playerY - 15, w: 3, h: 14 });
                spaceState.lastShootTime = now;
            }

            // Spawn Enemies
            if (Math.random() < 0.045) {
                spaceState.enemies.push({
                    x: 25 + Math.random() * (gameCanvas.width - 50),
                    y: -20,
                    radius: 12 + Math.random() * 8,
                    speed: 2.0 + Math.random() * 2.2,
                    color: Math.random() > 0.5 ? '#ffcc00' : '#ff0055'
                });
            }

            // Move Bullets
            for (let b = spaceState.bullets.length - 1; b >= 0; b--) {
                spaceState.bullets[b].y -= 10;
                if (spaceState.bullets[b].y < 0) spaceState.bullets.splice(b, 1);
            }

            // Update Explosion Particles
            for (let p = spaceState.particles.length - 1; p >= 0; p--) {
                const pt = spaceState.particles[p];
                pt.x += pt.vx; pt.y += pt.vy;
                pt.life -= 0.05;
                if (pt.life <= 0) spaceState.particles.splice(p, 1);
            }

            // Enemies Update & Collisions
            for (let e = spaceState.enemies.length - 1; e >= 0; e--) {
                let enemy = spaceState.enemies[e];
                enemy.y += enemy.speed;

                // Hit Bottom or Player Ship Collision
                if (enemy.y > gameCanvas.height - 15 || Math.hypot(enemy.x - spaceState.playerX, enemy.y - spaceState.playerY) < enemy.radius + 16) {
                    playSound('gameover');
                    spaceState.gameOver = true;
                    const isNew = saveHighScore('space', spaceState.score);
                    showOverlay("سفینه متلاشی شد!", `امتیاز نهایی: ${spaceState.score} ${isNew ? '🎉 رکورد جدید!' : ''}`, true);
                    return;
                }

                // Hit by Laser
                for (let b = spaceState.bullets.length - 1; b >= 0; b--) {
                    let bullet = spaceState.bullets[b];
                    if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.radius + 5) {
                        playSound('explosion');
                        addExplosionParticles(enemy.x, enemy.y, enemy.color);
                        spaceState.enemies.splice(e, 1);
                        spaceState.bullets.splice(b, 1);
                        spaceState.score += 25;
                        document.getElementById('currentScore').innerText = spaceState.score;
                        break;
                    }
                }
            }

            // Render Space Canvas
            ctx.fillStyle = '#02020a';
            ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

            // Render Particles
            spaceState.particles.forEach(pt => {
                ctx.fillStyle = pt.color;
                ctx.globalAlpha = pt.life;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            });

            // Draw Ship
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#b000ff';
            ctx.fillStyle = '#b000ff';
            ctx.beginPath();
            ctx.moveTo(spaceState.playerX, spaceState.playerY - 22);
            ctx.lineTo(spaceState.playerX - 22, spaceState.playerY + 16);
            ctx.lineTo(spaceState.playerX, spaceState.playerY + 8);
            ctx.lineTo(spaceState.playerX + 22, spaceState.playerY + 16);
            ctx.closePath();
            ctx.fill();

            // Cockpit Glow
            ctx.fillStyle = '#00f3ff';
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(spaceState.playerX, spaceState.playerY - 4, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Draw Bullets
            spaceState.bullets.forEach(b => {
                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00f3ff';
                ctx.fillStyle = '#00f3ff';
                ctx.fillRect(b.x, b.y, b.w, b.h);
                ctx.restore();
            });

            // Draw Enemies
            spaceState.enemies.forEach(e => {
                ctx.save();
                ctx.shadowBlur = 14;
                ctx.shadowColor = e.color;
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            gameLoopId = rafLimited(spaceLoop);
        }

        /* ------------------------------------------------------------------
           7. GAME 3: CYBER MEMORY (3D CARDS WITH 5s COUNTDOWN)
        ------------------------------------------------------------------ */
        let memoryState = null;
        let memoryTimer = null;

        function initMemoryGame() {
            if (memoryTimer) clearInterval(memoryTimer);

            const icons = ['fa-bolt', 'fa-ghost', 'fa-skull', 'fa-shield-halved', 'fa-atom', 'fa-gem'];
            const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);

            memoryState = {
                cards: deck,
                flipped: [],
                matched: [],
                moves: 0,
                isChecking: false,
                previewPhase: true
            };

            memoryCountdown.classList.remove('hidden');
            let timeLeft = 5;
            document.getElementById('countdownSec').innerText = timeLeft;

            memoryGrid.innerHTML = '';
            renderMemoryGrid();

            // 5-Second Preview Countdown
            memoryTimer = setInterval(() => {
                timeLeft--;
                document.getElementById('countdownSec').innerText = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(memoryTimer);
                    memoryState.previewPhase = false;
                    memoryCountdown.classList.add('hidden');
                    renderMemoryGrid();
                }
            }, 1000);
        }

        function renderMemoryGrid() {
            if (!memoryState) return;
            // Build the cards once so the 3D flip animation can actually play
            if (memoryGrid.children.length !== memoryState.cards.length) {
                memoryGrid.innerHTML = '';
                memoryState.cards.forEach((icon, index) => {
                    const card = document.createElement('div');
                    card.className = "h-20 relative cursor-pointer perspective-1000";
                    card.innerHTML = `
                        <div class="card-inner w-full h-full rounded-xl border border-lime-500/40">
                            <div class="card-front w-full h-full rounded-xl bg-cyber-dark flex items-center justify-center text-cyber-lime/30 text-xl">
                                <i class="fa-solid fa-microchip"></i>
                            </div>
                            <div class="card-back w-full h-full rounded-xl bg-cyber-lime/20 border border-cyber-lime flex items-center justify-center text-cyber-lime text-2xl shadow-[0_0_15px_rgba(0,255,102,0.3)]">
                                <i class="fa-solid ${icon}"></i>
                            </div>
                        </div>
                    `;
                    card.onclick = () => handleCardClick(index);
                    memoryGrid.appendChild(card);
                });
            }
            Array.from(memoryGrid.children).forEach((card, index) => {
                const isFlipped = memoryState.previewPhase || memoryState.flipped.includes(index) || memoryState.matched.includes(index);
                card.firstElementChild.classList.toggle('flipped', isFlipped);
            });
        }

        function handleCardClick(index) {
            if (!memoryState || memoryState.previewPhase || memoryState.isChecking) return;
            if (memoryState.flipped.includes(index) || memoryState.matched.includes(index)) return;

            playSound('click');
            memoryState.flipped.push(index);
            renderMemoryGrid();

            if (memoryState.flipped.length === 2) {
                memoryState.moves++;
                memoryState.isChecking = true;

                const [i1, i2] = memoryState.flipped;
                if (memoryState.cards[i1] === memoryState.cards[i2]) {
                    playSound('score');
                    memoryState.matched.push(i1, i2);
                    memoryState.flipped = [];
                    memoryState.isChecking = false;

                    const score = Math.max(20, memoryState.matched.length * 50 - memoryState.moves * 10);
                    document.getElementById('currentScore').innerText = score;

                    if (memoryState.matched.length === memoryState.cards.length) {
                        const stWin = memoryState;
                        setTimeout(() => {
                            if (memoryState !== stWin) return;
                            const isNew = saveHighScore('memory', score);
                            showOverlay("حافظه شگفت‌انگیز!", `امتیاز: ${score} | تعداد حرکت: ${memoryState.moves} ${isNew ? '🎉 رکورد جدید!' : ''}`, true);
                        }, 500);
                    }
                } else {
                    const stMiss = memoryState;
                    setTimeout(() => {
                        if (memoryState !== stMiss) return;
                        memoryState.flipped = [];
                        memoryState.isChecking = false;
                        renderMemoryGrid();
                    }, 700);
                }
            }
        }

        /* ------------------------------------------------------------------
           8. GAME 4: CYBER PONG BRICK BREAKER
        ------------------------------------------------------------------ */
        let pongState = null;

        function initPongGame() {
            gameCanvas.width = 400;
            gameCanvas.height = 400;

            const bricks = [];
            const rows = 4;
            const cols = 6;
            const brickWidth = 58;
            const brickHeight = 18;
            const padding = 6;
            const offsetLeft = 12;
            const offsetTop = 30;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    bricks.push({
                        x: offsetLeft + c * (brickWidth + padding),
                        y: offsetTop + r * (brickHeight + padding),
                        w: brickWidth,
                        h: brickHeight,
                        alive: true,
                        color: r % 2 === 0 ? '#00f3ff' : '#ff0055'
                    });
                }
            }

            pongState = {
                paddleX: 150,
                paddleW: 80,
                paddleH: 12,
                ballX: 200,
                ballY: 300,
                ballVx: 3.5 * (Math.random() > 0.5 ? 1 : -1),
                ballVy: -4.5,
                bricks: bricks,
                particles: [],
                score: 0,
                gameOver: false
            };

            const updatePaddle = (e) => {
                const p = canvasPoint(e);
                pongState.paddleX = p.x - pongState.paddleW / 2;
            };

            gameCanvas.onmousemove = (e) => { if (pongState) updatePaddle(e); };
            gameCanvas.ontouchmove = (e) => { if (pongState) updatePaddle(e); };
            gameCanvas.ontouchstart = (e) => { if (pongState) updatePaddle(e); };

            gameLoopId = rafLimited(pongLoop);
        }

        function addBrickParticles(x, y, color) {
            for (let i = 0; i < 10; i++) {
                pongState.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    life: 1.0,
                    color: color
                });
            }
        }

        function pongLoop() {
            if (!pongState || pongState.gameOver || activeGame !== 'pong') return;

            // Keyboard Control
            if (keys['ArrowLeft'] || keys['KeyA']) pongState.paddleX -= 7;
            if (keys['ArrowRight'] || keys['KeyD']) pongState.paddleX += 7;

            pongState.paddleX = Math.max(0, Math.min(gameCanvas.width - pongState.paddleW, pongState.paddleX));

            // Move Ball
            pongState.ballX += pongState.ballVx;
            pongState.ballY += pongState.ballVy;

            // Wall Collisions
            if (pongState.ballX < 8 || pongState.ballX > gameCanvas.width - 8) {
                pongState.ballVx *= -1;
                playSound('bounce');
            }
            if (pongState.ballY < 8) {
                pongState.ballVy *= -1;
                playSound('bounce');
            }

            // Paddle Collision
            if (pongState.ballY + 6 >= gameCanvas.height - 25 &&
                pongState.ballY - 6 <= gameCanvas.height - 13 &&
                pongState.ballX >= pongState.paddleX &&
                pongState.ballX <= pongState.paddleX + pongState.paddleW) {
                
                playSound('bounce');
                pongState.ballVy = -Math.abs(pongState.ballVy);
                // Angle Variation
                const hitPoint = (pongState.ballX - (pongState.paddleX + pongState.paddleW / 2)) / (pongState.paddleW / 2);
                pongState.ballVx = hitPoint * 5;
                if (Math.abs(pongState.ballVx) < 1.2) pongState.ballVx = pongState.ballVx < 0 ? -1.2 : 1.2;
            }

            // Ball Out of Bottom
            if (pongState.ballY > gameCanvas.height + 10) {
                playSound('gameover');
                pongState.gameOver = true;
                const isNew = saveHighScore('pong', pongState.score);
                showOverlay("توپ از دست رفت!", `امتیاز نهایی: ${pongState.score} ${isNew ? '🎉 رکورد جدید!' : ''}`, true);
                return;
            }

            // Bricks Collisions
            let activeBricks = 0;
            let brickHit = false;
            pongState.bricks.forEach(b => {
                if (b.alive) {
                    activeBricks++;
                    if (!brickHit && pongState.ballX >= b.x && pongState.ballX <= b.x + b.w &&
                        pongState.ballY >= b.y && pongState.ballY <= b.y + b.h) {
                        
                        playSound('explosion');
                        b.alive = false;
                        brickHit = true;
                        pongState.ballVy *= -1;
                        pongState.score += 30;
                        document.getElementById('currentScore').innerText = pongState.score;
                        addBrickParticles(b.x + b.w / 2, b.y + b.h / 2, b.color);
                    }
                }
            });

            // Win Condition
            if (activeBricks === 0) {
                playSound('score');
                pongState.gameOver = true;
                document.getElementById('currentScore').innerText = pongState.score + 200;
                const isNew = saveHighScore('pong', pongState.score + 200);
                showOverlay("تمام آجرها نابود شدند!", `امتیاز پیروزی: ${pongState.score + 200} ${isNew ? '🎉 رکورد جدید!' : ''}`, true);
                return;
            }

            // Update Particles
            for (let p = pongState.particles.length - 1; p >= 0; p--) {
                const pt = pongState.particles[p];
                pt.x += pt.vx; pt.y += pt.vy;
                pt.life -= 0.05;
                if (pt.life <= 0) pongState.particles.splice(p, 1);
            }

            // Render Pong Canvas
            ctx.fillStyle = '#02020a';
            ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

            // Draw Bricks
            pongState.bricks.forEach(b => {
                if (b.alive) {
                    ctx.save();
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = b.color;
                    ctx.fillStyle = b.color;
                    ctx.fillRect(b.x, b.y, b.w, b.h);
                    ctx.restore();
                }
            });

            // Draw Particles
            pongState.particles.forEach(pt => {
                ctx.fillStyle = pt.color;
                ctx.globalAlpha = pt.life;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            });

            // Draw Paddle
            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00f3ff';
            ctx.fillStyle = '#00f3ff';
            ctx.fillRect(pongState.paddleX, gameCanvas.height - 25, pongState.paddleW, pongState.paddleH);
            ctx.restore();

            // Draw Ball
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffcc00';
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(pongState.ballX, pongState.ballY, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            gameLoopId = rafLimited(pongLoop);
        }

        /* ------------------------------------------------------------------
           9. EXTRA GAMES: NEON DODGE, NEON FLAP, TARGET RUSH
        ------------------------------------------------------------------ */
        let extraState = null;
        function initExtraGame(type) {
            gameCanvas.width = 400; gameCanvas.height = 400;
            const now = Date.now();
            extraState = {
                type, score: 0, playerX: 200, playerY: 200, vy: 0,
                hazards: [], target: {x: 200, y: 150, r: 15, vx: 2.2, vy: 1.8},
                lastSpawn: now, started: now, gameOver: false, frame: 0, level: 1, lastLevelUp: now, combo: 0, particles: [], bonus: null, bonusAt: now + 5000
            };
            const movePlayer = e => {
                if (!extraState || extraState.gameOver) return;
                const rect = gameCanvas.getBoundingClientRect();
                const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
                const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
                const scaleX = gameCanvas.width / rect.width, scaleY = gameCanvas.height / rect.height;
                if (type === 'dodge') extraState.playerX = Math.max(18, Math.min(382, x * scaleX));
                else if (type === 'target') {
                    const tx = x * scaleX, ty = y * scaleY, t = extraState.target;
                    if (Math.hypot(tx-t.x, ty-t.y) < t.r + 12) {
                        extraState.combo++;
                        extraState.score += 10 + Math.min(20, (extraState.combo-1)*2);
                        extraState.particles.push(...Array.from({length:12},()=>({x:t.x,y:t.y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:24})));
                        playSound('score');
                        t.x = 35 + Math.random()*330; t.y = 45 + Math.random()*300;
                        t.vx = (Math.random()<.5?-1:1)*(2+Math.random()*2); t.vy = (Math.random()<.5?-1:1)*(1.5+Math.random()*2);
                        document.getElementById('currentScore').innerText = extraState.score + ' | کمبو x' + extraState.combo;
                    } else if (extraState.bonus && Math.hypot(tx-extraState.bonus.x,ty-extraState.bonus.y)<extraState.bonus.r+12) {
                        extraState.score += 25; extraState.bonus=null; playSound('score');
                        document.getElementById('currentScore').innerText = extraState.score + ' | جایزه +25';
                    } else { extraState.combo=0; }
                } else { extraState.vy = -6.5; }
            };
            gameCanvas.onmousemove = e => { if (type === 'dodge') movePlayer(e); };
            gameCanvas.ontouchmove = e => { if (type === 'dodge') { e.preventDefault(); movePlayer(e); } };
            gameCanvas.onclick = movePlayer;
            gameCanvas.ontouchstart = e => { e.preventDefault(); movePlayer(e); };
            gameCanvas.oncontextmenu = e => e.preventDefault();
            gameLoopId = rafLimited(extraGameLoop);
        }
        function finishExtraGame(message) {
            if (!extraState || extraState.gameOver) return;
            extraState.gameOver = true;
            playSound('gameover');
            const isNew = saveHighScore(extraState.type, extraState.score);
            showOverlay(message, `امتیاز نهایی: ${extraState.score} ${isNew ? '🎉 رکورد جدید!' : ''}`, true);
        }
        function extraGameLoop() {
            const s = extraState;
            if (!s || s.gameOver || activeGame !== s.type) return;
            const w = gameCanvas.width, h = gameCanvas.height, now = Date.now();
            s.frame++;
            if (s.type === 'dodge') {
                if (keys.ArrowLeft || keys.KeyA) s.playerX -= 5;
                if (keys.ArrowRight || keys.KeyD) s.playerX += 5;
                s.playerX = Math.max(15, Math.min(w-15, s.playerX));
                // Meteor storm difficulty rises every 10 seconds.
                s.level = 1 + Math.floor((now - s.started) / 10000);
                const spawnEvery = Math.max(420, 900 - (s.level - 1) * 24); // fewer meteors, gradual ramp
                if (now - s.lastSpawn > spawnEvery) {
                    const r = Math.min(24, 9 + Math.random() * 6 + (s.level - 1) * 0.7);
                    s.hazards.push({
                        x: 18 + Math.random() * 364, y: -r - 8, r,
                        v: 1.8 + Math.random() * 0.9 + Math.min(1.35, (s.level - 1) * 0.12),
                        vx: (Math.random() - 0.5) * (0.45 + Math.min(0.7, s.level * 0.035)),
                        rot: Math.random() * Math.PI * 2,
                        spin: 0,
                        trail: [],
                        hue: [18, 42, 185, 205, 275, 325][Math.floor(Math.random()*6)],
                        seed: Math.random() * 1000
                    });
                    s.lastSpawn = now;
                }
                // شهاب‌ها سقوط می‌کنند و ردّ نورانی‌شان به‌تدریج محو می‌شود؛ بدون چرخش.
                s.hazards.forEach(o => {
                    o.trail.push({ x: o.x, y: o.y });
                    if (o.trail.length > 24) o.trail.shift();
                    o.y += o.v; o.x += o.vx;
                });
                s.hazards = s.hazards.filter(o => o.y < h + o.r + 20 && o.x > -o.r - 20 && o.x < w + o.r + 20);
                s.score = Math.floor((now - s.started) / 100);
                if (s.hazards.some(o => Math.hypot(o.x - s.playerX, o.y - 350) < o.r + 12)) return finishExtraGame('برخورد شد!');
            } else if (s.type === 'flap') {
                // هر ۱۰ ثانیه مرحله سخت‌تر می‌شود: سرعت بیشتر، فاصله کمتر و تولید مانع سریع‌تر
                s.level = 1 + Math.floor((now-s.started)/10000);
                if (keys.Space || keys.ArrowUp || keys.KeyW) { s.vy=-6.5; keys.Space=false; keys.ArrowUp=false; keys.KeyW=false; }
                s.vy += .28; s.playerY += s.vy;
                if (now-s.lastSpawn>Math.max(650,1450-(s.level-1)*115)) {
                    const gapSize=Math.max(78,130-(s.level-1)*7);
                    const gapY=gapSize/2+Math.random()*(h-gapSize);
                    s.hazards.push({x:w+20,gapY,gapSize,passed:false}); s.lastSpawn=now;
                }
                s.hazards.forEach(o=>o.x-=2.6+(s.level-1)*0.42);
                s.hazards = s.hazards.filter(o=>o.x>-35);
                s.hazards.forEach(o=>{
                    if (!o.passed && o.x<70) {o.passed=true;s.score+=1;document.getElementById('currentScore').innerText=s.score;playSound('score');}
                    // لبه‌ی باریک مستطیل امن است؛ برخورد با بخش بلند و داخلی آن باخت محسوب می‌شود
                    const topEnd=o.gapY-o.gapSize/2, bottomStart=o.gapY+o.gapSize/2;
                    if (o.x+5<82 && o.x+23>58 && (s.playerY<topEnd-9 || s.playerY>bottomStart+9)) s.hit=true;
                });
                if (s.playerY<8 || s.playerY>392 || s.hit) return finishExtraGame('پایان پرواز!');
            } else {
                const left = 30000-(now-s.started);
                if (left<=0) return finishExtraGame('زمان تمام شد!');
                if (s.frame%6===0) document.getElementById('currentScore').innerText = `${s.score} | ${Math.ceil(left/1000)}ث`;
            }
            if (s.type === 'flap') document.getElementById('currentScore').innerText=s.score+' | مرحله '+s.level;
            else if (s.type !== 'target') document.getElementById('currentScore').innerText=s.score;
            if (s.type==='target') {
                s.target.x+=s.target.vx; s.target.y+=s.target.vy;
                if(s.target.x<25||s.target.x>w-25)s.target.vx*=-1;
                if(s.target.y<40||s.target.y>h-25)s.target.vy*=-1;
                if(now>=s.bonusAt&&!s.bonus){s.bonus={x:30+Math.random()*340,y:45+Math.random()*310,r:11};s.bonusAt=now+7000;}
                if(s.bonus&&now>s.bonusAt-2500)s.bonus=null;
                s.particles=s.particles.filter(p=>p.life-->0);
                s.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.96;p.vy*=.96;});
            }
            ctx.fillStyle='#050511'; ctx.fillRect(0,0,w,h);
            ctx.strokeStyle='#15334a'; ctx.lineWidth=1;
            for(let x=0;x<w;x+=25){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
            for(let y=0;y<h;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
            ctx.save();
            if(s.type==='dodge'){
                s.hazards.forEach(o => {
                    // Smooth tapered tail: old points fade out while fresh light forms at the meteor.
                    ctx.save();
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    if (o.trail && o.trail.length > 2) {
                        for (let i = 1; i < o.trail.length; i++) {
                            const a = o.trail[i - 1], b = o.trail[i];
                            const t = i / (o.trail.length - 1);
                            const alpha = Math.pow(t, 1.9) * 0.34;
                            ctx.beginPath();
                            ctx.moveTo(a.x, a.y);
                            ctx.lineTo(b.x, b.y);
                            ctx.strokeStyle = `hsla(${o.hue}, 100%, ${Math.floor(52 + t*18)}%, ${alpha})`;
                            ctx.lineWidth = Math.max(0.45, o.r * (0.025 + t * 0.23));
                            ctx.shadowBlur = 3.5 * t;
                            ctx.shadowColor = `hsl(${o.hue},100%,65%)`;
                            ctx.stroke();
                        }
                        // A narrow, softly fading ion glow directly behind the rock.
                        const tailEnd = o.trail[o.trail.length - 1];
                        const glow = ctx.createRadialGradient(tailEnd.x,tailEnd.y,0,tailEnd.x,tailEnd.y,o.r*1.15);
                        glow.addColorStop(0,`hsla(${o.hue},100%,70%,.18)`);
                        glow.addColorStop(1,`hsla(${o.hue},100%,55%,0)`);
                        ctx.fillStyle=glow;
                        ctx.beginPath(); ctx.arc(tailEnd.x,tailEnd.y,o.r*1.15,0,Math.PI*2); ctx.fill();
                    }
                    ctx.translate(o.x, o.y); // the rocky body keeps its orientation
                    // Soft atmospheric halo around the hot leading edge.
                    const halo = ctx.createRadialGradient(0,0,o.r*.25,0,0,o.r*1.75);
                    halo.addColorStop(0,`hsla(${o.hue},100%,78%,.38)`);
                    halo.addColorStop(.38,`hsla(${o.hue},100%,58%,.20)`);
                    halo.addColorStop(1,`hsla(${o.hue},100%,45%,0)`);
                    ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(0,0,o.r*1.75,0,Math.PI*2); ctx.fill();
                    ctx.shadowBlur = 9 + o.r*.18; ctx.shadowColor = `hsl(${o.hue},95%,58%)`;
                    const rock = ctx.createRadialGradient(-o.r*.34, -o.r*.38, 1, 0, 0, o.r*1.2);
                    rock.addColorStop(0, `hsl(${o.hue},75%,88%)`); rock.addColorStop(.12, `hsl(${o.hue},48%,62%)`); rock.addColorStop(.4, '#62515e'); rock.addColorStop(.76, '#393641'); rock.addColorStop(1, '#171820');
                    ctx.fillStyle = rock;
                    ctx.beginPath();
                    for (let i=0;i<11;i++) {
                        const a = i*Math.PI*2/11;
                        const wobble = .76 + .24*Math.abs(Math.sin(o.seed + i*2.17));
                        const rr = o.r*wobble;
                        const x=Math.cos(a)*rr, y=Math.sin(a)*rr;
                        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
                    }
                    ctx.closePath(); ctx.fill();
                    ctx.shadowBlur = 0;
                    // Small dark craters and a warm rim make the surface read as stone.
                    ctx.fillStyle = 'rgba(25,18,20,.62)';
                    ctx.beginPath(); ctx.ellipse(-o.r*.25,-o.r*.12,o.r*.2,o.r*.13,.3,0,Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(o.r*.28,o.r*.25,o.r*.14,o.r*.1,-.5,0,Math.PI*2); ctx.fill();
                    ctx.strokeStyle=`hsla(${o.hue},95%,82%,.62)`; ctx.lineWidth=1.1;
                    ctx.beginPath(); ctx.arc(-o.r*.18,-o.r*.2,o.r*.34,.2,2.3); ctx.stroke();
                    ctx.restore();
                });
                // Player ship with a pulsing engine plume and a clean neon outline.
                const enginePulse = 5 + Math.sin(now * 0.018) * 2;
                const shipGlow = ctx.createRadialGradient(s.playerX,366,1,s.playerX,366,20);
                shipGlow.addColorStop(0,'rgba(0,243,255,.38)'); shipGlow.addColorStop(1,'rgba(0,243,255,0)');
                ctx.fillStyle=shipGlow; ctx.beginPath(); ctx.arc(s.playerX,366,20,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='rgba(255,160,70,.92)'; ctx.beginPath(); ctx.moveTo(s.playerX-5,360); ctx.lineTo(s.playerX,360+enginePulse+8); ctx.lineTo(s.playerX+5,360); ctx.closePath(); ctx.fill();
                ctx.shadowBlur=12;ctx.shadowColor='#00f3ff';ctx.fillStyle='#00bfe8';ctx.beginPath();ctx.moveTo(s.playerX,330);ctx.lineTo(s.playerX-13,365);ctx.lineTo(s.playerX+13,365);ctx.closePath();ctx.fill();
                ctx.shadowBlur=0; ctx.strokeStyle='#bafaff'; ctx.lineWidth=1.5; ctx.stroke();
                ctx.fillStyle='#fff';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('از شهاب‌های سنگی دوری کن! • مرحله '+s.level,200,25);
            } else if(s.type==='flap'){
                s.hazards.forEach(o=>{ctx.shadowBlur=12;ctx.shadowColor='#ff0055';ctx.fillStyle='#ff0055';ctx.fillRect(o.x,0,28,o.gapY-o.gapSize/2);ctx.fillRect(o.x,o.gapY+o.gapSize/2,28,h-o.gapY-o.gapSize/2);});
                ctx.shadowBlur=14;ctx.shadowColor='#00f3ff';ctx.fillStyle='#00f3ff';ctx.beginPath();ctx.arc(70,s.playerY,12,0,Math.PI*2);ctx.fill();
                ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('برای پرش لمس کن!  •  هر ۱۰ ثانیه سخت‌تر',200,25);
            } else {
                ctx.shadowBlur=24;ctx.shadowColor='#00ff66';ctx.strokeStyle='#00ff66';ctx.lineWidth=4;ctx.beginPath();ctx.arc(s.target.x,s.target.y,s.target.r+4+Math.sin(s.frame/5)*3,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#00ff66';ctx.beginPath();ctx.arc(s.target.x,s.target.y,s.target.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#071018';ctx.beginPath();ctx.arc(s.target.x,s.target.y,5,0,Math.PI*2);ctx.fill();
                if(s.bonus){ctx.shadowColor='#ffcc00';ctx.shadowBlur=25;ctx.fillStyle='#ffcc00';ctx.beginPath();ctx.arc(s.bonus.x,s.bonus.y,s.bonus.r+Math.sin(s.frame/3)*2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('+25',s.bonus.x,s.bonus.y+4);}
                s.particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/24);ctx.fillStyle='#00f3ff';ctx.fillRect(p.x,p.y,4,4);});ctx.globalAlpha=1;
                ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('هدف متحرک را بزن! زرد = ۲۵ امتیاز • کمبو = امتیاز بیشتر',200,25);
            }
            ctx.restore();
            gameLoopId = rafLimited(extraGameLoop);
        }

        // Open the official full OpenFront game directly from its card.
        // The official site blocks iframe embedding in many browsers, which causes a white screen.
        function launchOpenFront() {
            // An anchor click avoids the popup-blocker/null-return problem of window.open with noopener
            const a = document.createElement('a');
            a.href = 'https://openfront.io/';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }

        /* ------------------------------------------------------------------
           INTRO SPLASH: show the name, then slide up to reveal the site
        ------------------------------------------------------------------ */
        (function () {
            const splash = document.getElementById('splash');
            if (!splash) return;
            let left = false;
            function leaveSplash() {
                if (left) return;
                left = true;
                splash.classList.add('exit');
                setTimeout(() => {
                    splash.remove();
                    document.body.classList.remove('splash-lock');
                }, 1000);
            }
            setTimeout(leaveSplash, 3200);
            splash.addEventListener('click', leaveSplash);
        })();
