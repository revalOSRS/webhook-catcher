/**
 * Migration: Normalize Tile Progress Metadata
 * 
 * Transforms progress_metadata from the old format (where requirement data 
 * was at the top level) to the new format (where all data goes through 
 * requirementProgress map).
 * 
 * Old format:
 * {
 *   requirementType: "ITEM_DROP",
 *   currentTotalCount: 1,
 *   playerContributions: [...],
 *   totalRequirements: 1,
 *   completedRequirementIndices: [0],
 *   requirementProgress: { "0": {...} }
 * }
 * 
 * New format:
 * {
 *   totalRequirements: 1,
 *   completedRequirementIndices: [0],
 *   requirementProgress: {
 *     "0": {
 *       isCompleted: true,
 *       progressValue: 1,
 *       progressMetadata: {
 *         requirementType: "ITEM_DROP",
 *         currentTotalCount: 1,
 *         playerContributions: [...]
 *       }
 *     }
 *   }
 * }
 */

exports.up = async function(sql) {
  // Get all tile progress records that need updating
  const records = await sql`
    SELECT id, progress_value, progress_metadata, completion_type, completed_at
    FROM bingo_tile_progress
    WHERE progress_metadata IS NOT NULL 
      AND progress_metadata != '{}'::jsonb
      AND progress_metadata->>'manualCompletion' IS NULL
      AND progress_metadata->>'manual_completion' IS NULL
  `;

  console.log(`Found ${records.length} records to migrate`);

  for (const record of records) {
    const oldMeta = record.progress_metadata;
    
    // Skip if already in new format (has requirementProgress but no requirementType at top level)
    if (oldMeta.requirementProgress && !oldMeta.requirementType) {
      continue;
    }

    // Skip if no requirementType (invalid data)
    if (!oldMeta.requirementType) {
      console.log(`Skipping record ${record.id}: no requirementType`);
      continue;
    }

    // Extract tile-level fields
    const totalRequirements = oldMeta.totalRequirements || 1;
    const completedRequirementIndices = oldMeta.completedRequirementIndices || [];
    const oldRequirementProgress = oldMeta.requirementProgress || {};

    // Build requirement-level data (remove tile-level fields)
    const requirementData = { ...oldMeta };
    delete requirementData.totalRequirements;
    delete requirementData.completedRequirementIndices;
    delete requirementData.requirementProgress;

    // Build new requirementProgress map
    const newRequirementProgress = {};
    
    // If there's existing requirementProgress, migrate each entry
    if (Object.keys(oldRequirementProgress).length > 0) {
      for (const [index, entry] of Object.entries(oldRequirementProgress)) {
        newRequirementProgress[index] = entry;
      }
    }
    
    // Ensure requirement 0 exists with the main data
    if (!newRequirementProgress["0"]) {
      newRequirementProgress["0"] = {
        isCompleted: record.completed_at !== null,
        progressValue: parseFloat(record.progress_value) || 0,
        progressMetadata: requirementData
      };
    } else if (!newRequirementProgress["0"].progressMetadata?.requirementType) {
      // If entry exists but has no proper progressMetadata, update it
      newRequirementProgress["0"].progressMetadata = requirementData;
    }

    // Build new metadata
    const newMeta = {
      totalRequirements,
      completedRequirementIndices,
      requirementProgress: newRequirementProgress
    };

    // Update the record
    await sql`
      UPDATE bingo_tile_progress
      SET progress_metadata = ${JSON.stringify(newMeta)}::jsonb
      WHERE id = ${record.id}
    `;
  }

  console.log('Migration complete');
};

exports.down = async function(sql) {
  // This migration is one-way - reverting would require the original data
  console.log('No rollback for this migration - data transformation is one-way');
};

