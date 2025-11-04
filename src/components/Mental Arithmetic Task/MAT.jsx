import React, { useState, useEffect, useRef } from 'react';
import './MAT.css';
import { createTaskDataPackage, createTrialData } from '../../utils/taskDataFormatter'

const MAT = ({ onComplete }) => {
    // Task constants
    const PROBLEM_DURATION = 1000;
    const COMPUTATION_DURATION = 4000;
    const RESPONSE_DURATION = 1000;
    const FEEDBACK_DURATION = 1000;
    const PRACTICE_TRIALS = 5;
    const MAIN_TRIALS = 45;

    // State management
    const [screen, setScreen] = useState('welcome');
    const [currentProblem, setCurrentProblem] = useState('');
    const [leftOption, setLeftOption] = useState('');
    const [rightOption, setRightOption] = useState('');
    const [showProblem, setShowProblem] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [feedbackType, setFeedbackType] = useState('');
    const [currentTrial, setCurrentTrial] = useState(0);
    const [isPractice, setIsPractice] = useState(false);
    const [progress, setProgress] = useState(0);

    // Results state
    const [results, setResults] = useState(null);

    // Task-level refs for timestamps
    const taskStartTime = useRef(new Date().toISOString())
    const trialDataArray = useRef([])
    const trialStartTimeRef = useRef(null)

    // Refs for task control
    const trialsRef = useRef([]);
    const currentTrialIndexRef = useRef(0);
    const isActiveRef = useRef(false);
    const canRespondRef = useRef(false);
    const responseStartTimeRef = useRef(0);
    const timeoutRef = useRef(null);
    const correctAnswerRef = useRef('');

    // Data collection refs
    const trialDataRef = useRef({
        correct: 0,
        incorrect: 0,
        tooSlow: 0,
        reactionTimes: [],
        problems: []
    });

    // Generate arithmetic problem
    const generateProblem = (isTraining = false) => {
        const isAddition = Math.random() < 0.5;
        const operand = 17;

        let baseNumber;
        if (isTraining) {
            // Simpler problems for training (smaller numbers)
            baseNumber = Math.floor(Math.random() * 50) + 20; // 20-69
        } else {
            // Mix of 2-digit and 3-digit numbers for main task
            if (Math.random() < 0.5) {
                baseNumber = Math.floor(Math.random() * 90) + 10; // 10-99 (2-digit)
            } else {
                baseNumber = Math.floor(Math.random() * 900) + 100; // 100-999 (3-digit)
            }
        }

        let correctAnswer;
        let problemText;

        if (isAddition) {
            correctAnswer = baseNumber + operand;
            problemText = `${baseNumber} + ${operand}`;
        } else {
            // Ensure subtraction doesn't go negative
            if (baseNumber < operand) {
                baseNumber += operand;
            }
            correctAnswer = baseNumber - operand;
            problemText = `${baseNumber} - ${operand}`;
        }

        // Generate distractor (incorrect answer)
        const distractor = generateDistractor(correctAnswer);

        // Randomly position correct answer on left or right
        const correctOnLeft = Math.random() < 0.5;

        return {
            problem: problemText,
            correctAnswer: correctAnswer,
            distractor: distractor,
            leftOption: correctOnLeft ? correctAnswer : distractor,
            rightOption: correctOnLeft ? distractor : correctAnswer,
            correctSide: correctOnLeft ? 'left' : 'right'
        };
    };

    // Generate plausible distractor
    const generateDistractor = (correctAnswer) => {
        const variations = [
            correctAnswer + 10,
            correctAnswer - 10,
            correctAnswer + 20,
            correctAnswer - 20,
            correctAnswer + 17,
            correctAnswer - 17,
            correctAnswer + 1,
            correctAnswer - 1
        ];

        // Filter out negative numbers and the correct answer
        const validVariations = variations.filter(v => v > 0 && v !== correctAnswer);

        return validVariations[Math.floor(Math.random() * validVariations.length)];
    };

    // Generate trial sequence
    const generateTrials = (numTrials, isTraining = false) => {
        const trials = [];
        for (let i = 0; i < numTrials; i++) {
            trials.push(generateProblem(isTraining));
        }
        return trials;
    };

    // Show trial sequence
    const showTrial = () => {
        if (!isActiveRef.current) return;

        const maxTrials = isPractice ? PRACTICE_TRIALS : MAIN_TRIALS;

        if (currentTrialIndexRef.current >= maxTrials) {
            endTask();
            return;
        }

        const trial = trialsRef.current[currentTrialIndexRef.current];

        // Reset state
        setShowProblem(false);
        setShowOptions(false);
        setFeedback('');
        canRespondRef.current = false;
        correctAnswerRef.current = trial.correctSide;

        // Phase 1: Show problem (1000ms)
        setCurrentProblem(trial.problem);
        setShowProblem(true);

        timeoutRef.current = setTimeout(() => {
            // Phase 2: Computation period - blank screen (4000ms)
            setShowProblem(false);

            timeoutRef.current = setTimeout(() => {
                // Phase 3: Show options (1000ms response window)
                setLeftOption(trial.leftOption.toString());
                setRightOption(trial.rightOption.toString());
                setShowOptions(true);
                canRespondRef.current = true;
                trialStartTimeRef.current = new Date().toISOString();
                responseStartTimeRef.current = Date.now();

                timeoutRef.current = setTimeout(() => {
                    // No response in time
                    if (canRespondRef.current) {
                        processResponse(null, RESPONSE_DURATION, trial);
                    }
                }, RESPONSE_DURATION);
            }, COMPUTATION_DURATION);
        }, PROBLEM_DURATION);
    };

    // Process response
    const processResponse = (response, reactionTime, trial) => {
        canRespondRef.current = false;
        setShowOptions(false);

        let feedbackText = '';
        let feedbackClass = '';
        let isCorrect = false;

        if (response === null) {
            // Too slow
            feedbackText = 'Too slow';
            feedbackClass = 'too-slow';
            trialDataRef.current.tooSlow++;
        } else if (response === trial.correctSide) {
            // Correct
            feedbackText = 'Correct';
            feedbackClass = 'correct';
            isCorrect = true;
            trialDataRef.current.correct++;
            trialDataRef.current.reactionTimes.push(reactionTime);
        } else {
            // Incorrect
            feedbackText = 'Incorrect';
            feedbackClass = 'incorrect';
            trialDataRef.current.incorrect++;
        }

        // Store trial data
        trialDataRef.current.problems.push({
            trialNumber: currentTrialIndexRef.current + 1,
            problem: trial.problem,
            correctAnswer: trial.correctAnswer,
            response: response,
            isCorrect: isCorrect,
            reactionTime: reactionTime,
            tooSlow: response === null
        });

        // Record trial data with timestamps
        trialDataArray.current.push(
            createTrialData(
                currentTrialIndexRef.current,
                trialStartTimeRef.current,
                new Date().toISOString(),
                {
                    problem: trial.problem,
                    correctAnswer: trial.correctAnswer,
                    response,
                    isCorrect,
                    reactionTime,
                    tooSlow: response === null,
                    isPractice
                }
            )
        );

        setFeedback(feedbackText);
        setFeedbackType(feedbackClass);

        // Show feedback, then advance
        timeoutRef.current = setTimeout(() => {
            advanceToNextTrial();
        }, FEEDBACK_DURATION);
    };

    // Advance to next trial
    const advanceToNextTrial = () => {
        currentTrialIndexRef.current++;
        setCurrentTrial(currentTrialIndexRef.current);

        if (!isPractice) {
            const progressPercent = (currentTrialIndexRef.current / MAIN_TRIALS) * 100;
            setProgress(progressPercent);
        }

        const maxTrials = isPractice ? PRACTICE_TRIALS : MAIN_TRIALS;

        if (currentTrialIndexRef.current >= maxTrials) {
            if (isPractice) {
                endPractice();
            } else {
                endTask();
            }
        } else {
            // Small delay before next trial
            timeoutRef.current = setTimeout(() => {
                showTrial();
            }, 200);
        }
    };

    // Keyboard event handler
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (!isActiveRef.current || !canRespondRef.current) return;

            const key = e.code;
            if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;

            e.preventDefault();

            const reactionTime = Date.now() - responseStartTimeRef.current;
            const response = key === 'ArrowLeft' ? 'left' : 'right';
            const trial = trialsRef.current[currentTrialIndexRef.current];

            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            processResponse(response, reactionTime, trial);
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isPractice]);

    // Start practice
    const startPractice = () => {
        setIsPractice(true);
        currentTrialIndexRef.current = 0;
        setCurrentTrial(0);
        isActiveRef.current = true;

        trialDataRef.current = {
            correct: 0,
            incorrect: 0,
            tooSlow: 0,
            reactionTimes: [],
            problems: []
        };

        trialsRef.current = generateTrials(PRACTICE_TRIALS, true);
        setScreen('practice');

        setTimeout(() => {
            showTrial();
        }, 1000);
    };

    // End practice
    const endPractice = () => {
        isActiveRef.current = false;
        setFeedback('Practice complete! Starting main task...');
        setFeedbackType('correct');

        setTimeout(() => {
            startMainTask();
        }, 2000);
    };

    // Start main task
    const startMainTask = () => {
        setIsPractice(false);
        currentTrialIndexRef.current = 0;
        setCurrentTrial(0);
        setProgress(0);
        isActiveRef.current = true;

        trialDataRef.current = {
            correct: 0,
            incorrect: 0,
            tooSlow: 0,
            reactionTimes: [],
            problems: []
        };

        trialsRef.current = generateTrials(MAIN_TRIALS, false);
        setScreen('task');

        setTimeout(() => {
            showTrial();
        }, 1000);
    };

    // End task and show results
    const endTask = () => {
        isActiveRef.current = false;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const data = trialDataRef.current;
        const totalTrials = data.correct + data.incorrect + data.tooSlow;
        const accuracy = totalTrials > 0 ? ((data.correct / totalTrials) * 100).toFixed(1) : '0.0';
        const avgRT = data.reactionTimes.length > 0 ?
            Math.round(data.reactionTimes.reduce((a, b) => a + b, 0) / data.reactionTimes.length) : 0;

        setResults({
            correct: data.correct,
            incorrect: data.incorrect,
            tooSlow: data.tooSlow,
            total: totalTrials,
            accuracy: accuracy,
            avgRT: avgRT,
            problems: data.problems
        });

        setScreen('results');
    };

    // Restart task or continue to next
    const restartTask = () => {
        if (onComplete) {
            const taskData = createTaskDataPackage(
                'mat',
                trialDataRef.current,
                taskStartTime.current,
                trialDataArray.current
            );
            onComplete(taskData);
        } else {
            setScreen('welcome');
            setResults(null);
        }
    };

    return (
        <div className="ma-container">
            {screen === 'welcome' && (
                <div className="ma-welcome-screen">
                    <h1 className="ma-title">Mental Arithmetic Stress Task</h1>

                    <div className="ma-instructions">
                        <h3 className="ma-subtitle">Instructions:</h3>
                        <p className="ma-text">
                            This task measures your ability to perform mental arithmetic under time pressure.
                        </p>

                        <div className="ma-instruction-box">
                            <h4 className="ma-box-title">What you'll see:</h4>
                            <ul className="ma-list">
                                <li className="ma-list-item">An arithmetic problem (addition or subtraction by 17)</li>
                                <li className="ma-list-item">A blank screen for mental computation</li>
                                <li className="ma-list-item">Two answer options to choose from</li>
                                <li className="ma-list-item">Immediate feedback on your response</li>
                            </ul>
                        </div>

                        <div className="ma-instruction-box">
                            <h4 className="ma-box-title">Your Task:</h4>
                            <ul className="ma-list">
                                <li className="ma-list-item">Read the arithmetic problem carefully</li>
                                <li className="ma-list-item">Compute the answer mentally during the blank screen</li>
                                <li className="ma-list-item">When two options appear, press <kbd className="ma-kbd">←</kbd> for the LEFT answer or <kbd className="ma-kbd">→</kbd> for the RIGHT answer</li>
                                <li className="ma-list-item">You have <strong>1 second</strong> to respond once the options appear</li>
                            </ul>
                            <p className="ma-emphasis">Work as <strong>quickly</strong> and <strong>accurately</strong> as possible!</p>
                        </div>

                        <div className="ma-task-info">
                            <p className="ma-text"><strong>Practice:</strong> 5 trials</p>
                            <p className="ma-text"><strong>Main Task:</strong> 45 trials (~5 minutes)</p>
                        </div>
                    </div>

                    <button className="ma-button" onClick={startPractice}>Start Practice</button>
                </div>
            )}

            {(screen === 'practice' || screen === 'task') && (
                <div className="ma-task-screen">
                    <h1 className="ma-title">
                        {screen === 'practice' ? 'Practice Round' : 'Mental Arithmetic Task'}
                    </h1>

                    {!isPractice && (
                        <div className="ma-progress-container">
                            <div className="ma-trial-info">
                                Trial: {currentTrial} / {MAIN_TRIALS}
                            </div>
                            <div className="ma-progress-bar">
                                <div className="ma-progress-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}

                    {isPractice && (
                        <div className="ma-trial-info">
                            Practice Trial: {currentTrial} / {PRACTICE_TRIALS}
                        </div>
                    )}

                    <div className="ma-display-area">
                        {showProblem && (
                            <div className="ma-problem">{currentProblem}</div>
                        )}

                        {!showProblem && !showOptions && !feedback && (
                            <div className="ma-computation-text">Calculate mentally...</div>
                        )}

                        {showOptions && (
                            <div className="ma-options-container">
                                <div className="ma-option">{leftOption}</div>
                                <div className="ma-option">{rightOption}</div>
                            </div>
                        )}

                        {feedback && (
                            <div className={`ma-feedback ${feedbackType}`}>
                                {feedback}
                            </div>
                        )}
                    </div>

                    <div className="ma-hint">
                        Press ← for left answer or → for right answer
                    </div>
                </div>
            )}

            {screen === 'results' && results && (
                <div className="ma-results-screen">
                    <h2 className="ma-title">Mental Arithmetic Task Results</h2>

                    <div className="ma-results-grid">
                        <div className="ma-result-card">
                            <div className="ma-result-label">Total Trials</div>
                            <div className="ma-result-value">{results.total}</div>
                        </div>
                        <div className="ma-result-card correct">
                            <div className="ma-result-label">Correct</div>
                            <div className="ma-result-value">{results.correct}</div>
                        </div>
                        <div className="ma-result-card incorrect">
                            <div className="ma-result-label">Incorrect</div>
                            <div className="ma-result-value">{results.incorrect}</div>
                        </div>
                        <div className="ma-result-card too-slow">
                            <div className="ma-result-label">Too Slow</div>
                            <div className="ma-result-value">{results.tooSlow}</div>
                        </div>
                    </div>

                    <div className="ma-summary-box">
                        <h3 className="ma-summary-title">Performance Summary</h3>
                        <p className="ma-summary-text">
                            <strong>Accuracy:</strong> {results.accuracy}%
                        </p>
                        <p className="ma-summary-text">
                            <strong>Average Response Time:</strong> {results.avgRT > 0 ? `${results.avgRT}ms` : '-'}
                        </p>
                    </div>

                    <div className="ma-details-box">
                        <h3 className="ma-summary-title">Trial Details</h3>
                        <div className="ma-table-container">
                            <table className="ma-table">
                                <thead>
                                    <tr>
                                        <th>Trial</th>
                                        <th>Problem</th>
                                        <th>Answer</th>
                                        <th>Result</th>
                                        <th>RT (ms)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.problems.map((problem, idx) => (
                                        <tr key={idx}>
                                            <td>{problem.trialNumber}</td>
                                            <td>{problem.problem}</td>
                                            <td>{problem.correctAnswer}</td>
                                            <td className={problem.tooSlow ? 'too-slow' : problem.isCorrect ? 'correct' : 'incorrect'}>
                                                {problem.tooSlow ? 'Too Slow' : problem.isCorrect ? 'Correct' : 'Incorrect'}
                                            </td>
                                            <td>{problem.tooSlow ? '-' : problem.reactionTime}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <button className="ma-button" onClick={restartTask}>Continue to Next Task</button>
                </div>
            )}
        </div>
    );
};

export default MAT;