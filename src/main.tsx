import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { WarehouseScene } from "./scene";
import { MODEL, normalizeAngle, parseLayout, snap, type Robot } from "./layout";
import "./style.css";
function App() {
  const canvas = useRef<HTMLCanvasElement>(null),
    scene = useRef<WarehouseScene | null>(null),
    file = useRef<HTMLInputElement>(null);
  const [robots, setRobots] = useState<Robot[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [mode, setMode] = useState<"move" | "rotate">("move");
  const [ready, setReady] = useState(false),
    [message, setMessage] = useState("로봇 GLB를 불러오는 중…");
  useEffect(() => {
    const editor = new WarehouseScene(canvas.current!, setSelected, (id, x, z, y) => setRobots((prev) => prev.map((r) => (r.id === id ? { ...r, position: { x, y: 0, z }, rotation: { y } } : r))));
    scene.current = editor;
    let active = true;
    editor
      .load()
      .then(() => {
        if (active) {
          setReady(true);
          setMessage("준비 완료 · 로봇 추가로 시작하세요.");
        }
      })
      .catch(() => {
        if (active) setMessage("모델을 불러오지 못했습니다. 새로고침하여 다시 시도하세요.");
      });
    return () => {
      active = false;
      editor.dispose();
    };
  }, []);
  useEffect(() => {
    scene.current?.sync(robots, selected, mode);
  }, [robots, selected, mode, ready]);
  const robot = robots.find((r) => r.id === selected);
  function add() {
    const id = crypto.randomUUID();
    setRobots((prev) => [...prev, { id, model: MODEL, position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } }]);
    setSelected(id);
    setMessage("로봇을 선택했습니다. 기즈모를 드래그하거나 속성을 수정하세요.");
  }
  function change(key: "x" | "z" | "angle", value: number) {
    if (!Number.isFinite(value)) return;
    setRobots((prev) => prev.map((r) => (r.id !== selected ? r : key === "angle" ? { ...r, rotation: { y: normalizeAngle(snap(value, 15)) } } : { ...r, position: { ...r.position, [key]: snap(value, 0.5) } })));
  }
  function save() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, robots }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "warehouse-layout.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("JSON을 저장했습니다. 새로고침 후 불러오기로 복원할 수 있습니다.");
  }
  async function load(f: File) {
    try {
      const data = parseLayout(await f.text());
      setRobots(data.robots);
      setSelected(data.robots[0]?.id ?? null);
      setMessage(`${data.robots.length}개 로봇의 배치를 복원했습니다.`);
    } catch (e) {
      setMessage(`불러오기 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return (
    <div className="app">
      <header>
        <div>
          <span className="eyebrow">WAREHOUSE LAB / 01</span>
          <h1>물류 로봇 배치 에디터</h1>
        </div>
        <span className="badge">배치 모드 · 1 unit = 1 m</span>
      </header>
      <nav aria-label="도구 모음">
        <button disabled={!ready || robots.length >= 100} onClick={add}>
          ＋ 로봇 추가
        </button>
        <div className="divider" />
        <button aria-pressed={mode === "move"} onClick={() => setMode("move")}>
          ↔ 이동
        </button>
        <button aria-pressed={mode === "rotate"} onClick={() => setMode("rotate")}>
          ↻ 회전
        </button>
        <div className="spacer" />
        <button onClick={() => scene.current?.resetCamera()}>시점 초기화</button>
        <button disabled={!ready} onClick={() => file.current?.click()}>
          JSON 불러오기
        </button>
        <button className="primary" disabled={!ready} onClick={save}>
          JSON 저장 ↓
        </button>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void load(f);
            e.target.value = "";
          }}
        />
      </nav>
      <main>
        <section className="viewport">
          <canvas ref={canvas} aria-label="로봇 3D 작업 공간" />
          <div className="overlay">
            PERSPECTIVE <span>그리드 0.5 m</span>
          </div>
          <div className="legend">
            <b className="x">X</b> 좌우 <b className="z">Z</b> 앞뒤 · Y 높이 고정
          </div>
        </section>
        <aside>
          <span className="eyebrow">INSPECTOR</span>
          <h2>로봇 속성</h2>
          {robot ? (
            <>
              <label>
                모델
                <input readOnly value={robot.model} />
              </label>
              <label>
                ID
                <input readOnly value={robot.id} />
              </label>
              <h3>
                위치 <small>미터 / 월드 좌표</small>
              </h3>
              <div className="fields">
                {(["x", "z"] as const).map((k) => (
                  <label key={k}>
                    {k.toUpperCase()}
                    <input aria-label={`${k.toUpperCase()} 위치`} type="number" step="0.5" value={robot.position[k]} onChange={(e) => change(k, e.target.valueAsNumber)} />
                  </label>
                ))}
              </div>
              <label>
                Y · 바닥 고정
                <input readOnly value="0 m" />
              </label>
              <h3>
                회전 <small>Y축 / 도(deg)</small>
              </h3>
              <label>
                방향
                <input aria-label="Y축 회전" type="number" step="15" value={robot.rotation.y} onChange={(e) => change("angle", e.target.valueAsNumber)} />
              </label>
              <p>
                이동 0.5 m · 회전 15° 스냅
                <br />
                기즈모 드래그를 마치면 값이 반영됩니다.
              </p>
              <button
                className="danger"
                onClick={() => {
                  setRobots((prev) => prev.filter((r) => r.id !== selected));
                  setSelected(null);
                }}
              >
                선택 로봇 삭제
              </button>
            </>
          ) : (
            <div className="empty">
              로봇을 추가하거나
              <br />
              장면의 로봇을 클릭하세요.
            </div>
          )}
          <div className="guide">
            <h3>작업 가이드</h3>
            <p>
              빈 바닥 드래그 · 카메라 회전
              <br />
              마우스 휠 · 확대 / 축소
              <br />
              로봇 클릭 · 선택
              <br />
              화살표 / 평면 · 이동
              <br />
              회전 도구의 원 · Y축 회전
            </p>
            <p>주황색 표시가 로봇의 전면입니다.</p>
          </div>
        </aside>
      </main>
      <footer>
        <span role="status">{message}</span>
        <span>{robots.length} ROBOTS</span>
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
