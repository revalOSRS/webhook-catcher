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
export const validateRequirement = (requirement) => {
    try {
        // Check if it's the new simplified format
        if (requirement && typeof requirement === 'object' && 'matchType' in requirement) {
            return validateSimplifiedRequirements(requirement);
        }
        // If it doesn't match the new format, return error
        return {
            valid: false,
            errors: ['Invalid requirement format. Must use simplified format with matchType and requirements/tiers.']
        };
    }
    catch (error) {
        return {
            valid: false,
            errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
    }
};
/**
 * Validate the simplified requirement structure
 */
export const validateSimplifiedRequirements = (requirements) => {
    const errors = [];
    // Validate matchType
    if (!requirements.matchType || !['all', 'any'].includes(requirements.matchType)) {
        errors.push('matchType must be "all" or "any"');
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
            errors.push('requirements array cannot be empty when no tiers are provided');
        }
        else if (requirements.requirements.length > 0) {
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
};
/**
 * Validate a single simplified requirement
 */
const validateSimplifiedRequirement = (requirement) => {
    const errors = [];
    if (!requirement || typeof requirement !== 'object') {
        return { valid: false, errors: ['Requirement must be an object'] };
    }
    if (!requirement.type) {
        errors.push('Requirement must have a type field');
    }
    else {
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
};
const validateItemDropRequirement = (req) => {
    const errors = [];
    if (!req.items || !Array.isArray(req.items)) {
        errors.push('items is required and must be an array');
    }
    else if (req.items.length === 0) {
        errors.push('items array cannot be empty');
    }
    else {
        req.items.forEach((item, index) => {
            if (!item.itemName || typeof item.itemName !== 'string') {
                errors.push(`items[${index}].itemName is required and must be a string`);
            }
            if (item.itemId === undefined || typeof item.itemId !== 'number' || item.itemId < 0) {
                errors.push(`items[${index}].itemId is required and must be a non-negative number`);
            }
            if (item.itemAmount !== undefined && (typeof item.itemAmount !== 'number' || item.itemAmount < 1)) {
                errors.push(`items[${index}].itemAmount must be a positive number if provided`);
            }
        });
    }
    if (req.totalAmount !== undefined) {
        if (typeof req.totalAmount !== 'number' || req.totalAmount < 1) {
            errors.push('totalAmount must be a positive number if provided');
        }
    }
    return errors;
};
const validatePetRequirement = (req) => {
    const errors = [];
    if (!req.petName || typeof req.petName !== 'string') {
        errors.push('petName is required and must be a string');
    }
    if (!req.amount || typeof req.amount !== 'number' || req.amount < 1) {
        errors.push('amount is required and must be a positive number');
    }
    return errors;
};
const validateValueDropRequirement = (req) => {
    const errors = [];
    if (!req.value || typeof req.value !== 'number' || req.value < 1) {
        errors.push('value is required and must be a positive number');
    }
    return errors;
};
const validateSpeedrunRequirement = (req) => {
    const errors = [];
    if (!req.location || typeof req.location !== 'string') {
        errors.push('location is required and must be a string');
    }
    if (!req.goalSeconds || typeof req.goalSeconds !== 'number' || req.goalSeconds < 1) {
        errors.push('goalSeconds is required and must be a positive number');
    }
    if (req.itemAmount !== undefined) {
        errors.push('SPEEDRUN requirement does not support itemAmount field');
    }
    return errors;
};
const validateExperienceRequirement = (req) => {
    const errors = [];
    if (!req.skill || typeof req.skill !== 'string') {
        errors.push('skill is required and must be a string');
    }
    if (!req.experience || typeof req.experience !== 'number' || req.experience < 1) {
        errors.push('experience is required and must be a positive number');
    }
    return errors;
};
const validateBaGamblesRequirement = (req) => {
    const errors = [];
    if (!req.amount || typeof req.amount !== 'number' || req.amount < 1) {
        errors.push('amount is required and must be a positive number');
    }
    return errors;
};
