import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./motion";

export function useTickDir(n: number | null): 1 | -1 | 0 {
  const prev = useRef<number | null>(n);
  const [dir, setDir] = useState<1 | -1 | 0>(0);
  useEffect(() => {
    const before = prev.current;
    prev.current = n;
    if (n == null || before == null || n === before) return;
    const next = n > before ? 1 : -1;
    setDir(next);
    const id = window.setTimeout(() => setDir(0), 900);
    return () => window.clearTimeout(id);
  }, [n]);
  return dir;
}

export function RollingNumber({ text, dir }: { text: string; dir: 1 | -1 | 0 }) {
  const chars = [...text];
  return (
    <span className="roll">
      {chars.map((ch, i) => (
        <RollChar key={chars.length - 1 - i} ch={ch} dir={dir} />
      ))}
    </span>
  );
}

function RollChar({ ch, dir }: { ch: string; dir: 1 | -1 | 0 }) {
  const reduced = useReducedMotion();
  const [view, setView] = useState({ ch, from: null as string | null, dir: 0 as 1 | -1 | 0, n: 0 });
  if (ch !== view.ch) {
    setView({ ch, from: reduced || !/\d/.test(ch) ? null : view.ch, dir, n: view.n + 1 });
  }
  useEffect(() => {
    if (view.from == null) return;
    const id = window.setTimeout(() => setView((v) => ({ ...v, from: null })), 700);
    return () => window.clearTimeout(id);
  }, [view.n, view.from]);

  if (!/\d/.test(ch)) return <span className="dcol static">{ch}</span>;
  const way = view.dir >= 0 ? "up" : "down";
  return (
    <span className="dcol">
      {view.from != null && <span className={`dout ${way}`}>{view.from}</span>}
      <span className={view.from != null ? `din ${way}` : undefined}>{ch}</span>
    </span>
  );
}
