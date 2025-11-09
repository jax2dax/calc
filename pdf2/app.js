/**
 * PDF Editor MVP - Main Application Logic
 * 
 * This application provides client-side PDF editing capabilities using:
 * - PDF.js (v2.16.105) for rendering PDF pages
 * - Fabric.js (v5.3.0) for overlay canvas manipulation
 * - pdf-lib (v1.17.1) for merging annotations into the final PDF
 * 
 * All processing happens in the browser - no server uploads.
 */

// ============================================================================
// Global State Management
// ============================================================================

const AppState = {
    pdfDoc: null,              // PDF.js document object
    pdfBytes: null,            // Original PDF file bytes (ArrayBuffer)
    currentPage: 1,            // Current page number (1-indexed)
    totalPages: 0,             // Total number of pages
    renderScale: 1.5,          // Current zoom/render scale
    fabricCanvas: null,        // Fabric.js canvas instance
    annotations: {},           // Per-page annotations storage {pageNum: {objects: [...]}}
    undoStack: {},             // Per-page undo history
    redoStack: {},             // Per-page redo history
    pdfCanvas: null,           // PDF rendering canvas
    canvasContext: null,       // Canvas 2D context
    originalFileName: ''       // Original PDF filename
};

// ============================================================================
// Initialization & Setup
// ============================================================================

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('PDF Editor MVP Initializing...');
    
    // Set up PDF.js worker
    // Using the stable 2.16.105 version worker from cdnjs
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        console.log('PDF.js worker configured successfully');
    } else {
        showMessage('PDF.js library failed to load. Please refresh the page.', 'error');
        return;
    }
    
    // Initialize event listeners
    setupEventListeners();
    
    // Try to restore previous session from localStorage
    tryRestoreSession();
    
    console.log('Initialization complete');
});

/**
 * Set up all event listeners for UI interactions
 */
function setupEventListeners() {
    // File upload
    const fileInput = document.getElementById('fileInput');
    const uploadBox = document.getElementById('uploadBox');
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('drag-over');
    });
    
    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('drag-over');
    });
    
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // Toolbar buttons
    document.getElementById('btnAddText').addEventListener('click', addTextBox);
    document.getElementById('btnAddImage').addEventListener('click', () => {
        document.getElementById('imageInput').click();
    });
    document.getElementById('btnDelete').addEventListener('click', deleteSelected);
    document.getElementById('btnUndo').addEventListener('click', undo);
    document.getElementById('btnRedo').addEventListener('click', redo);
    document.getElementById('btnPrevPage').addEventListener('click', previousPage);
    document.getElementById('btnNextPage').addEventListener('click', nextPage);
    document.getElementById('btnSave').addEventListener('click', savePDF);
    document.getElementById('btnClear').addEventListener('click', clearPageAnnotations);
    document.getElementById('btnNewFile').addEventListener('click', loadNewFile);
    
    // Image upload
    document.getElementById('imageInput').addEventListener('change', handleImageSelect);
    
    // Zoom control
    document.getElementById('zoomSelect').addEventListener('change', (e) => {
        AppState.renderScale = parseFloat(e.target.value);
        renderCurrentPage();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Handle keyboard shortcuts for common actions
 */
function handleKeyboardShortcuts(e) {
    // Only process shortcuts when editor is visible
    if (document.getElementById('editorSection').style.display === 'none') return;
    
    // Ctrl+Z: Undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }
    
    // Ctrl+Y or Ctrl+Shift+Z: Redo
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
    }
    
    // Ctrl+T: Add text
    if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        addTextBox();
    }
    
    // Delete or Backspace: Delete selected object
    if ((e.key === 'Delete' || e.key === 'Backspace') && AppState.fabricCanvas) {
        const activeObject = AppState.fabricCanvas.getActiveObject();
        if (activeObject && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            deleteSelected();
        }
    }
}

// ============================================================================
// File Handling
// ============================================================================

/**
 * Handle file selection from input
 */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

/**
 * Process and load a PDF file
 */
