import { useEffect, useRef } from 'react';
import { createRail } from '../snake/rail';

function webgl2Available(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * Rail de gauche (piste et repères de sections) et serpent.
 * - avec WebGL 2 : le serpent 3D se promène sur toute la page, derrière le contenu ;
 *   le serpent vectoriel n'est jamais affiché, pour éviter qu'il apparaisse avant le 3D ;
 * - sans WebGL 2, ou si le modèle ne charge pas : serpent vectoriel dans le rail.
 */
export function Rail() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const use3D = webgl2Available();
    const rail = createRail(el, { vector: !use3D });
    let disposed = false;
    let destroy3D: (() => void) | undefined;

    async function start3D() {
      try {
        const { createSnake3D } = await import('../snake/snake3d');
        if (disposed) return;
        const snake = await createSnake3D(document.body);
        if (disposed) snake.destroy();
        else destroy3D = snake.destroy;
      } catch (err) {
        console.warn('Serpent 3D indisponible', err);
        if (!disposed) rail.setVectorVisible(true);
      }
    }
    if (use3D) void start3D();

    return () => {
      disposed = true;
      destroy3D?.();
      rail.destroy();
    };
  }, []);

  return <div ref={ref} id="rail" aria-hidden="true" className="relative" />;
}
