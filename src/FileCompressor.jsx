import React, { useState, useCallback } from "react";
import imageCompression from "browser-image-compression"; // Library to compress images
import { PDFDocument } from "pdf-lib"; // Library to work with PDFs
import JSZip from "jszip"; // Library to create ZIP files

export default function FileCompressor() {
  // Keep track of files (both original + compressed version)
  const [files, setFiles] = useState([]); // [{ original: File, compressed: Blob }]
  const [isProcessing, setIsProcessing] = useState(false); // Show loading message

  /**
   * Handle and compress selected files
   */
  const handleFiles = async (selectedFiles) => {
    setIsProcessing(true); // Show "loading"
    const results = [];

    for (const file of selectedFiles) {
      try {
        let compressedBlob;

        // ✅ If file is an image → compress it
        if (file.type.startsWith("image/")) {
          const options = {
            maxSizeMB: 1, // Max size of compressed file
            maxWidthOrHeight: 1200, // Resize large images
            useWebWorker: true, // Faster compression
          };
          compressedBlob = await imageCompression(file, options);
        }
        // ✅ If file is a PDF → optimize it
        else if (file.type === "application/pdf") {
          const arrayBuffer = await file.arrayBuffer(); // Read file as binary
          const pdfDoc = await PDFDocument.load(arrayBuffer); // Load PDF
          // Save PDF with optimization
          const optimizedPdf = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
          });
          compressedBlob = new Blob([optimizedPdf], { type: "application/pdf" });
        }
        // ❌ If file is not supported → skip
        else {
          console.warn(`Skipping unsupported file: ${file.name}`);
          continue;
        }

        // Add result to our state array
        results.push({ original: file, compressed: compressedBlob });
      } catch (err) {
        console.error(`Compression failed for ${file.name}:`, err);
      }
    }

    // Save compressed results to state
    setFiles(results);
    setIsProcessing(false); // Hide loading message
  };

  /**
   * Handle file selection from input
   */
  const handleFileInput = (e) => handleFiles(Array.from(e.target.files));

  /**
   * Handle drag & drop
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault(); // Prevent browser from opening file
    handleFiles(Array.from(e.dataTransfer.files)); // Compress dropped files
  }, []);

  const handleDragOver = (e) => e.preventDefault(); // Allow dropping

  /**
   * Download files (either single file OR multiple files as ZIP)
   */
  const downloadAll = async () => {
    if (files.length === 0) return;

    if (files.length === 1) {
      // 🟢 Single file → download directly
      const url = URL.createObjectURL(files[0].compressed);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compressed-${files[0].original.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // 🟢 Multiple files → create ZIP
      const zip = new JSZip();
      files.forEach((f) => {
        zip.file(`compressed-${f.original.name}`, f.compressed);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "compressed-files.zip";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      {/* Main Container */}
      <div className="container" style={{ maxWidth: "600px" }}>
        <h1 className="text-center">File Compressor</h1>
        <p className="text-center mb-6">Automatically compresses multiple uploaded files into a single ZIP file</p>

        {/* Drag & Drop + File Input */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border border-secondary border-2 rounded p-4 text-center bg-light"
          style={{ cursor: "pointer" }}
        >
          <p className="mb-1 text-muted">Drag & Drop Images or PDFs here</p>
          <p className="small text-secondary">or click below</p>

          {/* File Input */}
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleFileInput}
            className="form-control mt-2"
          />
        </div>

        {/* Show loading message */}
        {isProcessing && (
          <div className="alert alert-info mt-3 text-center">
            Compressing files... please wait.
          </div>
        )}

        {/* Show compressed file list */}
        {files.length > 0 && (
          <div className="card mt-4 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">Compressed Files</h5>

              {/* File List */}
              <ul className="list-group mb-3">
                {files.map((f, idx) => (
                  <li
                    key={idx}
                    className="list-group-item d-flex justify-content-between"
                  >
                    <span>{f.original.name}</span>
                    {/* Show compressed size in KB */}
                    <span className="text-success">
                      {(f.compressed.size / 1024).toFixed(1)} KB
                    </span>
                  </li>
                ))}
              </ul>

              {/* Download Button */}
              <button onClick={downloadAll} className="btn btn-primary w-100">
                {files.length > 1 ? "Download as ZIP" : "Download File"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
