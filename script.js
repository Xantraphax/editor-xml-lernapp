const imageLoader = document.getElementById("imageLoader");
const imageContainer = document.getElementById("imageContainer");
const baseImage = document.getElementById("baseImage");
const output = document.getElementById("output");
const exportButton = document.getElementById("exportButton");

let currentImageFileName = "";

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

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Lösung";

  div.appendChild(input);
  imageContainer.appendChild(div);

  makeDraggable(div); // Neu: Drag & Drop aktivieren
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

// Drag & Drop Funktion
function makeDraggable(element) {
  let offsetX, offsetY;
  let isDragging = false;

  element.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "INPUT") return; // Nur Rand verschiebbar
    isDragging = true;
    const rect = element.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    element.style.zIndex = "1000";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const containerRect = imageContainer.getBoundingClientRect();
    let x = e.clientX - containerRect.left - offsetX;
    let y = e.clientY - containerRect.top - offsetY;

    // Optional: Begrenzung innerhalb des Containers
    x = Math.max(0, Math.min(containerRect.width - element.offsetWidth, x));
    y = Math.max(0, Math.min(containerRect.height - element.offsetHeight, y));

    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      element.style.zIndex = "1";
    }
  });
}
