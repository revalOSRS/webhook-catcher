/**
 * Migration: Seed Collection Log - Minigames Category (Part 2)
 * 
 * Populates the collection_log_items table with minigame collection log items.
 * This part covers:
 * - Last Man Standing
 * - Magic Training Arena
 * - Mahogany Homes
 * - Mastering Mixology
 * - Pest Control
 * - Rogues' Den
 * - Shades of Mort'ton
 * - Soul Wars
 * - Temple Trekking
 * - Tithe Farm
 * - Trouble Brewing
 * - Vale Totems
 * - Volcanic Mine
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 030_seed_collection_log_minigames_part2');
	
	try {
		const minigameItems = [
			// Last Man Standing (28 items + 4 unlocks = 32)
			{ item_name: "Deadman's chest", category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: "Deadman's legs", category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: "Deadman's cape", category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Armadyl halo', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Bandos halo', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Seren halo', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Ancient halo', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Brassica halo', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Golden armadyl special attack', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Golden bandos special attack', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Golden saradomin special attack', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Golden zamorak special attack', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: "Victor's cape (1)", category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: "Victor's cape (10)", category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: "Victor's cape (50)", category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: "Victor's cape (100)", category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: "Victor's cape (500)", category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: "Victor's cape (1000)", category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Granite clamp', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Ornate maul handle', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Steam staff upgrade kit', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Lava staff upgrade kit', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Dragon pickaxe upgrade kit', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Ward upgrade kit', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Green dark bow paint', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Yellow dark bow paint', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'White dark bow paint', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Blue dark bow paint', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Volcanic whip mix', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Frozen whip mix', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Guthixian icon', category: 'Minigames', subcategory: 'Last Man Standing' },
			{ item_name: 'Swift blade', category: 'Minigames', subcategory: 'Last Man Standing' },
			
			// Magic Training Arena (10 items + 1 unlock)
			{ item_name: 'Beginner wand', category: 'Minigames', subcategory: 'Magic Training Arena' },
			{ item_name: 'Apprentice wand', category: 'Minigames', subcategory: 'Magic Training Arena' },
			{ item_name: 'Teacher wand', category: 'Minigames', subcategory: 'Magic Training Arena' },
			{ item_name: 'Master wand', category: 'Minigames', subcategory: 'Magic Training Arena' },
			{ item_name: 'Infinity hat', category: 'Minigames', subcategory: 'Magic Training Arena' },
			{ item_name: 'Infinity top', category: 'Minigames', subcategory: 'Magic Training Arena' },
			{ item_name: 'Infinity bottoms', category: 'Minigames', subcategory: 'Magic Training Arena' },
			{ item_name: 'Infinity boots', category: 'Minigames', subcategory: 'Magic Training Arena' },
			{ item_name: 'Infinity gloves', category: 'Minigames', subcategory: 'Magic Training Arena' },
			{ item_name: "Mage's book", category: 'Minigames', subcategory: 'Magic Training Arena' },
			{ item_name: 'Bones to peaches', category: 'Minigames', subcategory: 'Magic Training Arena' },
			
			// Mahogany Homes (8 items)
			{ item_name: 'Supply crate', category: 'Minigames', subcategory: 'Mahogany Homes' },
			{ item_name: "Carpenter's helmet", category: 'Minigames', subcategory: 'Mahogany Homes' },
			{ item_name: "Carpenter's shirt", category: 'Minigames', subcategory: 'Mahogany Homes' },
			{ item_name: "Carpenter's trousers", category: 'Minigames', subcategory: 'Mahogany Homes' },
			{ item_name: "Carpenter's boots", category: 'Minigames', subcategory: 'Mahogany Homes' },
			{ item_name: "Amy's saw", category: 'Minigames', subcategory: 'Mahogany Homes' },
			{ item_name: 'Plank sack', category: 'Minigames', subcategory: 'Mahogany Homes' },
			{ item_name: 'Hosidius blueprints', category: 'Minigames', subcategory: 'Mahogany Homes' },
			
			// Mastering Mixology (7 items)
			{ item_name: 'Prescription goggles', category: 'Minigames', subcategory: 'Mastering Mixology' },
			{ item_name: 'Alchemist labcoat', category: 'Minigames', subcategory: 'Mastering Mixology' },
			{ item_name: 'Alchemist pants', category: 'Minigames', subcategory: 'Mastering Mixology' },
			{ item_name: 'Alchemist gloves', category: 'Minigames', subcategory: 'Mastering Mixology' },
			{ item_name: "Alchemist's amulet", category: 'Minigames', subcategory: 'Mastering Mixology' },
			{ item_name: 'Reagent pouch', category: 'Minigames', subcategory: 'Mastering Mixology' },
			{ item_name: 'Chugging barrel (disassembled)', category: 'Minigames', subcategory: 'Mastering Mixology' },
			
			// Pest Control (10 items)
			{ item_name: 'Void knight mace', category: 'Minigames', subcategory: 'Pest Control' },
			{ item_name: 'Void knight top', category: 'Minigames', subcategory: 'Pest Control' },
			{ item_name: 'Void knight robe', category: 'Minigames', subcategory: 'Pest Control' },
			{ item_name: 'Void knight gloves', category: 'Minigames', subcategory: 'Pest Control' },
			{ item_name: 'Void mage helm', category: 'Minigames', subcategory: 'Pest Control' },
			{ item_name: 'Void melee helm', category: 'Minigames', subcategory: 'Pest Control' },
			{ item_name: 'Void ranger helm', category: 'Minigames', subcategory: 'Pest Control' },
			{ item_name: 'Void seal(8)', category: 'Minigames', subcategory: 'Pest Control' },
			{ item_name: 'Elite void top', category: 'Minigames', subcategory: 'Pest Control' },
			{ item_name: 'Elite void robe', category: 'Minigames', subcategory: 'Pest Control' },
			
			// Rogues' Den (5 items)
			{ item_name: 'Rogue mask', category: 'Minigames', subcategory: "Rogues' Den" },
			{ item_name: 'Rogue top', category: 'Minigames', subcategory: "Rogues' Den" },
			{ item_name: 'Rogue trousers', category: 'Minigames', subcategory: "Rogues' Den" },
			{ item_name: 'Rogue boots', category: 'Minigames', subcategory: "Rogues' Den" },
			{ item_name: 'Rogue gloves', category: 'Minigames', subcategory: "Rogues' Den" },
			
			// Shades of Mort'ton (14 items)
			{ item_name: 'Amulet of the damned', category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: 'Flamtaer bag', category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: 'Fine cloth', category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: 'Bronze locks', category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: 'Steel locks', category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: 'Black locks', category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: 'Silver locks', category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: 'Gold locks', category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: "Zealot's helm", category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: "Zealot's robe top", category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: "Zealot's robe bottom", category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: "Zealot's boots", category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: "Tree wizards' journal", category: 'Minigames', subcategory: "Shades of Mort'ton" },
			{ item_name: 'Bloody notes', category: 'Minigames', subcategory: "Shades of Mort'ton" },
			
			// Soul Wars (3 items)
			{ item_name: "Lil' creator", category: 'Minigames', subcategory: 'Soul Wars' },
			{ item_name: 'Soul cape', category: 'Minigames', subcategory: 'Soul Wars' },
			{ item_name: 'Ectoplasmator', category: 'Minigames', subcategory: 'Soul Wars' },
			
			// Temple Trekking (4 items)
			{ item_name: 'Lumberjack hat', category: 'Minigames', subcategory: 'Temple Trekking' },
			{ item_name: 'Lumberjack top', category: 'Minigames', subcategory: 'Temple Trekking' },
			{ item_name: 'Lumberjack legs', category: 'Minigames', subcategory: 'Temple Trekking' },
			{ item_name: 'Lumberjack boots', category: 'Minigames', subcategory: 'Temple Trekking' },
			
			// Tithe Farm (7 items)
			{ item_name: "Farmer's strawhat", category: 'Minigames', subcategory: 'Tithe Farm' },
			{ item_name: "Farmer's jacket", category: 'Minigames', subcategory: 'Tithe Farm' },
			{ item_name: "Farmer's boro trousers", category: 'Minigames', subcategory: 'Tithe Farm' },
			{ item_name: "Farmer's boots", category: 'Minigames', subcategory: 'Tithe Farm' },
			{ item_name: 'Seed box', category: 'Minigames', subcategory: 'Tithe Farm' },
			{ item_name: "Gricoller's can", category: 'Minigames', subcategory: 'Tithe Farm' },
			{ item_name: 'Herb sack', category: 'Minigames', subcategory: 'Tithe Farm' },
			
			// Trouble Brewing (30 items)
			{ item_name: 'Blue naval shirt', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Blue tricorn hat', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Blue navy slacks', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Green naval shirt', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Green tricorn hat', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Green navy slacks', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Red naval shirt', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Red tricorn hat', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Red navy slacks', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Brown naval shirt', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Brown tricorn hat', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Brown navy slacks', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Black naval shirt', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Black tricorn hat', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Black navy slacks', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Purple naval shirt', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Purple tricorn hat', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Purple navy slacks', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Grey naval shirt', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Grey tricorn hat', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Grey navy slacks', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Cutthroat flag', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Gilded smile flag', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Bronze fist flag', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Lucky shot flag', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Treasure flag', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Phasmatys flag', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'The stuff', category: 'Minigames', subcategory: 'Trouble Brewing' },
			{ item_name: 'Rum', category: 'Minigames', subcategory: 'Trouble Brewing' },
			
			// Vale Totems (4 items)
			{ item_name: 'Fletching knife', category: 'Minigames', subcategory: 'Vale Totems' },
			{ item_name: 'Bow string spool', category: 'Minigames', subcategory: 'Vale Totems' },
			{ item_name: 'Ent branch', category: 'Minigames', subcategory: 'Vale Totems' },
			{ item_name: 'Greenman mask', category: 'Minigames', subcategory: 'Vale Totems' },
			
			// Volcanic Mine (7 items + 1 unlock)
			{ item_name: 'Ash covered tome', category: 'Minigames', subcategory: 'Volcanic Mine' },
			{ item_name: 'Large water container', category: 'Minigames', subcategory: 'Volcanic Mine' },
			{ item_name: 'Volcanic mine teleport', category: 'Minigames', subcategory: 'Volcanic Mine' },
			{ item_name: 'Dragon pickaxe (broken)', category: 'Minigames', subcategory: 'Volcanic Mine' },
			{ item_name: 'Prospector helmet', category: 'Minigames', subcategory: 'Volcanic Mine' },
			{ item_name: 'Prospector jacket', category: 'Minigames', subcategory: 'Volcanic Mine' },
			{ item_name: 'Prospector legs', category: 'Minigames', subcategory: 'Volcanic Mine' },
			{ item_name: 'Prospector boots', category: 'Minigames', subcategory: 'Volcanic Mine' },
		];
		
		console.log('Inserting minigame items (Part 2)...');
		console.log(`Total items: ${minigameItems.length}`);
		
		for (const item of minigameItems) {
			await db.query(`
				INSERT INTO collection_log_items (item_name, category, subcategory)
				VALUES ($1, $2, $3)
				ON CONFLICT (item_name, subcategory) DO NOTHING
			`, [item.item_name, item.category, item.subcategory]);
		}
		
		console.log(`✅ Seeded ${minigameItems.length} minigame items (Part 2)`);
		console.log('✅ Migration 030_seed_collection_log_minigames_part2 completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 030_seed_collection_log_minigames_part2 failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 030_seed_collection_log_minigames_part2');
	
	try {
		await db.query(`
			DELETE FROM collection_log_items 
			WHERE category = 'Minigames' 
			AND subcategory IN (
				'Last Man Standing',
				'Magic Training Arena',
				'Mahogany Homes',
				'Mastering Mixology',
				'Pest Control',
				'Rogues'' Den',
				'Shades of Mort''ton',
				'Soul Wars',
				'Temple Trekking',
				'Tithe Farm',
				'Trouble Brewing',
				'Vale Totems',
				'Volcanic Mine'
			)
		`);
		console.log('✅ Removed minigame items (Part 2)');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

