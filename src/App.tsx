/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { challengesData, ChallengeData } from './data/challenges';
import { UOSSM_LOGO_DATA_URI, ICNA_LOGO_DATA_URI } from './data/uossmLogo';

const UOSSM_LOGO_FALLBACK = '/assets/aistudio/IMG_________________1e51f46a.jpg';
const ICNA_LOGO_FALLBACK = '/assets/aistudio/IMG_________________344aeab6.jpg';

function shadeColor(color: string, percent: number): string {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = Math.floor((R * (100 + percent)) / 100);
  G = Math.floor((G * (100 + percent)) / 100);
  B = Math.floor((B * (100 + percent)) / 100);

  R = Math.min(255, Math.max(0, R));
  G = Math.min(255, Math.max(0, G));
  B = Math.min(255, Math.max(0, B));

  const RR = R.toString(16).padStart(2, '0');
  const GG = G.toString(16).padStart(2, '0');
  const BB = B.toString(16).padStart(2, '0');

  return `#${RR}${GG}${BB}`;
}

export default function App() {
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [noRepeat, setNoRepeat] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pointerTick, setPointerTick] = useState(false);
  const [uossmLogoSrc, setUossmLogoSrc] = useState<string>(UOSSM_LOGO_DATA_URI);
  const [icnaLogoSrc, setIcnaLogoSrc] = useState<string>(ICNA_LOGO_DATA_URI);
  const [uossmLogoError, setUossmLogoError] = useState(false);
  const [icnaLogoError, setIcnaLogoError] = useState(false);

  const [statusHtml, setStatusHtml] = useState<string>(
    'اضغطي على زر <span class="text-[#FF854D] font-black">SPIN</span> لتدوير العجلة أو اختاري رقماً مباشرة!'
  );

  // Modal State
  const [activeChallenge, setActiveChallenge] = useState<ChallengeData | null>(null);
  const [quickQIndex, setQuickQIndex] = useState(0);
  const [emotionIndex, setEmotionIndex] = useState(0);
  const [showSecretEmotion, setShowSecretEmotion] = useState(false);
  const [proverbIndex, setProverbIndex] = useState(0);
  const [showProverbEnd, setShowProverbEnd] = useState(false);

  // Memory Game State (Challenge 6)
  const [memorySetIndex, setMemorySetIndex] = useState(0);
  const [memoryPhase, setMemoryPhase] = useState<'idle' | 'showing' | 'hidden' | 'revealed'>('idle');
  const [memoryRemainingMs, setMemoryRemainingMs] = useState(5000);

  // Gratitude Stars State (Challenge 7)
  const [litStars, setLitStars] = useState<boolean[]>([false, false, false]);

  // Offline / GitHub Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [standaloneHtml, setStandaloneHtml] = useState<string>('');
  const [standaloneBlobUrl, setStandaloneBlobUrl] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Refs for Canvas & Animation
  const appContainerRef = useRef<HTMLDivElement | null>(null);
  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentRotationRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const completedIdsRef = useRef<Set<number>>(completedIds);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const memoryIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    completedIdsRef.current = completedIds;
  }, [completedIds]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const onFsChange = () => {
      const fsElem =
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      setIsFullscreen(Boolean(fsElem));
      window.dispatchEvent(new Event('resize'));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  useEffect(() => {
    let activeUrl = '';
    fetch('./uossm-wheel-standalone.html')
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((txt) => {
        setStandaloneHtml(txt);
        const blob = new Blob([txt], { type: 'text/html;charset=utf-8' });
        activeUrl = URL.createObjectURL(blob);
        setStandaloneBlobUrl(activeUrl);
      })
      .catch(() => {
        const fallbackTxt = '<!doctype html>\n' + document.documentElement.outerHTML;
        setStandaloneHtml(fallbackTxt);
        const blob = new Blob([fallbackTxt], { type: 'text/html;charset=utf-8' });
        activeUrl = URL.createObjectURL(blob);
        setStandaloneBlobUrl(activeUrl);
      });
    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, []);

  const numSegments = challengesData.length;
  const arcSize = (2 * Math.PI) / numSegments;

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playTickSound = useCallback(
    (pitchMultiplier = 1) => {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520 * pitchMultiplier, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.045);

        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } catch {
        // Ignore audio errors
      }
    },
    [getAudioContext]
  );

  const playWinChime = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const startTime = ctx.currentTime + idx * 0.09;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.7);
      });
    } catch {
      // Ignore audio errors
    }
  }, [getAudioContext]);

  // Confetti Launcher
  const confettiPiecesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vr: number;
      alpha: number;
    }>
  >([]);
  const confettiAnimIdRef = useRef<number | null>(null);

  const animateConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const cCtx = canvas.getContext('2d');
    if (!cCtx) return;

    cCtx.clearRect(0, 0, canvas.width, canvas.height);
    confettiPiecesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38;
      p.rotation += p.vr;
      p.alpha -= 0.008;

      cCtx.save();
      cCtx.globalAlpha = Math.max(0, p.alpha);
      cCtx.translate(p.x, p.y);
      cCtx.rotate((p.rotation * Math.PI) / 180);
      cCtx.fillStyle = p.color;
      cCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
      cCtx.restore();
    });

    confettiPiecesRef.current = confettiPiecesRef.current.filter(
      (p) => p.alpha > 0 && p.y < canvas.height + 40
    );

    if (confettiPiecesRef.current.length > 0) {
      confettiAnimIdRef.current = requestAnimationFrame(animateConfetti);
    } else {
      cCtx.clearRect(0, 0, canvas.width, canvas.height);
      confettiAnimIdRef.current = null;
    }
  }, []);

  const launchConfetti = useCallback(() => {
    const colors = ['#EE6B33', '#FF854D', '#16A34A', '#F59E0B', '#38BDF8', '#E2E8F0'];
    const pieces = [];
    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 320,
        y: window.innerHeight * 0.45,
        vx: (Math.random() - 0.5) * 19,
        vy: -Math.random() * 17 - 5,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        alpha: 1,
      });
    }
    confettiPiecesRef.current = pieces;
    if (!confettiAnimIdRef.current) {
      animateConfetti();
    }
  }, [animateConfetti]);

  const drawWheel = useCallback(() => {
    const wheelCanvas = wheelCanvasRef.current;
    if (!wheelCanvas) return;
    const ctx = wheelCanvas.getContext('2d');
    if (!ctx) return;

    const w = wheelCanvas.width;
    const h = wheelCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const outerRadius = w * 0.465;
    const numRingOuter = w * 0.435;
    const numRingInner = w * 0.295;
    const scoreRingInner = w * 0.128;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(currentRotationRef.current);

    // 1. Metallic Silver & UOSSM Orange 3D Outer Bezel
    const bezelGrad = ctx.createRadialGradient(0, 0, numRingOuter - 5, 0, 0, outerRadius + 12);
    bezelGrad.addColorStop(0, '#0F172A');
    bezelGrad.addColorStop(0.5, '#1E293B');
    bezelGrad.addColorStop(0.85, '#334155');
    bezelGrad.addColorStop(1, '#0F172A');

    ctx.beginPath();
    ctx.arc(0, 0, outerRadius + 10, 0, Math.PI * 2);
    ctx.fillStyle = bezelGrad;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#EE6B33';
    ctx.shadowColor = 'rgba(238, 107, 51, 0.8)';
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner metallic silver rim
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius + 2, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
    ctx.stroke();

    // 3D Glowing Studs / Bulbs around the outer rim
    const totalBulbs = 30;
    for (let i = 0; i < totalBulbs; i++) {
      const angle = (i * 2 * Math.PI) / totalBulbs;
      const bx = Math.cos(angle) * (outerRadius - 4);
      const by = Math.sin(angle) * (outerRadius - 4);
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#FF854D' : '#F8FAFC';
      ctx.shadowColor = i % 2 === 0 ? '#EE6B33' : '#16A34A';
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 2. Draw the 10 Segments (Outer Number + 3D Icon Ring & Inner Score Ring)
    for (let i = 0; i < numSegments; i++) {
      const startAngle = i * arcSize - Math.PI / 2 - arcSize / 2;
      const endAngle = startAngle + arcSize;
      const item = challengesData[i];
      const isDone = completedIdsRef.current.has(item.id);

      // A. OUTER NUMBER RING SEGMENT
      ctx.beginPath();
      ctx.arc(0, 0, numRingOuter, startAngle, endAngle, false);
      ctx.arc(0, 0, numRingInner, endAngle, startAngle, true);
      ctx.closePath();

      const gradOuter = ctx.createRadialGradient(0, 0, numRingInner, 0, 0, numRingOuter);
      if (isDone) {
        gradOuter.addColorStop(0, '#1e293b');
        gradOuter.addColorStop(1, '#334155');
      } else {
        gradOuter.addColorStop(0, shadeColor(item.color, -18));
        gradOuter.addColorStop(0.6, item.color);
        gradOuter.addColorStop(1, shadeColor(item.color, 18));
      }
      ctx.fillStyle = gradOuter;
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      // B. INNER SCORE DECORATIVE RING
      ctx.beginPath();
      ctx.arc(0, 0, numRingInner - 5, startAngle, endAngle, false);
      ctx.arc(0, 0, scoreRingInner, endAngle, startAngle, true);
      ctx.closePath();

      const gradInner = ctx.createRadialGradient(0, 0, scoreRingInner, 0, 0, numRingInner - 5);
      if (isDone) {
        gradInner.addColorStop(0, '#0f172a');
        gradInner.addColorStop(1, '#1e293b');
      } else {
        gradInner.addColorStop(0, shadeColor(item.color, -42));
        gradInner.addColorStop(0.75, shadeColor(item.color, -10));
        gradInner.addColorStop(1, item.color);
      }
      ctx.fillStyle = gradInner;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
      ctx.stroke();

      // C. DRAW OUTER NUMBER (1 to 10) WITH 3D EXTRUSION
      ctx.save();
      const midAngle = startAngle + arcSize / 2;
      const textRadiusOuter = (numRingOuter + numRingInner) / 2;
      ctx.translate(Math.cos(midAngle) * textRadiusOuter, Math.sin(midAngle) * textRadiusOuter);
      ctx.rotate(midAngle + Math.PI / 2);

      ctx.font = '900 48px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 3D Shadow Layer
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillText(item.id.toString(), 0, 4);

      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(9, 19, 38, 0.9)';
      ctx.strokeText(item.id.toString(), 0, 0);

      ctx.fillStyle = isDone ? '#94a3b8' : '#ffffff';
      ctx.fillText(item.id.toString(), 0, 0);

      if (isDone) {
        ctx.font = 'bold 22px Cairo, sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.fillText('✓', 30, -18);
      }
      ctx.restore();

      // D. DRAW INNER RING ICON + SCORE
      ctx.save();
      const textRadiusInner = (numRingInner * 0.72 + scoreRingInner * 1.28) / 2;
      ctx.translate(Math.cos(midAngle) * textRadiusInner, Math.sin(midAngle) * textRadiusInner);
      ctx.rotate(midAngle + Math.PI / 2);

      ctx.font = '26px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.fillText(item.icon3d, 0, -10);

      ctx.font = '800 17px Cairo, sans-serif';
      ctx.fillStyle = isDone ? 'rgba(148,163,184,0.5)' : 'rgba(255, 255, 255, 0.95)';
      ctx.fillText(item.scoreRing, 0, 15);
      ctx.restore();
    }

    // 3. Separator Ring between Outer & Inner Ring
    ctx.beginPath();
    ctx.arc(0, 0, numRingInner, 0, Math.PI * 2);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#EE6B33';
    ctx.shadowColor = 'rgba(238, 107, 51, 0.8)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }, [arcSize, numSegments]);

  useEffect(() => {
    drawWheel();
  }, [completedIds, drawWheel]);

  // Background particles & resize listener
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    const confettiCanvas = confettiCanvasRef.current;
    if (!bgCanvas || !confettiCanvas) return;
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;

    const handleResize = () => {
      bgCanvas.width = window.innerWidth;
      bgCanvas.height = window.innerHeight;
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
      drawWheel();
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const stars = Array.from({ length: 40 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2.4 + 0.7,
      vy: -Math.random() * 0.32 - 0.08,
      alpha: Math.random() * 0.55 + 0.18,
      color: Math.random() > 0.5 ? '#EE6B33' : '#10B981',
    }));

    let animId: number;
    const animateBg = () => {
      bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
      stars.forEach((s) => {
        s.y += s.vy;
        if (s.y < -10) {
          s.y = bgCanvas.height + 10;
          s.x = Math.random() * bgCanvas.width;
        }
        bgCtx.beginPath();
        bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        bgCtx.fillStyle = s.color;
        bgCtx.globalAlpha = s.alpha;
        bgCtx.fill();
      });
      animId = requestAnimationFrame(animateBg);
    };
    animateBg();
    drawWheel();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [drawWheel]);

  const getWinningSegmentIndex = (rotationRadians: number) => {
    const normalized = ((rotationRadians % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const index = Math.round(((2 * Math.PI - normalized) % (2 * Math.PI)) / arcSize) % numSegments;
    return index;
  };

  const openChallengeModal = useCallback((id: number) => {
    if (memoryIntervalRef.current) {
      clearInterval(memoryIntervalRef.current);
      memoryIntervalRef.current = null;
    }
    const item = challengesData.find((c) => c.id === id);
    if (!item) return;

    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });

    if (item.helperType === 'quickQuestion' && item.questionsBank) {
      setQuickQIndex(Math.floor(Math.random() * item.questionsBank.length));
    } else if (item.helperType === 'emotionAct' && item.emotionsBank) {
      setEmotionIndex(Math.floor(Math.random() * item.emotionsBank.length));
      setShowSecretEmotion(false);
    } else if (item.helperType === 'proverb' && item.proverbsBank) {
      setProverbIndex(Math.floor(Math.random() * item.proverbsBank.length));
      setShowProverbEnd(false);
    } else if (item.helperType === 'memoryGame') {
      setMemoryPhase('idle');
      setMemoryRemainingMs(5000);
    } else if (item.helperType === 'gratitudeThree') {
      setLitStars([false, false, false]);
    }

    setActiveChallenge(item);
  }, []);

  const spinWheel = useCallback(
    (forcedTargetId: number | null = null) => {
      if (isSpinning) return;

      let availableChallenges = challengesData;
      const currentCompleted = new Set(completedIdsRef.current);

      if (noRepeat && !forcedTargetId) {
        availableChallenges = challengesData.filter((c) => !currentCompleted.has(c.id));
        if (availableChallenges.length === 0) {
          currentCompleted.clear();
          setCompletedIds(new Set());
          availableChallenges = challengesData;
        }
      }

      let chosenChallenge: ChallengeData | undefined;
      if (forcedTargetId) {
        chosenChallenge = challengesData.find((c) => c.id === forcedTargetId);
      } else {
        const randIdx = Math.floor(Math.random() * availableChallenges.length);
        chosenChallenge = availableChallenges[randIdx];
      }

      if (!chosenChallenge) return;

      const targetIndex = challengesData.findIndex((c) => c.id === chosenChallenge!.id);

      const desiredModAngle = ((numSegments - targetIndex) % numSegments) * arcSize;
      const currentModAngle =
        ((currentRotationRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      let angleDiff = desiredModAngle - currentModAngle;
      if (angleDiff < 0) angleDiff += 2 * Math.PI;

      const extraSpins = (6 + Math.floor(Math.random() * 3)) * (2 * Math.PI);
      const safeJitter = (Math.random() - 0.5) * (arcSize * 0.45);
      const totalDelta = extraSpins + angleDiff + safeJitter;

      const startRotation = currentRotationRef.current;
      const duration = 4600;
      const startTime = performance.now();

      setIsSpinning(true);
      setStatusHtml('العجلة تدور الآن... يا ترى أي رقم وتحدٍ سيظهر؟ 🎡✨');

      let lastTickSlice = getWinningSegmentIndex(startRotation);

      const animateSpin = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        currentRotationRef.current = startRotation + totalDelta * eased;

        drawWheel();

        const currentSlice = getWinningSegmentIndex(currentRotationRef.current);
        if (currentSlice !== lastTickSlice) {
          lastTickSlice = currentSlice;
          playTickSound(0.9 + (1 - progress) * 0.4);
          setPointerTick(true);
          setTimeout(() => setPointerTick(false), 65);
        }

        if (progress < 1) {
          requestAnimationFrame(animateSpin);
        } else {
          setIsSpinning(false);
          const winningIndex = getWinningSegmentIndex(currentRotationRef.current);
          const winner = challengesData[winningIndex];

          setCompletedIds((prev) => {
            const next = new Set(prev);
            next.add(winner.id);
            return next;
          });

          setStatusHtml(
            `توقفت العجلة على الرقم <span class="text-[#FF854D] font-black">(${winner.id})</span>: ${winner.title} ${winner.icon3d}`
          );

          playWinChime();
          launchConfetti();

          setTimeout(() => {
            openChallengeModal(winner.id);
          }, 450);
        }
      };

      requestAnimationFrame(animateSpin);
    },
    [
      arcSize,
      drawWheel,
      isSpinning,
      launchConfetti,
      noRepeat,
      numSegments,
      openChallengeModal,
      playTickSound,
      playWinChime,
    ]
  );

  const handleWheelCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSpinning) return;
    const wheelCanvas = wheelCanvasRef.current;
    if (!wheelCanvas) return;

    const rect = wheelCanvas.getBoundingClientRect();
    const scaleX = wheelCanvas.width / rect.width;
    const scaleY = wheelCanvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX - wheelCanvas.width / 2;
    const y = (e.clientY - rect.top) * scaleY - wheelCanvas.height / 2;
    const dist = Math.sqrt(x * x + y * y);

    if (dist > wheelCanvas.width * 0.14 && dist < wheelCanvas.width * 0.45) {
      let clickAngle = Math.atan2(y, x) - currentRotationRef.current;
      clickAngle = clickAngle + Math.PI / 2 + arcSize / 2;
      clickAngle = ((clickAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const clickedIndex = Math.floor(clickAngle / arcSize) % numSegments;
      const clickedChallenge = challengesData[clickedIndex];
      if (clickedChallenge) {
        spinWheel(clickedChallenge.id);
      }
    }
  };

  // Memory Challenge Controls
  const startMemoryChallenge = (customSetIdx?: number) => {
    if (memoryIntervalRef.current) {
      clearInterval(memoryIntervalRef.current);
    }
    if (typeof customSetIdx === 'number') {
      setMemorySetIndex(customSetIdx);
    }
    setMemoryPhase('showing');
    setMemoryRemainingMs(5000);

    let remaining = 5000;
    const step = 100;
    memoryIntervalRef.current = window.setInterval(() => {
      remaining -= step;
      setMemoryRemainingMs(Math.max(0, remaining));

      if (remaining % 1000 === 0 && remaining > 0) {
        playTickSound(1.4);
      }

      if (remaining <= 0) {
        if (memoryIntervalRef.current) clearInterval(memoryIntervalRef.current);
        setMemoryPhase('hidden');
        playTickSound(0.8);
      }
    }, step);
  };

  const revealMemoryItems = () => {
    if (memoryIntervalRef.current) {
      clearInterval(memoryIntervalRef.current);
    }
    setMemoryPhase('revealed');
    playWinChime();
  };

  const switchMemorySet = () => {
    const sets = challengesData[5].memorySets || [];
    const nextIdx = (memorySetIndex + 1) % sets.length;
    startMemoryChallenge(nextIdx);
  };

  const closeModal = () => {
    if (memoryIntervalRef.current) {
      clearInterval(memoryIntervalRef.current);
      memoryIntervalRef.current = null;
    }
    setActiveChallenge(null);
  };

  const closeModalAndSpinAgain = () => {
    closeModal();
    setTimeout(() => spinWheel(null), 250);
  };

  const resetProgress = () => {
    setCompletedIds(new Set());
    setStatusHtml(
      'تمت إعادة ضبط جميع الأرقام! اضغطي <span class="text-[#FF854D] font-black">SPIN</span> للبدء من جديد.'
    );
    playTickSound(1.1);
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => playTickSound(1.2), 20);
      }
      return next;
    });
  };

  // Bulletproof Fullscreen handler (works on Phone, Laptop, Projector + iFrame fallback)
  const toggleFullScreen = async () => {
    playTickSound(1.15);
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };

    const isNativeFs = Boolean(document.fullscreenElement || doc.webkitFullscreenElement);

    if (!isNativeFs && !isFullscreen) {
      try {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch {
        setIsFullscreen(true);
      }
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } catch {
        // Ignore
      }
      setIsFullscreen(false);
    }

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 120);
  };

  const triggerCelebrationSoundAndConfetti = () => {
    playWinChime();
    launchConfetti();
  };

  return (
    <div
      ref={appContainerRef}
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-30 w-full h-full overflow-x-hidden overflow-y-auto'
          : 'relative min-h-screen w-full overflow-x-hidden'
      } flex flex-col justify-between select-none`}
    >
      {/* Background Particles Canvas */}
      <canvas ref={bgCanvasRef} className="fixed inset-0 pointer-events-none z-0" />
      {/* Confetti Canvas */}
      <canvas ref={confettiCanvasRef} className="fixed inset-0 pointer-events-none z-50" />

      {/* =====================================================================
          1. PROMINENT DUAL-LOGO HEADER BAR (RESPONSIVE FOR PHONE & LAPTOP)
         ===================================================================== */}
      <header className="relative z-20 w-full max-w-[1920px] mx-auto px-3 sm:px-6 xl:px-8 py-2.5 border-b border-slate-700/70 bg-[#081224]/92 backdrop-blur-md shadow-[0_6px_25px_rgba(0,0,0,0.55)] shrink-0">
        {/* Desktop / Laptop Layout (lg+): [Big UOSSM Logo] --- [Title + Controls] --- [Big ICNA Logo] */}
        {/* Mobile / Tablet Layout (<lg): Top Row = [Big UOSSM Logo] + [Big ICNA Logo], Bottom Row = [Title + Controls] */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 w-full">
          
          {/* TOP ROW ON MOBILE (Both Logos Side-by-Side, Large & Prominent) / RIGHT LOGO ON DESKTOP */}
          <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3 shrink-0">
            {/* Logo 1: UOSSM CANADA (Right side in RTL) */}
            <div className="bg-white rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-[0_5px_0_#CBD5E1,0_10px_24px_rgba(238,107,51,0.35)] border-2 border-[#EE6B33] flex items-center justify-center transition transform hover:scale-[1.03] shrink-0">
              {!uossmLogoError ? (
                <img
                  src={uossmLogoSrc}
                  alt="UOSSM Canada - اتحاد منظمات الرعاية الطبية والإغاثة"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (uossmLogoSrc !== UOSSM_LOGO_FALLBACK) {
                      setUossmLogoSrc(UOSSM_LOGO_FALLBACK);
                    } else {
                      setUossmLogoError(true);
                    }
                  }}
                  className="h-12 sm:h-15 md:h-16 xl:h-18 w-auto max-w-[42vw] sm:max-w-[230px] xl:max-w-[260px] object-contain"
                />
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-slate-800 font-black">
                  <span className="text-[#EE6B33] text-xl">UOSSM</span>
                  <span className="text-sm text-slate-600">CANADA</span>
                </div>
              )}
            </div>

            {/* Logo 2 on Mobile/Tablet (<lg): ICNA Relief Canada on the Opposite Side */}
            <div className="lg:hidden bg-[#525D6B] rounded-2xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-[0_5px_0_#16A34A,0_10px_24px_rgba(22,163,74,0.35)] border-2 border-emerald-400 flex items-center justify-center overflow-hidden transition transform hover:scale-[1.03] shrink-0">
              {!icnaLogoError ? (
                <img
                  src={icnaLogoSrc}
                  alt="ICNA Relief Canada - Muslims For Humanity"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (icnaLogoSrc !== ICNA_LOGO_FALLBACK) {
                      setIcnaLogoSrc(ICNA_LOGO_FALLBACK);
                    } else {
                      setIcnaLogoError(true);
                    }
                  }}
                  className="h-12 sm:h-15 md:h-16 w-auto max-w-[42vw] sm:max-w-[230px] object-contain rounded-lg"
                />
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-white font-black">
                  <span className="text-emerald-400 text-base">ICNA Relief</span>
                  <span className="text-xs text-slate-200">Canada</span>
                </div>
              )}
            </div>
          </div>

          {/* CENTER: Activity Title & Controls Bar */}
          <div className="flex flex-col items-center justify-center text-center min-w-0 flex-1 px-1">
            <div className="hidden sm:flex items-center justify-center gap-2 text-xs xl:text-sm font-bold text-slate-300 mb-1">
              <span className="text-[#FF854D]">اتحاد منظمات الرعاية الطبية والإغاثة (UOSSM Canada)</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400">ICNA Relief Canada (Muslims For Humanity)</span>
            </div>

            <div className="flex flex-col xl:flex-row items-center justify-center gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-2xl xl:text-3xl font-black tracking-wide text-white flex items-center gap-2">
                <span className="icon-3d-glyph text-2xl sm:text-3xl">🎡</span>
                <span>عجلة الحظ</span>
                <span className="text-[#EE6B33]">–</span>
                <span className="bg-gradient-to-l from-[#FF854D] via-amber-200 to-emerald-300 bg-clip-text text-transparent">
                  اختاري تحدّيكِ
                </span>
              </h1>

              {/* 3D Control Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                {/* No-Repeat Toggle */}
                <label
                  className="btn-3d-slate px-2.5 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs"
                  title="عدم تكرار الرقم الذي ظهر عند التدوير العشوائي"
                >
                  <input
                    type="checkbox"
                    checked={noRepeat}
                    onChange={(e) => setNoRepeat(e.target.checked)}
                    className="accent-[#EE6B33] w-3.5 h-3.5 rounded cursor-pointer"
                  />
                  <span className="text-slate-100 font-bold whitespace-nowrap">منع التكرار</span>
                </label>

                {/* Sound Toggle */}
                <button
                  onClick={toggleSound}
                  className="btn-3d-slate px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer text-slate-100 whitespace-nowrap"
                  title="تشغيل / كتم الصوت"
                >
                  <span className="icon-3d-glyph text-sm">
                    {soundEnabled ? '🔊' : '🔇'}
                  </span>
                  <span className="hidden sm:inline">
                    {soundEnabled ? 'الصوت' : 'مكتوم'}
                  </span>
                </button>

                {/* Reset Button */}
                <button
                  onClick={resetProgress}
                  className="btn-3d-slate px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer text-amber-200 whitespace-nowrap"
                  title="إعادة ضبط جميع الأرقام"
                >
                  <span className="icon-3d-glyph text-sm">🔄</span>
                  <span className="hidden sm:inline">إعادة ضبط</span>
                </button>

                {/* Download Offline / GitHub Button */}
                {!isFullscreen && (
                  <button
                    onClick={() => {
                      setCopySuccess(false);
                      setShowExportModal(true);
                      playTickSound(1.2);
                      if (standaloneBlobUrl) {
                        try {
                          const a = document.createElement('a');
                          a.href = standaloneBlobUrl;
                          a.download = 'uossm-wheel-offline.html';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        } catch {
                          // Modal is open
                        }
                      }
                    }}
                    className="btn-3d-slate px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer text-emerald-300 whitespace-nowrap"
                    title="حفظ نسخة الأوفلاين و GitHub"
                  >
                    <span className="icon-3d-glyph text-sm">📥</span>
                    <span>أوفلاين</span>
                  </button>
                )}

                {/* Projector Fullscreen Button */}
                <button
                  onClick={toggleFullScreen}
                  className="btn-3d-orange px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-black text-white cursor-pointer whitespace-nowrap"
                  title="ملء الشاشة للعرض على البروجكتر والهاتف"
                >
                  <i className={isFullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'} />
                  <span>{isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* LEFT SIDE ON DESKTOP (lg+): Second Logo (ICNA Relief Canada - Opposite UOSSM Logo) */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            <div className="bg-[#525D6B] rounded-2xl px-3.5 py-1.5 xl:px-4 xl:py-2 shadow-[0_5px_0_#16A34A,0_10px_24px_rgba(22,163,74,0.35)] border-2 border-emerald-400 flex items-center justify-center overflow-hidden transition transform hover:scale-[1.03]">
              {!icnaLogoError ? (
                <img
                  src={icnaLogoSrc}
                  alt="ICNA Relief Canada - Muslims For Humanity"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (icnaLogoSrc !== ICNA_LOGO_FALLBACK) {
                      setIcnaLogoSrc(ICNA_LOGO_FALLBACK);
                    } else {
                      setIcnaLogoError(true);
                    }
                  }}
                  className="h-14 xl:h-18 w-auto max-w-[240px] xl:max-w-[270px] object-contain rounded-lg"
                />
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-white font-black">
                  <span className="text-emerald-400 text-lg">ICNA Relief</span>
                  <span className="text-xs text-slate-200">Canada</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* =====================================================================
          2. MAIN STAGE (ZERO OVERLAP ON PHONE & FULL WIDESCREEN ON LAPTOP)
         ===================================================================== */}
      <main className="relative z-10 w-full max-w-[1920px] mx-auto px-3 sm:px-6 xl:px-8 py-4 lg:py-2 my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-5 xl:gap-7 items-center">
        {/* RIGHT/CENTER COLUMN (RTL): The Wheel & Action Stage */}
        <section className="lg:col-span-5 xl:col-span-5 flex flex-col items-center justify-center w-full">
          {/* Status Banner above wheel */}
          <div className="mb-4 px-4 py-2 rounded-2xl bg-[#10203B]/95 border border-[#EE6B33]/50 shadow-[0_4px_16px_rgba(0,0,0,0.45)] text-center flex items-center gap-2 max-w-full">
            <span className="icon-3d-glyph text-base">🎯</span>
            <span
              className="text-xs sm:text-sm font-bold text-slate-100"
              dangerouslySetInnerHTML={{ __html: statusHtml }}
            />
          </div>

          {/* The 3D Wheel Container - Clean natural sizing on Phone & Viewport-proportional on Laptop */}
          <div className="wheel-stage w-[min(84vw,350px)] sm:w-[min(70vw,410px)] lg:w-[min(39vw,50vh)] xl:w-[min(41vw,54vh)] aspect-square my-1">
            <div className="wheel-outer-glow" />

            {/* Top 3D Pointer Arrow */}
            <div className={`wheel-pointer ${pointerTick ? 'pointer-tick' : ''}`}>
              <svg
                width="44"
                height="46"
                viewBox="0 0 46 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M23 46L5 10C3.5 7 5.7 3.5 9 3.5H37C40.3 3.5 42.5 7 41 10L23 46Z"
                  fill="url(#pointerGradUossm)"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                />
                <circle cx="23" cy="12" r="4.5" fill="#FFFFFF" />
                <defs>
                  <linearGradient
                    id="pointerGradUossm"
                    x1="23"
                    y1="3"
                    x2="23"
                    y2="46"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#FF854D" />
                    <stop offset="0.55" stopColor="#EE6B33" />
                    <stop offset="1" stopColor="#9A3412" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* High-Res Wheel Canvas */}
            <canvas
              ref={wheelCanvasRef}
              width={900}
              height={900}
              onClick={handleWheelCanvasClick}
              className="w-full h-full relative z-10 cursor-pointer rounded-full"
            />

            {/* Center 3D Metallic SPIN Button */}
            <button
              onClick={() => spinWheel(null)}
              disabled={isSpinning}
              className="spin-btn-center group"
            >
              <span className="spin-label text-xl sm:text-2xl xl:text-3xl tracking-wider group-hover:scale-105 transition">
                SPIN
              </span>
              <span className="text-[10px] sm:text-xs text-slate-800 font-extrabold mt-0.5">
                اضغطي للتدوير
              </span>
            </button>
          </div>

          {/* 3D Quick Action Buttons Under Wheel */}
          <div className="mt-4 lg:mt-3 flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => spinWheel(null)}
              disabled={isSpinning}
              className="btn-3d-orange px-6 py-2.5 rounded-2xl text-white font-black text-sm sm:text-base flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span className="icon-3d-glyph text-lg">✨</span>
              <span>دوري العجلة الآن!</span>
            </button>

            <button
              onClick={triggerCelebrationSoundAndConfetti}
              className="btn-3d-slate px-4 py-2.5 rounded-2xl text-amber-200 font-bold text-sm sm:text-base flex items-center gap-2 cursor-pointer"
              title="تحية وتصفيق للمتسابقة"
            >
              <span className="icon-3d-glyph text-lg">👏</span>
              <span>تحية وتشجيع</span>
            </button>
          </div>
        </section>

        {/* LEFT COLUMN (RTL): 10 Challenges in a Projector-Friendly 2-Column 3D Grid */}
        <section className="lg:col-span-7 xl:col-span-7 flex flex-col bg-[#0C182E]/92 border border-slate-600/50 rounded-3xl p-3.5 sm:p-4 xl:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.65)] backdrop-blur-md w-full">
          {/* Panel Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <div
                className="icon-3d-box w-10 h-10 text-xl shrink-0"
                style={{
                  background: 'linear-gradient(145deg, #FF854D, #C2410C)',
                }}
              >
                <span className="icon-3d-glyph">🎁</span>
              </div>
              <div>
                <h2 className="text-base sm:text-lg xl:text-xl font-black text-white">
                  تحديات وأسئلة العجلة التفاعلية (10)
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-300">
                  اضغطي على أي بطاقة لفتح السؤال مباشرة أو لتدوير العجلة نحوه
                </p>
              </div>
            </div>

            {/* Completed Counter */}
            <div className="flex items-center gap-2">
              <div className="bg-[#132544] border border-[#EE6B33]/50 px-3.5 py-1 rounded-2xl text-center shadow-inner">
                <span className="text-[10px] text-slate-300 block font-semibold">المنجز</span>
                <span className="text-xs sm:text-sm font-black text-[#FF854D] tabular-nums">
                  {completedIds.size} / {challengesData.length}
                </span>
              </div>
            </div>
          </div>

          {/* 10 Challenge Cards in a 2-Column × 5-Row Grid on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {challengesData.map((item) => {
              const isDone = completedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => openChallengeModal(item.id)}
                  className={`number-card ${
                    isDone ? 'completed' : ''
                  } rounded-2xl p-2.5 flex items-center justify-between gap-2 cursor-pointer group`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* 3D Extruded Icon & Number Badge */}
                    <div
                      className="icon-3d-box w-11 h-11 xl:w-12 xl:h-12 shrink-0 flex flex-col items-center justify-center relative"
                      style={{
                        background: isDone
                          ? 'linear-gradient(145deg, #059669, #065F46)'
                          : `linear-gradient(145deg, ${shadeColor(item.color, 18)}, ${shadeColor(
                              item.color,
                              -25
                            )})`,
                      }}
                    >
                      <span className="icon-3d-glyph text-lg xl:text-xl leading-none">
                        {item.icon3d}
                      </span>
                      <span className="text-[10px] font-black text-white/95 leading-none mt-0.5 bg-black/30 px-1.5 py-0.2 rounded tabular-nums">
                        #{item.id}
                      </span>
                      {isDone && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-400 text-slate-950 font-black rounded-full text-[10px] flex items-center justify-center border border-slate-900 shadow-md">
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Challenge Title & Category */}
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs sm:text-sm xl:text-base text-white group-hover:text-[#FF854D] transition leading-snug line-clamp-1">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] font-semibold">
                        <span
                          className={
                            item.isPsych ? 'text-amber-300' : 'text-sky-300'
                          }
                        >
                          {item.isPsych ? '🌸 دعم نفسي وتفريغ' : `✨ ${item.category}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        spinWheel(item.id);
                      }}
                      className="btn-3d-slate px-2.5 py-1.5 rounded-xl text-[#FF854D] text-[11px] font-extrabold cursor-pointer whitespace-nowrap"
                      title="تدوير العجلة لتقف على هذا الرقم"
                    >
                      🎯 تدوير
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openChallengeModal(item.id);
                      }}
                      className="btn-3d-orange px-2.5 py-1.5 rounded-xl text-white text-[11px] font-extrabold cursor-pointer whitespace-nowrap"
                    >
                      فتح
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Category Legend Bar */}
          <div className="mt-2.5 pt-2 border-t border-slate-700/70 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-300 font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="icon-3d-glyph">⚡</span>
              <span>الأرقام (1 – 6): تحديات تفاعلية وحماسية</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="icon-3d-glyph">🌸</span>
              <span>الأرقام (7 – 10): دعم نفسي وتفريغ انفعالي</span>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          3. DEDICATED FOOTER WITH DESIGNER SIGNATURE (تصميم ميساء تيسير مهنا)
         ===================================================================== */}
      <footer className="relative z-10 w-full max-w-[1920px] mx-auto px-3 sm:px-6 xl:px-8 py-2 border-t border-slate-700/60 bg-[#071020]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#EE6B33]" />
          <span>UOSSM CANADA</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400">ICNA Relief Canada</span>
        </div>

        {/* Designer Credit Pill in Prominent 3D Style */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#162947] via-[#1E355B] to-[#162947] border border-[#EE6B33]/60 px-4 py-1 rounded-2xl shadow-[0_4px_15px_rgba(238,107,51,0.25)]">
          <span className="icon-3d-glyph text-base">✨</span>
          <span className="text-xs sm:text-sm text-slate-200 font-bold">تصميم:</span>
          <span className="text-sm sm:text-base font-black bg-gradient-to-l from-[#FF854D] via-amber-200 to-white bg-clip-text text-transparent tracking-wide">
            ميساء تيسير مهنا
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span>برنامج الدعم النفسي والاجتماعي للسيدات</span>
        </div>
      </footer>

      {/* =====================================================================
          4. 3D CHALLENGE MODAL (PROJECTOR HIGH-CONTRAST VIEW)
         ===================================================================== */}
      {activeChallenge && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/82 backdrop-blur-md">
          <div className="modal-enter relative w-full max-w-3xl bg-gradient-to-b from-[#132544] via-[#0D1A31] to-[#091224] border-2 border-[#EE6B33] rounded-3xl p-5 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_40px_rgba(238,107,51,0.35)] text-center max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="btn-3d-slate absolute top-4 left-4 w-11 h-11 rounded-2xl text-slate-200 hover:text-white flex items-center justify-center text-xl cursor-pointer"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            {/* Mini Header inside Modal */}
            <div className="flex items-center justify-center gap-2 mb-3 text-xs sm:text-sm font-bold text-slate-300">
              <span className="text-[#FF854D]">UOSSM CANADA</span>
              <span>•</span>
              <span className="text-emerald-400">ICNA Relief Canada</span>
            </div>

            {/* Top 3D Icon & Number Medallion */}
            <div className="flex flex-col items-center justify-center mb-4">
              <div
                className="icon-3d-box float-3d w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex flex-col items-center justify-center text-white mb-3"
                style={{
                  background: `linear-gradient(145deg, ${shadeColor(
                    activeChallenge.color,
                    20
                  )}, ${shadeColor(activeChallenge.color, -30)})`,
                }}
              >
                <span className="icon-3d-glyph text-4xl sm:text-5xl leading-none">
                  {activeChallenge.icon3d}
                </span>
                <span className="text-sm sm:text-base font-black mt-1.5 bg-black/35 px-3 py-0.5 rounded-full">
                  رقم {activeChallenge.id}
                </span>
              </div>

              <span className="text-xs sm:text-sm font-extrabold text-[#FF854D] tracking-wide">
                {activeChallenge.isPsych
                  ? `🌸 ${activeChallenge.category}`
                  : `✨ ${activeChallenge.category}`}
              </span>
            </div>

            {/* Challenge Title */}
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-200 mb-3">
              {activeChallenge.title}
            </h3>

            {/* Main Prompt Box */}
            <div className="bg-[#071022]/95 border-2 border-[#EE6B33]/45 rounded-2xl p-5 sm:p-7 mb-5 shadow-inner">
              <p className="text-xl sm:text-2xl md:text-4xl font-black text-white leading-relaxed">
                {activeChallenge.mainPrompt}
              </p>
              <p className="text-sm sm:text-lg text-slate-200 mt-3 font-semibold">
                {activeChallenge.subPrompt}
              </p>
            </div>

            {/* Dynamic Interactive Helper Container */}
            <div className="mb-6">
              {/* 1. Quick Question Helper */}
              {activeChallenge.helperType === 'quickQuestion' &&
                activeChallenge.questionsBank && (
                  <div className="bg-gradient-to-r from-[#2A1617] via-[#162238] to-[#2A1617] border border-[#EE6B33]/50 rounded-2xl p-4 sm:p-6">
                    <span className="text-xs sm:text-sm font-bold text-[#FF854D] block mb-2">
                      ⚡ السؤال المقترح للمتسابقة:
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-amber-200 mb-4">
                      « {activeChallenge.questionsBank[quickQIndex]} »
                    </p>
                    <button
                      onClick={() => {
                        setQuickQIndex(
                          (prev) => (prev + 1) % activeChallenge.questionsBank!.length
                        );
                        playTickSound(1.2);
                      }}
                      className="btn-3d-orange px-5 py-2.5 rounded-xl text-white font-bold text-sm sm:text-base inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span className="icon-3d-glyph">🔄</span>
                      <span>تغيير السؤال</span>
                    </button>
                  </div>
                )}

              {/* 2. Act Out Emotion Helper */}
              {activeChallenge.helperType === 'emotionAct' &&
                activeChallenge.emotionsBank && (
                  <div className="bg-[#0D1F3C] border border-sky-400/40 rounded-2xl p-4 sm:p-6">
                    <p className="text-xs sm:text-base text-sky-200 mb-3 font-semibold">
                      💡 دعي المتسابقة تقترب لترى الشعور المقترح دون أن يراه الجمهور، أو تختار
                      شعوراً من عندها:
                    </p>
                    {showSecretEmotion && (
                      <div className="bg-[#09152B] border-2 border-emerald-400/60 rounded-2xl p-4 mb-4 shadow-lg">
                        <p className="text-xl sm:text-2xl font-black text-emerald-300 mb-1">
                          {activeChallenge.emotionsBank[emotionIndex].emotion}
                        </p>
                        <p className="text-xs sm:text-base text-slate-200">
                          💡 تلميح للأداء: {activeChallenge.emotionsBank[emotionIndex].hint}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        onClick={() => setShowSecretEmotion((prev) => !prev)}
                        className="btn-3d-orange px-5 py-2.5 rounded-xl text-white font-bold text-sm sm:text-base flex items-center gap-2 cursor-pointer"
                      >
                        <span className="icon-3d-glyph">
                          {showSecretEmotion ? '🙈' : '🎭'}
                        </span>
                        <span>
                          {showSecretEmotion
                            ? 'إخفاء الشعور عن الشاشة'
                            : 'اكشفي الشعور للمتسابقة فقط'}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setEmotionIndex(
                            (prev) => (prev + 1) % activeChallenge.emotionsBank!.length
                          );
                          setShowSecretEmotion(true);
                          playTickSound(1.2);
                        }}
                        className="btn-3d-slate px-5 py-2.5 rounded-xl text-sky-200 font-bold text-sm sm:text-base flex items-center gap-2 cursor-pointer"
                      >
                        <span className="icon-3d-glyph">🔄</span>
                        <span>شعور آخر</span>
                      </button>
                    </div>
                  </div>
                )}

              {/* 3. Complete the Proverb Helper */}
              {activeChallenge.helperType === 'proverb' &&
                activeChallenge.proverbsBank && (
                  <div className="bg-amber-950/40 border border-amber-400/50 rounded-2xl p-4 sm:p-6">
                    <span className="text-xs sm:text-sm font-bold text-amber-300 block mb-1">
                      المثل الشعبي:
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-white mb-3">
                      « {activeChallenge.proverbsBank[proverbIndex].start} »
                    </p>
                    {showProverbEnd && (
                      <p className="text-xl sm:text-2xl font-extrabold text-amber-300 bg-amber-500/20 py-2.5 px-5 rounded-xl mb-3 inline-block border border-amber-400/40">
                        التكملة: {activeChallenge.proverbsBank[proverbIndex].end}
                      </p>
                    )}
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      <button
                        onClick={() => {
                          setShowProverbEnd(true);
                          playWinChime();
                        }}
                        className="btn-3d-orange px-5 py-2.5 rounded-xl text-white font-black text-sm sm:text-base flex items-center gap-2 cursor-pointer"
                      >
                        <span className="icon-3d-glyph">✨</span>
                        <span>إظهار تكملة المثل</span>
                      </button>
                      <button
                        onClick={() => {
                          setProverbIndex(
                            (prev) => (prev + 1) % activeChallenge.proverbsBank!.length
                          );
                          setShowProverbEnd(false);
                          playTickSound(1.2);
                        }}
                        className="btn-3d-slate px-5 py-2.5 rounded-xl text-amber-200 font-bold text-sm sm:text-base flex items-center gap-2 cursor-pointer"
                      >
                        <span className="icon-3d-glyph">🔄</span>
                        <span>مثل شعبي آخر</span>
                      </button>
                    </div>
                  </div>
                )}

              {/* 6. Interactive 5-Items Memory Mini-Game */}
              {activeChallenge.helperType === 'memoryGame' &&
                activeChallenge.memorySets && (
                  <div className="bg-[#101F3A] border border-[#EE6B33]/50 rounded-2xl p-4 sm:p-6">
                    <div className="text-sm sm:text-base font-bold text-amber-200 mb-3">
                      {memoryPhase === 'idle' &&
                        'اضغطي على الزر بالأسفل لإظهار 5 أشياء على الشاشة لمدة 5 ثوانٍ!'}
                      {memoryPhase === 'showing' && (
                        <span className="text-yellow-300">
                          ركزي جيداً! متبقي {Math.ceil(memoryRemainingMs / 1000)} ثوانٍ... ⏱️
                        </span>
                      )}
                      {memoryPhase === 'hidden' && (
                        <span className="text-sky-300 font-extrabold">
                          اختفت الأشياء! الآن اذكري الأشياء الـ 5 التي رأيتِها 🎤✨
                        </span>
                      )}
                      {memoryPhase === 'revealed' && (
                        <span className="text-emerald-300 font-extrabold">
                          هذه هي الأشياء الـ 5 الصحيحة! أحسنتِ 👏🎉
                        </span>
                      )}
                    </div>

                    {memoryPhase === 'showing' && (
                      <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-4">
                        <div
                          className="bg-gradient-to-r from-[#EE6B33] to-amber-400 h-full transition-all duration-100"
                          style={{ width: `${(memoryRemainingMs / 5000) * 100}%` }}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-5 gap-2.5 sm:gap-4 my-3 min-h-[110px] items-center justify-center">
                      {memoryPhase === 'idle' && (
                        <div className="col-span-5 py-6 text-slate-300 text-sm sm:text-base border border-dashed border-slate-600 rounded-xl">
                          الأشياء الـ 5 مخفية الآن.. جاهزة للتحدي؟ 👀
                        </div>
                      )}
                      {(memoryPhase === 'showing' || memoryPhase === 'revealed') &&
                        activeChallenge.memorySets[memorySetIndex].map((obj, idx) => (
                          <div
                            key={idx}
                            className="icon-3d-box bg-gradient-to-b from-slate-800 to-slate-900 p-3 flex flex-col items-center justify-center"
                          >
                            <span className="icon-3d-glyph text-3xl sm:text-5xl mb-1.5">
                              {obj.icon}
                            </span>
                            <span className="text-xs sm:text-sm font-extrabold text-white">
                              {obj.name}
                            </span>
                          </div>
                        ))}
                      {memoryPhase === 'hidden' &&
                        activeChallenge.memorySets[memorySetIndex].map((_, idx) => (
                          <div
                            key={idx}
                            className="icon-3d-box bg-slate-900/90 p-4 flex flex-col items-center justify-center"
                          >
                            <span className="icon-3d-glyph text-2xl sm:text-3xl font-black text-[#FF854D]">
                              ؟
                            </span>
                            <span className="text-xs text-slate-300 mt-1 font-bold">
                              الشيء {idx + 1}
                            </span>
                          </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                      <button
                        onClick={() => startMemoryChallenge()}
                        className="btn-3d-orange px-5 py-2.5 rounded-xl text-white font-black text-sm sm:text-base flex items-center gap-2 cursor-pointer"
                      >
                        <span className="icon-3d-glyph">⏱️</span>
                        <span>ابدئي عرض الأشياء الـ 5 (5 ثوانٍ)</span>
                      </button>
                      <button
                        onClick={revealMemoryItems}
                        className="btn-3d-slate px-4 py-2.5 rounded-xl text-emerald-300 font-bold text-sm sm:text-base flex items-center gap-2 cursor-pointer"
                      >
                        <span className="icon-3d-glyph">✅</span>
                        <span>إظهار الإجابة للتحقق</span>
                      </button>
                      <button
                        onClick={switchMemorySet}
                        className="btn-3d-slate px-4 py-2.5 rounded-xl text-amber-200 font-bold text-sm sm:text-base cursor-pointer"
                      >
                        مجموعة جديدة 🔄
                      </button>
                    </div>
                  </div>
                )}

              {/* 7. Gratitude 3 Stars Helper (3D Stars) */}
              {activeChallenge.helperType === 'gratitudeThree' && (
                <div className="bg-amber-950/30 border border-yellow-400/40 rounded-2xl p-5">
                  <p className="text-xs sm:text-base text-yellow-200 mb-4 font-semibold">
                    اضغطي على النجوم ثلاثية الأبعاد مع كل نعمة تذكرها المتسابقة لإضاءتها 🌟:
                  </p>
                  <div className="flex items-center justify-center gap-4 sm:gap-6">
                    {[0, 1, 2].map((idx) => {
                      const isLit = litStars[idx];
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setLitStars((prev) => {
                              const next = [...prev];
                              next[idx] = !next[idx];
                              return next;
                            });
                            playTickSound(1.3);
                          }}
                          className={`icon-3d-box w-20 h-20 sm:w-24 sm:h-24 flex flex-col items-center justify-center gap-1 font-black transition duration-300 cursor-pointer ${
                            isLit
                              ? 'scale-110 !bg-gradient-to-b !from-yellow-300 !to-amber-500 text-slate-950'
                              : 'bg-slate-800/90 text-yellow-300'
                          }`}
                        >
                          <span className="icon-3d-glyph text-2xl sm:text-3xl">⭐</span>
                          <span className="text-xs sm:text-sm">نعمة {idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 8. Guided Breathing Circle Helper */}
              {activeChallenge.helperType === 'breathingHelper' && (
                <div className="bg-teal-950/40 border border-teal-400/40 rounded-2xl p-5 flex flex-col items-center">
                  <div className="breathing-circle w-28 h-28 rounded-full bg-gradient-to-br from-sky-400/40 to-[#EE6B33]/40 border-2 border-sky-300 flex items-center justify-center mb-3">
                    <span className="text-sm sm:text-base font-black text-white">
                      شهيق.. زفير
                    </span>
                  </div>
                  <p className="text-xs sm:text-base text-teal-200 font-semibold">
                    لنتنفس جميعاً بهدوء مع حركة الدائرة المضيئة قبل سماع مشاركتكِ اللطيفة 🌿
                  </p>
                </div>
              )}

              {/* 4, 5, 9, 10: Inspirational Prompts */}
              {(activeChallenge.helperType === 'positiveQuote' ||
                activeChallenge.helperType === 'kindMessage' ||
                activeChallenge.helperType === 'strengthBadges' ||
                activeChallenge.helperType === 'selfCompassion') && (
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base text-amber-200 font-bold">
                  {(activeChallenge.isPsych
                    ? [
                        '✨ القوة الداخلية',
                        '🌸 الصبر الجميل',
                        '🤍 التصالح مع الذات',
                        '🕊️ الأمل المتجدد',
                      ]
                    : [
                        '💐 الكلمة الطيبة صدقة',
                        '🌟 طاقة إيجابية',
                        '😊 ابتسامة من القلب',
                      ]
                  ).map((tag, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-slate-500">·</span>}
                      <span>{tag}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-700/80">
              <button
                onClick={triggerCelebrationSoundAndConfetti}
                className="btn-3d-orange px-6 py-3 rounded-2xl text-white font-black text-sm sm:text-base flex items-center gap-2 cursor-pointer"
              >
                <span className="icon-3d-glyph text-xl">👏</span>
                <span>تحية وتصفيق للمتسابقة</span>
              </button>

              <button
                onClick={closeModalAndSpinAgain}
                className="btn-3d-slate px-6 py-3 rounded-2xl text-sky-300 font-bold text-sm sm:text-base flex items-center gap-2 cursor-pointer"
              >
                <span className="icon-3d-glyph text-xl">🎡</span>
                <span>تم! تدوير لسيدة أخرى</span>
              </button>

              <button
                onClick={closeModal}
                className="btn-3d-slate px-5 py-3 rounded-2xl text-slate-300 font-bold text-sm sm:text-base cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. OFFLINE & GITHUB EXPORT MODAL (GUARANTEED DOWNLOAD / 1-CLICK COPY)
         ===================================================================== */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="modal-enter relative w-full max-w-2xl bg-gradient-to-b from-[#132544] via-[#0D1A31] to-[#091224] border-2 border-emerald-400 rounded-3xl p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.9)] text-right max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowExportModal(false)}
              className="btn-3d-slate absolute top-4 left-4 w-10 h-10 rounded-xl text-slate-200 hover:text-white flex items-center justify-center text-lg cursor-pointer"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="icon-3d-box w-14 h-14 text-3xl shrink-0"
                style={{ background: 'linear-gradient(145deg, #10B981, #047857)' }}
              >
                <span className="icon-3d-glyph">📥</span>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  حفظ نسخة الأوفلاين و GitHub
                </h3>
                <p className="text-xs sm:text-sm text-emerald-300 font-semibold">
                  ملف HTML واحد مستقل تماماً (بداخله شعارات UOSSM و ICNA والألوان والأصوات بدون إنترنت)
                </p>
              </div>
            </div>

            {/* Option 1: Direct Download + Copy Code */}
            <div className="bg-[#071022]/90 border border-slate-700 rounded-2xl p-4 sm:p-5 mb-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {standaloneBlobUrl && (
                  <a
                    href={standaloneBlobUrl}
                    download="uossm-wheel-offline.html"
                    className="btn-3d-orange px-5 py-3 rounded-2xl text-white font-black text-sm sm:text-base flex items-center gap-2 cursor-pointer"
                  >
                    <span className="icon-3d-glyph text-xl">💾</span>
                    <span>اضغطي هنا لتنزيل الملف (uossm-wheel-offline.html)</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    if (!standaloneHtml) return;
                    navigator.clipboard
                      .writeText(standaloneHtml)
                      .then(() => {
                        setCopySuccess(true);
                        playWinChime();
                      })
                      .catch(() => {
                        const ta = document.getElementById(
                          'offlineHtmlTextarea'
                        ) as HTMLTextAreaElement | null;
                        if (ta) {
                          ta.select();
                          document.execCommand('copy');
                          setCopySuccess(true);
                          playWinChime();
                        }
                      });
                  }}
                  className="btn-3d-slate px-5 py-3 rounded-2xl text-emerald-300 font-black text-sm sm:text-base flex items-center gap-2 cursor-pointer"
                >
                  <span className="icon-3d-glyph text-xl">
                    {copySuccess ? '✅' : '📋'}
                  </span>
                  <span>
                    {copySuccess
                      ? 'تم نسخ الكود بالكامل بنجاح!'
                      : 'نسخ الكود الكامل للملف (Copy HTML)'}
                  </span>
                </button>
              </div>

              {copySuccess && (
                <div className="bg-emerald-950/80 border border-emerald-400/60 rounded-xl p-3 text-xs sm:text-sm text-emerald-200 font-bold">
                  ✅ تم نسخ الكود الكامل! الآن افتحي أي ملف نصي جديد على جهازكِ (أو داخل GitHub) والصقي الكود (`Ctrl + V`) واحفظيه باسم <code className="text-white font-mono">index.html</code>.
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-300 font-bold mb-1.5">
                  أو انسخي الكود مباشرة من المربع التالي (`Ctrl + A` ثم `Ctrl + C`):
                </label>
                <textarea
                  id="offlineHtmlTextarea"
                  readOnly
                  value={standaloneHtml}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  dir="ltr"
                  className="w-full h-28 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-[#EE6B33]"
                />
              </div>
            </div>

            {/* Option 2: Downloading from AI Studio Top Bar */}
            <div className="bg-[#10203B]/90 border border-[#EE6B33]/50 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 space-y-2">
              <h4 className="font-black text-[#FF854D] text-sm sm:text-base flex items-center gap-2">
                <span>💡</span>
                <span>طريقة بديلة مضمونة من أعلى شاشة AI Studio:</span>
              </h4>
              <p className="leading-relaxed">
                اضغطي على أيقونة{' '}
                <strong className="text-white">تنزيل المشروع (Download ZIP)</strong> الموجودة في{' '}
                <strong className="text-amber-300">أعلى يمين شاشة AI Studio الرئيسية</strong>، وعند فك الضغط ستجدين في المجلد الرئيسي ملفاً جاهزاً اسمه{' '}
                <code className="text-emerald-300 font-mono">uossm-wheel-offline.html</code>{' '}
                يعمل أوفلاين 100% بمجرد النقر عليه مرتين!
              </p>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="btn-3d-slate px-6 py-2.5 rounded-xl text-slate-200 font-bold text-sm cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
