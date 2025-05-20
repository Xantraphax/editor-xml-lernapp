const imageLoader = document.getElementById("imageLoader");
const imageContainer = document.getElementById("imageContainer");
const baseImage = document.getElementById("baseImage");
const output = document.getElementById("output");
const exportButton = document.getElementById("exportButton");
const toggleGuidesButton = document.getElementById("toggleGuides");

let currentImageFileName = "";
let selectedBox = null;
let copiedBoxData = null;
let pasteInProgress = false;

let guideEditMode = false;
let guideType = "horizontal";
let movingGuide = null;
let guideOffset = 0;

// === Bild laden ===
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

// === Toggle Hilfslinien-Modus ===
toggleGuidesButton.addEventListener("click", () => {
  guideEditMode = !guideEditMode;
  toggleGuidesButton.classList.toggle("active", guideEditMode);
  guideType = guideEditMode ? "horizontal" : null;
});

// === Klick zum Platzieren von Feldern oder Hilfslinien ===
baseImage.addEventListener("click", (e) => {
  const rect = imageContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (guideEditMode) {
    createGuideLine(x, y);
  } else {
    createInputBox(x, y);
  }
});

// === Textfeld erstellen ===
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

// === Exportfunktion ===
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

// === Drag & Resize + Snap-to-Guide ===
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
    element.style.zIndex = "1000";
    e.preventDefault();
  });

  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    element.style.zIndex = "1000";
    e.stopPropagation();
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    const containerRect = imageContainer.getBoundingClientRect();

    if (isDragging) {
      let x = e.clientX - containerRect.left - offsetX;
      let y = e.clientY - containerRect.top - offsetY;

      // Snap an Hilfslinien
      const SNAP_THRESHOLD = 8;
      const guides = document.querySelectorAll(".guide-line");

      guides.forEach((guide) => {
        if (guide.classList.contains("horizontal")) {
          const gy = parseInt(guide.style.top);
          if (Math.abs(y - gy) < SNAP_THRESHOLD) {
            y = gy;
          }
        } else {
          const gx = parseInt(guide.style.left);
          if (Math.abs(x - gx) < SNAP_THRESHOLD) {
            x = gx;
          }
        }
      });

      x = Math.max(0, Math.min(containerRect.width - element.offsetWidth, x));
      y = Math.max(0, Math.min(containerRect.height - element.offsetHeight, y));
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
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
    if (isDragging || isResizing) {
      isDragging = false;
      isResizing = false;
      element.style.zIndex = "1";
    }
  });
}

// === Copy & Paste mit Z-Ebene ===
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && selectedBox) {
    const input = selectedBox.querySelector("input");
    copiedBoxData = {
      value: input.value,
      width: selectedBox.offsetWidth,
      height: selectedBox.offsetHeight,
      left: selectedBox.offsetLeft,
      top: selectedBox.offsetTop,
      zIndex: parseInt(selectedBox.style.zIndex) || 1
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
    div.style.zIndex = copiedBoxData.zIndex + 1;

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

// === Hilfslinie erstellen ===
function createGuideLine(x, y) {
  const line = document.createElement("div");
  line.classList.add("guide-line", guideType);

  if (guideType === "horizontal") {
    line.style.top = `${y}px`;
    line.style.left = "0";
  } else {
    line.style.left = `${x}px`;
    line.style.top = "0";
  }

  // Löschen
  line.addEventListener("click", (ev) => {
    if (!guideEditMode) return;
    const offsetX = ev.offsetX;
    const offsetY = ev.offsetY;
    if (offsetX > line.offsetWidth - 15 && offsetY < 15) {
      ev.stopPropagation();
      line.remove();
    }
  });

  // Ziehen
  line.addEventListener("mousedown", (ev) => {
    if (!guideEditMode) return;
    movingGuide = line;
    const rect = imageContainer.getBoundingClientRect();
    guideOffset = guideType === "vertical"
      ? ev.clientX - line.getBoundingClientRect().left
      : ev.clientY - line.getBoundingClientRect().top;
    ev.stopPropagation();
    ev.preventDefault();
  });

  imageContainer.appendChild(line);

  guideType = guideType === "horizontal" ? "vertical" : "horizontal";
}

document.addEventListener("mousemove", (e) => {
  if (!movingGuide) return;
  const rect = imageContainer.getBoundingClientRect();

  if (movingGuide.classList.contains("horizontal")) {
    let y = e.clientY - rect.top - guideOffset;
    y = Math.max(0, Math.min(rect.height, y));
    movingGuide.style.top = `${y}px`;
  } else {
    let x = e.clientX - rect.left - guideOffset;
    x = Math.max(0, Math.min(rect.width, x));
    movingGuide.style.left = `${x}px`;
  }
});

document.addEventListener("mouseup", () => {
  movingGuide = null;
});
