import React, { useState, useEffect } from "react";
import {
  X, Star, Users, MapPin, Award, Send, CheckCircle2, Clock, MessageSquare, AlertCircle, Sparkles, Flag
} from "lucide-react";
import { api } from "../../utils/api";
import ReportCoachModal from "./ReportCoachModal";

const GOAL_LABELS = {
  muscle_gain: "Hypertrophy & Muscle Gain",
  fat_loss: "Fat Loss & Conditioning",
  powerlifting: "Powerlifting & Max Strength",
  bodybuilding: "Competitive Bodybuilding",
  general_fitness: "General Fitness & Health",
  athletics: "Athletic Performance",
  cardio_endurance: "Cardio & Endurance",
  strength_training: "Strength Training",
  flexibility: "Flexibility & Mobility",
  olympic_weightlifting: "Olympic Weightlifting"
};

const EXP_LABELS = {
  beginner: "Certified Trainer (1-2 yrs)",
  intermediate: "Experienced Coach (3-5 yrs)",
  advanced: "Senior Coach (5+ yrs)",
  elite: "Master Coach / Specialist (8+ yrs)"
};

export default function CoachProfileModal({ coach, onClose, onHireCoach }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" or "reviews"
  const [showReportModal, setShowReportModal] = useState(false);

  // New review state
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  const coachId = coach?.coach_id || coach?.id;

  const fetchFullProfile = async () => {
    if (!coachId) return;
    setLoading(true);
    try {
      const data = await api.getCoachProfile(coachId);
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch coach profile:", err);
      // Fallback to prop object if detailed endpoint fails
      setProfile({
        ...coach,
        rating: coach.rating || 4.8,
        review_count: coach.review_count || 12,
        athletes_count: coach.athletes_count || 24,
        reviews: [],
        gyms: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFullProfile();
  }, [coachId]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setReviewError("Please write a comment for your review.");
      return;
    }
    setSubmittingReview(true);
    setReviewError("");
    setReviewSuccess("");

    try {
      const res = await api.addCoachReview(coachId, newRating, newComment.trim());
      setReviewSuccess("Thank you! Your review has been published.");
      setNewComment("");
      setNewRating(5);
      // Refresh profile to update reviews list and avg rating
      await fetchFullProfile();
      setActiveTab("reviews");
    } catch (err) {
      setReviewError(err.message || "Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!coach) return null;

  const displayData = profile || coach;
  const rating = Number(displayData.rating || 4.8).toFixed(1);
  const reviewCount = displayData.review_count || (displayData.reviews ? displayData.reviews.length : 0);
  const athletesCount = displayData.athletes_count || 18;
  const isHired = displayData.status === 'active';
  const isPending = displayData.status === 'pending';

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0, 0, 0, 0.85)", zIndex: 9999, display: "flex",
        alignItems: "center", justifyContent: "center", padding: "16px",
        backdropFilter: "blur(10px)", animation: "fadeIn 0.2s ease-out"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#111622", border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 24, maxWidth: 540, width: "100%", maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)", position: "relative"
        }}
      >
        {/* Header Bar */}
        <div style={{
          padding: "18px 24px", display: "flex", justifyContent: "space-between",
          alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(255, 255, 255, 0.02)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--aura-cyan, #06b6d4)", fontWeight: 700 }}>
            <Sparkles size={16} /> CERTIFIED COACH PROFILE
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setShowReportModal(true)}
              style={{
                background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#f87171", padding: "6px 12px", borderRadius: 10, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
                transition: "all 0.2s ease"
              }}
              title="Report this coach to platform administrators"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              }}
            >
              <Flag size={13} /> Report Coach
            </button>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.08)", border: "none", color: "#94a3b8",
                width: 32, height: 32, borderRadius: "50%", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s ease"
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{ overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Main Coach Info Header */}
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{
              width: 90, height: 90, borderRadius: "50%", background: "#1e293b",
              border: "3px solid #06b6d4", overflow: "hidden", flexShrink: 0,
              boxShadow: "0 0 24px rgba(6, 182, 212, 0.35)", display: "flex",
              alignItems: "center", justifyContent: "center"
            }}>
              {displayData.coach_avatar || displayData.avatar_url ? (
                <img
                  src={displayData.coach_avatar || displayData.avatar_url}
                  alt={displayData.coach_name || displayData.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 32, fontWeight: 900, color: "#06b6d4" }}>
                  {(displayData.coach_name || displayData.name || "C").charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
                {displayData.coach_name || displayData.name}
              </h2>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>
                {displayData.coach_email || displayData.email}
              </span>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                <span style={{
                  background: "rgba(6, 182, 212, 0.12)", color: "#06b6d4",
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8,
                  border: "1px solid rgba(6, 182, 212, 0.3)"
                }}>
                  {GOAL_LABELS[displayData.goal?.toLowerCase()] || displayData.goal || "General Fitness"}
                </span>
                <span style={{
                  background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b",
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8,
                  border: "1px solid rgba(245, 158, 11, 0.3)"
                }}>
                  {EXP_LABELS[displayData.experience?.toLowerCase()] || displayData.experience || "Certified Coach"}
                </span>
              </div>
            </div>
          </div>

          {/* Key Stats Ribbon: Rating, Athletes Worked With, Experience */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10,
            background: "rgba(255, 255, 255, 0.03)", borderRadius: 16, padding: "14px",
            border: "1px solid rgba(255, 255, 255, 0.06)"
          }}>
            {/* Rating Box */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#f59e0b" }}>
                <Star size={16} fill="#f59e0b" />
                <span style={{ fontSize: 18, fontWeight: 900, color: "#ffffff" }}>{rating}</span>
              </div>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>({reviewCount} reviews)</span>
            </div>

            {/* Athletes Box */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 2, borderLeft: "1px solid rgba(255, 255, 255, 0.08)", borderRight: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#38bdf8" }}>
                <Users size={16} />
                <span style={{ fontSize: 18, fontWeight: 900, color: "#ffffff" }}>{athletesCount}</span>
              </div>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Athletes Trained</span>
            </div>

            {/* Level Box */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#a855f7" }}>
                <Award size={16} />
                <span style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>{displayData.age || 30} y/o</span>
              </div>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{displayData.sex === 'F' ? 'Female' : 'Male'}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: "flex", gap: 8, borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: 4 }}>
            <button
              onClick={() => setActiveTab("overview")}
              style={{
                background: activeTab === "overview" ? "rgba(6, 182, 212, 0.15)" : "transparent",
                color: activeTab === "overview" ? "#06b6d4" : "#94a3b8",
                border: "none", padding: "8px 16px", borderRadius: 10, fontSize: 13,
                fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
              }}
            >
              Overview & Gyms
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              style={{
                background: activeTab === "reviews" ? "rgba(6, 182, 212, 0.15)" : "transparent",
                color: activeTab === "reviews" ? "#06b6d4" : "#94a3b8",
                border: "none", padding: "8px 16px", borderRadius: 10, fontSize: 13,
                fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.2s"
              }}
            >
              Ratings & Comments ({reviewCount})
            </button>
          </div>

          {/* TAB 1: Overview */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Bio */}
              <div>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  About the Coach
                </span>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#cbd5e1", background: "rgba(255, 255, 255, 0.02)", padding: 14, borderRadius: 14, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  {displayData.bio || `${displayData.coach_name || displayData.name} is a certified fitness specialist focused on ${displayData.goal || 'performance'} and structured strength progression. Offers individual workout plan generation, nutrition check-ins, and direct athlete messaging.`}
                </p>
              </div>

              {/* Training Centers */}
              <div>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  Training Centers / Gym Locations
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {displayData.gyms && displayData.gyms.length > 0 ? (
                    displayData.gyms.map(gym => (
                      <div key={gym.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                        <MapPin size={16} color="#06b6d4" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{gym.name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{gym.address}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic", padding: 10 }}>
                      Independent Online Coach (Remote & Private Gym Sessions)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Ratings & Comments */}
          {activeTab === "reviews" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Add Review Form */}
              <form onSubmit={handleSubmitReview} style={{
                background: "rgba(255, 255, 255, 0.03)", borderRadius: 16, padding: "16px",
                border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", flexDirection: "column", gap: 12
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff" }}>
                  Write a Rating & Comment
                </div>

                {/* Star Picker */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Your Rating:</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 2,
                          color: star <= (hoverRating || newRating) ? "#f59e0b" : "rgba(255, 255, 255, 0.2)",
                          transition: "color 0.1s"
                        }}
                      >
                        <Star size={20} fill={star <= (hoverRating || newRating) ? "#f59e0b" : "none"} />
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginLeft: 6 }}>
                    {hoverRating || newRating} / 5 Stars
                  </span>
                </div>

                {/* Comment Input */}
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your experience working with this coach (e.g. responsiveness, workout quality, motivation)..."
                  style={{
                    width: "100%", background: "#0b0f19", border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 12, padding: "10px 14px", color: "#ffffff", fontSize: 13,
                    outline: "none", resize: "vertical"
                  }}
                />

                {reviewError && (
                  <div style={{ color: "#ef4444", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={14} /> {reviewError}
                  </div>
                )}
                {reviewSuccess && (
                  <div style={{ color: "#10b981", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={14} /> {reviewSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-primary"
                  style={{
                    alignSelf: "flex-end", padding: "8px 20px", borderRadius: 10,
                    fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 6,
                    cursor: submittingReview ? "wait" : "pointer"
                  }}
                >
                  <Send size={14} /> {submittingReview ? "Submitting..." : "Post Review"}
                </button>
              </form>

              {/* Reviews List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>
                  Client Reviews & Ratings
                </span>

                {loading ? (
                  <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: 20 }}>
                    Loading reviews...
                  </div>
                ) : displayData.reviews && displayData.reviews.length > 0 ? (
                  displayData.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 8
                      }}
                    >
                      {/* Reviewer Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%", background: "#1e293b",
                            border: "1px solid rgba(255, 255, 255, 0.1)", overflow: "hidden",
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            {rev.user_avatar ? (
                              <img src={rev.user_avatar} alt={rev.user_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontSize: 14, fontWeight: 800, color: "#38bdf8" }}>
                                {(rev.user_name || "A").charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff" }}>{rev.user_name}</div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>
                              {rev.created_at ? new Date(rev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Verified Athlete"}
                            </div>
                          </div>
                        </div>

                        {/* Stars */}
                        <div style={{ display: "flex", gap: 2 }}>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              color={i < rev.rating ? "#f59e0b" : "rgba(255, 255, 255, 0.15)"}
                              fill={i < rev.rating ? "#f59e0b" : "none"}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Comment text */}
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#cbd5e1", paddingLeft: 44 }}>
                        {rev.comment}
                      </p>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", color: "#64748b", fontSize: 13, padding: 20 }}>
                    No reviews yet. Be the first athlete to leave a review!
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Action Footer */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(15, 23, 42, 0.9)", display: "flex", justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            ⭐ <strong style={{ color: "#ffffff" }}>{rating}</strong> / 5.0 rating
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setShowReportModal(true)}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                padding: "8px 14px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
              title="Report this coach"
            >
              <Flag size={14} /> Report
            </button>

            {isHired ? (
              <div style={{
                background: "rgba(34, 197, 94, 0.12)", color: "#22c55e",
                fontSize: 13, fontWeight: 800, padding: "8px 16px", borderRadius: 12,
                display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(34, 197, 94, 0.3)"
              }}>
                <CheckCircle2 size={16} /> Active Coach
              </div>
            ) : isPending ? (
              <div style={{
                background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b",
                fontSize: 13, fontWeight: 800, padding: "8px 16px", borderRadius: 12,
                display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(245, 158, 11, 0.3)"
              }}>
                <Clock size={16} /> Request Pending
              </div>
            ) : (
              <button
                onClick={() => {
                  if (onHireCoach) onHireCoach(coachId);
                  onClose();
                }}
                className="btn-primary"
                style={{
                  padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 800,
                  boxShadow: "0 4px 14px rgba(6, 182, 212, 0.3)"
                }}
              >
                Hire Coach
              </button>
            )}
          </div>
        </div>

      </div>

      {showReportModal && (
        <ReportCoachModal
          coach={coach}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
