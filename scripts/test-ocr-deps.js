const CANVAS_MODULE_NAME = ["@napi-rs", "canvas"].join("/");

async function loadCanvasModule() {
  try {
    const { createRequire } = await import("node:module");
    const requireFunc = createRequire(__filename);
    const canvas = requireFunc(CANVAS_MODULE_NAME);
    console.log("Canvas module loaded successfully");
    const c = canvas.createCanvas(100, 100);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 100, 100);
    console.log("Canvas operation successful");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Canvas module load failed:", message);
  }
}

async function loadTesseract() {
  try {
    const tesseract = await import("tesseract.js");
    if (typeof tesseract.createWorker === "function") {
      console.log("Tesseract worker factory available");
    }
    console.log("Tesseract module loaded successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Tesseract module load failed:", message);
  }
}

async function main() {
  await loadCanvasModule();
  await loadTesseract();
}

void main();
