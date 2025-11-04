import React, { useState, useEffect, useRef } from 'react';
import './trail_making.css';
import { createTaskDataPackage, createTrialData } from '../../utils/taskDataFormatter'

const TrailMakingTest = ({ onComplete }) => {
  const taskStartTime = useRef(new Date().toISOString())
  const trialDataArray = useRef([])
  const trialStartTimeRef = useRef(null)

  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [numbers, setNumbers] = useState([]);
  const [currentNumber, setCurrentNumber] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [round1Time, setRound1Time] = useState(0);
  const [round2Time, setRound2Time] = useState(0);
  const [correctMoves, setCorrectMoves] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [round1Results, setRound1Results] = useState({});
  const [practiceFeedback, setPracticeFeedback] = useState('');
  const [feedbackClass, setFeedbackClass] = useState('');
  const [clickedItems, setClickedItems] = useState([]);

  const startTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const generateNumbers = (round) => {
    let newNumbers = [];
    if (round === 1) {
      for (let i = 1; i <= 25; i++) {
        newNumbers.push({ value: i, type: 'number' });
      }
    } else {
      for (let i = 1; i <= 13; i++) {
        newNumbers.push({ value: i, type: 'number' });
        if (i <= 12) {
          newNumbers.push({ value: String.fromCharCode(64 + i), type: 'letter' });
        }
      }
    }

    const first = newNumbers.shift();
    newNumbers.sort(() => Math.random() - 0.5);
    newNumbers.unshift(first);

    setNumbers(newNumbers);
    setClickedItems([]);
  };

  const startTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setTime(0);
    startTimeRef.current = Date.now();
    trialStartTimeRef.current = new Date().toISOString();

    timerIntervalRef.current = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTime(elapsedTime);
    }, 1000);
  };

  const handleNumberClick = (item, index, isPractice = false) => {
    if (!isPractice && !isTestRunning) return;

    const expectedType = currentRound === 1 ? 'number' :
      (currentNumber % 2 === 1 ? 'number' : 'letter');

    const expectedValue = currentRound === 1 ? currentNumber :
      (expectedType === 'number' ? Math.ceil(currentNumber / 2) :
        String.fromCharCode(64 + Math.floor(currentNumber / 2)));

    const isCorrect = item.type === expectedType && item.value === expectedValue;

    if (isCorrect) {
      setClickedItems(prev => [...prev, index]);

      if (isPractice) {
        setPracticeFeedback(currentRound === 1 ?
          "Correct! Click the next number." :
          "Correct! Continue the sequence.");
        setFeedbackClass("correct-feedback");
      } else {
        setCorrectMoves(prev => prev + 1);

        // Record trial data with timestamps
        trialDataArray.current.push(
          createTrialData(
            currentNumber - 1,
            trialStartTimeRef.current,
            new Date().toISOString(),
            {
              round: currentRound,
              clickedItem: item.value,
              clickedType: item.type,
              expectedValue,
              expectedType,
              isCorrect: true,
              index
            }
          )
        );
      }

      setCurrentNumber(prev => prev + 1);

      const totalItems = currentRound === 1 ? 25 : 25;

      if (currentNumber + 1 > totalItems) {
        if (!isPractice) {
          endTest();
        } else {
          setPracticeFeedback("Practice complete! You've reached the end.");
          setCurrentNumber(1);
          generateNumbers(currentRound);
        }
      }
    } else if (isPractice) {
      setPracticeFeedback("Wrong! Try again.");
      setFeedbackClass("wrong-feedback");
    }

    if (!isPractice) {
      setTotalMoves(prev => prev + 1);

      // Record incorrect clicks too (if not practice)
      if (!isCorrect) {
        trialDataArray.current.push(
          createTrialData(
            currentNumber - 1,
            trialStartTimeRef.current,
            new Date().toISOString(),
            {
              round: currentRound,
              clickedItem: item.value,
              clickedType: item.type,
              expectedValue,
              expectedType,
              isCorrect: false,
              index
            }
          )
        );
      }
    }
  };

  const endTest = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsTestRunning(false);
    const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);

    if (currentRound === 1) {
      setRound1Time(elapsedTime);
      const results = {
        time: elapsedTime,
        totalMoves: totalMoves + 1,
        correctMoves: correctMoves + 1,
        wrongMoves: totalMoves - correctMoves
      };
      setRound1Results(results);
      setCurrentScreen('round1Complete');
    } else {
      setRound2Time(elapsedTime);
      setCurrentScreen('finalResults');
    }
  };

  const startRound1Practice = () => {
    setCurrentScreen('round1Practice');
    setCurrentRound(1);
    setCurrentNumber(1);
    generateNumbers(1);
    setPracticeFeedback('');
  };

  const startRound1Test = () => {
    setCurrentScreen('round1Test');
    setCurrentNumber(1);
    setCorrectMoves(0);
    setTotalMoves(0);
    setIsTestRunning(true);
    generateNumbers(1);
    startTimer();
  };

  const startRound2Practice = () => {
    setCurrentScreen('round2Practice');
    setCurrentRound(2);
    setCurrentNumber(1);
    generateNumbers(2);
    setPracticeFeedback('');
  };

  const startRound2Test = () => {
    setCurrentScreen('round2Test');
    setCurrentNumber(1);
    setCorrectMoves(0);
    setTotalMoves(0);
    setIsTestRunning(true);
    generateNumbers(2);
    startTimer();
  };

  const renderTrailContainer = (isPractice = false) => {
    return (
      <div className="trail-container">
        {numbers.map((item, index) => {
          const isClicked = clickedItems.includes(index);
          return (
            <div
              key={`${item.type}-${item.value}-${index}`}
              className={isClicked ? 'clicked' : ''}
              onClick={() => handleNumberClick(item, index, isPractice)}
            >
              {item.value}
            </div>
          );
        })}
      </div>
    );
  };

  const round2Results = {
    time: round2Time,
    totalMoves: totalMoves + 1,
    correctMoves: correctMoves + 1,
    wrongMoves: totalMoves - correctMoves
  };

  return (
    <div className="container">
      {currentScreen === 'welcome' && (
        <div id="welcomeScreen">
          <h1>Welcome to Trail Making Test</h1>
          <div className="instructions">
            <p>This test consists of two rounds with different patterns.</p>
            <p>Click the button below to begin with Round 1 instructions.</p>
          </div>
          <button onClick={() => setCurrentScreen('round1Instruction')}>Begin Test</button>
        </div>
      )}

      {currentScreen === 'round1Instruction' && (
        <div id="round1InstructionScreen">
          <h1>Round 1 Instructions</h1>
          <div className="instructions">
            <p>Click on the circles in ascending order (1-2-3-4...), starting with 1 and ending with 25.</p>
            <p>The circles will be randomly distributed on the screen.</p>
            <p>Try to complete the sequence as quickly as possible.</p>
          </div>
          <button onClick={startRound1Practice}>Start Practice Round</button>
        </div>
      )}

      {currentScreen === 'round1Practice' && (
        <div id="round1PracticeScreen">
          <h1>Round 1 Practice</h1>
          <div className="instructions">
            <p>Practice clicking the circles in order (1-2-3...).</p>
            <p>This won't be timed - just get familiar with the task.</p>
            <p id="practiceFeedback" className={feedbackClass}>{practiceFeedback}</p>
          </div>
          {renderTrailContainer(true)}
          <button onClick={startRound1Test}>I'm Ready for the Real Test</button>
        </div>
      )}

      {currentScreen === 'round1Test' && (
        <div id="round1TestScreen">
          <h1>Round 1</h1>
          <p>Time: <span id="time">{time}</span> seconds</p>
          {renderTrailContainer(false)}
        </div>
      )}

      {currentScreen === 'round1Complete' && (
        <div id="round1CompleteScreen">
          <h1>Round 1 Complete!</h1>
          <div className="results-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Time</td>
                  <td>{round1Results.time} seconds</td>
                </tr>
                <tr>
                  <td>Total Moves</td>
                  <td>{round1Results.totalMoves}</td>
                </tr>
                <tr>
                  <td>Correct Moves</td>
                  <td>{round1Results.correctMoves}</td>
                </tr>
                <tr>
                  <td>Wrong Moves</td>
                  <td>{round1Results.wrongMoves}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button onClick={() => setCurrentScreen('round2Instruction')}>Continue to Round 2</button>
        </div>
      )}

      {currentScreen === 'round2Instruction' && (
        <div id="round2InstructionScreen">
          <h1>Round 2 Instructions</h1>
          <div className="instructions">
            <p>Now alternate between numbers and letters (1-A-2-B...), starting with 1 and ending with 13.</p>
            <p>The circles will be randomly distributed on the screen.</p>
            <p>Try to complete the sequence as quickly as possible.</p>
          </div>
          <button onClick={startRound2Practice}>Start Practice Round</button>
        </div>
      )}

      {currentScreen === 'round2Practice' && (
        <div id="round2PracticeScreen">
          <h1>Round 2 Practice</h1>
          <div className="instructions">
            <p>Practice alternating between numbers and letters (1-A-2-B...).</p>
            <p>This won't be timed - just get familiar with the task.</p>
            <p id="round2PracticeFeedback" className={feedbackClass}>{practiceFeedback}</p>
          </div>
          {renderTrailContainer(true)}
          <button onClick={startRound2Test}>I'm Ready for the Real Test</button>
        </div>
      )}

      {currentScreen === 'round2Test' && (
        <div id="round2TestScreen">
          <h1>Round 2</h1>
          <p>Time: <span id="round2Time">{time}</span> seconds</p>
          {renderTrailContainer(false)}
        </div>
      )}

      {currentScreen === 'finalResults' && (
        <div id="finalResultsScreen">
          <h1>Test Complete!</h1>
          <div className="results-container">
            <h2>Round 1 Results</h2>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Time</td>
                  <td>{round1Results.time} seconds</td>
                </tr>
                <tr>
                  <td>Total Moves</td>
                  <td>{round1Results.totalMoves}</td>
                </tr>
                <tr>
                  <td>Correct Moves</td>
                  <td>{round1Results.correctMoves}</td>
                </tr>
                <tr>
                  <td>Wrong Moves</td>
                  <td>{round1Results.wrongMoves}</td>
                </tr>
              </tbody>
            </table>

            <h2>Round 2 Results</h2>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Time</td>
                  <td>{round2Results.time} seconds</td>
                </tr>
                <tr>
                  <td>Total Moves</td>
                  <td>{round2Results.totalMoves}</td>
                </tr>
                <tr>
                  <td>Correct Moves</td>
                  <td>{round2Results.correctMoves}</td>
                </tr>
                <tr>
                  <td>Wrong Moves</td>
                  <td>{round2Results.wrongMoves}</td>
                </tr>
              </tbody>
            </table>

            <h2>Combined Results</h2>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Time</td>
                  <td>{round1Results.time + round2Results.time} seconds</td>
                </tr>
                <tr>
                  <td>Total Correct Moves</td>
                  <td>{round1Results.correctMoves + round2Results.correctMoves}</td>
                </tr>
                <tr>
                  <td>Total Wrong Moves</td>
                  <td>{round1Results.wrongMoves + round2Results.wrongMoves}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button id="goToAnotherTest" onClick={() => {
            if (onComplete) {
              const taskData = createTaskDataPackage(
                'trailMaking',
                {
                  round1Time,
                  round2Time,
                  round1Results,
                  totalCorrectClicks: correctMoves,
                  totalClicks: totalMoves
                },
                taskStartTime.current,
                trialDataArray.current
              );
              onComplete(taskData);
            } else {
              setCurrentScreen('welcome');
            }
          }}>
            Continue to Next Task
          </button>
        </div>
      )}
    </div>
  );
};

export default TrailMakingTest;