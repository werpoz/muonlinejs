import './style.less';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { Store } from '../../../../../store';
import { Matrix, Vector3 } from '../../../../../libs/babylon/exports';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { getMapName } from '../mapsList';
import GATES from '../../../../../common/gates.json';

const MAP_SIZE = 256;
const REDRAW_MS = 100;
const MARKER = 18;
const NPC_MARKER = 11;

const loadIcon = (name: string) => {
  const img = new Image();
  img.src = `/interface/minimap_${name}.png`;
  return img;
};
const ICONS = {
  player: loadIcon('cha'),
  npc: loadIcon('npc'),
  party: loadIcon('party'),
  portal: loadIcon('portal'),
};

const IDENTITY = Matrix.Identity();

// Screen directions (unit, pixels) of +x and +y of the map, so the map is
// drawn turned like the camera sees it. The perspective doesn't keep them
// perpendicular on the screen: only the direction of x is used, y is
// perpendicular to it (on the side the camera shows it).
function mapAxes() {
  const world = Store.world;
  const scene = world?.scene;
  const camera = scene?.activeCamera;
  const player = world?.playerEntity;
  if (!scene || !camera || !player) return null;

  const engine = scene.getEngine();
  const viewport = camera.viewport.toGlobal(
    engine.getRenderWidth(),
    engine.getRenderHeight()
  );
  const transform = scene.getTransformMatrix();
  const { x, y, z } = player.transform.pos;
  const project = (dx: number, dz: number) =>
    Vector3.Project(new Vector3(x + dx, y, z + dz), IDENTITY, transform, viewport);

  const origin = project(0, 0);
  const px = project(1, 0);
  const py = project(0, 1);
  const vx = { x: px.x - origin.x, y: px.y - origin.y };
  const vy = { x: py.x - origin.x, y: py.y - origin.y };
  const length = Math.hypot(vx.x, vx.y) || 1;
  const ex = { x: vx.x / length, y: vx.y / length };
  // which side of x the y axis is on
  const side = Math.sign(ex.x * vy.y - ex.y * vy.x) || 1;
  const ey = { x: -ex.y * side, y: ex.x * side };
  return { ex, ey };
}

// Map of the current world (Tab), made from the terrain: NPCs, portals,
// party members and the player.
export const Minimap = observer(() => {
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEventBus('keyPressed', key => {
    if (key === 'Tab') setVisible(v => !v);
  });

  useEffect(() => {
    if (!visible) return;

    let bitmap: ImageBitmap | null = null;
    let bitmapSource: Uint8ClampedArray | null = null;

    const draw = async () => {
      const world = Store.world;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const axes = mapAxes();
      if (!world || !canvas || !ctx || !axes || !world.minimap) return;

      if (bitmapSource !== world.minimap) {
        bitmapSource = world.minimap;
        bitmap = await createImageBitmap(
          new ImageData(new Uint8ClampedArray(world.minimap), MAP_SIZE, MAP_SIZE)
        );
      }

      const size = canvas.width;
      // the turned map fits in the canvas
      const scale = size / (MAP_SIZE * Math.SQRT2);
      const { ex, ey } = axes;
      const c = MAP_SIZE / 2;
      const toCanvas = (x: number, y: number) => ({
        x: size / 2 + scale * (ex.x * (x - c) + ey.x * (y - c)),
        y: size / 2 + scale * (ex.y * (x - c) + ey.y * (y - c)),
      });

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const origin = toCanvas(0, 0);
      ctx.setTransform(
        scale * ex.x,
        scale * ex.y,
        scale * ey.x,
        scale * ey.y,
        origin.x,
        origin.y
      );
      ctx.imageSmoothingEnabled = false;
      if (bitmap) ctx.drawImage(bitmap, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const marker = (
        icon: HTMLImageElement,
        x: number,
        y: number,
        size = MARKER
      ) => {
        const p = toCanvas(x + 0.5, y + 0.5);
        ctx.drawImage(icon, p.x - size / 2, p.y - size / 2, size, size);
      };

      for (const gate of GATES) {
        if (gate.map !== world.mapIndex) continue;
        marker(ICONS.portal, (gate.x1 + gate.x2) / 2, (gate.y1 + gate.y2) / 2);
      }

      for (const e of world.netObjsQuery.entities) {
        if (e.npcType != null && !e.monster) {
          marker(ICONS.npc, e.transform.pos.x, e.transform.pos.z, NPC_MARKER);
        }
      }

      const me = world.playerEntity;
      const myName = me?.objectNameInWorld;
      for (const member of Store.party ?? []) {
        if (member.name === myName || member.mapId !== world.mapIndex) continue;
        marker(ICONS.party, member.x, member.y);
      }

      if (me) marker(ICONS.player, me.transform.pos.x, me.transform.pos.z);
    };

    draw();
    const timer = setInterval(draw, REDRAW_MS);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible || !Store.world) return null;

  const d = Store.playerData;

  return (
    <div className="minimap">
      <canvas ref={canvasRef} width={512} height={512} />
      <div className="minimap-info">
        {getMapName(Store.world.mapIndex)} ({d.x}, {d.y})
      </div>
    </div>
  );
});
