import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Sparkles, Upload, Check, RefreshCw, Layers, ShieldCheck, Flame, Video, VideoOff } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../Toast";

export default function MealScanModal({ onClose, onLog, initialCategory = "Breakfast", targetDate }) {
  const [selectedImage, setSelectedImage] = useState(null); // Data URL string
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [logging, setLogging] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [mealCategory, setMealCategory] = useState(initialCategory);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const toast = useToast();

  // Stop live camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Bind camera stream to video element when DOM mounts
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error("Video play error:", e));
    }
  }, [cameraActive, cameraStream]);

  const startCamera = async () => {
    try {
      setSelectedImage(null);
      setScanResult(null);
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (e1) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      if (toast?.error) toast.error("Could not access camera: " + (err.message || "Device unavailable"));
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const MAX_SIZE = 800;
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;

    if (width > height) {
      if (width > MAX_SIZE) {
        height = Math.round((height * MAX_SIZE) / width);
        width = MAX_SIZE;
      }
    } else {
      if (height > MAX_SIZE) {
        width = Math.round((width * MAX_SIZE) / height);
        height = MAX_SIZE;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    const capturedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();
    setSelectedImage(capturedDataUrl);
    runVisionScan(capturedDataUrl);
  };

  const runVisionScan = async (imageToScan) => {
    const targetImage = imageToScan || selectedImage;
    if (!targetImage) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.scanMealVision(targetImage, false);
      if (res && res.success) {
        setScanResult(res);
      } else {
        if (toast?.error) toast.error("Vision scan failed to parse meal");
      }
    } catch (err) {
      console.error("Meal Vision Scan Error:", err);
      if (toast?.error) toast.error(err.message || "Failed to scan meal with Groq Vision");
    } finally {
      setScanning(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file) => {
    if (!file.type.startsWith("image/")) {
      if (toast?.error) toast.error("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }

    stopCamera();
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setSelectedImage(resizedDataUrl);
        setScanResult(null);

        // Auto-trigger scan instantly on image selection
        runVisionScan(resizedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleLogMeal = async () => {
    if (!scanResult || !scanResult.totals) return;
    setLogging(true);
    try {
      await api.logNutrition({
        meal_name: scanResult.meal_name || "Vision Scanned Meal",
        meal_category: mealCategory,
        amount: 1,
        unit: "serving",
        calories: scanResult.totals.calories || 0,
        protein_g: scanResult.totals.protein_g || 0,
        carbs_g: scanResult.totals.carbs_g || 0,
        fat_g: scanResult.totals.fat_g || 0,
        fiber_g: scanResult.totals.fiber_g || 0,
        date: targetDate || undefined
      });
      if (toast?.success) toast.success("Meal logged successfully!");
      if (onLog) onLog();
      onClose();
    } catch (err) {
      console.error("Failed to log meal:", err);
      if (toast?.error) toast.error("Failed to log meal");
    } finally {
      setLogging(false);
    }
  };

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        position: "fixed", 
        inset: 0, 
        zIndex: 9999, 
        background: "rgba(0, 0, 0, 0.85)", 
        backdropFilter: "blur(18px)", 
        WebkitBackdropFilter: "blur(18px)",
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        padding: 16
      }}
    >
      <div className="card modal-content" style={{ 
        maxWidth: 460, 
        width: "100%", 
        maxHeight: "88vh", 
        overflowY: "auto",
        borderRadius: 24, 
        border: "1px solid rgba(0, 242, 254, 0.4)",
        background: "#0d1117",
        padding: 20,
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ 
              width: 36, height: 36, borderRadius: 10, 
              background: "linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(186, 85, 211, 0.2))",
              border: "1px solid rgba(0, 242, 254, 0.3)",
              display: "flex", justifyContent: "center", alignItems: "center", color: "#00f2fe"
            }}>
              <Camera size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#fff", letterSpacing: "-0.3px" }}>
                Aura Vision Transformer
              </h2>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <ShieldCheck size={12} color="#00f2fe" /> Live Camera Vision • Groq Model: {scanResult?.model_used || "qwen/qwen3.6-27b"}
              </div>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        {/* Live Camera Viewfinder */}
        {cameraActive && (
          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{
              position: "relative", borderRadius: 16, overflow: "hidden",
              border: "2px solid #00f2fe", maxHeight: 300, background: "#000",
              display: "flex", justifyContent: "center", alignItems: "center"
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: "100%", height: "100%", objectFit: "cover", maxHeight: 300 }} 
              />

              {/* Target reticle / vision frame overlay */}
              <div style={{
                position: "absolute", inset: 24, border: "2px dashed rgba(0, 242, 254, 0.6)",
                borderRadius: 12, pointerEvents: "none", display: "flex", justifyContent: "center", alignItems: "center"
              }}>
                <span style={{ fontSize: 11, color: "#00f2fe", background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 6, fontWeight: 700 }}>
                  Center meal in camera viewfinder
                </span>
              </div>
            </div>

            {/* Camera Actions Bar */}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                onClick={stopCamera}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 6
                }}
              >
                <VideoOff size={15} /> Cancel Camera
              </button>
              <button
                onClick={capturePhoto}
                style={{
                  flex: 2, padding: "12px", borderRadius: 12,
                  background: "linear-gradient(135deg, #00f2fe 0%, #ba55d3 100%)",
                  border: "none", color: "#fff", fontWeight: 800, fontSize: 13,
                  cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                  boxShadow: "0 4px 15px rgba(0, 242, 254, 0.4)"
                }}
              >
                <Camera size={18} /> Snap Photo & Run AI Vision Scan
              </button>
            </div>
          </div>
        )}

        {/* Initial Selection & Upload Options */}
        {!cameraActive && !selectedImage && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            {/* Primary Live Camera Button */}
            <button
              onClick={startCamera}
              style={{
                width: "100%", padding: "20px", borderRadius: 16,
                background: "linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(186, 85, 211, 0.15) 100%)",
                border: "2px solid #00f2fe", color: "#fff", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                transition: "all 0.2s ease"
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                display: "flex", justifyContent: "center", alignItems: "center", color: "#000"
              }}>
                <Camera size={26} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                Open Live Vision Camera
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                Point camera at meal & snap photo for instant AI Vision Transformer analysis
              </span>
            </button>

            {/* Alternative File Pickers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {/* Native Device Camera Input (Mobile fallback) */}
              <input 
                type="file" 
                ref={cameraInputRef} 
                accept="image/*" 
                capture="environment"
                style={{ display: "none" }} 
                onChange={handleFileChange} 
              />
              <button
                onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                style={{
                  padding: "14px", borderRadius: 12,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 6
                }}
              >
                <Video size={16} color="#00f2fe" /> Device Camera
              </button>

              {/* Upload File Input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                style={{ display: "none" }} 
                onChange={handleFileChange} 
              />
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{
                  padding: "14px", borderRadius: 12,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 6
                }}
              >
                <Upload size={16} color="#ba55d3" /> Upload Photo
              </button>
            </div>
          </div>
        )}

        {/* Selected Image & Scanning State View */}
        {!cameraActive && selectedImage && (
          <div style={{ position: "relative", marginBottom: 20 }}>
            <div style={{ 
              position: "relative", borderRadius: 16, overflow: "hidden", 
              border: "1px solid rgba(255,255,255,0.15)", maxHeight: 240, 
              background: "#000", display: "flex", justifyContent: "center", alignItems: "center"
            }}>
              <img 
                src={selectedImage} 
                alt="Meal to scan" 
                style={{ width: "100%", height: "100%", objectFit: "cover", maxHeight: 240, filter: scanning ? "brightness(0.7)" : "none" }} 
              />
              
              {/* Scanning Overlay Effect */}
              {scanning && (
                <div style={{
                  position: "absolute", inset: 0, 
                  background: "linear-gradient(180deg, rgba(0,242,254,0.15) 0%, rgba(186,85,211,0.2) 100%)",
                  display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 12
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%", 
                    border: "3px solid transparent", borderTopColor: "#00f2fe", borderRightColor: "#ba55d3",
                    animation: "spin 1s linear infinite"
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                    Aura AI Vision Transformer Analyzing Components...
                  </span>
                </div>
              )}
            </div>

            {/* Re-take / Change Photo button */}
            {!scanning && (
              <button 
                onClick={() => { setSelectedImage(null); setScanResult(null); startCamera(); }}
                style={{
                  position: "absolute", top: 10, right: 10,
                  background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 11,
                  fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                }}
              >
                <Camera size={13} /> Retake Photo
              </button>
            )}
          </div>
        )}

        {/* Scan Results View */}
        {scanResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header / Title */}
            <div style={{ 
              background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 14, 
              border: "1px solid rgba(255,255,255,0.08)"
            }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--aura-accent, #00f2fe)", fontWeight: 700, marginBottom: 4 }}>
                Detected Dish
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 }}>
                {scanResult.meal_name}
              </h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "8px 0 0", lineHeight: "1.4" }}>
                {scanResult.description}
              </p>
            </div>

            {/* Individual Components Breakdown */}
            {scanResult.components && scanResult.components.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Layers size={14} color="#ba55d3" /> Component Breakdown ({scanResult.components.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {scanResult.components.map((comp, idx) => (
                    <div key={idx} style={{
                      background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "10px 14px",
                      border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>
                          {comp.name} {comp.portion ? <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>({comp.portion})</span> : null}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                          P: {Math.round(comp.protein_g || 0)}g • C: {Math.round(comp.carbs_g || 0)}g • F: {Math.round(comp.fat_g || 0)}g
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#00f2fe" }}>
                        {Math.round(comp.calories || 0)} kcal
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sum of Macros Highlight Card */}
            {scanResult.totals && (
              <div style={{
                background: "linear-gradient(135deg, rgba(0,242,254,0.08), rgba(186,85,211,0.08))",
                borderRadius: 14, padding: 16, border: "1px solid rgba(0,242,254,0.2)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>
                    <Flame size={15} color="#ff0055" /> Total Sum of Macros
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#00f2fe" }}>
                    {Math.round(scanResult.totals.calories || 0)} kcal
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "8px 4px" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>PROTEIN</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--aura-accent2, #ff70a6)" }}>
                      {Math.round(scanResult.totals.protein_g || 0)}g
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "8px 4px" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>CARBS</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--aura-accent3, #ff9770)" }}>
                      {Math.round(scanResult.totals.carbs_g || 0)}g
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "8px 4px" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>FAT</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--aura-accent4, #ffd670)" }}>
                      {Math.round(scanResult.totals.fat_g || 0)}g
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "8px 4px" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>FIBER</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#70d6ff" }}>
                      {Math.round(scanResult.totals.fiber_g || 0)}g
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mandatory Meal Category Selection */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--aura-accent, #00f2fe)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Select Meal Section (Obligatory)
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {["Breakfast", "Lunch", "Dinner", "Snacks"].map(cat => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setMealCategory(cat)}
                    style={{
                      flex: 1,
                      padding: "8px 4px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      background: mealCategory === cat ? "linear-gradient(135deg, #00f2fe, #4facfe)" : "rgba(255,255,255,0.06)",
                      color: mealCategory === cat ? "#000" : "#aaa",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Log to Tracker Action */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => { setSelectedImage(null); setScanResult(null); startCamera(); }}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 6
                }}
              >
                <Camera size={15} /> Take Another Photo
              </button>

              <button
                onClick={handleLogMeal}
                disabled={logging}
                style={{
                  flex: 2, padding: "12px", borderRadius: 12,
                  background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                  border: "none", color: "#000", fontWeight: 800, fontSize: 13,
                  cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 6
                }}
              >
                <Check size={16} /> {logging ? "Logging..." : "Log to Daily Tracker"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
