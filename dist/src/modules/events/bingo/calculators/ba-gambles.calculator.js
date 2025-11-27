/**
 * BA Gambles Progress Calculator
 */
export function calculateBaGamblesProgress(event, requirement, existing) {
    const baData = event.data;
    const gambleCount = baData.gambleCount || 1;
    const currentProgress = existing?.progressValue || 0;
    const newProgress = currentProgress + gambleCount;
    const isCompleted = newProgress >= requirement.amount;
    return {
        progressValue: newProgress,
        metadata: {
            ...existing?.metadata,
            count: newProgress,
            current_value: newProgress,
            target_value: requirement.amount,
            last_update_at: event.timestamp.toISOString(),
            last_gamble_count: gambleCount
        },
        isCompleted
    };
}
