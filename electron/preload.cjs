const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("colorPicker", {
  start: (locale) => ipcRenderer.send("picker:start", locale),
  onDone: (cb) => ipcRenderer.on("picker:done", (_e, data) => cb(data)),
});
