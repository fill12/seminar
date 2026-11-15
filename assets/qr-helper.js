// Draws a QR code onto a <canvas>. Needs qrcode.js loaded first.
function drawQR(canvas, text, size) {
  var qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  var n = qr.getModuleCount(), margin = 2, cells = n + margin * 2;
  var scale = Math.max(1, Math.floor(size / cells));
  canvas.width = canvas.height = cells * scale;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111';
  for (var r = 0; r < n; r++)
    for (var c = 0; c < n; c++)
      if (qr.isDark(r, c))
        ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
}
function renderAllQR() {
  document.querySelectorAll('canvas[data-qr]').forEach(function (cv) {
    drawQR(cv, cv.getAttribute('data-qr'), parseInt(cv.getAttribute('data-size') || '300', 10));
  });
}
function downloadQR(canvasId, filename) {
  var cv = document.getElementById(canvasId);
  var big = document.createElement('canvas');
  drawQR(big, cv.getAttribute('data-qr'), 800);
  var a = document.createElement('a');
  a.href = big.toDataURL('image/png');
  a.download = filename;
  a.click();
}
document.addEventListener('DOMContentLoaded', renderAllQR);
