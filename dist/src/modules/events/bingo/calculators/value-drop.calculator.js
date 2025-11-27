/**
 * Value Drop Progress Calculator
 */
export function calculateValueDropProgress(event, requirement, existing) {
    const lootData = event.data;
    const dropValue = lootData.totalValue || 0;
    const currentProgress = existing?.progressValue || 0;
    const newProgress = currentProgress + dropValue;
    const isCompleted = newProgress >= requirement.value;
    return {
        progressValue: newProgress,
        metadata: {
            ...existing?.metadata,
            current_value: newProgress,
            target_value: requirement.value,
            last_update_at: event.timestamp.toISOString(),
            last_drop_value: dropValue
        },
        isCompleted
    };
}
