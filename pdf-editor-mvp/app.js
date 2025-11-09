// Minimal PDF editor using pdf-lib only
const fileInput = document.getElementById('file-input');
const pdfCanvas = document.getElementById('pdf-canvas');
const annotationCanvas = document.getElementById('annotation-canvas');
const ctxPdf = pdfCanvas.getContext('2d');
const ctxAnn = annotationCanvas.getContext('2d');

let pdfBytes = null;
let pdfDoc = null;
let annotations = []; // {text, x, y}
let scale = 2;

// Resize annotation canvas to match PDF
function resizeCanvas(w, h) {
  pdfCanvas.width = w;
  pdfCanvas.height = h;
  pdfCanvas.style.width = w/scale + 'px';
  pdfCanvas.style.height = h/scale + 'px';
  annotationCanvas.width = w;
  annotationCanvas.height = h;
  annotationCanvas.style.width = w/scale + 'px';
  annotationCanvas.style.height = h/scale + 'px';
}

// Draw annotations on top canvas
function drawAnnotations() {
  ctxAnn.clearRect(0,0,annotationCanvas.width,annotationCanvas.height);
  ctxAnn.fillStyle = 'red';
  ctxAnn.font = '20px sans-serif';
  annotations.forEach(a => {
    ctxAnn.fillText(a.text, a.x, a.y);
  });
}

// Handle file input
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if(file.type !== 'application/pdf') { alert('Only PDFs'); return; }
  pdfBytes = await file.arrayBuffer();
  pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
  
  // Render first page as image
  const firstPage = pdfDoc.getPage(0);
  const { width, height } = firstPage.getSize();
  resizeCanvas(width*scale, height*scale);

  // Render blank background (we cannot render PDF page visually without pdf.js)
  ctxPdf.fillStyle = '#fff';
  ctxPdf.fillRect(0,0,pdfCanvas.width,pdfCanvas.height);
  ctxPdf.strokeStyle = '#000';
  ctxPdf.strokeRect(0,0,pdfCanvas.width,pdfCanvas.height);

  annotations = [];
  drawAnnotations();
});

// Click to add text
document.getElementById('add-text').addEventListener('click', () => {
  const text = prompt('Enter text:');
  if (!text) return;
  const x = 50 + Math.random()*200;
  const y = 50 + Math.random()*200;
  annotations.push({text,x,y});
  drawAnnotations();
});

// Save PDF
document.getElementById('save-pdf').addEventListener('click', async () => {
  if(!pdfDoc) return;
  const firstPage = pdfDoc.getPage(0);
  const { width, height } = firstPage.getSize();

  // Draw text annotations
  annotations.forEach(a => {
    firstPage.drawText(a.text, {
      x: a.x/scale,
      y: height - (a.y/scale),
      size: 20,
      color: PDFLib.rgb(1,0,0)
    });
  });

  const newBytes = await pdfDoc.save();
  const blob = new Blob([newBytes], {type:'application/pdf'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'edited.pdf';
  link.click();
});
