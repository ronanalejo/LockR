import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Circle,
  Text,
} from "react-konva";
import { API_ENDPOINTS } from "../../config/api";
import {
  showLoading,
  closeAlert,
  showSuccess,
  showError,
} from "../../utils/notifications";

const WINGS = ["Left Wing", "Right Wing"];
const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 500;
const FLOOR_PLAN_URL = process.env.PUBLIC_URL + "/images/floor-map.png";

const TOOLS = {
  SELECT: "select",
  RECT: "rect",
  CIRCLE: "circle",
  TEXT: "text",
};

const ModifyLocationModal = ({ locker, floors, onClose, onSaved }) => {
  const [selectedFloor, setSelectedFloor] = useState(
    locker?.floorNumber?.toString() || floors[0],
  );
  const [selectedWing, setSelectedWing] = useState(locker?.wing || WINGS[0]);
  const [bgImage, setBgImage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [activeTool, setActiveTool] = useState(TOOLS.RECT);
  const [annotations, setAnnotations] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [pendingTextPos, setPendingTextPos] = useState(null);
  const [saving, setSaving] = useState(false);

  const stageRef = useRef(null);
  const drawOrigin = useRef({ x: 0, y: 0 });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const loadFloorPlanImage = useCallback(() => {
    setImageLoaded(false);
    setImageError(false);
    setBgImage(null);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = FLOOR_PLAN_URL;
    img.onload = () => {
      setBgImage(img);
      setImageLoaded(true);
    };
    img.onerror = () => {
      setImageError(true);
    };
  }, []);

  useEffect(() => {
    loadFloorPlanImage();
  }, [loadFloorPlanImage]);

  const getRelativePointerPos = (stage) => {
    const pos = stage.getPointerPosition();
    return pos || { x: 0, y: 0 };
  };

  const handleMouseDown = (e) => {
    if (activeTool === TOOLS.SELECT || activeTool === TOOLS.TEXT) return;
    const stage = e.target.getStage();
    const pos = getRelativePointerPos(stage);
    drawOrigin.current = pos;
    setIsDrawing(true);

    if (activeTool === TOOLS.RECT) {
      setCurrentShape({
        type: "rect",
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: "#e53e3e",
        strokeWidth: 2,
        fill: "rgba(229, 62, 62, 0.15)",
      });
    } else if (activeTool === TOOLS.CIRCLE) {
      setCurrentShape({
        type: "circle",
        x: pos.x,
        y: pos.y,
        radius: 0,
        stroke: "#3182ce",
        strokeWidth: 2,
        fill: "rgba(49, 130, 206, 0.15)",
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentShape) return;
    const stage = e.target.getStage();
    const pos = getRelativePointerPos(stage);
    const origin = drawOrigin.current;

    if (activeTool === TOOLS.RECT) {
      setCurrentShape((prev) => ({
        ...prev,
        x: Math.min(pos.x, origin.x),
        y: Math.min(pos.y, origin.y),
        width: Math.abs(pos.x - origin.x),
        height: Math.abs(pos.y - origin.y),
      }));
    } else if (activeTool === TOOLS.CIRCLE) {
      const dx = pos.x - origin.x;
      const dy = pos.y - origin.y;
      setCurrentShape((prev) => ({
        ...prev,
        radius: Math.sqrt(dx * dx + dy * dy),
      }));
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentShape) return;
    setIsDrawing(false);

    const isMinSize =
      currentShape.type === "rect"
        ? currentShape.width > 5 && currentShape.height > 5
        : currentShape.radius > 5;

    if (isMinSize) {
      setAnnotations((prev) => [...prev, { ...currentShape, id: Date.now() }]);
    }
    setCurrentShape(null);
  };

  const handleStageClick = (e) => {
    if (activeTool !== TOOLS.TEXT) return;
    const stage = e.target.getStage();
    const pos = getRelativePointerPos(stage);
    setPendingTextPos(pos);
    setTextInput("");
  };

  const handleTextConfirm = () => {
    if (!textInput.trim() || !pendingTextPos) {
      setPendingTextPos(null);
      return;
    }
    setAnnotations((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "text",
        x: pendingTextPos.x,
        y: pendingTextPos.y,
        text: textInput.trim(),
        fontSize: 14,
        fill: "#1a202c",
        fontStyle: "bold",
      },
    ]);
    setPendingTextPos(null);
    setTextInput("");
  };

  const handleUndo = () => {
    setAnnotations((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setAnnotations([]);
    setCurrentShape(null);
    setPendingTextPos(null);
  };

  const dataURLToBlob = (dataURL) => {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  const handleSave = async () => {
    if (!stageRef.current) return;
    setSaving(true);
    showLoading("Saving...", "Exporting and uploading annotation");

    try {
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 1.5 });
      const blob = dataURLToBlob(dataURL);
      const wing = selectedWing.replace(/\s+/g, "-").toLowerCase();
      const filename = `annotated_floor${selectedFloor}_${wing}_${Date.now()}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      const formData = new FormData();
      formData.append("annotated_image", file);
      formData.append("wing", selectedWing);

      const endpoint = API_ENDPOINTS.admin.annotatedFloorPlan(selectedFloor);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await response.json();
      closeAlert();

      if (!response.ok || !data.success) {
        showError("Save Failed", data.message || "Failed to save annotation.");
        setSaving(false);
        return;
      }

      showSuccess("Updated", "Floor plan updated successfully.");
      if (onSaved) onSaved(data.data);
      onClose();
    } catch (err) {
      closeAlert();
      console.error("ModifyLocationModal save error:", err);
      showError("Error", "An error occurred while saving the annotation.");
    } finally {
      setSaving(false);
    }
  };

  const renderAnnotation = (shape) => {
    if (shape.type === "rect") {
      return (
        <Rect
          key={shape.id}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          fill={shape.fill}
        />
      );
    }
    if (shape.type === "circle") {
      return (
        <Circle
          key={shape.id}
          x={shape.x}
          y={shape.y}
          radius={shape.radius}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          fill={shape.fill}
        />
      );
    }
    if (shape.type === "text") {
      return (
        <Text
          key={shape.id}
          x={shape.x}
          y={shape.y}
          text={shape.text}
          fontSize={shape.fontSize}
          fill={shape.fill}
          fontStyle={shape.fontStyle}
        />
      );
    }
    return null;
  };

  return (
    <div
      className="fpm-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="fpm-modal fpm-modal--location">
        <h3 className="fpm-modal-title">
          Modify Location — {locker?.lockerID || "Locker"}
        </h3>

        <div className="fpm-location-fields">
          <div className="fpm-field">
            <label>Floor</label>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
            >
              {floors.map((f) => (
                <option key={f} value={f}>
                  Floor {f}
                </option>
              ))}
            </select>
          </div>

          <div className="fpm-field">
            <label>Wing</label>
            <select
              value={selectedWing}
              onChange={(e) => setSelectedWing(e.target.value)}
            >
              {WINGS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fpm-annotation-toolbar">
          <span className="fpm-toolbar-label">Tool:</span>
          {[
            { key: TOOLS.SELECT, label: "Select" },
            { key: TOOLS.RECT, label: "Rectangle" },
            { key: TOOLS.CIRCLE, label: "Circle" },
            { key: TOOLS.TEXT, label: "Text" },
          ].map((tool) => (
            <button
              key={tool.key}
              type="button"
              className={`fpm-tool-btn${activeTool === tool.key ? " fpm-tool-btn--active" : ""}`}
              onClick={() => {
                setActiveTool(tool.key);
                setPendingTextPos(null);
              }}
            >
              {tool.label}
            </button>
          ))}
          <div className="fpm-toolbar-divider" />
          <button
            type="button"
            className="fpm-tool-btn fpm-tool-btn--action"
            onClick={handleUndo}
            disabled={annotations.length === 0}
          >
            Undo
          </button>
          <button
            type="button"
            className="fpm-tool-btn fpm-tool-btn--action"
            onClick={handleClear}
            disabled={annotations.length === 0}
          >
            Clear All
          </button>
        </div>

        {activeTool === TOOLS.TEXT && pendingTextPos && (
          <div className="fpm-text-input-row">
            <input
              type="text"
              className="fpm-text-input"
              placeholder="Enter label..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTextConfirm();
                if (e.key === "Escape") setPendingTextPos(null);
              }}
              autoFocus
            />
            <button
              type="button"
              className="fpm-btn fpm-btn--save fpm-btn--sm"
              onClick={handleTextConfirm}
            >
              Add
            </button>
            <button
              type="button"
              className="fpm-btn fpm-btn--cancel fpm-btn--sm"
              onClick={() => setPendingTextPos(null)}
            >
              Cancel
            </button>
          </div>
        )}

        <div className="fpm-canvas-container">
          {imageError ? (
            <div className="fpm-canvas-error">
              <p>floor-map.png not found.</p>
              <p className="fpm-canvas-error-hint">
                Place <code>floor-map.png</code> in{" "}
                <code>frontend/public/images/</code> and refresh.
              </p>
            </div>
          ) : (
            <Stage
              ref={stageRef}
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={handleStageClick}
              style={{
                cursor:
                  activeTool === TOOLS.SELECT
                    ? "default"
                    : activeTool === TOOLS.TEXT
                      ? "text"
                      : "crosshair",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
              }}
            >
              <Layer>
                {imageLoaded && bgImage && (
                  <KonvaImage
                    image={bgImage}
                    x={0}
                    y={0}
                    width={STAGE_WIDTH}
                    height={STAGE_HEIGHT}
                  />
                )}
                {!imageLoaded && (
                  <Text
                    x={STAGE_WIDTH / 2 - 80}
                    y={STAGE_HEIGHT / 2 - 10}
                    text="Loading floor plan..."
                    fontSize={16}
                    fill="#9ca3af"
                  />
                )}
                {annotations.map(renderAnnotation)}
                {currentShape &&
                  renderAnnotation({ ...currentShape, id: "preview" })}
              </Layer>
            </Stage>
          )}
        </div>

        <p className="fpm-annotation-hint">
          {activeTool === TOOLS.TEXT
            ? "Click on the canvas to place a text label."
            : `Click and drag on the canvas to draw a ${activeTool}.`}
        </p>

        <div className="fpm-modal-actions">
          <button
            className="fpm-btn fpm-btn--save"
            onClick={handleSave}
            disabled={saving || imageError || !imageLoaded}
          >
            {saving ? "Updating..." : "Update"}
          </button>
          <button className="fpm-btn fpm-btn--cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModifyLocationModal;
