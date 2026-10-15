// Pong · Criado por FlowCore Soluções LTDA · flowcoresolucoes.com.br/codigos · licença MIT
// Tênis de mesa neon contra a CPU: rebata, mude o ângulo pela parte da raquete e vença.
// Controles: W/S ou ↑/↓ movem a raquete · arraste o mouse ou o dedo sobre a quadra
// · Espaço começa · P pausa · no celular, segure os botões ↑ e ↓.
// Props:
//   tema?: "claro" | "escuro"   tema inicial (padrão "claro"); o botão sol/lua do HUD alterna
//   onTemaChange?: (tema) => void   avisa quando o jogador troca o tema
//   accent?: string             cor de destaque (padrão "#0057FF")
//   variacao?: "Clássico" | "Turbo" | "Caos"   preset inicial
//   dificuldade?: "facil" | "medio" | "dificil"   reflexo, velocidade e erro da CPU (padrão "medio")
//   pontosVitoria?: number      pontos para vencer a partida (padrão 7)
//   velocidade?: number         velocidade inicial da bola em px/s virtuais (padrão 420)
//   aceleracao?: number         px/s somados à bola a cada rebatida
//   bolasExtras?: boolean       duas bolas em jogo ao mesmo tempo
//   tamanhoRaquete?: number     altura da raquete numa quadra de 800 x 500 (padrão 96)
// O seletor "Variações" troca o preset ao vivo. Vitórias salvas no localStorage.
// Requisitos: React 18+ e Tailwind CSS 3+. Zero dependências.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

/* ----------------------------- lógica pura ----------------------------- */

/**
 * Ângulo de saída da bola (radianos) conforme o ponto de contato na raquete.
 * 0 = reto; ±maxAngulo nas pontas. yRaquete é o centro da raquete.
 */
export function refletirRaquete(yBola: number, yRaquete: number, alturaRaquete: number, maxAngulo = Math.PI / 4): number {
  const meia = alturaRaquete / 2 || 1;
  const rel = Math.max(-1, Math.min(1, (yBola - yRaquete) / meia));
  return rel * maxAngulo;
}

/* ------------------------------ variações ------------------------------ */

type NomeVariacao = "Clássico" | "Turbo" | "Caos";
type Dificuldade = "facil" | "medio" | "dificil";
type Config = { velocidade: number; aceleracao: number; bolasExtras: boolean; tamanhoRaquete: number };

const VARIACOES: Record<NomeVariacao, Config> = {
  Clássico: { velocidade: 420, aceleracao: 22, bolasExtras: false, tamanhoRaquete: 96 },
  Turbo: { velocidade: 600, aceleracao: 34, bolasExtras: false, tamanhoRaquete: 86 },
  Caos: { velocidade: 470, aceleracao: 26, bolasExtras: true, tamanhoRaquete: 84 },
};

const CPU: Record<Dificuldade, { rotulo: string; reacao: number; vel: number; erro: number; preve: boolean }> = {
  facil: { rotulo: "Fácil", reacao: 0.24, vel: 270, erro: 46, preve: false },
  medio: { rotulo: "Médio", reacao: 0.12, vel: 400, erro: 24, preve: true },
  dificil: { rotulo: "Difícil", reacao: 0.05, vel: 580, erro: 9, preve: true },
};

/* --------------------------------- tema --------------------------------- */

export type Tema = "claro" | "escuro";
// Paleta do tema: vira CSS vars na raiz (classes) e é lida pelo canvas.
const TEMAS: Record<Tema, Record<string, string>> = {
  claro: {
    "--fc-bg": "#F7F8FB", "--fc-surface": "#FFFFFF", "--fc-surface-2": "#F1F4F9",
    "--fc-border": "#E3E8F0", "--fc-border-strong": "#CBD3E1",
    "--fc-text": "#0B1220", "--fc-muted": "#4B5565", "--fc-subtle": "#8A94A6",
    "--fc-pos": "#059669", "--fc-neg": "#E11D48", "--fc-warn": "#D97706",
    "--fc-shadow": "0 1px 2px rgba(16,24,40,.06), 0 12px 32px -16px rgba(16,24,40,.18)",
  },
  escuro: {
    "--fc-bg": "#0B0F17", "--fc-surface": "rgba(255,255,255,0.03)", "--fc-surface-2": "rgba(255,255,255,0.06)",
    "--fc-border": "rgba(255,255,255,0.10)", "--fc-border-strong": "rgba(255,255,255,0.25)",
    "--fc-text": "#FFFFFF", "--fc-muted": "rgba(255,255,255,0.60)", "--fc-subtle": "rgba(255,255,255,0.40)",
    "--fc-pos": "#34D399", "--fc-neg": "#FB7185", "--fc-warn": "#FBBF24",
    "--fc-shadow": "0 24px 48px -24px rgba(0,0,0,.6)",
  },
};

