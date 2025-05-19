// === Globale Variablen ===
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

let guideMode = null; // 'horizontal', 'vertical' oder null
let guides = []; // Liste der Hilfslinien

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

// === Hilfslinienmodus umschalten ===
guideHorizontal.addEventListener("change", () => {
  if (guideHorizontal.checked) {
    guideMode = "horizontal";
    guideVertical.checked = false;
  } else {
    guideMode = null;
  }
});

guideVertical.addEventListener("change", () => {
  if (guideVertical.checked) {
    guideMode = "vertical";
    guideHorizontal.checked = false;
  } else {
    guideMode = null;
  }
});

// === Klick auf das Bild ===
baseImage.addEventListener("click", (e) => {
  const rect = baseImage.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (guideMode) {
    createGuideLine(x, y, guideMode);
  } else {
    createInputBox(x, y);
  }
});

// === Hilfslinie erstellen ===
function createGuideLine(x, y, orientation) {
  const line = document.createElement("div");
  line.classList.add("guide-line", orientation);
  line.style.position = "absolute";
  line.style.backgroundColor = "red";
  line.style.zIndex = "500";

  if (orientation === "horizontal") {
    line.style.left = "0px";
    line.style.width = "100%";
    line.style.height = "1px";
    line.style.top = `${y}px`;
  } else {
    line.style.top = "0px";
    line.style.height = "100%";
    line.style.width = "1px";
    line.style.left = `${x}px`;
  }

  // Verschieben
  let isDragging = false;
  let offset = 0;

  line.addEventListener("mousedown", (e) => {
    isDragging = true;
    offset = orientation === "horizontal" ? e.clientY - line.getBoundingClientRect().top : e.clientX - line.getBoundingClientRect().left;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const containerRect = imageContainer.getBoundingClientRect();
    if (orientation === "horizontal") {
      let newY = e.clientY - containerRect.top - offset;
      newY = Math.max(0, Math.min(containerRect.height, newY));
      line.style.top = `${newY}px`;
    } else {
      let newX = e.clientX - containerRect.left - offset;
      newX = Math.max(0, Math.min(containerRect.width, newX));
      line.style.left = `${newX}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Löschen durch Doppelklick
  line.addEventListener("dblclick", () => {
    imageContainer.removeChild(line);
    guides = guides.filter((g) => g !== line);
  });

  imageContainer.appendChild(line);
  guides.push(line);
}

// === Eingabefeld erstellen ===
function createInputBox(x, y) {
  const div = document.createElement("div");
  div.classList.add("input-box");
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.style.width = "60px";
  div.style.height = "30px";
  div.style.position = "absolute";
  div.style.zIndex = "1";

  div.innerHTML = `
    <input type="text" placeholder="Lösung" />
    <div class="resize-handle"></div>
    <button class="delete-button">×</button>
  `;

  // Löschen
  div.querySelector(".delete-button").addEventListener("click", () => {
    imageContainer.removeChild(div);
  });

  // Auswahl
  div.addEventListener("click", (e) => {
    e.stopPropagation();
    selectedBox = div;
  });

  imageContainer.appendChild(div);
  makeDraggable(div);
}

// === Exportieren ===
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

// === Drag & Resize ===
function makeDraggable(element) {
  let offsetX, offsetY;
  let isDragging = false;
  let isResizing = false;

  const resizeHandle = element.querySelector(".resize-handle");

  // Dragging
  element.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.classList.contains("resize-handle")) return;

    isDragging = true;
    const rect = element.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    element.style.zIndex = "1000";
    e.preventDefault();
  });

  // Resizing
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
      x = Math.max(0, Math.min(containerRect.width - element.offsetWidth, x));
      y = Math.max(0, Math.min(containerRect.height - element.offsetHeight, y));

      // Snapping an Hilfslinien
      const snapThreshold = 5; // Pixel
      guides.forEach((guide) => {
        const guideRect = guide.getBoundingClientRect();
        if (guide.classList.contains("horizontal")) {
          const guideY = guideRect.top - containerRect.top;
          if (Math.abs(y - guideY) < snapThreshold) {
            y = guideY;
          }
        } else {
          const guideX = guideRect.left - containerRect.left;
          if (Math.abs(x - guideX) < snapThreshold) {
            x = guideX;
          }
        }
      });

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

// === Copy & Paste ===
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && selectedBox) {
    const input = selectedBox.querySelector("input");
    copiedBoxData = {
      value: input.value,
      width: selectedBox.offsetWidth,
      height: selectedBox.offsetHeight,
      left: selectedBox.offsetLeft,
      top: selectedBox.offsetTop,
      zIndex: parseInt(selectedBox.style.zIndex) || 1,
    };
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && copiedBoxData && !pasteInProgress) {
    pasteInProgress = true;

    const newX = copiedBoxData.left + 20;

::contentReference[oaicite:16]{index=16}
 
