const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pickerOverlay", {
  ready: () => ipcRenderer.send("picker:ready"),
  imageError: () => ipcRenderer.send("picker:image-error"),
  onImage: (cb) => ipcRenderer.on("preview:image", (_e, data) => cb(data)),
  onColor: (cb) => ipcRenderer.on("preview:color", (_e, data) => cb(data)),
  onPosition: (cb) =>
    ipcRenderer.on("preview:position", (_e, data) => cb(data)),
  move: (x, y) => ipcRenderer.send("picker:move", { x, y }),
  pick: (x, y) => ipcRenderer.send("picker:pick", { x, y }),
  pickAtCursor: (point) => ipcRenderer.send("picker:confirm", point),
  cancel: () => ipcRenderer.send("picker:cancel"),
});