function BotaoTema({ tema, onClick }: { tema: Tema; onClick: () => void }) {
  const escuro = tema === "escuro";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-muted)] transition-colors hover:border-[var(--fc-border-strong)] hover:text-[var(--fc-text)]"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        {escuro ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
        )}
      </svg>
    </button>
  );
}

type Props = {
  tema?: Tema;
  onTemaChange?: (tema: Tema) => void;
  accent?: string;
  variacao?: NomeVariacao;
  dificuldade?: Dificuldade;
  pontosVitoria?: number;
  velocidade?: number;
  aceleracao?: number;
  bolasExtras?: boolean;
  tamanhoRaquete?: number;
};

type Status = "inicio" | "jogando" | "pausado" | "fim";

type Bola = { x: number; y: number; vx: number; vy: number; vel: number; espera: number; rastro: { x: number; y: number }[] };
type Faisca = { x: number; y: number; vx: number; vy: number; vida: number; cor: string };

type Estado = {
  jogador: number;
  jogadorV: number;
  cpu: number;
  cpuAlvo: number;
  cpuTimer: number;
  cpuErro: number;
  bolas: Bola[];
  faiscas: Faisca[];
  voce: number;
  maquina: number;
  acc: number;
  cima: boolean;
  baixo: boolean;
  ponteiro: number | null;
  flash: number;
  tremor: number;
};

const W = 800;
const H = 500;
const RAQ_W = 12;
const RAQ_X_J = 26;
const RAQ_X_C = W - 26 - RAQ_W;
const RAIO = 8;
const VEL_JOGADOR = 560;
const VEL_MAX_BOLA = 1150;
const PASSO = 1 / 120;
const COR_CPU = "#FF4D8D";

// Paleta de desenho do canvas por tema. Escuro = visual original (neon);
// claro = quadra off-white, linhas em cinza-azulado e sombras suaves.
type CoresCanvas = {
  quadra: string; luzCentro: string; luzBorda: string; contorno: string; linha: string; placar: string;
  cpu: string; brilhoRaquete: string; bola: string; neon: boolean; sombraSuave: string;
};
const CORES = {
  escuro: {
    quadra: "#0E1420", luzCentro: "rgba(255,255,255,0.04)", luzBorda: "rgba(0,0,0,0)",
    contorno: "rgba(255,255,255,0.08)", linha: "rgba(255,255,255,0.18)", placar: "rgba(255,255,255,0.10)",
    cpu: COR_CPU, brilhoRaquete: "rgba(255,255,255,0.45)", bola: "#fff", neon: true, sombraSuave: "",
  },
  claro: {
    quadra: "#EEF2F8", luzCentro: "rgba(255,255,255,0.95)", luzBorda: "rgba(255,255,255,0)",
    contorno: "rgba(15,23,42,0.10)", linha: "rgba(15,23,42,0.16)", placar: "rgba(15,23,42,0.08)",
    cpu: "#DB2777", brilhoRaquete: "rgba(255,255,255,0.5)", bola: "#0B1220", neon: false, sombraSuave: "rgba(15,23,42,0.25)",
  },
} satisfies Record<Tema, CoresCanvas>;

const CHAVE = "flowcore-pong-recorde";
const LINK = "https://flowcoresolucoes.com.br/codigos";

function lerRecorde(): number {
  try {
    return Number(localStorage.getItem(CHAVE)) || 0;
  } catch {
    return 0;
  }
}

function salvarRecorde(v: number) {
  try {
    localStorage.setItem(CHAVE, String(v));
  } catch {
    /* localStorage indisponível (modo privado, iframe sandbox) */
  }
}

function novaBola(cfg: Config, dir: 1 | -1, espera: number, yOff = 0): Bola {
  const a = (Math.random() * 2 - 1) * (Math.PI / 7);
  return {
    x: W / 2,
    y: H / 2 + yOff,
    vx: Math.cos(a) * cfg.velocidade * dir,
    vy: Math.sin(a) * cfg.velocidade,
    vel: cfg.velocidade,
    espera,
    rastro: [],
  };
}

