import React, { useState, useEffect, useRef } from 'react';
import './posner.css';
import { createTaskDataPackage, createTrialData } from '../../utils/taskDataFormatter'

// Constants
const CUE_TYPES = {
  VALID: 'valid',
  INVALID: 'invalid',
  NEUTRAL: 'neutral'
};

const SIDES = {
  LEFT: 'left',
  RIGHT: 'right'
};

// Timing parameters
const STANDBY_MIN = 500;
const STANDBY_MAX = 1000;
const CUE_DURATION = 100;
const CUE_TARGET_INTERVAL = 100;
const MAX_RESPONSE_TIME = 1500;
const ITI_DURATION = 1000;

// Trial distribution
const TRIALS_PER_BLOCK = 40;
const PRACTICE_TRIALS = 12;
const TOTAL_BLOCKS = 3;
const VALID_PROBABILITY = 0.8;
const INVALID_PROBABILITY = 0.1;
const NEUTRAL_PROBABILITY = 0.1;

const PosnerCueingTask = ({ onComplete }) => {
  const taskStartTime = useRef(new Date().toISOString())
  const trialDataArray = useRef([])

  const [screen, setScreen] = useState('welcome');
  const [currentBlock, setCurrentBlock] = useState(1);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [isPractice, setIsPractice] = useState(false);
  const [practiceFeedback, setPracticeFeedback] = useState('');
  const [feedbackClass, setFeedbackClass] = useState('');
  const [progress, setProgress] = useState(0);

  const [showLeftCue, setShowLeftCue] = useState(false);
  const [showRightCue, setShowRightCue] = useState(false);
  const [showLeftTarget, setShowLeftTarget] = useState(false);
  const [showRightTarget, setShowRightTarget] = useState(false);
  const [leftBoxCued, setLeftBoxCued] = useState(false);
  const [rightBoxCued, setRightBoxCued] = useState(false);

  const [trialData, setTrialData] = useState({
    valid: { correct: 0, errors: 0, reactionTimes: [] },
    invalid: { correct: 0, errors: 0, reactionTimes: [] },
    neutral: { correct: 0, errors: 0, reactionTimes: [] }
  });

  const [results, setResults] = useState(null);

  const stimulusSequenceRef = useRef([]);
  const isTestActiveRef = useRef(false);
  const canRespondRef = useRef(false);
  const hasRespondedRef = useRef(false);
  const trialStartTimeRef = useRef(null);
  const timeoutRef = useRef(null);
  const currentTrialRef = useRef(0);
  const trialDataRef = useRef({
    valid: { correct: 0, errors: 0, reactionTimes: [] },
    invalid: { correct: 0, errors: 0, reactionTimes: [] },
    neutral: { correct: 0, errors: 0, reactionTimes: [] }
  });

  // Generate trial sequence
  const generateSequence = (numTrials) => {
    const sequence = [];

    for (let i = 0; i < numTrials; i++) {
      const rand = Math.random();
      let cueType;

      if (rand < VALID_PROBABILITY) {
        cueType = CUE_TYPES.VALID;
      } else if (rand < VALID_PROBABILITY + INVALID_PROBABILITY) {
        cueType = CUE_TYPES.INVALID;
      } else {
        cueType = CUE_TYPES.NEUTRAL;
      }

      const targetSide = Math.random() < 0.5 ? SIDES.LEFT : SIDES.RIGHT;
      sequence.push(createTrial(cueType, targetSide));
    }

    return sequence;
  };

  const createTrial = (cueType, targetSide) => {
    let cueSide;

    if (cueType === CUE_TYPES.VALID) {
      cueSide = targetSide;
    } else if (cueType === CUE_TYPES.INVALID) {
      cueSide = targetSide === SIDES.LEFT ? SIDES.RIGHT : SIDES.LEFT;
    } else {
      cueSide = 'both';
    }

    return {
      cueType,
      cueSide,
      targetSide,
      correctResponse: targetSide === SIDES.LEFT ? 'ArrowLeft' : 'ArrowRight'
    };
  };

  // Clear all visual elements
  const clearDisplay = () => {
    setShowLeftCue(false);
    setShowRightCue(false);
    setShowLeftTarget(false);
    setShowRightTarget(false);
    setLeftBoxCued(false);
    setRightBoxCued(false);
  };

  // Show next trial
  const showNextTrial = () => {
    if (!isTestActiveRef.current) return;

    const maxTrials = isPractice ? PRACTICE_TRIALS : (TRIALS_PER_BLOCK * TOTAL_BLOCKS);

    if (currentTrialRef.current >= maxTrials) {
      endTest();
      return;
    }

    const trial = stimulusSequenceRef.current[currentTrialRef.current];

    clearDisplay();
    setPracticeFeedback('');
    hasRespondedRef.current = false;
    canRespondRef.current = false;

    const standbyDuration = STANDBY_MIN + Math.random() * (STANDBY_MAX - STANDBY_MIN);

    timeoutRef.current = setTimeout(() => {
      // Show cue
      if (trial.cueSide === 'both') {
        setShowLeftCue(true);
        setShowRightCue(true);
        setLeftBoxCued(true);
        setRightBoxCued(true);
      } else if (trial.cueSide === SIDES.LEFT) {
        setShowLeftCue(true);
        setLeftBoxCued(true);
      } else {
        setShowRightCue(true);
        setRightBoxCued(true);
      }

      timeoutRef.current = setTimeout(() => {
        setShowLeftCue(false);
        setShowRightCue(false);
        setLeftBoxCued(false);
        setRightBoxCued(false);

        timeoutRef.current = setTimeout(() => {
          if (trial.targetSide === SIDES.LEFT) {
            setShowLeftTarget(true);
          } else {
            setShowRightTarget(true);
          }

          trialStartTimeRef.current = new Date().toISOString();
          canRespondRef.current = true;

          timeoutRef.current = setTimeout(() => {
            if (!hasRespondedRef.current) {
              processResponse(null, 0, trial);
              advanceToNextTrial();
            }
          }, MAX_RESPONSE_TIME);
        }, CUE_TARGET_INTERVAL);
      }, CUE_DURATION);
    }, standbyDuration);
  };

  const processResponse = (response, reactionTime, trial) => {
    const isCorrect = response === trial.correctResponse;
    const cueType = trial.cueType;

    const newData = { ...trialDataRef.current };

    if (response !== null) {
      if (isCorrect) {
        newData[cueType].correct++;
        newData[cueType].reactionTimes.push(reactionTime);
      } else {
        newData[cueType].errors++;
      }
    } else {
      newData[cueType].errors++;
    }

    trialDataRef.current = newData;
    setTrialData(newData);

    // Record trial data with timestamps
    trialDataArray.current.push(
      createTrialData(
        currentTrialRef.current,
        trialStartTimeRef.current,
        new Date().toISOString(),
        {
          cueType,
          cueSide: trial.cueSide,
          targetSide: trial.targetSide,
          response,
          reactionTime,
          isCorrect,
          correctResponse: trial.correctResponse,
          isPractice
        }
      )
    );

    if (isPractice) {
      if (response === null) {
        setPracticeFeedback('Too slow! Please respond faster.');
        setFeedbackClass('feedback-message feedback-incorrect');
      } else if (isCorrect) {
        const cueInfo = cueType === CUE_TYPES.VALID ? 'Valid cue' :
          cueType === CUE_TYPES.INVALID ? 'Invalid cue' : 'Neutral cue';
        setPracticeFeedback(`Correct! (${reactionTime}ms) - ${cueInfo}`);
        setFeedbackClass('feedback-message feedback-correct');
      } else {
        const correctSide = trial.targetSide === SIDES.LEFT ? 'Left' : 'Right';
        setPracticeFeedback(`Incorrect. Target was on the ${correctSide}.`);
        setFeedbackClass('feedback-message feedback-incorrect');
      }
    }
  };

  const advanceToNextTrial = () => {
    clearDisplay();

    currentTrialRef.current++;
    setCurrentTrial(currentTrialRef.current);

    if (!isPractice) {
      const newBlock = Math.ceil(currentTrialRef.current / TRIALS_PER_BLOCK);
      if (newBlock !== currentBlock && newBlock <= TOTAL_BLOCKS) {
        setCurrentBlock(newBlock);
      }

      const progressPercent = (currentTrialRef.current / (TRIALS_PER_BLOCK * TOTAL_BLOCKS)) * 100;
      setProgress(progressPercent);
    }

    timeoutRef.current = setTimeout(() => {
      if (isPractice && currentTrialRef.current >= PRACTICE_TRIALS) {
        endPractice();
      } else {
        showNextTrial();
      }
    }, ITI_DURATION);
  };

  const endPractice = () => {
    isTestActiveRef.current = false;
    setPracticeFeedback('Practice complete! Starting main test...');
    setFeedbackClass('feedback-message feedback-correct');

    setTimeout(() => {
      startMainTest();
    }, 2000);
  };

  const endTest = () => {
    isTestActiveRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    calculateResults();
  };

  const calculateResults = () => {
    const data = trialDataRef.current;

    const validRT = data.valid.reactionTimes.length > 0 ?
      data.valid.reactionTimes.reduce((a, b) => a + b, 0) / data.valid.reactionTimes.length : 0;
    const invalidRT = data.invalid.reactionTimes.length > 0 ?
      data.invalid.reactionTimes.reduce((a, b) => a + b, 0) / data.invalid.reactionTimes.length : 0;
    const neutralRT = data.neutral.reactionTimes.length > 0 ?
      data.neutral.reactionTimes.reduce((a, b) => a + b, 0) / data.neutral.reactionTimes.length : 0;

    const cuingBenefit = neutralRT - validRT;
    const cuingCost = invalidRT - neutralRT;
    const totalCuingEffect = invalidRT - validRT;

    let totalCorrect = 0;
    let totalErrors = 0;
    const allReactionTimes = [];

    Object.keys(data).forEach(type => {
      totalCorrect += data[type].correct;
      totalErrors += data[type].errors;
      allReactionTimes.push(...data[type].reactionTimes);
    });

    const totalTrials = totalCorrect + totalErrors;
    const totalAccuracy = totalTrials > 0 ? ((totalCorrect / totalTrials) * 100).toFixed(1) : '0.0';
    const totalAvgRT = allReactionTimes.length > 0 ?
      Math.round(allReactionTimes.reduce((a, b) => a + b, 0) / allReactionTimes.length) : 0;

    setResults({
      trialData: data,
      validRT: Math.round(validRT),
      invalidRT: Math.round(invalidRT),
      neutralRT: Math.round(neutralRT),
      cuingBenefit: Math.round(cuingBenefit),
      cuingCost: Math.round(cuingCost),
      totalCuingEffect: Math.round(totalCuingEffect),
      totalCorrect,
      totalErrors,
      totalAccuracy,
      totalAvgRT
    });

    setScreen('results');
  };

  // Keyboard handler
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isTestActiveRef.current || !canRespondRef.current || hasRespondedRef.current) return;

      const key = e.code;
      if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;

      e.preventDefault();
      hasRespondedRef.current = true;
      canRespondRef.current = false;

      const reactionTime = Date.now() - trialStartTimeRef.current;
      const trial = stimulusSequenceRef.current[currentTrialRef.current];

      processResponse(key, reactionTime, trial);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      advanceToNextTrial();
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPractice]);

  const startPractice = () => {
    setIsPractice(true);
    currentTrialRef.current = 0;
    setCurrentTrial(0);
    isTestActiveRef.current = true;
    trialDataRef.current = {
      valid: { correct: 0, errors: 0, reactionTimes: [] },
      invalid: { correct: 0, errors: 0, reactionTimes: [] },
      neutral: { correct: 0, errors: 0, reactionTimes: [] }
    };

    stimulusSequenceRef.current = generateSequence(PRACTICE_TRIALS);
    setScreen('practice');

    setTimeout(() => {
      showNextTrial();
    }, 1000);
  };

  const startMainTest = () => {
    setIsPractice(false);
    setCurrentBlock(1);
    currentTrialRef.current = 0;
    setCurrentTrial(0);
    setProgress(0);
    isTestActiveRef.current = true;

    trialDataRef.current = {
      valid: { correct: 0, errors: 0, reactionTimes: [] },
      invalid: { correct: 0, errors: 0, reactionTimes: [] },
      neutral: { correct: 0, errors: 0, reactionTimes: [] }
    };
    setTrialData(trialDataRef.current);

    stimulusSequenceRef.current = generateSequence(TRIALS_PER_BLOCK * TOTAL_BLOCKS);
    setScreen('test');

    setTimeout(() => {
      showNextTrial();
    }, 1000);
  };

  const restartTask = () => {
    if (onComplete) {
      const taskData = createTaskDataPackage(
        'posner',
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
    <div className="container">
      {screen === 'welcome' && (
        <div id="welcomeScreen">
          <h1>Welcome to the Posner Cueing Task</h1>

          <div className="instructions">
            <h3>Instructions:</h3>
            <p>This task measures your <strong>spatial attention</strong> and reaction time.</p>

            <div className="task-description">
              <h4>What you'll see:</h4>
              <ul>
                <li>A central <strong>fixation cross (+)</strong> - keep your eyes on it at all times</li>
                <li>Two <strong>boxes</strong> on the left and right sides of the screen</li>
                <li>A <strong>cue</strong> that will appear on one or both sides</li>
                <li>A <strong>target (★)</strong> that will appear in one of the boxes</li>
              </ul>
            </div>

            <div className="task-instructions">
              <h4>Your Task:</h4>
              <p>As soon as you see the <strong>★</strong> (star) appear in either box:</p>
              <ul>
                <li>Press <kbd>←</kbd> (Left Arrow) if the star appears in the <strong>LEFT</strong> box</li>
                <li>Press <kbd>→</kbd> (Right Arrow) if the star appears in the <strong>RIGHT</strong> box</li>
              </ul>
              <p className="emphasis">Respond as <strong>quickly</strong> and <strong>accurately</strong> as possible!</p>
            </div>

            <div className="trial-types">
              <h4>Types of Trials:</h4>

              <div className="trial-type-box valid">
                <h5>Valid Cue Trial (80%)</h5>
                <p>The cue appears on one side, and the target appears on the <strong>SAME side</strong></p>
                <p className="tip">💡 The cue correctly predicts where the target will appear</p>
              </div>

              <div className="trial-type-box invalid">
                <h5>Invalid Cue Trial (10%)</h5>
                <p>The cue appears on one side, but the target appears on the <strong>OPPOSITE side</strong></p>
                <p className="tip">⚠️ The cue misleads you - requires attention shift</p>
              </div>

              <div className="trial-type-box neutral">
                <h5>Neutral Cue Trial (10%)</h5>
                <p>The cue appears on <strong>BOTH sides</strong>, target can appear on either side</p>
                <p className="tip">🔄 No predictive information provided</p>
              </div>
            </div>

            <p className="important-note">⚠️ <strong>Important:</strong> Keep your eyes fixated on the central cross (+) at all times. Do not look at the boxes directly!</p>
          </div>

          <button id="startButton" onClick={startPractice}>Start Practice</button>
        </div>
      )}

      {screen === 'practice' && (
        <div id="practiceScreen">
          <h1>Practice Round</h1>
          <p className="instruction-text">Keep eyes on the center cross</p>

          <div className="posner-display">
            <div className={`box-container left ${leftBoxCued ? 'cued' : ''}`}>
              <div className={`cue ${showLeftCue ? 'show' : ''}`}></div>
              <div className={`target ${showLeftTarget ? 'show' : ''}`}>★</div>
            </div>

            <div className="fixation">+</div>

            <div className={`box-container right ${rightBoxCued ? 'cued' : ''}`}>
              <div className={`cue ${showRightCue ? 'show' : ''}`}></div>
              <div className={`target ${showRightTarget ? 'show' : ''}`}>★</div>
            </div>
          </div>

          <div className="trial-info">
            <p>Practice Trial: <span>{currentTrial}</span> / {PRACTICE_TRIALS}</p>
          </div>

          <p className={feedbackClass}>{practiceFeedback}</p>
        </div>
      )}

      {screen === 'test' && (
        <div id="testScreen">
          <h1>Posner Cueing Task</h1>
          <p className="instruction-text">Press the arrow key corresponding to the target location</p>

          <div className="posner-display">
            <div className={`box-container left ${leftBoxCued ? 'cued' : ''}`}>
              <div className={`cue ${showLeftCue ? 'show' : ''}`}></div>
              <div className={`target ${showLeftTarget ? 'show' : ''}`}>★</div>
            </div>

            <div className="fixation">+</div>

            <div className={`box-container right ${rightBoxCued ? 'cued' : ''}`}>
              <div className={`cue ${showRightCue ? 'show' : ''}`}></div>
              <div className={`target ${showRightTarget ? 'show' : ''}`}>★</div>
            </div>
          </div>

          <div className="trial-info">
            <p>Block: <span>{currentBlock}</span> / {TOTAL_BLOCKS}</p>
            <p>Trial: <span>{currentTrial}</span> / {TRIALS_PER_BLOCK}</p>
          </div>

          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {screen === 'results' && results && (
        <div id="resultsScreen">
          <h2>Posner Cueing Task Results</h2>

          <table className="results-table">
            <thead>
              <tr>
                <th>Cue Type</th>
                <th>Correct</th>
                <th>Errors</th>
                <th>Accuracy (%)</th>
                <th>Avg RT (ms)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(results.trialData).map(type => {
                const data = results.trialData[type];
                const total = data.correct + data.errors;
                const accuracy = total > 0 ? ((data.correct / total) * 100).toFixed(1) : '0.0';
                const avgRT = data.reactionTimes.length > 0 ?
                  Math.round(data.reactionTimes.reduce((a, b) => a + b, 0) / data.reactionTimes.length) : 0;

                return (
                  <tr key={type}>
                    <td><strong>{type.charAt(0).toUpperCase() + type.slice(1)} Cue</strong></td>
                    <td>{data.correct}</td>
                    <td>{data.errors}</td>
                    <td>{accuracy}%</td>
                    <td>{avgRT > 0 ? avgRT : '-'}</td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td><strong>Total</strong></td>
                <td><strong>{results.totalCorrect}</strong></td>
                <td><strong>{results.totalErrors}</strong></td>
                <td><strong>{results.totalAccuracy}%</strong></td>
                <td><strong>{results.totalAvgRT > 0 ? results.totalAvgRT : '-'}</strong></td>
              </tr>
            </tbody>
          </table>

          <div className="cuing-effect">
            <h3>Cueing Effect Analysis</h3>
            <p><strong>Valid Cue Trials:</strong> {results.validRT}ms</p>
            <p><strong>Neutral Cue Trials (Baseline):</strong> {results.neutralRT}ms</p>
            <p><strong>Invalid Cue Trials:</strong> {results.invalidRT}ms</p>
            <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
            <p className="benefit"><strong>Cueing Benefit (Neutral - Valid):</strong> {results.cuingBenefit}ms</p>
            <p className="cost"><strong>Cueing Cost (Invalid - Neutral):</strong> +{results.cuingCost}ms</p>
            <p><strong>Total Cueing Effect (Invalid - Valid):</strong> {results.totalCuingEffect}ms</p>
            <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
            <p style={{ fontSize: '0.95em', lineHeight: 1.6 }}>
              The cueing benefit shows faster responses when attention is pre-oriented to the correct location.
              The cueing cost shows the time penalty for reorienting attention from an incorrect location.
            </p>
          </div>

          <button id="goToAnotherTest" onClick={restartTask}>Continue to Next Task</button>
        </div>
      )}
    </div>
  );
};

export default PosnerCueingTask;