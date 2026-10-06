import { useEffect } from "react";

/**
 * Attaches freehand mouse/touch drawing to a <canvas>. Used for both the
 * doctor's digital signature pad and the handwritten-prescription sketch pad.
 */
export function useDrawingPad(canvasRef, active) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#0d1b2a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    let drawing = false;
    let lx = 0;
    let ly = 0;

    function onDown(e) {
      drawing = true;
      const rect = canvas.getBoundingClientRect();
      lx = e.clientX - rect.left;
      ly = e.clientY - rect.top;
    }
    function onMove(e) {
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(x, y);
      ctx.stroke();
      lx = x;
      ly = y;
    }
    function onUp() {
      drawing = false;
    }
    function onTouchStart(e) {
      if (e.touches.length === 1) {
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        lx = e.touches[0].clientX - rect.left;
        ly = e.touches[0].clientY - rect.top;
        e.preventDefault();
      }
    }
    function onTouchMove(e) {
      if (!drawing || e.touches.length !== 1) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(x, y);
      ctx.stroke();
      lx = x;
      ly = y;
      e.preventDefault();
    }
    function onTouchEnd() {
      drawing = false;
    }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onTouchStart);
    canvas.addEventListener("touchmove", onTouchMove);
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [canvasRef, active]);
}

export function clearCanvas(canvasRef) {
  const canvas = canvasRef.current;
  if (!canvas) return;
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

export function isCanvasBlank(canvasRef) {
  const canvas = canvasRef.current;
  if (!canvas) return true;
  const blank = document.createElement("canvas");
  blank.width = canvas.width;
  blank.height = canvas.height;
  return canvas.toDataURL() === blank.toDataURL();
}
