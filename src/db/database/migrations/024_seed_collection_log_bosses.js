/**
 * Migration: Seed Collection Log - Bosses Category
 * 
 * Populates the collection_log_items table with all boss collection log items.
 * This serves as a reference table for validation and metadata purposes.
 * 
 * Note: The actual player collection log data comes from RuneLite plugin
 * and is stored in osrs_account_collection_log_drops with raw item data.
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 024_seed_collection_log_bosses');
	
	try {
		// Collection log items for Bosses category
		const bossItems = [
			// Abyssal Sire (9 items)
			{ item_name: 'Abyssal orphan', category: 'Bosses', subcategory: 'Abyssal Sire' },
			{ item_name: 'Unsired', category: 'Bosses', subcategory: 'Abyssal Sire' },
			{ item_name: 'Abyssal head', category: 'Bosses', subcategory: 'Abyssal Sire' },
			{ item_name: 'Bludgeon spine', category: 'Bosses', subcategory: 'Abyssal Sire' },
			{ item_name: 'Bludgeon claw', category: 'Bosses', subcategory: 'Abyssal Sire' },
			{ item_name: 'Bludgeon axon', category: 'Bosses', subcategory: 'Abyssal Sire' },
			{ item_name: 'Jar of miasma', category: 'Bosses', subcategory: 'Abyssal Sire' },
			{ item_name: 'Abyssal dagger', category: 'Bosses', subcategory: 'Abyssal Sire' },
			{ item_name: 'Abyssal whip', category: 'Bosses', subcategory: 'Abyssal Sire' },
			
			// Alchemical Hydra (11 items)
			{ item_name: 'Ikkle hydra', category: 'Bosses', subcategory: 'Alchemical Hydra' },
			{ item_name: "Hydra's claw", category: 'Bosses', subcategory: 'Alchemical Hydra' },
			{ item_name: 'Hydra tail', category: 'Bosses', subcategory: 'Alchemical Hydra' },
			{ item_name: 'Hydra leather', category: 'Bosses', subcategory: 'Alchemical Hydra' },
			{ item_name: "Hydra's fang", category: 'Bosses', subcategory: 'Alchemical Hydra' },
			{ item_name: "Hydra's eye", category: 'Bosses', subcategory: 'Alchemical Hydra' },
			{ item_name: "Hydra's heart", category: 'Bosses', subcategory: 'Alchemical Hydra' },
			{ item_name: 'Dragon knife', category: 'Bosses', subcategory: 'Alchemical Hydra' },
			{ item_name: 'Dragon thrownaxe', category: 'Bosses', subcategory: 'Alchemical Hydra' },
			{ item_name: 'Jar of chemicals', category: 'Bosses', subcategory: 'Alchemical Hydra' },
			{ item_name: 'Alchemical hydra heads', category: 'Bosses', subcategory: 'Alchemical Hydra' },
			
			// Amoxliatl (4 items)
			{ item_name: 'Moxi', category: 'Bosses', subcategory: 'Amoxliatl' },
			{ item_name: 'Glacial temotli', category: 'Bosses', subcategory: 'Amoxliatl' },
			{ item_name: 'Pendant of ates (inert)', category: 'Bosses', subcategory: 'Amoxliatl' },
			{ item_name: 'Frozen tear', category: 'Bosses', subcategory: 'Amoxliatl' },
			
			// Araxxor (10 items)
			{ item_name: 'Nid', category: 'Bosses', subcategory: 'Araxxor' },
			{ item_name: 'Araxyte venom sack', category: 'Bosses', subcategory: 'Araxxor' },
			{ item_name: 'Spider cave teleport', category: 'Bosses', subcategory: 'Araxxor' },
			{ item_name: 'Araxyte fang', category: 'Bosses', subcategory: 'Araxxor' },
			{ item_name: 'Noxious point', category: 'Bosses', subcategory: 'Araxxor' },
			{ item_name: 'Noxious blade', category: 'Bosses', subcategory: 'Araxxor' },
			{ item_name: 'Noxious pommel', category: 'Bosses', subcategory: 'Araxxor' },
			{ item_name: 'Araxyte head', category: 'Bosses', subcategory: 'Araxxor' },
			{ item_name: 'Jar of venom', category: 'Bosses', subcategory: 'Araxxor' },
			{ item_name: 'Coagulated venom', category: 'Bosses', subcategory: 'Araxxor' },
			
			// Barrows Chests (25 items)
			{ item_name: "Karil's coif", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Karil's leathertop", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Karil's leatherskirt", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Karil's crossbow", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Ahrim's hood", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Ahrim's robetop", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Ahrim's robeskirt", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Ahrim's staff", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Dharok's helm", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Dharok's platebody", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Dharok's platelegs", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Dharok's greataxe", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Guthan's helm", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Guthan's platebody", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Guthan's chainskirt", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Guthan's warspear", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Torag's helm", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Torag's platebody", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Torag's platelegs", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Torag's hammers", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Verac's helm", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Verac's brassard", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Verac's plateskirt", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: "Verac's flail", category: 'Bosses', subcategory: 'Barrows Chests' },
			{ item_name: 'Bolt rack', category: 'Bosses', subcategory: 'Barrows Chests' },
			
			// Bryophyta (1 item)
			{ item_name: "Bryophyta's essence", category: 'Bosses', subcategory: 'Bryophyta' },
			
			// Callisto and Artio (6 items)
			{ item_name: 'Callisto cub', category: 'Bosses', subcategory: 'Callisto and Artio' },
			{ item_name: 'Tyrannical ring', category: 'Bosses', subcategory: 'Callisto and Artio' },
			{ item_name: 'Dragon pickaxe', category: 'Bosses', subcategory: 'Callisto and Artio' },
			{ item_name: 'Dragon 2h sword', category: 'Bosses', subcategory: 'Callisto and Artio' },
			{ item_name: 'Claws of callisto', category: 'Bosses', subcategory: 'Callisto and Artio' },
			{ item_name: 'Voidwaker hilt', category: 'Bosses', subcategory: 'Callisto and Artio' },
			
			// Cerberus (7 items)
			{ item_name: 'Hellpuppy', category: 'Bosses', subcategory: 'Cerberus' },
			{ item_name: 'Eternal crystal', category: 'Bosses', subcategory: 'Cerberus' },
			{ item_name: 'Pegasian crystal', category: 'Bosses', subcategory: 'Cerberus' },
			{ item_name: 'Primordial crystal', category: 'Bosses', subcategory: 'Cerberus' },
			{ item_name: 'Jar of souls', category: 'Bosses', subcategory: 'Cerberus' },
			{ item_name: 'Smouldering stone', category: 'Bosses', subcategory: 'Cerberus' },
			{ item_name: 'Key master teleport', category: 'Bosses', subcategory: 'Cerberus' },
			
			// Chaos Elemental (3 items)
			{ item_name: 'Pet chaos elemental', category: 'Bosses', subcategory: 'Chaos Elemental' },
			{ item_name: 'Dragon pickaxe', category: 'Bosses', subcategory: 'Chaos Elemental' },
			{ item_name: 'Dragon 2h sword', category: 'Bosses', subcategory: 'Chaos Elemental' },
			
			// Chaos Fanatic (3 items)
			{ item_name: 'Pet chaos elemental', category: 'Bosses', subcategory: 'Chaos Fanatic' },
			{ item_name: 'Odium shard 1', category: 'Bosses', subcategory: 'Chaos Fanatic' },
			{ item_name: 'Malediction shard 1', category: 'Bosses', subcategory: 'Chaos Fanatic' },
			
			// Commander Zilyana (8 items)
			{ item_name: 'Pet zilyana', category: 'Bosses', subcategory: 'Commander Zilyana' },
			{ item_name: 'Armadyl crossbow', category: 'Bosses', subcategory: 'Commander Zilyana' },
			{ item_name: 'Saradomin hilt', category: 'Bosses', subcategory: 'Commander Zilyana' },
			{ item_name: 'Saradomin sword', category: 'Bosses', subcategory: 'Commander Zilyana' },
			{ item_name: "Saradomin's light", category: 'Bosses', subcategory: 'Commander Zilyana' },
			{ item_name: 'Godsword shard 1', category: 'Bosses', subcategory: 'Commander Zilyana' },
			{ item_name: 'Godsword shard 2', category: 'Bosses', subcategory: 'Commander Zilyana' },
			{ item_name: 'Godsword shard 3', category: 'Bosses', subcategory: 'Commander Zilyana' },
			
			// Corporeal Beast (7 items)
			{ item_name: 'Pet dark core', category: 'Bosses', subcategory: 'Corporeal Beast' },
			{ item_name: 'Elysian sigil', category: 'Bosses', subcategory: 'Corporeal Beast' },
			{ item_name: 'Spectral sigil', category: 'Bosses', subcategory: 'Corporeal Beast' },
			{ item_name: 'Arcane sigil', category: 'Bosses', subcategory: 'Corporeal Beast' },
			{ item_name: 'Holy elixir', category: 'Bosses', subcategory: 'Corporeal Beast' },
			{ item_name: 'Spirit shield', category: 'Bosses', subcategory: 'Corporeal Beast' },
			{ item_name: 'Jar of spirits', category: 'Bosses', subcategory: 'Corporeal Beast' },
			
			// Crazy archaeologist (3 items)
			{ item_name: 'Odium shard 2', category: 'Bosses', subcategory: 'Crazy archaeologist' },
			{ item_name: 'Malediction shard 2', category: 'Bosses', subcategory: 'Crazy archaeologist' },
			{ item_name: 'Fedora', category: 'Bosses', subcategory: 'Crazy archaeologist' },
			
			// Dagannoth Kings (10 items)
			{ item_name: 'Pet dagannoth prime', category: 'Bosses', subcategory: 'Dagannoth Kings' },
			{ item_name: 'Pet dagannoth supreme', category: 'Bosses', subcategory: 'Dagannoth Kings' },
			{ item_name: 'Pet dagannoth rex', category: 'Bosses', subcategory: 'Dagannoth Kings' },
			{ item_name: 'Berserker ring', category: 'Bosses', subcategory: 'Dagannoth Kings' },
			{ item_name: 'Archers ring', category: 'Bosses', subcategory: 'Dagannoth Kings' },
			{ item_name: 'Seers ring', category: 'Bosses', subcategory: 'Dagannoth Kings' },
			{ item_name: 'Warrior ring', category: 'Bosses', subcategory: 'Dagannoth Kings' },
			{ item_name: 'Dragon axe', category: 'Bosses', subcategory: 'Dagannoth Kings' },
			{ item_name: 'Seercull', category: 'Bosses', subcategory: 'Dagannoth Kings' },
			{ item_name: 'Mud battlestaff', category: 'Bosses', subcategory: 'Dagannoth Kings' },
			
			// Deranged Archaeologist (1 item)
			{ item_name: 'Steel ring', category: 'Bosses', subcategory: 'Deranged Archaeologist' },
			
			// Doom of Mokhaiotl (6 items)
			{ item_name: 'Dom', category: 'Bosses', subcategory: 'Doom of Mokhaiotl' },
			{ item_name: 'Avernic treads', category: 'Bosses', subcategory: 'Doom of Mokhaiotl' },
			{ item_name: 'Eye of ayak (uncharged)', category: 'Bosses', subcategory: 'Doom of Mokhaiotl' },
			{ item_name: 'Mokhaiotl cloth', category: 'Bosses', subcategory: 'Doom of Mokhaiotl' },
			{ item_name: 'Mokhaiotl waystone', category: 'Bosses', subcategory: 'Doom of Mokhaiotl' },
			{ item_name: 'Demon tear', category: 'Bosses', subcategory: 'Doom of Mokhaiotl' },
			
			// Duke Sucellus (10 items)
			{ item_name: 'Baron', category: 'Bosses', subcategory: 'Duke Sucellus' },
			{ item_name: 'Eye of the duke', category: 'Bosses', subcategory: 'Duke Sucellus' },
			{ item_name: 'Virtus mask', category: 'Bosses', subcategory: 'Duke Sucellus' },
			{ item_name: 'Virtus robe top', category: 'Bosses', subcategory: 'Duke Sucellus' },
			{ item_name: 'Virtus robe bottom', category: 'Bosses', subcategory: 'Duke Sucellus' },
			{ item_name: 'Magus vestige', category: 'Bosses', subcategory: 'Duke Sucellus' },
			{ item_name: 'Ice quartz', category: 'Bosses', subcategory: 'Duke Sucellus' },
			{ item_name: 'Frozen tablet', category: 'Bosses', subcategory: 'Duke Sucellus' },
			{ item_name: 'Chromium ingot', category: 'Bosses', subcategory: 'Duke Sucellus' },
			{ item_name: "Awakener's orb", category: 'Bosses', subcategory: 'Duke Sucellus' },
			
			// The Fight Caves (2 items)
			{ item_name: 'Tzrek-jad', category: 'Bosses', subcategory: 'The Fight Caves' },
			{ item_name: 'Fire cape', category: 'Bosses', subcategory: 'The Fight Caves' },
			
			// Fortis Colosseum (9 items)
			{ item_name: 'Smol heredit', category: 'Bosses', subcategory: 'Fortis Colosseum' },
			{ item_name: "Dizana's quiver (uncharged)", category: 'Bosses', subcategory: 'Fortis Colosseum' },
			{ item_name: 'Sunfire fanatic cuirass', category: 'Bosses', subcategory: 'Fortis Colosseum' },
			{ item_name: 'Sunfire fanatic chausses', category: 'Bosses', subcategory: 'Fortis Colosseum' },
			{ item_name: 'Sunfire fanatic helm', category: 'Bosses', subcategory: 'Fortis Colosseum' },
			{ item_name: 'Echo crystal', category: 'Bosses', subcategory: 'Fortis Colosseum' },
			{ item_name: 'Tonalztics of ralos (uncharged)', category: 'Bosses', subcategory: 'Fortis Colosseum' },
			{ item_name: 'Sunfire splinters', category: 'Bosses', subcategory: 'Fortis Colosseum' },
			{ item_name: 'Uncut onyx', category: 'Bosses', subcategory: 'Fortis Colosseum' },
			
			// The Gauntlet (5 items)
			{ item_name: 'Youngllef', category: 'Bosses', subcategory: 'The Gauntlet' },
			{ item_name: 'Crystal armour seed', category: 'Bosses', subcategory: 'The Gauntlet' },
			{ item_name: 'Crystal weapon seed', category: 'Bosses', subcategory: 'The Gauntlet' },
			{ item_name: 'Enhanced crystal weapon seed', category: 'Bosses', subcategory: 'The Gauntlet' },
			{ item_name: 'Gauntlet cape', category: 'Bosses', subcategory: 'The Gauntlet' },
			
			// General Graardor (8 items)
			{ item_name: 'Pet general graardor', category: 'Bosses', subcategory: 'General Graardor' },
			{ item_name: 'Bandos chestplate', category: 'Bosses', subcategory: 'General Graardor' },
			{ item_name: 'Bandos tassets', category: 'Bosses', subcategory: 'General Graardor' },
			{ item_name: 'Bandos boots', category: 'Bosses', subcategory: 'General Graardor' },
			{ item_name: 'Bandos hilt', category: 'Bosses', subcategory: 'General Graardor' },
			{ item_name: 'Godsword shard 1', category: 'Bosses', subcategory: 'General Graardor' },
			{ item_name: 'Godsword shard 2', category: 'Bosses', subcategory: 'General Graardor' },
			{ item_name: 'Godsword shard 3', category: 'Bosses', subcategory: 'General Graardor' },
			
			// Giant Mole (3 items)
			{ item_name: 'Baby mole', category: 'Bosses', subcategory: 'Giant Mole' },
			{ item_name: 'Mole skin', category: 'Bosses', subcategory: 'Giant Mole' },
			{ item_name: 'Mole claw', category: 'Bosses', subcategory: 'Giant Mole' },
			
			// Grotesque Guardians (7 items)
			{ item_name: 'Noon', category: 'Bosses', subcategory: 'Grotesque Guardians' },
			{ item_name: 'Black tourmaline core', category: 'Bosses', subcategory: 'Grotesque Guardians' },
			{ item_name: 'Granite gloves', category: 'Bosses', subcategory: 'Grotesque Guardians' },
			{ item_name: 'Granite ring', category: 'Bosses', subcategory: 'Grotesque Guardians' },
			{ item_name: 'Granite hammer', category: 'Bosses', subcategory: 'Grotesque Guardians' },
			{ item_name: 'Jar of stone', category: 'Bosses', subcategory: 'Grotesque Guardians' },
			{ item_name: 'Granite dust', category: 'Bosses', subcategory: 'Grotesque Guardians' },
			
			// Hespori (4 items)
			{ item_name: 'Bottomless compost bucket', category: 'Bosses', subcategory: 'Hespori' },
			{ item_name: 'Iasor seed', category: 'Bosses', subcategory: 'Hespori' },
			{ item_name: 'Kronos seed', category: 'Bosses', subcategory: 'Hespori' },
			{ item_name: 'Attas seed', category: 'Bosses', subcategory: 'Hespori' },
			
			// The Hueycoatl (6 items)
			{ item_name: 'Huberte', category: 'Bosses', subcategory: 'The Hueycoatl' },
			{ item_name: 'Dragon hunter wand', category: 'Bosses', subcategory: 'The Hueycoatl' },
			{ item_name: 'Tome of earth (empty)', category: 'Bosses', subcategory: 'The Hueycoatl' },
			{ item_name: 'Soiled page', category: 'Bosses', subcategory: 'The Hueycoatl' },
			{ item_name: 'Hueycoatl hide', category: 'Bosses', subcategory: 'The Hueycoatl' },
			{ item_name: 'Huasca seed', category: 'Bosses', subcategory: 'The Hueycoatl' },
			
			// The Inferno (2 items)
			{ item_name: 'Jal-nib-rek', category: 'Bosses', subcategory: 'The Inferno' },
			{ item_name: 'Infernal cape', category: 'Bosses', subcategory: 'The Inferno' },
			
			// Kalphite Queen (6 items)
			{ item_name: 'Kalphite princess', category: 'Bosses', subcategory: 'Kalphite Queen' },
			{ item_name: 'Kq head', category: 'Bosses', subcategory: 'Kalphite Queen' },
			{ item_name: 'Jar of sand', category: 'Bosses', subcategory: 'Kalphite Queen' },
			{ item_name: 'Dragon 2h sword', category: 'Bosses', subcategory: 'Kalphite Queen' },
			{ item_name: 'Dragon chainbody', category: 'Bosses', subcategory: 'Kalphite Queen' },
			{ item_name: 'Dragon pickaxe', category: 'Bosses', subcategory: 'Kalphite Queen' },
			
			// King Black Dragon (4 items)
			{ item_name: 'Prince black dragon', category: 'Bosses', subcategory: 'King Black Dragon' },
			{ item_name: 'Kbd heads', category: 'Bosses', subcategory: 'King Black Dragon' },
			{ item_name: 'Dragon pickaxe', category: 'Bosses', subcategory: 'King Black Dragon' },
			{ item_name: 'Draconic visage', category: 'Bosses', subcategory: 'King Black Dragon' },
			
			// Kraken (4 items)
			{ item_name: 'Pet kraken', category: 'Bosses', subcategory: 'Kraken' },
			{ item_name: 'Kraken tentacle', category: 'Bosses', subcategory: 'Kraken' },
			{ item_name: 'Trident of the seas', category: 'Bosses', subcategory: 'Kraken' },
			{ item_name: 'Jar of dirt', category: 'Bosses', subcategory: 'Kraken' },
			
			// Kree'arra (8 items)
			{ item_name: "Pet kree'arra", category: 'Bosses', subcategory: "Kree'arra" },
			{ item_name: 'Armadyl helmet', category: 'Bosses', subcategory: "Kree'arra" },
			{ item_name: 'Armadyl chestplate', category: 'Bosses', subcategory: "Kree'arra" },
			{ item_name: 'Armadyl chainskirt', category: 'Bosses', subcategory: "Kree'arra" },
			{ item_name: 'Armadyl hilt', category: 'Bosses', subcategory: "Kree'arra" },
			{ item_name: 'Godsword shard 1', category: 'Bosses', subcategory: "Kree'arra" },
			{ item_name: 'Godsword shard 2', category: 'Bosses', subcategory: "Kree'arra" },
			{ item_name: 'Godsword shard 3', category: 'Bosses', subcategory: "Kree'arra" },
			
			// K'ril Tsutsaroth (8 items)
			{ item_name: "Pet k'ril tsutsaroth", category: 'Bosses', subcategory: "K'ril Tsutsaroth" },
			{ item_name: 'Staff of the dead', category: 'Bosses', subcategory: "K'ril Tsutsaroth" },
			{ item_name: 'Zamorakian spear', category: 'Bosses', subcategory: "K'ril Tsutsaroth" },
			{ item_name: 'Steam battlestaff', category: 'Bosses', subcategory: "K'ril Tsutsaroth" },
			{ item_name: 'Zamorak hilt', category: 'Bosses', subcategory: "K'ril Tsutsaroth" },
			{ item_name: 'Godsword shard 1', category: 'Bosses', subcategory: "K'ril Tsutsaroth" },
			{ item_name: 'Godsword shard 2', category: 'Bosses', subcategory: "K'ril Tsutsaroth" },
			{ item_name: 'Godsword shard 3', category: 'Bosses', subcategory: "K'ril Tsutsaroth" },
			
			// The Leviathan (10 items)
			{ item_name: "Lil'viathan", category: 'Bosses', subcategory: 'The Leviathan' },
			{ item_name: "Leviathan's lure", category: 'Bosses', subcategory: 'The Leviathan' },
			{ item_name: 'Virtus mask', category: 'Bosses', subcategory: 'The Leviathan' },
			{ item_name: 'Virtus robe top', category: 'Bosses', subcategory: 'The Leviathan' },
			{ item_name: 'Virtus robe bottom', category: 'Bosses', subcategory: 'The Leviathan' },
			{ item_name: 'Venator vestige', category: 'Bosses', subcategory: 'The Leviathan' },
			{ item_name: 'Smoke quartz', category: 'Bosses', subcategory: 'The Leviathan' },
			{ item_name: 'Scarred tablet', category: 'Bosses', subcategory: 'The Leviathan' },
			{ item_name: 'Chromium ingot', category: 'Bosses', subcategory: 'The Leviathan' },
			{ item_name: "Awakener's orb", category: 'Bosses', subcategory: 'The Leviathan' },
			
			// Moons of Peril (13 items)
			{ item_name: 'Eclipse moon chestplate', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Eclipse moon tassets', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Eclipse moon helm', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Eclipse atlatl', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Blue moon chestplate', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Blue moon tassets', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Blue moon helm', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Blue moon spear', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Blood moon chestplate', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Blood moon tassets', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Blood moon helm', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Dual macuahuitl', category: 'Bosses', subcategory: 'Moons of Peril' },
			{ item_name: 'Atlatl dart', category: 'Bosses', subcategory: 'Moons of Peril' },
			
			// Nex (8 items)
			{ item_name: 'Nexling', category: 'Bosses', subcategory: 'Nex' },
			{ item_name: 'Ancient hilt', category: 'Bosses', subcategory: 'Nex' },
			{ item_name: 'Nihil horn', category: 'Bosses', subcategory: 'Nex' },
			{ item_name: 'Zaryte vambraces', category: 'Bosses', subcategory: 'Nex' },
			{ item_name: 'Torva full helm (damaged)', category: 'Bosses', subcategory: 'Nex' },
			{ item_name: 'Torva platebody (damaged)', category: 'Bosses', subcategory: 'Nex' },
			{ item_name: 'Torva platelegs (damaged)', category: 'Bosses', subcategory: 'Nex' },
			{ item_name: 'Nihil shard', category: 'Bosses', subcategory: 'Nex' },
			
			// The Nightmare (12 items)
			{ item_name: 'Little nightmare', category: 'Bosses', subcategory: 'The Nightmare' },
			{ item_name: "Inquisitor's mace", category: 'Bosses', subcategory: 'The Nightmare' },
			{ item_name: "Inquisitor's great helm", category: 'Bosses', subcategory: 'The Nightmare' },
			{ item_name: "Inquisitor's hauberk", category: 'Bosses', subcategory: 'The Nightmare' },
			{ item_name: "Inquisitor's plateskirt", category: 'Bosses', subcategory: 'The Nightmare' },
			{ item_name: 'Nightmare staff', category: 'Bosses', subcategory: 'The Nightmare' },
			{ item_name: 'Volatile orb', category: 'Bosses', subcategory: 'The Nightmare' },
			{ item_name: 'Harmonised orb', category: 'Bosses', subcategory: 'The Nightmare' },
			{ item_name: 'Eldritch orb', category: 'Bosses', subcategory: 'The Nightmare' },
			{ item_name: 'Jar of dreams', category: 'Bosses', subcategory: 'The Nightmare' },
			{ item_name: 'Slepey tablet', category: 'Bosses', subcategory: 'The Nightmare' },
			{ item_name: 'Parasitic egg', category: 'Bosses', subcategory: 'The Nightmare' },
			
			// Obor (1 item)
			{ item_name: 'Hill giant club', category: 'Bosses', subcategory: 'Obor' },
			
			// Phantom Muspah (6 items)
			{ item_name: 'Muphin', category: 'Bosses', subcategory: 'Phantom Muspah' },
			{ item_name: 'Venator shard', category: 'Bosses', subcategory: 'Phantom Muspah' },
			{ item_name: 'Ancient icon', category: 'Bosses', subcategory: 'Phantom Muspah' },
			{ item_name: 'Charged ice', category: 'Bosses', subcategory: 'Phantom Muspah' },
			{ item_name: 'Frozen cache', category: 'Bosses', subcategory: 'Phantom Muspah' },
			{ item_name: 'Ancient essence', category: 'Bosses', subcategory: 'Phantom Muspah' },
			
			// Royal Titans (7 items)
			{ item_name: 'Bran', category: 'Bosses', subcategory: 'Royal Titans' },
			{ item_name: 'Deadeye prayer scroll', category: 'Bosses', subcategory: 'Royal Titans' },
			{ item_name: 'Mystic vigour prayer scroll', category: 'Bosses', subcategory: 'Royal Titans' },
			{ item_name: 'Giantsoul amulet (uncharged)', category: 'Bosses', subcategory: 'Royal Titans' },
			{ item_name: 'Ice element staff crown', category: 'Bosses', subcategory: 'Royal Titans' },
			{ item_name: 'Fire element staff crown', category: 'Bosses', subcategory: 'Royal Titans' },
			{ item_name: 'Desiccated page', category: 'Bosses', subcategory: 'Royal Titans' },
			
			// Sarachnis (4 items)
			{ item_name: 'Sraracha', category: 'Bosses', subcategory: 'Sarachnis' },
			{ item_name: 'Jar of eyes', category: 'Bosses', subcategory: 'Sarachnis' },
			{ item_name: 'Giant egg sac(full)', category: 'Bosses', subcategory: 'Sarachnis' },
			{ item_name: 'Sarachnis cudgel', category: 'Bosses', subcategory: 'Sarachnis' },
			
			// Scorpia (4 items)
			{ item_name: "Scorpia's offspring", category: 'Bosses', subcategory: 'Scorpia' },
			{ item_name: 'Odium shard 3', category: 'Bosses', subcategory: 'Scorpia' },
			{ item_name: 'Malediction shard 3', category: 'Bosses', subcategory: 'Scorpia' },
			{ item_name: 'Dragon 2h sword', category: 'Bosses', subcategory: 'Scorpia' },
			
			// Scurrius (2 items)
			{ item_name: 'Scurry', category: 'Bosses', subcategory: 'Scurrius' },
			{ item_name: "Scurrius' spine", category: 'Bosses', subcategory: 'Scurrius' },
			
			// Shellbane Gryphon (3 items)
			{ item_name: 'Gull', category: 'Bosses', subcategory: 'Shellbane Gryphon' },
			{ item_name: "Belle's folly (tarnished)", category: 'Bosses', subcategory: 'Shellbane Gryphon' },
			{ item_name: 'Gryphon feather', category: 'Bosses', subcategory: 'Shellbane Gryphon' },
			
			// Skotizo (6 items)
			{ item_name: 'Skotos', category: 'Bosses', subcategory: 'Skotizo' },
			{ item_name: 'Jar of darkness', category: 'Bosses', subcategory: 'Skotizo' },
			{ item_name: 'Dark claw', category: 'Bosses', subcategory: 'Skotizo' },
			{ item_name: 'Dark totem', category: 'Bosses', subcategory: 'Skotizo' },
			{ item_name: 'Uncut onyx', category: 'Bosses', subcategory: 'Skotizo' },
			{ item_name: 'Ancient shard', category: 'Bosses', subcategory: 'Skotizo' },
			
			// Tempoross (12 items)
			{ item_name: 'Tiny tempor', category: 'Bosses', subcategory: 'Tempoross' },
			{ item_name: 'Big harpoonfish', category: 'Bosses', subcategory: 'Tempoross' },
			{ item_name: 'Spirit angler headband', category: 'Bosses', subcategory: 'Tempoross' },
			{ item_name: 'Spirit angler top', category: 'Bosses', subcategory: 'Tempoross' },
			{ item_name: 'Spirit angler waders', category: 'Bosses', subcategory: 'Tempoross' },
			{ item_name: 'Spirit angler boots', category: 'Bosses', subcategory: 'Tempoross' },
			{ item_name: 'Tome of water (empty)', category: 'Bosses', subcategory: 'Tempoross' },
			{ item_name: 'Soaked page', category: 'Bosses', subcategory: 'Tempoross' },
			{ item_name: 'Tackle box', category: 'Bosses', subcategory: 'Tempoross' },
			{ item_name: 'Fish barrel', category: 'Bosses', subcategory: 'Tempoross' },
			{ item_name: 'Dragon harpoon', category: 'Bosses', subcategory: 'Tempoross' },
			{ item_name: 'Spirit flakes', category: 'Bosses', subcategory: 'Tempoross' },
			
			// Thermonuclear smoke devil (5 items)
			{ item_name: 'Pet smoke devil', category: 'Bosses', subcategory: 'Thermonuclear smoke devil' },
			{ item_name: 'Occult necklace', category: 'Bosses', subcategory: 'Thermonuclear smoke devil' },
			{ item_name: 'Smoke battlestaff', category: 'Bosses', subcategory: 'Thermonuclear smoke devil' },
			{ item_name: 'Dragon chainbody', category: 'Bosses', subcategory: 'Thermonuclear smoke devil' },
			{ item_name: 'Jar of smoke', category: 'Bosses', subcategory: 'Thermonuclear smoke devil' },
			
			// Vardorvis (10 items)
			{ item_name: 'Butch', category: 'Bosses', subcategory: 'Vardorvis' },
			{ item_name: "Executioner's axe head", category: 'Bosses', subcategory: 'Vardorvis' },
			{ item_name: 'Virtus mask', category: 'Bosses', subcategory: 'Vardorvis' },
			{ item_name: 'Virtus robe top', category: 'Bosses', subcategory: 'Vardorvis' },
			{ item_name: 'Virtus robe bottom', category: 'Bosses', subcategory: 'Vardorvis' },
			{ item_name: 'Ultor vestige', category: 'Bosses', subcategory: 'Vardorvis' },
			{ item_name: 'Blood quartz', category: 'Bosses', subcategory: 'Vardorvis' },
			{ item_name: 'Strangled tablet', category: 'Bosses', subcategory: 'Vardorvis' },
			{ item_name: 'Chromium ingot', category: 'Bosses', subcategory: 'Vardorvis' },
			{ item_name: "Awakener's orb", category: 'Bosses', subcategory: 'Vardorvis' },
			
			// Venenatis and Spindel (6 items)
			{ item_name: 'Venenatis spiderling', category: 'Bosses', subcategory: 'Venenatis and Spindel' },
			{ item_name: 'Treasonous ring', category: 'Bosses', subcategory: 'Venenatis and Spindel' },
			{ item_name: 'Dragon pickaxe', category: 'Bosses', subcategory: 'Venenatis and Spindel' },
			{ item_name: 'Dragon 2h sword', category: 'Bosses', subcategory: 'Venenatis and Spindel' },
			{ item_name: 'Fangs of venenatis', category: 'Bosses', subcategory: 'Venenatis and Spindel' },
			{ item_name: 'Voidwaker gem', category: 'Bosses', subcategory: 'Venenatis and Spindel' },
			
			// Vet'ion and Calvar'ion (6 items)
			{ item_name: "Vet'ion jr.", category: 'Bosses', subcategory: "Vet'ion and Calvar'ion" },
			{ item_name: 'Ring of the gods', category: 'Bosses', subcategory: "Vet'ion and Calvar'ion" },
			{ item_name: 'Dragon pickaxe', category: 'Bosses', subcategory: "Vet'ion and Calvar'ion" },
			{ item_name: 'Dragon 2h sword', category: 'Bosses', subcategory: "Vet'ion and Calvar'ion" },
			{ item_name: "Skull of vet'ion", category: 'Bosses', subcategory: "Vet'ion and Calvar'ion" },
			{ item_name: 'Voidwaker blade', category: 'Bosses', subcategory: "Vet'ion and Calvar'ion" },
			
			// Vorkath (6 items)
			{ item_name: 'Vorki', category: 'Bosses', subcategory: 'Vorkath' },
			{ item_name: "Vorkath's head", category: 'Bosses', subcategory: 'Vorkath' },
			{ item_name: 'Draconic visage', category: 'Bosses', subcategory: 'Vorkath' },
			{ item_name: 'Skeletal visage', category: 'Bosses', subcategory: 'Vorkath' },
			{ item_name: 'Jar of decay', category: 'Bosses', subcategory: 'Vorkath' },
			{ item_name: 'Dragonbone necklace', category: 'Bosses', subcategory: 'Vorkath' },
			
			// The Whisperer (10 items)
			{ item_name: 'Wisp', category: 'Bosses', subcategory: 'The Whisperer' },
			{ item_name: "Siren's staff", category: 'Bosses', subcategory: 'The Whisperer' },
			{ item_name: 'Virtus mask', category: 'Bosses', subcategory: 'The Whisperer' },
			{ item_name: 'Virtus robe top', category: 'Bosses', subcategory: 'The Whisperer' },
			{ item_name: 'Virtus robe bottom', category: 'Bosses', subcategory: 'The Whisperer' },
			{ item_name: 'Bellator vestige', category: 'Bosses', subcategory: 'The Whisperer' },
			{ item_name: 'Shadow quartz', category: 'Bosses', subcategory: 'The Whisperer' },
			{ item_name: 'Sirenic tablet', category: 'Bosses', subcategory: 'The Whisperer' },
			{ item_name: 'Chromium ingot', category: 'Bosses', subcategory: 'The Whisperer' },
			{ item_name: "Awakener's orb", category: 'Bosses', subcategory: 'The Whisperer' },
			
			// Wintertodt (10 items)
			{ item_name: 'Phoenix', category: 'Bosses', subcategory: 'Wintertodt' },
			{ item_name: 'Tome of fire (empty)', category: 'Bosses', subcategory: 'Wintertodt' },
			{ item_name: 'Burnt page', category: 'Bosses', subcategory: 'Wintertodt' },
			{ item_name: 'Pyromancer garb', category: 'Bosses', subcategory: 'Wintertodt' },
			{ item_name: 'Pyromancer hood', category: 'Bosses', subcategory: 'Wintertodt' },
			{ item_name: 'Pyromancer robe', category: 'Bosses', subcategory: 'Wintertodt' },
			{ item_name: 'Pyromancer boots', category: 'Bosses', subcategory: 'Wintertodt' },
			{ item_name: 'Warm gloves', category: 'Bosses', subcategory: 'Wintertodt' },
			{ item_name: 'Bruma torch', category: 'Bosses', subcategory: 'Wintertodt' },
			{ item_name: 'Dragon axe', category: 'Bosses', subcategory: 'Wintertodt' },
			
			// Yama (11 items)
			{ item_name: 'Yami', category: 'Bosses', subcategory: 'Yama' },
			{ item_name: 'Chasm teleport scroll', category: 'Bosses', subcategory: 'Yama' },
			{ item_name: 'Oathplate shards', category: 'Bosses', subcategory: 'Yama' },
			{ item_name: 'Oathplate helm', category: 'Bosses', subcategory: 'Yama' },
			{ item_name: 'Oathplate chest', category: 'Bosses', subcategory: 'Yama' },
			{ item_name: 'Oathplate legs', category: 'Bosses', subcategory: 'Yama' },
			{ item_name: 'Soulflame horn', category: 'Bosses', subcategory: 'Yama' },
			{ item_name: 'Rite of vile transference', category: 'Bosses', subcategory: 'Yama' },
			{ item_name: 'Forgotten lockbox', category: 'Bosses', subcategory: 'Yama' },
			{ item_name: 'Dossier', category: 'Bosses', subcategory: 'Yama' },
			{ item_name: 'Barrel of demonic tallow (full)', category: 'Bosses', subcategory: 'Yama' },
			
			// Zalcano (4 items)
			{ item_name: 'Smolcano', category: 'Bosses', subcategory: 'Zalcano' },
			{ item_name: 'Crystal tool seed', category: 'Bosses', subcategory: 'Zalcano' },
			{ item_name: 'Zalcano shard', category: 'Bosses', subcategory: 'Zalcano' },
			{ item_name: 'Uncut onyx', category: 'Bosses', subcategory: 'Zalcano' },
			
			// Zulrah (10 items)
			{ item_name: 'Pet snakeling', category: 'Bosses', subcategory: 'Zulrah' },
			{ item_name: 'Tanzanite mutagen', category: 'Bosses', subcategory: 'Zulrah' },
			{ item_name: 'Magma mutagen', category: 'Bosses', subcategory: 'Zulrah' },
			{ item_name: 'Jar of swamp', category: 'Bosses', subcategory: 'Zulrah' },
			{ item_name: 'Magic fang', category: 'Bosses', subcategory: 'Zulrah' },
			{ item_name: 'Serpentine visage', category: 'Bosses', subcategory: 'Zulrah' },
			{ item_name: 'Tanzanite fang', category: 'Bosses', subcategory: 'Zulrah' },
			{ item_name: 'Zul-andra teleport', category: 'Bosses', subcategory: 'Zulrah' },
			{ item_name: 'Uncut onyx', category: 'Bosses', subcategory: 'Zulrah' },
			{ item_name: "Zulrah's scales", category: 'Bosses', subcategory: 'Zulrah' },
		];
		
		// Insert all items
		console.log(`Inserting ${bossItems.length} boss collection log items...`);
		
		for (const item of bossItems) {
			await db.query(`
				INSERT INTO collection_log_items (item_name, category, subcategory)
				VALUES ($1, $2, $3)
				ON CONFLICT (item_name, subcategory) DO NOTHING
			`, [item.item_name, item.category, item.subcategory]);
		}
		
		console.log(`✅ Seeded ${bossItems.length} boss collection log items`);
		console.log('✅ Migration 024_seed_collection_log_bosses completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 024_seed_collection_log_bosses failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 024_seed_collection_log_bosses');
	
	try {
		await db.query(`DELETE FROM collection_log_items WHERE category = 'Bosses'`);
		console.log('✅ Removed all boss collection log items');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

