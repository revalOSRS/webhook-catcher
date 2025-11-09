/**
 * Migration: Add unique member code to members table
 * Created: 2025-10-19
 * 
 * Adds a unique 9-digit code to identify each member
 * Format: xxx-xxx-xxx (stored as integer)
 */

const { query } = require('../index');

/**
 * Generate a random 9-digit number
 * Range: 100000000 to 999999999
 */
function generateMemberCode() {
	return Math.floor(100000000 + Math.random() * 900000000);
}

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 008_add_member_code');

	// Add member_code column to members table
	console.log('  - Adding member_code column to members table...');
	await query(`
		ALTER TABLE members 
		ADD COLUMN IF NOT EXISTS member_code INTEGER UNIQUE
	`);

	// Get all existing members
	console.log('  - Generating unique codes for existing members...');
	const existingMembers = await query(`SELECT id FROM members WHERE member_code IS NULL`);
	
	if (existingMembers.length > 0) {
		console.log(`  - Found ${existingMembers.length} members without codes`);
		
		// Generate unique codes for each member
		for (const member of existingMembers) {
			let codeGenerated = false;
			let attempts = 0;
			const maxAttempts = 10;
			
			while (!codeGenerated && attempts < maxAttempts) {
				try {
					const code = generateMemberCode();
					await query(`UPDATE members SET member_code = $1 WHERE id = $2`, [code, member.id]);
					codeGenerated = true;
				} catch (error) {
					// If unique constraint fails, try again with a new code
					if (error.code === '23505') { // Unique violation
						attempts++;
						continue;
					}
					throw error;
				}
			}
			
			if (!codeGenerated) {
				throw new Error(`Failed to generate unique code for member ${member.id} after ${maxAttempts} attempts`);
			}
		}
		
		console.log(`  - Successfully assigned codes to ${existingMembers.length} members`);
	} else {
		console.log('  - No members need code assignment');
	}

	// Make member_code NOT NULL now that all members have codes
	console.log('  - Setting member_code as NOT NULL...');
	await query(`
		ALTER TABLE members 
		ALTER COLUMN member_code SET NOT NULL
	`);

	// Create index for performance
	console.log('  - Creating index on member_code...');
	await query(`CREATE INDEX IF NOT EXISTS idx_members_code ON members(member_code)`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 008_add_member_code');

	// Drop index
	await query(`DROP INDEX IF EXISTS idx_members_code`);

	// Drop column
	await query(`ALTER TABLE members DROP COLUMN IF EXISTS member_code`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

