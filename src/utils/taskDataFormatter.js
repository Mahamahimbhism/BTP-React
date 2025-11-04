/**
 * Utility functions to format task completion data with timestamps
 */

/**
 * Create a complete task data package with timestamps
 * @param {string} taskId - Unique task identifier
 * @param {Object} results - Task results/metrics
 * @param {string} startedAt - ISO timestamp when task started
 * @param {Array} trialData - Array of trial-level data with timestamps
 * @returns {Object} Complete task data package
 */
export function createTaskDataPackage(taskId, results, startedAt, trialData = []) {
    const completedAt = new Date().toISOString()

    return {
        taskId,
        results,
        startedAt,
        completedAt,
        duration: new Date(completedAt) - new Date(startedAt),
        trialData: trialData,
        metadata: {
            trialsCount: trialData.length,
            formattedAt: new Date().toISOString()
        }
    }
}

/**
 * Create trial-level data with timestamps
 * @param {number} trialNumber - Which trial number
 * @param {string} startTime - ISO timestamp when trial started
 * @param {string} endTime - ISO timestamp when trial ended
 * @param {Object} trialResult - Trial-specific result
 * @returns {Object} Trial data with timing
 */
export function createTrialData(trialNumber, startTime, endTime, trialResult) {
    return {
        trialNumber,
        startedAt: startTime,
        completedAt: endTime,
        duration: new Date(endTime) - new Date(startTime),
        ...trialResult
    }
}

/**
 * Calculate summary statistics from trial data
 * @param {Array} trialData - Array of trial data
 * @param {string} accuracyKey - Key for accuracy field (optional)
 * @returns {Object} Summary statistics
 */
export function calculateTrialSummary(trialData, accuracyKey = 'isCorrect') {
    if (!trialData || trialData.length === 0) return {}

    const correct = trialData.filter(t => t[accuracyKey] === true).length
    const incorrect = trialData.filter(t => t[accuracyKey] === false).length
    const durations = trialData.map(t => t.duration).filter(d => typeof d === 'number')

    return {
        totalTrials: trialData.length,
        correct,
        incorrect,
        accuracy: trialData.length > 0 ? (correct / trialData.length * 100).toFixed(1) : 0,
        avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0
    }
}
