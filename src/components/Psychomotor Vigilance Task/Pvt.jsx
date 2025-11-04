import React, { useState, useEffect, useRef, useCallback } from 'react';
import './pvt.css';
import { createTaskDataPackage, createTrialData } from '../../utils/taskDataFormatter'

const Pvt = ({ onComplete }) => {
    const taskStartTime = useRef(new Date().toISOString())
    const trialDataArray = useRef([])
    const trialStartTimeRef = useRef(null)

    const [screen, setScreen] = useState('welcome');
    const [currentRound, setCurrentRound] = useState(1);
    const [timeLeft, setTimeLeft] = useState(30);
    const [stimulusText, setStimulusText] = useState('+');
    const [stimulusColor, setStimulusColor] = useState('#000');
    const [message, setMessage] = useState('');
    const [messageColor, setMessageColor] = useState('#e74c3c');
    const [roundResults, setRoundResults] = useState([]);
    const [isPracticeRound, setIsPracticeRound] = useState(false);

    const startTimeRef = useRef(null);
    const reactionTimesRef = useRef([]);
    const falseStartsRef = useRef(0);
    const isStimulusOnRef = useRef(false);
    const isTestRunningRef = useRef(false);
    const stimulusTimeoutRef = useRef(null);
    const fixationTimeoutRef = useRef(null);
    const counterIntervalRef = useRef(null);
    const timerIntervalRef = useRef(null);

    const totalRounds = 2;
    const testDuration = 5;

    const clearAllTimeouts = useCallback(() => {
        if (stimulusTimeoutRef.current) clearTimeout(stimulusTimeoutRef.current);
        if (fixationTimeoutRef.current) clearTimeout(fixationTimeoutRef.current);
        if (counterIntervalRef.current) clearInterval(counterIntervalRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }, []);

    const showNextStimulus = useCallback((showFeedback) => {
        if (stimulusTimeoutRef.current) clearTimeout(stimulusTimeoutRef.current);
        if (fixationTimeoutRef.current) clearTimeout(fixationTimeoutRef.current);

        setStimulusText('+');
        setStimulusColor('#000');
        isStimulusOnRef.current = false;

        fixationTimeoutRef.current = setTimeout(() => {
            setStimulusText('0');
            setStimulusColor('#e53935');
            startTimeRef.current = Date.now();
            isStimulusOnRef.current = true;

            counterIntervalRef.current = setInterval(() => {
                if (isStimulusOnRef.current && startTimeRef.current) {
                    const elapsed = Date.now() - startTimeRef.current;
                    setStimulusText(elapsed.toString());
                } else {
                    if (counterIntervalRef.current) clearInterval(counterIntervalRef.current);
                }
            }, 10);

            stimulusTimeoutRef.current = setTimeout(() => {
                setStimulusText('+');
                setStimulusColor('#000');
                isStimulusOnRef.current = false;
                if (counterIntervalRef.current) clearInterval(counterIntervalRef.current);

                if (isTestRunningRef.current) {
                    const nextDelay = Math.random() * 8000 + 2000;
                    setTimeout(() => showNextStimulus(showFeedback), nextDelay);
                }
            }, 1000);
        }, Math.random() * 2000 + 1000);
    }, []);

    const startTimer = useCallback(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        timerIntervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    clearInterval(timerIntervalRef.current);
                    return 0;
                }
                return newTime;
            });
        }, 1000);
    }, []);

    const endRound = useCallback(() => {
        isTestRunningRef.current = false;
        clearAllTimeouts();

        const avgReactionTime = reactionTimesRef.current.length > 0
            ? reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length
            : 0;

        if (isPracticeRound) {
            setTimeout(() => {
                setIsPracticeRound(false);
                setCurrentRound(1);
                setScreen('test');
                reactionTimesRef.current = [];
                falseStartsRef.current = 0;
                setTimeLeft(testDuration);
                setMessage('');
            }, 2000);
        } else {
            const roundData = {
                round: currentRound,
                avgReactionTime: avgReactionTime.toFixed(2),
                validAttempts: reactionTimesRef.current.length,
                falseStarts: falseStartsRef.current
            };

            setRoundResults(prev => [...prev, roundData]);

            if (currentRound < totalRounds) {
                setTimeout(() => {
                    reactionTimesRef.current = [];
                    falseStartsRef.current = 0;
                    setTimeLeft(testDuration);
                    setMessage('');
                    setCurrentRound(prev => prev + 1);
                }, 2000);
            } else {
                setTimeout(() => {
                    setScreen('results');
                }, 2000);
            }
        }
    }, [isPracticeRound, currentRound, clearAllTimeouts]);

    // Effect to watch timeLeft and trigger endRound
    useEffect(() => {
        if (timeLeft === 0 && isTestRunningRef.current) {
            endRound();
        }
    }, [timeLeft, endRound]);

    // Effect to start new round when currentRound changes
    useEffect(() => {
        if (screen === 'test' && !isPracticeRound && currentRound > 0) {
            isTestRunningRef.current = true;
            startTimer();
            showNextStimulus(false);
        }
    }, [currentRound, screen, isPracticeRound]);

    const handleKeyPress = useCallback((e) => {
        if (e.code === 'Space' && isTestRunningRef.current) {
            e.preventDefault();
            const currentTime = Date.now();
            const trialEndTime = new Date().toISOString()

            if (isStimulusOnRef.current && startTimeRef.current) {
                const reactionTime = currentTime - startTimeRef.current;

                if (reactionTime < 100) {
                    falseStartsRef.current++;
                    if (isPracticeRound) {
                        setMessage('False start! (<100ms)');
                        setMessageColor('#e74c3c');
                    }
                } else {
                    reactionTimesRef.current.push(reactionTime);
                    if (isPracticeRound) {
                        setMessage(`Reaction time: ${reactionTime}ms`);
                        setMessageColor('#27ae60');
                    }
                }

                // Record trial data
                trialDataArray.current.push(
                    createTrialData(
                        trialDataArray.current.length + 1,
                        trialStartTimeRef.current,
                        trialEndTime,
                        {
                            response: 'spacebar',
                            reactionTime,
                            isFalseStart: reactionTime < 100
                        }
                    )
                )

                setStimulusText('+');
                setStimulusColor('#000');
                isStimulusOnRef.current = false;

                if (stimulusTimeoutRef.current) clearTimeout(stimulusTimeoutRef.current);
                if (counterIntervalRef.current) clearInterval(counterIntervalRef.current);

                const nextDelay = Math.random() * 8000 + 2000;
                setTimeout(() => showNextStimulus(isPracticeRound), nextDelay);
            } else {
                falseStartsRef.current++;
                if (isPracticeRound) {
                    setMessage('False start! No stimulus present');
                    setMessageColor('#e74c3c');
                }
            }
        }
    }, [isPracticeRound, showNextStimulus]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
            clearAllTimeouts();
        };
    }, [handleKeyPress, clearAllTimeouts]);

    useEffect(() => {
        if (screen === 'practice') {
            isTestRunningRef.current = true;
            startTimer();
            showNextStimulus(true);
        }
    }, [screen]);

    const startPracticeRound = () => {
        setIsPracticeRound(true);
        setScreen('practice');
        reactionTimesRef.current = [];
        falseStartsRef.current = 0;
        setTimeLeft(testDuration);
        setMessage('');
    };

    const goToAnotherTest = () => {
        if (onComplete) {
            const taskData = createTaskDataPackage(
                'pvt',
                calculateFinalResults(),
                taskStartTime.current,
                trialDataArray.current
            )
            onComplete(taskData);
        } else {
            window.location.reload();
        }
    };

    const calculateFinalResults = () => {
        let totalValidAttempts = 0;
        let totalFalseStarts = 0;
        let totalAvgReactionTime = 0;
        let roundsWithValidAttempts = 0;

        roundResults.forEach(result => {
            totalValidAttempts += result.validAttempts;
            totalFalseStarts += result.falseStarts;

            if (result.validAttempts > 0) {
                totalAvgReactionTime += parseFloat(result.avgReactionTime);
                roundsWithValidAttempts++;
            }
        });

        const overallAvgReactionTime = roundsWithValidAttempts > 0
            ? (totalAvgReactionTime / roundsWithValidAttempts).toFixed(2)
            : 0;

        return { totalValidAttempts, totalFalseStarts, overallAvgReactionTime };
    };

    return (
        <div className="container">
            {screen === 'welcome' && (
                <div id="welcomeScreen">
                    <h1>Welcome to Psycho-Motor Vigilance Task (PVT)</h1>
                    <div className="instructions">
                        <p>Press start button. Press <span className="space-key">SPACEBAR</span> as soon as possible after <span className="red-text">red numbers</span> appear in the box.</p>
                        <p>The red numbers will appear at random times.</p>
                        <p>Taking the test for the entire 30 seconds allows a more accurate assessment.</p>
                        <p>False starts (response times less than 100 msec) are excluded from final analysis.</p>
                    </div>
                    <button id="startButton" onClick={startPracticeRound}>Start Test</button>
                </div>
            )}

            {screen === 'practice' && (
                <div id="practiceScreen">
                    <h1>Practice Round</h1>
                    <p>This is a practice round with feedback</p>
                    <div id="practiceStimulus" className="stimulus-display" style={{ color: stimulusColor }}>
                        {stimulusText}
                    </div>
                    <p>Time Left: <span id="practiceTimeLeft">{timeLeft}</span> seconds</p>
                    <p id="practiceMessage" style={{ color: messageColor }}>{message}</p>
                </div>
            )}

            {screen === 'test' && (
                <div id="testScreen">
                    <h1>Test: Round <span id="currentRound">{currentRound}/{totalRounds}</span></h1>
                    <div id="stimulusDisplay" className="stimulus-display" style={{ color: stimulusColor }}>
                        {stimulusText}
                    </div>
                    <p>Time Left: <span id="timeLeft">{timeLeft}</span> seconds</p>
                    <p id="message" style={{ color: messageColor }}>{message}</p>
                </div>
            )}

            {screen === 'results' && (
                <div id="resultsScreen">
                    <h2>Test Results</h2>
                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>Round</th>
                                <th>Average Reaction Time</th>
                                <th>Valid Attempts</th>
                                <th>False Starts</th>
                            </tr>
                        </thead>
                        <tbody id="resultsBody">
                            {roundResults.map((result) => (
                                <tr key={result.round}>
                                    <td>{result.round}</td>
                                    <td>{result.validAttempts > 0 ? result.avgReactionTime + ' ms' : 'N/A'}</td>
                                    <td>{result.validAttempts}</td>
                                    <td>{result.falseStarts}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div id="finalResults">
                        <p><strong>Final Results:</strong></p>
                        <p>Number of false starts = {calculateFinalResults().totalFalseStarts}</p>
                        <p>Average response time = {calculateFinalResults().overallAvgReactionTime} ms over {calculateFinalResults().totalValidAttempts} attempts.</p>
                    </div>
                    <button id="goToAnotherTest" onClick={goToAnotherTest}>Go to Another Test</button>
                </div>
            )}
        </div>
    );
};

export default Pvt;