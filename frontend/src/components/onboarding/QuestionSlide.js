import React, { useState, useEffect } from "react";

export default function QuestionSlide({ questionConfig, value, onChange, direction }) {
  const { id, question, subtitle, type, options = [], required, unitToggle } = questionConfig;

  // Handle unit toggle for numeric types (default: kg for weight, cm for height)
  const [unit, setUnit] = useState(
    unitToggle === "height" ? "cm" : unitToggle === "weight" ? "kg" : null
  );

  // Initialize numeric value string from value prop
  const getNumericValue = () => {
    if (!value) return "";
    if (typeof value === "object" && value.value !== undefined) return value.value;
    return value;
  };

  const [numVal, setNumVal] = useState(getNumericValue());
  const [textVal, setTextVal] = useState(typeof value === "string" ? value : "");
  const [hybridText, setHybridText] = useState(
    typeof value === "object" && value.otherText ? value.otherText : ""
  );

  // Date dropdowns state: { day, month, year }
  const getDateParts = () => {
    if (typeof value === "object" && value.year) return value;
    return { day: "", month: "", year: "" };
  };
  const [dateState, setDateState] = useState(getDateParts());

  useEffect(() => {
    setNumVal(getNumericValue());
    setTextVal(typeof value === "string" ? value : "");
    if (typeof value === "object" && value.otherText) {
      setHybridText(value.otherText);
    }
    if (typeof value === "object" && value.year) {
      setDateState(value);
    }
  }, [id, value]);

  // ── MCQ Handler ──
  const handleMcqSelect = (opt) => {
    onChange(opt);
  };

  // ── MCQ Multi Handler ──
  const handleMcqMultiToggle = (opt) => {
    const currentList = Array.isArray(value) ? [...value] : [];
    const index = currentList.indexOf(opt);
    if (index > -1) {
      currentList.splice(index, 1);
    } else {
      currentList.push(opt);
    }
    onChange(currentList);
  };

  // ── Numeric Change ──
  const handleNumChange = (valStr, activeUnit) => {
    setNumVal(valStr);
    if (activeUnit) {
      onChange({ value: valStr, unit: activeUnit });
    } else {
      onChange(valStr);
    }
  };

  const handleUnitToggle = (newUnit) => {
    setUnit(newUnit);
    handleNumChange(numVal, newUnit);
  };

  // ── Text Change ──
  const handleTextChange = (e) => {
    const v = e.target.value;
    setTextVal(v);
    onChange(v);
  };

  // ── Date Change ──
  const handleDateDropdown = (key, val) => {
    const next = { ...dateState, [key]: val };
    setDateState(next);
    if (next.day && next.month && next.year) {
      onChange(next);
    } else {
      onChange(next);
    }
  };

  // ── Hybrid Single Handler ──
  const handleHybridSelect = (opt) => {
    if (opt.startsWith("Other")) {
      onChange({ selected: opt, otherText: hybridText });
    } else {
      onChange(opt);
    }
  };

  const handleHybridTextChange = (e) => {
    const txt = e.target.value;
    setHybridText(txt);
    const sel = typeof value === "object" ? value.selected : value;
    onChange({ selected: sel || "Other", otherText: txt });
  };

  // ── Hybrid Multi Handler ──
  const handleHybridMultiToggle = (opt) => {
    const currentObj = typeof value === "object" && !Array.isArray(value) 
      ? value 
      : { selected: Array.isArray(value) ? value : [], otherText: hybridText };

    const selectedList = [...(currentObj.selected || [])];
    const idx = selectedList.indexOf(opt);
    if (idx > -1) {
      selectedList.splice(idx, 1);
    } else {
      selectedList.push(opt);
    }

    onChange({ selected: selectedList, otherText: currentObj.otherText || hybridText });
  };

  const slideClass = direction === "prev" ? "slide-enter-prev" : "slide-enter-next";

  return (
    <div className={`onboarding-slide ${slideClass}`} key={id}>
      {/* Title & Subtitle */}
      <div className="question-title-wrap">
        <div className="question-badges">
          {required ? (
            <span className="badge-required">Required</span>
          ) : (
            <span className="badge-optional">Optional</span>
          )}
        </div>
        <h2 className="question-title">{question}</h2>
        {subtitle && <p className="question-subtitle">{subtitle}</p>}
      </div>

      {/* Inputs Rendering */}
      <div className="question-body">
        {/* 1. MCQ (Single Select) */}
        {type === "mcq" && (
          <div className="options-grid">
            {options.map((opt) => {
              const isSelected = value === opt;
              return (
                <div
                  key={opt}
                  className={`option-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleMcqSelect(opt)}
                >
                  <span className="option-text">{opt}</span>
                  <div className="option-check">{isSelected ? "✓" : ""}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. MCQ Multi Select */}
        {type === "mcq-multi" && (
          <div className="options-grid">
            {options.map((opt) => {
              const isSelected = Array.isArray(value) && value.includes(opt);
              return (
                <div
                  key={opt}
                  className={`option-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleMcqMultiToggle(opt)}
                >
                  <span className="option-text">{opt}</span>
                  <div className="option-check">{isSelected ? "✓" : ""}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Numeric Input */}
        {type === "numeric" && (
          <div className="input-container">
            <div className="numeric-input-wrap">
              <input
                type="number"
                step="any"
                className="numeric-input"
                placeholder="0"
                value={numVal}
                onChange={(e) => handleNumChange(e.target.value, unit)}
                autoFocus
              />
            </div>
            {unitToggle && (
              <div className="unit-toggle">
                {unitToggle === "weight" ? (
                  <>
                    <button
                      type="button"
                      className={`unit-btn ${unit === "kg" ? "active" : ""}`}
                      onClick={() => handleUnitToggle("kg")}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      className={`unit-btn ${unit === "lb" ? "active" : ""}`}
                      onClick={() => handleUnitToggle("lb")}
                    >
                      lbs
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`unit-btn ${unit === "cm" ? "active" : ""}`}
                      onClick={() => handleUnitToggle("cm")}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      className={`unit-btn ${unit === "ft" ? "active" : ""}`}
                      onClick={() => handleUnitToggle("ft")}
                    >
                      ft
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. Text Input */}
        {type === "text" && (
          <div className="input-container">
            <input
              type="text"
              className="text-input-field"
              placeholder="Type your answer here..."
              value={textVal}
              onChange={handleTextChange}
              autoFocus
            />
          </div>
        )}

        {/* 5. Date 3-Dropdown Selector */}
        {type === "date" && (
          <div className="date-dropdowns">
            {/* Day */}
            <select
              className="date-select"
              value={dateState.day || ""}
              onChange={(e) => handleDateDropdown("day", e.target.value)}
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d < 10 ? `0${d}` : `${d}`}>
                  {d}
                </option>
              ))}
            </select>

            {/* Month */}
            <select
              className="date-select"
              value={dateState.month || ""}
              onChange={(e) => handleDateDropdown("month", e.target.value)}
            >
              <option value="">Month</option>
              {[
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
              ].map((m, idx) => {
                const val = (idx + 1) < 10 ? `0${idx + 1}` : `${idx + 1}`;
                return (
                  <option key={m} value={val}>
                    {m}
                  </option>
                );
              })}
            </select>

            {/* Year */}
            <select
              className="date-select"
              value={dateState.year || ""}
              onChange={(e) => handleDateDropdown("year", e.target.value)}
            >
              <option value="">Year</option>
              {Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - 14 - i).map((y) => (
                <option key={y} value={`${y}`}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 6. Hybrid Single Select */}
        {type === "hybrid" && (
          <div className="options-grid">
            {options.map((opt) => {
              const selectedVal = typeof value === "object" ? value.selected : value;
              const isSelected = selectedVal === opt;
              const isOther = opt.startsWith("Other");
              return (
                <React.Fragment key={opt}>
                  <div
                    className={`option-card ${isSelected ? "selected" : ""}`}
                    onClick={() => handleHybridSelect(opt)}
                  >
                    <span className="option-text">{opt}</span>
                    <div className="option-check">{isSelected ? "✓" : ""}</div>
                  </div>
                  {isOther && isSelected && (
                    <div className="hybrid-other-wrap">
                      <input
                        type="text"
                        className="text-input-field"
                        placeholder="Please specify details..."
                        value={hybridText}
                        onChange={handleHybridTextChange}
                        autoFocus
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* 7. Hybrid Multi Select */}
        {type === "hybrid-multi" && (
          <div className="options-grid">
            {options.map((opt) => {
              const selectedList = typeof value === "object" 
                ? (value.selected || [])
                : (Array.isArray(value) ? value : []);
              const isSelected = selectedList.includes(opt);
              const isOther = opt.startsWith("Other");
              return (
                <React.Fragment key={opt}>
                  <div
                    className={`option-card ${isSelected ? "selected" : ""}`}
                    onClick={() => handleHybridMultiToggle(opt)}
                  >
                    <span className="option-text">{opt}</span>
                    <div className="option-check">{isSelected ? "✓" : ""}</div>
                  </div>
                  {isOther && isSelected && (
                    <div className="hybrid-other-wrap">
                      <input
                        type="text"
                        className="text-input-field"
                        placeholder="Please specify details..."
                        value={hybridText}
                        onChange={(e) => {
                          setHybridText(e.target.value);
                          onChange({ selected: selectedList, otherText: e.target.value });
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
