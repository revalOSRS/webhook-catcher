/**
 * Migration: Seed Collection Log - Raids Category
 * 
 * Populates the collection_log_items table with all raid collection log items.
 * This serves as a reference table for validation and metadata purposes.
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 025_seed_collection_log_raids');
	
	try {
		// Collection log items for Raids category
		const raidItems = [
			// Chambers of Xeric (23 items)
			{ item_name: 'Olmlet', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Metamorphic dust', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Twisted bow', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Elder maul', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Kodai insignia', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Dragon claws', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Ancestral hat', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Ancestral robe top', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Ancestral robe bottom', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: "Dinh's bulwark", category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Dexterous prayer scroll', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Arcane prayer scroll', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Dragon hunter crossbow', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Twisted buckler', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Torn prayer scroll', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Dark relic', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Onyx', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: 'Twisted ancestral colour kit', category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: "Xeric's guard", category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: "Xeric's warrior", category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: "Xeric's sentinel", category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: "Xeric's general", category: 'Raids', subcategory: 'Chambers of Xeric' },
			{ item_name: "Xeric's champion", category: 'Raids', subcategory: 'Chambers of Xeric' },
			
			// Theatre of Blood (17 items)
			{ item_name: "Lil' zik", category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Scythe of vitur (uncharged)', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Ghrazi rapier', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Sanguinesti staff (uncharged)', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Justiciar faceguard', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Justiciar chestguard', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Justiciar legguards', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Avernic defender hilt', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Vial of blood', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Sinhaza shroud tier 1', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Sinhaza shroud tier 2', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Sinhaza shroud tier 3', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Sinhaza shroud tier 4', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Sinhaza shroud tier 5', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Sanguine dust', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Holy ornament kit', category: 'Raids', subcategory: 'Theatre of Blood' },
			{ item_name: 'Sanguine ornament kit', category: 'Raids', subcategory: 'Theatre of Blood' },
			
			// Tombs of Amascut (27 items)
			{ item_name: "Tumeken's guardian", category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: "Tumeken's shadow (uncharged)", category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: "Elidinis' ward", category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Masori mask', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Masori body', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Masori chaps', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Lightbearer', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: "Osmumten's fang", category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Thread of elidinis', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Breach of the scarab', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Eye of the corruptor', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Jewel of the sun', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Jewel of amascut', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Menaphite ornament kit', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Cursed phalanx', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Masori crafting kit', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Cache of runes', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: "Icthlarin's shroud (tier 1)", category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: "Icthlarin's shroud (tier 2)", category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: "Icthlarin's shroud (tier 3)", category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: "Icthlarin's shroud (tier 4)", category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: "Icthlarin's shroud (tier 5)", category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Remnant of akkha', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Remnant of ba-ba', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Remnant of kephri', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Remnant of zebak', category: 'Raids', subcategory: 'Tombs of Amascut' },
			{ item_name: 'Ancient remnant', category: 'Raids', subcategory: 'Tombs of Amascut' },
		];
		
		// Insert all items
		console.log(`Inserting ${raidItems.length} raid collection log items...`);
		
		for (const item of raidItems) {
			await db.query(`
				INSERT INTO collection_log_items (item_name, category, subcategory)
				VALUES ($1, $2, $3)
				ON CONFLICT (item_name, subcategory) DO NOTHING
			`, [item.item_name, item.category, item.subcategory]);
		}
		
		console.log(`✅ Seeded ${raidItems.length} raid collection log items`);
		console.log('✅ Migration 025_seed_collection_log_raids completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 025_seed_collection_log_raids failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 025_seed_collection_log_raids');
	
	try {
		await db.query(`DELETE FROM collection_log_items WHERE category = 'Raids'`);
		console.log('✅ Removed all raid collection log items');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

