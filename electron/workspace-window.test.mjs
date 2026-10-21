import assert from 'node:assert/strict'
import test from 'node:test'
import {
  WORKSPACE_WINDOW,
  workspaceWindowGeometry,
} from './workspace-window.mjs'

const area = { x: 0, y: 0, width: 1920, height: 1080 }

test('workspace resizing preserves a short window and accounts for window decorations', () => {
  const bounds = { x: 1600, y: 800, width: 372, height: 598 }
  const content = { width: 356, height: 560 }
  const expanded = workspaceWindowGeometry(bounds, content, area)
  assert.deepEqual(expanded.minimum, [372, 558])
  assert.equal(expanded.bounds.width, 1136)
  assert.equal(expanded.bounds.height, 598)
  assert.ok(expanded.bounds.x + expanded.bounds.width <= area.width)
  assert.ok(expanded.bounds.y + expanded.bounds.height <= area.height)
  assert.ok(WORKSPACE_WINDOW.height > content.height)
})

test('startup uses the unified width and resizing preserves a taller window', () => {
  const bounds = { x: 100, y: 50, width: 356, height: 900 }
  const expanded = workspaceWindowGeometry(bounds, bounds, area)
  const collapsed = workspaceWindowGeometry(
    expanded.bounds,
    expanded.bounds,
    area,
  )
  assert.equal(expanded.bounds.height, 900)
  assert.equal(collapsed.bounds.height, 900)
  assert.equal(collapsed.bounds.width, WORKSPACE_WINDOW.width)
  assert.equal(WORKSPACE_WINDOW.width, 1120)
  assert.equal(WORKSPACE_WINDOW.height, 900)
})

test('small and secondary monitors constrain both minimum size and position', () => {
  const smallArea = { x: -800, y: -100, width: 800, height: 540 }
  const bounds = { x: -100, y: 400, width: 356, height: 640 }
  const resized = workspaceWindowGeometry(bounds, bounds, smallArea)
  assert.deepEqual(resized.minimum, [356, 520])
  assert.deepEqual(resized.bounds, {
    x: -800,
    y: -100,
    width: 800,
    height: 540,
  })
  const tinyArea = { x: 0, y: 0, width: 320, height: 480 }
  const tiny = workspaceWindowGeometry(bounds, bounds, tinyArea)
  assert.deepEqual(tiny.minimum, [320, 480])
  assert.equal(tiny.bounds.width, 320)
  assert.equal(tiny.bounds.height, 480)
})
