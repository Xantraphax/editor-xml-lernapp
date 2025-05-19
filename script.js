// === DOM ELEMENTS ===
const imageLoader = document.getElementById("imageLoader");
const imageContainer = document.getElementById("imageContainer");
const baseImage = document.getElementById("baseImage");
const output = document.getElementById("output");
const exportButton = document.getElementById("exportButton");
const guideHorizontal = document.getElementById("guideHorizontal");
const guideVertical = document.getElementById("guideVertical");

let currentImageFileName = "";
let selectedBox = null;
let copiedBoxData = null;
let pasteInProgress = false;
let guideMode = null;
let activeGuideLine = null;

// === IMAGE LOADING ===
imageLoader.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  currentImageFileName = file.name;

  const reader = new FileReader();
  reader.onload = function (event) {
    baseImage.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// === GUIDE MODE RADIO TOGGLE ===
function updateGuideMode() {
  if (guideHorizontal.checked) {
    guideVertical.checked = false;
    guideMode = "horizontal";
  } else if (guideVertical.checked) {
    guideHorizontal.checked = false;
    guideMode = "vertical";
  } else {
    guideMode = null;
  }
}

guideHorizontal.addEventListener("change", updateGuideMode);
guideVertical.addEventListener("change", updateGuideMode);

// === CLICK HANDLING: INPUT-BOX vs GUIDE-LINE ===
imageContainer.addEventListener("click", (e) => {
  const rect = imageContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (guideMode === "horizontal") {
    createGuideLine("horizontal", y);
  } else if (guideMode === "vertical") {
    createGuideLine("vertical", x);
  } else {
    createInputBox(x, y);
  }
});

// === GUIDE LINE CREATION ===
function createGuideLine(type, pos) {
  const line = document.createElement("div");
  line.classList.add("guide-line", type);
  if (type === "horizontal") {
    line.style.top = `${pos}px`;
  } else {
    line.style.left = `${pos}px`;
  }

  let dragging = false;
  let offset = 0;

  line.addEventListener("mousedown", (e) => {
    dragging = true;
    const rect = line.getBoundingClientRect();
    offset = type === "horizontal" ? e.clientY - rect.top : e.clientX - rect.left;
    activeGuideLine = line;
    e.stopPropagation();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging || !activeGuideLine) return;
    const containerRect = imageContainer.getBoundingClientRect();

    if (type === "horizontal") {
      const y = e.clientY - containerRect.top - offset;
      activeGuideLine.style.top = `${Math.max(0, y)}px`;
    } else {
      const x = e.clientX - containerRect.left - offset;
      activeGuideLine.style.left = `${Math.max(0, x)}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    activeGuideLine = null;
  });

  // Doppelklick löscht Linie
  line.addEventListener("dblclick", () => {
    line.remove();
  });

  imageContainer.appendChild(line);
}

// === INPUT BOX ===
function createInputBox(x, y) {
  const div = document.createElement("div");
  div.classList.add("input-box");
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.style.width = "60px";
  div.style.height = "30px";

  div.innerHTML = `
    <input type="text" placeholder="Lösung" />
    <div class="resize-handle"></div>
    <button class="delete-button">×</button>
  `;

  div.querySelector(".delete-button").addEventListener("click", () => {
    imageContainer.removeChild(div);
  });

  div.addEventListener("click", (e) => {
    e.stopPropagation();
    selectedBox = div;
  });

  imageContainer.appendChild(div);
  makeDraggable(div);
}

// === EXPORT TO XML ===
exportButton.addEventListener("click", () => {
  const fields = document.querySelectorAll(".input-box");
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<imageTask>\n  <image src="${currentImageFileName}" />\n`;

  fields.forEach((field) => {
    const input = field.querySelector("input");
    const solution = input.value.trim();
    const rect = field.getBoundingClientRect();
    const containerRect = imageContainer.getBoundingClientRect();

    const x = ((rect.left - containerRect.left) / containerRect.width) * 100;
    const y = ((rect.top - containerRect.top) / containerRect.height) * 100;
    const w = (rect.width / containerRect.width) * 100;
    const h = (rect.height / containerRect.height) * 100;

    xml += `  <field x="${x.toFixed(2)}%" y="${y.toFixed(2)}%" width="${w.toFixed(2)}%" height="${h.toFixed(2)}%" solution="${solution}" />\n`;
  });

  xml += `</imageTask>`;
  output.value = xml;
});

// === DRAG & RESIZE ===
function makeDraggable(element) {
  let offsetX, offsetY;
  let isDragging = false;
  let isResizing = false;
  const resizeHandle = element.querySelector(".resize-handle");

  element.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.classList.contains("resize-handle")) return;
    isDragging = true;
    const rect = element.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    e.stopPropagation();
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    const containerRect = imageContainer.getBoundingClientRect();

    if (isDragging) {
      let x = e.clientX - containerRect.left - offsetX;
      let y = e.clientY - containerRect.top - offsetY;
      element.style.left = `${Math.max(0, x)}px`;
      element.style.top = `${Math.max(0, y)}px`;
    }

    if (isResizing) {
      const rect = element.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const newHeight = e.clientY - rect.top;
      element.style.width = `${Math.max(30, newWidth)}px`;
      element.style.height = `${Math.max(20, newHeight)}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    isResizing = false;
  });
}

// === COPY / PASTE ===
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && selectedBox) {
    const input = selectedBox.querySelector("input");
    copiedBoxData = {
      value: input.value,
      width: selectedBox.offsetWidth,
      height: selectedBox.offsetHeight,
      left: selectedBox.offsetLeft,
      top: selectedBox.offsetTop,
      z: parseInt(selectedBox.style.zIndex) || 1
    };
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && copiedBoxData && !pasteInProgress) {
    pasteInProgress = true;

    const newX = copiedBoxData.left + 20;
    const newY = copiedBoxData.top + 20;

    const div = document.createElement("div");
    div.classList.add("input-box");
    div.style.left = `${newX}px`;
    div.style.top = `${newY}px`;
    div.style.width = `${copiedBoxData.width}px`;
    div.style.height = `${copiedBoxData.height}px`;
    div.style.zIndex = copiedBoxData.z + 1;

    div.innerHTML = `
      <input type="text" value="${copiedBoxData.value}" />
      <div class="resize-handle"></div>
      <button class="delete-button">×</button>
    `;

    div.querySelector(".delete-button").addEventListener("click", () => {
      imageContainer.removeChild(div);
    });

    div.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedBox = div;
    });

    imageContainer.appendChild(div);
    makeDraggable(div);
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "v") {
    pasteInProgress = false;
  }
});
