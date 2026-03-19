import React, { useState, useEffect } from "react";
import "../../assets/css/pdfViewerModal.css";
import { API_BASE_URL } from "../../config/api";

const PDFViewerModal = ({
  pdfUrl,
  onClose,
  title = "Application Agreement",
}) => {
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState(null);

  const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "bmp"];
  const ext = pdfUrl ? pdfUrl.split(".").pop().toLowerCase().split("?")[0] : "";
  const isImage = imageExtensions.includes(ext);

  let fullPdfUrl = "";
  if (pdfUrl) {
    const cleanPath = pdfUrl.startsWith("uploads/")
      ? pdfUrl.substring(8)
      : pdfUrl;

    const pathParts = cleanPath.split("/");
    const encodedParts = pathParts.map((part) => encodeURIComponent(part));
    const encodedPath = encodedParts.join("/");

    const baseURL = API_BASE_URL.replace(/\/api\/?$/, "");
    fullPdfUrl = `${baseURL}/uploads/${encodedPath}`;
  }

  console.log("PDF URL Debug:", {
    originalPath: pdfUrl,
    fullPdfUrl,
    API_BASE_URL,
  });

  useEffect(() => {
    if (!isImage || !fullPdfUrl) return;
    let objectUrl = null;
    setIsLoading(true);
    setLoadError(false);
    fetch(fullPdfUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch image");
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setIsLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setIsLoading(false);
      });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fullPdfUrl, isImage]);

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

          {pdfUrl && !loadError && !isImage && (
            <iframe
              src={`${fullPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              title={title}
              className="pdf-viewer-iframe"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ display: isLoading ? "none" : "block" }}
            />
          )}

          {pdfUrl && !loadError && isImage && blobUrl && (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "auto",
                background: "#f9fafb",
              }}
            >
              <img
                src={blobUrl}
                alt={title}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
            </div>
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