function novoEstado(cfg: Config): Estado {
  const bolas = [novaBola(cfg, Math.random() < 0.5 ? 1 : -1, 0.9)];
  if (cfg.bolasExtras) bolas.push(novaBola(cfg, bolas[0].vx > 0 ? -1 : 1, 1.6, 60));
  return {
    jogador: H / 2,
    jogadorV: 0,
    cpu: H / 2,
    cpuAlvo: H / 2,
    cpuTimer: 0,
    cpuErro: 0,
    bolas,
    faiscas: [],
    voce: 0,
    maquina: 0,
    acc: 0,
    cima: false,
    baixo: false,
    ponteiro: null,
    flash: 0,
    tremor: 0,
  };
}

/** Onde a bola cruza a coluna x, rebatendo nas paredes (previsão da CPU). */
function preverY(b: Bola, xAlvo: number): number {
  if (b.vx <= 0) return H / 2;
  const t = (xAlvo - b.x) / b.vx;
  let y = b.y + b.vy * t;
  const min = RAIO;
  const faixa = H - 2 * RAIO;
  y -= min;
  const p = ((y % (2 * faixa)) + 2 * faixa) % (2 * faixa);
  return min + (p > faixa ? 2 * faixa - p : p);
}

function soltarFaiscas(e: Estado, x: number, y: number, cor: string, dir: number) {
  for (let i = 0; i < 12; i++) {
    const a = (Math.random() - 0.5) * Math.PI * 0.9;
    const v = 120 + Math.random() * 260;
    e.faiscas.push({ x, y, vx: Math.cos(a) * v * dir, vy: Math.sin(a) * v, vida: 0.35 + Math.random() * 0.3, cor });
  }
  if (e.faiscas.length > 160) e.faiscas.splice(0, e.faiscas.length - 160);
}

/* ------------------------------ componente ----------------------------- */

/* ------------------------------ como jogar ------------------------------ */

// Teclas mostradas na tela inicial e na pausa ("ou" vira separador).
const TECLAS: [string[], string][] = [
  [["W", "S", "ou", "↑", "↓"], "mover a raquete"],
  [["Mouse"], "arraste na quadra"],
  [["Espaço"], "começar"],
  [["P"], "pausar"],
];
// Versão de toque, mostrada no celular (abaixo do jogo, onde sempre cabe).
const TOQUE = [
  "Segure ▲ e ▼ abaixo do jogo",
  "ou arraste o dedo sobre a quadra",
];
const RESUMO_TECLADO = "W/S ou ↑/↓ movem · arraste o mouse na quadra · P pausa";
const RESUMO_TOQUE = "Botões abaixo do jogo ou arraste na quadra";

