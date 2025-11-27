/**
 * Pet Progress Calculator
 */
export function calculatePetProgress(event, requirement, existing) {
    const currentProgress = existing?.progressValue || 0;
    const newProgress = currentProgress + 1; // Each pet event = +1
    const isCompleted = newProgress >= requirement.amount;
    return {
        progressValue: newProgress,
        metadata: {
            ...existing?.metadata,
            count: newProgress,
            current_value: newProgress,
            target_value: requirement.amount,
            last_update_at: event.timestamp.toISOString(),
            last_pet: event.data.petName
        },
        isCompleted
    };
}
