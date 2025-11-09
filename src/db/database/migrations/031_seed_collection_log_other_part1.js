/**
 * Migration: Seed Collection Log - Other Category (Part 1)
 * 
 * Populates the collection_log_items table with "Other" category collection log items.
 * This part covers:
 * - Aerial Fishing
 * - All Pets
 * - Boat Paints
 * - Camdozaal
 * - Champion's Challenge
 * - Chompy Bird Hunting
 * - Colossal Wyrm Agility
 * - Creature Creation
 * - Cyclopes
 * - Elder Chaos Druids
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 031_seed_collection_log_other_part1');
	
	try {
		const otherItems = [
			// Aerial Fishing (9 items)
			{ item_name: 'Golden tench', category: 'Other', subcategory: 'Aerial Fishing' },
			{ item_name: 'Pearl fishing rod', category: 'Other', subcategory: 'Aerial Fishing' },
			{ item_name: 'Pearl fly fishing rod', category: 'Other', subcategory: 'Aerial Fishing' },
			{ item_name: 'Pearl barbarian rod', category: 'Other', subcategory: 'Aerial Fishing' },
			{ item_name: 'Fish sack', category: 'Other', subcategory: 'Aerial Fishing' },
			{ item_name: 'Angler hat', category: 'Other', subcategory: 'Aerial Fishing' },
			{ item_name: 'Angler top', category: 'Other', subcategory: 'Aerial Fishing' },
			{ item_name: 'Angler waders', category: 'Other', subcategory: 'Aerial Fishing' },
			{ item_name: 'Angler boots', category: 'Other', subcategory: 'Aerial Fishing' },
			
			// All Pets (67 items)
			{ item_name: 'Abyssal orphan', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Ikkle hydra', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Callisto cub', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Hellpuppy', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Pet chaos elemental', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Pet zilyana', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Pet dark core', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Pet dagannoth prime', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Pet dagannoth supreme', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Pet dagannoth rex', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Tzrek-jad', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Pet general graardor', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Baby mole', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Noon', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Jal-nib-rek', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Kalphite princess', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Prince black dragon', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Pet kraken', category: 'Other', subcategory: 'All Pets' },
			{ item_name: "Pet kree'arra", category: 'Other', subcategory: 'All Pets' },
			{ item_name: "Pet k'ril tsutsaroth", category: 'Other', subcategory: 'All Pets' },
			{ item_name: "Scorpia's offspring", category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Skotos', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Pet smoke devil', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Venenatis spiderling', category: 'Other', subcategory: 'All Pets' },
			{ item_name: "Vet'ion jr.", category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Vorki', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Phoenix', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Pet snakeling', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Olmlet', category: 'Other', subcategory: 'All Pets' },
			{ item_name: "Lil' zik", category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Bloodhound', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Pet penance queen', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Heron', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Rock golem', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Beaver', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Baby chinchompa', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Giant squirrel', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Tangleroot', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Rocky', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Rift guardian', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Herbi', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Chompy chick', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Sraracha', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Smolcano', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Youngllef', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Little nightmare', category: 'Other', subcategory: 'All Pets' },
			{ item_name: "Lil' creator", category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Tiny tempor', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Nexling', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Abyssal protector', category: 'Other', subcategory: 'All Pets' },
			{ item_name: "Tumeken's guardian", category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Muphin', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Wisp', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Baron', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Butch', category: 'Other', subcategory: 'All Pets' },
			{ item_name: "Lil'viathan", category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Scurry', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Smol heredit', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Quetzin', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Nid', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Huberte', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Moxi', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Bran', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Yami', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Dom', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Soup', category: 'Other', subcategory: 'All Pets' },
			{ item_name: 'Gull', category: 'Other', subcategory: 'All Pets' },
			
			// Boat Paints (11 items)
			{ item_name: 'Barracuda paint', category: 'Other', subcategory: 'Boat Paints' },
			{ item_name: 'Shark paint', category: 'Other', subcategory: 'Boat Paints' },
			{ item_name: 'Inky paint', category: 'Other', subcategory: 'Boat Paints' },
			{ item_name: "Angler's paint", category: 'Other', subcategory: 'Boat Paints' },
			{ item_name: "Salvor's paint", category: 'Other', subcategory: 'Boat Paints' },
			{ item_name: 'Armadylean paint', category: 'Other', subcategory: 'Boat Paints' },
			{ item_name: 'Zamorakian paint', category: 'Other', subcategory: 'Boat Paints' },
			{ item_name: 'Guthixian paint', category: 'Other', subcategory: 'Boat Paints' },
			{ item_name: 'Saradominist paint', category: 'Other', subcategory: 'Boat Paints' },
			{ item_name: "Merchant's paint", category: 'Other', subcategory: 'Boat Paints' },
			{ item_name: 'Sandy paint', category: 'Other', subcategory: 'Boat Paints' },
			
			// Camdozaal (10 items)
			{ item_name: 'Barronite mace', category: 'Other', subcategory: 'Camdozaal' },
			{ item_name: 'Barronite head', category: 'Other', subcategory: 'Camdozaal' },
			{ item_name: 'Barronite handle', category: 'Other', subcategory: 'Camdozaal' },
			{ item_name: 'Barronite guard', category: 'Other', subcategory: 'Camdozaal' },
			{ item_name: 'Ancient globe', category: 'Other', subcategory: 'Camdozaal' },
			{ item_name: 'Ancient ledger', category: 'Other', subcategory: 'Camdozaal' },
			{ item_name: 'Ancient astroscope', category: 'Other', subcategory: 'Camdozaal' },
			{ item_name: 'Ancient treatise', category: 'Other', subcategory: 'Camdozaal' },
			{ item_name: 'Ancient carcanet', category: 'Other', subcategory: 'Camdozaal' },
			{ item_name: 'Imcando hammer', category: 'Other', subcategory: 'Camdozaal' },
			
			// Champion's Challenge (11 items)
			{ item_name: 'Earth warrior champion scroll', category: 'Other', subcategory: "Champion's Challenge" },
			{ item_name: 'Ghoul champion scroll', category: 'Other', subcategory: "Champion's Challenge" },
			{ item_name: 'Giant champion scroll', category: 'Other', subcategory: "Champion's Challenge" },
			{ item_name: 'Goblin champion scroll', category: 'Other', subcategory: "Champion's Challenge" },
			{ item_name: 'Hobgoblin champion scroll', category: 'Other', subcategory: "Champion's Challenge" },
			{ item_name: 'Imp champion scroll', category: 'Other', subcategory: "Champion's Challenge" },
			{ item_name: 'Jogre champion scroll', category: 'Other', subcategory: "Champion's Challenge" },
			{ item_name: 'Lesser demon champion scroll', category: 'Other', subcategory: "Champion's Challenge" },
			{ item_name: 'Skeleton champion scroll', category: 'Other', subcategory: "Champion's Challenge" },
			{ item_name: 'Zombie champion scroll', category: 'Other', subcategory: "Champion's Challenge" },
			{ item_name: "Champion's cape", category: 'Other', subcategory: "Champion's Challenge" },
			
			// Chompy Bird Hunting (19 items)
			{ item_name: 'Chompy chick', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (ogre bowman)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (bowman)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (ogre yeoman)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (yeoman)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (ogre marksman)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (marksman)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (ogre woodsman)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (woodsman)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (ogre forester)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (forester)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (ogre bowmaster)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (bowmaster)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (ogre expert)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (expert)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (ogre dragon archer)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (dragon archer)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (expert ogre dragon archer)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			{ item_name: 'Chompy bird hat (expert dragon archer)', category: 'Other', subcategory: 'Chompy Bird Hunting' },
			
			// Colossal Wyrm Agility (8 items)
			{ item_name: 'Colossal wyrm teleport scroll', category: 'Other', subcategory: 'Colossal Wyrm Agility' },
			{ item_name: 'Calcified acorn', category: 'Other', subcategory: 'Colossal Wyrm Agility' },
			{ item_name: 'Graceful hood', category: 'Other', subcategory: 'Colossal Wyrm Agility' },
			{ item_name: 'Graceful top', category: 'Other', subcategory: 'Colossal Wyrm Agility' },
			{ item_name: 'Graceful legs', category: 'Other', subcategory: 'Colossal Wyrm Agility' },
			{ item_name: 'Graceful gloves', category: 'Other', subcategory: 'Colossal Wyrm Agility' },
			{ item_name: 'Graceful boots', category: 'Other', subcategory: 'Colossal Wyrm Agility' },
			{ item_name: 'Graceful cape', category: 'Other', subcategory: 'Colossal Wyrm Agility' },
			
			// Creature Creation (7 items)
			{ item_name: 'Tea flask', category: 'Other', subcategory: 'Creature Creation' },
			{ item_name: 'Plain satchel', category: 'Other', subcategory: 'Creature Creation' },
			{ item_name: 'Green satchel', category: 'Other', subcategory: 'Creature Creation' },
			{ item_name: 'Red satchel', category: 'Other', subcategory: 'Creature Creation' },
			{ item_name: 'Black satchel', category: 'Other', subcategory: 'Creature Creation' },
			{ item_name: 'Gold satchel', category: 'Other', subcategory: 'Creature Creation' },
			{ item_name: 'Rune satchel', category: 'Other', subcategory: 'Creature Creation' },
			
			// Cyclopes (8 items)
			{ item_name: 'Bronze defender', category: 'Other', subcategory: 'Cyclopes' },
			{ item_name: 'Iron defender', category: 'Other', subcategory: 'Cyclopes' },
			{ item_name: 'Steel defender', category: 'Other', subcategory: 'Cyclopes' },
			{ item_name: 'Black defender', category: 'Other', subcategory: 'Cyclopes' },
			{ item_name: 'Mithril defender', category: 'Other', subcategory: 'Cyclopes' },
			{ item_name: 'Adamant defender', category: 'Other', subcategory: 'Cyclopes' },
			{ item_name: 'Rune defender', category: 'Other', subcategory: 'Cyclopes' },
			{ item_name: 'Dragon defender', category: 'Other', subcategory: 'Cyclopes' },
			
			// Elder Chaos Druids (3 items)
			{ item_name: 'Elder chaos top', category: 'Other', subcategory: 'Elder Chaos Druids' },
			{ item_name: 'Elder chaos robe', category: 'Other', subcategory: 'Elder Chaos Druids' },
			{ item_name: 'Elder chaos hood', category: 'Other', subcategory: 'Elder Chaos Druids' },
		];
		
		console.log('Inserting "Other" category items (Part 1)...');
		console.log(`Total items: ${otherItems.length}`);
		
		for (const item of otherItems) {
			await db.query(`
				INSERT INTO collection_log_items (item_name, category, subcategory)
				VALUES ($1, $2, $3)
				ON CONFLICT (item_name, subcategory) DO NOTHING
			`, [item.item_name, item.category, item.subcategory]);
		}
		
		console.log(`✅ Seeded ${otherItems.length} "Other" category items (Part 1)`);
		console.log('✅ Migration 031_seed_collection_log_other_part1 completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 031_seed_collection_log_other_part1 failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 031_seed_collection_log_other_part1');
	
	try {
		await db.query(`
			DELETE FROM collection_log_items 
			WHERE category = 'Other' 
			AND subcategory IN (
				'Aerial Fishing',
				'All Pets',
				'Boat Paints',
				'Camdozaal',
				'Champion''s Challenge',
				'Chompy Bird Hunting',
				'Colossal Wyrm Agility',
				'Creature Creation',
				'Cyclopes',
				'Elder Chaos Druids'
			)
		`);
		console.log('✅ Removed "Other" category items (Part 1)');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

