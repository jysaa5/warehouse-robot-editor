import { test } from "node:test";
import assert from "node:assert/strict";
import { MODEL, parseLayout, snap, normalizeAngle } from "./layout";
const layout = { version: 1, robots: [{ id: "robot-1", model: MODEL, position: { x: 2.5, y: 0, z: -3 }, rotation: { y: 75 } }] };
test("exported placement survives a JSON round trip", () => assert.deepEqual(parseLayout(JSON.stringify(layout)), layout));
test("invalid import is rejected before replacing scene data", () => {
  for (const value of [
    { ...layout, version: 2 },
    { ...layout, robots: [layout.robots[0], layout.robots[0]] },
    { ...layout, robots: [{ ...layout.robots[0], model: "unknown" }] },
    { ...layout, robots: [{ ...layout.robots[0], position: { x: 0, y: 1, z: 0 } }] },
  ])
    assert.throws(() => parseLayout(JSON.stringify(value)));
  assert.throws(() => parseLayout("{broken"));
});
test("snap and wrapped angles", () => {
  assert.equal(snap(1.26, 0.5), 1.5);
  assert.equal(snap(-1.26, 0.5), -1.5);
  assert.equal(normalizeAngle(snap(-16, 15)), 345);
});
