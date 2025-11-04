import React, { useState, useEffect, useRef, useCallback } from 'react';
import './flanker.css';
import { createTaskDataPackage, createTrialData } from '../../utils/taskDataFormatter'

const TRIAL_TYPES = {
    CONGRUENT: 'congruent',
    INCONGRUENT: 'incongruent',
    NEUTRAL: 'neutral'
};

const DIRECTIONS = {
    LEFT: 'left',
    RIGHT: 'right'
};

const ARROW_CHARS = {
    left: '←',
    right: '→',
    neutral: '□'
};

const TRIALS_PER_BLOCK = 40;
const PRACTICE_TRIALS = 10;
const TOTAL_BLOCKS = 3;
const FIXATION_DURATION = 500;
const STIMULUS_DURATION = 1500;
const ITI_DURATION = 1000;

const FlankerTask = ({ onComplete }) => {
    const taskStartTime = useRef(new Date().toISOString())
    const trialDataArray = useRef([])
    const trialStartTimeRef = useRef(null)

    const [screen, setScreen] = useState('welcome');
    const [currentBlock, setCurrentBlock] = useState(1);
    const [currentTrial, setCurrentTrial] = useState(0);
    const [isPractice, setIsPractice] = useState(false);
    const [showFixation, setShowFixation] = useState(false);
    const [stimulusDisplay, setStimulusDisplay] = useState('');
    const [showStimulus, setShowStimulus] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [feedbackClass, setFeedbackClass] = useState('');
    const [progress, setProgress] = useState(0);

    const [trialData, setTrialData] = useState({
        congruent: { correct: 0, errors: 0, reactionTimes: [] },
        incongruent: { correct: 0, errors: 0, reactionTimes: [] },
        neutral: { correct: 0, errors: 0, reactionTimes: [] }
    });

    const stimulusSequence = useRef([]);
    const stimulusStartTime = useRef(0);
    const canRespond = useRef(false);
    const hasResponded = useRef(false);
    const timeoutRef = useRef(null);
    const isTestActive = useRef(false);

    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    };

    const createStimulus = (type, targetDirection) => {
        let flankerChar;

        if (type === TRIAL_TYPES.CONGRUENT) {
            flankerChar = ARROW_CHARS[targetDirection];
        } else if (type === TRIAL_TYPES.INCONGRUENT) {
            const oppositeDirection = targetDirection === DIRECTIONS.LEFT ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
            flankerChar = ARROW_CHARS[oppositeDirection];
        } else {
            flankerChar = ARROW_CHARS.neutral;
        }

        const targetChar = ARROW_CHARS[targetDirection];
        const display = `${flankerChar} ${flankerChar} ${targetChar} ${flankerChar} ${flankerChar}`;

        return {
            type: type,
            targetDirection: targetDirection,
            display: display,
            correctResponse: targetDirection === DIRECTIONS.LEFT ? 'ArrowLeft' : 'ArrowRight'
        };
    };

    const generateSequence = (numTrials) => {
        const sequence = [];
        const trialsPerType = Math.floor(numTrials / 3);
        const types = [
            ...Array(trialsPerType).fill(TRIAL_TYPES.CONGRUENT),
            ...Array(trialsPerType).fill(TRIAL_TYPES.INCONGRUENT),
            ...Array(trialsPerType).fill(TRIAL_TYPES.NEUTRAL)
        ];

        while (types.length < numTrials) {
            types.push(TRIAL_TYPES.CONGRUENT);
        }

        shuffleArray(types);

        types.forEach(type => {
            const targetDirection = Math.random() < 0.5 ? DIRECTIONS.LEFT : DIRECTIONS.RIGHT;
            sequence.push(createStimulus(type, targetDirection));
        });

        return sequence;
    };

    const processResponse = useCallback((response, reactionTime, stimulus) => {
        const isCorrect = response === stimulus.correctResponse;
        const type = stimulus.type;

        setTrialData(prev => {
            const newData = { ...prev };
            if (response !== null) {
                if (isCorrect) {
                    newData[type].correct++;
                    newData[type].reactionTimes.push(reactionTime);
                } else {
                    newData[type].errors++;
                }
            } else {
                newData[type].errors++;
            }
            return newData;
        });

        if (isPractice) {
            if (response === null) {
                setFeedback('Too slow! Please respond faster.');
                setFeedbackClass('feedback-message feedback-incorrect');
            } else if (isCorrect) {
                setFeedback(`Correct! (${reactionTime}ms)`);
                setFeedbackClass('feedback-message feedback-correct');
            } else {
                const correctDir = stimulus.targetDirection === DIRECTIONS.LEFT ? 'Left' : 'Right';
                setFeedback(`Incorrect. Center arrow pointed ${correctDir}.`);
                setFeedbackClass('feedback-message feedback-incorrect');
            }
        }
    }, [isPractice]);

    const advanceToNextTrial = useCallback(() => {
        setCurrentTrial(prev => {
            const newTrial = prev + 1;

            if (!isPractice) {
                const newBlock = Math.ceil(newTrial / TRIALS_PER_BLOCK);
                if (newBlock !== currentBlock && newBlock <= TOTAL_BLOCKS) {
                    setCurrentBlock(newBlock);
                }
                setProgress((newTrial / (TRIALS_PER_BLOCK * TOTAL_BLOCKS)) * 100);
            }

            return newTrial;
        });
    }, [isPractice, currentBlock]);

    const showNextTrial = useCallback(() => {
        if (!isTestActive.current) return;

        const maxTrials = isPractice ? PRACTICE_TRIALS : (TRIALS_PER_BLOCK * TOTAL_BLOCKS);

        if (currentTrial >= maxTrials) {
            if (isPractice) {
                setFeedback('Practice complete! Starting main test...');
                setFeedbackClass('feedback-message feedback-correct');
                timeoutRef.current = setTimeout(() => {
                    setIsPractice(false);
                    setCurrentBlock(1);
                    setCurrentTrial(0);
                    setScreen('test');
                    stimulusSequence.current = generateSequence(TRIALS_PER_BLOCK * TOTAL_BLOCKS);
                    timeoutRef.current = setTimeout(() => showNextTrial(), 1000);
                }, 2000);
            } else {
                isTestActive.current = false;
                setScreen('results');
            }
            return;
        }

        const stimulus = stimulusSequence.current[currentTrial];

        setFeedback('');
        setShowFixation(true);
        setStimulusDisplay('');
        setShowStimulus(false);
        hasResponded.current = false;
        canRespond.current = false;

        timeoutRef.current = setTimeout(() => {
            setShowFixation(false);
            setStimulusDisplay(stimulus.display);
            setShowStimulus(true);
            trialStartTimeRef.current = new Date().toISOString()
            stimulusStartTime.current = Date.now();
            canRespond.current = true;

            timeoutRef.current = setTimeout(() => {
                if (!hasResponded.current) {
                    processResponse(null, 0, stimulus);
                    advanceToNextTrial();
                    timeoutRef.current = setTimeout(() => showNextTrial(), ITI_DURATION);
                }
            }, STIMULUS_DURATION);
        }, FIXATION_DURATION);
    }, [currentTrial, isPractice, processResponse, advanceToNextTrial]);

    const handleKeyPress = useCallback((e) => {
        if (!isTestActive.current || !canRespond.current || hasResponded.current) return;

        const key = e.code;
        if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;

        e.preventDefault();
        hasResponded.current = true;
        canRespond.current = false;

        const trialEndTime = new Date().toISOString()
        const reactionTime = Date.now() - stimulusStartTime.current;
        const stimulus = stimulusSequence.current[currentTrial];
        const isCorrect = key === stimulus.correctResponse;

        // Record trial data
        trialDataArray.current.push(
            createTrialData(
                currentTrial + 1,
                trialStartTimeRef.current,
                trialEndTime,
                {
                    trialType: stimulus.type,
                    response: key,
                    isCorrect,
                    reactionTime,
                    stimulus: stimulus.display
                }
            )
        )

        processResponse(key, reactionTime, stimulus);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        advanceToNextTrial();
        timeoutRef.current = setTimeout(() => showNextTrial(), ITI_DURATION);
    }, [currentTrial, processResponse, advanceToNextTrial, showNextTrial]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [handleKeyPress]);

    const startPractice = () => {
        setIsPractice(true);
        setCurrentTrial(0);
        isTestActive.current = true;
        setScreen('practice');
        stimulusSequence.current = generateSequence(PRACTICE_TRIALS);
        setTimeout(() => showNextTrial(), 1000);
    };

    const calculateResults = () => {
        let totalCorrect = 0;
        let totalErrors = 0;
        let allReactionTimes = [];

        const results = Object.keys(trialData).map(type => {
            const data = trialData[type];
            const total = data.correct + data.errors;
            const accuracy = total > 0 ? ((data.correct / total) * 100).toFixed(1) : '0.0';
            const avgRT = data.reactionTimes.length > 0 ?
                Math.round(data.reactionTimes.reduce((a, b) => a + b, 0) / data.reactionTimes.length) : 0;

            totalCorrect += data.correct;
            totalErrors += data.errors;
            allReactionTimes = allReactionTimes.concat(data.reactionTimes);

            return { type, data, accuracy, avgRT };
        });

        const totalTrials = totalCorrect + totalErrors;
        const totalAccuracy = totalTrials > 0 ? ((totalCorrect / totalTrials) * 100).toFixed(1) : '0.0';
        const totalAvgRT = allReactionTimes.length > 0 ?
            Math.round(allReactionTimes.reduce((a, b) => a + b, 0) / allReactionTimes.length) : 0;

        const congruentRT = trialData.congruent.reactionTimes.length > 0 ?
            trialData.congruent.reactionTimes.reduce((a, b) => a + b, 0) / trialData.congruent.reactionTimes.length : 0;
        const incongruentRT = trialData.incongruent.reactionTimes.length > 0 ?
            trialData.incongruent.reactionTimes.reduce((a, b) => a + b, 0) / trialData.incongruent.reactionTimes.length : 0;

        const flankerEffect = incongruentRT - congruentRT;
        const flankerEffectPercent = congruentRT > 0 ? ((flankerEffect / congruentRT) * 100).toFixed(1) : '0.0';

        return {
            results,
            totalCorrect,
            totalErrors,
            totalAccuracy,
            totalAvgRT,
            congruentRT,
            incongruentRT,
            flankerEffect,
            flankerEffectPercent
        };
    };

    const goToAnotherTest = () => {
        if (onComplete) {
            const taskData = createTaskDataPackage(
                'flanker',
                calculateResults(),
                taskStartTime.current,
                trialDataArray.current
            )
            onComplete(taskData);
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="container">
            {screen === 'welcome' && (
                <div id="welcomeScreen">
                    <h1>Welcome to the Eriksen Flanker Task</h1>
                    <div className="instructions">
                        <h3>Instructions:</h3>
                        <p>In this task, you will see a row of <strong>5 arrows</strong> on the screen.</p>
                        <p>Your task is to respond to the direction of the <strong>CENTER arrow</strong> only, ignoring the surrounding arrows.</p>

                        <div className="response-guide">
                            <h4>Response Keys:</h4>
                            <ul>
                                <li>Press <kbd>←</kbd> (Left Arrow) if the center arrow points <strong>LEFT</strong></li>
                                <li>Press <kbd>→</kbd> (Right Arrow) if the center arrow points <strong>RIGHT</strong></li>
                            </ul>
                        </div>

                        <div className="trial-types">
                            <h4>Three Types of Trials:</h4>

                            <div className="trial-example congruent">
                                <h5>1. Congruent Trials</h5>
                                <p className="arrows">→ → → → →</p>
                                <p>All arrows point in the same direction</p>
                                <p className="example-response">Response: Press <kbd>→</kbd></p>
                            </div>

                            <div className="trial-example incongruent">
                                <h5>2. Incongruent Trials</h5>
                                <p className="arrows">← ← → ← ←</p>
                                <p>Flanking arrows point in the opposite direction</p>
                                <p className="example-response">Response: Press <kbd>→</kbd> (center arrow)</p>
                            </div>

                            <div className="trial-example neutral">
                                <h5>3. Neutral Trials</h5>
                                <p className="arrows">□ □ → □ □</p>
                                <p>Flanking stimuli have no directional information</p>
                                <p className="example-response">Response: Press <kbd>→</kbd> (center arrow)</p>
                            </div>
                        </div>

                        <p className="important-note">⚠️ <strong>Important:</strong> Please respond as <strong>quickly</strong> and <strong>accurately</strong> as possible!</p>
                    </div>

                    <button onClick={startPractice}>Start Practice</button>
                </div>
            )}

            {screen === 'practice' && (
                <div id="practiceScreen">
                    <h1>Practice Round</h1>
                    <p className="instruction-text">Respond to the CENTER arrow only</p>

                    <div className="fixation-container">
                        {showFixation && <div className="fixation">+</div>}
                    </div>

                    <div className="stimulus-container">
                        <div className={`stimulus-display ${showStimulus ? 'show' : ''}`}>
                            {stimulusDisplay}
                        </div>
                    </div>

                    <div className="trial-info">
                        <p>Practice Trial: <span>{currentTrial}</span> / 10</p>
                    </div>

                    <p className={feedbackClass}>{feedback}</p>
                </div>
            )}

            {screen === 'test' && (
                <div id="testScreen">
                    <h1>Eriksen Flanker Task</h1>
                    <p className="instruction-text">Respond to the CENTER arrow direction</p>

                    <div className="fixation-container">
                        {showFixation && <div className="fixation">+</div>}
                    </div>

                    <div className="stimulus-container">
                        <div className={`stimulus-display ${showStimulus ? 'show' : ''}`}>
                            {stimulusDisplay}
                        </div>
                    </div>

                    <div className="trial-info">
                        <p>Block: <span>{currentBlock}</span> / 3</p>
                        <p>Trial: <span>{currentTrial}</span> / 40</p>
                    </div>

                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            {screen === 'results' && (
                <div id="resultsScreen">
                    <h2>Eriksen Flanker Task Results</h2>

                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>Trial Type</th>
                                <th>Correct</th>
                                <th>Errors</th>
                                <th>Accuracy (%)</th>
                                <th>Avg RT (ms)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const stats = calculateResults();
                                return (
                                    <>
                                        {stats.results.map(({ type, data, accuracy, avgRT }) => (
                                            <tr key={type}>
                                                <td><strong>{type.charAt(0).toUpperCase() + type.slice(1)}</strong></td>
                                                <td>{data.correct}</td>
                                                <td>{data.errors}</td>
                                                <td>{accuracy}%</td>
                                                <td>{avgRT > 0 ? avgRT : '-'}</td>
                                            </tr>
                                        ))}
                                        <tr className="total-row">
                                            <td><strong>Total</strong></td>
                                            <td><strong>{stats.totalCorrect}</strong></td>
                                            <td><strong>{stats.totalErrors}</strong></td>
                                            <td><strong>{stats.totalAccuracy}%</strong></td>
                                            <td><strong>{stats.totalAvgRT > 0 ? stats.totalAvgRT : '-'}</strong></td>
                                        </tr>
                                    </>
                                );
                            })()}
                        </tbody>
                    </table>

                    <div className="flanker-effect">
                        <h3>Flanker Effect Analysis</h3>
                        {(() => {
                            const stats = calculateResults();
                            return (
                                <>
                                    <p><strong>Congruent Trials (Baseline):</strong> {Math.round(stats.congruentRT)}ms</p>
                                    <p><strong>Incongruent Trials:</strong> {Math.round(stats.incongruentRT)}ms</p>
                                    <p><strong>Flanker Interference Effect:</strong> +{Math.round(stats.flankerEffect)}ms ({stats.flankerEffectPercent}% slower)</p>
                                    <p>The flanker effect demonstrates the impact of distracting information on selective attention and response inhibition.</p>
                                </>
                            );
                        })()}
                    </div>

                    <button id="goToAnotherTest" onClick={goToAnotherTest}>Continue to Next Task</button>
                </div>
            )}
        </div>
    );
};

export default FlankerTask;