import React, { useState, useEffect, useRef, useCallback } from 'react';
import './stroop.css';
import { createTaskDataPackage, createTrialData } from '../../utils/taskDataFormatter'

const COLORS = ['RED', 'YELLOW', 'GREEN', 'BLUE'];
const COLOR_MAP = {
  'RED': '#e74c3c',
  'YELLOW': '#f39c12',
  'GREEN': '#27ae60',
  'BLUE': '#3498db'
};
const KEY_MAP = {
  'KeyR': 'RED',
  'KeyY': 'YELLOW',
  'KeyG': 'GREEN',
  'KeyB': 'BLUE'
};

const ITEMS_PER_BLOCK = 12;
const PRACTICE_TRIALS = 5;
const REST_DURATION = 10;

const BLOCKS = [
  {
    name: 'Stroop Interference',
    shortName: 'Interference',
    type: 'interference',
    instruction: 'Name the INK COLOR (not the word) and press the corresponding key',
    description: 'Color words in mismatched ink'
  }
];

export default function Stroop({ onComplete }) {
  const taskStartTime = useRef(new Date().toISOString())
  const trialDataArray = useRef([])

  const [screen, setScreen] = useState('welcome');
  const [currentBlock, setCurrentBlock] = useState(0);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [isPractice, setIsPractice] = useState(false);
  const [isTestActive, setIsTestActive] = useState(false);
  const [canRespond, setCanRespond] = useState(false);
  const [stimulusSequence, setStimulusSequence] = useState([]);
  const [currentStimulus, setCurrentStimulus] = useState(null);
  const [showingFixation, setShowingFixation] = useState(false);
  const [blockResults, setBlockResults] = useState([]);
  const [currentBlockData, setCurrentBlockData] = useState({
    completionTime: 0,
    errors: 0,
    trialTimes: []
  });
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [restTimeLeft, setRestTimeLeft] = useState(REST_DURATION);
  const [activeKey, setActiveKey] = useState(null);

  const blockStartTimeRef = useRef(0);
  const trialStartTimeRef = useRef(null);
  const trialStartTimestamp = useRef(0); // Numeric timestamp for RT calculation
  const timerIntervalRef = useRef(null);
  const restIntervalRef = useRef(null);

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const generateSequence = useCallback((numItems, blockType) => {
    const sequence = [];

    for (let i = 0; i < numItems; i++) {
      const word = COLORS[i % COLORS.length];
      let color, correctResponse;

      if (blockType === 'word') {
        color = 'black';
        correctResponse = word;
      } else if (blockType === 'color') {
        color = COLORS[i % COLORS.length];
        correctResponse = color;
      } else {
        const availableColors = COLORS.filter(c => c !== word);
        color = availableColors[Math.floor(Math.random() * availableColors.length)];
        correctResponse = color;
      }

      sequence.push({
        word,
        color,
        correctResponse,
        blockType
      });
    }

    return shuffleArray(sequence);
  }, []);

  const resetBlockData = () => {
    setCurrentBlockData({
      completionTime: 0,
      errors: 0,
      trialTimes: []
    });
  };

  const startPractice = () => {
    setIsPractice(true);
    setCurrentTrial(0);
    setCurrentBlock(0);
    resetBlockData();
    setScreen('practice');

    const sequence = generateSequence(PRACTICE_TRIALS, 'interference');
    setStimulusSequence(sequence);

    setTimeout(() => {
      setIsTestActive(true);
      showNextStimulus(0, sequence);
    }, 1000);
  };

  const startMainTest = (blockIndex) => {
    setIsPractice(false);
    setCurrentBlock(blockIndex);
    setCurrentTrial(0);
    resetBlockData();
    setScreen('test');
    setElapsedTime(0);

    const sequence = generateSequence(ITEMS_PER_BLOCK, BLOCKS[blockIndex].type);
    setStimulusSequence(sequence);

    setTimeout(() => {
      setIsTestActive(true);
      blockStartTimeRef.current = Date.now();

      timerIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - blockStartTimeRef.current) / 1000;
        setElapsedTime(elapsed);
      }, 100);

      showNextStimulus(0, sequence);
    }, 1000);
  };

  const showNextStimulus = (trialNum, sequence) => {
    const maxTrials = isPractice ? PRACTICE_TRIALS : ITEMS_PER_BLOCK;

    if (trialNum >= maxTrials) {
      endBlock();
      return;
    }

    const stimulus = sequence[trialNum];

    setShowingFixation(true);
    setCurrentStimulus({ text: '+', color: '#2c3e50', type: 'fixation' });
    setCanRespond(false);
    setFeedback('');

    setTimeout(() => {
      if (stimulus.blockType === 'color') {
        setCurrentStimulus({
          text: '■ ■ ■',
          color: COLOR_MAP[stimulus.color],
          type: 'color',
          ...stimulus
        });
      } else {
        setCurrentStimulus({
          text: stimulus.word,
          color: stimulus.color === 'black' ? 'black' : COLOR_MAP[stimulus.color],
          type: 'word',
          ...stimulus
        });
      }

      setShowingFixation(false);
      trialStartTimeRef.current = new Date().toISOString()
      trialStartTimestamp.current = Date.now(); // Store numeric timestamp for RT
      setCanRespond(true);
    }, 500);
  };

  const handleResponse = useCallback((response, isCorrect, reactionTime) => {
    setCanRespond(false);

    setCurrentBlockData(prev => ({
      ...prev,
      trialTimes: [...prev.trialTimes, reactionTime],
      errors: prev.errors + (isCorrect ? 0 : 1)
    }));

    if (isPractice) {
      if (isCorrect) {
        setFeedback(`Correct! (${reactionTime}ms)`);
        setFeedbackType('correct');
      } else {
        setFeedback(`Incorrect. Expected: ${currentStimulus.correctResponse}`);
        setFeedbackType('incorrect');
      }
    }

    const nextTrial = currentTrial + 1;
    setCurrentTrial(nextTrial);

    setTimeout(() => {
      showNextStimulus(nextTrial, stimulusSequence);
    }, 1000);
  }, [currentTrial, stimulusSequence, isPractice, currentStimulus]);

  const handleKeyPress = useCallback((e) => {
    if (!isTestActive || !canRespond) return;

    const pressedKey = e.code;
    if (!KEY_MAP[pressedKey]) return;

    e.preventDefault();
    const trialEndTime = new Date().toISOString()
    const response = KEY_MAP[pressedKey];
    const reactionTime = Date.now() - trialStartTimestamp.current;
    const isCorrect = response === currentStimulus.correctResponse;

    // Record trial data
    trialDataArray.current.push(
      createTrialData(
        currentTrial + 1,
        trialStartTimeRef.current,
        trialEndTime,
        {
          blockType: BLOCKS[currentBlock].type,
          response,
          isCorrect,
          reactionTime,
          stimulus: currentStimulus.word
        }
      )
    )

    setActiveKey(pressedKey);
    setTimeout(() => setActiveKey(null), 200);

    handleResponse(response, isCorrect, reactionTime);
  }, [isTestActive, canRespond, currentStimulus, handleResponse, currentTrial, currentBlock]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const endBlock = () => {
    setIsTestActive(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (isPractice) {
      setFeedback('Practice complete! Starting main test...');
      setFeedbackType('correct');

      setTimeout(() => {
        startMainTest(0);
      }, 2000);
    } else {
      const completionTime = (Date.now() - blockStartTimeRef.current) / 1000;
      const avgTimePerItem = currentBlockData.trialTimes.length > 0 ?
        Math.round(currentBlockData.trialTimes.reduce((a, b) => a + b, 0) / currentBlockData.trialTimes.length) : 0;
      const accuracy = ((ITEMS_PER_BLOCK - currentBlockData.errors) / ITEMS_PER_BLOCK * 100).toFixed(1);

      const blockResult = {
        blockName: BLOCKS[currentBlock].shortName,
        blockType: BLOCKS[currentBlock].type,
        completionTime: completionTime.toFixed(2),
        errors: currentBlockData.errors,
        accuracy: accuracy,
        avgTimePerItem: avgTimePerItem,
        allTrialTimes: currentBlockData.trialTimes
      };

      setBlockResults(prev => [...prev, blockResult]);

      // Single block test - go straight to results
      setScreen('results');
    }
  };

  const showRestScreen = (nextBlockIndex) => {
    setScreen('rest');
    setRestTimeLeft(REST_DURATION);

    restIntervalRef.current = setInterval(() => {
      setRestTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(restIntervalRef.current);
          startMainTest(nextBlockIndex);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, []);

  const getStimulusClass = () => {
    if (showingFixation) return 'stimulus-display';
    if (currentStimulus?.type === 'color') return 'stimulus-display color-block';
    return 'stimulus-display word-block';
  };

  const keyButtons = ['KeyR', 'KeyY', 'KeyG', 'KeyB'];
  const keyLabels = ['R', 'Y', 'G', 'B'];

  return (
    <div className="container">
      {screen === 'welcome' && (
        <div id="welcomeScreen">
          <h1>Welcome to the Stroop Color-Word Test</h1>

          <div className="instructions">
            <h3>Instructions:</h3>
            <p>In this test, you will see color words printed in <strong>mismatched ink colors</strong>.</p>

            <div className="block-explanation">
              <h4>Stroop Interference Task</h4>
              <p>You will see color words where the <strong>ink color differs from the word itself</strong>.</p>
              <p><strong>Task:</strong> Name the <strong>INK COLOR</strong>, not the word, and press the corresponding key.</p>
              <p className="example">Example: If you see <span style={{ color: 'blue' }}>RED</span>, press "B" for BLUE</p>
            </div>

            <p className="important-note">⚠️ <strong>Important:</strong> This test requires you to speak your responses aloud.
              Please ensure you are in a quiet environment. Press the corresponding key after you've spoken your answer.</p>

            <div className="key-guide">
              <p><strong>Response Keys:</strong></p>
              <ul>
                <li><kbd>R</kbd> = RED</li>
                <li><kbd>Y</kbd> = YELLOW</li>
                <li><kbd>G</kbd> = GREEN</li>
                <li><kbd>B</kbd> = BLUE</li>
              </ul>
            </div>
          </div>

          <button onClick={startPractice}>Start Practice</button>
        </div>
      )}

      {screen === 'practice' && (
        <div id="practiceScreen">
          <h1>Practice: <span>Stroop Interference</span></h1>
          <p className="instruction-text">Name the INK COLOR (not the word) and press the corresponding key</p>

          <div className="stimulus-container">
            <div className={getStimulusClass()} style={{ color: currentStimulus?.color || '#2c3e50' }}>
              {currentStimulus?.text || '+'}
            </div>
          </div>

          <div className="response-keys">
            {keyLabels.map((label, i) => (
              <span
                key={label}
                className={`key-button ${activeKey === keyButtons[i] ? 'active' : ''}`}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="trial-info">
            <p>Practice Trial: <span>{currentTrial}</span> / 5</p>
          </div>

          <p className={`feedback-message ${feedbackType === 'correct' ? 'feedback-correct' : feedbackType === 'incorrect' ? 'feedback-incorrect' : ''}`}>
            {feedback}
          </p>
        </div>
      )}

      {screen === 'test' && (
        <div id="testScreen">
          <h1><span>{BLOCKS[currentBlock].shortName}</span>: {BLOCKS[currentBlock].name.split(': ')[1]}</h1>
          <p className="instruction-text">{BLOCKS[currentBlock].instruction}</p>

          <div className="stimulus-container">
            <div className={getStimulusClass()} style={{ color: currentStimulus?.color || '#2c3e50' }}>
              {currentStimulus?.text || '+'}
            </div>
          </div>

          <div className="response-keys">
            {keyLabels.map((label, i) => (
              <span
                key={label}
                className={`key-button ${activeKey === keyButtons[i] ? 'active' : ''}`}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="trial-info">
            <p>Trial: <span>{currentTrial}</span> / {ITEMS_PER_BLOCK}</p>
          </div>

          <div className="timer-display">
            <p>Time: <span>{elapsedTime.toFixed(1)}</span>s</p>
          </div>
        </div>
      )}



      {screen === 'results' && (
        <div id="resultsScreen">
          <h2>Stroop Test Results</h2>

          <table className="results-table">
            <thead>
              <tr>
                <th>Block</th>
                <th>Time (s)</th>
                <th>Errors</th>
                <th>Accuracy (%)</th>
                <th>Avg RT per item (ms)</th>
              </tr>
            </thead>
            <tbody>
              {blockResults.map((result, i) => (
                <tr key={i}>
                  <td><strong>{result.blockName}</strong></td>
                  <td>{result.completionTime}s</td>
                  <td>{result.errors}</td>
                  <td>{result.accuracy}%</td>
                  <td>{result.avgTimePerItem}ms</td>
                </tr>
              ))}
            </tbody>
          </table>



          <button id="goToAnotherTest" onClick={() => {
            if (onComplete) {
              const taskData = createTaskDataPackage(
                'stroop',
                { blockResults },
                taskStartTime.current,
                trialDataArray.current
              )
              onComplete(taskData);
            } else {
              alert('Test completed! Results saved.');
            }
          }}>
            Continue to Next Task
          </button>
        </div>
      )}
    </div>
  );
}