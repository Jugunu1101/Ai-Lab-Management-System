import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import studentSuccessImg from "../../../assets/images/student-success.jpg";

export const MotivationCard = () => {
  const navigate = useNavigate();

  return (
    <div className="cl-motivation-card">
      <div className="cl-motivation-left">
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--cl-green-forest)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          <Sparkles size={16} /> Daily Momentum
        </div>
        <h2 className="cl-motivation-title">Keep Going!</h2>
        <p className="cl-motivation-text">
          Small consistent steps lead to big improvements. Master concepts one challenge at a time and watch your code confidence grow.
        </p>
        <button
          className="cl-btn-dark-green"
          onClick={() => navigate("/student/progress")}
          type="button"
        >
          View Progress <ArrowRight size={16} />
        </button>
      </div>

      <div className="cl-motivation-img-box">
        <img
          src={studentSuccessImg}
          alt="Student celebrating learning progress"
          className="cl-motivation-img"
        />
      </div>
    </div>
  );
};

export default MotivationCard;
