/**
 * Requirement Validation System
 * Validates tile requirements to ensure they're properly structured
 */
// ============================================================================
// Simplified Requirement Validation
// ============================================================================
/**
 * Main validation function - validates the simplified requirement structure
 */
export function validateRequirement(requirement) {
    try {
        // Check if it's the new simplified format
        if (requirement && typeof requirement === 'object' && 'match_type' in requirement) {
            return validateSimplifiedRequirements(requirement);
        }
        // If it doesn't match the new format, return error
        return {
            valid: false,
            errors: ['Invalid requirement format. Must use simplified format with match_type and requirements/tiers.']
        };
    }
    catch (error) {
        return {
            valid: false,
            errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
    }
}
/**
 * Validate the simplified requirement structure
 */
export function validateSimplifiedRequirements(requirements) {
    const errors = [];
    // Validate match_type
    if (!requirements.match_type || !['all', 'any'].includes(requirements.match_type)) {
        errors.push('match_type must be "all" or "any"');
    }
    // Validate that either requirements or tiers is provided
    if (!requirements.requirements && !requirements.tiers) {
        errors.push('Either requirements or tiers must be provided');
    }
    // Validate requirements array (if provided)
    if (requirements.requirements) {
        if (!Array.isArray(requirements.requirements)) {
            errors.push('requirements must be an array');
        }
        else if (requirements.requirements.length === 0 && !requirements.tiers) {
            // Only error if requirements is empty AND there are no tiers
            errors.push('requirements array cannot be empty when no tiers are provided');
        }
        else if (requirements.requirements.length > 0) {
            // Only validate requirements if the array is not empty
            requirements.requirements.forEach((req, index) => {
                const validation = validateSimplifiedRequirement(req);
                if (!validation.valid && validation.errors) {
                    validation.errors.forEach(err => {
                        errors.push(`requirements[${index}]: ${err}`);
                    });
                }
            });
        }
    }
    // Validate tiers array (if provided)
    if (requirements.tiers) {
        if (!Array.isArray(requirements.tiers)) {
            errors.push('tiers must be an array');
        }
        else if (requirements.tiers.length === 0) {
            errors.push('tiers array cannot be empty');
        }
        else {
            requirements.tiers.forEach((tier, index) => {
                if (!tier.tier || typeof tier.tier !== 'number' || tier.tier < 1) {
                    errors.push(`tiers[${index}].tier must be a positive number`);
                }
                const validation = validateSimplifiedRequirement(tier.requirement);
                if (!validation.valid && validation.errors) {
                    validation.errors.forEach(err => {
                        errors.push(`tiers[${index}].requirement: ${err}`);
                    });
                }
            });
        }
    }
    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}
/**
 * Validate a single simplified requirement
 */
function validateSimplifiedRequirement(requirement) {
    const errors = [];
    if (!requirement || typeof requirement !== 'object') {
        return { valid: false, errors: ['Requirement must be an object'] };
    }
    if (!requirement.type) {
        errors.push('Requirement must have a type field');
    }
    else {
        // Type-specific validation
        switch (requirement.type) {
            case 'ITEM_DROP':
                errors.push(...validateItemDropRequirement(requirement));
                break;
            case 'PET':
                errors.push(...validatePetRequirement(requirement));
                break;
            case 'VALUE_DROP':
                errors.push(...validateValueDropRequirement(requirement));
                break;
            case 'SPEEDRUN':
                errors.push(...validateSpeedrunRequirement(requirement));
                break;
            case 'UNIQUE_COLLECTION':
                errors.push(...validateUniqueCollectionRequirement(requirement));
                break;
            case 'EXPERIENCE':
                errors.push(...validateExperienceRequirement(requirement));
                break;
            case 'BA_GAMBLES':
                errors.push(...validateBaGamblesRequirement(requirement));
                break;
            default:
                errors.push(`Unknown requirement type: ${requirement.type}`);
        }
    }
    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}
function validateItemDropRequirement(req) {
    const errors = [];
    // Check if using single item format
    const hasSingleItem = req.item_name !== undefined || req.item_id !== undefined || req.item_amount !== undefined;
    // Check if using multiple items format
    const hasMultipleItems = req.items !== undefined || req.total_amount !== undefined;
    if (!hasSingleItem && !hasMultipleItems) {
        errors.push('ITEM_DROP must have either (item_name, item_id, item_amount) OR (items, total_amount)');
        return errors;
    }
    if (hasSingleItem && hasMultipleItems) {
        errors.push('ITEM_DROP cannot have both single item format and multiple items format');
        return errors;
    }
    // Validate single item format
    if (hasSingleItem) {
        if (!req.item_name || typeof req.item_name !== 'string') {
            errors.push('item_name is required and must be a string');
        }
        if (req.item_id === undefined || typeof req.item_id !== 'number' || req.item_id < 0) {
            errors.push('item_id is required and must be a non-negative number');
        }
        if (!req.item_amount || typeof req.item_amount !== 'number' || req.item_amount < 1) {
            errors.push('item_amount is required and must be a positive number');
        }
    }
    // Validate multiple items format
    if (hasMultipleItems) {
        if (!req.items || !Array.isArray(req.items)) {
            errors.push('items is required and must be an array');
        }
        else if (req.items.length === 0) {
            errors.push('items array cannot be empty');
        }
        else {
            req.items.forEach((item, index) => {
                if (!item.item_name || typeof item.item_name !== 'string') {
                    errors.push(`items[${index}].item_name is required and must be a string`);
                }
                if (item.item_id === undefined || typeof item.item_id !== 'number' || item.item_id < 0) {
                    errors.push(`items[${index}].item_id is required and must be a non-negative number`);
                }
            });
        }
        if (req.total_amount === undefined || typeof req.total_amount !== 'number' || req.total_amount < 1) {
            errors.push('total_amount is required and must be a positive number');
        }
    }
    return errors;
}
function validatePetRequirement(req) {
    const errors = [];
    if (!req.pet_name || typeof req.pet_name !== 'string') {
        errors.push('pet_name is required and must be a string');
    }
    if (!req.amount || typeof req.amount !== 'number' || req.amount < 1) {
        errors.push('amount is required and must be a positive number');
    }
    return errors;
}
function validateValueDropRequirement(req) {
    const errors = [];
    if (!req.value || typeof req.value !== 'number' || req.value < 1) {
        errors.push('value is required and must be a positive number');
    }
    return errors;
}
function validateSpeedrunRequirement(req) {
    const errors = [];
    if (!req.location || typeof req.location !== 'string') {
        errors.push('location is required and must be a string');
    }
    if (!req.goal_seconds || typeof req.goal_seconds !== 'number' || req.goal_seconds < 1) {
        errors.push('goal_seconds is required and must be a positive number');
    }
    // SPEEDRUN doesn't support item_amount (that's for ITEM_DROP)
    if (req.item_amount !== undefined) {
        errors.push('SPEEDRUN requirement does not support item_amount field');
    }
    return errors;
}
function validateUniqueCollectionRequirement(req) {
    const errors = [];
    // Validate collection_mode
    if (req.collection_mode !== undefined && !['MULTI_SOURCE', 'PROGRESSIVE'].includes(req.collection_mode)) {
        errors.push('collection_mode must be "MULTI_SOURCE" or "PROGRESSIVE"');
    }
    const mode = req.collection_mode || 'MULTI_SOURCE';
    if (!req.sources || !Array.isArray(req.sources)) {
        errors.push('sources is required and must be an array');
    }
    else if (req.sources.length === 0) {
        errors.push('sources array cannot be empty');
    }
    else {
        // For MULTI_SOURCE mode, need at least 2 sources
        if (mode === 'MULTI_SOURCE' && req.sources.length < 2) {
            errors.push('MULTI_SOURCE mode requires at least 2 sources');
        }
        // For PROGRESSIVE mode, typically uses 1 source (but can have multiple if they're all part of the same set)
        req.sources.forEach((source, sourceIndex) => {
            if (!source.source_name || typeof source.source_name !== 'string') {
                errors.push(`sources[${sourceIndex}].source_name is required and must be a string`);
            }
            if (!source.items || !Array.isArray(source.items)) {
                errors.push(`sources[${sourceIndex}].items is required and must be an array`);
            }
            else if (source.items.length === 0) {
                errors.push(`sources[${sourceIndex}].items array cannot be empty`);
            }
            else {
                source.items.forEach((item, itemIndex) => {
                    if (!item.item_name || typeof item.item_name !== 'string') {
                        errors.push(`sources[${sourceIndex}].items[${itemIndex}].item_name is required and must be a string`);
                    }
                    if (item.item_id === undefined || typeof item.item_id !== 'number' || item.item_id < 0) {
                        errors.push(`sources[${sourceIndex}].items[${itemIndex}].item_id is required and must be a non-negative number`);
                    }
                });
            }
        });
    }
    if (req.base_requirement !== undefined) {
        if (typeof req.base_requirement !== 'number' || req.base_requirement < 1) {
            errors.push('base_requirement must be a positive number if provided');
        }
    }
    if (req.tier_increment !== undefined) {
        if (typeof req.tier_increment !== 'number' || req.tier_increment < 1) {
            errors.push('tier_increment must be a positive number if provided');
        }
    }
    // Validate tier_requirements if provided
    if (req.tier_requirements !== undefined) {
        if (!Array.isArray(req.tier_requirements)) {
            errors.push('tier_requirements must be an array');
        }
        else if (req.tier_requirements.length === 0) {
            errors.push('tier_requirements array cannot be empty');
        }
        else {
            req.tier_requirements.forEach((count, index) => {
                if (typeof count !== 'number' || count < 1) {
                    errors.push(`tier_requirements[${index}] must be a positive number`);
                }
            });
        }
    }
    // For PROGRESSIVE mode, validate that base_requirement + increments don't exceed total items
    if (mode === 'PROGRESSIVE' && req.sources && req.sources.length > 0) {
        const totalItems = req.sources.reduce((sum, source) => sum + (source.items?.length || 0), 0);
        const baseReq = req.base_requirement || 1;
        const tierInc = req.tier_increment || 1;
        if (!req.require_all_for_final_tier) {
            // If not requiring all, check that tiers don't exceed total items
            const maxTierItems = baseReq + (2 * tierInc); // Base + Tier 2 + Tier 3
            if (maxTierItems > totalItems) {
                errors.push(`For PROGRESSIVE mode, base_requirement + (2 * tier_increment) (${maxTierItems}) exceeds total items (${totalItems}). Consider setting require_all_for_final_tier to true.`);
            }
        }
    }
    // For MULTI_SOURCE mode, validate that each source has enough items for its tier
    if (mode === 'MULTI_SOURCE' && req.sources && req.sources.length > 0) {
        const baseReq = req.base_requirement || 1;
        const tierInc = req.tier_increment || 1;
        // If tier_requirements is provided, use that instead
        if (req.tier_requirements && req.tier_requirements.length > 0) {
            // With tier_requirements, each tier needs the specified amount from a different source
            const maxItemsNeeded = Math.max(...req.tier_requirements);
            req.sources.forEach((source, sourceIndex) => {
                const sourceItemCount = source.items?.length || 0;
                if (sourceItemCount < maxItemsNeeded) {
                    errors.push(`For MULTI_SOURCE mode with tier_requirements, source ${sourceIndex + 1} (${source.source_name}) needs at least ${maxItemsNeeded} items but only has ${sourceItemCount} items.`);
                }
            });
        }
        else {
            // Original logic for base_requirement + tier_increment
            req.sources.forEach((source, sourceIndex) => {
                const sourceItemCount = source.items?.length || 0;
                // Calculate how many items this source would need for its tier
                // Tier 1 (base): baseReq items
                // Tier 2: baseReq + tierInc items
                // Tier 3: baseReq + (2 * tierInc) items
                // Tier 4: baseReq + (3 * tierInc) items, or all items if require_all_for_final_source
                const maxTierForSource = req.sources.length; // Last tier uses the last source
                const itemsNeededForThisSource = baseReq + ((maxTierForSource - 1) * tierInc);
                if (req.require_all_for_final_source && sourceIndex === req.sources.length - 1) {
                    // Last source needs all items
                    if (sourceItemCount < itemsNeededForThisSource) {
                        errors.push(`For MULTI_SOURCE mode, the final source (${source.source_name}) needs ${itemsNeededForThisSource} items but only has ${sourceItemCount} items. Consider setting require_all_for_final_source to false or adding more items.`);
                    }
                }
                else {
                    // Regular tier calculation
                    if (sourceItemCount < itemsNeededForThisSource) {
                        errors.push(`For MULTI_SOURCE mode, source ${sourceIndex + 1} (${source.source_name}) needs at least ${itemsNeededForThisSource} items for tier ${maxTierForSource} but only has ${sourceItemCount} items.`);
                    }
                }
            });
        }
    }
    return errors;
}
function validateExperienceRequirement(req) {
    const errors = [];
    if (!req.skill || typeof req.skill !== 'string') {
        errors.push('skill is required and must be a string');
    }
    if (!req.experience || typeof req.experience !== 'number' || req.experience < 1) {
        errors.push('experience is required and must be a positive number');
    }
    return errors;
}
function validateBaGamblesRequirement(req) {
    const errors = [];
    if (!req.amount || typeof req.amount !== 'number' || req.amount < 1) {
        errors.push('amount is required and must be a positive number');
    }
    return errors;
}
