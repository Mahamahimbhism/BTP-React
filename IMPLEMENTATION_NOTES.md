# Global Task Data Collection Implementation

## Overview
Implemented a React Context-based global state management system to collect comprehensive task data with full timestamp tracking across all cognitive tests.

## Files Created/Modified

### 1. **Context Provider** (`src/context/TaskDataContext.jsx`)
- **New File**: Global context for task data
- **Functions**:
  - `addTaskResult()` - Add task completion data with timestamps
  - `setParticipant()` - Store participant registration data
  - `getCompiledData()` - Export all data as complete JSON package
  - `resetData()` - Clear all data for restart

### 2. **Utility Functions** (`src/utils/taskDataFormatter.js`)
- **New File**: Helper functions for consistent data formatting
- **Functions**:
  - `createTaskDataPackage()` - Creates standardized task data with timestamps
  - `createTrialData()` - Creates individual trial records with timing
  - `calculateTrialSummary()` - Calculates statistics from trial data

### 3. **App.jsx** - Updated
- Wrapped entire app with `TaskDataProvider`
- Split into `App()` wrapper and `AppContent()` inner component
- Integrated context hooks in `handleTaskComplete()`
- Updated final JSON export to use `getCompiledData()`
- Data flow: Task completes → `addTaskResult()` → Context state → Final JSON

### 4. **RegistrationForm.jsx** - Updated
- Added `taskStartTime` ref
- Modified data package to include:
  - Generated participant ID
  - `startedAt` timestamp (ISO)
  - `completedAt` timestamp (ISO)
  - `duration` (milliseconds)
  - `trialData` array (empty for registration)

### 5. **Go-NoGo Task.jsx** - Updated (Template Pattern)
- Added task timing refs:
  - `taskStartTime` - when component mounts
  - `trialStartTimeRef` - when each trial begins
  - `trialDataArray` - stores all trial records
- Enhanced `handleKeyPress()` to record:
  - Trial timestamps (start & end)
  - Response data (type, accuracy, RT)
  - Stimulus information
- Modified `goToAnotherTest()` to:
  - Create comprehensive task package with `createTaskDataPackage()`
  - Pass all data to `onComplete()`

## Data Collection Architecture

### Timestamp Hierarchy
```
Session Level
├── sessionStartTime (when app loads)
├── sessionCompletedAt (when last task finishes)
└── totalSessionDuration

Task Level (per task)
├── startedAt (ISO timestamp)
├── completedAt (ISO timestamp)
├── duration (milliseconds)
├── results {...}
└── trialData []

Trial Level (per trial)
├── trialNumber
├── startedAt (ISO timestamp)
├── completedAt (ISO timestamp)
├── duration (milliseconds)
└── response {...}
```

## Export JSON Structure
```json
{
  "sessionId": "unique_id",
  "sessionMetadata": {
    "recordingEnabled": true,
    "sessionStartedAt": "ISO_TIMESTAMP",
    "sessionCompletedAt": "ISO_TIMESTAMP",
    "totalSessionDuration": "milliseconds"
  },
  "participant": {...registration_data...},
  "taskResults": [
    {
      "sequencePosition": 1,
      "taskId": "registration",
      "taskName": "Registration",
      "startedAt": "ISO_TIMESTAMP",
      "completedAt": "ISO_TIMESTAMP",
      "duration": "milliseconds",
      "results": {...},
      "trialData": []
    },
    {
      "sequencePosition": 2,
      "taskId": "gng",
      "taskName": "Go/No-Go Test",
      "startedAt": "ISO_TIMESTAMP",
      "completedAt": "ISO_TIMESTAMP",
      "duration": "milliseconds",
      "results": {
        "totalRounds": 2,
        "roundResults": [...],
        "totalCorrect": 150,
        "totalWrong": 50,
        ...
      },
      "trialData": [
        {
          "trialNumber": 1,
          "startedAt": "ISO_TIMESTAMP",
          "completedAt": "ISO_TIMESTAMP",
          "duration": "milliseconds",
          "response": "spacebar",
          "isCorrect": true,
          "reactionTime": 425,
          ...
        }
      ]
    }
    // ... all other tasks
  ],
  "summary": {
    "totalTasksCompleted": 9,
    "tasksIncluded": ["registration", "gng", ...]
  }
}
```

## Implementation Pattern for Remaining Tasks

Each task should follow this pattern:

```javascript
import { createTaskDataPackage, createTrialData } from '../../utils/taskDataFormatter'

const TaskComponent = ({ onComplete }) => {
  const taskStartTime = useRef(new Date().toISOString())
  const trialDataArray = useRef([])
  const trialStartTimeRef = useRef(null)

  // In trial execution:
  trialStartTimeRef.current = new Date().toISOString()
  
  // On trial completion:
  trialDataArray.current.push(
    createTrialData(
      trialNumber,
      trialStartTimeRef.current,
      new Date().toISOString(),
      { ...trialResult }
    )
  )

  // On task completion:
  const taskData = createTaskDataPackage(
    'task_id',
    results,
    taskStartTime.current,
    trialDataArray.current
  )
  onComplete(taskData)
}
```

## Remaining Tasks to Update
1. FlankerTask
2. N-Back Task
3. PVT
4. Stroop Test
5. Posner Cueing Task
6. Mental Arithmetic Task (MAT)
7. Trail Making Task

All follow the same pattern as Go-NoGo Task.

## Benefits
✅ Comprehensive timestamp tracking at all levels  
✅ Complete data audit trail  
✅ Scalable context-based architecture  
✅ Automatic data aggregation  
✅ No manual data compilation needed  
✅ Clean separation of concerns  
✅ Easy to extend with new metrics
