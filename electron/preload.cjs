const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("colorPicker", {
  start: (locale) => ipcRenderer.send("picker:start", locale),
  onDone: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on("picker:done", listener);
    return () => ipcRenderer.removeListener("picker:done", listener);
  },
});

contextBridge.exposeInMainWorld("workspace", {
  setExpanded: (expanded) => ipcRenderer.send("workspace:expanded", expanded),
});
