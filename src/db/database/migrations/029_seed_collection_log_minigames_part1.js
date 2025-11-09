/**
 * Migration: Seed Collection Log - Minigames Category (Part 1)
 * 
 * Populates the collection_log_items table with minigame collection log items.
 * This part covers:
 * - Barbarian Assault
 * - Barracuda Trials
 * - Brimhaven Agility Arena
 * - Castle Wars
 * - Fishing Trawler
 * - Giants' Foundry
 * - Gnome Restaurant
 * - Guardians of the Rift
 * - Hallowed Sepulchre
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 029_seed_collection_log_minigames_part1');
	
	try {
		const minigameItems = [
			// Barbarian Assault (11 items)
			{ item_name: 'Pet penance queen', category: 'Minigames', subcategory: 'Barbarian Assault' },
			{ item_name: 'Fighter hat', category: 'Minigames', subcategory: 'Barbarian Assault' },
			{ item_name: 'Ranger hat', category: 'Minigames', subcategory: 'Barbarian Assault' },
			{ item_name: 'Runner hat', category: 'Minigames', subcategory: 'Barbarian Assault' },
			{ item_name: 'Healer hat', category: 'Minigames', subcategory: 'Barbarian Assault' },
			{ item_name: 'Fighter torso', category: 'Minigames', subcategory: 'Barbarian Assault' },
			{ item_name: 'Penance skirt', category: 'Minigames', subcategory: 'Barbarian Assault' },
			{ item_name: 'Runner boots', category: 'Minigames', subcategory: 'Barbarian Assault' },
			{ item_name: 'Penance gloves', category: 'Minigames', subcategory: 'Barbarian Assault' },
			{ item_name: 'Granite helm', category: 'Minigames', subcategory: 'Barbarian Assault' },
			{ item_name: 'Granite body', category: 'Minigames', subcategory: 'Barbarian Assault' },
			
			// Barracuda Trials (9 items)
			{ item_name: 'Stormy key', category: 'Minigames', subcategory: 'Barracuda Trials' },
			{ item_name: 'Barrel stand', category: 'Minigames', subcategory: 'Barracuda Trials' },
			{ item_name: "Ralph's fabric roll", category: 'Minigames', subcategory: 'Barracuda Trials' },
			{ item_name: 'Fetid key', category: 'Minigames', subcategory: 'Barracuda Trials' },
			{ item_name: 'Captured wind mote', category: 'Minigames', subcategory: 'Barracuda Trials' },
			{ item_name: "Gurtob's fabric roll", category: 'Minigames', subcategory: 'Barracuda Trials' },
			{ item_name: 'Serrated key', category: 'Minigames', subcategory: 'Barracuda Trials' },
			{ item_name: 'Heart of ithell', category: 'Minigames', subcategory: 'Barracuda Trials' },
			{ item_name: "Gwyna's fabric roll", category: 'Minigames', subcategory: 'Barracuda Trials' },
			
			// Brimhaven Agility Arena (9 items)
			{ item_name: 'Agility arena ticket', category: 'Minigames', subcategory: 'Brimhaven Agility Arena' },
			{ item_name: 'Brimhaven voucher', category: 'Minigames', subcategory: 'Brimhaven Agility Arena' },
			{ item_name: "Pirate's hook", category: 'Minigames', subcategory: 'Brimhaven Agility Arena' },
			{ item_name: 'Graceful hood', category: 'Minigames', subcategory: 'Brimhaven Agility Arena' },
			{ item_name: 'Graceful top', category: 'Minigames', subcategory: 'Brimhaven Agility Arena' },
			{ item_name: 'Graceful legs', category: 'Minigames', subcategory: 'Brimhaven Agility Arena' },
			{ item_name: 'Graceful gloves', category: 'Minigames', subcategory: 'Brimhaven Agility Arena' },
			{ item_name: 'Graceful boots', category: 'Minigames', subcategory: 'Brimhaven Agility Arena' },
			{ item_name: 'Graceful cape', category: 'Minigames', subcategory: 'Brimhaven Agility Arena' },
			
			// Castle Wars (39 items)
			{ item_name: 'Decorative helm (red)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative full helm (red)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (red platebody)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative sword (red)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative shield (red)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (red platelegs)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (red plateskirt)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative boots (red)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative helm (white)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative full helm (white)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (white platebody)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative sword (white)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative shield (white)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (white platelegs)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (white plateskirt)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative boots (white)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative helm (gold)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative full helm (gold)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (gold platebody)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative sword (gold)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative shield (gold)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (gold platelegs)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (gold plateskirt)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative boots (gold)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Castlewars hood', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Castlewars cloak', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Saradomin banner', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Zamorak banner', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (magic hat)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (magic top)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (magic legs)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (ranged top)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (ranged legs)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Decorative armour (quiver)', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Saradomin halo', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Zamorak halo', category: 'Minigames', subcategory: 'Castle Wars' },
			{ item_name: 'Guthix halo', category: 'Minigames', subcategory: 'Castle Wars' },
			
			// Fishing Trawler (4 items)
			{ item_name: 'Angler hat', category: 'Minigames', subcategory: 'Fishing Trawler' },
			{ item_name: 'Angler top', category: 'Minigames', subcategory: 'Fishing Trawler' },
			{ item_name: 'Angler waders', category: 'Minigames', subcategory: 'Fishing Trawler' },
			{ item_name: 'Angler boots', category: 'Minigames', subcategory: 'Fishing Trawler' },
			
			// Giants' Foundry (9 items)
			{ item_name: 'Smiths tunic', category: 'Minigames', subcategory: "Giants' Foundry" },
			{ item_name: 'Smiths trousers', category: 'Minigames', subcategory: "Giants' Foundry" },
			{ item_name: 'Smiths boots', category: 'Minigames', subcategory: "Giants' Foundry" },
			{ item_name: 'Smiths gloves', category: 'Minigames', subcategory: "Giants' Foundry" },
			{ item_name: 'Colossal blade', category: 'Minigames', subcategory: "Giants' Foundry" },
			{ item_name: 'Double ammo mould', category: 'Minigames', subcategory: "Giants' Foundry" },
			{ item_name: "Kovac's grog", category: 'Minigames', subcategory: "Giants' Foundry" },
			{ item_name: 'Smithing catalyst', category: 'Minigames', subcategory: "Giants' Foundry" },
			{ item_name: 'Ore pack', category: 'Minigames', subcategory: "Giants' Foundry" },
			
			// Gnome Restaurant (4 items)
			{ item_name: 'Grand seed pod', category: 'Minigames', subcategory: 'Gnome Restaurant' },
			{ item_name: 'Gnome scarf', category: 'Minigames', subcategory: 'Gnome Restaurant' },
			{ item_name: 'Gnome goggles', category: 'Minigames', subcategory: 'Gnome Restaurant' },
			{ item_name: 'Mint cake', category: 'Minigames', subcategory: 'Gnome Restaurant' },
			
			// Guardians of the Rift (17 items)
			{ item_name: 'Abyssal protector', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Abyssal pearls', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Catalytic talisman', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Abyssal needle', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Abyssal green dye', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Abyssal blue dye', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Abyssal red dye', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Hat of the eye', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Robe top of the eye', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Robe bottoms of the eye', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Boots of the eye', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Ring of the elements', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Abyssal lantern', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: "Guardian's eye", category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Intricate pouch', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Lost bag', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			{ item_name: 'Tarnished locket', category: 'Minigames', subcategory: 'Guardians of the Rift' },
			
			// Hallowed Sepulchre (16 items - note: 5 Mysterious pages, but treating as separate entries)
			{ item_name: 'Hallowed mark', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Hallowed token', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Hallowed grapple', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Hallowed focus', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Hallowed symbol', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Hallowed hammer', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Hallowed ring', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Dark dye', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Dark acorn', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Strange old lockpick', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Ring of endurance', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Mysterious page 1', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Mysterious page 2', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Mysterious page 3', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Mysterious page 4', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
			{ item_name: 'Mysterious page 5', category: 'Minigames', subcategory: 'Hallowed Sepulchre' },
		];
		
		console.log('Inserting minigame items (Part 1)...');
		console.log(`Total items: ${minigameItems.length}`);
		
		for (const item of minigameItems) {
			await db.query(`
				INSERT INTO collection_log_items (item_name, category, subcategory)
				VALUES ($1, $2, $3)
				ON CONFLICT (item_name, subcategory) DO NOTHING
			`, [item.item_name, item.category, item.subcategory]);
		}
		
		console.log(`✅ Seeded ${minigameItems.length} minigame items (Part 1)`);
		console.log('✅ Migration 029_seed_collection_log_minigames_part1 completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 029_seed_collection_log_minigames_part1 failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 029_seed_collection_log_minigames_part1');
	
	try {
		await db.query(`
			DELETE FROM collection_log_items 
			WHERE category = 'Minigames' 
			AND subcategory IN (
				'Barbarian Assault',
				'Barracuda Trials',
				'Brimhaven Agility Arena',
				'Castle Wars',
				'Fishing Trawler',
				'Giants'' Foundry',
				'Gnome Restaurant',
				'Guardians of the Rift',
				'Hallowed Sepulchre'
			)
		`);
		console.log('✅ Removed minigame items (Part 1)');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

