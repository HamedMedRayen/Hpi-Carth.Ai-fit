import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function MobileBottomSheet({ isOpen, onClose, title, children }) {
  const [render, setRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  if (!render) return null;

  return (
    <div
      className={`mobile-bottom-sheet-overlay ${isOpen ? "open" : "closed"}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className={`mobile-bottom-sheet ${isOpen ? "open" : "closed"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-bottom-sheet-header">
          <h2 className="mobile-bottom-sheet-title">{title}</h2>
          <button className="mobile-bottom-sheet-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="mobile-bottom-sheet-content">
          {children}
        </div>
      </div>
      <style>{`
        .mobile-bottom-sheet-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
        }
        .mobile-bottom-sheet-overlay.open {
          animation: fade-in 0.25s ease forwards;
        }
        .mobile-bottom-sheet-overlay.closed {
          animation: fade-out 0.2s ease forwards;
        }
        .mobile-bottom-sheet {
          width: 100%;
          max-height: 90vh;
          background: var(--color-surface, rgba(20, 22, 26, 0.95));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
        }
        .mobile-bottom-sheet.open {
          animation: slide-up 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .mobile-bottom-sheet.closed {
          animation: slide-down 0.2s cubic-bezier(0.8, 0.2, 1, 0.2) forwards;
        }
        .mobile-bottom-sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .mobile-bottom-sheet-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text, #fff);
        }
        .mobile-bottom-sheet-close {
          background: var(--color-surface-h, rgba(255, 255, 255, 0.1));
          border: none;
          color: var(--color-text, #fff);
          width: 32px;
          height: 32px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .mobile-bottom-sheet-content {
          overflow-y: auto;
          flex: 1;
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slide-down { from { transform: translateY(0); } to { transform: translateY(100%); } }
      `}</style>
    </div>
  );
}
