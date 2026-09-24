const canvas = new fabric.Canvas("thumbnailCanvas", {
  width: 1280,
  height: 720,
  backgroundColor: "#2f3035",
  preserveObjectStacking: true
});

const previewCanvas = document.getElementById("previewCanvas");
const previewCtx = previewCanvas.getContext("2d");

const imageUpload = document.getElementById("imageUpload");
const textInput = document.getElementById("textInput");
const addTextBtn = document.getElementById("addTextBtn");
const deleteBtn = document.getElementById("deleteBtn");
const duplicateBtn = document.getElementById("duplicateBtn");
const bringFrontBtn = document.getElementById("bringFrontBtn");
const sendBackBtn = document.getElementById("sendBackBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const exportBtn = document.getElementById("exportBtn");

const fontSize = document.getElementById("fontSize");
const textColor = document.getElementById("textColor");
const strokeColor = document.getElementById("strokeColor");
const strokeWidth = document.getElementById("strokeWidth");
const selectionInfo = document.getElementById("selectionInfo");

let history = [];
let historyIndex = -1;
let isRestoring = false;

function fitCanvasToContainer() {
  const wrap = document.querySelector(".canvas-stage-wrap");
  if (!wrap) return;

  const width = wrap.clientWidth;
  const scale = width / 1280;
  const height = 720 * scale;

  canvas.setDimensions(
    { width, height },
    { cssOnly: true }
  );

  canvas.setZoom(scale);
  canvas.requestRenderAll();
}

function saveHistory() {
  if (isRestoring) return;

  const json = JSON.stringify(
    canvas.toJSON([
      "selectable",
      "evented",
      "lockMovementX",
      "lockMovementY"
    ])
  );

  if (history[historyIndex] === json) return;

  history = history.slice(0, historyIndex + 1);
  history.push(json);
  historyIndex = history.length - 1;

  if (history.length > 30) {
    history.shift();
    historyIndex = history.length - 1;
  }

  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  undoBtn.disabled = historyIndex <= 0;
  redoBtn.disabled = historyIndex >= history.length - 1;
}

function restoreHistory(index) {
  if (index < 0 || index >= history.length) return;

  isRestoring = true;

  canvas.loadFromJSON(history[index], () => {
    canvas.renderAll();
    historyIndex = index;
    isRestoring = false;
    updateUndoRedoButtons();
    updateSelectionInfo();
    updatePreview();
  });
}

function undo() {
  if (historyIndex > 0) {
    restoreHistory(historyIndex - 1);
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    restoreHistory(historyIndex + 1);
  }
}

function updateSelectionInfo() {
  const active = canvas.getActiveObject();

  if (!active) {
    selectionInfo.textContent = "아직 선택된 요소가 없어.";
    return;
  }

  if (active.type === "i-text" || active.type === "textbox") {
    selectionInfo.textContent = `텍스트: ${active.text || ""}`;
  } else if (active.type === "image") {
    selectionInfo.textContent = "사진이 선택됨";
  } else {
    selectionInfo.textContent = `${active.type} 요소가 선택됨`;
  }
}

function updateTextControls() {
  const active = canvas.getActiveObject();

  if (!active) return;

  if (active.type === "i-text" || active.type === "textbox") {
    fontSize.value = active.fontSize || 72;
    textColor.value = active.fill || "#ffffff";
    strokeColor.value = active.stroke || "#000000";
    strokeWidth.value = active.strokeWidth || 0;
  }
}

function addImageFromFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();

  reader.onload = (event) => {
    fabric.Image.fromURL(event.target.result, (img) => {
      const maxWidth = 520;
      const maxHeight = 420;

      const scale = Math.min(
        maxWidth / img.width,
        maxHeight / img.height,
        1
      );

      img.set({
        left: 640,
        top: 360,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        cornerStyle: "circle",
        cornerColor: "#ff5b8f",
        borderColor: "#ff5b8f",
        transparentCorners: false,
        padding: 4
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();

      saveHistory();
      updateSelectionInfo();
      updatePreview();
    });
  };

  reader.readAsDataURL(file);
}

imageUpload.addEventListener("change", (event) => {
  const files = Array.from(event.target.files || []);
  files.forEach(addImageFromFile);
  imageUpload.value = "";
});

addTextBtn.addEventListener("click", () => {
  const value = textInput.value.trim() || "텍스트";

  const text = new fabric.IText(value, {
    left: 640,
    top: 100,
    originX: "center",
    originY: "center",
    fill: "#ffffff",
    fontSize: 72,
    fontWeight: "800",
    fontFamily: "Arial, sans-serif",
    stroke: "#000000",
    strokeWidth: 3,
    paintFirst: "stroke",
    textAlign: "center",
    cornerStyle: "circle",
    cornerColor: "#ff5b8f",
    borderColor: "#ff5b8f",
    transparentCorners: false,
    padding: 4
  });

  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.requestRenderAll();

  saveHistory();
  updateSelectionInfo();
  updateTextControls();
  updatePreview();
});

deleteBtn.addEventListener("click", () => {
  const activeObjects = canvas.getActiveObjects();

  if (!activeObjects || activeObjects.length === 0) {
    return;
  }

  canvas.discardActiveObject();

  activeObjects.forEach((obj) => {
    canvas.remove(obj);
  });

  canvas.requestRenderAll();

  saveHistory();
  updateSelectionInfo();
  updatePreview();
});
duplicateBtn.addEventListener("click", () => {
  const active = canvas.getActiveObject();
  if (!active) return;

  active.clone((cloned) => {
    canvas.discardActiveObject();

    cloned.set({
      left: (active.left || 0) + 30,
      top: (active.top || 0) + 30,
      evented: true
    });

    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.requestRenderAll();

    saveHistory();
    updateSelectionInfo();
    updatePreview();
  });
});

bringFrontBtn.addEventListener("click", () => {
  const active = canvas.getActiveObject();
  if (!active) return;

  active.bringToFront();
  canvas.requestRenderAll();

  saveHistory();
  updatePreview();
});

sendBackBtn.addEventListener("click", () => {
  const active = canvas.getActiveObject();
  if (!active) return;

  active.sendToBack();
  canvas.requestRenderAll();

  saveHistory();
  updatePreview();
});

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

fontSize.addEventListener("input", () => {
  const active = canvas.getActiveObject();

  if (
    !active ||
    (active.type !== "i-text" && active.type !== "textbox")
  ) return;

  active.set("fontSize", Number(fontSize.value));
  active.setCoords();
  canvas.requestRenderAll();
  updatePreview();
});

fontSize.addEventListener("change", saveHistory);

textColor.addEventListener("input", () => {
  const active = canvas.getActiveObject();

  if (
    !active ||
    (active.type !== "i-text" && active.type !== "textbox")
  ) return;

  active.set("fill", textColor.value);
  canvas.requestRenderAll();
  updatePreview();
});

textColor.addEventListener("change", saveHistory);

strokeColor.addEventListener("input", () => {
  const active = canvas.getActiveObject();

  if (
    !active ||
    (active.type !== "i-text" && active.type !== "textbox")
  ) return;

  active.set("stroke", strokeColor.value);
  canvas.requestRenderAll();
  updatePreview();
});

strokeColor.addEventListener("change", saveHistory);

strokeWidth.addEventListener("input", () => {
  const active = canvas.getActiveObject();

  if (
    !active ||
    (active.type !== "i-text" && active.type !== "textbox")
  ) return;

  active.set("strokeWidth", Number(strokeWidth.value));
  canvas.requestRenderAll();
  updatePreview();
});

strokeWidth.addEventListener("change", saveHistory);

function updatePreview() {
  const dataURL = canvas.toDataURL({
    format: "png",
    multiplier: 1
  });

  const img = new Image();

  img.onload = () => {
    previewCanvas.width = 320;
    previewCanvas.height = 180;
    previewCtx.clearRect(0, 0, 320, 180);
    previewCtx.drawImage(img, 0, 0, 320, 180);
  };

  img.src = dataURL;
}

exportBtn.addEventListener("click", () => {
  canvas.discardActiveObject();
  canvas.requestRenderAll();

  const dataURL = canvas.toDataURL({
    format: "png",
    quality: 1,
    multiplier: 1
  });

  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "sytube-thumbnail.png";
  link.click();

  updatePreview();
});

canvas.on("selection:created", () => {
  updateSelectionInfo();
  updateTextControls();
});

canvas.on("selection:updated", () => {
  updateSelectionInfo();
  updateTextControls();
});

canvas.on("selection:cleared", () => {
  updateSelectionInfo();
});

canvas.on("object:modified", () => {
  saveHistory();
  updatePreview();
});

canvas.on("object:added", () => {
  updatePreview();
});

canvas.on("object:removed", () => {
  updatePreview();
});

window.addEventListener("keydown", (event) => {
  const active = canvas.getActiveObject();

  const tag = document.activeElement?.tagName?.toLowerCase();
  const editingText =
    active &&
    (active.type === "i-text" || active.type === "textbox") &&
    active.isEditing;

  if (
    (event.key === "Delete" || event.key === "Backspace") &&
    tag !== "input" &&
    tag !== "textarea" &&
    !editingText
  ) {
    event.preventDefault();
    deleteBtn.click();
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();

    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
  }
});

window.addEventListener("resize", fitCanvasToContainer);

canvas.setBackgroundColor("#2f3035", () => {
  canvas.renderAll();
  saveHistory();
  updatePreview();
  fitCanvasToContainer();
});