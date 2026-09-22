import React, { useState, useEffect } from "react";
import {
  Card,
  Radio,
  Button,
  Progress,
  Typography,
  Tag,
  Alert,
  Space,
  Result,
  Divider,
} from "antd";
import {
  ThunderboltOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ArrowRightOutlined,
  RedoOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import quizService from "../../services/quiz.service";

const { Title, Text, Paragraph } = Typography;

export const TodayQuizPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionIndex]: selectedOptionIndex }
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  const fetchQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await quizService.getTodayQuiz();
      const quizData = res.data?.quiz || res.quiz || res.data || null;

      if (quizData && quizData.questions && quizData.questions.length > 0) {
        setQuiz(quizData);
      } else {
        setError("No quiz available for today. Check back later!");
      }
    } catch (err) {
      setError(err.message || "Failed to load today's quiz");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, []);

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
      const formattedAnswers = Object.entries(answers).map(([qIdx, ansIdx]) => ({
        questionIndex: parseInt(qIdx, 10),
        selectedOption: ansIdx,
      }));

      let resultData = null;
      try {
        const res = await quizService.submitQuiz(quiz._id, formattedAnswers);
        resultData = res.data?.result || res.result || res.data;
      } catch {
        // Calculate locally
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

  if (loading) {
    return <LoadingSpinner tip="Loading your personalized AI quiz..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchQuiz} />;
  }

  const questions = quiz?.questions || [];
  const currentQ = questions[currentQuestionIndex];
  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);
  const isAllAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  if (submissionResult) {
    const isGoodScore = submissionResult.score >= 70;
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 0" }}>
        <Card className="glass-card" bordered={false} bodyStyle={{ padding: "36px 32px" }}>
          <Result
            status={isGoodScore ? "success" : "info"}
            icon={
              isGoodScore ? (
                <CheckCircleFilled style={{ color: "var(--success)", fontSize: 64 }} />
              ) : (
                <ThunderboltOutlined style={{ color: "var(--primary)", fontSize: 64 }} />
              )
            }
            title={
              <h2 style={{ fontSize: 26, fontWeight: 800 }}>
                Quiz Score: {submissionResult.score}%
              </h2>
            }
            subTitle={
              <Text style={{ fontSize: 15, color: "var(--text-muted)" }}>
                You answered {submissionResult.correctCount} of {submissionResult.totalQuestions} questions correctly.
                +{submissionResult.masteryPointsGained || 15} Topic Mastery points applied to your profile.
              </Text>
            }
            extra={[
              <Button
                key="dash"
                type="primary"
                onClick={() => navigate("/student/dashboard")}
                style={{ borderRadius: 8, height: 40 }}
              >
                Back to Dashboard
              </Button>,
              <Button
                key="path"
                onClick={() => navigate("/student/learning-path")}
                style={{ borderRadius: 8, height: 40 }}
              >
                View Updated Learning Path
              </Button>,
            ]}
          />

          <Divider style={{ margin: "24px 0" }}>Review Questions & Explanations</Divider>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {questions.map((q, idx) => {
              const userAnswer = answers[idx];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <div
                  key={idx}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    background: isCorrect ? "rgba(16, 185, 129, 0.06)" : "rgba(239, 68, 68, 0.06)",
                    border: `1px solid ${isCorrect ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {isCorrect ? (
                      <CheckCircleFilled style={{ color: "var(--success)" }} />
                    ) : (
                      <CloseCircleFilled style={{ color: "var(--error)" }} />
                    )}
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      Q{idx + 1}: {q.question}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
                    <strong>Your choice:</strong> {q.options[userAnswer] || "Not answered"}
                  </div>
                  {!isCorrect && (
                    <div style={{ fontSize: 13, color: "var(--success)", marginBottom: 6 }}>
                      <strong>Correct choice:</strong> {q.options[q.correctAnswer]}
                    </div>
                  )}
                  {q.explanation && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ThunderboltOutlined style={{ fontSize: 20, color: "var(--primary)" }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Daily AI Quiz</h1>
          </div>
          <Text style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Personalized questions generated from your weak topics
          </Text>
        </div>

        {quiz?.topics && (
          <Space wrap>
            {quiz.topics.map((t, idx) => (
              <Tag key={idx} color="purple" style={{ borderRadius: 6 }}>
                {t}
              </Tag>
            ))}
          </Space>
        )}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{progressPercent}% Completed</span>
        </div>
        <Progress percent={progressPercent} showInfo={false} strokeColor="var(--primary)" />
      </div>

      {/* Question Card */}
      {currentQ && (
        <Card className="glass-card" bordered={false} bodyStyle={{ padding: "32px" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, lineHeight: 1.5, color: "var(--text-primary)" }}>
            {currentQ.question}
          </h3>

          <Radio.Group
            onChange={(e) => handleSelectOption(e.target.value)}
            value={answers[currentQuestionIndex]}
            style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}
          >
            {currentQ.options.map((optionText, optIdx) => {
              const isSelected = answers[currentQuestionIndex] === optIdx;
              return (
                <div
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: isSelected ? "var(--primary-light)" : "var(--bg-tertiary)",
                    border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Radio value={optIdx} style={{ fontSize: 14, fontWeight: isSelected ? 600 : 400 }}>
                    {optionText}
                  </Radio>
                </div>
              );
            })}
          </Radio.Group>

          {/* Navigation Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 32,
              paddingTop: 20,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <Button onClick={handlePrev} disabled={currentQuestionIndex === 0}>
              Previous
            </Button>

            {currentQuestionIndex < questions.length - 1 ? (
              <Button type="primary" onClick={handleNext} disabled={answers[currentQuestionIndex] === undefined}>
                Next Question <ArrowRightOutlined />
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleSubmitQuiz}
                loading={submitting}
                disabled={!isAllAnswered}
                style={{ background: "#10b981", borderColor: "#10b981", fontWeight: 600 }}
              >
                Submit Quiz Answers
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default TodayQuizPage;
