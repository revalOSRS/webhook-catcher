/**
 * Migration: Seed Collection Log - Other Category (Part 3 - Final)
 * 
 * Populates the collection_log_items table with final "Other" category collection log items.
 * This part covers:
 * - Slayer (88 items)
 * - Tormented Demons (3 items)
 * - TzHaar (10 items)
 * - Miscellaneous (62 items)
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 033_seed_collection_log_other_part3');
	
	try {
		const otherItems = [
			// Slayer (88 items)
			{ item_name: 'Crawling hand', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Cockatrice head', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Basilisk head', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Kurask head', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Abyssal head', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Imbued heart', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Eternal gem', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Dust battlestaff', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mist battlestaff', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Abyssal whip', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Granite maul', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mudskipper hat', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Flippers', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Brine sabre', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Leaf-bladed sword', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Leaf-bladed battleaxe', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Black mask', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Granite longsword', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Granite boots', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Wyvern visage', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Granite legs', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Granite helm', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Draconic visage', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Bronze boots', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Iron boots', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Steel boots', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Black boots', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mithril boots', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Adamant boots', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Rune boots', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Dragon boots', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Abyssal dagger', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Uncharged trident', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Kraken tentacle', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Dark bow', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Occult necklace', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Dragon chainbody', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Dragon thrownaxe', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Dragon harpoon', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Dragon sword', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Dragon knife', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Broken dragon hasta', category: 'Other', subcategory: 'Slayer' },
			{ item_name: "Drake's tooth", category: 'Other', subcategory: 'Slayer' },
			{ item_name: "Drake's claw", category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Hydra tail', category: 'Other', subcategory: 'Slayer' },
			{ item_name: "Hydra's fang", category: 'Other', subcategory: 'Slayer' },
			{ item_name: "Hydra's eye", category: 'Other', subcategory: 'Slayer' },
			{ item_name: "Hydra's heart", category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic hat (light)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic robe top (light)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic robe bottom (light)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic gloves (light)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic boots (light)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic hat (dark)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic robe top (dark)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic robe bottom (dark)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic gloves (dark)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic boots (dark)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic hat (dusk)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic robe top (dusk)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic robe bottom (dusk)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic gloves (dusk)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Mystic boots (dusk)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Basilisk jaw', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Aquanite tendon', category: 'Other', subcategory: 'Slayer' },
			{ item_name: "Dagon'hai hat", category: 'Other', subcategory: 'Slayer' },
			{ item_name: "Dagon'hai robe top", category: 'Other', subcategory: 'Slayer' },
			{ item_name: "Dagon'hai robe bottom", category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Blood shard', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Ancient ceremonial mask', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Ancient ceremonial top', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Ancient ceremonial legs', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Ancient ceremonial gloves', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Ancient ceremonial boots', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Warped sceptre', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Sulphur blades', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Teleport anchoring scroll', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Aranea boots', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Glacial temotli', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Pendant of ates (inert)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Frozen tear', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Earthbound tecpatl', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Antler guard', category: 'Other', subcategory: 'Slayer' },
			{ item_name: "Alchemist's signet", category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Broken antler', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Dragon metal sheet', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Horn of plenty (empty)', category: 'Other', subcategory: 'Slayer' },
			{ item_name: 'Gryphon feather', category: 'Other', subcategory: 'Slayer' },
			
			// Tormented Demons (3 items)
			{ item_name: 'Tormented synapse', category: 'Other', subcategory: 'Tormented Demons' },
			{ item_name: 'Burning claw', category: 'Other', subcategory: 'Tormented Demons' },
			{ item_name: 'Guthixian temple teleport', category: 'Other', subcategory: 'Tormented Demons' },
			
			// TzHaar (10 items)
			{ item_name: 'Obsidian cape', category: 'Other', subcategory: 'TzHaar' },
			{ item_name: 'Toktz-ket-xil', category: 'Other', subcategory: 'TzHaar' },
			{ item_name: 'Tzhaar-ket-om', category: 'Other', subcategory: 'TzHaar' },
			{ item_name: 'Toktz-xil-ak', category: 'Other', subcategory: 'TzHaar' },
			{ item_name: 'Toktz-xil-ek', category: 'Other', subcategory: 'TzHaar' },
			{ item_name: 'Toktz-mej-tal', category: 'Other', subcategory: 'TzHaar' },
			{ item_name: 'Toktz-xil-ul', category: 'Other', subcategory: 'TzHaar' },
			{ item_name: 'Obsidian helmet', category: 'Other', subcategory: 'TzHaar' },
			{ item_name: 'Obsidian platebody', category: 'Other', subcategory: 'TzHaar' },
			{ item_name: 'Obsidian platelegs', category: 'Other', subcategory: 'TzHaar' },
			
			// Miscellaneous (62 items)
			{ item_name: 'Herbi', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Chompy chick', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dragon warhammer', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Big swordfish', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Big shark', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Big bass', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Giant blue krill', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Golden haddock', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Orangefin', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Huge halibut', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Purplefin', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Swift marlin', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Long bone', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Curved bone', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Ecumenical key', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: "Pharaoh's sceptre (3)", category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dark totem base', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dark totem middle', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dark totem top', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Chewed bones', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dragon full helm', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Shield left half', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dragon metal slice', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dragon metal lump', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dragon limbs', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dragon spear', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Amulet of eternal glory', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Shaman mask', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Evil chicken head', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Evil chicken wings', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Evil chicken legs', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Evil chicken feet', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Mining gloves', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Superior mining gloves', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Expert mining gloves', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Right skull half', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Left skull half', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Top of sceptre', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Bottom of sceptre', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Mossy key', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Giant key', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Hespori seed', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Fresh crab claw', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Fresh crab shell', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: "Xeric's talisman (inert)", category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Mask of ranul', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Elven signet', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Crystal grail', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Enhanced crystal teleport seed', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dragonstone full helm', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dragonstone platebody', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dragonstone platelegs', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dragonstone gauntlets', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Dragonstone boots', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Uncut onyx', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Merfolk trident', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Orange egg sac', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Blue egg sac', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Broken zombie axe', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Broken zombie helmet', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Helmet of the moon', category: 'Other', subcategory: 'Miscellaneous' },
			{ item_name: 'Squid beak', category: 'Other', subcategory: 'Miscellaneous' },
		];
		
		console.log('Inserting "Other" category items (Part 3 - FINAL)...');
		console.log(`Total items: ${otherItems.length}`);
		
		for (const item of otherItems) {
			await db.query(`
				INSERT INTO collection_log_items (item_name, category, subcategory)
				VALUES ($1, $2, $3)
				ON CONFLICT (item_name, subcategory) DO NOTHING
			`, [item.item_name, item.category, item.subcategory]);
		}
		
		console.log(`✅ Seeded ${otherItems.length} "Other" category items (Part 3 - FINAL)`);
		console.log('');
		console.log('========================================');
		console.log('ALL COLLECTION LOG SEEDING COMPLETE');
		console.log('========================================');
		console.log('Summary:');
		console.log('  Bosses: ~530 items (Migration 024)');
		console.log('  Raids: ~230 items (Migration 025)');
		console.log('  Clues Part 1: ~250 items (Migration 026)');
		console.log('  Clues Part 2: 242 items (Migration 027)');
		console.log('  Clues Part 3: 90 items (Migration 028)');
		console.log('  Minigames Part 1: ~119 items (Migration 029)');
		console.log('  Minigames Part 2: ~167 items (Migration 030)');
		console.log('  Other Part 1: ~160 items (Migration 031)');
		console.log('  Other Part 2: ~340 items (Migration 032)');
		console.log(`  Other Part 3: ${otherItems.length} items (Migration 033)`);
		console.log('========================================');
		console.log('✅ Migration 033_seed_collection_log_other_part3 completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 033_seed_collection_log_other_part3 failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 033_seed_collection_log_other_part3');
	
	try {
		await db.query(`
			DELETE FROM collection_log_items 
			WHERE category = 'Other' 
			AND subcategory IN (
				'Slayer',
				'Tormented Demons',
				'TzHaar',
				'Miscellaneous'
			)
		`);
		console.log('✅ Removed "Other" category items (Part 3 - FINAL)');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

