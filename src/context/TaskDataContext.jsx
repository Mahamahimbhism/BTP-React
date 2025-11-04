import React, { createContext, useState, useCallback, useRef, useEffect } from 'react'

// Create the context
export const TaskDataContext = createContext()

// Context Provider Component
export function TaskDataProvider({ children }) {
    const [sessionStartTime] = useState(new Date().toISOString())
    const [participantData, setParticipantData] = useState(null)
    const [taskResults, setTaskResults] = useState([])

    // Refs to always have the latest values (avoid stale closures)
    const participantRef = useRef(participantData)
    const taskResultsRef = useRef(taskResults)

    useEffect(() => {
        participantRef.current = participantData
    }, [participantData])

    useEffect(() => {
        taskResultsRef.current = taskResults
    }, [taskResults])

    // Add or update task result with timestamps
    const addTaskResult = useCallback((taskId, taskName, taskData, metadata = {}) => {
        console.log('addTaskResult called with:', { taskId, taskName, taskData, metadata })
        
        const taskResult = {
            taskId: taskId,
            taskName: taskName,
            startedAt: metadata.startedAt || new Date().toISOString(),
            completedAt: metadata.completedAt || new Date().toISOString(),
            duration: metadata.duration || 0, // in milliseconds
            results: taskData,
            trialData: metadata.trialData || [],
            metadata: metadata
        }

        console.log('About to add task result:', taskResult)

        setTaskResults(prev => {
            const updated = [...prev, taskResult]
            console.log('🔵 Task result added. Total tasks now:', updated.length)
            console.log('All stored results:', updated)
            return updated
        })
    }, [])

    // Set participant info (from registration)
    const setParticipant = useCallback((data) => {
        setParticipantData(data)
    }, [])

    // Get all compiled data for final export
    const getCompiledData = useCallback(() => {
        const completedAt = new Date().toISOString()
        const currentParticipant = participantRef.current
        const currentTaskResults = taskResultsRef.current

        return {
            sessionId: `session_${Date.now()}`,
            sessionMetadata: {
                recordingEnabled: true,
                sessionStartedAt: sessionStartTime,
                sessionCompletedAt: completedAt,
                totalSessionDuration: new Date(completedAt) - new Date(sessionStartTime)
            },
            participant: currentParticipant,
            taskResults: currentTaskResults,
            summary: {
                totalTasksCompleted: currentTaskResults.length,
                tasksIncluded: currentTaskResults.map(t => t.taskId)
            }
        }
    }, [])

    // Reset all data (for restart)
    const resetData = useCallback(() => {
        setParticipantData(null)
        setTaskResults([])
    }, [])

    const value = {
        sessionStartTime,
        participantData,
        taskResults,
        addTaskResult,
        setParticipant,
        getCompiledData,
        resetData
    }

    return (
        <TaskDataContext.Provider value={value}>
            {children}
        </TaskDataContext.Provider>
    )
}

// Custom hook to use the context
export function useTaskData() {
    const context = React.useContext(TaskDataContext)
    if (!context) {
        throw new Error('useTaskData must be used within TaskDataProvider')
    }
    return context
}
