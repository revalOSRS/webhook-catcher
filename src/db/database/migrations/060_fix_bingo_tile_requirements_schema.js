/**
 * Migration: Fix Bingo Tile Requirements Schema
 * 
 * This migration updates the requirements JSONB in bingo_tiles to:
 * 1. Convert all snake_case keys to camelCase
 * 2. Normalize ITEM_DROP requirements to use the items array format
 * 3. Remove or convert invalid requirement types (UNIQUE_COLLECTION)
 */

const { query } = require('../index');

/**
 * Convert snake_case to camelCase
 */
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Recursively convert all object keys from snake_case to camelCase
 */
const convertKeysToCamelCase = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item));
  }

  if (typeof obj === 'object') {
    const converted = {};
    for (const key of Object.keys(obj)) {
      const camelKey = toCamelCase(key);
      converted[camelKey] = convertKeysToCamelCase(obj[key]);
    }
    return converted;
  }

  return obj;
};

/**
 * Normalize a single requirement to the new format
 */
const normalizeRequirement = (req) => {
  if (!req || !req.type) return req;

  switch (req.type) {
    case 'ITEM_DROP':
      // If it has flat item_id/itemId, convert to items array format
      if (req.itemId || req.item_id) {
        return {
          type: 'ITEM_DROP',
          items: [{
            itemId: req.itemId || req.item_id,
            itemName: req.itemName || req.item_name,
            itemAmount: req.itemAmount || req.item_amount
          }],
          totalAmount: req.totalAmount || req.total_amount
        };
      }
      // Already has items array, just ensure camelCase
      if (req.items) {
        return {
          type: 'ITEM_DROP',
          items: req.items.map(item => ({
            itemId: item.itemId || item.item_id,
            itemName: item.itemName || item.item_name,
            itemAmount: item.itemAmount || item.item_amount
          })),
          totalAmount: req.totalAmount || req.total_amount
        };
      }
      return req;

    case 'PET':
      return {
        type: 'PET',
        petName: req.petName || req.pet_name,
        amount: req.amount || 1
      };

    case 'VALUE_DROP':
      return {
        type: 'VALUE_DROP',
        value: req.value
      };

    case 'SPEEDRUN':
      return {
        type: 'SPEEDRUN',
        location: req.location,
        goalSeconds: req.goalSeconds || req.goal_seconds
      };

    case 'EXPERIENCE':
      return {
        type: 'EXPERIENCE',
        skill: req.skill,
        experience: req.experience
      };

    case 'BA_GAMBLES':
      return {
        type: 'BA_GAMBLES',
        amount: req.amount
      };

    case 'UNIQUE_COLLECTION':
      // This type doesn't exist in our schema - convert to multiple ITEM_DROP requirements
      // For now, we'll mark it as invalid and skip
      console.log('⚠️ Found UNIQUE_COLLECTION type - this tile needs manual review');
      return null;

    default:
      return req;
  }
};

/**
 * Normalize the full requirements object
 */
const normalizeRequirements = (requirements) => {
  if (!requirements) return requirements;

  const normalized = {
    matchType: requirements.matchType || requirements.match_type || 'all',
    requirements: []
  };

  // Process regular requirements
  if (requirements.requirements && Array.isArray(requirements.requirements)) {
    normalized.requirements = requirements.requirements
      .map(normalizeRequirement)
      .filter(req => req !== null);
  }

  // Process tiers
  if (requirements.tiers && Array.isArray(requirements.tiers)) {
    normalized.tiers = requirements.tiers.map(tier => ({
      tier: tier.tier,
      points: tier.points,
      requirement: normalizeRequirement(tier.requirement)
    })).filter(tier => tier.requirement !== null);
  }

  return normalized;
};

const up = async () => {
  console.log('Fixing bingo tile requirements schema...');

  // Get all tiles
  const tiles = await query('SELECT id, requirements FROM bingo_tiles');
  console.log(`Found ${tiles.length} tiles to process`);

  let updatedCount = 0;
  let errorCount = 0;
  const problemTiles = [];

  for (const tile of tiles) {
    try {
      const oldReqs = tile.requirements;
      if (!oldReqs) continue;

      // Normalize the requirements
      const newReqs = normalizeRequirements(oldReqs);

      // Check if anything changed
      const oldJson = JSON.stringify(oldReqs);
      const newJson = JSON.stringify(newReqs);

      if (oldJson !== newJson) {
        await query(
          'UPDATE bingo_tiles SET requirements = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [JSON.stringify(newReqs), tile.id]
        );
        updatedCount++;
        console.log(`✅ Updated tile: ${tile.id}`);
      }
    } catch (error) {
      console.error(`❌ Error processing tile ${tile.id}:`, error.message);
      errorCount++;
      problemTiles.push(tile.id);
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   Total tiles: ${tiles.length}`);
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (problemTiles.length > 0) {
    console.log(`   Problem tiles: ${problemTiles.join(', ')}`);
  }

  console.log('✅ Bingo tile requirements schema fixed');
};

const down = async () => {
  // This migration cannot be easily reversed as we're normalizing data
  // The old format would need to be stored somewhere to revert
  console.log('⚠️ This migration cannot be reversed automatically.');
  console.log('   The old requirements format is not stored.');
};

module.exports = { up, down };

