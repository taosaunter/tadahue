// Content dimensions shared by startup and the expand/collapse resize policy.
export const EXPANDED_WORKSPACE_WIDTH = 1120;

export const WORKSPACE_WINDOW = {
  width: EXPANDED_WORKSPACE_WIDTH,
  minWidth: 356,
  height: 900,
  minHeight: 520,
};

export function workspaceWindowGeometry(bounds, content, area) {
  const frameWidth = bounds.width - content.width;
  const frameHeight = bounds.height - content.height;
  const minWidth = Math.min(WORKSPACE_WINDOW.minWidth + frameWidth, area.width);
  const minHeight = Math.min(
    WORKSPACE_WINDOW.minHeight + frameHeight,
    area.height,
  );
  const width = Math.min(WORKSPACE_WINDOW.width + frameWidth, area.width);
  const height = Math.min(Math.max(bounds.height, minHeight), area.height);
  return {
    minimum: [minWidth, minHeight],
    bounds: {
      ...bounds,
      width,
      height,
      x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - width)),
      y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - height)),
    },
  };
}
