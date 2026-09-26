import React from "react";
import { Compass, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import studentCodingImg from "../../../assets/images/student-coding.jpg";

export const CurrentFocusCard = ({
  weakTopic = null,
  targetFocus = null,
}) => {
  const navigate = useNavigate();

  // Pick actual weak topic from backend data
  const focusTopic =
    (typeof weakTopic === "string" ? weakTopic : weakTopic?.topic) ||
    (Array.isArray(targetFocus) && targetFocus.length > 0 ? targetFocus[0] : null) ||
    "Core Programming";

  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formattedTopic = capitalize(focusTopic);

  return (
    <div className="cl-focus-hero-card">
      <div className="cl-focus-content">
        <div>
          <div className="cl-focus-header">
            <Compass size={18} />
            <span>CURRENT FOCUS</span>
          </div>

          <h2 className="cl-focus-title">{formattedTopic}</h2>

          <div className="cl-badge-needs-practice">
            Needs Practice
          </div>

          <p className="cl-focus-desc">
            AI has identified {formattedTopic} as an area that needs more
            practice. Work through targeted exercises to raise your mastery score.
          </p>
        </div>

        <button
          className="cl-btn-yellow"
          onClick={() => navigate("/student/learning-path")}
          type="button"
        >
          View Learning Path <ArrowRight size={18} />
        </button>
      </div>

      <div className="cl-focus-illustration-box">
        <img
          src={studentCodingImg}
          alt="Student learning programming"
          className="cl-focus-img"
        />
      </div>
    </div>
  );
};

export default CurrentFocusCard;
