// Expose narrow desktop capabilities to the renderer; do not leak Electron or filesystem access.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("colorPicker", {
  start: (locale, mode) => ipcRenderer.send("picker:start", locale, mode),
  nativeAvailable: () => ipcRenderer.invoke("picker:native-available"),
  onDone: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on("picker:done", listener);
    return () => ipcRenderer.removeListener("picker:done", listener);
  },
});

contextBridge.exposeInMainWorld("workspace", {
  setExpanded: (expanded) => ipcRenderer.send("workspace:expanded", expanded),
});

contextBridge.exposeInMainWorld("desktopSettings", {
  getDisplayMode: () => ipcRenderer.invoke("display-mode:get"),
  restartWithX11: (enabled) =>
    ipcRenderer.invoke("display-mode:restart", enabled),
});
