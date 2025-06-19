import React from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';

const LearningModule = dynamic(() => import('../components/LearningModule'), {
  ssr: false
});

const LearningPage = () => {
  // Example custom modules - you can pass your own modules array here
  const customModules = [
    {
      id: 1,
      title: "Welcome to Our Platform",
      videoUrl: "/1.mp4",
      duration: "3:00",
      quiz: {
        question: "What is the main purpose of this platform?",
        options: [
          "Entertainment only",
          "Educational content and learning",
          "Gaming platform",
          "Social media"
        ],
        correctAnswer: 1
      }
    },
    {
      id: 2,
      title: "Getting Started",
      videoUrl: "/2.mp4",
      duration: "4:30",
      quiz: {
        question: "What should you do first when starting?",
        options: [
          "Skip all tutorials",
          "Create your profile",
          "Watch the introduction video",
          "Contact support"
        ],
        correctAnswer: 2
      }
    },
    {
      id: 3,
      title: "Core Features",
      videoUrl: "/3.mp4",
      duration: "5:00",
      quiz: {
        question: "Which feature helps track your progress?",
        options: [
          "Shopping cart",
          "Progress dashboard",
          "Calendar",
          "Calculator"
        ],
        correctAnswer: 1
      }
    },
    {
      id: 4,
      title: "Advanced Techniques",
      videoUrl: "/4.mp4",
      duration: "6:00",
      quiz: {
        question: "What is recommended for advanced users?",
        options: [
          "Start from beginning",
          "Skip basics",
          "Customize settings",
          "Use default settings only"
        ],
        correctAnswer: 2
      }
    },
    {
      id: 5,
      title: "Best Practices",
      videoUrl: "/5.mp4",
      duration: "7:00",
      quiz: {
        question: "How often should you practice?",
        options: [
          "Once a month",
          "Only when required",
          "Daily for best results",
          "Never"
        ],
        correctAnswer: 2
      }
    }
  ];

  return (
    <>
      <Head>
        <title>Learning Module - Interactive Training</title>
        <meta name="description" content="Complete our interactive training modules with videos and quizzes" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
        <LearningModule modules={customModules} />
      </div>
    </>
  );
};

export default LearningPage;