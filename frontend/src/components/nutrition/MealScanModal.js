import React, { useState, useRef, useEffect } from "react";
import { X, Camera, ShieldCheck, Video, VideoOff, Upload, Layers, Flame, Check, RefreshCw, Clock, Sunrise, Sun, Moon, Cookie } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../common/Toast";

const MEAL_CATEGORIES = [
  { id: "Breakfast", label: "Breakfast", icon: Sunrise },
  { id: "Lunch", label: "Lunch", icon: Sun },
  { id: "Dinner", label: "Dinner", icon: Moon },
  { id: "Snacks", label: "Snacks", icon: Cookie },
];

export default function MealScanModal({ onClose, onLog }) {
  const [selectedImage, setSelectedImage] = useState(null); // Data URL string
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Breakfast");
  const [logging, setLogging] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

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
      if (toast?.error) toast.error(err.message || "Failed to scan meal with AI Vision");
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
    if (!selectedCategory) {
      if (toast?.error) toast.error("Please specify when you ate this meal (Breakfast, Lunch, Dinner, or Snacks)");
      return;
    }
    setLogging(true);
    try {
      await api.logNutrition({
        meal_name: scanResult.meal_name || "Vision Scanned Meal",
        meal_category: selectedCategory,
        amount: 1,
        unit: "serving",
        calories: scanResult.totals.calories || 0,
        protein_g: scanResult.totals.protein_g || 0,
        carbs_g: scanResult.totals.carbs_g || 0,
        fat_g: scanResult.totals.fat_g || 0,
        fiber_g: scanResult.totals.fiber_g || 0
      });
      if (toast?.success) toast.success(`Meal logged under ${selectedCategory}!`);
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
    <div className="modal-overlay" style={{ 
      zIndex: 1000, 
      position: "fixed",
      inset: 0,
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center",
      background: "var(--overlay-bg, rgba(0, 0, 0, 0.8))",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)"
    }}>
      <div className="card modal-content" style={{ 
        maxWidth: 460, 
        width: "92%", 
        maxHeight: "88vh", 
        overflowY: "auto",
        borderRadius: 22, 
        border: "1px solid var(--border-card)",
        background: "var(--bg-card)",
        padding: 18,
        boxShadow: "var(--shadow-raise)"
      }}>

        {/* Modal Top Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ 
              width: 34, height: 34, borderRadius: 10, 
              background: "color-mix(in srgb, var(--aura-accent) 15%, transparent)",
              border: "1px solid var(--color-border)",
              display: "flex", justifyContent: "center", alignItems: "center", color: "var(--aura-accent)"
            }}>
              <Camera size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--color-text)", letterSpacing: "-0.3px" }}>
                AI Photo Meal Scanner
              </h2>
              <div style={{ fontSize: 11, color: "var(--color-text-3)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <ShieldCheck size={12} color="var(--aura-accent)" /> AI Nutrition Vision Analysis
              </div>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} style={{ background: "none", border: "none", color: "var(--color-text-3)", cursor: "pointer", padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        {/* Live Camera Viewfinder */}
        {cameraActive && (
          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{
              position: "relative", borderRadius: 16, overflow: "hidden",
              border: "2px solid #00f2fe", maxHeight: 260, background: "#000",
              display: "flex", justifyContent: "center", alignItems: "center"
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: "100%", height: "100%", objectFit: "cover", maxHeight: 260 }} 
              />

              <div style={{
                position: "absolute", inset: 20, border: "2px dashed rgba(0, 242, 254, 0.6)",
                borderRadius: 12, pointerEvents: "none", display: "flex", justifyContent: "center", alignItems: "center"
              }}>
                <span style={{ fontSize: 11, color: "#00f2fe", background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 6, fontWeight: 700 }}>
                  Center meal in camera viewfinder
                </span>
              </div>
            </div>

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
                  background: "var(--aura-accent)",
                  border: "none", color: "var(--color-on-accent)", fontWeight: 800, fontSize: 13,
                  cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                  boxShadow: "0 4px 15px color-mix(in srgb, var(--aura-accent) 30%, transparent)"
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
            <button
              onClick={startCamera}
              style={{
                width: "100%", padding: "20px", borderRadius: 16,
                background: "color-mix(in srgb, var(--aura-accent) 12%, var(--bg-card))",
                border: "2px solid var(--aura-accent)", color: "var(--color-text)", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                transition: "all 0.2s ease"
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "var(--aura-accent)",
                display: "flex", justifyContent: "center", alignItems: "center", color: "var(--color-on-accent)"
              }}>
                <Camera size={26} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text)" }}>
                Open Live Vision Camera
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-2)" }}>
                Point camera at meal & snap photo for instant AI analysis
              </span>
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

        {/* Selected Image & Scanning Loading State */}
        {!cameraActive && selectedImage && scanning && (
          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ 
              position: "relative", borderRadius: 16, overflow: "hidden", 
              border: "1px solid rgba(255,255,255,0.15)", height: 210, 
              background: "#000", display: "flex", justifyContent: "center", alignItems: "center"
            }}>
              <img 
                src={selectedImage} 
                alt="Meal to scan" 
                style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.6)" }} 
              />
              
              <div style={{
                position: "absolute", inset: 0, 
                background: "linear-gradient(180deg, rgba(0,242,254,0.15) 0%, rgba(186,85,211,0.2) 100%)",
                display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 12
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", 
                  border: "3px solid transparent", borderTopColor: "#00f2fe", borderRightColor: "#ba55d3",
                  animation: "spin 1s linear infinite"
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                  Analyzing Meal Components with AI...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scan Results View - EXACT FORMAT MATCHING SCREENSHOT */}
        {!cameraActive && selectedImage && !scanning && scanResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Top Image Container with Change Image button */}
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", height: 200 }}>
              <img 
                src={selectedImage} 
                alt={scanResult.meal_name || "Scanned meal"} 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
              <button 
                onClick={() => { setSelectedImage(null); setScanResult(null); startCamera(); }}
                style={{
                  position: "absolute", top: 12, right: 12,
                  background: "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "#fff", borderRadius: 8, padding: "6px 12px",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)"
                }}
              >
                <RefreshCw size={13} /> Change Image
              </button>
            </div>

            {/* Detected Dish Container Card */}
            <div style={{ 
              background: "rgba(255, 255, 255, 0.03)", borderRadius: 14, padding: 14, 
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#6366f1", fontWeight: 800, marginBottom: 4 }}>
                DETECTED DISH
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: "#fff", margin: "0 0 6px 0", letterSpacing: "-0.3px" }}>
                {scanResult.meal_name}
              </h3>
              <p style={{ fontSize: 12.5, color: "rgba(255, 255, 255, 0.7)", margin: 0, lineHeight: "1.4" }}>
                {scanResult.description}
              </p>
            </div>

            {/* Individual Components Breakdown */}
            {scanResult.components && scanResult.components.length > 0 && (
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <Layers size={15} color="#ba55d3" /> Component Breakdown ({scanResult.components.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {scanResult.components.map((comp, idx) => (
                    <div key={idx} style={{
                      background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, padding: "10px 14px",
                      border: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#fff" }}>
                          {comp.name} {comp.portion ? <span style={{ fontSize: 11.5, fontWeight: 500, color: "rgba(255, 255, 255, 0.5)", marginLeft: 4 }}>({comp.portion})</span> : null}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.5)", marginTop: 3 }}>
                          P: {Math.round(comp.protein_g || 0)}g • C: {Math.round(comp.carbs_g || 0)}g • F: {Math.round(comp.fat_g || 0)}g
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: "#00f2fe" }}>
                        {Math.round(comp.calories || 0)} kcal
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TOTAL SUM OF MACROS Card */}
            {scanResult.totals && (
              <div style={{
                background: "linear-gradient(135deg, rgba(0, 242, 254, 0.05) 0%, rgba(186, 85, 211, 0.05) 100%)",
                borderRadius: 14, padding: 14, border: "1px solid rgba(0, 242, 254, 0.18)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>
                    <Flame size={15} color="#ff3366" /> TOTAL SUM OF MACROS
                  </span>
                  <span style={{ fontSize: 19, fontWeight: 900, color: "#00f2fe" }}>
                    {Math.round(scanResult.totals.calories || 0)} kcal
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
                  <div style={{ background: "rgba(0, 0, 0, 0.4)", borderRadius: 10, padding: "8px 4px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <div style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, marginBottom: 3 }}>PROTEIN</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#00f2fe" }}>
                      {Math.round(scanResult.totals.protein_g || 0)}g
                    </div>
                  </div>
                  <div style={{ background: "rgba(0, 0, 0, 0.4)", borderRadius: 10, padding: "8px 4px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <div style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, marginBottom: 3 }}>CARBS</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#00f2fe" }}>
                      {Math.round(scanResult.totals.carbs_g || 0)}g
                    </div>
                  </div>
                  <div style={{ background: "rgba(0, 0, 0, 0.4)", borderRadius: 10, padding: "8px 4px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <div style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, marginBottom: 3 }}>FAT</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#00f2fe" }}>
                      {Math.round(scanResult.totals.fat_g || 0)}g
                    </div>
                  </div>
                  <div style={{ background: "rgba(0, 0, 0, 0.4)", borderRadius: 10, padding: "8px 4px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <div style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.5)", fontWeight: 700, marginBottom: 3 }}>FIBER</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#00f2fe" }}>
                      {Math.round(scanResult.totals.fiber_g || 0)}g
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mandatory Meal Time Selection */}
            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: 14,
              padding: 14,
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <Clock size={14} color="#00f2fe" /> WHEN DID YOU EAT THIS MEAL? <span style={{ color: "#ff0055" }}>*</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                {MEAL_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const IconComponent = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        padding: "10px 4px",
                        borderRadius: 10,
                        border: isSelected ? "2px solid #00f2fe" : "1px solid rgba(255, 255, 255, 0.1)",
                        background: isSelected 
                          ? "linear-gradient(135deg, rgba(0, 242, 254, 0.25) 0%, rgba(186, 85, 211, 0.25) 100%)"
                          : "rgba(255, 255, 255, 0.03)",
                        color: isSelected ? "#00f2fe" : "rgba(255, 255, 255, 0.6)",
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.2s ease",
                        boxShadow: isSelected ? "0 2px 10px rgba(0, 242, 254, 0.25)" : "none"
                      }}
                    >
                      <IconComponent size={18} color={isSelected ? "#00f2fe" : "rgba(255, 255, 255, 0.5)"} />
                      <span style={{ color: isSelected ? "#fff" : "rgba(255, 255, 255, 0.7)" }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
              <button
                onClick={() => { setSelectedImage(null); setScanResult(null); startCamera(); }}
                style={{
                  flex: 1, padding: "13px", borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 6
                }}
              >
                Scan Another
              </button>

              <button
                onClick={handleLogMeal}
                disabled={logging}
                style={{
                  flex: 2, padding: "13px", borderRadius: 12,
                  background: "var(--aura-accent)",
                  border: "none", color: "var(--color-on-accent)", fontWeight: 800, fontSize: 13.5,
                  cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 6,
                  boxShadow: "0 4px 15px color-mix(in srgb, var(--aura-accent) 30%, transparent)"
                }}
              >
                <Check size={16} /> {logging ? "Logging..." : `Log to ${selectedCategory}`}
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
