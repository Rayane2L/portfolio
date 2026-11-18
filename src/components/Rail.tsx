import { useEffect, useRef } from 'react';
import { createRail } from '../snake/rail';

/**
 * Conteneur du rail de gauche. Le rendu est entièrement impératif (SVG + WebGL) :
 * le composant ne fait que monter et démonter le moteur.
 * - partout : piste, repères de sections et serpent vectoriel ;
 * - écrans larges avec WebGL 2 : le serpent 3D (Blender) remplace le vectoriel une fois chargé.
 */
export function Rail() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rail = createRail(el);
    let disposed = false;
    let destroy3D: (() => void) | undefined;
    const wide = window.matchMedia('(min-width: 56rem)');

    async function start3D() {
      if (destroy3D || !wide.matches) return;
      const { createSnake3D, webglAvailable } = await import('../snake/snake3d');
      if (disposed || !webglAvailable()) return;
      try {
        const snake = await createSnake3D(rail, document.body, () => rail.setVectorVisible(false));
        if (disposed) snake.destroy();
        else destroy3D = snake.destroy;
      } catch (err) {
        // modèle indisponible : le serpent vectoriel reste affiché
        console.warn('Serpent 3D indisponible', err);
      }
    }
    function onWidth() {
      if (wide.matches) void start3D();
      else if (destroy3D) {
        destroy3D();
        destroy3D = undefined;
        rail.setVectorVisible(true);
      }
    }

    wide.addEventListener('change', onWidth);
    void start3D();
    return () => {
      disposed = true;
      wide.removeEventListener('change', onWidth);
      destroy3D?.();
      rail.destroy();
    };
  }, []);

  return <div ref={ref} id="rail" aria-hidden="true" className="relative" />;
}
