import { Engine, Scene, ArcRotateCamera, Vector3, Color3, Color4, HemisphericLight, MeshBuilder, StandardMaterial, GizmoManager, TransformNode, SceneLoader, PointerEventTypes, AssetContainer } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { normalizeAngle, snap, type Robot } from "./layout";
export class WarehouseScene {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private gizmos: GizmoManager;
  private asset?: AssetContainer;
  private roots = new Map<string, TransformNode>();
  private selected: string | null = null;
  private resize = () => this.engine.resize();
  private disposed = false;
  constructor(
    canvas: HTMLCanvasElement,
    private onSelect: (id: string | null) => void,
    private onChange: (id: string, x: number, z: number, degrees: number) => void,
  ) {
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.035, 0.055, 0.08, 1);
    this.camera = new ArcRotateCamera("camera", -Math.PI / 2.4, Math.PI / 3, 16, Vector3.Zero(), this.scene);
    this.camera.lowerRadiusLimit = 3;
    this.camera.upperRadiusLimit = 60;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.03;
    this.camera.wheelPrecision = 30;
    this.camera.attachControl(canvas, true);
    new HemisphericLight("ambient", new Vector3(0.3, 1, 0.4), this.scene).intensity = 1.3;
    const floor = MeshBuilder.CreateGround("floor", { width: 30, height: 30 }, this.scene);
    const material = new StandardMaterial("floor", this.scene);
    material.diffuseColor = new Color3(0.08, 0.12, 0.16);
    material.specularColor = Color3.Black();
    floor.material = material;
    const lines: Vector3[][] = [];
    for (let i = -15; i <= 15; i += 0.5) {
      lines.push([new Vector3(i, 0.005, -15), new Vector3(i, 0.005, 15)], [new Vector3(-15, 0.005, i), new Vector3(15, 0.005, i)]);
    }
    const grid = MeshBuilder.CreateLineSystem("0.5m grid", { lines }, this.scene);
    grid.color = new Color3(0.18, 0.26, 0.32);
    grid.isPickable = false;
    for (const [name, end, color] of [
      ["X", new Vector3(3, 0.015, 0), Color3.Red()],
      ["Z", new Vector3(0, 0.015, 3), new Color3(0.2, 0.6, 1)],
    ] as const) {
      const axis = MeshBuilder.CreateLines(name, { points: [new Vector3(0, 0.015, 0), end] }, this.scene);
      axis.color = color;
      axis.isPickable = false;
    }
    this.gizmos = new GizmoManager(this.scene);
    this.gizmos.usePointerToAttachGizmos = false;
    this.gizmos.positionGizmoEnabled = true;
    this.gizmos.rotationGizmoEnabled = true;
    const p = this.gizmos.gizmos.positionGizmo!;
    p.yGizmo.isEnabled = false;
    p.xPlaneGizmo.isEnabled = false;
    p.zPlaneGizmo.isEnabled = false;
    p.yPlaneGizmo.isEnabled = true;
    p.snapDistance = 0.5;
    p.updateGizmoRotationToMatchAttachedMesh = false;
    const r = this.gizmos.gizmos.rotationGizmo!;
    r.xGizmo.isEnabled = false;
    r.zGizmo.isEnabled = false;
    r.snapDistance = Math.PI / 12;
    p.onDragEndObservable.add(() => this.commit());
    r.onDragEndObservable.add(() => this.commit());
    this.scene.onPointerObservable.add((info) => {
      if (info.type !== PointerEventTypes.POINTERTAP) return;
      let node = info.pickInfo?.pickedMesh as TransformNode | null;
      while (node && !node.metadata?.robotId) node = node.parent as TransformNode | null;
      this.onSelect(node?.metadata?.robotId ?? null);
    });
    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener("resize", this.resize);
  }
  async load() {
    const asset = await SceneLoader.LoadAssetContainerAsync(`${import.meta.env.BASE_URL}models/`, "warehouse-amr.glb", this.scene);
    if (this.disposed) {
      asset.dispose();
      return;
    }
    this.asset = asset;
  }
  sync(robots: Robot[], selected: string | null, mode: "move" | "rotate") {
    if (!this.asset || this.disposed) return;
    for (const [id, root] of this.roots)
      if (!robots.some((r) => r.id === id)) {
        root.dispose();
        this.roots.delete(id);
      }
    for (const robot of robots) {
      let root = this.roots.get(robot.id);
      if (!root) {
        root = new TransformNode(robot.id, this.scene);
        root.metadata = { robotId: robot.id };
        const instance = this.asset.instantiateModelsToScene((name) => `${robot.id}-${name}`, false, { doNotInstantiate: true });
        for (const child of instance.rootNodes) child.parent = root;
        this.roots.set(robot.id, root);
      }
      root.position.set(robot.position.x, 0, robot.position.z);
      root.rotationQuaternion = null;
      root.rotation.set(0, (robot.rotation.y * Math.PI) / 180, 0);
    }
    this.selected = selected;
    this.gizmos.positionGizmoEnabled = mode === "move";
    this.gizmos.rotationGizmoEnabled = mode === "rotate";
    this.gizmos.attachToNode(selected ? (this.roots.get(selected) ?? null) : null);
  }
  private commit() {
    const root = this.selected ? this.roots.get(this.selected) : undefined;
    if (!root || !this.selected) return;
    const yaw = root.rotationQuaternion ? root.rotationQuaternion.toEulerAngles().y : root.rotation.y;
    const x = snap(root.position.x, 0.5),
      z = snap(root.position.z, 0.5),
      degrees = normalizeAngle(snap((yaw * 180) / Math.PI, 15));
    root.position.set(x, 0, z);
    root.rotationQuaternion = null;
    root.rotation.set(0, (degrees * Math.PI) / 180, 0);
    this.onChange(this.selected, x, z, degrees);
  }
  resetCamera() {
    this.camera.setTarget(Vector3.Zero());
    this.camera.alpha = -Math.PI / 2.4;
    this.camera.beta = Math.PI / 3;
    this.camera.radius = 16;
  }
  dispose() {
    this.disposed = true;
    window.removeEventListener("resize", this.resize);
    this.scene.dispose();
    this.engine.dispose();
  }
}
