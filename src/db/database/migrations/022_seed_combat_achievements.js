/**
 * Migration: Seed Combat Achievements Reference Table
 * 
 * Populates the combat_achievements table with all current combat achievements.
 * Data sourced from: https://oldschool.runescape.wiki/w/Combat_Achievements
 * Last updated: November 2024
 * 
 * Total: 618 Combat Achievements
 */

const db = require('../index');

// Combat Achievements data - ALL OF THEM
const combatAchievements = [
	// ===== EASY (1 pt) - 38 achievements =====
	{ name: 'Noxious Foe', tier: 'Easy', type: 'Kill Count', monster: 'Aberrant Spectre', description: 'Kill an Aberrant Spectre.' },
  { name: 'Defence? What Defence?', tier: 'Easy', type: 'Restriction', monster: 'Barrows', description: 'Kill any Barrows Brother using only magical damage.' },
  { name: 'Barrows Novice', tier: 'Easy', type: 'Kill Count', monster: 'Barrows', description: 'Open the Barrows chest 10 times.' },
  { name: 'Big, Black and Fiery', tier: 'Easy', type: 'Kill Count', monster: 'Black Dragon', description: 'Kill a Black Dragon.' },
  { name: 'The Demonic Punching Bag', tier: 'Easy', type: 'Kill Count', monster: 'Bloodveld', description: 'Kill a Bloodveld.' },
  { name: 'Fighting as Intended II', tier: 'Easy', type: 'Restriction', monster: 'Bryophyta', description: 'Kill Bryophyta on a free to play world.' },
  { name: 'Protection from Moss', tier: 'Easy', type: 'Mechanical', monster: 'Bryophyta', description: 'Kill Bryophyta with the Protect from Magic prayer active.' },
  { name: 'A Slow Death', tier: 'Easy', type: 'Restriction', monster: 'Bryophyta', description: 'Kill Bryophyta with either poison or venom being the final source of damage.' },
  { name: 'Bryophyta Novice', tier: 'Easy', type: 'Kill Count', monster: 'Bryophyta', description: "Open Bryophyta's chest once." },
  { name: 'Preparation Is Key', tier: 'Easy', type: 'Perfection', monster: 'Bryophyta', description: 'Kill Bryophyta without suffering any poison damage.' },
  { name: 'Deranged Archaeologist Novice', tier: 'Easy', type: 'Kill Count', monster: 'Deranged Archaeologist', description: 'Kill the Deranged Archaeologist 10 times.' },
  { name: 'The Walking Volcano', tier: 'Easy', type: 'Kill Count', monster: 'Fire Giant', description: 'Kill a Fire Giant.' },
  { name: 'Giant Mole Novice', tier: 'Easy', type: 'Kill Count', monster: 'Giant Mole', description: 'Kill the Giant Mole 10 times.' },
  { name: 'Not So Great After All', tier: 'Easy', type: 'Restriction', monster: 'Greater Demon', description: 'Finish off a Greater Demon with a demonbane weapon.' },
  { name: 'A Greater Foe', tier: 'Easy', type: 'Kill Count', monster: 'Greater Demon', description: 'Kill a Greater Demon.' },
  { name: "A Demon's Best Friend", tier: 'Easy', type: 'Kill Count', monster: 'Hellhound', description: 'Kill a Hellhound.' },
  { name: 'King Black Dragon Novice', tier: 'Easy', type: 'Kill Count', monster: 'King Black Dragon', description: 'Kill the King Black Dragon 10 times.' },
  { name: 'A Scaley Encounter', tier: 'Easy', type: 'Kill Count', monster: 'Lizardman Shaman', description: 'Kill a Lizardman Shaman.' },
  { name: 'Shayzien Protector', tier: 'Easy', type: 'Perfection', monster: 'Lizardman Shaman', description: 'Kill a Lizardman Shaman in Molch which has not dealt damage to anyone. (excluding its Spawns)' },
  { name: 'Into the Den of Giants', tier: 'Easy', type: 'Kill Count', monster: 'N/A', description: 'Kill a Hill Giant, Moss Giant and Fire Giant in the Giant Cave within the Shayzien region.' },
  { name: 'Fighting as Intended', tier: 'Easy', type: 'Restriction', monster: 'Obor', description: 'Kill Obor on a free to play world.' },
  { name: 'Obor Novice', tier: 'Easy', type: 'Kill Count', monster: 'Obor', description: "Open Obor's chest once." },
  { name: 'Sleeping Giant', tier: 'Easy', type: 'Mechanical', monster: 'Obor', description: 'Kill Obor whilst he is immobilized.' },
  { name: 'One by one', tier: 'Easy', type: 'Restriction', monster: 'Royal Titans', description: 'Kill one Titan at a time, without attacking the other.' },
  { name: 'Let them fight', tier: 'Easy', type: 'Restriction', monster: 'Royal Titans', description: 'Kill the Royal Titans while having the Royal Titans kill a total of 10 elementals.' },
  { name: 'Elemental Company', tier: 'Easy', type: 'Restriction', monster: 'Royal Titans', description: 'Kill the Royal Titans without attacking any elementals.' },
  { name: 'Sarachnis Novice', tier: 'Easy', type: 'Kill Count', monster: 'Sarachnis', description: 'Kill Sarachnis 10 times.' },
  { name: 'Scurrius Novice', tier: 'Easy', type: 'Kill Count', monster: 'Scurrius', description: 'Kill Scurrius once.' },
  { name: 'Sit Rat', tier: 'Easy', type: 'Restriction', monster: 'Scurrius', description: 'Finish off Scurrius with a ratbane weapon in a private instance.' },
  { name: 'Calm Before the Storm', tier: 'Easy', type: 'Mechanical', monster: 'Tempoross', description: 'Repair either a mast or a totem pole.' },
  { name: 'Master of Buckets', tier: 'Easy', type: 'Mechanical', monster: 'Tempoross', description: 'Extinguish at least 5 fires during a single Tempoross fight.' },
  { name: 'Tempoross Novice', tier: 'Easy', type: 'Kill Count', monster: 'Tempoross', description: 'Subdue Tempoross 5 times.' },
  { name: 'Fire in the Hole!', tier: 'Easy', type: 'Mechanical', monster: 'Tempoross', description: 'Attack Tempoross from both sides by loading both cannons on both ships.' },
  { name: 'Mummy!', tier: 'Easy', type: 'Mechanical', monster: 'Wintertodt', description: 'Heal a pyromancer after they have fallen.' },
  { name: 'Wintertodt Novice', tier: 'Easy', type: 'Kill Count', monster: 'Wintertodt', description: 'Subdue the Wintertodt 5 times.' },
  { name: 'Cosy', tier: 'Easy', type: 'Restriction', monster: 'Wintertodt', description: 'Subdue the Wintertodt with four pieces of warm equipment equipped.' },
  { name: 'Handyman', tier: 'Easy', type: 'Mechanical', monster: 'Wintertodt', description: 'Repair a brazier which has been destroyed by the Wintertodt.' },
  { name: 'A Slithery Encounter', tier: 'Easy', type: 'Kill Count', monster: 'Wyrm', description: 'Kill a Wyrm.' },

	// ===== MEDIUM (2 pts) - 56 achievements =====
	{ name: 'Temotli Triumph', tier: 'Medium', type: 'Restriction', monster: 'Amoxliatl', description: 'Kill Amoxliatl using only glacial temotli as a weapon.' },
  { name: 'Amoxliatl Champion', tier: 'Medium', type: 'Kill Count', monster: 'Amoxliatl', description: 'Kill Amoxliatl once.' },
  { name: 'Pray for Success', tier: 'Medium', type: 'Perfection', monster: 'Barrows', description: 'Kill all six Barrows Brothers and loot the Barrows chest without taking any damage from any of the brothers.' },
  { name: 'Barrows Champion', tier: 'Medium', type: 'Kill Count', monster: 'Barrows', description: 'Open the Barrows chest 25 times.' },
  { name: "Can't Touch Me", tier: 'Medium', type: 'Mechanical', monster: 'Barrows', description: 'Kill Dharok, Verac, Torag and Guthan without letting them attack you with melee.' },
  { name: 'Brutal, Big, Black and Firey', tier: 'Medium', type: 'Kill Count', monster: 'Brutal Black Dragon', description: 'Kill a Brutal Black Dragon.' },
  { name: 'Quick Cutter', tier: 'Medium', type: 'Mechanical', monster: 'Bryophyta', description: "Kill all 3 of Bryophyta's growthlings within 3 seconds of the first one dying." },
  { name: 'Bryophyta Champion', tier: 'Medium', type: 'Kill Count', monster: 'Bryophyta', description: "Open Bryophyta's chest 5 times." },
  { name: 'Sorry, What Was That?', tier: 'Medium', type: 'Perfection', monster: 'Chaos Fanatic', description: 'Kill the Chaos Fanatic without anyone being hit by his explosion attack.' },
  { name: 'Chaos Fanatic Champion', tier: 'Medium', type: 'Kill Count', monster: 'Chaos Fanatic', description: 'Kill the Chaos Fanatic 10 times.' },
  { name: "I'd Rather Not Learn", tier: 'Medium', type: 'Perfection', monster: 'Crazy Archaeologist', description: 'Kill the Crazy Archaeologist without anyone being hit by his "Rain of Knowledge" attack.' },
  { name: 'Crazy Archaeologist Champion', tier: 'Medium', type: 'Kill Count', monster: 'Crazy Archaeologist', description: 'Kill the Crazy Archaeologist 10 times.' },
  { name: 'Mage of the Ruins', tier: 'Medium', type: 'Mechanical', monster: 'Crazy Archaeologist', description: 'Kill the Crazy Archaeologist with only magical attacks.' },
  { name: 'Dagannoth Prime Champion', tier: 'Medium', type: 'Kill Count', monster: 'Dagannoth Prime', description: 'Kill Dagannoth Prime 10 times.' },
  { name: 'Dagannoth Rex Champion', tier: 'Medium', type: 'Kill Count', monster: 'Dagannoth Rex', description: 'Kill Dagannoth Rex 10 times.' },
  { name: 'A Frozen King', tier: 'Medium', type: 'Mechanical', monster: 'Dagannoth Rex', description: 'Kill Dagannoth Rex whilst he is immobilized.' },
  { name: 'Dagannoth Supreme Champion', tier: 'Medium', type: 'Kill Count', monster: 'Dagannoth Supreme', description: 'Kill Dagannoth Supreme 10 times.' },
  { name: "I'd Rather Be Illiterate", tier: 'Medium', type: 'Perfection', monster: 'Deranged Archaeologist', description: 'Kill the Deranged Archaeologist without anyone being hit by his "Learn to Read" attack.' },
  { name: 'Deranged Archaeologist Champion', tier: 'Medium', type: 'Kill Count', monster: 'Deranged Archaeologist', description: 'Kill the Deranged Archaeologist 25 times.' },
  { name: 'Mage of the Swamp', tier: 'Medium', type: 'Mechanical', monster: 'Deranged Archaeologist', description: 'Kill the Deranged Archaeologist with only magical attacks.' },
  { name: 'A Smashing Time', tier: 'Medium', type: 'Kill Count', monster: 'Gargoyle', description: 'Kill a Gargoyle.' },
  { name: 'Giant Mole Champion', tier: 'Medium', type: 'Kill Count', monster: 'Giant Mole', description: 'Kill the Giant mole 25 times.' },
  { name: 'Avoiding Those Little Arms', tier: 'Medium', type: 'Perfection', monster: 'Giant Mole', description: 'Kill the Giant Mole without her damaging anyone.' },
  { name: 'Claw Clipper', tier: 'Medium', type: 'Mechanical', monster: 'King Black Dragon', description: 'Kill the King Black Dragon with the Protect from Melee prayer activated.' },
  { name: 'Hide Penetration', tier: 'Medium', type: 'Restriction', monster: 'King Black Dragon', description: 'Kill the King Black Dragon with a stab weapon.' },
  { name: 'King Black Dragon Champion', tier: 'Medium', type: 'Kill Count', monster: 'King Black Dragon', description: 'Kill the King Black Dragon 25 times.' },
  { name: 'Antifire Protection', tier: 'Medium', type: 'Restriction', monster: 'King Black Dragon', description: 'Kill the King Black Dragon with an antifire potion active and an antidragon shield equipped.' },
  { name: 'Master of Broad Weaponry', tier: 'Medium', type: 'Kill Count', monster: 'Kurask', description: 'Kill a Kurask.' },
  { name: 'Moons of Peril Speed-Trialist', tier: 'Medium', type: 'Speed', monster: 'Moons of Peril', description: 'Defeat all three Moons in one run in under 8 minutes.' },
  { name: 'Perilous Novice', tier: 'Medium', type: 'Kill Count', monster: 'Moons of Peril', description: 'Open the Reward Chest 5 times.' },
  { name: 'Lunar Triplet', tier: 'Medium', type: 'Kill Count', monster: 'Moons of Peril', description: 'Open the Reward Chest after defeating all three Moons.' },
  { name: 'Back to Our Roots', tier: 'Medium', type: 'Restriction', monster: 'Moons of Peril', description: 'Defeat all three Moons in one run by only attacking with a Dragon Scimitar.' },
  { name: 'Sit Back and Relax', tier: 'Medium', type: 'Mechanical', monster: 'N/A', description: 'Deal 100 damage to creatures using undead thralls.' },
  { name: 'Back to the Wall', tier: 'Medium', type: 'Mechanical', monster: 'Obor', description: 'Kill Obor without being pushed back more than one square by his knockback attack.' },
  { name: 'Squashing the Giant', tier: 'Medium', type: 'Perfection', monster: 'Obor', description: 'Kill Obor without taking any damage off prayer.' },
  { name: 'Obor Champion', tier: 'Medium', type: 'Kill Count', monster: 'Obor', description: "Open Obor's chest 5 times." },
  { name: 'It takes too long', tier: 'Medium', type: 'Mechanical', monster: 'Royal Titans', description: 'Kill both Royal Titans while they are charging up their area attack. Both titans must die during the same charging phase.' },
  { name: 'Royal Titan Adept', tier: 'Medium', type: 'Kill Count', monster: 'Royal Titans', description: 'Kill the Royal Titans 25 times.' },
  { name: 'Royal Titan Champion', tier: 'Medium', type: 'Kill Count', monster: 'Royal Titans', description: 'Kill the Royal Titans 10 times.' },
  { name: 'Newspaper Enthusiast', tier: 'Medium', type: 'Restriction', monster: 'Sarachnis', description: 'Kill Sarachnis with a crush weapon.' },
  { name: 'Sarachnis Champion', tier: 'Medium', type: 'Kill Count', monster: 'Sarachnis', description: 'Kill Sarachnis 25 times.' },
  { name: 'Scurrius Champion', tier: 'Medium', type: 'Kill Count', monster: 'Scurrius', description: 'Kill Scurrius 10 times.' },
  { name: 'Efficient Pest Control', tier: 'Medium', type: 'Mechanical', monster: 'Scurrius', description: "Kill 6 Giant Rats within Scurrius' lair in 3 seconds." },
  { name: 'Perfect Scurrius', tier: 'Medium', type: 'Perfection', monster: 'Scurrius', description: 'Kill Scurrius in a private instance without taking damage from the following attacks: Tail Swipe and Falling Bricks. Pray correctly against the following attacks: Flying Fur and Bolts of Electricity.' },
  { name: 'A Frozen Foe from the Past', tier: 'Medium', type: 'Kill Count', monster: 'Skeletal Wyvern', description: 'Kill a Skeletal Wyvern' },
  { name: 'Demonbane Weaponry', tier: 'Medium', type: 'Restriction', monster: 'Skotizo', description: 'Kill Skotizo with a demonbane weapon equipped.' },
  { name: 'Skotizo Champion', tier: 'Medium', type: 'Kill Count', monster: 'Skotizo', description: 'Kill Skotizo once.' },
  { name: 'Demonic Weakening', tier: 'Medium', type: 'Mechanical', monster: 'Skotizo', description: 'Kill Skotizo with no altars active.' },
  { name: 'The Lone Angler', tier: 'Medium', type: 'Perfection', monster: 'Tempoross', description: 'Subdue Tempoross alone without getting hit by any fires, torrents or waves.' },
  { name: 'Tempoross Champion', tier: 'Medium', type: 'Kill Count', monster: 'Tempoross', description: 'Subdue Tempoross 10 times.' },
  { name: 'Hueycoatl Champion', tier: 'Medium', type: 'Kill Count', monster: 'The Hueycoatl', description: 'Kill the Hueycoatl once.' },
  { name: "You're a wizard", tier: 'Medium', type: 'Restriction', monster: 'The Hueycoatl', description: 'Kill the Hueycoatl using only earth spells.' },
  { name: 'Can We Fix It?', tier: 'Medium', type: 'Perfection', monster: 'Wintertodt', description: 'Subdue the Wintertodt without allowing all 4 braziers to be broken at the same time.' },
  { name: 'Wintertodt Champion', tier: 'Medium', type: 'Kill Count', monster: 'Wintertodt', description: 'Subdue the Wintertodt 10 times.' },
  { name: 'Leaving No One Behind', tier: 'Medium', type: 'Restriction', monster: 'Wintertodt', description: 'Subdue the Wintertodt without any of the Pyromancers falling.' },
	
	// ===== HARD (3 pts) - 76 achievements =====
  { name: 'Abyssal Adept', tier: 'Hard', type: 'Kill Count', monster: 'Abyssal Sire', description: 'Kill the Abyssal Sire 20 times.' },
  { name: "Don't Whip Me", tier: 'Hard', type: 'Mechanical', monster: 'Abyssal Sire', description: 'Kill the Abyssal Sire without being hit by any external tentacles.' },
  { name: "Don't Stop Moving", tier: 'Hard', type: 'Perfection', monster: 'Abyssal Sire', description: 'Kill the Abyssal Sire without taking damage from any miasma pools.' },
  { name: 'They Grow Up Too Fast', tier: 'Hard', type: 'Mechanical', monster: 'Abyssal Sire', description: 'Kill the Abyssal Sire without letting any Scion mature.' },
  { name: 'Nagua Negation', tier: 'Hard', type: 'Perfection', monster: 'Amoxliatl', description: 'Kill Amoxliatl without taking any damage.' },
  { name: 'Kemo Makti', tier: 'Hard', type: 'Stamina', monster: 'Amoxliatl', description: 'Kill Amoxliatl 10 times without leaving her chamber.' },
  { name: 'Amoxliatl Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Amoxliatl', description: 'Kill Amoxliatl in less than 1 minute.' },
  { name: 'Amoxliatl Adept', tier: 'Hard', type: 'Kill Count', monster: 'Amoxliatl', description: 'Kill Amoxliatl 20 times.' },
  { name: 'Totally Shattered', tier: 'Hard', type: 'Mechanical', monster: 'Amoxliatl', description: 'Kill Amoxliatl without any of her unstable ice shattering.' },
  { name: 'Just Like That', tier: 'Hard', type: 'Restriction', monster: 'Barrows', description: 'Kill Karil using only damage dealt by special attacks.' },
  { name: 'Faithless Crypt Run', tier: 'Hard', type: 'Restriction', monster: 'Barrows', description: 'Kill all six Barrows Brothers and loot the Barrows chest without ever having more than 0 prayer points.' },
  { name: 'Callisto Adept', tier: 'Hard', type: 'Kill Count', monster: 'Callisto', description: 'Kill Callisto 10 times.' },
  { name: 'The Flincher', tier: 'Hard', type: 'Perfection', monster: 'Chaos Elemental', description: 'Kill the Chaos Elemental without taking any damage from its attacks.' },
  { name: 'Chaos Elemental Adept', tier: 'Hard', type: 'Kill Count', monster: 'Chaos Elemental', description: 'Kill the Chaos Elemental 10 times.' },
  { name: 'Hoarder', tier: 'Hard', type: 'Mechanical', monster: 'Chaos Elemental', description: 'Kill the Chaos Elemental without it unequipping any of your items.' },
  { name: 'Praying to the Gods', tier: 'Hard', type: 'Restriction', monster: 'Chaos Fanatic', description: 'Kill the Chaos Fanatic 10 times without drinking any potion which restores prayer or leaving the Wilderness.' },
  { name: 'Chaos Fanatic Adept', tier: 'Hard', type: 'Kill Count', monster: 'Chaos Fanatic', description: 'Kill the Chaos Fanatic 25 times.' },
  { name: 'Commander Zilyana Adept', tier: 'Hard', type: 'Kill Count', monster: 'Commander Zilyana', description: 'Kill Commander Zilyana 50 times.' },
  { name: 'Commander Showdown', tier: 'Hard', type: 'Mechanical', monster: 'Commander Zilyana', description: 'Finish off Commander Zilyana while all of her bodyguards are dead.' },
  { name: 'Crazy Archaeologist Adept', tier: 'Hard', type: 'Kill Count', monster: 'Crazy Archaeologist', description: 'Kill the Crazy Archaeologist 25 times.' },
  { name: 'Dagannoth Prime Adept', tier: 'Hard', type: 'Kill Count', monster: 'Dagannoth Prime', description: 'Kill Dagannoth Prime 25 times.' },
  { name: 'Dagannoth Rex Adept', tier: 'Hard', type: 'Kill Count', monster: 'Dagannoth Rex', description: 'Kill Dagannoth Rex 25 times.' },
  { name: 'Dagannoth Supreme Adept', tier: 'Hard', type: 'Kill Count', monster: 'Dagannoth Supreme', description: 'Kill Dagannoth Supreme 25 times.' },
  { name: 'General Showdown', tier: 'Hard', type: 'Mechanical', monster: 'General Graardor', description: 'Finish off General Graardor whilst all of his bodyguards are dead.' },
  { name: 'General Graardor Adept', tier: 'Hard', type: 'Kill Count', monster: 'General Graardor', description: 'Kill General Graardor 50 times.' },
  { name: 'Ourg Freezer', tier: 'Hard', type: 'Mechanical', monster: 'General Graardor', description: 'Kill General Graardor whilst he is immobilized.' },
  { name: 'Whack-a-Mole', tier: 'Hard', type: 'Mechanical', monster: 'Giant Mole', description: 'Kill the Giant Mole within 10 seconds of her resurfacing.' },
  { name: 'Why Are You Running?', tier: 'Hard', type: 'Mechanical', monster: 'Giant Mole', description: 'Kill the Giant Mole without her burrowing more than 2 times.' },
  { name: 'Prison Break', tier: 'Hard', type: 'Mechanical', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians without taking damage from Dusk\'s prison attack.' },
  { name: "Don't Look at the Eclipse", tier: 'Hard', type: 'Mechanical', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians without taking damage from Dusk\'s blinding attack.' },
  { name: 'Granite Footwork', tier: 'Hard', type: 'Mechanical', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians without taking damage from Dawn\'s rockfall attack.' },
  { name: 'Static Awareness', tier: 'Hard', type: 'Mechanical', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians without being hit by any lightning attacks.' },
  { name: 'Grotesque Guardians Adept', tier: 'Hard', type: 'Kill Count', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians 25 times.' },
  { name: 'Heal No More', tier: 'Hard', type: 'Mechanical', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians without letting Dawn receive any healing from her orbs.' },
  { name: 'Weed Whacker', tier: 'Hard', type: 'Mechanical', monster: 'Hespori', description: 'Kill all of Hesporis flowers within 5 seconds.' },
  { name: "Hesporisn't", tier: 'Hard', type: 'Mechanical', monster: 'Hespori', description: 'Finish off Hespori with a special attack.' },
  { name: 'Hespori Adept', tier: 'Hard', type: 'Kill Count', monster: 'Hespori', description: 'Kill Hespori 5 times.' },
  { name: 'Yarr No More', tier: 'Hard', type: 'Mechanical', monster: "K'ril Tsutsaroth", description: 'Receive kill-credit for K\'ril Tsutsaroth without him using his special attack.' },
  { name: 'Demonic Showdown', tier: 'Hard', type: 'Mechanical', monster: "K'ril Tsutsaroth", description: 'Finish off K\'ril Tsutsaroth whilst all of his bodyguards are dead.' },
  { name: "K'ril Tsutsaroth Adept", tier: 'Hard', type: 'Kill Count', monster: "K'ril Tsutsaroth", description: 'Kill K\'ril Tsutsaroth 50 times.' },
  { name: 'Demonbane Weaponry II', tier: 'Hard', type: 'Restriction', monster: "K'ril Tsutsaroth", description: 'Finish off K\'ril Tsutsaroth with a demonbane weapon.' },
  { name: 'Chitin Penetrator', tier: 'Hard', type: 'Mechanical', monster: 'Kalphite Queen', description: 'Kill the Kalphite Queen while her defence was last lowered by you.' },
  { name: 'Kalphite Queen Adept', tier: 'Hard', type: 'Kill Count', monster: 'Kalphite Queen', description: 'Kill the Kalphite Queen 25 times.' },
  { name: 'Who Is the King Now?', tier: 'Hard', type: 'Stamina', monster: 'King Black Dragon', description: 'Kill The King Black Dragon 10 times in a private instance without leaving the instance.' },
  { name: 'Unnecessary Optimisation', tier: 'Hard', type: 'Mechanical', monster: 'Kraken', description: 'Kill the Kraken after killing all four tentacles.' },
  { name: "Krakan't Hurt Me", tier: 'Hard', type: 'Stamina', monster: 'Kraken', description: 'Kill the Kraken 25 times in a private instance without leaving the room.' },
  { name: 'Kraken Adept', tier: 'Hard', type: 'Kill Count', monster: 'Kraken', description: 'Kill the Kraken 20 times.' },
  { name: "Kree'arra Adept", tier: 'Hard', type: 'Kill Count', monster: "Kree'arra", description: 'Kill Kree\'arra 50 times.' },
  { name: 'Airborne Showdown', tier: 'Hard', type: 'Mechanical', monster: "Kree'arra", description: 'Finish off Kree\'arra whilst all of his bodyguards are dead.' },
  { name: 'Perilous Dancer', tier: 'Hard', type: 'Perfection', monster: 'Moons of Peril', description: 'Defeat all the Moons in one run while only taking damage from regular attacks.' },
  { name: 'Fortified', tier: 'Hard', type: 'Restriction', monster: 'Moons of Peril', description: 'Defeat a Moon without consuming any supplies.' },
  { name: 'Betrayal', tier: 'Hard', type: 'Restriction', monster: 'Moons of Peril', description: 'Defeat a Moon using its associated weapon drop.' },
  { name: 'Fat of the Land', tier: 'Hard', type: 'Stamina', monster: 'Moons of Peril', description: 'Defeat 30 Moons of Peril bosses without leaving the dungeon.' },
  { name: 'Moons of Peril Speed-Chaser', tier: 'Hard', type: 'Speed', monster: 'Moons of Peril', description: 'Defeat all three Moons in one run in under 6 minutes.' },
  { name: 'The Clone Zone', tier: 'Hard', type: 'Mechanical', monster: 'Moons of Peril', description: 'Defeat the Eclipse moon by only attacking its clones.' },
  { name: 'Perilous Champion', tier: 'Hard', type: 'Kill Count', monster: 'Moons of Peril', description: 'Open the Reward Chest 25 times.' },
  { name: 'Phantom Muspah Adept', tier: 'Hard', type: 'Kill Count', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah.' },
  { name: 'Royal Titan Speed-Runner', tier: 'Hard', type: 'Speed', monster: 'Royal Titans', description: 'Kill the Royal Titans in less than 1:30 minutes.' },
  { name: 'Perfect Royal Titans', tier: 'Hard', type: 'Perfection', monster: 'Royal Titans', description: 'Kill the Royal Titans without getting hit by any avoidable damage. This includes: Melee attacks, Explosions from the ice or fire elemental, Icicle or fire spawn damage, and Ice or fire pulse attacks.' },
  { name: 'I need room', tier: 'Hard', type: 'Restriction', monster: 'Royal Titans', description: 'Kill the Royal Titans while extinguishing all fires and melting all icicles before they dissipate naturally.' },
  { name: 'Titan Killer', tier: 'Hard', type: 'Stamina', monster: 'Royal Titans', description: 'Kill the Royal Titans 15 times without anyone leaving the instance. If a player joins the fight, the current streak will be reset to 0. If a player leaves the fight, the task will be failed and a new instance will need to be created.' },
  { name: 'Ready to Pounce', tier: 'Hard', type: 'Mechanical', monster: 'Sarachnis', description: 'Kill Sarachnis without her using her range attack twice in a row.' },
  { name: 'Inspect Repellent', tier: 'Hard', type: 'Perfection', monster: 'Sarachnis', description: 'Kill Sarachnis without her dealing damage to anyone.' },
  { name: "I Can't Reach That", tier: 'Hard', type: 'Perfection', monster: 'Scorpia', description: 'Kill Scorpia without taking any damage from her.' },
  { name: 'Guardians No More', tier: 'Hard', type: 'Restriction', monster: 'Scorpia', description: 'Kill Scorpia without killing her guardians.' },
  { name: 'Scorpia Adept', tier: 'Hard', type: 'Kill Count', monster: 'Scorpia', description: 'Kill Scorpia 10 times.' },
  { name: 'Skotizo Adept', tier: 'Hard', type: 'Kill Count', monster: 'Skotizo', description: 'Kill Skotizo 5 times.' },
  { name: 'Dress Like You Mean It', tier: 'Hard', type: 'Restriction', monster: 'Tempoross', description: 'Subdue Tempoross while wearing any variation of the angler outfit.' },
  { name: 'Why Cook?', tier: 'Hard', type: 'Mechanical', monster: 'Tempoross', description: 'Subdue Tempoross, getting rewarded with 10 reward permits from a single Tempoross fight.' },
  { name: 'Pillar Lover', tier: 'Hard', type: 'Mechanical', monster: 'The Hueycoatl', description: 'Kill the Hueycoatl whilst it is vulnerable.' },
  { name: 'Hueycoatl Adept', tier: 'Hard', type: 'Kill Count', monster: 'The Hueycoatl', description: 'Kill the Hueycoatl 10 times.' },
  { name: "I'm your son", tier: 'Hard', type: 'Restriction', monster: 'The Hueycoatl', description: 'Kill the Hueycoatl whilst wearing two pieces of Hueycoatl armour.' },
  { name: 'Nightmare Adept', tier: 'Hard', type: 'Kill Count', monster: 'The Nightmare', description: 'Kill The Nightmare once.' },
  { name: 'Theatre of Blood: SM Adept', tier: 'Hard', type: 'Kill Count', monster: 'Theatre of Blood: Entry Mode', description: 'Complete the Theatre of Blood: Entry Mode 1 time.' },
  { name: 'Confident Raider', tier: 'Hard', type: 'Restriction', monster: 'Tombs of Amascut: Entry Mode', description: 'Complete a Tombs of Amascut raid at level 100 or above.' },
  { name: 'Novice Tomb Looter', tier: 'Hard', type: 'Kill Count', monster: 'Tombs of Amascut: Entry Mode', description: 'Complete the Tombs of Amascut in Entry mode (or above) 25 times.' },
  { name: "Movin' on up", tier: 'Hard', type: 'Restriction', monster: 'Tombs of Amascut: Entry Mode', description: 'Complete a Tombs of Amascut raid at level 50 or above.' },
  { name: 'Novice Tomb Explorer', tier: 'Hard', type: 'Kill Count', monster: 'Tombs of Amascut: Entry Mode', description: 'Complete the Tombs of Amascut in Entry mode (or above) once.' },
  { name: 'Venenatis Adept', tier: 'Hard', type: 'Kill Count', monster: 'Venenatis', description: 'Kill Venenatis 10 times.' },
  { name: "Vet'ion Adept", tier: 'Hard', type: 'Kill Count', monster: "Vet'ion", description: 'Kill Vet\'ion 10 times.' },
  { name: 'Why Fletch?', tier: 'Hard', type: 'Stamina', monster: 'Wintertodt', description: 'Subdue the Wintertodt after earning 3000 or more points.' },
  { name: 'Zulrah Adept', tier: 'Hard', type: 'Kill Count', monster: 'Zulrah', description: 'Kill Zulrah 25 times.' },
	
	// ===== ELITE (4 pts) - 194 achievements =====
	{ name: 'Abyssal Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Abyssal Sire', description: 'Kill the Abyssal Sire 50 times.' },
	{ name: 'Demonic Rebound', tier: 'Hard', type: 'Mechanical', monster: 'Abyssal Sire', description: "Use the Vengeance spell to reflect the damage from the Abyssal Sire's explosion back to him." },
	{ name: 'Perfect Sire', tier: 'Hard', type: 'Perfection', monster: 'Abyssal Sire', description: 'Kill the Abyssal Sire without taking damage from the external tentacles, miasma pools, explosion or damage from the Abyssal Sire without praying the appropriate protection prayer.' },
	{ name: 'Respiratory Runner', tier: 'Hard', type: 'Mechanical', monster: 'Abyssal Sire', description: 'Kill the Abyssal Sire after only stunning him once.' },
	{ name: 'Alchemical Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra 75 times.' },
	{ name: 'Amoxliatl Speed-Chaser', tier: 'Hard', type: 'Speed', monster: 'Amoxliatl', description: 'Kill Amoxliatl in less than 30 seconds.' },
	{ name: "Without Ralos' Light", tier: 'Hard', type: 'Restriction', monster: 'Amoxliatl', description: 'Kill Amoxliatl without losing any prayer points.' },
	{ name: 'Araxxor Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Araxxor', description: 'Kill Araxxor 4 times in 10:00.' },
	{ name: 'Araxxor Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Araxxor', description: 'Kill Araxxor 25 times.' },
	{ name: 'Relaxxor', tier: 'Hard', type: 'Restriction', monster: 'Araxxor', description: 'Kill Araxxor after destroying six eggs.' },

	{ name: 'Reflecting on This Encounter', tier: 'Hard', type: 'Kill Count', monster: 'Basilisk Knight', description: 'Kill a Basilisk Knight.' },

	{ name: 'Callisto Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Callisto', description: 'Kill Callisto 20 times.' },

	{ name: 'Cerberus Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Cerberus', description: 'Kill Cerberus 75 times.' },
	{ name: 'Anti-Bite Mechanics', tier: 'Hard', type: 'Perfection', monster: 'Cerberus', description: 'Kill Cerberus without taking any melee damage.' },
	{ name: 'Ghost Buster', tier: 'Hard', type: 'Mechanical', monster: 'Cerberus', description: 'Kill Cerberus after successfully negating 6 or more attacks from Summoned Souls.' },
	{ name: 'Unrequired Antifire', tier: 'Hard', type: 'Perfection', monster: 'Cerberus', description: 'Kill Cerberus without taking damage from any lava pools.' },

	{ name: 'Dancing with Statues', tier: 'Hard', type: 'Perfection', monster: 'Chambers of Xeric', description: 'Receive kill-credit for a Stone Guardian without taking damage from falling rocks.' },
	{ name: 'Blizzard Dodger', tier: 'Hard', type: 'Restriction', monster: 'Chambers of Xeric', description: 'Receive kill-credit for the Ice Demon without activating the Protect from Range prayer.' },
	{ name: 'Undying Raid Team', tier: 'Hard', type: 'Perfection', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric raid without anyone dying.' },
	{ name: "Together We'll Fall", tier: 'Hard', type: 'Mechanical', monster: 'Chambers of Xeric', description: 'Kill the Vanguards within 10 seconds of the first one dying.' },
	{ name: 'Chambers of Xeric Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Chambers of Xeric', description: 'Complete the Chambers of Xeric 25 times.' },
	{ name: 'Kill It with Fire', tier: 'Hard', type: 'Restriction', monster: 'Chambers of Xeric', description: 'Finish off the Ice Demon with a fire spell.' },
	{ name: 'Cryo No More', tier: 'Hard', type: 'Perfection', monster: 'Chambers of Xeric', description: 'Receive kill-credit for the Ice Demon without taking any damage.' },
	{ name: 'Mutta-diet', tier: 'Hard', type: 'Mechanical', monster: 'Chambers of Xeric', description: 'Kill the Muttadile without letting her or her baby recover hitpoints from the meat tree.' },
	{ name: 'Perfectly Balanced', tier: 'Hard', type: 'Mechanical', monster: 'Chambers of Xeric', description: 'Kill the Vanguards without them resetting their health.' },
	{ name: 'Redemption Enthusiast', tier: 'Hard', type: 'Mechanical', monster: 'Chambers of Xeric', description: 'Kill the Abyssal Portal without forcing Vespula to land.' },
	{ name: 'Shayzien Specialist', tier: 'Hard', type: 'Perfection', monster: 'Chambers of Xeric', description: 'Receive kill-credit for a Lizardman Shaman without taking damage from any shamans in the room.' },

	{ name: 'Dust Seeker', tier: 'Hard', type: 'Speed', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric Challenge mode raid in the target time.' },

	{ name: 'Chaos Elemental Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Chaos Elemental', description: 'Kill the Chaos Elemental 25 times.' },

	{ name: 'Reminisce', tier: 'Hard', type: 'Restriction', monster: 'Commander Zilyana', description: 'Kill Commander Zilyana in a private instance with melee only.' },
	{ name: 'Commander Zilyana Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Commander Zilyana', description: 'Kill Commander Zilyana 100 times.' },

	{ name: 'Finding the Weak Spot', tier: 'Hard', type: 'Restriction', monster: 'Corporeal Beast', description: 'Finish off the Corporeal Beast with a Halberd special attack.' },
	{ name: 'Corporeal Beast Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Corporeal Beast', description: 'Kill the Corporeal Beast 25 times.' },
	{ name: 'Hot on Your Feet', tier: 'Hard', type: 'Perfection', monster: 'Corporeal Beast', description: 'Kill the Corporeal Beast without anyone killing the dark core or taking damage from the dark core.' },
	{ name: 'Chicken Killer', tier: 'Hard', type: 'Restriction', monster: 'Corporeal Beast', description: 'Kill the Corporeal Beast solo.' },

	{ name: '3, 2, 1 - Mage', tier: 'Hard', type: 'Perfection', monster: 'Corrupted Hunllef', description: 'Kill the Corrupted Hunllef without taking damage off prayer.' },
	{ name: 'Corrupted Gauntlet Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Corrupted Hunllef', description: 'Complete the Corrupted Gauntlet 5 times.' },

	{ name: 'Crystalline Warrior', tier: 'Hard', type: 'Restriction', monster: 'Crystalline Hunllef', description: 'Kill the Crystalline Hunllef with a full set of perfected armour equipped.' },
	{ name: 'Wolf Puncher', tier: 'Hard', type: 'Restriction', monster: 'Crystalline Hunllef', description: 'Kill the Crystalline Hunllef without making more than one attuned weapon.' },
	{ name: 'Gauntlet Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Crystalline Hunllef', description: 'Complete the Gauntlet 5 times.' },
	{ name: '3, 2, 1 - Range', tier: 'Hard', type: 'Perfection', monster: 'Crystalline Hunllef', description: 'Kill the Crystalline Hunllef without taking damage off prayer.' },
	{ name: 'Egniol Diet', tier: 'Hard', type: 'Restriction', monster: 'Crystalline Hunllef', description: 'Kill the Crystalline Hunllef without making an egniol potion within the Gauntlet.' },

	{ name: 'Death to the Seer King', tier: 'Hard', type: 'Mechanical', monster: 'Dagannoth Prime', description: 'Kill Dagannoth Prime whilst under attack by Dagannoth Supreme and Dagannoth Rex.' },
	{ name: 'From One King to Another', tier: 'Hard', type: 'Mechanical', monster: 'Dagannoth Prime', description: 'Kill Prime using a Rune Thrownaxe special attack, bounced off Dagannoth Rex.' },

	{ name: 'Toppling the Diarchy', tier: 'Hard', type: 'Mechanical', monster: 'Dagannoth Rex', description: 'Kill Dagannoth Rex and one other Dagannoth king at the exact same time.' },
	{ name: 'Death to the Warrior King', tier: 'Hard', type: 'Mechanical', monster: 'Dagannoth Rex', description: 'Kill Dagannoth Rex whilst under attack by Dagannoth Supreme and Dagannoth Prime.' },

	{ name: 'Rapid Succession', tier: 'Hard', type: 'Mechanical', monster: 'Dagannoth Supreme', description: 'Kill all three Dagannoth Kings within 9 seconds of the first one.' },
	{ name: 'Death to the Archer King', tier: 'Hard', type: 'Mechanical', monster: 'Dagannoth Supreme', description: 'Kill Dagannoth Supreme whilst under attack by Dagannoth Prime and Dagannoth Rex.' },

	{ name: 'If Gorillas Could Fly', tier: 'Hard', type: 'Kill Count', monster: 'Demonic Gorilla', description: 'Kill a Demonic Gorilla.' },
	{ name: 'Hitting Them Where It Hurts', tier: 'Hard', type: 'Restriction', monster: 'Demonic Gorilla', description: 'Finish off a Demonic Gorilla with a demonbane weapon.' },

	{ name: 'Doom Adept', tier: 'Hard', type: 'Kill Count', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl at delve level 3.' },
	{ name: 'Doom Crawler', tier: 'Hard', type: 'Speed', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl level 1 in less than 30 seconds.' },
	{ name: 'Exposed Doom', tier: 'Hard', type: 'Mechanical', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl during its Melee charge phase.' },

	{ name: 'Duke Sucellus Adept', tier: 'Hard', type: 'Kill Count', monster: 'Duke Sucellus', description: 'Kill Duke Sucellus once.' },
	{ name: 'Duke Sucellus Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Duke Sucellus', description: 'Kill Duke Sucellus in less than 1:00 minutes without a slayer task.' },

	{ name: 'I was here first!', tier: 'Hard', type: 'Mechanical', monster: 'Fortis Colosseum', description: 'Kill a Jaguar Warrior using a Claw-type weapon special attack.' },
	{ name: 'Denied', tier: 'Hard', type: 'Mechanical', monster: 'Fortis Colosseum', description: 'Complete Wave 7 without the Minotaur ever healing other enemies.' },
	{ name: 'Furball', tier: 'Hard', type: 'Perfection', monster: 'Fortis Colosseum', description: 'Complete Wave 4 without taking avoidable damage from a Manticore.' },

	{ name: 'Fragment of Seren Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Fragment of Seren', description: 'Kill The Fragment of Seren in less than 4 minutes.' },

	{ name: 'Galvek Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Galvek', description: 'Kill Galvek in less than 3 minutes.' },

	{ name: 'Ourg Freezer II', tier: 'Hard', type: 'Mechanical', monster: 'General Graardor', description: 'Kill General Graardor without him attacking any players.' },
	{ name: 'General Graardor Veteran', tier: 'Hard', type: 'Kill Count', monster: 'General Graardor', description: 'Kill General Graardor 100 times.' },

	{ name: 'Hard Hitter', tier: 'Hard', type: 'Mechanical', monster: 'Giant Mole', description: 'Kill the Giant Mole with 4 or fewer instances of damage.' },

	{ name: 'Glough Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Glough', description: 'Kill Glough in less than 2 minutes and 30 seconds.' },

	{ name: 'Perfect Grotesque Guardians', tier: 'Hard', type: 'Perfection', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians whilst completing the "Don\'t look at the eclipse", "Prison Break", "Granite Footwork", "Heal no more", "Static Awareness" and "Done before dusk" tasks.' },
	{ name: 'Done before Dusk', tier: 'Hard', type: 'Mechanical', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians before Dusk uses his prison attack for a second time.' },
	{ name: 'Grotesque Guardians Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians in less than 2 minutes.' },
	{ name: 'Grotesque Guardians Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians 50 times.' },
	{ name: 'From Dusk...', tier: 'Hard', type: 'Stamina', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians 10 times without leaving the instance.' },

	{ name: 'Hespori Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Hespori', description: 'Kill the Hespori in less than 48 seconds.' },
	{ name: 'Plant-Based Diet', tier: 'Hard', type: 'Restriction', monster: 'Hespori', description: 'Kill Hespori without losing any prayer points.' },

	{ name: 'The Bane of Demons', tier: 'Hard', type: 'Mechanical', monster: "K'ril Tsutsaroth", description: "Defeat K'ril Tsutsaroth in a private instance using only demonbane spells." },
	{ name: "K'ril Tsutsaroth Veteran", tier: 'Hard', type: 'Kill Count', monster: "K'ril Tsutsaroth", description: "Kill K'ril Tsutsaroth 100 times." },
	{ name: 'Demonic Defence', tier: 'Hard', type: 'Perfection', monster: "K'ril Tsutsaroth", description: "Kill K'ril Tsutsaroth in a private instance without taking any of his melee hits." },

	{ name: 'Kalphite Queen Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Kalphite Queen', description: 'Kill the Kalphite Queen 50 times.' },
	{ name: 'Insect Deflection', tier: 'Hard', type: 'Mechanical', monster: 'Kalphite Queen', description: 'Kill the Kalphite Queen by using the Vengeance spell as the finishing blow.' },
	{ name: 'Prayer Smasher', tier: 'Hard', type: 'Restriction', monster: 'Kalphite Queen', description: "Kill the Kalphite Queen using only the Verac's Flail as a weapon." },

	{ name: 'Ten-tacles', tier: 'Hard', type: 'Stamina', monster: 'Kraken', description: 'Kill the Kraken 50 times in a private instance without leaving the room.' },

	{ name: "Kree'arra Veteran", tier: 'Hard', type: 'Kill Count', monster: "Kree'arra", description: "Kill Kree'arra 100 times." },

	{ name: 'Leviathan Adept', tier: 'Hard', type: 'Kill Count', monster: 'Leviathan', description: 'Kill the Leviathan once.' },
	{ name: 'Leviathan Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Leviathan', description: 'Kill the Leviathan in less than 1:50 without a slayer task.' },

	{ name: 'High Hitter', tier: 'Hard', type: 'Mechanical', monster: 'Moons of Peril', description: 'Defeat a Moon before they start their second special attack.' },

	{ name: 'Nex Survivors', tier: 'Hard', type: 'Restriction', monster: 'Nex', description: 'Kill Nex without anyone dying.' },
	{ name: 'Nex Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Nex', description: 'Kill Nex once.' },

	{ name: 'Phantom Muspah Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah 25 times.' },
	{ name: "Can't Escape", tier: 'Hard', type: 'Restriction', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah without running.' },
	{ name: 'Phantom Muspah Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah in less than 3 minutes without a slayer task.' },
	{ name: 'Versatile Drainer', tier: 'Hard', type: 'Mechanical', monster: 'Phantom Muspah', description: "Drain the Phantom Muspah's Prayer with three different sources in one kill." },

	{ name: "Phosani's Veteran", tier: 'Hard', type: 'Kill Count', monster: "Phosani's Nightmare", description: "Kill Phosani's Nightmare once." },

	{ name: 'No time to pray', tier: 'Hard', type: 'Restriction', monster: 'Royal Titans', description: 'Kill the Royal Titans without losing any prayer points.' },

	{ name: 'Scorpia Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Scorpia', description: 'Kill Scorpia 25 times.' },

	{ name: 'Up for the Challenge', tier: 'Hard', type: 'Restriction', monster: 'Skotizo', description: 'Kill Skotizo without equipping a demonbane weapon.' },
	{ name: 'Demon Evasion', tier: 'Hard', type: 'Perfection', monster: 'Skotizo', description: 'Kill Skotizo without taking any damage.' },

	{ name: 'Hueycoatl Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'The Hueycoatl', description: 'Kill the Hueycoatl in 2:30' },
	{ name: 'Hueycoatl Veteran', tier: 'Hard', type: 'Kill Count', monster: 'The Hueycoatl', description: 'Kill the Hueycoatl 25 times.' },
	{ name: 'Perfect Hueycoatl', tier: 'Hard', type: 'Perfection', monster: 'The Hueycoatl', description: "Kill the Hueycoatl perfectly 5 times without leaving. To get a perfect kill, you must not take any avoidable damage from the Hueycoatl's lightning attack, tail slam attack or off-prayer projectile attacks." },

	{ name: 'Mimic Veteran', tier: 'Hard', type: 'Kill Count', monster: 'The Mimic', description: 'Kill the Mimic once.' },

	{ name: 'Explosion!', tier: 'Hard', type: 'Mechanical', monster: 'The Nightmare', description: 'Kill two Husks at the same time.' },
	{ name: 'Sleep Tight', tier: 'Hard', type: 'Restriction', monster: 'The Nightmare', description: 'Kill the Nightmare solo.' },
	{ name: 'Nightmare (5-Scale) Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'The Nightmare', description: 'Defeat the Nightmare (5-scale) in less than 5 minutes.' },
	{ name: 'Nightmare (Solo) Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'The Nightmare', description: 'Defeat the Nightmare (Solo) in less than 23 minutes.' },
	{ name: 'Nightmare Veteran', tier: 'Hard', type: 'Kill Count', monster: 'The Nightmare', description: 'Kill The Nightmare 25 times.' },

	{ name: 'Theatre of Blood Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood 25 times.' },

	{ name: 'Pass It On', tier: 'Hard', type: 'Mechanical', monster: 'Theatre of Blood: Entry Mode', description: 'In the Theatre of Blood: Entry Mode, successfully pass on the green ball to a team mate.' },
	{ name: 'Nylocas, On the Rocks', tier: 'Hard', type: 'Mechanical', monster: 'Theatre of Blood: Entry Mode', description: 'In the Theatre of Blood: Entry Mode, freeze any 4 Nylocas with a single Ice Barrage spell.' },
	{ name: 'Appropriate Tools', tier: 'Hard', type: 'Mechanical', monster: 'Theatre of Blood: Entry Mode', description: 'Defeat the Pestilent Bloat in the Theatre of Blood: Entry Mode with everyone having a salve amulet equipped.' },
	{ name: 'Anticoagulants', tier: 'Hard', type: 'Mechanical', monster: 'Theatre of Blood: Entry Mode', description: 'Defeat the Maiden of Sugadinti in the Theatre of Blood: Entry Mode without letting any bloodspawn live for longer than 10 seconds.' },
	{ name: 'No-Pillar', tier: 'Hard', type: 'Mechanical', monster: 'Theatre of Blood: Entry Mode', description: "Survive Verzik Vitur's pillar phase in the Theatre of Blood: Entry Mode without losing a single pillar." },
	{ name: 'Chally Time', tier: 'Hard', type: 'Mechanical', monster: 'Theatre of Blood: Entry Mode', description: 'Defeat the Pestilent Bloat in the Theatre of Blood: Entry Mode by using a halberd special attack as your final attack.' },
	{ name: 'Just To Be Safe', tier: 'Hard', type: 'Mechanical', monster: 'Theatre of Blood: Entry Mode', description: 'Defeat Sotetseg in the Theatre of Blood: Entry Mode after having split the big ball with your entire team. This must be done with a group size of at least 2.' },
	{ name: "Don't Look at Me!", tier: 'Hard', type: 'Mechanical', monster: 'Theatre of Blood: Entry Mode', description: 'Kill Xarpus in the Theatre of Blood: Entry Mode without him reflecting any damage to anyone.' },
	{ name: "They Won't Expect This", tier: 'Hard', type: 'Mechanical', monster: 'Theatre of Blood: Entry Mode', description: 'In the Theatre of Blood: Entry Mode, enter the Pestilent Bloat room from the opposite side.' },
	{ name: 'Attack, Step, Wait', tier: 'Hard', type: 'Mechanical', monster: 'Theatre of Blood: Entry Mode', description: "Survive Verzik Vitur's second phase in the Theatre of Blood: Entry Mode without anyone getting bounced by Verzik." },

	{ name: 'Hazard Prevention', tier: 'Hard', type: 'Perfection', monster: 'Thermonuclear Smoke Devil', description: 'Kill the Thermonuclear Smoke Devil without it hitting anyone.' },
	{ name: 'Thermonuclear Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Thermonuclear Smoke Devil', description: 'Kill the Thermonuclear Smoke Devil 20 times.' },
	{ name: "Spec'd Out", tier: 'Hard', type: 'Restriction', monster: 'Thermonuclear Smoke Devil', description: 'Kill the Thermonuclear Smoke Devil using only special attacks.' },

	{ name: 'Perfect Crondis', tier: 'Hard', type: 'Perfection', monster: 'Tombs of Amascut', description: 'Complete the Crondis room without letting a crocodile get to the tree, without anyone losing water from their container and in under one minute.' },
	{ name: 'Down Do Specs', tier: 'Hard', type: 'Mechanical', monster: 'Tombs of Amascut', description: 'Defeat the Wardens after staggering the boss a maximum of twice during phase two, without dying yourself.' },
	{ name: "I'm in a rush", tier: 'Hard', type: 'Mechanical', monster: 'Tombs of Amascut', description: "Defeat Ba-Ba after destroying four or fewer rolling boulders in total without dying yourself." },
	{ name: 'Perfect Het', tier: 'Hard', type: 'Perfection', monster: 'Tombs of Amascut', description: 'Complete the Het room without taking any damage from the light beam and orbs. You must destroy the core after one exposure.' },
	{ name: 'Perfect Apmeken', tier: 'Hard', type: 'Perfection', monster: 'Tombs of Amascut', description: 'Complete the Apmeken room in a group of two or more, without anyone allowing any dangers to trigger, standing in venom or being hit by a volatile baboon. You must complete this room in less than three minutes.' },
	{ name: 'No skipping allowed', tier: 'Hard', type: 'Mechanical', monster: 'Tombs of Amascut', description: 'Defeat Ba-Ba after only attacking the non-weakened boulders in the rolling boulder phase, without dying yourself. The Boulderdash invocation must be activated.' },
	{ name: 'Hardcore Tombs', tier: 'Hard', type: 'Perfection', monster: 'Tombs of Amascut', description: 'Complete the Tombs of Amascut solo without dying.' },
	{ name: 'Tomb Explorer', tier: 'Hard', type: 'Kill Count', monster: 'Tombs of Amascut', description: 'Complete the Tombs of Amascut once.' },
	{ name: 'Helpful spirit who?', tier: 'Hard', type: 'Restriction', monster: 'Tombs of Amascut', description: 'Complete the Tombs of Amascut without using any supplies from the Helpful Spirit and without anyone dying. Honey locusts are included in this restriction.' },
	{ name: 'Hardcore Raiders', tier: 'Hard', type: 'Perfection', monster: 'Tombs of Amascut', description: 'Complete the Tombs of Amascut in a group of two or more without anyone dying.' },
	{ name: 'Dropped the ball', tier: 'Hard', type: 'Mechanical', monster: 'Tombs of Amascut', description: "Defeat Akkha without dropping any materialising orbs and without dying yourself." },

	{ name: 'Novice Tomb Raider', tier: 'Hard', type: 'Kill Count', monster: 'Tombs of Amascut: Entry Mode', description: 'Complete the Tombs of Amascut in Entry mode (or above) 50 times.' },

	{ name: 'Expert Tomb Explorer', tier: 'Hard', type: 'Kill Count', monster: 'Tombs of Amascut: Expert Mode', description: 'Complete the Tombs of Amascut (Expert mode) once.' },

	{ name: 'Two Times the Torment', tier: 'Hard', type: 'Restriction', monster: 'Tormented Demon', description: 'Kill two Tormented Demons within 2 seconds.' },
	{ name: 'Unending Torment', tier: 'Hard', type: 'Kill Count', monster: 'Tormented Demon', description: 'Kill a Tormented Demon.' },
	{ name: 'Through Fire and Flames', tier: 'Hard', type: 'Restriction', monster: 'Tormented Demon', description: 'Kill a Tormented Demon whilst their shield is inactive.' },
	{ name: 'Rapid Reload', tier: 'Hard', type: 'Mechanical', monster: 'Tormented Demon', description: 'Hit three Tormented Demons within 3 seconds using a ballista or a crossbow.' },

	{ name: "TzHaar-Ket-Rak's Speed-Trialist", tier: 'Hard', type: 'Speed', monster: "TzHaar-Ket-Rak's Challenges", description: "Complete TzHaar-Ket-Rak's first challenge in less than 45 seconds." },
	{ name: 'Facing Jad Head-on III', tier: 'Hard', type: 'Restriction', monster: "TzHaar-Ket-Rak's Challenges", description: "Complete TzHaar-Ket-Rak's second challenge with only melee." },
	{ name: 'The II Jad Challenge', tier: 'Hard', type: 'Kill Count', monster: "TzHaar-Ket-Rak's Challenges", description: "Complete TzHaar-Ket-Rak's second challenge." },

	{ name: 'Half-Way There', tier: 'Hard', type: 'Kill Count', monster: 'TzKal-Zuk', description: 'Kill a Jal-Zek within the Inferno.' },

	{ name: 'Facing Jad Head-on', tier: 'Hard', type: 'Restriction', monster: 'TzTok-Jad', description: 'Complete the Fight Caves with only melee.' },
	{ name: 'A Near Miss!', tier: 'Hard', type: 'Mechanical', monster: 'TzTok-Jad', description: 'Complete the Fight Caves after surviving a hit from TzTok-Jad without praying.' },
	{ name: 'Fight Caves Veteran', tier: 'Hard', type: 'Kill Count', monster: 'TzTok-Jad', description: 'Complete the Fight Caves once.' },

	{ name: 'Vardorvis Adept', tier: 'Hard', type: 'Kill Count', monster: 'Vardorvis', description: 'Kill Vardorvis once.' },
	{ name: 'Vardorvis Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Vardorvis', description: 'Kill Vardorvis in less than 1:15 minutes without a slayer task.' },

	{ name: 'Venenatis Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Venenatis', description: 'Kill Venenatis 20 times.' },

	{ name: "Vet'eran", tier: 'Hard', type: 'Kill Count', monster: "Vet'ion", description: "Kill Vet'ion 20 times." },

	{ name: "Stick 'em With the Pointy End", tier: 'Hard', type: 'Restriction', monster: 'Vorkath', description: 'Kill Vorkath using melee weapons only.' },
	{ name: 'Zombie Destroyer', tier: 'Hard', type: 'Restriction', monster: 'Vorkath', description: "Kill Vorkath's zombified spawn without using crumble undead." },
	{ name: 'Vorkath Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Vorkath', description: 'Kill Vorkath 50 times.' },

	{ name: 'Whisperer Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Whisperer', description: 'Kill the Whisperer in less than 3:00 without a slayer task.' },
	{ name: 'Tentacular', tier: 'Hard', type: 'Restriction', monster: 'Whisperer', description: 'Kill the Whisperer whilst only being on the Arceuus spellbook.' },
	{ name: 'Whisperer Adept', tier: 'Hard', type: 'Kill Count', monster: 'Whisperer', description: 'Kill the Whisperer once.' },

	{ name: 'Yama Adept', tier: 'Hard', type: 'Kill Count', monster: 'Yama', description: 'Defeat Yama once.' },
	{ name: 'Yama Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Yama', description: 'Defeat Yama in an average time of under 3:38 over your last four kills.' },
	{ name: 'Back so soon?', tier: 'Hard', type: 'Mechanical', monster: 'Yama', description: 'Defeat Yama without the judge being attacked with the wrong style and without taking more than one instance of damage each time you are exiled from the arena.' },

	{ name: 'Team Player', tier: 'Hard', type: 'Mechanical', monster: 'Zalcano', description: 'Receive imbued tephra from a golem.' },
	{ name: 'The Spurned Hero', tier: 'Hard', type: 'Mechanical', monster: 'Zalcano', description: 'Kill Zalcano as the player who has dealt the most damage to her.' },
	{ name: 'Zalcano Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Zalcano', description: 'Kill Zalcano 25 times.' },
	{ name: 'Perfect Zalcano', tier: 'Hard', type: 'Perfection', monster: 'Zalcano', description: 'Kill Zalcano 5 times in a row without leaving or getting hit by the following: Falling rocks, rock explosions, Zalcano powering up, or standing in a red symbol.' },

	{ name: 'Snake Rebound', tier: 'Hard', type: 'Mechanical', monster: 'Zulrah', description: 'Kill Zulrah by using the Vengeance spell as the finishing blow.' },
	{ name: 'Snake. Snake!? Snaaaaaake!', tier: 'Hard', type: 'Mechanical', monster: 'Zulrah', description: 'Kill 3 Snakelings simultaneously.' },
	{ name: 'Zulrah Veteran', tier: 'Hard', type: 'Kill Count', monster: 'Zulrah', description: 'Kill Zulrah 75 times.' },
	{ name: 'Zulrah Speed-Trialist', tier: 'Hard', type: 'Speed', monster: 'Zulrah', description: 'Kill Zulrah in less than 1 minute 20 seconds, without a slayer task.' },

	{ name: "Don't Flame Me", tier: 'Master', type: 'Mechanical', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra without being hit by the flame wall attack.' },
	{ name: 'The Flame Skipper', tier: 'Master', type: 'Mechanical', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra without letting it spawn a flame wall attack.' },
	{ name: 'Unrequired Antipoisons', tier: 'Master', type: 'Mechanical', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra without being hit by the acid pool attack.' },
	{ name: 'Mixing Correctly', tier: 'Master', type: 'Mechanical', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra without empowering it.' },
	{ name: 'Alcleanical Hydra', tier: 'Master', type: 'Perfection', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra without taking any damage.' },
	{ name: 'Alchemical Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra in less than 1 minute 45 seconds.' },
	{ name: 'Lightning Lure', tier: 'Master', type: 'Mechanical', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra without being hit by the lightning attack.' },
	{ name: 'Working Overtime', tier: 'Master', type: 'Stamina', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra 15 times without leaving the room.' },
	{ name: 'Alchemical Master', tier: 'Master', type: 'Kill Count', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra 150 times.' },

	{ name: 'Araxxor Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Araxxor', description: 'Kill Araxxor 5 times in 10:00.' },
	{ name: 'Perfect Araxxor', tier: 'Master', type: 'Perfection', monster: 'Araxxor', description: "Kill Araxxor perfectly, without taking damage from Araxxor's Mage & Range attacks, melee attack off prayer, araxyte minions damage, or damage from acid pools." },
	{ name: 'Arachnid Lover', tier: 'Master', type: 'Stamina', monster: 'Araxxor', description: 'Kill Araxxor 10 times without leaving.' },
	{ name: 'Araxyte Betrayal', tier: 'Master', type: 'Mechanical', monster: 'Araxxor', description: 'Have an Araxyte kill three other Araxytes.' },
	{ name: 'Let it seep in', tier: 'Master', type: 'Restriction', monster: 'Araxxor', description: 'Kill Araxxor without ever having venom or poison immunity.' },
	{ name: 'Araxxor Master', tier: 'Master', type: 'Kill Count', monster: 'Araxxor', description: 'Kill Araxxor 75 times.' },

	{ name: 'Arooo No More', tier: 'Master', type: 'Mechanical', monster: 'Cerberus', description: 'Kill Cerberus without any of the Summoned Souls being spawned.' },
	{ name: 'Cerberus Master', tier: 'Master', type: 'Kill Count', monster: 'Cerberus', description: 'Kill Cerberus 150 times.' },

	{ name: 'Chambers of Xeric Master', tier: 'Master', type: 'Kill Count', monster: 'Chambers of Xeric', description: 'Complete the Chambers of Xeric 75 times.' },
	{ name: 'No Time for Death', tier: 'Master', type: 'Mechanical', monster: 'Chambers of Xeric', description: 'Clear the Tightrope room without Killing any Deathly Mages or Deathly Rangers.' },
	{ name: 'Undying Raider', tier: 'Master', type: 'Perfection', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric solo raid without dying.' },
	{ name: 'Chambers of Xeric (Solo) Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric (Solo) in less than 21 minutes.' },
	{ name: 'Perfect Olm (Trio)', tier: 'Master', type: 'Perfection', monster: 'Chambers of Xeric', description: "Kill the Great Olm in a trio raid without any team member taking damage from any of the following: Teleport portals, Fire Walls, Healing pools, Crystal Bombs, Crystal Burst or Prayer Orbs. You also cannot let his claws regenerate or take damage from the same acid pool back to back." },
	{ name: 'Putting It Olm on the Line', tier: 'Master', type: 'Mechanical', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric solo raid with more than 40,000 points.' },
	{ name: 'Playing with Lasers', tier: 'Master', type: 'Perfection', monster: 'Chambers of Xeric', description: 'Clear the Crystal Crabs room without wasting an orb after the first crystal has been activated.' },
	{ name: 'Chambers of Xeric (Trio) Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric (Trio) in less than 16 minutes and 30 seconds.' },
	{ name: 'A Not So Special Lizard', tier: 'Master', type: 'Mechanical', monster: 'Chambers of Xeric', description: 'Kill the Great Olm in a solo raid without letting him use any of the following special attacks in his second to last phase: Crystal Burst, Lightning Walls, Teleportation Portals or left-hand autohealing.' },
	{ name: 'Anvil No More', tier: 'Master', type: 'Mechanical', monster: 'Chambers of Xeric', description: 'Kill Tekton before he returns to his anvil for a second time after the fight begins.' },
	{ name: 'Stop Drop and Roll', tier: 'Master', type: 'Mechanical', monster: 'Chambers of Xeric', description: 'Kill Vasa Nistirio before he performs his teleport attack for the second time.' },
	{ name: 'Blind Spot', tier: 'Master', type: 'Perfection', monster: 'Chambers of Xeric', description: 'Kill Tekton without taking any damage.' },
	{ name: 'Perfect Olm (Solo)', tier: 'Master', type: 'Perfection', monster: 'Chambers of Xeric', description: "Kill the Great Olm in a solo raid without taking damage from any of the following: Teleport portals, Fire Walls, Healing pools, Crystal Bombs, Crystal Burst or Prayer Orbs. You also cannot let his claws regenerate or take damage from the same acid pool back to back." },
	{ name: 'Chambers of Xeric (5-Scale) Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric (5-scale) in less than 15 minutes.' },

	{ name: 'Immortal Raider', tier: 'Master', type: 'Perfection', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric Challenge mode (Solo) raid without dying.' },
	{ name: 'Immortal Raid Team', tier: 'Master', type: 'Perfection', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric: Challenge mode raid without anyone dying.' },
	{ name: 'Chambers of Xeric: CM (Trio) Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric: Challenge Mode (Trio) in less than 35 minutes.' },
	{ name: 'Chambers of Xeric: CM (5-Scale) Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric: Challenge Mode (5-scale) in less than 30 minutes.' },
	{ name: 'Chambers of Xeric: CM (Solo) Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric: Challenge Mode (Solo) in less than 45 minutes.' },
	{ name: 'Chambers of Xeric: CM Master', tier: 'Master', type: 'Kill Count', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete the Chambers of Xeric: Challenge Mode 10 times.' },

	{ name: 'Moving Collateral', tier: 'Master', type: 'Restriction', monster: 'Commander Zilyana', description: 'Kill Commander Zilyana in a private instance without attacking her directly.' },

	{ name: 'Corporeal Beast Master', tier: 'Master', type: 'Kill Count', monster: 'Corporeal Beast', description: 'Kill the Corporeal Beast 50 times.' },

	{ name: 'Perfect Corrupted Hunllef', tier: 'Master', type: 'Perfection', monster: 'Corrupted Hunllef', description: 'Kill the Corrupted Hunllef without taking damage from: Tornadoes, Damaging Floor or Stomp Attacks. Also, do not take damage off prayer and do not attack the Corrupted Hunllef with the wrong weapon.' },
	{ name: "Defence Doesn't Matter II", tier: 'Master', type: 'Restriction', monster: 'Corrupted Hunllef', description: 'Kill the Corrupted Hunllef without making any armour within the Corrupted Gauntlet.' },
	{ name: 'Corrupted Warrior', tier: 'Master', type: 'Restriction', monster: 'Corrupted Hunllef', description: 'Kill the Corrupted Hunllef with a full set of perfected corrupted armour equipped.' },
	{ name: 'Corrupted Gauntlet Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Corrupted Hunllef', description: 'Complete a Corrupted Gauntlet in less than 7 minutes and 30 seconds.' },
	{ name: 'Corrupted Gauntlet Master', tier: 'Master', type: 'Kill Count', monster: 'Corrupted Hunllef', description: 'Complete the Corrupted Gauntlet 10 times.' },

	{ name: "Defence Doesn't Matter", tier: 'Master', type: 'Restriction', monster: 'Crystalline Hunllef', description: 'Kill the Crystalline Hunllef without making any armour within the Gauntlet.' },
	{ name: 'Perfect Crystalline Hunllef', tier: 'Master', type: 'Perfection', monster: 'Crystalline Hunllef', description: 'Kill the Crystalline Hunllef without taking damage from: Tornadoes, Damaging Floor or Stomp Attacks. Also, do not take damage off prayer and do not attack the Crystalline Hunllef with the wrong weapon.' },
	{ name: 'Gauntlet Master', tier: 'Master', type: 'Kill Count', monster: 'Crystalline Hunllef', description: 'Complete the Gauntlet 20 times.' },
	{ name: 'Gauntlet Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Crystalline Hunllef', description: 'Complete the Gauntlet in less than 5 minutes.' },

	{ name: 'Doom Chaser', tier: 'Master', type: 'Speed', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 in less than 10:00.' },
	{ name: "Mine's Better", tier: 'Master', type: 'Restriction', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 whilst always wearing a shield.' },
	{ name: 'Mokhaiotl Drift', tier: 'Master', type: 'Mechanical', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl at level 8 or above before he finishes the first burrow phase.' },
	{ name: 'Doom Veteran', tier: 'Master', type: 'Kill Count', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl at delve level 8.' },
	{ name: 'Grub Patrol', tier: 'Master', type: 'Mechanical', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 without ever letting a grub be absorbed.' },

	{ name: 'Perfect Duke Sucellus', tier: 'Master', type: 'Perfection', monster: 'Duke Sucellus', description: 'Kill Duke Sucellus without taking any avoidable damage 5 times without leaving.' },
	{ name: 'Duke Sucellus Master', tier: 'Master', type: 'Kill Count', monster: 'Duke Sucellus', description: 'Kill Duke Sucellus 50 times.' },
	{ name: 'Duke Sucellus Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Duke Sucellus', description: 'Kill Duke Sucellus in less than 50 seconds without a slayer task.' },
	{ name: 'Cold Feet', tier: 'Master', type: 'Restriction', monster: 'Duke Sucellus', description: 'Kill Duke Sucellus without taking any avoidable damage, whilst also never running.' },

	{ name: 'One-off', tier: 'Master', type: 'Mechanical', monster: 'Fortis Colosseum', description: "Complete Wave 11 with either 'Red Flag', 'Dynamic Duo', or 'Doom II' active." },
	{ name: 'Colosseum Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Fortis Colosseum', description: 'Complete the Colosseum with a total time of 28:00 or less.' },
	{ name: 'Showboating', tier: 'Master', type: 'Mechanical', monster: 'Fortis Colosseum', description: 'Defeat Sol Heredit after using Fortis Salute to the north, east, south and west of the arena while he is below 10% hitpoints.' },
	{ name: "I Brought Mine Too", tier: 'Master', type: 'Restriction', monster: 'Fortis Colosseum', description: 'Defeat Sol Heredit using only a Spear, Hasta or Halberd.' },
	{ name: 'Sportsmanship', tier: 'Master', type: 'Kill Count', monster: 'Fortis Colosseum', description: 'Defeat Sol Heredit once.' },

	{ name: "... 'til Dawn", tier: 'Master', type: 'Stamina', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians 20 times without leaving the instance.' },
	{ name: 'Grotesque Guardians Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians in less than 1:40 minutes.' },
	{ name: 'Perfect Grotesque Guardians II', tier: 'Master', type: 'Perfection', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians 5 times in a row without leaving the instance, whilst completing the Perfect Grotesque Guardians task every time.' },

	{ name: 'Hespori Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Hespori', description: 'Kill the Hespori in less than 36 seconds.' },

	{ name: 'One Hundred Tentacles', tier: 'Master', type: 'Stamina', monster: 'Kraken', description: 'Kill the Kraken 100 times in a private instance without leaving the room.' },

	{ name: 'Collateral Damage', tier: 'Master', type: 'Mechanical', monster: "Kree'arra", description: "Kill Kree'arra in a private instance without ever attacking him directly." },
	{ name: 'Swoop No More', tier: 'Master', type: 'Perfection', monster: "Kree'arra", description: "Kill Kree'arra in a private instance without taking any melee damage from the boss or his bodyguards." },

	{ name: 'Perfect Leviathan', tier: 'Master', type: 'Perfection', monster: 'Leviathan', description: 'Kill the Leviathan perfectly 5 times without leaving.' },
	{ name: 'Leviathan Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Leviathan', description: 'Kill the Leviathan in less than 1:25 without a slayer task.' },
	{ name: 'Leviathan Master', tier: 'Master', type: 'Kill Count', monster: 'Leviathan', description: 'Kill the Leviathan 50 times.' },
	{ name: 'Serpentine Solo', tier: 'Master', type: 'Mechanical', monster: 'Leviathan', description: 'Kill the Leviathan without stunning the boss more than once.' },

	{ name: 'A siphon will solve this', tier: 'Master', type: 'Mechanical', monster: 'Nex', description: 'Kill Nex without letting her heal from her Blood Siphon special attack.' },
	{ name: 'There is no escape!', tier: 'Master', type: 'Mechanical', monster: 'Nex', description: 'Kill Nex without anyone being hit by the Smoke Dash special attack.' },
	{ name: 'Contain this!', tier: 'Master', type: 'Mechanical', monster: 'Nex', description: 'Kill Nex without anyone taking damage from any Ice special attack.' },
	{ name: 'Nex Master', tier: 'Master', type: 'Kill Count', monster: 'Nex', description: 'Kill Nex 25 times.' },
	{ name: 'Nex Trio', tier: 'Master', type: 'Restriction', monster: 'Nex', description: 'Kill Nex with three or less players at the start of the fight.' },
	{ name: 'Shadows Move...', tier: 'Master', type: 'Mechanical', monster: 'Nex', description: 'Kill Nex without anyone being hit by the Shadow Smash attack.' },

	{ name: 'Essence Farmer', tier: 'Master', type: 'Stamina', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah 10 times in one trip.' },
	{ name: 'More than just a ranged weapon', tier: 'Master', type: 'Restriction', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah by only dealing damage to it with a salamander.' },
	{ name: 'Phantom Muspah Master', tier: 'Master', type: 'Kill Count', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah 50 times.' },
	{ name: 'Phantom Muspah Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah in less than 2 minutes without a slayer task.' },
	{ name: 'Walk Straight Pray True', tier: 'Master', type: 'Perfection', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah without taking any avoidable damage.' },
	{ name: 'Space is Tight', tier: 'Master', type: 'Mechanical', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah whilst it is surrounded by spikes.' },

	{ name: 'Dreamland Express', tier: 'Master', type: 'Mechanical', monster: "Phosani's Nightmare", description: "Kill Phosani's Nightmare without a sleepwalker reaching her during her desperation phase." },
	{ name: "Phosani's Master", tier: 'Master', type: 'Kill Count', monster: "Phosani's Nightmare", description: "Kill Phosani's Nightmare 5 times." },
	{ name: "Phosani's Speedchaser", tier: 'Master', type: 'Speed', monster: "Phosani's Nightmare", description: 'Kill Phosani\'s Nightmare within 7 minutes and 30 seconds' },
	{ name: 'I Would Simply React', tier: 'Master', type: 'Mechanical', monster: "Phosani's Nightmare", description: "Kill Phosani's Nightmare without allowing your prayer to be disabled." },
	{ name: 'Crush Hour', tier: 'Master', type: 'Mechanical', monster: "Phosani's Nightmare", description: "Kill Phosani's Nightmare while killing every parasite and husk in one hit." },

	{ name: 'Precise Positioning', tier: 'Master', type: 'Restriction', monster: 'Skotizo', description: 'Kill Skotizo with the final source of damage being a Chinchompa explosion.' },

	{ name: 'Is it a bird?', tier: 'Master', type: 'Restriction', monster: 'The Hueycoatl', description: 'Kill the Hueycoatl using only dragonbane weaponry.' },
	{ name: 'Hueycoatl Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'The Hueycoatl', description: 'Kill the Hueycoatl in 2:30 with five or fewer players.' },

	{ name: 'Perfect Nightmare', tier: 'Master', type: 'Perfection', monster: 'The Nightmare', description: "Kill the Nightmare without any player taking damage from the following attacks: Nightmare rifts, an un-cured parasite explosion, Corpse flowers or the Nightmare's Surge. Also, no player can take damage off prayer or have their attacks slowed by the Nightmare spores." },
	{ name: 'Nightmare Master', tier: 'Master', type: 'Kill Count', monster: 'The Nightmare', description: 'Kill The Nightmare 50 times.' },
	{ name: 'Nightmare (Solo) Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'The Nightmare', description: 'Defeat the Nightmare (Solo) in less than 19 minutes.' },
	{ name: 'Nightmare (5-Scale) Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'The Nightmare', description: 'Defeat the Nightmare (5-scale) in less than 4 minutes.' },

	{ name: 'Theatre of Blood Master', tier: 'Master', type: 'Kill Count', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood 75 times.' },
	{ name: 'Perfect Xarpus', tier: 'Master', type: 'Perfection', monster: 'Theatre of Blood', description: 'Kill Xarpus without anyone in the team taking any damage from Xarpus\' attacks and without letting an exhumed heal Xarpus more than twice.' },
	{ name: 'Pop It', tier: 'Master', type: 'Mechanical', monster: 'Theatre of Blood', description: 'Kill Verzik without any Nylocas being frozen and without anyone taking damage from the Nylocas.' },
	{ name: 'Can You Dance?', tier: 'Master', type: 'Restriction', monster: 'Theatre of Blood', description: 'Kill Xarpus without anyone in the team using a ranged or magic weapon.' },
	{ name: 'Perfect Bloat', tier: 'Master', type: 'Perfection', monster: 'Theatre of Blood', description: "Kill the Pestilent Bloat without anyone in the team taking damage from the following sources: Pestilent flies, Falling body parts or The Pestilent Bloats stomp attack." },
	{ name: 'Perfect Sotetseg', tier: 'Master', type: 'Perfection', monster: 'Theatre of Blood', description: "Kill Sotetseg without anyone in the team stepping on the wrong tile in the maze, without getting hit by the tornado and without taking any damage from Sotetseg's attacks whilst off prayer." },
	{ name: 'Back in My Day...', tier: 'Master', type: 'Restriction', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood without any member of the team equipping a Scythe of Vitur.' },
	{ name: "Can't Drain This", tier: 'Master', type: 'Restriction', monster: 'Theatre of Blood', description: 'Kill The Maiden of Sugadinti without anyone in the team losing any prayer points.' },
	{ name: 'Theatre (5-Scale) Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood (5-scale) in less than 16 minutes.' },
	{ name: 'Perfect Nylocas', tier: 'Master', type: 'Perfection', monster: 'Theatre of Blood', description: 'Kill the Nylocas Vasilias without anyone in the team attacking any Nylocas with the wrong attack style, without letting a pillar collapse and without getting hit by any of the Nylocas Vasilias attacks whilst off prayer.' },
	{ name: 'Two-Down', tier: 'Master', type: 'Mechanical', monster: 'Theatre of Blood', description: 'Kill the Pestilent Bloat before he shuts down for the third time.' },
	{ name: 'Perfect Verzik', tier: 'Master', type: 'Perfection', monster: 'Theatre of Blood', description: "Defeat Verzik Vitur without anyone in the team taking damage from Verzik Vitur's attacks other than her spider form's correctly prayed against regular magical and ranged attacks." },
	{ name: 'Perfect Maiden', tier: 'Master', type: 'Perfection', monster: 'Theatre of Blood', description: 'Kill The Maiden of Sugadinti without anyone in the team taking damage from the following sources: Blood Spawn projectiles and Blood Spawn trails. Also, without taking damage off prayer and without letting any of the Nylocas Matomenos heal The Maiden.' },
	{ name: 'Theatre (Trio) Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood (Trio) in less than 20 minutes.' },
	{ name: 'Theatre (4-Scale) Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood (4-scale) in less than 17 minutes.' },
	{ name: 'A Timely Snack', tier: 'Master', type: 'Mechanical', monster: 'Theatre of Blood', description: 'Kill Sotetseg after surviving at least 3 ball attacks without sharing the damage and without anyone dying throughout the fight.' },

	{ name: 'Theatre of Blood: SM Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Theatre of Blood: Entry Mode', description: 'Complete the Theatre of Blood: Entry Mode in less than 17 minutes.' },
	{ name: 'Hard Mode? Completed It', tier: 'Master', type: 'Speed', monster: 'Theatre of Blood: Hard Mode', description: 'Complete the Theatre of Blood: Hard Mode within the challenge time.' },

	{ name: 'Perfect Kephri', tier: 'Master', type: 'Perfection', monster: 'Tombs of Amascut', description: "Defeat Kephri in a group of two or more, without anyone taking any damage from the following: egg explosions, Kephri's attacks, Exploding Scarabs, Bodyguards, dung attacks. No eggs may hatch throughout the fight." },
	{ name: 'You are not prepared', tier: 'Master', type: 'Restriction', monster: 'Tombs of Amascut', description: 'Complete a full Tombs of Amascut raid only using supplies given inside the tomb and without anyone dying.' },
	{ name: 'Perfect Ba-Ba', tier: 'Master', type: 'Perfection', monster: 'Tombs of Amascut', description: "Defeat Ba-Ba in a group of two or more, without anyone taking any damage from the following: Ba-Ba's Attacks off-prayer, Ba-Ba's slam, rolling boulders, rubble attack or falling rocks. No sarcophagi may be opened. You must have all Ba-Ba invocations activated." },
	{ name: 'Perfect Akkha', tier: 'Master', type: 'Perfection', monster: 'Tombs of Amascut', description: "Complete Akkha in a group of two or more, without anyone taking any damage from the following: Akkha's attacks off-prayer, Akkha's special attacks (orbs, memory, detonate), exploding shadow timers, orbs in the enrage phase or attacking Akkha with the wrong style. You must have all Akkha invocations activated." },
	{ name: 'Perfect Zebak', tier: 'Master', type: 'Perfection', monster: 'Tombs of Amascut', description: "Defeat Zebak without anyone taking any damage from: poison, Zebak's basic attacks off-prayer, blood spawns and waves. You also must not push more than two jugs on the roar attack during the fight (you may destroy stationary ones). You must have all Zebak invocations activated." },
	{ name: 'Tomb Raider', tier: 'Master', type: 'Kill Count', monster: 'Tombs of Amascut', description: 'Complete the Tombs of Amascut 50 times.' },
	{ name: 'Perfect Wardens', tier: 'Master', type: 'Perfection', monster: 'Tombs of Amascut', description: "Defeat The Wardens in a group of two or more, without anyone taking avoidable damage from the following: Warden attacks, obelisk attacks, lightning attacks in phase three, skull attack in phase three, Demi god attacks in phase three. You must have all Wardens invocations activated." },
	{ name: 'Chompington', tier: 'Master', type: 'Mechanical', monster: 'Tombs of Amascut', description: "Defeat Zebak using only melee attacks and without dying yourself." },
	{ name: 'Tombs Speed Runner', tier: 'Master', type: 'Speed', monster: 'Tombs of Amascut', description: 'Complete the Tombs of Amascut (normal) within 18 mins at any group size.' },
	{ name: "Better get movin'", tier: 'Master', type: 'Mechanical', monster: 'Tombs of Amascut', description: "Defeat Elidinis' Warden in phase three of the Wardens fight with 'Aerial Assault', 'Stay vigilant' and 'Insanity' invocations activated and without dying yourself." },
	{ name: 'Perfect Scabaras', tier: 'Master', type: 'Perfection', monster: 'Tombs of Amascut', description: 'Complete the Scabaras room in less than a minute without anyone taking any damage from puzzles.' },
	{ name: 'Tomb Looter', tier: 'Master', type: 'Kill Count', monster: 'Tombs of Amascut', description: 'Complete the Tombs of Amascut 25 times.' },

	{ name: 'Ba-Bananza', tier: 'Master', type: 'Mechanical', monster: 'Tombs of Amascut: Expert Mode', description: 'Defeat Ba-Ba with all Ba-Ba invocations activated and the path levelled up to at least four, without dying yourself.' },
	{ name: "Rockin' around the croc", tier: 'Master', type: 'Mechanical', monster: 'Tombs of Amascut: Expert Mode', description: 'Defeat Zebak with all Zebak invocations activated and the path levelled up to at least four, without dying yourself.' },
	{ name: "Doesn't bug me", tier: 'Master', type: 'Mechanical', monster: 'Tombs of Amascut: Expert Mode', description: 'Defeat Kephri with all Kephri invocations activated and the path levelled up to at least four, without dying yourself.' },
	{ name: 'Expert Tomb Looter', tier: 'Master', type: 'Kill Count', monster: 'Tombs of Amascut: Expert Mode', description: 'Complete the Tombs of Amascut (Expert mode) 25 times.' },
	{ name: 'Fancy feet', tier: 'Master', type: 'Restriction', monster: 'Tombs of Amascut: Expert Mode', description: "Complete phase three of The Wardens in a group of two or more, using only melee attacks and without dying yourself. The 'Insanity' invocation must be activated." },
	{ name: 'All out of medics', tier: 'Master', type: 'Mechanical', monster: 'Tombs of Amascut: Expert Mode', description: 'Defeat Kephri without letting her heal above 25% after the first down. The \'Medic\' invocation must be activated. You must do this without dying yourself.' },
	{ name: 'Resourceful Raider', tier: 'Master', type: 'Restriction', monster: 'Tombs of Amascut: Expert Mode', description: 'Complete the Tombs of Amascut with the "On a diet" and "Dehydration" invocations activated and without anyone dying.' },
	{ name: 'Something of an expert myself', tier: 'Master', type: 'Mechanical', monster: 'Tombs of Amascut: Expert Mode', description: 'Complete the Tombs of Amascut raid at level 350 or above without anyone dying.' },
	{ name: "Warden't you believe it", tier: 'Master', type: 'Mechanical', monster: 'Tombs of Amascut: Expert Mode', description: "Defeat the Wardens with all Wardens invocations activated, at expert level and without dying yourself." },
	{ name: 'But... Damage', tier: 'Master', type: 'Restriction', monster: 'Tombs of Amascut: Expert Mode', description: 'Complete the Tombs of Amascut without anyone in your party wearing or holding any equipment at tier 75 or above.' },

	{ name: 'Three Times the Thrashing', tier: 'Master', type: 'Restriction', monster: 'Tormented Demon', description: 'Kill three Tormented Demons within 3 seconds.' },

	{ name: "Supplies? Who Needs 'em?", tier: 'Master', type: 'Perfection', monster: "TzHaar-Ket-Rak's Challenges", description: "Complete TzHaar-Ket-Rak's third challenge without having anything in your inventory." },
	{ name: 'Multi-Style Specialist', tier: 'Master', type: 'Mechanical', monster: "TzHaar-Ket-Rak's Challenges", description: "Complete TzHaar-Ket-Rak's third challenge while using a different attack style for each JalTok-Jad." },
	{ name: 'Facing Jad Head-on IV', tier: 'Master', type: 'Restriction', monster: "TzHaar-Ket-Rak's Challenges", description: "Complete TzHaar-Ket-Rak's fourth challenge with only melee." },
	{ name: 'The IV Jad Challenge', tier: 'Master', type: 'Kill Count', monster: "TzHaar-Ket-Rak's Challenges", description: "Complete TzHaar-Ket-Rak's fourth challenge." },
	{ name: "TzHaar-Ket-Rak's Speed-Chaser", tier: 'Master', type: 'Speed', monster: "TzHaar-Ket-Rak's Challenges", description: "Complete TzHaar-Ket-Rak's third challenge in less than 3 minutes." },

	{ name: 'Nibblers, Begone!', tier: 'Master', type: 'Perfection', monster: 'TzKal-Zuk', description: 'Kill Tzkal-Zuk without letting a pillar fall before wave 67.' },

	{ name: 'Denying the Healers', tier: 'Master', type: 'Mechanical', monster: 'TzTok-Jad', description: 'Complete the Fight caves without letting any of the Yt-MejKot heal.' },
	{ name: 'Fight Caves Master', tier: 'Master', type: 'Kill Count', monster: 'TzTok-Jad', description: 'Complete the Fight Caves 5 times.' },
	{ name: 'Fight Caves Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'TzTok-Jad', description: 'Complete the Fight Caves in less than 30 minutes.' },
	{ name: "You Didn't Say Anything About a Bat", tier: 'Master', type: 'Mechanical', monster: 'TzTok-Jad', description: "Complete the Fight Caves without being attacked by a Tz-Kih." },

	{ name: 'Budget Cutter', tier: 'Master', type: 'Restriction', monster: 'Vardorvis', description: 'Kill Vardorvis with gear worth 2m or less in total.' },
	{ name: 'Vardorvis Master', tier: 'Master', type: 'Kill Count', monster: 'Vardorvis', description: 'Kill Vardorvis 50 times.' },
	{ name: 'Perfect Vardorvis', tier: 'Master', type: 'Perfection', monster: 'Vardorvis', description: 'Kill Vardorvis perfectly 5 times without leaving.' },
	{ name: 'Vardorvis Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Vardorvis', description: 'Kill Vardorvis in less than 1:05 without a slayer task.' },

	{ name: 'Vorkath Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Vorkath', description: 'Kill Vorkath in less than 1 minute and 15 seconds.' },
	{ name: 'Extended Encounter', tier: 'Master', type: 'Stamina', monster: 'Vorkath', description: 'Kill Vorkath 10 times without leaving his area.' },
	{ name: 'The Walk', tier: 'Master', type: 'Mechanical', monster: 'Vorkath', description: 'Hit Vorkath 12 times during the acid special without getting hit by his rapid fire or the acid pools.' },
	{ name: 'Dodging the Dragon', tier: 'Master', type: 'Perfection', monster: 'Vorkath', description: 'Kill Vorkath 5 times without taking any damage from his special attacks and without leaving his area.' },
	{ name: 'Vorkath Master', tier: 'Master', type: 'Kill Count', monster: 'Vorkath', description: 'Kill Vorkath 100 times.' },

	{ name: 'Perfect Whisperer', tier: 'Master', type: 'Perfection', monster: 'Whisperer', description: 'Kill the Whisperer without taking avoidable damage 5 times without leaving.' },
	{ name: 'Whisperer Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Whisperer', description: 'Kill the Whisperer in less than 2:25 without a slayer task.' },
	{ name: 'Whisperer Master', tier: 'Master', type: 'Kill Count', monster: 'Whisperer', description: 'Kill the Whisperer 50 times.' },

	{ name: 'Yama Veteran', tier: 'Master', type: 'Kill Count', monster: 'Yama', description: 'Defeat Yama 50 times.' },
	{ name: 'Yama Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Yama', description: 'Defeat Yama in an average time of under 3:00 over your last four kills.' },
	{ name: 'Shadow dancer', tier: 'Master', type: 'Mechanical', monster: 'Yama', description: 'Defeat Yama without getting hit by shadows and without being more than one tile away from the center of his shadow crash attack.' },
	{ name: 'No toppings, no drinks, thanks', tier: 'Master', type: 'Restriction', monster: 'Yama', description: 'Defeat Yama without anybody healing using anything other than plain pizza and without anybody drinking any potions.' },
	{ name: 'Fire fighter', tier: 'Master', type: 'Mechanical', monster: 'Yama', description: 'Defeat Yama without getting hit by fire and having only killed void flares with special attacks.' },

	{ name: 'Zulrah Master', tier: 'Master', type: 'Kill Count', monster: 'Zulrah', description: 'Kill Zulrah 150 times.' },
	{ name: 'Zulrah Speed-Chaser', tier: 'Master', type: 'Speed', monster: 'Zulrah', description: 'Kill Zulrah in less than 1 minute, without a slayer task.' },
	{ name: 'Perfect Zulrah', tier: 'Master', type: 'Perfection', monster: 'Zulrah', description: "Kill Zulrah whilst taking no damage from the following: Snakelings, Venom Clouds, Zulrah's Green or Crimson phase." },
	{ name: 'Alchemical Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra in less than 1 minute 20 seconds.' },
	{ name: 'No Pressure', tier: 'Grandmaster', type: 'Restriction', monster: 'Alchemical Hydra', description: "Kill the Alchemical Hydra using only Dharok's Greataxe as a weapon whilst having no more than 10 Hitpoints throughout the entire fight." },

	{ name: 'Swimming in Venom', tier: 'Grandmaster', type: 'Restriction', monster: 'Araxxor', description: 'Kill Araxxor without the boss ever moving.' },
	{ name: 'Perfect Araxxor 2', tier: 'Grandmaster', type: 'Perfection', monster: 'Araxxor', description: 'Kill Araxxor perfectly, without hitting it during the enrage phase.' },
	{ name: 'Araxxor Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Araxxor', description: 'Kill Araxxor 6 times in 10:00.' },

	{ name: 'Chambers of Xeric (5-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric (5-scale) in less than 12 minutes and 30 seconds.' },
	{ name: 'Chambers of Xeric (Trio) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric (Trio) in less than 14 minutes and 30 seconds.' },
	{ name: 'Chambers of Xeric Grandmaster', tier: 'Grandmaster', type: 'Kill Count', monster: 'Chambers of Xeric', description: 'Complete the Chambers of Xeric 150 times.' },
	{ name: 'Chambers of Xeric (Solo) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric (Solo) in less than 17 minutes.' },

	{ name: 'Chambers of Xeric: CM (Trio) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric: Challenge Mode (Trio) in less than 27 minutes.' },
	{ name: 'Chambers of Xeric: CM Grandmaster', tier: 'Grandmaster', type: 'Kill Count', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete the Chambers of Xeric: Challenge Mode 25 times.' },
	{ name: 'Chambers of Xeric: CM (5-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric: Challenge Mode (5-scale) in less than 25 minutes.' },
	{ name: 'Chambers of Xeric: CM (Solo) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric: Challenge Mode (Solo) in less than 38 minutes and 30 seconds.' },

	{ name: 'Animal Whisperer', tier: 'Grandmaster', type: 'Perfection', monster: 'Commander Zilyana', description: 'Kill Commander Zilyana in a private instance without taking any damage from the boss or bodyguards.' },
	{ name: 'Peach Conjurer', tier: 'Grandmaster', type: 'Stamina', monster: 'Commander Zilyana', description: 'Kill Commander Zilyana 50 times in a privately rented instance without leaving the room.' },

	{ name: 'Egniol Diet II', tier: 'Grandmaster', type: 'Restriction', monster: 'Corrupted Hunllef', description: 'Kill the Corrupted Hunllef without making an egniol potion within the Corrupted Gauntlet.' },
	{ name: 'Corrupted Gauntlet Grandmaster', tier: 'Grandmaster', type: 'Kill Count', monster: 'Corrupted Hunllef', description: 'Complete the Corrupted Gauntlet 50 times.' },
	{ name: 'Wolf Puncher II', tier: 'Grandmaster', type: 'Restriction', monster: 'Corrupted Hunllef', description: 'Kill the Corrupted Hunllef without making more than one attuned weapon.' },
	{ name: 'Corrupted Gauntlet Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Corrupted Hunllef', description: 'Complete a Corrupted Gauntlet in less than 6 minutes and 30 seconds.' },

	{ name: 'Gauntlet Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Crystalline Hunllef', description: 'Complete the Gauntlet in less than 4 minutes.' },

	{ name: 'Duel of Mokhaiotl', tier: 'Grandmaster', type: 'Restriction', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 whilst only damaging the boss with one-handed melee attacks.' },
	{ name: 'Perfect Doom', tier: 'Grandmaster', type: 'Perfection', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 without taking any damage from the boss, letting any grubs be absorbed, or stepping in acid blood.' },
	{ name: 'The Praying Mantis', tier: 'Grandmaster', type: 'Restriction', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 without restoring your prayer points through any method.' },
	{ name: 'Doom Racer', tier: 'Grandmaster', type: 'Speed', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 in less than 7:15.' },
	{ name: 'Darkness Is Your Ally?', tier: 'Grandmaster', type: 'Restriction', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 without equipping a demonbane weapon.' },
	{ name: "It's Dark Down Here", tier: 'Grandmaster', type: 'Stamina', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl at delve level 16.' },
	{ name: 'Mopping up', tier: 'Grandmaster', type: 'Mechanical', monster: 'Doom of Mokhaiotl', description: 'Clear at least 8 acid splats in a single Volatile Earth special attack.' },

	{ name: 'Duke Sucellus Sleeper', tier: 'Grandmaster', type: 'Kill Count', monster: 'Duke Sucellus', description: 'Kill Awakened Duke Sucellus.' },
	{ name: 'Mirror Image', tier: 'Grandmaster', type: 'Restriction', monster: 'Duke Sucellus', description: 'Kill Duke Sucellus whilst only attacking the boss on the same tick Duke attacks you.' },
	{ name: 'Duke Sucellus Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Duke Sucellus', description: 'Kill Duke Sucellus in less than 40 seconds without a slayer task.' },

	{ name: 'Reinforcements', tier: 'Grandmaster', type: 'Mechanical', monster: 'Fortis Colosseum', description: 'Defeat Sol Heredit with "Bees II", "Quartet" and "Solarflare II" modifiers active.' },
	{ name: 'Slow Dancing in the Sand', tier: 'Grandmaster', type: 'Restriction', monster: 'Fortis Colosseum', description: 'Defeat Sol Heredit without running during the fight with him.' },
	{ name: 'Perfect Footwork', tier: 'Grandmaster', type: 'Perfection', monster: 'Fortis Colosseum', description: 'Defeat Sol Heredit without taking any damage from his Spear, Shield, Grapple or Triple Attack.' },
	{ name: 'Colosseum Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Fortis Colosseum', description: 'Complete the Colosseum with a total time of 24:00 or less.' },
	{ name: 'Colosseum Grand Champion', tier: 'Grandmaster', type: 'Kill Count', monster: 'Fortis Colosseum', description: 'Defeat Sol Heredit 10 times.' },

	{ name: 'Keep Away', tier: 'Grandmaster', type: 'Perfection', monster: 'General Graardor', description: 'Kill General Graardor in a private instance without taking any damage from the boss or bodyguards.' },
	{ name: 'Defence Matters', tier: 'Grandmaster', type: 'Perfection', monster: 'General Graardor', description: 'Kill General Graardor 2 times consecutively in a private instance without taking any damage from his bodyguards.' },
	{ name: 'Ourg Killer', tier: 'Grandmaster', type: 'Stamina', monster: 'General Graardor', description: 'Kill General Graardor 15 times in a private instance without leaving the room.' },

	{ name: 'Grotesque Guardians Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians in less than 1:20 minutes.' },

	{ name: 'Demon Whisperer', tier: 'Grandmaster', type: 'Perfection', monster: "K'ril Tsutsaroth", description: "Kill K'ril Tsutsaroth in a private instance without ever being hit by his bodyguards." },
	{ name: 'Ash Collector', tier: 'Grandmaster', type: 'Stamina', monster: "K'ril Tsutsaroth", description: "Kill K'ril Tsutsaroth 20 times in a private instance without leaving the room." },

	{ name: 'The Worst Ranged Weapon', tier: 'Grandmaster', type: 'Restriction', monster: "Kree'arra", description: "Kill Kree'arra by only dealing damage to him with a salamander." },
	{ name: 'Feather Hunter', tier: 'Grandmaster', type: 'Stamina', monster: "Kree'arra", description: "Kill Kree'arra 30 times in a private instance without leaving the room." },

	{ name: 'Leviathan Sleeper', tier: 'Grandmaster', type: 'Kill Count', monster: 'Leviathan', description: 'Kill the Awakened Leviathan.' },
	{ name: 'Leviathan Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Leviathan', description: 'Kill the Leviathan in less than 1:10 without a slayer task.' },
	{ name: 'Unconventional', tier: 'Grandmaster', type: 'Restriction', monster: 'Leviathan', description: 'Kill the Leviathan using only Mithril ammunition whilst having no more than 25 Hitpoints throughout the entire fight.' },

	{ name: 'Nex Duo', tier: 'Grandmaster', type: 'Restriction', monster: 'Nex', description: 'Kill Nex with two or less players at the start of the fight.' },
	{ name: 'Perfect Nex', tier: 'Grandmaster', type: 'Perfection', monster: 'Nex', description: 'Kill Nex whilst completing the requirements for "There is no escape", "Shadows move", "A siphon will solve this", and "Contain this!"' },
	{ name: 'I should see a doctor', tier: 'Grandmaster', type: 'Restriction', monster: 'Nex', description: 'Kill Nex whilst a player is coughing.' },

	{ name: 'Phantom Muspah Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah in less than 1 minute and 30 seconds without a slayer task.' },
	{ name: 'Phantom Muspah Manipulator', tier: 'Grandmaster', type: 'Perfection', monster: 'Phantom Muspah', description: "Kill the Phantom Muspah whilst completing Walk Straight Pray True, Space is Tight & Can't Escape." },

	{ name: "Phosani's Grandmaster", tier: 'Grandmaster', type: 'Kill Count', monster: "Phosani's Nightmare", description: "Kill Phosani's Nightmare 25 times." },
	{ name: "Perfect Phosani's Nightmare", tier: 'Grandmaster', type: 'Perfection', monster: "Phosani's Nightmare", description: "Kill Phosani's Nightmare while only taking damage from husks, power blasts and weakened Parasites. Also, without having your attacks slowed by the Nightmare Spores or letting a Sleepwalker reach Phosani's Nightmare." },
	{ name: "Can't Wake Up", tier: 'Grandmaster', type: 'Stamina', monster: "Phosani's Nightmare", description: "Kill Phosani's Nightmare 5 times in a row without leaving Phosani's Dream." },
	{ name: "Phosani's Speedrunner", tier: 'Grandmaster', type: 'Speed', monster: "Phosani's Nightmare", description: 'Kill Phosani\'s Nightmare within 6 minutes.' },

	{ name: 'Hueycoatl Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'The Hueycoatl', description: 'Kill the Hueycoatl in 2:30 with three or fewer players.' },

	{ name: 'Nightmare (5-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'The Nightmare', description: 'Defeat the Nightmare (5-scale) in less than 3:30 minutes.' },
	{ name: 'Terrible Parent', tier: 'Grandmaster', type: 'Mechanical', monster: 'The Nightmare', description: 'Kill the Nightmare solo without the Parasites healing the boss for more than 100 health.' },
	{ name: 'Nightmare (Solo) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'The Nightmare', description: 'Defeat the Nightmare (Solo) in less than 16 minutes.' },
	{ name: 'A Long Trip', tier: 'Grandmaster', type: 'Restriction', monster: 'The Nightmare', description: 'Kill the Nightmare without any player losing any prayer points.' },

	{ name: 'Theatre (Duo) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood (Duo) in less than 26 minutes.' },
	{ name: 'Theatre (Trio) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood (Trio) in less than 17 minutes and 30 seconds.' },
	{ name: 'Morytania Only', tier: 'Grandmaster', type: 'Restriction', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood without any member of the team equipping a non-barrows weapon (except Dawnbringer).' },
	{ name: 'Perfect Theatre', tier: 'Grandmaster', type: 'Perfection', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood without anyone dying through any means and whilst everyone in the team completes all Perfect boss tasks in a single run.' },
	{ name: 'Theatre (4-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood (4-scale) in less than 15 minutes.' },
	{ name: 'Theatre (5-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood (5-scale) in less than 14 minutes and 15 seconds.' },
	{ name: 'Theatre of Blood Grandmaster', tier: 'Grandmaster', type: 'Kill Count', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood 150 times.' },

	{ name: 'Theatre: HM (4-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood: Hard Mode', description: 'Complete the Theatre of Blood: Hard Mode (4-scale) with an overall time of less than 21 minutes.' },
	{ name: 'Harder Mode II', tier: 'Grandmaster', type: 'Perfection', monster: 'Theatre of Blood: Hard Mode', description: 'Defeat Xarpus in the Theatre of Blood: Hard Mode after letting the exhumeds heal him to full health and without anyone in the team taking any damage.' },
	{ name: 'Nylo Sniper', tier: 'Grandmaster', type: 'Mechanical', monster: 'Theatre of Blood: Hard Mode', description: "Defeat Verzik Vitur's in the Theatre of Blood: Hard Mode without anyone in your team causing a Nylocas to explode by getting too close." },
	{ name: 'Theatre: HM (5-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood: Hard Mode', description: 'Complete the Theatre of Blood: Hard Mode (5-scale) with an overall time of less than 19 minutes.' },
	{ name: 'Theatre: HM (Trio) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood: Hard Mode', description: 'Complete the Theatre of Blood: Hard Mode (Trio) with an overall time of less than 23 minutes.' },
	{ name: 'Theatre of Blood: HM Grandmaster', tier: 'Grandmaster', type: 'Kill Count', monster: 'Theatre of Blood: Hard Mode', description: 'Complete the Theatre of Blood: Hard Mode 50 times.' },
	{ name: 'Personal Space', tier: 'Grandmaster', type: 'Mechanical', monster: 'Theatre of Blood: Hard Mode', description: 'Defeat the Pestilent Bloat in the Theatre of Blood: Hard Mode with at least 3 people in the room, without anyone in your team standing on top of each other.' },

	{ name: 'Alchemical Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Alchemical Hydra', description: 'Kill the Alchemical Hydra in less than 1 minute 20 seconds.' },
	{ name: 'No Pressure', tier: 'Grandmaster', type: 'Restriction', monster: 'Alchemical Hydra', description: "Kill the Alchemical Hydra using only Dharok's Greataxe as a weapon whilst having no more than 10 Hitpoints throughout the entire fight." },

	{ name: 'Swimming in Venom', tier: 'Grandmaster', type: 'Restriction', monster: 'Araxxor', description: 'Kill Araxxor without the boss ever moving.' },
	{ name: 'Perfect Araxxor 2', tier: 'Grandmaster', type: 'Perfection', monster: 'Araxxor', description: 'Kill Araxxor perfectly, without hitting it during the enrage phase.' },
	{ name: 'Araxxor Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Araxxor', description: 'Kill Araxxor 6 times in 10:00.' },

	{ name: 'Chambers of Xeric (5-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric (5-scale) in less than 12 minutes and 30 seconds.' },
	{ name: 'Chambers of Xeric (Trio) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric (Trio) in less than 14 minutes and 30 seconds.' },
	{ name: 'Chambers of Xeric Grandmaster', tier: 'Grandmaster', type: 'Kill Count', monster: 'Chambers of Xeric', description: 'Complete the Chambers of Xeric 150 times.' },
	{ name: 'Chambers of Xeric (Solo) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric', description: 'Complete a Chambers of Xeric (Solo) in less than 17 minutes.' },

	{ name: 'Chambers of Xeric: CM (Trio) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric: Challenge Mode (Trio) in less than 27 minutes.' },
	{ name: 'Chambers of Xeric: CM Grandmaster', tier: 'Grandmaster', type: 'Kill Count', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete the Chambers of Xeric: Challenge Mode 25 times.' },
	{ name: 'Chambers of Xeric: CM (5-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric: Challenge Mode (5-scale) in less than 25 minutes.' },
	{ name: 'Chambers of Xeric: CM (Solo) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Chambers of Xeric: Challenge Mode', description: 'Complete a Chambers of Xeric: Challenge Mode (Solo) in less than 38 minutes and 30 seconds.' },

	{ name: 'Animal Whisperer', tier: 'Grandmaster', type: 'Perfection', monster: 'Commander Zilyana', description: 'Kill Commander Zilyana in a private instance without taking any damage from the boss or bodyguards.' },
	{ name: 'Peach Conjurer', tier: 'Grandmaster', type: 'Stamina', monster: 'Commander Zilyana', description: 'Kill Commander Zilyana 50 times in a privately rented instance without leaving the room.' },

	{ name: 'Egniol Diet II', tier: 'Grandmaster', type: 'Restriction', monster: 'Corrupted Hunllef', description: 'Kill the Corrupted Hunllef without making an egniol potion within the Corrupted Gauntlet.' },
	{ name: 'Corrupted Gauntlet Grandmaster', tier: 'Grandmaster', type: 'Kill Count', monster: 'Corrupted Hunllef', description: 'Complete the Corrupted Gauntlet 50 times.' },
	{ name: 'Wolf Puncher II', tier: 'Grandmaster', type: 'Restriction', monster: 'Corrupted Hunllef', description: 'Kill the Corrupted Hunllef without making more than one attuned weapon.' },
	{ name: 'Corrupted Gauntlet Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Corrupted Hunllef', description: 'Complete a Corrupted Gauntlet in less than 6 minutes and 30 seconds.' },

	{ name: 'Gauntlet Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Crystalline Hunllef', description: 'Complete the Gauntlet in less than 4 minutes.' },

	{ name: 'Duel of Mokhaiotl', tier: 'Grandmaster', type: 'Restriction', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 whilst only damaging the boss with one-handed melee attacks.' },
	{ name: 'Perfect Doom', tier: 'Grandmaster', type: 'Perfection', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 without taking any damage from the boss, letting any grubs be absorbed, or stepping in acid blood.' },
	{ name: 'The Praying Mantis', tier: 'Grandmaster', type: 'Restriction', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 without restoring your prayer points through any method.' },
	{ name: 'Doom Racer', tier: 'Grandmaster', type: 'Speed', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 in less than 7:15.' },
	{ name: 'Darkness Is Your Ally?', tier: 'Grandmaster', type: 'Restriction', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl levels 1-8 without equipping a demonbane weapon.' },
	{ name: "It's Dark Down Here", tier: 'Grandmaster', type: 'Stamina', monster: 'Doom of Mokhaiotl', description: 'Defeat the Doom of Mokhaiotl at delve level 16.' },
	{ name: 'Mopping up', tier: 'Grandmaster', type: 'Mechanical', monster: 'Doom of Mokhaiotl', description: 'Clear at least 8 acid splats in a single Volatile Earth special attack.' },

	{ name: 'Duke Sucellus Sleeper', tier: 'Grandmaster', type: 'Kill Count', monster: 'Duke Sucellus', description: 'Kill Awakened Duke Sucellus.' },
	{ name: 'Mirror Image', tier: 'Grandmaster', type: 'Restriction', monster: 'Duke Sucellus', description: 'Kill Duke Sucellus whilst only attacking the boss on the same tick Duke attacks you.' },
	{ name: 'Duke Sucellus Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Duke Sucellus', description: 'Kill Duke Sucellus in less than 40 seconds without a slayer task.' },

	{ name: 'Reinforcements', tier: 'Grandmaster', type: 'Mechanical', monster: 'Fortis Colosseum', description: 'Defeat Sol Heredit with "Bees II", "Quartet" and "Solarflare II" modifiers active.' },
	{ name: 'Slow Dancing in the Sand', tier: 'Grandmaster', type: 'Restriction', monster: 'Fortis Colosseum', description: 'Defeat Sol Heredit without running during the fight with him.' },
	{ name: 'Perfect Footwork', tier: 'Grandmaster', type: 'Perfection', monster: 'Fortis Colosseum', description: 'Defeat Sol Heredit without taking any damage from his Spear, Shield, Grapple or Triple Attack.' },
	{ name: 'Colosseum Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Fortis Colosseum', description: 'Complete the Colosseum with a total time of 24:00 or less.' },
	{ name: 'Colosseum Grand Champion', tier: 'Grandmaster', type: 'Kill Count', monster: 'Fortis Colosseum', description: 'Defeat Sol Heredit 10 times.' },

	{ name: 'Keep Away', tier: 'Grandmaster', type: 'Perfection', monster: 'General Graardor', description: 'Kill General Graardor in a private instance without taking any damage from the boss or bodyguards.' },
	{ name: 'Defence Matters', tier: 'Grandmaster', type: 'Perfection', monster: 'General Graardor', description: 'Kill General Graardor 2 times consecutively in a private instance without taking any damage from his bodyguards.' },
	{ name: 'Ourg Killer', tier: 'Grandmaster', type: 'Stamina', monster: 'General Graardor', description: 'Kill General Graardor 15 times in a private instance without leaving the room.' },

	{ name: 'Grotesque Guardians Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Grotesque Guardians', description: 'Kill the Grotesque Guardians in less than 1:20 minutes.' },

	{ name: 'Demon Whisperer', tier: 'Grandmaster', type: 'Perfection', monster: "K'ril Tsutsaroth", description: "Kill K'ril Tsutsaroth in a private instance without ever being hit by his bodyguards." },
	{ name: 'Ash Collector', tier: 'Grandmaster', type: 'Stamina', monster: "K'ril Tsutsaroth", description: "Kill K'ril Tsutsaroth 20 times in a private instance without leaving the room." },

	{ name: 'The Worst Ranged Weapon', tier: 'Grandmaster', type: 'Restriction', monster: "Kree'arra", description: "Kill Kree'arra by only dealing damage to him with a salamander." },
	{ name: 'Feather Hunter', tier: 'Grandmaster', type: 'Stamina', monster: "Kree'arra", description: "Kill Kree'arra 30 times in a private instance without leaving the room." },

	{ name: 'Leviathan Sleeper', tier: 'Grandmaster', type: 'Kill Count', monster: 'Leviathan', description: 'Kill the Awakened Leviathan.' },
	{ name: 'Leviathan Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Leviathan', description: 'Kill the Leviathan in less than 1:10 without a slayer task.' },
	{ name: 'Unconventional', tier: 'Grandmaster', type: 'Restriction', monster: 'Leviathan', description: 'Kill the Leviathan using only Mithril ammunition whilst having no more than 25 Hitpoints throughout the entire fight.' },

	{ name: 'Nex Duo', tier: 'Grandmaster', type: 'Restriction', monster: 'Nex', description: 'Kill Nex with two or less players at the start of the fight.' },
	{ name: 'Perfect Nex', tier: 'Grandmaster', type: 'Perfection', monster: 'Nex', description: 'Kill Nex whilst completing the requirements for "There is no escape", "Shadows move", "A siphon will solve this", and "Contain this!"' },
	{ name: 'I should see a doctor', tier: 'Grandmaster', type: 'Restriction', monster: 'Nex', description: 'Kill Nex whilst a player is coughing.' },

	{ name: 'Phantom Muspah Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Phantom Muspah', description: 'Kill the Phantom Muspah in less than 1 minute and 30 seconds without a slayer task.' },
	{ name: 'Phantom Muspah Manipulator', tier: 'Grandmaster', type: 'Perfection', monster: 'Phantom Muspah', description: "Kill the Phantom Muspah whilst completing Walk Straight Pray True, Space is Tight & Can't Escape." },

	{ name: "Phosani's Grandmaster", tier: 'Grandmaster', type: 'Kill Count', monster: "Phosani's Nightmare", description: "Kill Phosani's Nightmare 25 times." },
	{ name: "Perfect Phosani's Nightmare", tier: 'Grandmaster', type: 'Perfection', monster: "Phosani's Nightmare", description: "Kill Phosani's Nightmare while only taking damage from husks, power blasts and weakened Parasites. Also, without having your attacks slowed by the Nightmare Spores or letting a Sleepwalker reach Phosani's Nightmare." },
	{ name: "Can't Wake Up", tier: 'Grandmaster', type: 'Stamina', monster: "Phosani's Nightmare", description: "Kill Phosani's Nightmare 5 times in a row without leaving Phosani's Dream." },
	{ name: "Phosani's Speedrunner", tier: 'Grandmaster', type: 'Speed', monster: "Phosani's Nightmare", description: 'Kill Phosani\'s Nightmare within 6 minutes.' },

	{ name: 'Hueycoatl Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'The Hueycoatl', description: 'Kill the Hueycoatl in 2:30 with three or fewer players.' },

	{ name: 'Nightmare (5-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'The Nightmare', description: 'Defeat the Nightmare (5-scale) in less than 3:30 minutes.' },
	{ name: 'Terrible Parent', tier: 'Grandmaster', type: 'Mechanical', monster: 'The Nightmare', description: 'Kill the Nightmare solo without the Parasites healing the boss for more than 100 health.' },
	{ name: 'Nightmare (Solo) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'The Nightmare', description: 'Defeat the Nightmare (Solo) in less than 16 minutes.' },
	{ name: 'A Long Trip', tier: 'Grandmaster', type: 'Restriction', monster: 'The Nightmare', description: 'Kill the Nightmare without any player losing any prayer points.' },

	{ name: 'Theatre (Duo) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood (Duo) in less than 26 minutes.' },
	{ name: 'Theatre (Trio) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood (Trio) in less than 17 minutes and 30 seconds.' },
	{ name: 'Morytania Only', tier: 'Grandmaster', type: 'Restriction', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood without any member of the team equipping a non-barrows weapon (except Dawnbringer).' },
	{ name: 'Perfect Theatre', tier: 'Grandmaster', type: 'Perfection', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood without anyone dying through any means and whilst everyone in the team completes the following Combat Achievement tasks in a single run: "Perfect Maiden", "Perfect Bloat", "Perfect Nylocas", "Perfect Sotetseg", "Perfect Xarpus" and "Perfect Verzik".' },
	{ name: 'Theatre (4-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood (4-scale) in less than 15 minutes.' },
	{ name: 'Theatre (5-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood (5-scale) in less than 14 minutes and 15 seconds.' },
	{ name: 'Theatre of Blood Grandmaster', tier: 'Grandmaster', type: 'Kill Count', monster: 'Theatre of Blood', description: 'Complete the Theatre of Blood 150 times.' },

	{ name: 'Theatre: HM (4-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood: Hard Mode', description: 'Complete the Theatre of Blood: Hard Mode (4-scale) with an overall time of less than 21 minutes.' },
	{ name: 'Harder Mode II', tier: 'Grandmaster', type: 'Perfection', monster: 'Theatre of Blood: Hard Mode', description: 'Defeat Xarpus in the Theatre of Blood: Hard Mode after letting the exhumeds heal him to full health and without anyone in the team taking any damage.' },
	{ name: 'Nylo Sniper', tier: 'Grandmaster', type: 'Mechanical', monster: 'Theatre of Blood: Hard Mode', description: "Defeat Verzik Vitur's in the Theatre of Blood: Hard Mode without anyone in your team causing a Nylocas to explode by getting too close." },
	{ name: 'Theatre: HM (5-Scale) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood: Hard Mode', description: 'Complete the Theatre of Blood: Hard Mode (5-scale) with an overall time of less than 19 minutes.' },
	{ name: 'Theatre: HM (Trio) Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Theatre of Blood: Hard Mode', description: 'Complete the Theatre of Blood: Hard Mode (Trio) with an overall time of less than 23 minutes.' },
	{ name: 'Theatre of Blood: HM Grandmaster', tier: 'Grandmaster', type: 'Kill Count', monster: 'Theatre of Blood: Hard Mode', description: 'Complete the Theatre of Blood: Hard Mode 50 times.' },
	{ name: 'Personal Space', tier: 'Grandmaster', type: 'Mechanical', monster: 'Theatre of Blood: Hard Mode', description: 'Defeat the Pestilent Bloat in the Theatre of Blood: Hard Mode with at least 3 people in the room, without anyone in your team standing on top of each other.' },
	{ name: 'Pack Like a Yak', tier: 'Grandmaster', type: 'Restriction', monster: 'Theatre of Blood: Hard Mode', description: 'Complete the Theatre of Blood: Hard Mode within the challenge time, with no deaths and without anyone buying anything from a supply chest.' },
	{ name: 'Stop Right There!', tier: 'Grandmaster', type: 'Mechanical', monster: 'Theatre of Blood: Hard Mode', description: 'Defeat the Maiden of Sugadinti in the Theatre of Blood: Hard Mode without letting blood spawns create more than 15 blood trails.' },
	{ name: 'Team Work Makes the Dream Work', tier: 'Grandmaster', type: 'Mechanical', monster: 'Theatre of Blood: Hard Mode', description: 'When Verzik Vitur in the Theatre of Blood: Hard Mode uses her yellow power blast attack while the tornadoes are active, have everyone get through the attack without taking damage. This cannot be completed with one player alive' },
	{ name: 'Harder Mode I', tier: 'Grandmaster', type: 'Perfection', monster: 'Theatre of Blood: Hard Mode', description: 'Defeat Sotetseg in the Theatre of Blood: Hard Mode without anyone sharing the ball with anyone, without anyone dying, and without anyone taking damage from any of its other attacks or stepping on the wrong tile in the maze.' },
	{ name: 'Royal Affairs', tier: 'Grandmaster', type: 'Mechanical', monster: 'Theatre of Blood: Hard Mode', description: 'In the Theatre of Blood: Hard Mode, complete the Nylocas room without ever letting the Nylocas Prinkipas change styles.' },
	{ name: 'Harder Mode III', tier: 'Grandmaster', type: 'Restriction', monster: 'Theatre of Blood: Hard Mode', description: 'Defeat Verzik Vitur in the Theatre of Blood: Hard Mode without anyone attacking her with a melee weapon during her third phase.' },

	{ name: 'Perfection of Apmeken', tier: 'Grandmaster', type: 'Perfection', monster: 'Tombs of Amascut: Expert Mode', description: "Complete 'Perfect Apmeken' and 'Perfect Ba-Ba' in a single run of the Tombs of Amascut." },
	{ name: 'Perfection of Crondis', tier: 'Grandmaster', type: 'Perfection', monster: 'Tombs of Amascut: Expert Mode', description: "Complete 'Perfect Crondis' and 'Perfect Zebak' in a single run of the Tombs of Amascut." },
	{ name: 'Perfection of Scabaras', tier: 'Grandmaster', type: 'Perfection', monster: 'Tombs of Amascut: Expert Mode', description: "Complete 'Perfect Scabaras' and 'Perfect Kephri' in a single run of Tombs of Amascut." },
	{ name: 'Perfection of Het', tier: 'Grandmaster', type: 'Perfection', monster: 'Tombs of Amascut: Expert Mode', description: "Complete 'Perfect Het' and 'Perfect Akkha' in a single run of the Tombs of Amascut." },
	{ name: "Akkhan't Do it", tier: 'Grandmaster', type: 'Mechanical', monster: 'Tombs of Amascut: Expert Mode', description: 'Defeat Akkha with all Akkha invocations activated and the path levelled up to at least four, without dying yourself.' },
	{ name: 'Expert Tomb Raider', tier: 'Grandmaster', type: 'Kill Count', monster: 'Tombs of Amascut: Expert Mode', description: 'Complete the Tombs of Amascut (Expert mode) 50 times.' },
	{ name: 'Tombs Speed Runner II', tier: 'Grandmaster', type: 'Speed', monster: 'Tombs of Amascut: Expert Mode', description: 'Complete the Tombs of Amascut (expert) within 20 mins at any group size.' },
	{ name: 'All Praise Zebak', tier: 'Grandmaster', type: 'Mechanical', monster: 'Tombs of Amascut: Expert Mode', description: "Defeat Zebak without losing a single prayer point. You must also meet the conditions of the 'Rockin' Around The Croc' achievement." },
	{ name: 'Tombs Speed Runner III', tier: 'Grandmaster', type: 'Speed', monster: 'Tombs of Amascut: Expert Mode', description: 'Complete the Tombs of Amascut (expert) within 18 mins in a group of 8.' },
	{ name: "Maybe I'm the boss.", tier: 'Grandmaster', type: 'Mechanical', monster: 'Tombs of Amascut: Expert Mode', description: 'Complete a Tombs of Amascut raid with every single boss invocation activated and without anyone dying.' },
	{ name: "Amascut's Remnant", tier: 'Grandmaster', type: 'Mechanical', monster: 'Tombs of Amascut: Expert Mode', description: 'Complete the Tombs of Amascut at raid level 500 or above without anyone dying.' },
	{ name: 'Insanity', tier: 'Grandmaster', type: 'Perfection', monster: 'Tombs of Amascut: Expert Mode', description: "Complete 'Perfect Wardens' at expert or above." },

	{ name: 'The VI Jad Challenge', tier: 'Grandmaster', type: 'Kill Count', monster: "TzHaar-Ket-Rak's Challenges", description: "Complete TzHaar-Ket-Rak's sixth challenge." },
	{ name: "TzHaar-Ket-Rak's Speed-Runner", tier: 'Grandmaster', type: 'Speed', monster: "TzHaar-Ket-Rak's Challenges", description: "Complete TzHaar-Ket-Rak's fifth challenge in less than 5 minutes." },
	{ name: "It Wasn't a Fluke", tier: 'Grandmaster', type: 'Perfection', monster: "TzHaar-Ket-Rak's Challenges", description: "Complete TzHaar-Ket-Rak's fifth and sixth challenges back to back without failing." },

	{ name: 'Nibbler Chaser', tier: 'Grandmaster', type: 'Restriction', monster: 'TzKal-Zuk', description: 'Kill Tzkal-Zuk without using any magic spells during any wave in the Inferno.' },
	{ name: 'Jad? What Are You Doing Here?', tier: 'Grandmaster', type: 'Restriction', monster: 'TzKal-Zuk', description: 'Kill Tzkal-Zuk without killing the JalTok-Jad which spawns during wave 69.' },
	{ name: 'Playing with Jads', tier: 'Grandmaster', type: 'Mechanical', monster: 'TzKal-Zuk', description: 'Complete wave 68 of the Inferno within 30 seconds of the first JalTok-Jad dying.' },
	{ name: 'Facing Jad Head-on II', tier: 'Grandmaster', type: 'Restriction', monster: 'TzKal-Zuk', description: 'Kill Tzkal-Zuk without equipping any range or mage weapons before wave 69.' },
	{ name: "Wasn't Even Close", tier: 'Grandmaster', type: 'Restriction', monster: 'TzKal-Zuk', description: 'Kill Tzkal-Zuk without letting your hitpoints fall below 50 during any wave in the Inferno.' },
	{ name: 'No Luck Required', tier: 'Grandmaster', type: 'Perfection', monster: 'TzKal-Zuk', description: 'Kill Tzkal-Zuk without being attacked by TzKal-Zuk and without taking damage from a JalTok-Jad.' },
	{ name: 'The Floor Is Lava', tier: 'Grandmaster', type: 'Mechanical', monster: 'TzKal-Zuk', description: 'Kill Tzkal-Zuk without letting Jal-ImKot dig during any wave in the Inferno.' },
	{ name: 'Inferno Grandmaster', tier: 'Grandmaster', type: 'Kill Count', monster: 'TzKal-Zuk', description: 'Complete the Inferno 5 times.' },
	{ name: 'Budget Setup', tier: 'Grandmaster', type: 'Restriction', monster: 'TzKal-Zuk', description: 'Kill Tzkal-Zuk without equipping a Twisted Bow within the Inferno.' },
	{ name: 'Inferno Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'TzKal-Zuk', description: 'Complete the Inferno in less than 65 minutes.' },

	{ name: 'Fight Caves Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'TzTok-Jad', description: 'Complete the Fight Caves in less than 26 minutes and 30 seconds.' },
	{ name: 'No Time for a Drink', tier: 'Grandmaster', type: 'Restriction', monster: 'TzTok-Jad', description: 'Complete the Fight Caves without losing any prayer points.' },
	{ name: 'Denying the Healers II', tier: 'Grandmaster', type: 'Mechanical', monster: 'TzTok-Jad', description: 'Complete the Fight Caves without TzTok-Jad being healed by a Yt-HurKot.' },

	{ name: 'Vardorvis Sleeper', tier: 'Grandmaster', type: 'Kill Count', monster: 'Vardorvis', description: 'Kill Awakened Vardorvis.' },
	{ name: 'Vardorvis Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Vardorvis', description: 'Kill Vardorvis in less than 0:55 without a slayer task.' },
	{ name: 'Axe Enthusiast', tier: 'Grandmaster', type: 'Mechanical', monster: 'Vardorvis', description: "Kill Vardorvis after surviving for 3 minutes of Vardorvis' max speed, and never leaving the centre 25 tiles." },

	{ name: 'Vorkath Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Vorkath', description: 'Kill Vorkath in less than 54 seconds.' },
	{ name: 'Faithless Encounter', tier: 'Grandmaster', type: 'Restriction', monster: 'Vorkath', description: 'Kill Vorkath without losing any prayer points.' },
	{ name: 'The Fremennik Way', tier: 'Grandmaster', type: 'Restriction', monster: 'Vorkath', description: 'Kill Vorkath with only your fists.' },

	{ name: 'Whisperer Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Whisperer', description: 'Kill the Whisperer in less than 2:05 without a slayer task.' },
	{ name: 'Whispered', tier: 'Grandmaster', type: 'Kill Count', monster: 'Whisperer', description: 'Kill the Awakened Whisperer.' },
	{ name: 'Dark Memories', tier: 'Grandmaster', type: 'Restriction', monster: 'Whisperer', description: 'Kill the Whisperer whilst spending less than 6 seconds in the pre-enrage shadow realm.' },

	{ name: 'Yama Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Yama', description: 'Defeat Yama in an average time of under 2:34 over your last four kills.' },
	{ name: 'Contractually Unbound', tier: 'Grandmaster', type: 'Kill Count', monster: 'Yama', description: 'Defeat Yama under the elevated conditions of one of his non-standard contracts.' },
	{ name: 'Contract Choreographer', tier: 'Grandmaster', type: 'Perfection', monster: 'Yama', description: "Defeat Yama whilst completing 'Shadow Dancer', 'Fire Fighter', 'Back so soon?' and without taking any other avoidable damage." },

	{ name: 'Zulrah Speed-Runner', tier: 'Grandmaster', type: 'Speed', monster: 'Zulrah', description: 'Kill Zulrah in less than 54 seconds, without a slayer task.' },
];

// NOTE: Due to token limits, I'm providing the migration structure with Easy, Medium, Hard, and Elite tiers.
// Master and Grandmaster tiers should be added following the same pattern.

// Hard, Elite, Master, and Grandmaster achievements will be added programmatically
// to stay within reasonable file size limits

async function up() {
	console.log('Running migration: 022_seed_combat_achievements');
	
	let count = 0;
	
	try {
		// Process in batches to avoid overwhelming the database
		const batchSize = 50;
		
		for (let i = 0; i < combatAchievements.length; i += batchSize) {
			const batch = combatAchievements.slice(i, i + batchSize);
			
			for (const ca of batch) {
				await db.query(`
					INSERT INTO combat_achievements (name, tier, type, monster, description)
					VALUES ($1, $2, $3, $4, $5)
					ON CONFLICT (name) DO UPDATE SET
						tier = EXCLUDED.tier,
						type = EXCLUDED.type,
						monster = EXCLUDED.monster,
						description = EXCLUDED.description
				`, [ca.name, ca.tier, ca.type, ca.monster, ca.description]);
				count++;
			}
			
			console.log(`Processed ${Math.min(i + batchSize, combatAchievements.length)}/${combatAchievements.length} achievements...`);
		}
		
		console.log(`✅ Seeded ${count} combat achievements (Easy + Medium tiers)`);
		console.log('⚠️  NOTE: This migration only includes Easy and Medium tiers.');
		console.log('⚠️  Run additional seed scripts for Hard, Elite, Master, and Grandmaster tiers.');
		console.log('✅ Migration 022_seed_combat_achievements completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 022_seed_combat_achievements failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 022_seed_combat_achievements');
	
	try {
		// Delete all seeded combat achievements
		await db.query('DELETE FROM combat_achievements');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };
