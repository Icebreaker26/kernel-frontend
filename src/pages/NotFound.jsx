import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';

const COLS = 20;
const ROWS = 16;
const CELL = 20;
const TICK = 120;

const dir = { UP: [0,-1], DOWN: [0,1], LEFT: [-1,0], RIGHT: [1,0] };

const randFood = (snake) => {
  let pos;
  do {
    pos = [Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS)];
  } while (snake.some(([x, y]) => x === pos[0] && y === pos[1]));
  return pos;
};

const initState = () => {
  const snake = [[10, 8], [9, 8], [8, 8]];
  return { snake, dir: dir.RIGHT, next: dir.RIGHT, food: randFood(snake), score: 0, dead: false };
};

const SnakeGame = ({ onClose }) => {
  const canvasRef = useRef(null);
  const stateRef  = useRef(initState());
  const tickRef   = useRef(null);
  const [score, setScore]   = useState(0);
  const [dead, setDead]     = useState(false);
  const [started, setStarted] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { snake, food } = stateRef.current;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    // Grid sutil
    ctx.strokeStyle = '#0d1829';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke();
    }

    // Comida
    const [fx, fy] = food;
    ctx.fillStyle = '#ffb700';
    ctx.shadowColor = '#ffb70099';
    ctx.shadowBlur = 8;
    ctx.fillRect(fx * CELL + 3, fy * CELL + 3, CELL - 6, CELL - 6);
    ctx.shadowBlur = 0;

    // Serpiente
    snake.forEach(([x, y], i) => {
      const t = i / snake.length;
      ctx.fillStyle = i === 0 ? '#00e5ff' : `rgba(0,${Math.round(180 - t * 100)},${Math.round(255 - t * 80)},${1 - t * 0.4})`;
      ctx.shadowColor = i === 0 ? '#00e5ff88' : 'transparent';
      ctx.shadowBlur  = i === 0 ? 10 : 0;
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      ctx.shadowBlur = 0;
    });
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.dead) return;

    const [dx, dy] = s.next;
    const [hx, hy] = s.snake[0];
    const nx = hx + dx;
    const ny = hy + dy;

    // Colisión pared o cuerpo
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || s.snake.some(([x, y]) => x === nx && y === ny)) {
      stateRef.current = { ...s, dead: true };
      setDead(true);
      draw();
      return;
    }

    const ateFord = nx === s.food[0] && ny === s.food[1];
    const newSnake = [[nx, ny], ...s.snake];
    if (!ateFord) newSnake.pop();

    const newScore = ateFord ? s.score + 10 : s.score;
    stateRef.current = {
      ...s,
      snake:  newSnake,
      dir:    s.next,
      food:   ateFord ? randFood(newSnake) : s.food,
      score:  newScore,
    };
    if (ateFord) setScore(newScore);
    draw();
  }, [draw]);

  const restart = () => {
    stateRef.current = initState();
    setScore(0);
    setDead(false);
    setStarted(true);
    draw();
  };

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (!started || dead) {
      clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(tick, TICK);
    return () => clearInterval(tickRef.current);
  }, [started, dead, tick]);

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) {
        e.preventDefault();
      }
      const s = stateRef.current;
      const cur = s.dir;
      const moves = {
        ArrowUp:    dir.UP,    w: dir.UP,
        ArrowDown:  dir.DOWN,  s: dir.DOWN,
        ArrowLeft:  dir.LEFT,  a: dir.LEFT,
        ArrowRight: dir.RIGHT, d: dir.RIGHT,
      };
      const next = moves[e.key];
      if (!next) return;
      // No permitir reversa
      if (next[0] === -cur[0] && next[1] === -cur[1]) return;
      stateRef.current = { ...stateRef.current, next };
      if (!started) { setStarted(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-between w-full" style={{ width: COLS * CELL }}>
        <p className="text-[9px] text-[#6aacbc] tracking-[3px]">// SNAKE · SECTOR 404</p>
        <p className="text-[#ffb700] text-[10px] font-bold font-mono tracking-wider">
          {String(score).padStart(4, '0')}
        </p>
      </div>

      <div className="relative border border-[#00e5ff22]" style={{ boxShadow: '0 0 30px #00e5ff0a' }}>
        <canvas
          ref={canvasRef}
          width={COLS * CELL}
          height={ROWS * CELL}
        />

        {/* Overlay inicial */}
        {!started && !dead && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617cc]">
            <p className="text-[#00e5ff] text-[10px] tracking-[3px] mb-2">PRESIONA ← ↑ → ↓</p>
            <p className="text-[#6aacbc] text-[9px] tracking-wider">O WASD PARA EMPEZAR</p>
          </div>
        )}

        {/* Game over */}
        {dead && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617cc]">
            <p className="text-[#ff3d3d] text-sm font-bold tracking-[4px] mb-1">GAME OVER</p>
            <p className="text-[#6aacbc] text-[9px] tracking-wider mb-4">SCORE: {score}</p>
            <button
              onClick={restart}
              className="text-[9px] border border-[#00e5ff33] text-[#00e5ff] px-4 py-1.5 tracking-[2px] hover:border-[#00e5ff66] hover:bg-[#00e5ff0a] transition-all"
            >
              REINICIAR
            </button>
          </div>
        )}
      </div>

      {/* Controles móvil */}
      <div className="flex flex-col items-center gap-1 mt-1">
        <button
          onPointerDown={() => { const s = stateRef.current; if (s.dir !== dir.DOWN) stateRef.current = { ...s, next: dir.UP }; if (!started) setStarted(true); }}
          className="w-9 h-9 border border-[#00e5ff22] text-[#6aacbc] flex items-center justify-center hover:border-[#00e5ff44] hover:text-[#00e5ff] transition-all text-sm select-none"
        >▲</button>
        <div className="flex gap-1">
          <button
            onPointerDown={() => { const s = stateRef.current; if (s.dir !== dir.RIGHT) stateRef.current = { ...s, next: dir.LEFT }; if (!started) setStarted(true); }}
            className="w-9 h-9 border border-[#00e5ff22] text-[#6aacbc] flex items-center justify-center hover:border-[#00e5ff44] hover:text-[#00e5ff] transition-all text-sm select-none"
          >◄</button>
          <button
            onPointerDown={() => { const s = stateRef.current; if (s.dir !== dir.UP) stateRef.current = { ...s, next: dir.DOWN }; if (!started) setStarted(true); }}
            className="w-9 h-9 border border-[#00e5ff22] text-[#6aacbc] flex items-center justify-center hover:border-[#00e5ff44] hover:text-[#00e5ff] transition-all text-sm select-none"
          >▼</button>
          <button
            onPointerDown={() => { const s = stateRef.current; if (s.dir !== dir.LEFT) stateRef.current = { ...s, next: dir.RIGHT }; if (!started) setStarted(true); }}
            className="w-9 h-9 border border-[#00e5ff22] text-[#6aacbc] flex items-center justify-center hover:border-[#00e5ff44] hover:text-[#00e5ff] transition-all text-sm select-none"
          >►</button>
        </div>
      </div>

      <button
        onClick={onClose}
        className="mt-3 px-6 py-2 border border-[#00e5ff33] text-[#6aacbc] text-xs tracking-[2px] hover:border-[#00e5ff77] hover:text-[#00e5ff] transition-all"
      >
        ← VOLVER
      </button>
    </div>
  );
};

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-mono px-4">
      <p className="text-slate-600 text-6xl font-bold mb-1">404</p>
      <p className="text-slate-500 text-xs tracking-[3px] mb-8">PÁGINA NO ENCONTRADA</p>
      <SnakeGame onClose={() => navigate(-1)} />
    </div>
  );
};

export default NotFound;
