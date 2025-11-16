export function HandPointer({ state }) {
  if (!state.visible) return null;

  const style = {
    "--x": `${(state.x * 100).toFixed(2)}%`,
    "--y": `${(state.y * 100).toFixed(2)}%`,
    "--scale": (0.6 + state.area * 1.8).toFixed(2),
    "--blur": (14 + state.closeness * 40).toFixed(1),
    opacity: 1,
  };

  return <div class="theremin__pointer" style={style} />;
}
