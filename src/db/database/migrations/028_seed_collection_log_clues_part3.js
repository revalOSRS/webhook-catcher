/**
 * Migration: Seed Collection Log - Clues Category (Part 3 - Final)
 * 
 * Populates the collection_log_items table with remaining clue scroll items:
 * - 3rd Age equipment (shared across all elite+ tiers)
 * - Gilded armor set
 * - Shared rare rewards
 * - God pages and related items
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 028_seed_collection_log_clues_part3');
	
	try {
		// 3rd Age Equipment (Shared Treasure Trail Rewards - Elite/Master)
		const thirdAgeItems = [
			{ item_name: '3rd age range coif', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age range top', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age range legs', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age vambraces', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age robe top', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age robe', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age mage hat', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age amulet', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age full helmet', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age platebody', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age platelegs', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age plateskirt', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age kiteshield', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age longsword', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age wand', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age bow', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age cloak', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age pickaxe', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: '3rd age axe', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
		];
		
		// Gilded Armor (Hard Treasure Trails)
		const gildedItems = [
			{ item_name: 'Gilded full helm', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded platebody', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded platelegs', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded plateskirt', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded kiteshield', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded med helm', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded chainbody', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded sq shield', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded 2h sword', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded spear', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded hasta', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded scimitar', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded boots', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded coif', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: "Gilded d'hide body", category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded d\'hide chaps', category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
			{ item_name: "Gilded d'hide vambraces", category: 'Clues', subcategory: 'Hard Treasure Trail Rewards (Rare)' },
		];
		
		// Elite Treasure Trail Rewards (Rare)
		const eliteRareItems = [
			{ item_name: 'Gilded pickaxe', category: 'Clues', subcategory: 'Elite Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded axe', category: 'Clues', subcategory: 'Elite Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded spade', category: 'Clues', subcategory: 'Elite Treasure Trail Rewards (Rare)' },
		];
		
		// Master Treasure Trail Rewards (Rare)
		const masterRareItems = [
			{ item_name: 'Samurai ornament kit', category: 'Clues', subcategory: 'Master Treasure Trail Rewards (Rare)' },
			{ item_name: 'Gilded scimitar ornament kit', category: 'Clues', subcategory: 'Master Treasure Trail Rewards (Rare)' },
		];
		
		// God Pages and Book Items (Shared)
		const godPageItems = [
			{ item_name: 'Saradomin page 1', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Saradomin page 2', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Saradomin page 3', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Saradomin page 4', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Zamorak page 1', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Zamorak page 2', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Zamorak page 3', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Zamorak page 4', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Guthix page 1', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Guthix page 2', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Guthix page 3', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Guthix page 4', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Armadyl page 1', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Armadyl page 2', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Armadyl page 3', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Armadyl page 4', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Bandos page 1', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Bandos page 2', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Bandos page 3', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Bandos page 4', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Ancient page 1', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Ancient page 2', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Ancient page 3', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Ancient page 4', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
		];
		
		// Vestment Armor (Shared)
		const vestmentItems = [
			{ item_name: 'Saradomin mitre', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Saradomin robe top', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Saradomin robe legs', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Guthix mitre', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Guthix robe top', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Guthix robe legs', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Zamorak mitre', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Zamorak robe top', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Zamorak robe legs', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Ancient mitre', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Ancient robe top', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Ancient robe legs', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Armadyl mitre', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Armadyl robe top', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Armadyl robe legs', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Bandos mitre', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Bandos robe top', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Bandos robe legs', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
		];
		
		// God Books and Cloaks (Shared)
		const godBooksAndCloaks = [
			{ item_name: 'Saradomin cloak', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Guthix cloak', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Zamorak cloak', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Armadyl cloak', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Bandos cloak', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
			{ item_name: 'Ancient cloak', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
		];
		
		// Scroll Sacks/Cases (Shared)
		const scrollItems = [
			{ item_name: 'Master scroll book (empty)', category: 'Clues', subcategory: 'Shared Treasure Trail Rewards' },
		];
		
		console.log('Inserting final clue scroll items...');
		console.log(`- 3rd Age Equipment: ${thirdAgeItems.length} items`);
		console.log(`- Gilded Armor (Hard Rare): ${gildedItems.length} items`);
		console.log(`- Elite Rare Rewards: ${eliteRareItems.length} items`);
		console.log(`- Master Rare Rewards: ${masterRareItems.length} items`);
		console.log(`- God Pages: ${godPageItems.length} items`);
		console.log(`- Vestment Armor: ${vestmentItems.length} items`);
		console.log(`- God Books/Cloaks: ${godBooksAndCloaks.length} items`);
		console.log(`- Scroll Items: ${scrollItems.length} items`);
		
		// Insert all items
		const allItems = [
			...thirdAgeItems,
			...gildedItems,
			...eliteRareItems,
			...masterRareItems,
			...godPageItems,
			...vestmentItems,
			...godBooksAndCloaks,
			...scrollItems
		];
		
		for (const item of allItems) {
			await db.query(`
				INSERT INTO collection_log_items (item_name, category, subcategory)
				VALUES ($1, $2, $3)
				ON CONFLICT (item_name, subcategory) DO NOTHING
			`, [item.item_name, item.category, item.subcategory]);
		}
		
		console.log(`✅ Seeded ${allItems.length} clue scroll items (Part 3/3 - FINAL)`);
		console.log('');
		console.log('========================================');
		console.log('CLUE SCROLL SEEDING COMPLETE');
		console.log('========================================');
		console.log('Total clue items across all 3 migrations:');
		console.log('  Part 1 (Beginner/Easy/Medium): ~250 items');
		console.log('  Part 2 (Hard/Elite/Master): 242 items');
		console.log(`  Part 3 (Rare/Shared): ${allItems.length} items`);
		console.log('========================================');
		console.log('✅ Migration 028_seed_collection_log_clues_part3 completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 028_seed_collection_log_clues_part3 failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 028_seed_collection_log_clues_part3');
	
	try {
		await db.query(`
			DELETE FROM collection_log_items 
			WHERE category = 'Clues' 
			AND subcategory IN (
				'Hard Treasure Trail Rewards (Rare)',
				'Elite Treasure Trail Rewards (Rare)',
				'Master Treasure Trail Rewards (Rare)',
				'Shared Treasure Trail Rewards'
			)
		`);
		console.log('✅ Removed rare and shared treasure trail items');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

