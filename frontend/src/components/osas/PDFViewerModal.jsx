import React, { useState } from "react";
import "../../assets/css/pdfViewerModal.css";
import { API_BASE_URL } from "../../config/api";

const PDFViewerModal = ({
  pdfUrl,
  onClose,
  title = "Application Agreement",
}) => {
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  let fullPdfUrl = "";
  if (pdfUrl) {
    const cleanPath = pdfUrl.startsWith("uploads/")
      ? pdfUrl.substring(8)
      : pdfUrl;

    const pathParts = cleanPath.split("/");
    const encodedParts = pathParts.map((part) => encodeURIComponent(part));
    const encodedPath = encodedParts.join("/");

    fullPdfUrl = `${API_BASE_URL}/uploads/${encodedPath}`;
  }

  console.log("PDF URL Debug:", {
    originalPath: pdfUrl,
    fullPdfUrl,
    API_BASE_URL,
  });

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setLoadError(true);
    setIsLoading(false);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(fullPdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfUrl?.split("/").pop() || "application-agreement.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(fullPdfUrl, "_blank");
    }
  };

  const handleOpenNewTab = () => {
    window.open(fullPdfUrl, "_blank");
  };

  return (
    <div className="pdf-modal-overlay" onClick={onClose}>
      <div className="pdf-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <h2 className="pdf-modal-title">{title}</h2>
          <div className="pdf-modal-actions">
            <button
              className="pdf-download-btn"
              onClick={handleOpenNewTab}
              title="Open in New Tab"
            >
              Open in New Tab
            </button>
            <button
              className="pdf-download-btn"
              onClick={handleDownload}
              title="Download PDF"
            >
              Download
            </button>
            <button className="pdf-close-btn" onClick={onClose} title="Close">
              ×
            </button>
          </div>
        </div>
        <div className="pdf-modal-body">
          {isLoading && !loadError && (
            <div className="pdf-loading">
              <div className="pdf-loading-spinner"></div>
              <p>Loading PDF...</p>
            </div>
          )}

          {loadError && (
            <div className="pdf-error">
              <div className="pdf-error-icon">⚠️</div>
              <h3>Unable to Display PDF</h3>
              <p>The PDF cannot be displayed in the browser.</p>
              <div className="pdf-error-actions">
                <button className="pdf-error-btn" onClick={handleOpenNewTab}>
                  Open in New Tab
                </button>
                <button className="pdf-error-btn" onClick={handleDownload}>
                  Download PDF
                </button>
              </div>
              <p className="pdf-error-path">Path: {pdfUrl}</p>
              <p className="pdf-error-path">Full URL: {fullPdfUrl}</p>
            </div>
          )}

          {pdfUrl && !loadError && (
            <iframe
              src={`${fullPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              title={title}
              className="pdf-viewer-iframe"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ display: isLoading ? "none" : "block" }}
            />
          )}

          {!pdfUrl && (
            <div className="pdf-no-content">
              <p>No PDF available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewerModal;