async function handleFile(file) {
    // Validate file type
    if (file.type !== 'application/pdf') {
        showMessage('Please select a valid PDF file.', 'error');
        return;
    }
    
    // Warn about large files
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 30) {
        showMessage(
            `Warning: Large file (${fileSizeMB.toFixed(1)} MB). Processing may be slow. ` +
            `Consider splitting the PDF for better performance.`,
            'warning',
            5000
        );
    }
    
    AppState.originalFileName = file.name;
    
    try {
        showMessage('Loading PDF...', 'info');
        
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        AppState.pdfBytes = arrayBuffer;
        
        // Load PDF with PDF.js
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        AppState.pdfDoc = await loadingTask.promise;
        AppState.totalPages = AppState.pdfDoc.numPages;
        AppState.currentPage = 1;
        
        console.log(`PDF loaded: ${AppState.totalPages} pages`);
        
        // Initialize annotations storage for all pages
        AppState.annotations = {};
        AppState.undoStack = {};
        AppState.redoStack = {};
        
        // Show editor UI
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('editorSection').style.display = 'block';
        
        // Render first page
        await renderCurrentPage();
        
        updatePageInfo();
        showMessage('PDF loaded successfully!', 'success');
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        showMessage(`Failed to load PDF: ${error.message}`, 'error');
    }
}

/**
 * Load a new PDF file
 */
function loadNewFile() {
    if (confirm('Load a new PDF? Current annotations will be lost unless you save first.')) {
        // Reset state
        AppState.pdfDoc = null;
        AppState.pdfBytes = null;
        AppState.annotations = {};
        AppState.undoStack = {};
        AppState.redoStack = {};
        
        // Clear localStorage
        localStorage.removeItem('pdfEditorAnnotations');
        
        // Show upload section
        document.getElementById('editorSection').style.display = 'none';
        document.getElementById('uploadSection').style.display = 'block';
        
        // Reset file input
        document.getElementById('fileInput').value = '';
    }
}

// ============================================================================
// PDF Rendering
// ============================================================================

/**
 * Render the current page to the canvas
 */
async function renderCurrentPage() {
    if (!AppState.pdfDoc) return;
    
    try {
        // Save current page annotations before switching
        if (AppState.fabricCanvas) {
            saveCurrentPageAnnotations();
        }
        
        // Get the page
        const page = await AppState.pdfDoc.getPage(AppState.currentPage);
        
        // Calculate viewport with current scale
        const viewport = page.getViewport({ scale: AppState.renderScale });
        
        // Get or create PDF canvas
        AppState.pdfCanvas = document.getElementById('pdfCanvas');
        AppState.canvasContext = AppState.pdfCanvas.getContext('2d');
        
        // Set canvas dimensions
        AppState.pdfCanvas.width = viewport.width;
        AppState.pdfCanvas.height = viewport.height;
        
        // Render PDF page
        const renderContext = {
            canvasContext: AppState.canvasContext,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Initialize or recreate Fabric canvas overlay
        initializeFabricCanvas(viewport.width, viewport.height);
        
        // Restore annotations for this page
        restorePageAnnotations();
        
        console.log(`Rendered page ${AppState.currentPage} at scale ${AppState.renderScale}`);
        
    } catch (error) {
        console.error('Error rendering page:', error);
        showMessage(`Failed to render page: ${error.message}`, 'error');
    }
}

/**
 * Initialize or recreate the Fabric.js overlay canvas
 */
function initializeFabricCanvas(width, height) {
    const fabricCanvasElement = document.getElementById('fabricCanvas');
    
    // Dispose existing canvas if any
    if (AppState.fabricCanvas) {
        AppState.fabricCanvas.dispose();
    }
    
    // Create new Fabric canvas
    AppState.fabricCanvas = new fabric.Canvas('fabricCanvas', {
        width: width,
        height: height,
        backgroundColor: 'transparent',
        selection: true,
        preserveObjectStacking: true
    });
    
    // Enable undo/redo tracking
    AppState.fabricCanvas.on('object:added', saveUndoState);
    AppState.fabricCanvas.on('object:modified', saveUndoState);
    AppState.fabricCanvas.on('object:removed', saveUndoState);
    
    console.log(`Fabric canvas initialized: ${width}x${height}`);
}

// ============================================================================
// Page Navigation
// ============================================================================

/**
 * Go to previous page
 */
function previousPage() {
    if (AppState.currentPage > 1) {
        AppState.currentPage--;
        renderCurrentPage();
        updatePageInfo();
    }
}

/**
 * Go to next page
 */
function nextPage() {
    if (AppState.currentPage < AppState.totalPages) {
        AppState.currentPage++;
        renderCurrentPage();
        updatePageInfo();
    }
}

/**
 * Update page information display
 */
function updatePageInfo() {
    const pageInfo = document.getElementById('pageInfo');
    pageInfo.textContent = `Page ${AppState.currentPage} of ${AppState.totalPages}`;
    
    // Update button states
    document.getElementById('btnPrevPage').disabled = AppState.currentPage === 1;
    document.getElementById('btnNextPage').disabled = AppState.currentPage === AppState.totalPages;
}

// ============================================================================
// Annotation Operations
// ============================================================================

/**
 * Add a text box to the canvas
 */
function addTextBox() {
    if (!AppState.fabricCanvas) return;
    
    const textbox = new fabric.Textbox('Double-click to edit', {
        left: 100,
        top: 100,
        width: 200,
        fontSize: 18,
        fontFamily: 'Helvetica',
        fill: '#000000',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: 5
    });
    
    AppState.fabricCanvas.add(textbox);
    AppState.fabricCanvas.setActiveObject(textbox);
    AppState.fabricCanvas.renderAll();
    
    console.log('Text box added');
}

/**
 * Handle image file selection
 */
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file || !AppState.fabricCanvas) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        fabric.Image.fromURL(event.target.result, (img) => {
            // Scale image to reasonable size
            const maxWidth = AppState.pdfCanvas.width * 0.3;
            const maxHeight = AppState.pdfCanvas.height * 0.3;
            
            if (img.width > maxWidth || img.height > maxHeight) {
                const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
                img.scale(scale);
            }
            
            img.set({
                left: 100,
                top: 100
            });
            
            AppState.fabricCanvas.add(img);
            AppState.fabricCanvas.setActiveObject(img);
            AppState.fabricCanvas.renderAll();
            
            console.log('Image added to canvas');
        });
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
}

