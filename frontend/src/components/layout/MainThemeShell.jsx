import React from "react";
import MainSidebar from "./MainSidebar";
import MainHeader from "./MainHeader";
import { Activity } from "lucide-react";

export default function MainThemeShell({ children }) {
  return (
    <div className="main-theme-shell">
      {/* Floating Modern Glass Sidebar Dock */}
      <MainSidebar />

      {/* Main Content Area */}
      <div className="main-theme-wrapper">
        <MainHeader />
        <main className="main-theme-content">
          <div className="main-theme-banner-box">
            <div className="main-banner-left">
              <div className="main-banner-badge">
                <Activity size={12} color="#0ea5e9" />
                <span>HPI MAIN EXPERIENCE</span>
              </div>
              <h2 className="main-banner-title">Hyper Performance Indicator Engine</h2>
              <p className="main-banner-desc">
                Elevate your physical performance with real-time telemetry, adaptive workout logging, and precision AI coaching.
              </p>
            </div>
          </div>
          <div className="main-page-slot">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
