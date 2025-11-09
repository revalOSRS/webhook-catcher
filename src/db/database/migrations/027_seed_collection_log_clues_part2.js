/**
 * Migration: Seed Collection Log - Clues Category (Part 2)
 * 
 * Populates the collection_log_items table with remaining clue scroll items.
 * This includes hard/elite/master treasure trails, rare rewards, shared rewards, and scroll cases.
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 027_seed_collection_log_clues_part2');
	
	try {
		// Hard Treasure Trails (134 items)
		const hardItems = [
			{ item_name: 'Robin hood hat', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Dragon boots ornament kit', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune defender ornament kit', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Tzhaar-ket-om ornament kit', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Berserker necklace ornament kit', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune full helm (t)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune platebody (t)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune platelegs (t)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune plateskirt (t)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune kiteshield (t)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune full helm (g)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune platebody (g)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune platelegs (g)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune plateskirt (g)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune kiteshield (g)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Zamorak full helm', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Zamorak platebody', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Zamorak platelegs', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Zamorak plateskirt', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Zamorak kiteshield', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Guthix full helm', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Guthix platebody', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Guthix platelegs', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Guthix plateskirt', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Guthix kiteshield', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Saradomin full helm', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Saradomin platebody', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Saradomin platelegs', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Saradomin plateskirt', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Saradomin kiteshield', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Ancient full helm', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Ancient platebody', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Ancient platelegs', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Ancient plateskirt', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Ancient kiteshield', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Armadyl full helm', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Armadyl platebody', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Armadyl platelegs', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Armadyl plateskirt', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Armadyl kiteshield', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Bandos full helm', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Bandos platebody', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Bandos platelegs', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Bandos plateskirt', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Bandos kiteshield', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune shield (h1)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune shield (h2)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune shield (h3)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune shield (h4)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune shield (h5)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune helm (h1)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune helm (h2)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune helm (h3)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune helm (h4)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune helm (h5)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune platebody (h1)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune platebody (h2)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune platebody (h3)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune platebody (h4)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune platebody (h5)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Saradomin coif', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Saradomin d'hide body", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Saradomin chaps', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Saradomin bracers', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Saradomin d'hide boots", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Saradomin d'hide shield", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Guthix coif', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Guthix d'hide body", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Guthix chaps', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Guthix bracers', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Guthix d'hide boots", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Guthix d'hide shield", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Zamorak coif', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Zamorak d'hide body", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Zamorak chaps', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Zamorak bracers', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Zamorak d'hide boots", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Zamorak d'hide shield", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Bandos coif', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Bandos d'hide body", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Bandos chaps', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Bandos bracers', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Bandos d'hide boots", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Bandos d'hide shield", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Armadyl coif', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Armadyl d'hide body", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Armadyl chaps', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Armadyl bracers', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Armadyl d'hide boots", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Armadyl d'hide shield", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Ancient coif', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Ancient d'hide body", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Ancient chaps', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Ancient bracers', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Ancient d'hide boots", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Ancient d'hide shield", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Red d'hide body (t)", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Red d'hide chaps (t)", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Red d'hide body (g)", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Red d'hide chaps (g)", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Blue d'hide body (t)", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Blue d'hide chaps (t)", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Blue d'hide body (g)", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Blue d'hide chaps (g)", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Enchanted hat', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Enchanted top', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Enchanted robe', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Saradomin stole', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Saradomin crozier', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Guthix stole', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Guthix crozier', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Zamorak stole', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Zamorak crozier', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Zombie head', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Cyclops head', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: "Pirate's hat", category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Red cavalier', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'White cavalier', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Navy cavalier', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Tan cavalier', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Dark cavalier', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Black cavalier', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Pith helmet', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Explorer backpack', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Thieving bag', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Green dragon mask', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Blue dragon mask', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Red dragon mask', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Black dragon mask', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Nunchaku', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Dual sai', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Rune cane', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Amulet of glory (t)', category: 'Clues', subcategory: 'Hard Treasure Trails' },
			{ item_name: 'Magic comp bow', category: 'Clues', subcategory: 'Hard Treasure Trails' },
		];
		
		// Elite Treasure Trails (59 items)
		const eliteItems = [
			{ item_name: 'Ring of 3rd age', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Fury ornament kit', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dragon chainbody ornament kit', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dragon legs/skirt ornament kit', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dragon sq shield ornament kit', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dragon full helm ornament kit', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dragon scimitar ornament kit', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Light infinity colour kit', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dark infinity colour kit', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Holy wraps', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Ranger gloves', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: "Rangers' tunic", category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: "Rangers' tights", category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: "Black d'hide body (g)", category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: "Black d'hide chaps (g)", category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: "Black d'hide body (t)", category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: "Black d'hide chaps (t)", category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Royal crown', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Royal sceptre', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Royal gown top', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Royal gown bottom', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Musketeer hat', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Musketeer tabard', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Musketeer pants', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dark tuxedo jacket', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dark trousers', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dark tuxedo shoes', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dark tuxedo cuffs', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dark bow tie', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Light tuxedo jacket', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Light trousers', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Light tuxedo shoes', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Light tuxedo cuffs', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Light bow tie', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Arceuus scarf', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Hosidius scarf', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Piscarilius scarf', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Shayzien scarf', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Lovakengj scarf', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Bronze dragon mask', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Iron dragon mask', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Steel dragon mask', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Mithril dragon mask', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Adamant dragon mask', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Rune dragon mask', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Katana', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Dragon cane', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Briefcase', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Bucket helm', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: "Blacksmith's helm", category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Deerstalker', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Afro', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Big pirate hat', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Top hat', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Monocle', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Sagacious spectacles', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Fremennik kilt', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: 'Giant boot', category: 'Clues', subcategory: 'Elite Treasure Trails' },
			{ item_name: "Uri's hat", category: 'Clues', subcategory: 'Elite Treasure Trails' },
		];
		
		// Master Treasure Trails (49 items)
		const masterItems = [
			{ item_name: 'Bloodhound', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Ring of 3rd age', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Armadyl godsword ornament kit', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Bandos godsword ornament kit', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Saradomin godsword ornament kit', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Zamorak godsword ornament kit', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Occult ornament kit', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Torture ornament kit', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Anguish ornament kit', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Dragon defender ornament kit', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Dragon kiteshield ornament kit', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Dragon platebody ornament kit', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Tormented ornament kit', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Hood of darkness', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Robe top of darkness', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Robe bottom of darkness', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Gloves of darkness', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Boots of darkness', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Samurai kasa', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Samurai shirt', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Samurai greaves', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Samurai boots', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Samurai gloves', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Ankou mask', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Ankou top', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Ankou gloves', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Ankou socks', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: "Ankou's leggings", category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: "Mummy's head", category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: "Mummy's feet", category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: "Mummy's hands", category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: "Mummy's legs", category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: "Mummy's body", category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Shayzien hood', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Hosidius hood', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Arceuus hood', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Piscarilius hood', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Lovakengj hood', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Lesser demon mask', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Greater demon mask', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Black demon mask', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Jungle demon mask', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Old demon mask', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Left eye patch', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Bowl wig', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Ale of the gods', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Obsidian cape (r)', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Half moon spectacles', category: 'Clues', subcategory: 'Master Treasure Trails' },
			{ item_name: 'Fancy tiara', category: 'Clues', subcategory: 'Master Treasure Trails' },
		];
		
		console.log('Inserting remaining clue scroll items...');
		console.log(`- Hard Treasure Trails: ${hardItems.length} items`);
		console.log(`- Elite Treasure Trails: ${eliteItems.length} items`);
		console.log(`- Master Treasure Trails: ${masterItems.length} items`);
		
		// Insert hard/elite/master items
		const allItems = [...hardItems, ...eliteItems, ...masterItems];
		
		for (const item of allItems) {
			await db.query(`
				INSERT INTO collection_log_items (item_name, category, subcategory)
				VALUES ($1, $2, $3)
				ON CONFLICT (item_name, subcategory) DO NOTHING
			`, [item.item_name, item.category, item.subcategory]);
		}
		
		console.log(`✅ Seeded ${allItems.length} clue scroll items (Part 2/3)`);
		console.log('   Next migration will include rare rewards, shared rewards, and scroll cases');
		console.log('✅ Migration 027_seed_collection_log_clues_part2 completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 027_seed_collection_log_clues_part2 failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 027_seed_collection_log_clues_part2');
	
	try {
		await db.query(`
			DELETE FROM collection_log_items 
			WHERE category = 'Clues' 
			AND subcategory IN ('Hard Treasure Trails', 'Elite Treasure Trails', 'Master Treasure Trails')
		`);
		console.log('✅ Removed hard/elite/master treasure trail items');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

