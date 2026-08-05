import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Ruler, ChevronRight } from "lucide-react";
import BodySilhouette from "../BodySilhouette";
import { api } from "../../utils/api";

export default function BodyMapWidget({ latestProp, previousProp, injuriesProp }) {
  const [latest, setLatest] = useState(latestProp || null);
  const [previous, setPrevious] = useState(previousProp || null);
  const [injuries, setInjuries] = useState(injuriesProp || []);
  const [loading, setLoading] = useState(!latestProp && !injuriesProp);
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    if (latestProp !== undefined) setLatest(latestProp);
    if (previousProp !== undefined) setPrevious(previousProp);
    if (injuriesProp !== undefined) setInjuries(injuriesProp);
  }, [latestProp, previousProp, injuriesProp]);

  useEffect(() => {
    if (latestProp === undefined && injuriesProp === undefined) {
      let isMounted = true;
      setLoading(true);

      Promise.all([
        api.getMeasurementsHistory().catch(() => []),
        api.getInjuries().catch(() => [])
      ]).then(([measData, injData]) => {
        if (!isMounted) return;
        const arr = Array.isArray(measData) ? measData : [];
        setLatest(arr[0] || null);
        setPrevious(arr[1] || null);
        setInjuries(Array.isArray(injData) ? injData : []);
        setLoading(false);
      }).catch((err) => {
        console.error("Error fetching body map widget data:", err);
        if (isMounted) setLoading(false);
      });

      return () => { isMounted = false; };
    }
  }, [latestProp, injuriesProp]);

  const activeInjuries = injuries.filter(i => i.status === 'active' || i.severity > 0);

  if (loading) {
    return (
      <div style={{ height: 260, borderRadius: 16, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    );
  }

  const handleZoneClick = (key, label) => {
    setSelectedZone(prev => prev?.key === key ? null : { key, label });
  };

  const getZoneData = () => {
    if (!selectedZone) return null;
    const key = selectedZone.key;
    const currentVal = latest ? latest[key] : null;
    const prevVal = previous ? previous[key] : null;
    const activeInj = activeInjuries.find(i => i.body_part === key);
    
    let diff = null;
    if (currentVal != null && prevVal != null) {
      diff = (currentVal - prevVal).toFixed(1);
    }

    return {
      currentVal,
      prevVal,
      diff,
      activeInj
    };
  };

  const zoneData = getZoneData();

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Top summary row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap",
        gap: 8, padding: "8px 12px", background: "var(--color-bg-hover)",
        border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 11, boxSizing: "border-box", width: "100%"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-text-2)", fontWeight: 600, whiteSpace: "nowrap" }}>
            <Ruler size={13} color="var(--aura-accent2)" />
            {latest ? "Logged" : "No measurements"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: activeInjuries.length > 0 ? "var(--aura-accent3)" : "var(--color-text-2)", fontWeight: 600, whiteSpace: "nowrap" }}>
            <AlertCircle size={13} />
            {activeInjuries.length} {activeInjuries.length === 1 ? 'Injury' : 'Injuries'}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Link to="/measurements" style={{ color: "var(--aura-accent)", textDecoration: "none", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", gap: 2 }}>
            Sizing <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* Interactive Silhouette */}
      <div style={{
        background: "var(--color-bg-hover)",
        borderRadius: 16,
        padding: "10px 0",
        border: "1px solid var(--color-border)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <BodySilhouette
          latest={latest || {}}
          previous={previous || {}}
          injuries={injuries}
          onZoneClick={handleZoneClick}
        />
      </div>

      {/* Zone Detail Callout */}
      {selectedZone ? (
        <div style={{
          padding: 12,
          borderRadius: 12,
          background: "var(--bg-card)",
          border: "1px solid var(--aura-accent)",
          display: "flex",
          flexDirection: "column",
          gap: 6
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", textTransform: "capitalize" }}>
              {selectedZone.label}
            </span>
            <button
              onClick={() => setSelectedZone(null)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
            >
              Close
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "var(--text-secondary)" }}>
            {zoneData?.currentVal != null ? (
              <span>Size: <strong style={{ color: "var(--color-text)" }}>{zoneData.currentVal} cm</strong> {zoneData.diff != null && (
                <span style={{ color: Number(zoneData.diff) > 0 ? "var(--aura-accent3)" : Number(zoneData.diff) < 0 ? "#22C55E" : "var(--aura-cyan)" }}>
                  ({Number(zoneData.diff) > 0 ? `+${zoneData.diff}` : zoneData.diff} cm)
                </span>
              )}</span>
            ) : (
              <span style={{ fontStyle: "italic", opacity: 0.7 }}>No sizing recorded</span>
            )}

            {zoneData?.activeInj ? (
              <span style={{ color: "var(--aura-accent3)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                <AlertCircle size={12} /> Severity {zoneData.activeInj.severity}/10 ({zoneData.activeInj.injury_type || "Pain"})
              </span>
            ) : (
              <span style={{ color: "#22C55E", fontWeight: 600 }}>Healthy</span>
            )}
          </div>
        </div>
      ) : (
        /* Legend Bar */
        <div style={{ display: "flex", justifyContent: "center", gap: 14, fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} /> Decreased
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00BCD4" }} /> Tracked
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} /> Increased
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F97316" }} /> Injury
          </span>
        </div>
      )}
    </div>
  );
}