/**
 * Delete the currently selected object
 */
function deleteSelected() {
    if (!AppState.fabricCanvas) return;
    
    const activeObject = AppState.fabricCanvas.getActiveObject();
    if (activeObject) {
        AppState.fabricCanvas.remove(activeObject);
        AppState.fabricCanvas.renderAll();
        console.log('Object deleted');
    }
}

/**
 * Clear all annotations on the current page
 */
function clearPageAnnotations() {
    if (!AppState.fabricCanvas) return;
    
    if (confirm('Clear all annotations on this page?')) {
        AppState.fabricCanvas.clear();
        AppState.fabricCanvas.backgroundColor = 'transparent';
        AppState.fabricCanvas.renderAll();
        delete AppState.annotations[AppState.currentPage];
        console.log(`Page ${AppState.currentPage} annotations cleared`);
    }
}

// ============================================================================
// Undo/Redo System
// ============================================================================

/**
 * Save current canvas state for undo/redo
 */
function saveUndoState() {
    const pageKey = AppState.currentPage;
    
    // Initialize stacks if needed
    if (!AppState.undoStack[pageKey]) AppState.undoStack[pageKey] = [];
    if (!AppState.redoStack[pageKey]) AppState.redoStack[pageKey] = [];
    
    // Save current state
    const state = JSON.stringify(AppState.fabricCanvas.toJSON());
    AppState.undoStack[pageKey].push(state);
    
    // Limit undo stack to 50 states
    if (AppState.undoStack[pageKey].length > 50) {
        AppState.undoStack[pageKey].shift();
    }
    
    // Clear redo stack on new action
    AppState.redoStack[pageKey] = [];
}

/**
 * Undo the last action
 */
function undo() {
    const pageKey = AppState.currentPage;
    
    if (!AppState.undoStack[pageKey] || AppState.undoStack[pageKey].length === 0) {
        console.log('Nothing to undo');
        return;
    }
    
    // Save current state to redo stack
    if (!AppState.redoStack[pageKey]) AppState.redoStack[pageKey] = [];
    AppState.redoStack[pageKey].push(JSON.stringify(AppState.fabricCanvas.toJSON()));
    
    // Restore previous state
    const previousState = AppState.undoStack[pageKey].pop();
    AppState.fabricCanvas.loadFromJSON(previousState, () => {
        AppState.fabricCanvas.renderAll();
        console.log('Undo performed');
    });
}

/**
 * Redo the last undone action
 */
function redo() {
    const pageKey = AppState.currentPage;
    
    if (!AppState.redoStack[pageKey] || AppState.redoStack[pageKey].length === 0) {
        console.log('Nothing to redo');
        return;
    }
    
    // Save current state to undo stack
    AppState.undoStack[pageKey].push(JSON.stringify(AppState.fabricCanvas.toJSON()));
    
    // Restore redo state
    const redoState = AppState.redoStack[pageKey].pop();
    AppState.fabricCanvas.loadFromJSON(redoState, () => {
        AppState.fabricCanvas.renderAll();
        console.log('Redo performed');
    });
}

// ============================================================================
// Annotation Persistence
// ============================================================================

/**
 * Save current page annotations to memory
 */
