import './App.css'
import RegistrationForm from './components/RegistrationForm'
import GoNoGoTest from './components/Go-NoGo Task/Go-NoGo'
import FlankerTask from './components/Flanker Task/FlankerTask'
import TrailMakingTask from './components/Trail making task/TrailMakingTask'
import NBackTask from './components/N-back task/N-backTask'
import Pvt from './components/Psychomotor Vigilance Task/Pvt'
import Stroop from './components/Stroop test/Stroop'
import PosnerCueingTask from './components/Posner cueing Task/posner'
import MAT from './components/Mental Arithmetic Task/MAT'
import { useState, useRef, useEffect } from 'react'
import { TaskDataProvider, useTaskData } from './context/TaskDataContext'

// Task configuration array - easily editable and sequential
const TASK_SEQUENCE = [
  { id: 'registration', name: 'Registration', component: RegistrationForm },
  { id: 'gng', name: 'Go/No-Go Test', component: GoNoGoTest },
  { id: 'mat', name: 'Mental Arithmetic Task', component: MAT },
  { id: 'pvt', name: 'Psychomotor Vigilance Task', component: Pvt },
  { id: 'stroop', name: 'Stroop Test', component: Stroop },
  { id: 'nback', name: 'N-Back Task', component: NBackTask },
  { id: 'trailMaking', name: 'Trail Making Test', component: TrailMakingTask },
  { id: 'posner', name: 'Posner Cueing Task', component: PosnerCueingTask },
  // { id: 'flanker', name: 'Flanker Task', component: FlankerTask },
]

export default function App() {
  return (
    <TaskDataProvider>
      <AppContent />
    </TaskDataProvider>
  )
}

function AppContent() {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [participantData, setParticipantData] = useState(null)
  const [screen, setScreen] = useState('camera-permission') // 'camera-permission', 'tasks', 'completion'
  const [recordingStarted, setRecordingStarted] = useState(false)
  const [testResults, setTestResults] = useState({})

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const videoRef = useRef(null)

  // Get context
  const { setParticipant, addTaskResult, getCompiledData } = useTaskData()

  const currentTask = TASK_SEQUENCE[currentTaskIndex] || null
  const CurrentComponent = currentTask?.component

  // Keep a live ref of currentTaskIndex to avoid stale closures in callbacks
  const currentTaskIndexRef = useRef(currentTaskIndex)
  useEffect(() => {
    currentTaskIndexRef.current = currentTaskIndex
  }, [currentTaskIndex])

  // Start camera recording
  const startCameraRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start()
      setRecordingStarted(true)
      console.log('Camera recording started')
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Camera access denied. Tests will proceed without recording.')
      setScreen('tasks')
    }
  }

  // Stop camera recording and download
  const stopCameraRecording = async () => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && recordingStarted) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `cognitive_test_recording_${participantData?.id || 'session'}_${new Date().toISOString().split('T')[0]}.webm`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
          }

          console.log('Camera recording stopped and downloaded')
          resolve()
        }

        mediaRecorderRef.current.stop()
        setRecordingStarted(false)
      } else {
        resolve()
      }
    })
  }

  // Handle camera permission screen
  const handleCameraPermissionAccept = () => {
    startCameraRecording()
    setScreen('tasks')
  }

  const handleCameraPermissionSkip = () => {
    setScreen('tasks')
  }

  function handleTaskComplete(data) {
    console.log(data);
    // Determine the task at the moment of completion to avoid stale closure
    const idx = currentTaskIndexRef.current
    const taskAtCompletion = TASK_SEQUENCE[idx]

    // If somehow out of range, finish gracefully
    if (!taskAtCompletion) {
      console.warn('Task index out of range on completion:', idx)
      handleAllTasksComplete()
      return
    }

    // Save participant data if registration
    if (taskAtCompletion.id === 'registration') {
      try {
        const users = JSON.parse(localStorage.getItem('users') || '[]')
        users.push({ participant: data, createdAt: Date.now() })
        localStorage.setItem('users', JSON.stringify(users))
        setParticipantData(data)
        setParticipant(data) // Update context with participant data
      } catch (e) {
        console.warn('Failed to save participant', e)
      }
    }

    // Add task result to context
    if (data) {
      addTaskResult(
        taskAtCompletion.id,
        taskAtCompletion.name,
        data,
        {
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          duration: data.duration,
          trialData: data.trialData || []
        }
      )

      setTestResults(prev => ({
        ...prev,
        [taskAtCompletion.id]: {
          taskName: taskAtCompletion.name,
          data: data,
          completedAt: new Date().toISOString()
        }
      }))
    }

    // Move to next task using current index snapshot
    if (idx < TASK_SEQUENCE.length - 1) {
      setCurrentTaskIndex(idx + 1)
    } else {
      // All tasks completed
      console.log('All tasks completed!')
      handleAllTasksComplete()
    }
  }

  // Safety: if screen shows tasks but index is out of range, complete
  useEffect(() => {
    if (screen === 'tasks' && (currentTaskIndex < 0 || currentTaskIndex >= TASK_SEQUENCE.length)) {
      console.warn('Current task index out of range during render:', currentTaskIndex)
      handleAllTasksComplete()
    }
  }, [screen, currentTaskIndex])

  function handleAllTasksComplete() {
    // Stop recording and download
    stopCameraRecording().then(() => {
      // Get all compiled data from context
      const compiledData = getCompiledData()

      // Download results as JSON
      const json = JSON.stringify(compiledData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cognitive_test_results_${compiledData.sessionId}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Show completion screen
      setScreen('completion')
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <>
      {screen === 'camera-permission' && (
        <div className="permission-screen">
          <div className="permission-card">
            <h1>Camera Recording Consent</h1>
            <div className="permission-content">
              <p>This cognitive testing session will be recorded for quality assurance and data validation purposes.</p>
              <div className="consent-details">
                <h3>Recording will include:</h3>
                <ul>
                  <li>Video of your participation in cognitive tasks</li>
                  <li>Audio of your responses and environment</li>
                </ul>
                <h3>Your privacy:</h3>
                <ul>
                  <li>Recordings are stored securely and confidentially</li>
                  <li>Only authorized researchers will have access</li>
                  <li>You can choose to proceed without recording</li>
                </ul>
              </div>
            </div>
            <div className="permission-buttons">
              <button className="btn-accept" onClick={handleCameraPermissionAccept}>
                ✓ I Consent to Recording
              </button>
              <button className="btn-skip" onClick={handleCameraPermissionSkip}>
                ✗ Skip Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'tasks' && CurrentComponent && (
        <>
          <CurrentComponent onComplete={handleTaskComplete} />
        </>
      )}

      {screen === 'completion' && (
        <div className="completion-screen">
          <div className="completion-card">
            <h1>🎉 All Tests Completed!</h1>
            <div className="completion-content">
              <p>Thank you for participating in the cognitive testing session!</p>
              <div className="completion-summary">
                <h3>Session Summary:</h3>
                <p><strong>Participant ID:</strong> {participantData?.id || 'Unknown'}</p>
                <p><strong>Tasks Completed:</strong> {TASK_SEQUENCE.length}</p>
                <p><strong>Recording:</strong> {recordingStarted ? 'Downloaded' : 'Not recorded'}</p>
                <p><strong>Results File:</strong> Downloaded as JSON</p>
              </div>
              <p className="completion-note">
                Your results and recording have been saved and downloaded to your computer.
                Please check your Downloads folder for the files.
              </p>
            </div>
            <button className="btn-finish" onClick={() => window.location.reload()}>
              Finish & Restart
            </button>
          </div>
        </div>
      )}
    </>
  )
}
