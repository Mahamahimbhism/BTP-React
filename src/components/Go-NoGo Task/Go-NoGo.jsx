import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Go-NoGo.css';
import { createTaskDataPackage, createTrialData } from '../../utils/taskDataFormatter'

const GoNoGoTest = ({ onComplete }) => {
    const taskStartTime = useRef(new Date().toISOString())
    const trialDataArray = useRef([])

    const [score, setScore] = useState(0);
    const [correctResponses, setCorrectResponses] = useState(0);
    const [wrongResponses, setWrongResponses] = useState(0);
    const [totalTrials, setTotalTrials] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [isPracticeRound, setIsPracticeRound] = useState(false);
    const [currentRound, setCurrentRound] = useState(1);
    const [roundResults, setRoundResults] = useState([]);
    const [currentShape, setCurrentShape] = useState('+');
    const [currentShapeColor, setCurrentShapeColor] = useState('transparent');
    const [currentShapeClass, setCurrentShapeClass] = useState('');
    const [message, setMessage] = useState('');
    const [messageColor, setMessageColor] = useState('');
    const [showWelcome, setShowWelcome] = useState(true);
    const [showResults, setShowResults] = useState(false);
    const [buttonText, setButtonText] = useState('Start Test');
    const [buttonDisabled, setButtonDisabled] = useState(false);

    const totalRounds = 2;
    const testDuration = 4;
    const shapes = ['orange', 'blue'];

    const stimulusTimeoutRef = useRef(null);
    const fixationTimeoutRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const trialStartTimeRef = useRef(null);
    const stimulusStartTimeRef = useRef(0);
    const currentRoundReactionTimesRef = useRef([]);
    const reactionTimesRef = useRef([]);
    const dataCollectorRef = useRef(null);
    const isTestRunningRef = useRef(false);
    const currentShapeClassRef = useRef('');
    const isPracticeRoundRef = useRef(false);

    useEffect(() => {
        isTestRunningRef.current = isTestRunning;
    }, [isTestRunning]);

    useEffect(() => {
        currentShapeClassRef.current = currentShapeClass;
    }, [currentShapeClass]);

    useEffect(() => {
        isPracticeRoundRef.current = isPracticeRound;
    }, [isPracticeRound]);

    const showNextStimulus = useCallback(() => {
        clearTimeout(stimulusTimeoutRef.current);
        clearTimeout(fixationTimeoutRef.current);

        setCurrentShape('+');
        setCurrentShapeColor('transparent');
        setCurrentShapeClass('');

        fixationTimeoutRef.current = setTimeout(() => {
            if (!isTestRunningRef.current) return;

            const randomShape = shapes[Math.random() < 0.7 ? 0 : 1];
            setCurrentShape('');
            setCurrentShapeColor(randomShape === 'orange' ? '#ff9800' : '#2196f3');
            setCurrentShapeClass(`${randomShape}-square`);

            trialStartTimeRef.current = new Date().toISOString()
            stimulusStartTimeRef.current = Date.now();
            setTotalTrials(prev => prev + 1);

            stimulusTimeoutRef.current = setTimeout(() => {
                if (!isTestRunningRef.current) return;

                setCurrentShape('+');
                setCurrentShapeColor('transparent');
                setCurrentShapeClass('');

                const nextDelay = Math.random() * 1000 + 500;
                setTimeout(() => {
                    if (isTestRunningRef.current) {
                        showNextStimulus();
                    }
                }, nextDelay);
            }, 1000);
        }, Math.random() * 500 + 500);
    }, []);

    const handleKeyPress = useCallback((e) => {
        if (e.code === 'Space' && isTestRunningRef.current) {
            e.preventDefault();
            const trialEndTime = new Date().toISOString()
            const reactionTime = Date.now() - stimulusStartTimeRef.current;
            const shapeClass = currentShapeClassRef.current;
            const isPractice = isPracticeRoundRef.current;

            let isCorrect = false
            let trialResult = 'incorrect'

            if (shapeClass.includes('orange-square')) {
                setCorrectResponses(prev => prev + 1);
                setScore(prev => prev + 1);
                reactionTimesRef.current.push(reactionTime);
                currentRoundReactionTimesRef.current.push(reactionTime);
                isCorrect = true
                trialResult = 'correct'
                if (isPractice) {
                    setMessage(`Correct! (${reactionTime}ms)`);
                    setMessageColor('#27ae60');
                }
            } else if (shapeClass.includes('blue-square')) {
                setWrongResponses(prev => prev + 1);
                trialResult = 'false-alarm'
                if (isPractice) {
                    setMessage("Wrong! Shouldn't press for blue");
                    setMessageColor('#e74c3c');
                }
            } else {
                setWrongResponses(prev => prev + 1);
                trialResult = 'premature-response'
                if (isPractice) {
                    setMessage('Too early! Wait for the square');
                    setMessageColor('#e74c3c');
                }
            }

            // Record trial data with timestamps
            trialDataArray.current.push(
                createTrialData(
                    trialDataArray.current.length + 1,
                    trialStartTimeRef.current,
                    trialEndTime,
                    {
                        response: 'spacebar',
                        isCorrect,
                        trialResult,
                        reactionTime,
                        stimulus: shapeClass,
                        isPractice
                    }
                )
            )

            setCurrentShape('+');
            setCurrentShapeColor('transparent');
            setCurrentShapeClass('');

            if (!isPractice) {
                setTimeout(() => {
                    setMessage('');
                }, 300);
            }
        }
    }, []);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleKeyPress]);

    const startTimer = useCallback(() => {
        clearInterval(timerIntervalRef.current);

        timerIntervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerIntervalRef.current);
                    clearTimeout(stimulusTimeoutRef.current);
                    clearTimeout(fixationTimeoutRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    useEffect(() => {
        if (timeLeft === 0 && isTestRunning) {
            setIsTestRunning(false);

            if (isPracticeRound) {
                setMessage('Practice round complete! Main test starts now.');
                setTimeout(() => {
                    startMainTest(1);
                }, 2000);
            } else {
                endRound();
            }
        }
    }, [timeLeft]);

    const startInitialTest = () => {
        setShowWelcome(false);
        setButtonText('Preparing...');
        setButtonDisabled(true);

        setTimeout(() => {
            startPracticeRound();
        }, 1000);
    };

    const startPracticeRound = () => {
        setIsPracticeRound(true);
        setScore(0);
        setCorrectResponses(0);
        setWrongResponses(0);
        setTotalTrials(0);
        setTimeLeft(10);
        setIsTestRunning(true);
        setMessage('Practice Round - Get ready!');
        setMessageColor('');

        startTimer();
        showNextStimulus();
    };

    const startMainTest = (round) => {
        setIsPracticeRound(false);
        setScore(0);
        setCorrectResponses(0);
        setWrongResponses(0);
        setTotalTrials(0);
        setTimeLeft(testDuration);
        setIsTestRunning(true);
        setCurrentRound(round);
        setMessage(`Round ${round} - Be ready!`);
        setMessageColor('');
        currentRoundReactionTimesRef.current = [];

        startTimer();
        showNextStimulus();
    };

    const endRound = () => {
        setIsTestRunning(false);
        clearInterval(timerIntervalRef.current);
        clearTimeout(stimulusTimeoutRef.current);
        clearTimeout(fixationTimeoutRef.current);

        const avgReactionTime = currentRoundReactionTimesRef.current.length > 0
            ? Math.round(currentRoundReactionTimesRef.current.reduce((a, b) => a + b, 0) / currentRoundReactionTimesRef.current.length)
            : 0;

        const roundData = {
            round: currentRound,
            total: totalTrials,
            correct: correctResponses,
            wrong: wrongResponses,
            avgReactionTime: avgReactionTime
        };

        setRoundResults(prev => [...prev, roundData]);
        currentRoundReactionTimesRef.current = [];

        if (currentRound < totalRounds) {
            setTimeout(() => {
                startMainTest(currentRound + 1);
            }, 2000);
        } else {
            showFinalResults(roundData);
        }
    };

    const showFinalResults = (lastRoundData) => {
        setShowResults(true);
    };

    const goToAnotherTest = () => {
        const saveData = calculateTotals();
        console.log(saveData);
        if (onComplete) {
            // Create comprehensive task data package with timestamps
            const taskData = createTaskDataPackage(
                'gng',
                {
                    totalRounds,
                    roundResults,
                    ...saveData
                },
                taskStartTime.current,
                trialDataArray.current
            )
            onComplete(taskData)
        } else {
            window.location.reload();
        }
    };

    const calculateTotals = () => {
        let totalCorrect = 0;
        let totalWrong = 0;
        let totalMoves = 0;
        let totalReactionTime = 0;
        let roundsWithReactionTimes = 0;

        roundResults.forEach(result => {
            totalCorrect += result.correct;
            totalWrong += result.wrong;
            totalMoves += result.total;
            if (result.avgReactionTime > 0) {
                totalReactionTime += result.avgReactionTime;
                roundsWithReactionTimes++;
            }
        });

        const overallAvgReactionTime = roundsWithReactionTimes > 0
            ? Math.round(totalReactionTime / roundsWithReactionTimes)
            : 0;

        return { totalCorrect, totalWrong, totalMoves, overallAvgReactionTime };
    };

    useEffect(() => {
        return () => {
            clearInterval(timerIntervalRef.current);
            clearTimeout(stimulusTimeoutRef.current);
            clearTimeout(fixationTimeoutRef.current);
        };
    }, []);

    const totals = calculateTotals();

    return (
        <>
            {showWelcome && (
                <div className="container" id="welcomeScreen">
                    <h1>Welcome to the GO/NO-GO TEST!</h1>

                    <div className="instructions">
                        <p>If an <span className="orange-text">ORANGE</span> square appears, press the <span className="space-key">SPACE</span> key on the keyboard.</p>
                        <p>If a <span className="blue-text">BLUE</span> square appears, do not press anything.</p>
                        <p>You have only one second to respond and please be as fast as you can.</p>
                    </div>

                    <button id="goNoGoButton" onClick={startInitialTest} disabled={buttonDisabled}>
                        {buttonText}
                    </button>
                </div>
            )}

            {!showWelcome && (
                <div className="container" id="testContainer">
                    {!showResults && (
                        <div id="testScreen">
                            <div
                                id="shapeDisplay"
                                className={`shape-display ${currentShapeClass}`}
                                style={{ backgroundColor: currentShapeColor }}
                            >
                                {currentShape}
                            </div>
                            <p>Round: <span id="currentRound">{isPracticeRound ? 'Practice' : `${currentRound}/${totalRounds}`}</span></p>
                            <p>Time Left: <span id="timeLeft">{timeLeft}</span> seconds</p>
                            <p id="message" style={{ color: messageColor }}>{message}</p>
                        </div>
                    )}

                    {showResults && (
                        <div id="resultsScreen">
                            <h2>Test Results</h2>
                            <table className="results-table">
                                <thead>
                                    <tr>
                                        <th>Round</th>
                                        <th>Total Moves</th>
                                        <th>Correct Moves</th>
                                        <th>Wrong Moves</th>
                                        <th>Avg Reaction Time (ms)</th>
                                    </tr>
                                </thead>
                                <tbody id="resultsBody">
                                    {roundResults.map((result, index) => (
                                        <tr key={index}>
                                            <td>{result.round}</td>
                                            <td>{result.total}</td>
                                            <td>{result.correct}</td>
                                            <td>{result.wrong}</td>
                                            <td>{result.avgReactionTime > 0 ? result.avgReactionTime : '-'}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td><strong>Total</strong></td>
                                        <td><strong>{totals.totalMoves}</strong></td>
                                        <td><strong>{totals.totalCorrect}</strong></td>
                                        <td><strong>{totals.totalWrong}</strong></td>
                                        <td><strong>{totals.overallAvgReactionTime > 0 ? totals.overallAvgReactionTime : '-'}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                            <button id="goToAnotherTest" onClick={goToAnotherTest}>Go to Another Test</button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default GoNoGoTest;