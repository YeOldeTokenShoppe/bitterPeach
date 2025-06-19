import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card } from './ui/card';
import { Button } from './ui/button';
import styles from '../../styles/LearningModule.module.css';

const LearningModule = ({ modules }) => {
  const router = useRouter();
  const [currentModule, setCurrentModule] = useState(0);
  const [videoWatched, setVideoWatched] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [moduleCompleted, setModuleCompleted] = useState(false);
  const [completedModules, setCompletedModules] = useState([]);
  const [showError, setShowError] = useState(false);

  const defaultModules = [
    {
      id: 1,
      title: "Introduction to Web Development",
      videoUrl: "/1.mp4",
      duration: "5:00",
      quiz: {
        question: "What is the primary language for web page structure?",
        options: ["JavaScript", "HTML", "CSS", "Python"],
        correctAnswer: 1
      }
    },
    {
      id: 2,
      title: "Understanding CSS",
      videoUrl: "/2.mp4",
      duration: "6:30",
      quiz: {
        question: "What does CSS stand for?",
        options: ["Computer Style Sheets", "Creative Style Sheets", "Cascading Style Sheets", "Colorful Style Sheets"],
        correctAnswer: 2
      }
    },
    {
      id: 3,
      title: "JavaScript Basics",
      videoUrl: "/3.mp4",
      duration: "7:15",
      quiz: {
        question: "Which of the following is used to declare a variable in JavaScript?",
        options: ["var", "let", "const", "All of the above"],
        correctAnswer: 3
      }
    },
    {
      id: 4,
      title: "React Fundamentals",
      videoUrl: "/4.mp4",
      duration: "8:00",
      quiz: {
        question: "What is a React component?",
        options: ["A function that returns JSX", "A CSS class", "An HTML element", "A database"],
        correctAnswer: 0
      }
    },
    {
      id: 5,
      title: "Building Your First App",
      videoUrl: "/5.mp4",
      duration: "10:00",
      quiz: {
        question: "What command is used to create a new React app?",
        options: ["npm start", "create-react-app", "npx create-react-app", "react new"],
        correctAnswer: 2
      }
    }
  ];

  const currentModuleData = modules || defaultModules;
  const currentModuleItem = currentModuleData[currentModule];

  useEffect(() => {
    // Reset states when module changes
    setVideoWatched(false);
    setShowQuiz(false);
    setModuleCompleted(false);
    setQuizAnswers({});
    setShowError(false);
  }, [currentModule]);

  const handleVideoEnd = () => {
    setVideoWatched(true);
    setShowQuiz(true);
  };

  const handleAnswer = (optionIndex) => {
    setQuizAnswers({
      ...quizAnswers,
      [currentModule]: optionIndex
    });
    setShowError(false);
  };

  const submitQuiz = () => {
    const isCorrect = quizAnswers[currentModule] === currentModuleItem.quiz.correctAnswer;
    if (isCorrect) {
      setQuizScore(quizScore + 1);
      setModuleCompleted(true);
      setCompletedModules([...completedModules, currentModule]);
    } else {
      setShowError(true);
    }
  };

  const nextModule = () => {
    if (currentModule < currentModuleData.length - 1) {
      setCurrentModule(currentModule + 1);
    }
  };

  const isAllCompleted = completedModules.length === currentModuleData.length;

  if (isAllCompleted) {
    return (
      <div className={styles.completionScreen}>
        <div className={styles.completionCard}>
          <h1 className={styles.completionTitle}>🎉 Congratulations!</h1>
          <p className={styles.completionMessage}>
            You have successfully completed all {currentModuleData.length} modules!
          </p>
          <div className={styles.scoreDisplay}>
            <h2>Your Score: {quizScore}/{currentModuleData.length}</h2>
          </div>
          <div className={styles.completionButtons}>
            <Button 
              onClick={() => {
                setCurrentModule(0);
                setCompletedModules([]);
                setQuizScore(0);
              }}
              className={styles.restartButton}
            >
              Start Over
            </Button>
            <Button 
              onClick={() => router.back()}
              className={styles.returnButton}
            >
              Return to Previous Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.learningContainer}>
      <div className={styles.progressBar}>
        <div className={styles.progressHeader}>
          <h3>Learning Progress</h3>
          <span>{completedModules.length} / {currentModuleData.length} modules completed</span>
        </div>
        <div className={styles.progressTrack}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${(completedModules.length / currentModuleData.length) * 100}%` }}
          />
        </div>
        <div className={styles.moduleIndicators}>
          {currentModuleData.map((_, index) => (
            <div 
              key={index}
              className={`${styles.indicator} ${
                completedModules.includes(index) ? styles.completed : 
                index === currentModule ? styles.current : ''
              }`}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      <Card className={styles.moduleCard}>
        <div className={styles.moduleHeader}>
          <h2>Module {currentModule + 1}: {currentModuleItem.title}</h2>
          <span className={styles.duration}>Duration: {currentModuleItem.duration}</span>
        </div>

        {!showQuiz ? (
          <div className={styles.videoSection}>
            <video
              key={currentModuleItem.videoUrl}
              className={styles.videoPlayer}
              controls
              onEnded={handleVideoEnd}
              autoPlay
            >
              <source src={currentModuleItem.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            {!videoWatched && (
              <p className={styles.instruction}>Please watch the video to continue</p>
            )}
          </div>
        ) : (
          <div className={styles.quizSection}>
            <h3 className={styles.quizTitle}>Quick Quiz</h3>
            <div className={styles.quizContent}>
              <p className={styles.question}>{currentModuleItem.quiz.question}</p>
              <div className={styles.options}>
                {currentModuleItem.quiz.options.map((option, index) => (
                  <button
                    key={index}
                    className={`${styles.optionButton} ${
                      quizAnswers[currentModule] === index ? styles.selected : ''
                    }`}
                    onClick={() => handleAnswer(index)}
                    disabled={moduleCompleted}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {!moduleCompleted && (
                <>
                  <Button 
                    onClick={submitQuiz}
                    disabled={quizAnswers[currentModule] === undefined}
                    className={styles.submitButton}
                  >
                    Submit Answer
                  </Button>
                  {showError && (
                    <div className={styles.errorMessage}>
                      <p>❌ Incorrect answer. Please try again!</p>
                    </div>
                  )}
                </>
              )}
              {moduleCompleted && (
                <div className={styles.successMessage}>
                  <p>✅ Correct! Well done!</p>
                  <Button 
                    onClick={nextModule}
                    className={styles.nextButton}
                  >
                    {currentModule < currentModuleData.length - 1 ? 'Next Module' : 'Complete Course'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LearningModule;