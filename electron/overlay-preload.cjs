const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pickerOverlay", {
  onColor: (cb) => ipcRenderer.on("preview:color", (_e, data) => cb(data)),
  move: (x, y) => ipcRenderer.send("picker:move", { x, y }),
  pick: (x, y) => ipcRenderer.send("picker:pick", { x, y }),
  cancel: () => ipcRenderer.send("picker:cancel"),
});
