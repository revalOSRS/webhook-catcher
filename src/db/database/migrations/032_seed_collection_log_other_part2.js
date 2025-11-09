/**
 * Migration: Seed Collection Log - Other Category (Part 2 - Final)
 * 
 * Populates the collection_log_items table with remaining "Other" category collection log items.
 * This part covers:
 * - Forestry
 * - Fossil Island Notes
 * - Glough's Experiments
 * - Hunter Guild
 * - Lost Schematics
 * - Monkey Backpacks
 * - Motherlode Mine
 * - My Notes
 * - Ocean Encounters
 * - Random Events
 * - Revenants
 * - Rooftop Agility
 * - Sailing Miscellaneous
 * - Sea Treasures
 * - Shayzien Armour
 * - Shooting Stars
 * - Skilling Pets
 * - Slayer
 * - Tormented Demons
 * - TzHaar
 * - Miscellaneous
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 032_seed_collection_log_other_part2');
	
	try {
		const otherItems = [
			// Forestry (23 items)
			{ item_name: 'Fox whistle', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Golden pheasant egg', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Lumberjack hat', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Lumberjack top', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Lumberjack legs', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Lumberjack boots', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Forestry hat', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Forestry top', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Forestry legs', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Forestry boots', category: 'Other', subcategory: 'Forestry' },
			{ item_name: "Twitcher's gloves", category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Funky shaped log', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Log basket', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Log brace', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Clothes pouch blueprint', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Cape pouch', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Felling axe handle', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Pheasant hat', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Pheasant legs', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Pheasant boots', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Pheasant cape', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Petal garland', category: 'Other', subcategory: 'Forestry' },
			{ item_name: 'Sturdy beehive parts', category: 'Other', subcategory: 'Forestry' },
			
			// Fossil Island Notes (10 items)
			{ item_name: 'Scribbled note', category: 'Other', subcategory: 'Fossil Island Notes' },
			{ item_name: 'Partial note', category: 'Other', subcategory: 'Fossil Island Notes' },
			{ item_name: 'Ancient note', category: 'Other', subcategory: 'Fossil Island Notes' },
			{ item_name: 'Ancient writings', category: 'Other', subcategory: 'Fossil Island Notes' },
			{ item_name: 'Experimental note', category: 'Other', subcategory: 'Fossil Island Notes' },
			{ item_name: 'Paragraph of text', category: 'Other', subcategory: 'Fossil Island Notes' },
			{ item_name: 'Musty smelling note', category: 'Other', subcategory: 'Fossil Island Notes' },
			{ item_name: 'Hastily scrawled note', category: 'Other', subcategory: 'Fossil Island Notes' },
			{ item_name: 'Old writing', category: 'Other', subcategory: 'Fossil Island Notes' },
			{ item_name: 'Short note', category: 'Other', subcategory: 'Fossil Island Notes' },
			
			// Glough's Experiments (6 items)
			{ item_name: 'Zenyte shard', category: 'Other', subcategory: "Glough's Experiments" },
			{ item_name: 'Light frame', category: 'Other', subcategory: "Glough's Experiments" },
			{ item_name: 'Heavy frame', category: 'Other', subcategory: "Glough's Experiments" },
			{ item_name: 'Ballista limbs', category: 'Other', subcategory: "Glough's Experiments" },
			{ item_name: 'Monkey tail', category: 'Other', subcategory: "Glough's Experiments" },
			{ item_name: 'Ballista spring', category: 'Other', subcategory: "Glough's Experiments" },
			
			// Hunter Guild (6 items)
			{ item_name: 'Quetzin', category: 'Other', subcategory: 'Hunter Guild' },
			{ item_name: "Huntsman's kit", category: 'Other', subcategory: 'Hunter Guild' },
			{ item_name: 'Guild hunter headwear', category: 'Other', subcategory: 'Hunter Guild' },
			{ item_name: 'Guild hunter top', category: 'Other', subcategory: 'Hunter Guild' },
			{ item_name: 'Guild hunter legs', category: 'Other', subcategory: 'Hunter Guild' },
			{ item_name: 'Guild hunter boots', category: 'Other', subcategory: 'Hunter Guild' },
			
			// Lost Schematics (10 items)
			{ item_name: 'Salvaging station schematic', category: 'Other', subcategory: 'Lost Schematics' },
			{ item_name: 'Gale catcher schematic', category: 'Other', subcategory: 'Lost Schematics' },
			{ item_name: 'Eternal brazier schematic', category: 'Other', subcategory: 'Lost Schematics' },
			{ item_name: 'Rosewood cargo hold schematic', category: 'Other', subcategory: 'Lost Schematics' },
			{ item_name: 'Rosewood hull schematic', category: 'Other', subcategory: 'Lost Schematics' },
			{ item_name: 'Rosewood & cotton sails schematic', category: 'Other', subcategory: 'Lost Schematics' },
			{ item_name: 'Dragon helm schematic', category: 'Other', subcategory: 'Lost Schematics' },
			{ item_name: 'Dragon keel schematic', category: 'Other', subcategory: 'Lost Schematics' },
			{ item_name: 'Dragon salvaging hook schematic', category: 'Other', subcategory: 'Lost Schematics' },
			{ item_name: 'Dragon cannon schematic', category: 'Other', subcategory: 'Lost Schematics' },
			
			// Monkey Backpacks (6 items)
			{ item_name: 'Karamjan monkey', category: 'Other', subcategory: 'Monkey Backpacks' },
			{ item_name: 'Kruk jr', category: 'Other', subcategory: 'Monkey Backpacks' },
			{ item_name: 'Maniacal monkey', category: 'Other', subcategory: 'Monkey Backpacks' },
			{ item_name: 'Princely monkey', category: 'Other', subcategory: 'Monkey Backpacks' },
			{ item_name: 'Skeleton monkey', category: 'Other', subcategory: 'Monkey Backpacks' },
			{ item_name: 'Zombie monkey', category: 'Other', subcategory: 'Monkey Backpacks' },
			
			// Motherlode Mine (6 items)
			{ item_name: 'Coal bag', category: 'Other', subcategory: 'Motherlode Mine' },
			{ item_name: 'Gem bag', category: 'Other', subcategory: 'Motherlode Mine' },
			{ item_name: 'Prospector helmet', category: 'Other', subcategory: 'Motherlode Mine' },
			{ item_name: 'Prospector jacket', category: 'Other', subcategory: 'Motherlode Mine' },
			{ item_name: 'Prospector legs', category: 'Other', subcategory: 'Motherlode Mine' },
			{ item_name: 'Prospector boots', category: 'Other', subcategory: 'Motherlode Mine' },
			
			// My Notes (26 items - all Ancient pages)
			{ item_name: 'Ancient page 1', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 2', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 3', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 4', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 5', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 6', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 7', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 8', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 9', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 10', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 11', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 12', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 13', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 14', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 15', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 16', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 17', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 18', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 19', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 20', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 21', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 22', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 23', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 24', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 25', category: 'Other', subcategory: 'My Notes' },
			{ item_name: 'Ancient page 26', category: 'Other', subcategory: 'My Notes' },
			
			// Ocean Encounters (11 items)
			{ item_name: 'Tiny pearl', category: 'Other', subcategory: 'Ocean Encounters' },
			{ item_name: 'Small pearl', category: 'Other', subcategory: 'Ocean Encounters' },
			{ item_name: 'Shiny pearl', category: 'Other', subcategory: 'Ocean Encounters' },
			{ item_name: 'Bright pearl', category: 'Other', subcategory: 'Ocean Encounters' },
			{ item_name: 'Big pearl', category: 'Other', subcategory: 'Ocean Encounters' },
			{ item_name: 'Huge pearl', category: 'Other', subcategory: 'Ocean Encounters' },
			{ item_name: 'Enormous pearl', category: 'Other', subcategory: 'Ocean Encounters' },
			{ item_name: 'Shimmering pearl', category: 'Other', subcategory: 'Ocean Encounters' },
			{ item_name: 'Glistening pearl', category: 'Other', subcategory: 'Ocean Encounters' },
			{ item_name: 'Brilliant pearl', category: 'Other', subcategory: 'Ocean Encounters' },
			{ item_name: 'Radiant pearl', category: 'Other', subcategory: 'Ocean Encounters' },
			
			// Random Events (23 items)
			{ item_name: 'Camo top', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Camo bottoms', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Camo helmet', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Lederhosen top', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Lederhosen shorts', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Lederhosen hat', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Zombie shirt', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Zombie trousers', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Zombie mask', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Zombie gloves', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Zombie boots', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Mime mask', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Mime top', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Mime legs', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Mime gloves', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Mime boots', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Frog token', category: 'Other', subcategory: 'Random Events' },
			{ item_name: 'Stale baguette', category: 'Other', subcategory: 'Random Events' },
			{ item_name: "Beekeeper's hat", category: 'Other', subcategory: 'Random Events' },
			{ item_name: "Beekeeper's top", category: 'Other', subcategory: 'Random Events' },
			{ item_name: "Beekeeper's legs", category: 'Other', subcategory: 'Random Events' },
			{ item_name: "Beekeeper's gloves", category: 'Other', subcategory: 'Random Events' },
			{ item_name: "Beekeeper's boots", category: 'Other', subcategory: 'Random Events' },
			
			// Revenants (14 items)
			{ item_name: "Viggora's chainmace (u)", category: 'Other', subcategory: 'Revenants' },
			{ item_name: "Craw's bow (u)", category: 'Other', subcategory: 'Revenants' },
			{ item_name: "Thammaron's sceptre (u)", category: 'Other', subcategory: 'Revenants' },
			{ item_name: 'Amulet of avarice', category: 'Other', subcategory: 'Revenants' },
			{ item_name: 'Bracelet of ethereum (uncharged)', category: 'Other', subcategory: 'Revenants' },
			{ item_name: 'Ancient crystal', category: 'Other', subcategory: 'Revenants' },
			{ item_name: 'Ancient relic', category: 'Other', subcategory: 'Revenants' },
			{ item_name: 'Ancient effigy', category: 'Other', subcategory: 'Revenants' },
			{ item_name: 'Ancient medallion', category: 'Other', subcategory: 'Revenants' },
			{ item_name: 'Ancient statuette', category: 'Other', subcategory: 'Revenants' },
			{ item_name: 'Ancient totem', category: 'Other', subcategory: 'Revenants' },
			{ item_name: 'Ancient emblem', category: 'Other', subcategory: 'Revenants' },
			{ item_name: 'Revenant cave teleport', category: 'Other', subcategory: 'Revenants' },
			{ item_name: 'Revenant ether', category: 'Other', subcategory: 'Revenants' },
			
			// Rooftop Agility (7 items)
			{ item_name: 'Mark of grace', category: 'Other', subcategory: 'Rooftop Agility' },
			{ item_name: 'Graceful hood', category: 'Other', subcategory: 'Rooftop Agility' },
			{ item_name: 'Graceful cape', category: 'Other', subcategory: 'Rooftop Agility' },
			{ item_name: 'Graceful top', category: 'Other', subcategory: 'Rooftop Agility' },
			{ item_name: 'Graceful legs', category: 'Other', subcategory: 'Rooftop Agility' },
			{ item_name: 'Graceful gloves', category: 'Other', subcategory: 'Rooftop Agility' },
			{ item_name: 'Graceful boots', category: 'Other', subcategory: 'Rooftop Agility' },
			
			// Sailing Miscellaneous (11 items)
			{ item_name: 'Dragon metal sheet', category: 'Other', subcategory: 'Sailing Miscellaneous' },
			{ item_name: 'Dragon nails', category: 'Other', subcategory: 'Sailing Miscellaneous' },
			{ item_name: 'Dragon cannonball', category: 'Other', subcategory: 'Sailing Miscellaneous' },
			{ item_name: 'Echo pearl', category: 'Other', subcategory: 'Sailing Miscellaneous' },
			{ item_name: 'Swift albatross feather', category: 'Other', subcategory: 'Sailing Miscellaneous' },
			{ item_name: 'Narwhal horn', category: 'Other', subcategory: 'Sailing Miscellaneous' },
			{ item_name: 'Ray barbs', category: 'Other', subcategory: 'Sailing Miscellaneous' },
			{ item_name: 'Broken dragon hook', category: 'Other', subcategory: 'Sailing Miscellaneous' },
			{ item_name: 'Bottled storm', category: 'Other', subcategory: 'Sailing Miscellaneous' },
			{ item_name: 'Dragon cannon barrel', category: 'Other', subcategory: 'Sailing Miscellaneous' },
			{ item_name: 'Boat bottle (empty)', category: 'Other', subcategory: 'Sailing Miscellaneous' },
			
			// Sea Treasures (17 items)
			{ item_name: 'Medallion fragment 1', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Medallion fragment 2', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Medallion fragment 3', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Medallion fragment 4', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Medallion fragment 5', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Medallion fragment 6', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Medallion fragment 7', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Medallion fragment 8', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: "Sailors' amulet (inert)", category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Rusty locket', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Mouldy block', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Dull knife', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Broken compass', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Rusty coin', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Broken sextant', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Mouldy doll', category: 'Other', subcategory: 'Sea Treasures' },
			{ item_name: 'Smashed mirror', category: 'Other', subcategory: 'Sea Treasures' },
			
			// Shayzien Armour (25 items)
			{ item_name: 'Shayzien gloves (1)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien boots (1)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien helm (1)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien greaves (1)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien platebody (1)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien gloves (2)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien boots (2)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien helm (2)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien greaves (2)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien platebody (2)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien gloves (3)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien boots (3)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien helm (3)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien greaves (3)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien platebody (3)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien gloves (4)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien boots (4)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien helm (4)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien greaves (4)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien platebody (4)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien gloves (5)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien boots (5)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien helm (5)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien greaves (5)', category: 'Other', subcategory: 'Shayzien Armour' },
			{ item_name: 'Shayzien body (5)', category: 'Other', subcategory: 'Shayzien Armour' },
			
			// Shooting Stars (2 items)
			{ item_name: 'Celestial ring (uncharged)', category: 'Other', subcategory: 'Shooting Stars' },
			{ item_name: 'Star fragment', category: 'Other', subcategory: 'Shooting Stars' },
			
			// Skilling Pets (9 items)
			{ item_name: 'Heron', category: 'Other', subcategory: 'Skilling Pets' },
			{ item_name: 'Rock golem', category: 'Other', subcategory: 'Skilling Pets' },
			{ item_name: 'Beaver', category: 'Other', subcategory: 'Skilling Pets' },
			{ item_name: 'Baby chinchompa', category: 'Other', subcategory: 'Skilling Pets' },
			{ item_name: 'Giant squirrel', category: 'Other', subcategory: 'Skilling Pets' },
			{ item_name: 'Tangleroot', category: 'Other', subcategory: 'Skilling Pets' },
			{ item_name: 'Rocky', category: 'Other', subcategory: 'Skilling Pets' },
			{ item_name: 'Rift guardian', category: 'Other', subcategory: 'Skilling Pets' },
			{ item_name: 'Soup', category: 'Other', subcategory: 'Skilling Pets' },
		];
		
		console.log('Inserting "Other" category items (Part 2)...');
		console.log(`Total items: ${otherItems.length}`);
		
		for (const item of otherItems) {
			await db.query(`
				INSERT INTO collection_log_items (item_name, category, subcategory)
				VALUES ($1, $2, $3)
				ON CONFLICT (item_name, subcategory) DO NOTHING
			`, [item.item_name, item.category, item.subcategory]);
		}
		
		console.log(`✅ Seeded ${otherItems.length} "Other" category items (Part 2)`);
		console.log('   Note: Slayer, Tormented Demons, TzHaar, and Miscellaneous will be in Part 3');
		console.log('✅ Migration 032_seed_collection_log_other_part2 completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 032_seed_collection_log_other_part2 failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 032_seed_collection_log_other_part2');
	
	try {
		await db.query(`
			DELETE FROM collection_log_items 
			WHERE category = 'Other' 
			AND subcategory IN (
				'Forestry',
				'Fossil Island Notes',
				'Glough''s Experiments',
				'Hunter Guild',
				'Lost Schematics',
				'Monkey Backpacks',
				'Motherlode Mine',
				'My Notes',
				'Ocean Encounters',
				'Random Events',
				'Revenants',
				'Rooftop Agility',
				'Sailing Miscellaneous',
				'Sea Treasures',
				'Shayzien Armour',
				'Shooting Stars',
				'Skilling Pets'
			)
		`);
		console.log('✅ Removed "Other" category items (Part 2)');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

