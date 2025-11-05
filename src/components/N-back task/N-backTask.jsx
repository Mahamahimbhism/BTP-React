import React, { useState, useEffect, useRef, useCallback } from 'react';
import './n_back.css';
import { createTaskDataPackage, createTrialData } from '../../utils/taskDataFormatter'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'N', 'P', 'Q', 'R', 'S', 'T', 'X', 'Y', 'Z'];
const TRIALS_PER_BLOCK = 30;
const PRACTICE_TRIALS = 10;
const STIMULUS_DURATION = 500;
const ITI_DURATION = 2000;
const REST_DURATION = 30;
const BLOCKS = [
    { name: '0-Back', n: 0, instruction: 'Press SPACEBAR when you see the letter X' },
    { name: '2-Back', n: 2, instruction: 'Press SPACEBAR when the letter matches 2 positions back' },
    { name: '3-Back', n: 3, instruction: 'Press SPACEBAR when the letter matches 3 positions back' }
];

const NBackTask = ({ onComplete }) => {
    const taskStartTime = useRef(new Date().toISOString())
    const trialDataArray = useRef([])
    const trialStartTimeRef = useRef(null)

    const [screen, setScreen] = useState('welcome');
    const [currentBlock, setCurrentBlock] = useState(0);
    const [currentTrial, setCurrentTrial] = useState(0);
    const [isPractice, setIsPractice] = useState(false);
    const [isTestActive, setIsTestActive] = useState(false);
    const [currentLetter, setCurrentLetter] = useState('+');
    const [practiceFeedback, setPracticeFeedback] = useState({ text: '', className: '' });
    const [restTimer, setRestTimer] = useState(REST_DURATION);
    const [blockResults, setBlockResults] = useState([]);
    const [stimulusSequence, setStimulusSequence] = useState([]);
    const [flashTarget, setFlashTarget] = useState(false);

    const canRespond = useRef(false);
    const hasResponded = useRef(false);
    const stimulusStartTime = useRef(0);
    const currentBlockData = useRef({
        hits: 0,
        misses: 0,
        falseAlarms: 0,
        correctRejections: 0,
        reactionTimes: []
    });
    const timeoutRef = useRef(null);
    const restIntervalRef = useRef(null);

    const generateSequence = useCallback((numTrials, nBack) => {
        const sequence = [];
        const targetProbability = 0.3;

        for (let i = 0; i < Math.max(nBack, 1); i++) {
            const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
            sequence.push({
                letter: letter,
                isTarget: nBack === 0 && letter === 'X'
            });
        }

        for (let i = Math.max(nBack, 1); i < numTrials; i++) {
            const shouldBeTarget = Math.random() < targetProbability;
            let letter;
            let isTarget = false;

            if (shouldBeTarget && nBack > 0) {
                letter = sequence[i - nBack].letter;
                isTarget = true;
            } else if (nBack === 0) {
                if (shouldBeTarget) {
                    letter = 'X';
                    isTarget = true;
                } else {
                    const nonXLetters = LETTERS.filter(l => l !== 'X');
                    letter = nonXLetters[Math.floor(Math.random() * nonXLetters.length)];
                    isTarget = false;
                }
            } else {
                do {
                    letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
                } while (letter === sequence[i - nBack].letter);
                isTarget = false;
            }

            sequence.push({ letter, isTarget });
        }

        return sequence;
    }, []);

    const resetBlockData = useCallback(() => {
        currentBlockData.current = {
            hits: 0,
            misses: 0,
            falseAlarms: 0,
            correctRejections: 0,
            reactionTimes: []
        };
    }, []);

    const processResponse = useCallback((responded, reactionTime, trial, stimulus) => {
        let feedbackText = '';
        let feedbackClass = '';

        if (stimulus.isTarget && responded) {
            currentBlockData.current.hits++;
            currentBlockData.current.reactionTimes.push(reactionTime);
            feedbackText = `Correct! (${reactionTime}ms)`;
            feedbackClass = 'feedback-correct';
        } else if (stimulus.isTarget && !responded) {
            currentBlockData.current.misses++;
            feedbackText = 'Missed target!';
            feedbackClass = 'feedback-incorrect';
        } else if (!stimulus.isTarget && responded) {
            currentBlockData.current.falseAlarms++;
            feedbackText = 'False alarm!';
            feedbackClass = 'feedback-incorrect';
        } else {
            currentBlockData.current.correctRejections++;
        }

        if (isPractice && feedbackText) {
            setPracticeFeedback({ text: feedbackText, className: feedbackClass });
        }
    }, [isPractice]);

    const showNextStimulus = useCallback((trial, sequence, practice) => {
        const maxTrials = practice ? PRACTICE_TRIALS : TRIALS_PER_BLOCK;

        if (trial >= maxTrials) {
            return true; // Block complete
        }

        const stimulus = sequence[trial];
        setCurrentLetter('+');
        setFlashTarget(false);
        if (practice) {
            setPracticeFeedback({ text: '', className: '' });
        }

        hasResponded.current = false;
        canRespond.current = false;

        timeoutRef.current = setTimeout(() => {
            setCurrentLetter(stimulus.letter);
            trialStartTimeRef.current = new Date().toISOString()
            stimulusStartTime.current = Date.now();
            canRespond.current = true;

            timeoutRef.current = setTimeout(() => {
                setCurrentLetter('+');
                canRespond.current = false;

                if (!hasResponded.current) {
                    processResponse(false, 0, trial, stimulus);
                }

                setCurrentTrial(prev => prev + 1);
            }, STIMULUS_DURATION);
        }, 500);

        return false;
    }, [processResponse]);

    const endBlock = useCallback(() => {
        setIsTestActive(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (isPractice) {
            setPracticeFeedback({ text: 'Practice complete! Starting main test...', className: 'feedback-correct' });

            setTimeout(() => {
                setIsPractice(false);
                setCurrentBlock(0);
                setCurrentTrial(0);
                resetBlockData();
                const sequence = generateSequence(TRIALS_PER_BLOCK, BLOCKS[0].n);
                setStimulusSequence(sequence);
                setScreen('test');

                setTimeout(() => {
                    setIsTestActive(true);
                }, 1000);
            }, 2000);
        } else {
            const accuracy = ((currentBlockData.current.hits + currentBlockData.current.correctRejections) / TRIALS_PER_BLOCK * 100).toFixed(1);
            const avgRT = currentBlockData.current.reactionTimes.length > 0 ?
                Math.round(currentBlockData.current.reactionTimes.reduce((a, b) => a + b, 0) / currentBlockData.current.reactionTimes.length) : 0;

            const blockResult = {
                blockName: BLOCKS[currentBlock].name,
                nBack: BLOCKS[currentBlock].n,
                ...currentBlockData.current,
                accuracy: accuracy,
                avgReactionTime: avgRT
            };

            setBlockResults(prev => [...prev, blockResult]);

            if (currentBlock < BLOCKS.length - 1) {
                setScreen('rest');
                setRestTimer(REST_DURATION);
            } else {
                setScreen('results');
            }
        }
    }, [isPractice, currentBlock, resetBlockData, generateSequence]);

    useEffect(() => {
        if (!isTestActive) return;

        const maxTrials = isPractice ? PRACTICE_TRIALS : TRIALS_PER_BLOCK;

        // If we've reached or exceeded the planned number of trials for this block, end the block
        if (currentTrial >= maxTrials) {
            endBlock();
            return;
        }

        // Otherwise, present the next stimulus if we have it in the sequence
        if (currentTrial < stimulusSequence.length) {
            const isComplete = showNextStimulus(currentTrial, stimulusSequence, isPractice);
            if (isComplete) {
                endBlock();
            }
        }
    }, [currentTrial, isTestActive, stimulusSequence, isPractice, showNextStimulus, endBlock]);

    useEffect(() => {
        if (screen === 'rest') {
            restIntervalRef.current = setInterval(() => {
                setRestTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(restIntervalRef.current);
                        const nextBlock = currentBlock + 1;
                        setCurrentBlock(nextBlock);
                        setCurrentTrial(0);
                        resetBlockData();
                        const sequence = generateSequence(TRIALS_PER_BLOCK, BLOCKS[nextBlock].n);
                        setStimulusSequence(sequence);
                        setScreen('test');

                        setTimeout(() => {
                            setIsTestActive(true);
                        }, 1000);

                        return REST_DURATION;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (restIntervalRef.current) clearInterval(restIntervalRef.current);
        };
    }, [screen, currentBlock, resetBlockData, generateSequence]);

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.code === 'Space' && isTestActive && canRespond.current && !hasResponded.current) {
                e.preventDefault();
                hasResponded.current = true;
                const trialEndTime = new Date().toISOString()
                const reactionTime = Date.now() - stimulusStartTime.current;
                const stimulus = stimulusSequence[currentTrial];

                // Record trial data
                trialDataArray.current.push(
                    createTrialData(
                        currentTrial + 1,
                        trialStartTimeRef.current,
                        trialEndTime,
                        {
                            nBack: BLOCKS[currentBlock].n,
                            response: 'spacebar',
                            isCorrect: stimulus.isTarget,
                            reactionTime,
                            stimulus: stimulus.letter
                        }
                    )
                )

                processResponse(true, reactionTime, currentTrial, stimulus);
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [isTestActive, currentTrial, stimulusSequence, processResponse]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (restIntervalRef.current) clearInterval(restIntervalRef.current);
        };
    }, []);

    const startPractice = () => {
        setIsPractice(true);
        setCurrentTrial(0);
        setCurrentBlock(0);
        resetBlockData();
        const sequence = generateSequence(PRACTICE_TRIALS, 0);
        setStimulusSequence(sequence);
        setScreen('practice');

        setTimeout(() => {
            setIsTestActive(true);
        }, 1000);
    };

    const calculateOverallStats = () => {
        const totalTrials = TRIALS_PER_BLOCK * BLOCKS.length;
        const totalHits = blockResults.reduce((sum, r) => sum + r.hits, 0);
        const totalMisses = blockResults.reduce((sum, r) => sum + r.misses, 0);
        const totalFalseAlarms = blockResults.reduce((sum, r) => sum + r.falseAlarms, 0);
        const totalCorrectRejections = blockResults.reduce((sum, r) => sum + r.correctRejections, 0);
        const allReactionTimes = blockResults.flatMap(r => r.reactionTimes);
        const overallAccuracy = ((totalHits + totalCorrectRejections) / totalTrials * 100).toFixed(1);
        const overallAvgRT = allReactionTimes.length > 0 ?
            Math.round(allReactionTimes.reduce((a, b) => a + b, 0) / allReactionTimes.length) : 0;

        return { totalHits, totalMisses, totalFalseAlarms, totalCorrectRejections, overallAccuracy, overallAvgRT };
    };

    return (
        <div className="container">
            {screen === 'welcome' && (
                <div id="welcomeScreen">
                    <h1>Welcome to the N-Back Paradigm Task</h1>
                    <div className="instructions">
                        <h3>Instructions:</h3>
                        <p>In this task, you will see a sequence of letters appearing one at a time.</p>
                        <p>Your task is to determine if the current letter <strong>matches</strong> the letter that appeared <strong>N positions back</strong> in the sequence.</p>

                        <div className="task-explanation">
                            <h4>Three Task Blocks:</h4>
                            <ul>
                                <li><strong>0-Back:</strong> Press <span className="key-highlight">SPACEBAR</span> if the current letter is <strong>X</strong></li>
                                <li><strong>2-Back:</strong> Press <span className="key-highlight">SPACEBAR</span> if the current letter matches the letter shown <strong>2 positions back</strong></li>
                                <li><strong>3-Back:</strong> Press <span className="key-highlight">SPACEBAR</span> if the current letter matches the letter shown <strong>3 positions back</strong></li>
                            </ul>
                        </div>

                        <p>Each block has 30 trials with a 2-second interval between letters.</p>
                        <p>There will be a 30-second rest period between blocks.</p>
                        <p>Try to be as <strong>accurate</strong> and <strong>fast</strong> as possible!</p>
                    </div>

                    <button onClick={startPractice}>Start Practice</button>
                </div>
            )}

            {screen === 'practice' && (
                <div id="practiceScreen">
                    <h1>Practice Round: <span>{BLOCKS[0].name}</span></h1>
                    <p className="instruction-text">Press SPACEBAR when you see a target match</p>

                    <div className={`stimulus-display ${flashTarget ? 'target-flash' : ''}`}>
                        <span id="practiceLetter">{currentLetter}</span>
                    </div>

                    <div className="trial-info">
                        <p>Trial: <span>{currentTrial}</span> / {PRACTICE_TRIALS}</p>
                    </div>

                    <p className={`feedback-message ${practiceFeedback.className}`}>{practiceFeedback.text}</p>
                </div>
            )}

            {screen === 'rest' && (
                <div id="restScreen">
                    <h1>Rest Period</h1>
                    <p className="rest-message">Please take a short break.</p>
                    <p className="rest-timer">Next block starts in: <span>{restTimer}</span> seconds</p>
                    <p className="rest-info">Upcoming: <span id="nextBlockInfo">{BLOCKS[currentBlock + 1]?.name}</span></p>
                </div>
            )}

            {screen === 'test' && (
                <div id="testScreen">
                    <h1>N-Back Task: <span>{BLOCKS[currentBlock].name}</span></h1>
                    <p className="instruction-text">{BLOCKS[currentBlock].instruction}</p>

                    <div className={`stimulus-display ${flashTarget ? 'target-flash' : ''}`}>
                        <span id="letterDisplay">{currentLetter}</span>
                    </div>

                    <div className="trial-info">
                        <p>Block: <span>{currentBlock + 1}</span> / {BLOCKS.length}</p>
                        <p>Trial: <span>{currentTrial}</span> / {TRIALS_PER_BLOCK}</p>
                    </div>
                </div>
            )}

            {screen === 'results' && (
                <div id="resultsScreen">
                    <h2>N-Back Task Results</h2>

                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>Block</th>
                                <th>Hits</th>
                                <th>Misses</th>
                                <th>False Alarms</th>
                                <th>Correct Rejections</th>
                                <th>Accuracy (%)</th>
                                <th>Avg RT (ms)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {blockResults.map((result, index) => (
                                <tr key={index}>
                                    <td><strong>{result.blockName}</strong></td>
                                    <td>{result.hits}</td>
                                    <td>{result.misses}</td>
                                    <td>{result.falseAlarms}</td>
                                    <td>{result.correctRejections}</td>
                                    <td>{result.accuracy}%</td>
                                    <td>{result.avgReactionTime > 0 ? result.avgReactionTime : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="overall-stats">
                        <h3>Overall Performance</h3>
                        {(() => {
                            const stats = calculateOverallStats();
                            return (
                                <>
                                    <p><strong>Total Accuracy:</strong> {stats.overallAccuracy}%</p>
                                    <p><strong>Total Hits:</strong> {stats.totalHits}</p>
                                    <p><strong>Total Misses:</strong> {stats.totalMisses}</p>
                                    <p><strong>Total False Alarms:</strong> {stats.totalFalseAlarms}</p>
                                    <p><strong>Total Correct Rejections:</strong> {stats.totalCorrectRejections}</p>
                                    <p><strong>Average Reaction Time:</strong> {stats.overallAvgRT > 0 ? stats.overallAvgRT + ' ms' : 'N/A'}</p>
                                </>
                            );
                        })()}
                    </div>

                    <button id="goToAnotherTest" onClick={() => {
                        if (onComplete) {
                            const taskData = createTaskDataPackage(
                                'nback',
                                {
                                    blockResults,
                                    ...calculateOverallStats()
                                },
                                taskStartTime.current,
                                trialDataArray.current
                            )
                            onComplete(taskData);
                        } else {
                            window.location.reload();
                        }
                    }}>Continue to Next Task</button>
                </div>
            )}
        </div>
    );
};

export default NBackTask;