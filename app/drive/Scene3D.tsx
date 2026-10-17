"use client";

import { useEffect, useRef } from "react";
import type { DriveFrame, DriveSession } from "../../src/drive/session";
import { createScene, type Scene } from "./scene";

/**
 * The 3D view of a run.
 *
 * It renders what the simulation already computed and feeds nothing back, so
 * the physics is identical whether this is on screen or not. The two
 * translucent cars are the pessimistic and optimistic builds: the gap that
 * opens between them is the uncertainty in the parts data, which until now
 * was only a number on a panel.
 */
export default function Scene3D({
  subscribe,
  className,
}: {
  /**
   * Hands us a callback to run every frame and returns an unsubscribe. The
   * drive loop owns the clock; we never start one of our own, so the scene
   * cannot drift from the physics or double up the work.
   */
  subscribe: (fn: (frame: DriveFrame, session: DriveSession) => void) => () => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const lastTRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const w = wrap.clientWidth || 640;
    const h = wrap.clientHeight || 320;

    let scene: Scene;
    try {
      scene = createScene(canvas, w, h);
    } catch {
      // No WebGL, or a context the browser refused. The rest of drive mode
      // works without this, so fail quietly rather than taking the page down.
      return;
    }
    sceneRef.current = scene;

    // Draw one frame immediately so the view is not black before the first
    // time anybody presses a key.
    scene.render({ expected: 0, pessimistic: 0, optimistic: 0 }, 0, 0);

    const onResize = () => {
      const nw = wrap.clientWidth;
      const nh = wrap.clientHeight;
      if (nw > 0 && nh > 0) scene.resize(nw, nh);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(wrap);

    const unsubscribe = subscribe((frame, session) => {
      const dt = Math.max(0, Math.min(frame.elapsedS - lastTRef.current, 0.25));
      lastTRef.current = frame.elapsedS;
      scene.render(
        {
          expected: session.states.expected.x,
          pessimistic: session.states.pessimistic.x,
          optimistic: session.states.optimistic.x,
        },
        session.states.expected.v,
        dt,
      );
    });

    return () => {
      unsubscribe();
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
      lastTRef.current = 0;
    };
  }, [subscribe]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: "relative" }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