function saveCurrentPageAnnotations() {
    if (!AppState.fabricCanvas) return;
    
    const json = AppState.fabricCanvas.toJSON();
    AppState.annotations[AppState.currentPage] = json;
    
    // Also save to localStorage
    try {
        localStorage.setItem('pdfEditorAnnotations', JSON.stringify(AppState.annotations));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
    
    console.log(`Annotations saved for page ${AppState.currentPage}`);
}

/**
 * Restore annotations for the current page
 */
function restorePageAnnotations() {
    if (!AppState.fabricCanvas) return;
    
    const pageAnnotations = AppState.annotations[AppState.currentPage];
    
    if (pageAnnotations) {
        AppState.fabricCanvas.loadFromJSON(pageAnnotations, () => {
            AppState.fabricCanvas.renderAll();
            console.log(`Annotations restored for page ${AppState.currentPage}`);
        });
    } else {
        AppState.fabricCanvas.clear();
        AppState.fabricCanvas.backgroundColor = 'transparent';
        AppState.fabricCanvas.renderAll();
    }
}

/**
 * Try to restore previous session from localStorage
 */
function tryRestoreSession() {
    try {
        const saved = localStorage.getItem('pdfEditorAnnotations');
        if (saved) {
            AppState.annotations = JSON.parse(saved);
            console.log('Previous session annotations restored from localStorage');
        }
    } catch (e) {
        console.warn('Failed to restore from localStorage:', e);
    }
}

// ============================================================================
// PDF Saving with pdf-lib
// ============================================================================

/**
 * Save the edited PDF with annotations
 */
async function savePDF() {
    if (!AppState.pdfBytes || !AppState.pdfDoc) {
        showMessage('No PDF loaded', 'error');
        return;
    }
    
    try {
        showMessage('Generating PDF...', 'info');
        
        // Save current page annotations
        saveCurrentPageAnnotations();
        
        // Load the original PDF with pdf-lib
        const pdfDoc = await PDFLib.PDFDocument.load(AppState.pdfBytes);
        const pages = pdfDoc.getPages();
        
        // Embed Helvetica font (built-in, no embedding needed)
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        
        // Process each page that has annotations
        for (const [pageNum, pageAnnotations] of Object.entries(AppState.annotations)) {
            const pageIndex = parseInt(pageNum) - 1;
            if (pageIndex < 0 || pageIndex >= pages.length) continue;
            
            const page = pages[pageIndex];
            const { width: pageWidth, height: pageHeight } = page.getSize();
            
            // Get the page object to render at the same scale
            const pdfPage = await AppState.pdfDoc.getPage(parseInt(pageNum));
            const viewport = pdfPage.getViewport({ scale: AppState.renderScale });
            
            // Process each annotation object
            if (pageAnnotations.objects) {
                for (const obj of pageAnnotations.objects) {
                    try {
                        if (obj.type === 'textbox' || obj.type === 'text') {
                            await drawTextObject(page, obj, viewport, font, pageHeight);
                        } else if (obj.type === 'image') {
                            await drawImageObject(pdfDoc, page, obj, viewport, pageHeight);
                        }
                    } catch (error) {
                        console.error(`Error processing object on page ${pageNum}:`, error);
                    }
                }
            }
        }
        
        // Generate PDF bytes
        const pdfBytes = await pdfDoc.save();
        
        // Download the file
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const filename = AppState.originalFileName.replace('.pdf', '_edited.pdf');
        saveAs(blob, filename);
        
        showMessage('PDF saved successfully!', 'success');
        console.log('PDF saved with annotations');
        
    } catch (error) {
        console.error('Error saving PDF:', error);
        showMessage(`Failed to save PDF: ${error.message}`, 'error');
    }
}

/**
 * Draw a text object onto the PDF page
 * 
 * Coordinate conversion: Fabric.js uses top-left origin (y increases downward),
 * PDF uses bottom-left origin (y increases upward). We must convert coordinates.
 */
async function drawTextObject(page, textObj, viewport, font, pageHeight) {
    if (!textObj.text) return;
    
    // Get text properties
    const text = textObj.text;
    const fontSize = textObj.fontSize || 18;
    const color = hexToRgb(textObj.fill || '#000000');
    
    // Convert coordinates from canvas to PDF
    // Fabric coordinates are in canvas pixels with top-left origin
    // PDF coordinates are in points (72 DPI) with bottom-left origin
    
    const fabricLeft = textObj.left || 0;
    const fabricTop = textObj.top || 0;
    const textHeight = textObj.height || fontSize;
    
    // Scale factor from rendered canvas to PDF points
    const scale = pageHeight / viewport.height;
    
    // Convert X (left) coordinate - straightforward scaling
    const pdfX = fabricLeft * scale;
    
    // Convert Y (top) coordinate - flip origin and scale
    // PDF Y = pageHeight - (fabricTop + textHeight) * scale
    const pdfY = pageHeight - (fabricTop + textHeight) * scale;
    
    // Draw text
    page.drawText(text, {
        x: pdfX,
        y: pdfY,
        size: fontSize * scale,
        font: font,
        color: PDFLib.rgb(color.r, color.g, color.b)
    });
    
    console.log(`Text drawn at (${pdfX.toFixed(2)}, ${pdfY.toFixed(2)})`);
}

/**
 * Draw an image object onto the PDF page
 */
async function drawImageObject(pdfDoc, page, imageObj, viewport, pageHeight) {
    if (!imageObj.src) return;
    
    try {
        // Fetch image data
        const imageBytes = await fetch(imageObj.src).then(res => res.arrayBuffer());
        
        // Embed image (detect type from data URL)
        let image;
        if (imageObj.src.includes('image/png')) {
            image = await pdfDoc.embedPng(imageBytes);
        } else {
            image = await pdfDoc.embedJpg(imageBytes);
        }
        
        // Get image dimensions
        const imgWidth = (imageObj.width || image.width) * (imageObj.scaleX || 1);
        const imgHeight = (imageObj.height || image.height) * (imageObj.scaleY || 1);
        
        // Convert coordinates
        const fabricLeft = imageObj.left || 0;
        const fabricTop = imageObj.top || 0;
        
        const scale = pageHeight / viewport.height;
        const pdfX = fabricLeft * scale;
        const pdfY = pageHeight - (fabricTop + imgHeight) * scale;
        
        // Draw image
        page.drawImage(image, {
            x: pdfX,
            y: pdfY,
            width: imgWidth * scale,
            height: imgHeight * scale
        });
        
        console.log(`Image drawn at (${pdfX.toFixed(2)}, ${pdfY.toFixed(2)})`);
        
    } catch (error) {
        console.error('Error drawing image:', error);
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert hex color to RGB object
 */
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    return { r, g, b };
}

/**
 * Show a status message to the user
 */
function showMessage(text, type = 'info', duration = 3000) {
    const messageDiv = document.getElementById('statusMessage');
    
    // Remove existing classes
    messageDiv.className = 'status-message';
    
    // Add type class
    messageDiv.classList.add(type);
    
    // Set message text
    messageDiv.textContent = text;
    
    // Auto-hide after duration
    if (duration > 0) {
        setTimeout(() => {
            messageDiv.className = 'status-message';
            messageDiv.textContent = '';
        }, duration);
    }
    
    console.log(`[${type.toUpperCase()}] ${text}`);
}

// ============================================================================
// Coordinate Conversion Documentation
// ============================================================================

/**
 * COORDINATE SYSTEM CONVERSION REFERENCE
 * 
 * This application handles three coordinate systems:
 * 
 * 1. FABRIC.JS CANVAS (Overlay Editor):
 *    - Origin: Top-left corner (0, 0)
 *    - Units: Pixels
 *    - Y-axis: Increases downward
 *    - Dimensions: Match rendered PDF canvas dimensions
 * 
 * 2. PDF RENDERING CANVAS:
 *    - Origin: Top-left corner (0, 0)
 *    - Units: Pixels
 *    - Y-axis: Increases downward
 *    - Dimensions: pageWidth * renderScale, pageHeight * renderScale
 * 
 * 3. PDF DOCUMENT (pdf-lib):
 *    - Origin: Bottom-left corner (0, 0)
 *    - Units: Points (1 point = 1/72 inch)
 *    - Y-axis: Increases upward
 *    - Dimensions: Original PDF page dimensions in points
 * 
 * CONVERSION FORMULAS:
 * 
 * From Fabric Canvas to PDF Points:
 *   scaleFactor = pdfPageHeight / canvasHeight
 *   pdfX = fabricLeft * scaleFactor
 *   pdfY = pdfPageHeight - (fabricTop + objectHeight) * scaleFactor
 * 
 * EXAMPLE WITH NUMBERS:
 *   Given:
 *     - PDF page: 612 x 792 points (US Letter)
 *     - Render scale: 1.5
 *     - Canvas: 918 x 1188 pixels (612 * 1.5, 792 * 1.5)
 *     - Fabric object at: left=100, top=50, height=30 pixels
 *   
 *   Calculate:
 *     scaleFactor = 792 / 1188 = 0.6667
 *     pdfX = 100 * 0.6667 = 66.67 points
 *     pdfY = 792 - (50 + 30) * 0.6667 = 738.67 points
 * 
 * This ensures annotations appear in the same relative position regardless
 * of the zoom level used when editing.
 */

console.log('PDF Editor MVP loaded successfully');