import React, { useState, useEffect } from "react";
import { Camera as CameraIcon, Image as ImageIcon, Trash2 } from "lucide-react";
import { useTheme } from "../utils/theme";
import Header from "../components/layout/Header";
import { API_BASE_URL } from "../utils/config";
import { getSyncItem } from "../utils/storage";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

const API = API_BASE_URL;

export default function ProgressPhotos() {
  const { theme } = useTheme();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Comparison state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const token = getSyncItem("aura_token");
      const res = await fetch(`${API}/progress-photos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(f);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    setUploading(true);
    try {
      const token = getSyncItem("aura_token");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("date", date);
      if (weight) formData.append("weight", weight);
      
      const res = await fetch(`${API}/progress-photos/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      if (res.ok) {
        setFile(null);
        setPreview(null);
        setWeight("");
        fetchPhotos();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this photo?")) return;
    try {
      const token = getSyncItem("aura_token");
      await fetch(`${API}/progress-photos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setPhotos(photos.filter(p => p.id !== id));
      setSelectedPhotos(selectedPhotos.filter(pId => pId !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelect = (id) => {
    if (selectedPhotos.includes(id)) {
      setSelectedPhotos(selectedPhotos.filter(pId => pId !== id));
    } else {
      if (selectedPhotos.length < 2) {
        setSelectedPhotos([...selectedPhotos, id]);
      }
    }
  };

  const takePhoto = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const check = await Camera.checkPermissions();
        if (check.camera !== 'granted') {
          const req = await Camera.requestPermissions();
          if (req.camera !== 'granted') {
            alert("Camera permission denied. Please choose a file instead.");
            return;
          }
        }
      }
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });
      
      if (image && image.webPath) {
        setPreview(image.webPath);
        
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const filename = `progress_${new Date().getTime()}.jpg`;
        const f = new File([blob], filename, { type: "image/jpeg" });
        setFile(f);
      }
    } catch (e) {
      console.warn("Camera capture cancelled or failed", e);
    }
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 100 }}>
      <Header title="Progress Photos" subtitle="Visual changes over time" />
      
      <div className="page-inner">
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <CameraIcon size={20} color="var(--aura-accent)" /> Add New Photo
          </h2>
          
          <form onSubmit={handleUpload} style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
            {Capacitor.isNativePlatform() && (
              <div style={{ flex: "0 0 auto" }}>
                <label style={{ display: "block", fontSize: 12, marginBottom: 6, color: "var(--text-muted)" }}>Capture</label>
                <button type="button" onClick={takePhoto} style={{
                  background: "rgba(255, 255, 255, 0.08)", border: "1px solid var(--color-border)", padding: "8px 16px", borderRadius: 8, color: "var(--color-text)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, height: 38, cursor: "pointer"
                }}>
                  <CameraIcon size={16} color="var(--aura-accent)" /> Take Photo
                </button>
              </div>
            )}
            
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6, color: "var(--text-muted)" }}>
                {Capacitor.isNativePlatform() ? "Or Choose File" : "Photo"}
              </label>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ width: "100%", background: "var(--bg-input)", padding: 8, borderRadius: 8, border: "1px solid var(--border-input)", color: "var(--color-text)" }} />
            </div>
            
            <div style={{ flex: "0 1 120px" }}>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6, color: "var(--text-muted)" }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="themed-input" style={{ width: "100%" }} />
            </div>
            
            <div style={{ flex: "0 1 100px" }}>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6, color: "var(--text-muted)" }}>Weight (kg)</label>
              <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="—" className="themed-input" style={{ width: "100%" }} />
            </div>
            
            <button type="submit" disabled={!file || uploading} style={{
              background: "var(--aura-accent)", color: "#000", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 600, cursor: (!file || uploading) ? "not-allowed" : "pointer", opacity: (!file || uploading) ? 0.6 : 1, height: 38
            }}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </form>
          
          {preview && (
            <div style={{ marginTop: 16, width: 120, height: 160, borderRadius: 8, overflow: "hidden", border: "1px solid var(--aura-accent)" }}>
              <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Gallery</h2>
          {photos.length > 1 && (
            <button onClick={() => setCompareMode(!compareMode)} style={{
              background: compareMode ? "var(--aura-accent)" : "transparent",
              color: compareMode ? "#000" : "var(--aura-accent)",
              border: "1px solid var(--aura-accent)",
              padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer"
            }}>
              {compareMode ? "Cancel Comparison" : "Compare Photos"}
            </button>
          )}
        </div>

        {compareMode && selectedPhotos.length === 2 && (
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, textAlign: "center", marginBottom: 16 }}>Side-by-Side Comparison</h3>
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              {selectedPhotos.map(id => {
                const p = photos.find(x => x.id === id);
                if (!p) return null;
                const d = new Date(p.date);
                return (
                  <div key={id} style={{ width: "45%", position: "relative", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 6, color: "#fff", fontSize: 12, backdropFilter: "blur(4px)" }}>
                      {d.toLocaleDateString()} {p.weight ? `• ${p.weight}kg` : ''}
                    </div>
                    <img src={API.replace("/api", "") + p.photo_url} alt="Comparison" style={{ width: "100%", height: "auto", display: "block" }} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>Loading photos...</div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60, background: "var(--bg-card)", borderRadius: 16, border: "1px dashed var(--border-card)" }}>
            <ImageIcon size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div>No photos yet. Start tracking your progress!</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16 }}>
            {photos.map((p) => {
              const isSelected = selectedPhotos.includes(p.id);
              const d = new Date(p.date);
              return (
                <div key={p.id} onClick={() => compareMode && toggleSelect(p.id)} style={{
                  position: "relative", aspectRatio: "3/4", borderRadius: 12, overflow: "hidden",
                  border: isSelected ? "3px solid var(--aura-accent)" : "1px solid var(--color-border)",
                  cursor: compareMode ? "pointer" : "default", opacity: (compareMode && selectedPhotos.length === 2 && !isSelected) ? 0.5 : 1
                }}>
                  <img src={API.replace("/api", "") + p.photo_url} alt="Progress" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "20px 10px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                      <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      {p.weight && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>{p.weight} kg</div>}
                    </div>
                    {!compareMode && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} style={{ background: "rgba(239, 68, 68, 0.2)", border: "none", color: "#f87171", padding: 6, borderRadius: 6, cursor: "pointer", display: "flex" }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {compareMode && isSelected && (
                    <div style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, background: "var(--aura-accent)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold" }}>
                      ✓
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
