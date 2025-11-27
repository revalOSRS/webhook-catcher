/**
 * Item Drop Progress Calculator
 */
export function calculateItemDropProgress(event, requirement, existing) {
    const lootData = event.data;
    let progressIncrement = 0;
    let itemsObtained = [];
    // Single item format
    if (requirement.item_id !== undefined) {
        const matchingItem = lootData.items.find((item) => item.id === requirement.item_id);
        if (matchingItem) {
            progressIncrement = matchingItem.quantity;
            itemsObtained.push({
                id: matchingItem.id,
                name: matchingItem.name,
                quantity: matchingItem.quantity
            });
        }
    }
    else if (requirement.items && requirement.total_amount) {
        // Multiple items format - count total matching items
        for (const reqItem of requirement.items) {
            const found = lootData.items.find((item) => item.id === reqItem.item_id);
            if (found) {
                progressIncrement += found.quantity;
                itemsObtained.push({
                    id: found.id,
                    name: found.name,
                    quantity: found.quantity
                });
            }
        }
    }
    const currentProgress = existing?.progressValue || 0;
    const newProgress = currentProgress + progressIncrement;
    const targetValue = requirement.item_amount || requirement.total_amount || 1;
    const isCompleted = newProgress >= targetValue;
    return {
        progressValue: newProgress,
        metadata: {
            ...existing?.metadata,
            count: newProgress,
            current_value: newProgress,
            target_value: targetValue,
            last_update_at: event.timestamp.toISOString(),
            last_items_obtained: itemsObtained
        },
        isCompleted
    };
}
