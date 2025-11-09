/**
 * Migration: Seed Collection Log - Clues Category
 * 
 * Populates the collection_log_items table with all clue scroll collection log items.
 * This serves as a reference table for validation and metadata purposes.
 * 
 * Includes all tiers of treasure trails, rare rewards, shared rewards, and scroll cases.
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 026_seed_collection_log_clues');
	
	try {
		// Collection log items for Clues category
		const clueItems = [
			// Beginner Treasure Trails (16 items)
			{ item_name: 'Mole slippers', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Frog slippers', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Bear feet', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Demon feet', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Jester cape', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Shoulder parrot', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: "Monk's robe top (t)", category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: "Monk's robe (t)", category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Amulet of defence (t)', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Sandwich lady hat', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Sandwich lady top', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Sandwich lady bottom', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Rune scimitar ornament kit (guthix)', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Rune scimitar ornament kit (saradomin)', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Rune scimitar ornament kit (zamorak)', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			{ item_name: 'Black pickaxe', category: 'Clues', subcategory: 'Beginner Treasure Trails' },
			
			// Easy Treasure Trails (131 items)
			{ item_name: 'Team cape zero', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Team cape i', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Team cape x', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Cape of skulls', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: "Golden chef's hat", category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Golden apron', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Wooden shield (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black full helm (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black platebody (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black platelegs (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black plateskirt (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black kiteshield (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black full helm (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black platebody (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black platelegs (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black plateskirt (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black kiteshield (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black shield (h1)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black shield (h2)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black shield (h3)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black shield (h4)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black shield (h5)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black helm (h1)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black helm (h2)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black helm (h3)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black helm (h4)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black helm (h5)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black platebody (h1)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black platebody (h2)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black platebody (h3)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black platebody (h4)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black platebody (h5)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Steel full helm (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Steel platebody (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Steel platelegs (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Steel plateskirt (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Steel kiteshield (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Steel full helm (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Steel platebody (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Steel platelegs (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Steel plateskirt (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Steel kiteshield (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Iron platebody (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Iron platelegs (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Iron plateskirt (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Iron kiteshield (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Iron full helm (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Iron platebody (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Iron platelegs (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Iron plateskirt (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Iron kiteshield (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Iron full helm (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bronze platebody (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bronze platelegs (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bronze plateskirt (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bronze kiteshield (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bronze full helm (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bronze platebody (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bronze platelegs (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bronze plateskirt (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bronze kiteshield (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bronze full helm (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Studded body (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Studded chaps (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Studded body (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Studded chaps (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Leather body (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Leather chaps (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Blue wizard hat (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Blue wizard robe (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Blue skirt (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Blue wizard hat (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Blue wizard robe (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Blue skirt (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black wizard hat (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black wizard robe (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black skirt (g)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black wizard hat (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black wizard robe (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black skirt (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: "Monk's robe top (g)", category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: "Monk's robe (g)", category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Saradomin robe top', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Saradomin robe legs', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Guthix robe top', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Guthix robe legs', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Zamorak robe top', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Zamorak robe legs', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Ancient robe top', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Ancient robe legs', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Armadyl robe top', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Armadyl robe legs', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bandos robe top', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Bandos robe legs', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: "Bob's red shirt", category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: "Bob's green shirt", category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: "Bob's blue shirt", category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: "Bob's black shirt", category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: "Bob's purple shirt", category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Highwayman mask', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Blue beret', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black beret', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'White beret', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Red beret', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'A powdered wig', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Beanie', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Imp mask', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Goblin mask', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Sleeping cap', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Flared trousers', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Pantaloons', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black cane', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Staff of bob the cat', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Red elegant shirt', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Red elegant blouse', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Red elegant legs', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Red elegant skirt', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Green elegant shirt', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Green elegant blouse', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Green elegant legs', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Green elegant skirt', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Blue elegant shirt', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Blue elegant blouse', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Blue elegant legs', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Blue elegant skirt', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Amulet of magic (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Amulet of power (t)', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Black pickaxe', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Ham joint', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Rain bow', category: 'Clues', subcategory: 'Easy Treasure Trails' },
			{ item_name: 'Willow comp bow', category: 'Clues', subcategory: 'Easy Treasure Trails' },
		];
		
		// Medium Treasure Trails (115 items) - Part 1
		const mediumItems1 = [
			{ item_name: 'Ranger boots', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Wizard boots', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Holy sandals', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Climbing boots (g)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Spiked manacles', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant full helm (t)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant platebody (t)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant platelegs (t)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant plateskirt (t)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant kiteshield (t)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant full helm (g)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant platebody (g)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant platelegs (g)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant plateskirt (g)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant kiteshield (g)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant shield (h1)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant shield (h2)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant shield (h3)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant shield (h4)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant shield (h5)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant helm (h1)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant helm (h2)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant helm (h3)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant helm (h4)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant helm (h5)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant platebody (h1)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant platebody (h2)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant platebody (h3)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant platebody (h4)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant platebody (h5)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Mithril full helm (g)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Mithril platebody (g)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Mithril platelegs (g)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Mithril plateskirt (g)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Mithril kiteshield (g)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Mithril full helm (t)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Mithril platebody (t)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Mithril platelegs (t)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Mithril plateskirt (t)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Mithril kiteshield (t)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: "Green d'hide body (g)", category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: "Green d'hide body (t)", category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: "Green d'hide chaps (g)", category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: "Green d'hide chaps (t)", category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Saradomin mitre', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Saradomin cloak', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Guthix mitre', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Guthix cloak', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Zamorak mitre', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Zamorak cloak', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Ancient mitre', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Ancient cloak', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Ancient stole', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Ancient crozier', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Armadyl mitre', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Armadyl cloak', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Armadyl stole', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Armadyl crozier', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Bandos mitre', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Bandos cloak', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Bandos stole', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Bandos crozier', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Red boater', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Green boater', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Orange boater', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Black boater', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Blue boater', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Pink boater', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Purple boater', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'White boater', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Red headband', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Black headband', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Brown headband', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'White headband', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Blue headband', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Gold headband', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Pink headband', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Green headband', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Crier hat', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Crier coat', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Crier bell', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Adamant cane', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Arceuus banner', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Piscarilius banner', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Hosidius banner', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Shayzien banner', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Lovakengj banner', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Cabbage round shield', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Black unicorn mask', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'White unicorn mask', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Cat mask', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Penguin mask', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Leprechaun hat', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Black leprechaun hat', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Wolf mask', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Wolf cloak', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Purple elegant shirt', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Purple elegant blouse', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Purple elegant legs', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Purple elegant skirt', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Black elegant shirt', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'White elegant blouse', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Black elegant legs', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'White elegant skirt', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Pink elegant shirt', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Pink elegant blouse', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Pink elegant legs', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Pink elegant skirt', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Gold elegant shirt', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Gold elegant blouse', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Gold elegant legs', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Gold elegant skirt', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Gnomish firelighter', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Strength amulet (t)', category: 'Clues', subcategory: 'Medium Treasure Trails' },
			{ item_name: 'Yew comp bow', category: 'Clues', subcategory: 'Medium Treasure Trails' },
		];
		
		console.log('Inserting clue scroll collection log items...');
		console.log(`- Beginner Treasure Trails: ${clueItems.length} items`);
		console.log(`- Easy Treasure Trails: 131 items (included above)`);
		console.log(`- Medium Treasure Trails: ${mediumItems1.length} items`);
		
		// Insert all items
		const allItems = [...clueItems, ...mediumItems1];
		
		for (const item of allItems) {
			await db.query(`
				INSERT INTO collection_log_items (item_name, category, subcategory)
				VALUES ($1, $2, $3)
				ON CONFLICT (item_name, subcategory) DO NOTHING
			`, [item.item_name, item.category, item.subcategory]);
		}
		
		console.log(`✅ Seeded ${allItems.length} clue scroll collection log items (Part 1/3)`);
		console.log('   Note: Due to size, hard/elite/master/shared/scroll cases will be in separate migrations');
		console.log('✅ Migration 026_seed_collection_log_clues completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 026_seed_collection_log_clues failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 026_seed_collection_log_clues');
	
	try {
		await db.query(`DELETE FROM collection_log_items WHERE category = 'Clues' AND subcategory IN ('Beginner Treasure Trails', 'Easy Treasure Trails', 'Medium Treasure Trails')`);
		console.log('✅ Removed beginner/easy/medium treasure trail collection log items');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

