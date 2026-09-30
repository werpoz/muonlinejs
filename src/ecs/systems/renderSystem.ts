import { Frustum, Vector3, type Plane } from '../../libs/babylon/exports';
import { ISystemFactory } from '../world';

const v3Temp = Vector3.Zero();
const v3Temp2 = Vector3.Zero();

export const RenderSystem: ISystemFactory = world => {
  const query = world.with('transform', 'modelObject');
  let planes: Plane[] | null = null;

  return {
    update: () => {
      const terrain = world.terrain;
      if (!terrain) return;

      const extraHeight = terrain.extraHeight;

      // the models out of the view of the camera are disabled: Babylon
      // skips their meshes, bones and draw calls (the matrix of the last
      // frame is enough, the models have a margin)
      const camera = world.scene.activeCamera;
      if (camera) {
        const matrix = camera.getViewMatrix().multiply(camera.getProjectionMatrix());
        if (planes) Frustum.GetPlanesToRef(matrix, planes);
        else planes = Frustum.GetPlanes(matrix);
      }

      for (const { transform, modelObject } of query) {
        modelObject.Update(world.gameTime);

        v3Temp.copyFrom(transform.rot as any);
        v3Temp.y = Math.PI * 2 - v3Temp.y;

        v3Temp2.copyFrom(transform.pos as any);
        if (transform.posOffset !== undefined) {
          v3Temp2.addInPlace(transform.posOffset as any);
        }

        // v3Temp2.y += extraHeight;

        modelObject.updateLocation(v3Temp2, transform.scale, v3Temp);
        if (planes) modelObject.setEnabled(modelObject.isInFrustum(planes));

        modelObject.Draw(world.gameTime);
      }
    },
  };
};
