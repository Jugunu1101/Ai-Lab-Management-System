import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Tag,
  Space,
  Result,
  Divider,
  Select,
} from "antd";
import {
  ThunderboltFilled,
  CheckCircleFilled,
  CloseCircleFilled,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CodeOutlined,
  SendOutlined,
  BookOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import quizService from "../../services/quiz.service";
import "./TodayQuizPage.css";

const LANGUAGE_OPTIONS = [
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "java", label: "Java" },
  { value: "python", label: "Python" },
];

const normalizeLang = (lang) => {
  if (!lang) return "cpp";
  const clean = lang.toLowerCase().trim();
  if (clean === "c++" || clean === "cpp") return "cpp";
  if (clean === "c") return "c";
  if (clean === "java") return "java";
  if (clean === "python" || clean === "py") return "python";
  return "cpp";
};

const getLanguageLabel = (lang) => {
  const found = LANGUAGE_OPTIONS.find((o) => o.value === normalizeLang(lang));
  return found ? found.label : (lang ? lang.toUpperCase() : "C++");
};

export const TodayQuizPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPractice = searchParams.get("practice") === "true";
  const topicParam = searchParams.get("topic");

  const getInitialLanguage = () => {
    const fromUrl = searchParams.get("language");
    if (fromUrl) return normalizeLang(fromUrl);
    const saved = localStorage.getItem("preferred_quiz_language");
    if (saved) return normalizeLang(saved);
    return "cpp";
  };

  const [selectedLanguage, setSelectedLanguage] = useState(getInitialLanguage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionIndex]: selectedOptionIndex }
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  const fetchQuiz = async (langToUse = selectedLanguage) => {
    setLoading(true);
    setError(null);
    try {
      const res = isPractice
        ? await quizService.getPracticeQuiz({ topic: topicParam, language: langToUse })
        : await quizService.getTodayQuiz({ language: langToUse });
      const quizData = res.data?.quiz || res.quiz || (res.data ? res.data : null);
      const isCompleted = res.data?.isCompleted || res.isCompleted;
      const attempt = res.data?.attempt || res.attempt;

      if (quizData && quizData.questions && quizData.questions.length > 0) {
        setQuiz(quizData);
        if (quizData.language) {
          setSelectedLanguage(normalizeLang(quizData.language));
        }
        if (isCompleted && attempt) {
          // Reconstruct answers state for the review screen
          const attemptAnswers = {};
          if (Array.isArray(attempt.answers)) {
            attempt.answers.forEach((ans) => {
              const letters = ["A", "B", "C", "D"];
              const idx = letters.indexOf(ans.selectedAnswer);
              if (idx !== -1) {
                attemptAnswers[ans.questionIndex] = idx;
              }
            });
          }
          setAnswers(attemptAnswers);
          setSubmissionResult({
            score: attempt.score,
            correctCount:
              attempt.score != null
                ? Math.round((attempt.score / 100) * quizData.questions.length)
                : 0,
            totalQuestions: quizData.questions.length,
            masteryPointsGained: Math.round(attempt.score * 0.25),
          });
        }
      } else {
        setError(
          isPractice
            ? "Could not generate practice questions at this moment."
            : "No quiz available for today. Check back later!"
        );
      }
    } catch (err) {
      setError(err.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlLang = searchParams.get("language");
    if (urlLang && normalizeLang(urlLang) !== selectedLanguage) {
      setSelectedLanguage(normalizeLang(urlLang));
      fetchQuiz(normalizeLang(urlLang));
    } else {
      fetchQuiz(selectedLanguage);
    }
  }, [isPractice, topicParam, searchParams.get("language")]);

  const handleLanguageChange = (newLang) => {
    const cleanLang = normalizeLang(newLang);
    setSelectedLanguage(cleanLang);
    localStorage.setItem("preferred_quiz_language", cleanLang);

    const newParams = new URLSearchParams(searchParams);
    newParams.set("language", cleanLang);
    navigate(`?${newParams.toString()}`, { replace: true });

    setCurrentQuestionIndex(0);
    setAnswers({});
    setSubmissionResult(null);
    fetchQuiz(cleanLang);
  };

  const handleSelectOption = (optIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optIndex,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < (quiz?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    try {
      // Convert option index (0,1,2,3) to letter (A,B,C,D)
      const formattedAnswers = Object.entries(answers).map(([qIdx, ansIdx]) => {
        const letters = ["A", "B", "C", "D"];
        return {
          questionIndex: parseInt(qIdx, 10),
          selectedAnswer: letters[ansIdx] || "",
        };
      });

      let resultData = null;
      try {
        const res = await quizService.submitQuiz(quiz._id, formattedAnswers);
        resultData = res.data?.result || res.result || res.data;
      } catch {
        // Calculate locally fallback
        let correctCount = 0;
        const total = quiz.questions.length;
        quiz.questions.forEach((q, idx) => {
          if (answers[idx] === q.correctAnswer) {
            correctCount++;
          }
        });
        const score = Math.round((correctCount / total) * 100);
        resultData = {
          score,
          correctCount,
          totalQuestions: total,
          masteryPointsGained: Math.round(score * 0.25),
        };
      }

      setSubmissionResult(resultData);
    } catch (err) {
      setError(err.message || "Failed to submit quiz answers");
    } finally {
      setSubmitting(false);
    }
  };

  const parseOption = (optionText, optIdx) => {
    const defaultLetter = String.fromCharCode(65 + optIdx);
    if (!optionText || typeof optionText !== "string") {
      return { letter: defaultLetter, text: String(optionText || "") };
    }
    const match = optionText.match(/^([A-D])[\s.):\-\]]+\s*(.*)$/i);
    if (match) {
      return { letter: match[1].toUpperCase(), text: match[2] };
    }
    return { letter: defaultLetter, text: optionText };
  };

  const renderQuestionContent = (text) => {
    if (!text) return null;
    if (text.includes("\n")) {
      const parts = text.split("\n");
      const intro = parts[0];
      const code = parts.slice(1).join("\n");
      return (
        <div>
          <div className="quiz-question-text">{intro}</div>
          {code && (
            <pre className="quiz-code-block">
              <code>{code}</code>
            </pre>
          )}
        </div>
      );
    }
    return <div className="quiz-question-text">{text}</div>;
  };

  if (loading) {
    return <LoadingSpinner tip="Loading your personalized AI quiz..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchQuiz} />;
  }

  const questions = quiz?.questions || [];
  const currentQ = questions[currentQuestionIndex];
  const progressPercent = questions.length > 0 ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100) : 0;
  const isAllAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;
  const activeTopic = currentQ?.topic || quiz?.topic || topicParam || (quiz?.topics && quiz.topics[0]) || "loops";

  if (submissionResult) {
    const isGoodScore = submissionResult.score >= 70;
    return (
      <div className="quiz-page-container">
        <div className="quiz-result-card" style={{ background: "#FFFFFF", border: "1px solid #DDE5DC", borderRadius: 20, padding: "40px 32px", boxShadow: "0 2px 12px rgba(18, 60, 42, 0.05)" }}>
          <Result
            status={isGoodScore ? "success" : "info"}
            icon={
              isGoodScore ? (
                <CheckCircleFilled style={{ color: "#2F7D4A", fontSize: 68 }} />
              ) : (
                <ThunderboltFilled style={{ color: "#F4C542", fontSize: 68 }} />
              )
            }
            title={
              <h2 style={{ fontSize: 32, fontWeight: 700, color: "#18231D", margin: "16px 0 8px 0" }}>
                Quiz Score: {submissionResult.score}%
              </h2>
            }
            subTitle={
              <div style={{ fontSize: 16, color: "#59665E", maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
                You answered <strong style={{ color: "#18231D" }}>{submissionResult.correctCount}</strong> of{" "}
                <strong style={{ color: "#18231D" }}>{submissionResult.totalQuestions}</strong> questions correctly in{" "}
                <strong style={{ color: "#174832" }}>{getLanguageLabel(selectedLanguage)}</strong>.
                <div style={{ marginTop: 10, color: "#2F7D4A", fontWeight: 700, fontSize: 15 }}>
                  +{submissionResult.masteryPointsGained || 15} Topic Mastery points applied to your profile.
                </div>
              </div>
            }
            extra={[
              <Button
                key="dash"
                type="primary"
                icon={<DashboardOutlined />}
                onClick={() => navigate("/student/dashboard")}
                className="quiz-btn-next"
                style={{ height: 46, padding: "0 28px", borderRadius: 12, fontWeight: 600, background: "#123C2A", borderColor: "#123C2A" }}
              >
                Back to Dashboard
              </Button>,
              <Button
                key="path"
                icon={<BookOutlined />}
                onClick={() => navigate("/student/learning-path")}
                className="quiz-btn-prev"
                style={{ height: 46, padding: "0 28px", borderRadius: 12, fontWeight: 600, border: "1px solid #DDE5DC", color: "#18231D" }}
              >
                View Updated Learning Path
              </Button>,
            ]}
          />

          <Divider style={{ borderColor: "#DDE5DC", margin: "36px 0 28px 0", color: "#59665E", fontSize: 16, fontWeight: 600 }}>
            Review Questions & Explanations
          </Divider>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {questions.map((q, idx) => {
              const userAnswer = answers[idx];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <div
                  key={idx}
                  style={{
                    padding: "20px 24px",
                    borderRadius: 16,
                    border: `1px solid ${isCorrect ? "#DCEEDD" : "#FEE2E2"}`,
                    background: isCorrect ? "#EDF6EA" : "#FEF2F2",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    {isCorrect ? (
                      <CheckCircleFilled style={{ color: "#2F7D4A", fontSize: 20, marginTop: 3 }} />
                    ) : (
                      <CloseCircleFilled style={{ color: "#C83C3C", fontSize: 20, marginTop: 3 }} />
                    )}
                    <span style={{ fontWeight: 700, fontSize: 16, color: "#18231D", lineHeight: 1.45 }}>
                      Q{idx + 1}: {q.question.replace(/\n/g, " ")}
                    </span>
                  </div>

                  <div style={{ fontSize: 15, color: "#59665E", marginBottom: 6, paddingLeft: 32 }}>
                    <strong style={{ color: "#18231D" }}>Your choice:</strong>{" "}
                    <span style={{ color: isCorrect ? "#2F7D4A" : "#C83C3C", fontWeight: 600 }}>
                      {q.options[userAnswer] || "Not answered"}
                    </span>
                  </div>
                  {!isCorrect && (
                    <div style={{ fontSize: 15, color: "#2F7D4A", marginBottom: 6, paddingLeft: 32 }}>
                      <strong style={{ color: "#18231D" }}>Correct choice:</strong> {q.options[q.correctAnswer]}
                    </div>
                  )}
                  {q.explanation && (
                    <div
                      style={{
                        fontSize: 14,
                        color: "#174832",
                        marginTop: 10,
                        marginLeft: 32,
                        padding: "10px 14px",
                        background: "#FFFFFF",
                        borderRadius: 10,
                        borderLeft: "4px solid #2F7D4A",
                        border: "1px solid #DDE5DC",
                        lineHeight: 1.5,
                      }}
                    >
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const headerTitle = isPractice
    ? `AI Practice: ${topicParam ? topicParam.charAt(0).toUpperCase() + topicParam.slice(1) : "Topic Practice"}`
    : "Daily AI Quiz";

  const headerSubtitle = isPractice
    ? `Targeted 10 questions on ${topicParam || "selected topic"} in ${getLanguageLabel(selectedLanguage)}`
    : `Personalized 10 questions in ${getLanguageLabel(selectedLanguage)} from your focus topics`;

  return (
    <div className="quiz-page-container">
      {/* 1. QUIZ HEADER */}
      <div className="quiz-header-wrapper">
        <div className="quiz-header-title-group">
          <div className="quiz-header-title-row">
            <div className="quiz-title-icon-badge">
              <ThunderboltFilled />
            </div>
            <h1 className="quiz-main-heading">{headerTitle}</h1>
          </div>
          <p className="quiz-subtitle">{headerSubtitle}</p>
        </div>

        <div className="quiz-header-controls">
          {/* Language Selector */}
          <div className="quiz-lang-selector-pill">
            <CodeOutlined style={{ color: "#174832", fontSize: 16 }} />
            <span className="quiz-lang-label">Language:</span>
            <Select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              options={LANGUAGE_OPTIONS}
              size="small"
              className="quiz-lang-select"
              style={{ width: 92 }}
              bordered={false}
              dropdownStyle={{ background: "#FFFFFF", border: "1px solid #DDE5DC", borderRadius: 10 }}
            />
          </div>

          {/* Topic Badge */}
          {quiz?.topics && quiz.topics.length > 0 ? (
            <Space wrap>
              {quiz.topics.map((t, idx) => (
                <Tag key={idx} className="quiz-topic-pill-tag">
                  {t.toUpperCase()}
                </Tag>
              ))}
            </Space>
          ) : (
            <Tag className="quiz-topic-pill-tag">
              {activeTopic.toUpperCase()}
            </Tag>
          )}
        </div>
      </div>

      {/* 2. PROGRESS */}
      <div className="quiz-progress-section">
        <div className="quiz-progress-labels">
          <span className="quiz-progress-text-left">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="quiz-progress-text-right">
            {progressPercent}% Completed
          </span>
        </div>
        <div className="quiz-progress-track">
          <div
            className="quiz-progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3. QUESTION CARD */}
      {currentQ && (
        <div className="quiz-question-card">
          {/* Top Bar inside Card */}
          <div className="quiz-card-top-bar">
            <span className="quiz-question-number-badge">
              Question {currentQuestionIndex + 1}
            </span>
            <span className="quiz-card-topic-tag">
              {(currentQ.topic || activeTopic).toUpperCase()}
            </span>
          </div>

          {/* 4. QUESTION TEXT */}
          {renderQuestionContent(currentQ.question)}

          {/* 5. ANSWER OPTIONS */}
          <div className="quiz-options-group">
            {currentQ.options.map((optionRaw, optIdx) => {
              const isSelected = answers[currentQuestionIndex] === optIdx;
              const { letter, text } = parseOption(optionRaw, optIdx);

              return (
                <div
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`quiz-option-card ${isSelected ? "selected" : ""}`}
                >
                  {/* Radio indicator circle */}
                  <div className="quiz-radio-indicator">
                    {isSelected && <div className="quiz-radio-dot" />}
                  </div>

                  {/* Letter badge (A, B, C, D) */}
                  <div className="quiz-option-letter-badge">{letter}</div>

                  {/* Option Text */}
                  <div className="quiz-option-text">{text}</div>
                </div>
              );
            })}
          </div>

          {/* 8. BUTTONS / FOOTER */}
          <div className="quiz-navigation-footer">
            <Button
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              icon={<ArrowLeftOutlined />}
              className="quiz-btn-prev"
            >
              Previous
            </Button>

            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                type="primary"
                onClick={handleNext}
                disabled={answers[currentQuestionIndex] === undefined}
                className="quiz-btn-next"
              >
                Next Question <ArrowRightOutlined />
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleSubmitQuiz}
                loading={submitting}
                disabled={!isAllAnswered}
                icon={<SendOutlined />}
                className="quiz-btn-submit"
              >
                Submit Quiz Answers
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayQuizPage;
