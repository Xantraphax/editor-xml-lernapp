const imageLoader = document.getElementById("imageLoader");
const imageContainer = document.getElementById("imageContainer");
const baseImage = document.getElementById("baseImage");
const output = document.getElementById("output");
const exportButton = document.getElementById("exportButton");

let currentImageFileName = "";
let selectedBox = null;
let copiedBoxData = null;
let pasteInProgress = false;



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

baseImage.addEventListener("click", (e) => {
  const rect = baseImage.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  createInputBox(x, y);
});

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
  
  // Event zum Löschen
  div.querySelector(".delete-button").addEventListener("click", () => {
    imageContainer.removeChild(div);
  });
  
  // Auswahl durch Klick
  div.addEventListener("click", (e) => {
    e.stopPropagation(); // verhindert dass baseImage Klick ausgelöst wird
    selectedBox = div;
  });

  imageContainer.appendChild(div);
  makeDraggable(div);
}

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
  
// === Copy & Pasterino ===
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && selectedBox) {
    const input = selectedBox.querySelector("input");
    copiedBoxData = {
      value: input.value,
      width: selectedBox.offsetWidth,
      height: selectedBox.offsetHeight,
      left: selectedBox.offsetLeft,
      top: selectedBox.offsetTop
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
    const originalZ = parseInt(selectedBox.style.zIndex) || 1;
    div.style.zIndex = originalZ + 1;
    div.style.width = `${copiedBoxData.width}px`;
    div.style.height = `${copiedBoxData.height}px`;

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

// Rücksetzen des pasteInProgress Flags nach Tastendruck
document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "v") {
    pasteInProgress = false;
  }
});



}