function ComoJogar({ className = "" }: { className?: string }) {
  return (
    <div className={`w-fit max-w-full text-xs text-[var(--fc-muted)] ${className}`}>
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fc-subtle)]">Como jogar</p>
      <div className="hidden grid-cols-[auto_auto] items-center gap-x-3 gap-y-1.5 sm:grid">
        {TECLAS.map(([teclas, acao]) => (
          <div key={acao} className="contents">
            <span className="flex flex-wrap items-center justify-end gap-1">
              {teclas.map((t, i) =>
                t === "ou" ? (
                  <span key={i} className="text-[10px] text-[var(--fc-subtle)]">
                    ou
                  </span>
                ) : (
                  <kbd key={i} className="rounded-md border border-[var(--fc-border)] bg-[var(--fc-surface-2)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--fc-text)]">
                    {t}
                  </kbd>
                ),
              )}
            </span>
            <span className="text-left">{acao}</span>
          </div>
        ))}
      </div>
      <ul className="space-y-1 text-center sm:hidden">
        {TOQUE.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Pong({
  accent = "#0057FF",
  tema = "claro",
  onTemaChange,
  variacao = "Clássico",
  dificuldade = "medio",
  pontosVitoria = 7,
  velocidade,
  aceleracao,
  bolasExtras,
  tamanhoRaquete,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [temaAtual, setTemaAtual] = useState<Tema>(tema);
  useEffect(() => setTemaAtual(tema), [tema]);
  const temaRef = useRef<Tema>(tema);
  temaRef.current = temaAtual;
  const alternarTema = () => {
    const novo: Tema = temaAtual === "claro" ? "escuro" : "claro";
    setTemaAtual(novo);
    onTemaChange?.(novo);
    rootRef.current?.focus();
  };
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const inicial: Config = {
    ...VARIACOES[variacao],
    ...(velocidade !== undefined && { velocidade }),
    ...(aceleracao !== undefined && { aceleracao }),
    ...(bolasExtras !== undefined && { bolasExtras }),
    ...(tamanhoRaquete !== undefined && { tamanhoRaquete }),
  };
  const meta = Math.max(1, Math.floor(pontosVitoria));

  const [nomeVar, setNomeVar] = useState<NomeVariacao>(variacao);
  const [dif, setDif] = useState<Dificuldade>(dificuldade);
  const [status, setStatus] = useState<Status>("inicio");
  const [placar, setPlacar] = useState({ voce: 0, cpu: 0 });
  const [recorde, setRecorde] = useState(0);
  const [largura, setLargura] = useState(800);

  const cfgRef = useRef<Config>(inicial);
  const difRef = useRef<Dificuldade>(dificuldade);
  const metaRef = useRef(meta);
  const statusRef = useRef<Status>("inicio");
  const estRef = useRef<Estado>(novoEstado(inicial));
  const accentRef = useRef(accent);
  const visivelRef = useRef(true);

  accentRef.current = accent;
  metaRef.current = meta;

  useEffect(() => setRecorde(lerRecorde()), []);

  const mudarStatus = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  // Largura disponível -> tamanho da quadra.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setLargura(w);
    });
    ro.observe(el);
    if (el.clientWidth) setLargura(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const cssW = Math.max(240, Math.floor(Math.min(largura, 880)));
  const cssH = Math.round((cssW * H) / W);

  // Pausa quando sai da tela.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      visivelRef.current = e.isIntersecting;
      if (!e.isIntersecting && statusRef.current === "jogando") mudarStatus("pausado");
    });
    io.observe(el);
    return () => io.disconnect();
  }, [mudarStatus]);

  const iniciar = useCallback(() => {
    estRef.current = novoEstado(cfgRef.current);
    setPlacar({ voce: 0, cpu: 0 });
    mudarStatus("jogando");
    rootRef.current?.focus();
  }, [mudarStatus]);

  const terminar = useCallback(() => {
    const e = estRef.current;
    mudarStatus("fim");
    if (e.voce > e.maquina) {
      setRecorde((r) => {
        salvarRecorde(r + 1);
        return r + 1;
      });
    }
  }, [mudarStatus]);

  // Um passo fixo da simulação. Retorna true se alguém marcou ponto.
  const passo = useCallback((dt: number): boolean => {
    const e = estRef.current;
    const cfg = cfgRef.current;
    const ia = CPU[difRef.current];
    const meiaR = cfg.tamanhoRaquete / 2;

    // Jogador: teclas ou ponteiro.
    const antes = e.jogador;
    if (e.ponteiro !== null) {
      const d = e.ponteiro - e.jogador;
      const max = 1600 * dt;
      e.jogador += Math.max(-max, Math.min(max, d));
    } else {
      const dir = (e.baixo ? 1 : 0) - (e.cima ? 1 : 0);
      e.jogador += dir * VEL_JOGADOR * dt;
    }
    e.jogador = Math.max(meiaR, Math.min(H - meiaR, e.jogador));
    e.jogadorV = (e.jogador - antes) / dt;

    // CPU: escolhe alvo a cada "reflexo", com erro.
    e.cpuTimer -= dt;
    if (e.cpuTimer <= 0) {
      e.cpuTimer = ia.reacao;
      const vindo = e.bolas.filter((b) => b.espera <= 0 && b.vx > 0);
      if (vindo.length) {
        const b = vindo.reduce((m, o) => (RAQ_X_C - o.x) / o.vx < (RAQ_X_C - m.x) / m.vx ? o : m);
        e.cpuAlvo = (ia.preve ? preverY(b, RAQ_X_C) : b.y) + e.cpuErro;
      } else {
        e.cpuAlvo = H / 2 + (e.bolas[0] ? (e.bolas[0].y - H / 2) * 0.3 : 0);
      }
    }
    const dc = e.cpuAlvo - e.cpu;
    const maxC = ia.vel * dt;
    if (Math.abs(dc) > 4) e.cpu += Math.max(-maxC, Math.min(maxC, dc));
    e.cpu = Math.max(meiaR, Math.min(H - meiaR, e.cpu));

    let marcou = false;
    for (let i = 0; i < e.bolas.length; i++) {
      const b = e.bolas[i];
      if (b.espera > 0) {
        b.espera -= dt;
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < RAIO) {
        b.y = RAIO;
        b.vy = Math.abs(b.vy);
      } else if (b.y > H - RAIO) {
        b.y = H - RAIO;
        b.vy = -Math.abs(b.vy);
      }

      // Raquete do jogador (esquerda)
      if (
        b.vx < 0 &&
        b.x - RAIO <= RAQ_X_J + RAQ_W &&
        b.x + RAIO >= RAQ_X_J &&
        Math.abs(b.y - e.jogador) <= meiaR + RAIO
      ) {
        b.vel = Math.min(VEL_MAX_BOLA, b.vel + cfg.aceleracao);
        const a = refletirRaquete(b.y, e.jogador, cfg.tamanhoRaquete);
        b.x = RAQ_X_J + RAQ_W + RAIO;
        b.vx = Math.cos(a) * b.vel;
        b.vy = Math.sin(a) * b.vel + e.jogadorV * 0.12;
        soltarFaiscas(e, b.x, b.y, accentRef.current, 1);
        e.flash = 0.6;
        // Novo erro da CPU a cada rebatida do jogador.
        e.cpuErro = (Math.random() * 2 - 1) * ia.erro * (1 + b.vel / 900);
        e.cpuTimer = Math.min(e.cpuTimer, ia.reacao);
      }
      // Raquete da CPU (direita)
      if (b.vx > 0 && b.x + RAIO >= RAQ_X_C && b.x - RAIO <= RAQ_X_C + RAQ_W && Math.abs(b.y - e.cpu) <= meiaR + RAIO) {
        b.vel = Math.min(VEL_MAX_BOLA, b.vel + cfg.aceleracao);
        const a = refletirRaquete(b.y, e.cpu, cfg.tamanhoRaquete);
        b.x = RAQ_X_C - RAIO;
        b.vx = -Math.cos(a) * b.vel;
        b.vy = Math.sin(a) * b.vel;
        soltarFaiscas(e, b.x, b.y, CORES[temaRef.current].cpu, -1);
      }

      b.rastro.push({ x: b.x, y: b.y });
      if (b.rastro.length > 14) b.rastro.shift();

      // Ponto
      if (b.x < -RAIO * 2 || b.x > W + RAIO * 2) {
        const jogadorFez = b.x > W;
        if (jogadorFez) e.voce++;
        else e.maquina++;
        e.tremor = 1;
        // Saca na direção de quem sofreu o ponto.
        e.bolas[i] = novaBola(cfg, jogadorFez ? 1 : -1, 0.9, i === 0 ? 0 : 60);
        marcou = true;
      }
    }

    for (const f of e.faiscas) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= 0.96;
      f.vy *= 0.96;
      f.vida -= dt;
    }
    e.faiscas = e.faiscas.filter((f) => f.vida > 0);
    return marcou;
  }, []);

  // Loop com passo fixo + desenho.
  useEffect(() => {
    let raf = 0;
    let ultimo = performance.now();
    const loop = (agora: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, Math.max(0, (agora - ultimo) / 1000));
      ultimo = agora;
      const e = estRef.current;
      if (statusRef.current === "jogando") {
        e.acc += dt;
        while (e.acc >= PASSO && statusRef.current === "jogando") {
          e.acc -= PASSO;
          if (passo(PASSO)) {
            setPlacar({ voce: e.voce, cpu: e.maquina });
            if (e.voce >= metaRef.current || e.maquina >= metaRef.current) terminar();
          }
        }
      }
      e.flash = Math.max(0, e.flash - dt * 3);
      e.tremor = Math.max(0, e.tremor - dt * 3);
      if (visivelRef.current) desenhar(agora / 1000);
    };
    const desenhar = (t: number) => {
      const cv = canvasRef.current;
      const ctx = cv?.getContext("2d");
      if (!cv || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth || cssW;
      const h = cv.clientHeight || cssH;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      const esc = w / W;
      const e = estRef.current;
      const ac = accentRef.current;
      const cfg = cfgRef.current;
      const c = CORES[temaRef.current];
      const sombra = (cor: string, blur: number) => {
        if (c.neon) {
          ctx.shadowColor = cor;
          ctx.shadowBlur = blur;
        } else {
          ctx.shadowColor = c.sombraSuave;
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 3;
        }
      };
      const tx = e.tremor > 0 ? Math.sin(t * 80) * e.tremor * 5 : 0;
      ctx.setTransform(dpr * esc, 0, 0, dpr * esc, tx * dpr * esc, 0);

      // Quadra
      ctx.fillStyle = c.quadra;
      ctx.fillRect(-10, 0, W + 20, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.6);
      g.addColorStop(0, c.luzCentro);
      g.addColorStop(1, c.luzBorda);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = c.contorno;
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, W - 8, H - 8);
      // Linha central tracejada
      ctx.save();
      ctx.strokeStyle = c.linha;
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 14]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 12);
      ctx.lineTo(W / 2, H - 12);
      ctx.stroke();
      ctx.restore();

      // Placar grande
      ctx.save();
      ctx.font = "700 110px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = c.placar;
      ctx.fillText(String(e.voce), W * 0.27, 28);
      ctx.fillText(String(e.maquina), W * 0.73, 28);
      ctx.restore();

      // Raquetes com brilho
      const raquete = (x: number, cy: number, cor: string, extra: number) => {
        ctx.save();
        sombra(cor, 18 + extra * 20);
        ctx.fillStyle = cor;
        retangulo(ctx, x, cy - cfg.tamanhoRaquete / 2, RAQ_W, cfg.tamanhoRaquete, 6);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = c.brilhoRaquete;
        retangulo(ctx, x + 3, cy - cfg.tamanhoRaquete / 2 + 4, 3, cfg.tamanhoRaquete - 8, 2);
        ctx.fill();
      };
      raquete(RAQ_X_J, e.jogador, ac, e.flash);
      raquete(RAQ_X_C, e.cpu, c.cpu, 0);

      // Faíscas
      for (const f of e.faiscas) {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.vida * 2.5));
        ctx.fillStyle = f.cor;
        ctx.fillRect(f.x - 2, f.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      // Bolas com rastro
      for (const b of e.bolas) {
        if (b.espera > 0) {
          // Pisca no centro antes do saque.
          ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 14);
          ctx.fillStyle = c.bola;
          ctx.beginPath();
          ctx.arc(b.x, b.y, RAIO, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          continue;
        }
        const n = b.rastro.length;
        b.rastro.forEach((p, i) => {
          const k = (i + 1) / n;
          ctx.globalAlpha = k * 0.35;
          ctx.fillStyle = ac;
          ctx.beginPath();
          ctx.arc(p.x, p.y, RAIO * (0.35 + k * 0.6), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.save();
        sombra(ac, 22);
        ctx.fillStyle = c.bola;
        ctx.beginPath();
        ctx.arc(b.x, b.y, RAIO, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cssW, cssH, passo, terminar]);

  const trocarVariacao = (n: NomeVariacao) => {
    setNomeVar(n);
    cfgRef.current = VARIACOES[n];
    estRef.current = novoEstado(VARIACOES[n]);
    setPlacar({ voce: 0, cpu: 0 });
    mudarStatus("inicio");
    rootRef.current?.focus();
  };

  const trocarDificuldade = (d: Dificuldade) => {
    setDif(d);
    difRef.current = d;
    rootRef.current?.focus();
  };

  const alternarPausa = () => {
    const s = statusRef.current;
    if (s === "jogando") mudarStatus("pausado");
    else if (s === "pausado") mudarStatus("jogando");
    else iniciar();
  };

  const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    const k = ev.key;
    if (k.startsWith("Arrow") || k === " ") ev.preventDefault();
    const s = statusRef.current;
    if (k === " " || k === "Enter") {
      if (s === "inicio" || s === "fim") iniciar();
      else if (s === "pausado") mudarStatus("jogando");
      return;
    }
    if (k === "p" || k === "P") {
      if (s === "jogando") mudarStatus("pausado");
      else if (s === "pausado") mudarStatus("jogando");
      return;
    }
    const e = estRef.current;
    if (k === "ArrowUp" || k === "w" || k === "W") {
      e.cima = true;
      e.ponteiro = null;
    } else if (k === "ArrowDown" || k === "s" || k === "S") {
      e.baixo = true;
      e.ponteiro = null;
    }
  };

  const onKeyUp = (ev: KeyboardEvent<HTMLDivElement>) => {
    const k = ev.key;
    const e = estRef.current;
    if (k === "ArrowUp" || k === "w" || k === "W") e.cima = false;
    else if (k === "ArrowDown" || k === "s" || k === "S") e.baixo = false;
  };

  const onBlur = (ev: FocusEvent<HTMLDivElement>) => {
    if (rootRef.current?.contains(ev.relatedTarget as Node)) return;
    const e = estRef.current;
    e.cima = e.baixo = false;
    e.ponteiro = null;
    if (statusRef.current === "jogando") mudarStatus("pausado");
  };

  // Arrastar sobre a quadra posiciona a raquete.
  const yVirtual = (ev: PointerEvent<HTMLCanvasElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const alt = r.height || cssH;
    return ((ev.clientY - r.top) / alt) * H;
  };
  const onPonteiroInicio = (ev: PointerEvent<HTMLCanvasElement>) => {
    if (statusRef.current !== "jogando") return;
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId);
    } catch {
      /* captura indisponível */
    }
    estRef.current.ponteiro = yVirtual(ev);
  };
  const onPonteiroMove = (ev: PointerEvent<HTMLCanvasElement>) => {
    if (estRef.current.ponteiro === null || statusRef.current !== "jogando") return;
    estRef.current.ponteiro = yVirtual(ev);
  };
  const onPonteiroFim = () => {
    estRef.current.ponteiro = null;
  };

  const botaoSegurar = (sentido: "cima" | "baixo") => {
    const set = (v: boolean) => {
      const e = estRef.current;
      e.ponteiro = null;
      if (sentido === "cima") e.cima = v;
      else e.baixo = v;
    };
    return (
      <button
        type="button"
        aria-label={sentido === "cima" ? "Subir" : "Descer"}
        onPointerDown={(ev) => {
          ev.preventDefault();
          const s = statusRef.current;
          if (s === "inicio" || s === "fim") iniciar();
          if (statusRef.current === "jogando") set(true);
        }}
        onPointerUp={(ev) => {
          ev.preventDefault();
          set(false);
        }}
        onPointerLeave={() => set(false)}
        onPointerCancel={() => set(false)}
        className="flex h-14 flex-1 touch-none select-none items-center justify-center rounded-2xl border border-[var(--fc-border)] bg-[var(--fc-surface-2)] text-[var(--fc-text)] active:bg-[var(--fc-border)]"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
          <path d={sentido === "cima" ? "M12 6l7 9H5z" : "M12 18L5 9h14z"} />
        </svg>
      </button>
    );
  };

  const venceu = placar.voce > placar.cpu;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={onBlur}
      style={{ ...TEMAS[temaAtual], "--accent": accent } as CSSProperties}
      className="relative mx-auto w-full max-w-5xl select-none overflow-hidden rounded-3xl border border-[var(--fc-border)] bg-[var(--fc-bg)] p-3 shadow-[var(--fc-shadow)] text-[var(--fc-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:p-5"
    >
      {/* HUD */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
          <span className="text-sm font-semibold tracking-tight">Pong</span>
          <BotaoTema tema={temaAtual} onClick={alternarTema} />
        </div>
        <div className="flex gap-4 text-xs text-[var(--fc-muted)]">
          <span>
            Você <b className="mx-1 font-semibold tabular-nums text-[var(--fc-text)]">{placar.voce}</b>x
            <b className="ml-1 font-semibold tabular-nums text-[var(--fc-text)]">{placar.cpu}</b> CPU
          </span>
          <span>
            Vitórias <b className="ml-1 font-semibold tabular-nums text-[var(--fc-text)]">{recorde}</b>
          </span>
          <span>
            Nível <b className="ml-1 font-semibold text-[var(--fc-text)]">{CPU[dif].rotulo}</b>
          </span>
        </div>
      </div>

      {/* Variações */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-[var(--fc-subtle)]">Variações</span>
        {(Object.keys(VARIACOES) as NomeVariacao[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => trocarVariacao(n)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              nomeVar === n
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-muted)] hover:border-[var(--fc-border-strong)] hover:text-[var(--fc-text)]"
            }`}
          >
            {n}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 text-[11px] uppercase tracking-wider text-[var(--fc-subtle)]">CPU</span>
          {(Object.keys(CPU) as Dificuldade[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => trocarDificuldade(d)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                dif === d
                  ? "border-[var(--accent)] text-[var(--fc-text)]"
                  : "border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-muted)] hover:border-[var(--fc-border-strong)] hover:text-[var(--fc-text)]"
              }`}
            >
              {CPU[d].rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* Quadra */}
      <div ref={areaRef} className="flex w-full justify-center">
        <div className="relative" style={{ width: cssW, height: cssH }}>
          <canvas
            ref={canvasRef}
            onPointerDown={onPonteiroInicio}
            onPointerMove={onPonteiroMove}
            onPointerUp={onPonteiroFim}
            onPointerCancel={onPonteiroFim}
            className="block h-full w-full touch-none rounded-2xl"
            style={{ width: cssW, height: cssH, boxShadow: temaAtual === "escuro" ? `0 0 40px -16px ${accent}` : "var(--fc-shadow)" }}
          />
          {status !== "jogando" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--fc-bg)_75%,transparent)] text-center backdrop-blur-[2px]">
              {status === "fim" && (
                <>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--fc-subtle)]">Fim de partida</p>
                  <p className="text-2xl font-semibold">{venceu ? "Você venceu!" : "A CPU venceu"}</p>
                  <p className="text-4xl font-semibold tabular-nums">
                    {placar.voce} <span className="text-[var(--fc-subtle)]">x</span> {placar.cpu}
                  </p>
                  <p className="text-xs text-[var(--fc-muted)]">
                    Vitórias <span className="tabular-nums text-[var(--fc-text)]">{recorde}</span>
                  </p>
                </>
              )}
              {status === "pausado" && <p className="text-lg font-semibold">Pausado</p>}
              {status === "inicio" && (
                <>
                  <p className="text-lg font-semibold">Pong</p>
                  <p className="text-xs text-[var(--fc-muted)]">Quem fizer {meta} pontos primeiro vence</p>
                </>
              )}
              <button
                type="button"
                onClick={() => (status === "pausado" ? (mudarStatus("jogando"), rootRef.current?.focus()) : iniciar())}
                className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_32px_-8px_var(--accent)] transition hover:brightness-110"
              >
                {status === "fim" ? "Jogar de novo" : status === "pausado" ? "Continuar" : "Clique para jogar"}
              </button>
              {status === "inicio" || status === "pausado" ? (
                <ComoJogar className="hidden sm:block" />
              ) : (
                <p className="hidden text-[11px] text-[var(--fc-subtle)] sm:block">Clique ou aperte Espaço · P pausa</p>
              )}
              <p className="text-[11px] text-[var(--fc-muted)] sm:hidden">{RESUMO_TOQUE}</p>
              <a href={LINK} target="_blank" rel="noopener" className="text-[10px] text-[var(--fc-subtle)] hover:text-[var(--fc-muted)]">
                Criado por FlowCore Soluções LTDA
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Controles de toque */}
      <div className="mt-4 flex gap-2 sm:hidden">
        {botaoSegurar("cima")}
        <button
          type="button"
          aria-label="Pausar"
          onPointerDown={(ev) => {
            ev.preventDefault();
            alternarPausa();
          }}
          className="flex h-14 w-14 touch-none items-center justify-center rounded-2xl border border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-muted)]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d={status === "jogando" ? "M7 5h3v14H7zM14 5h3v14h-3z" : "M8 5l11 7-11 7z"} />
          </svg>
        </button>
        {botaoSegurar("baixo")}
      </div>

      {/* Como jogar no celular: fica fora do canvas, que é pequeno na tela estreita */}
      {status !== "jogando" && <ComoJogar className="mx-auto mt-4 rounded-2xl border border-[var(--fc-border)] bg-[var(--fc-surface)] px-4 py-3 sm:hidden" />}

      {/* Rodapé com assinatura */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[var(--fc-border)] pt-3 text-center sm:justify-between sm:text-left">
        <span className="hidden text-[11px] text-[var(--fc-muted)] sm:inline">{RESUMO_TECLADO}</span>
        <span className="text-[11px] text-[var(--fc-muted)] sm:hidden">{RESUMO_TOQUE}</span>
        <a href={LINK} target="_blank" rel="noopener" className="text-[11px] text-[var(--fc-subtle)] transition-colors hover:text-[var(--fc-muted)]">
          Criado por FlowCore Soluções LTDA
        </a>
      </div>
    </div>
  );
}

function retangulo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
