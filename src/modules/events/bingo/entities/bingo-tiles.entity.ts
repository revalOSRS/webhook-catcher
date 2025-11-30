/**
 * Bingo Tiles Entity
 * Database operations for the bingo tiles library
 */

import { query, queryOne } from '../../../../db/connection.js';
import { BaseEntity } from '../../../base-entity.js';

export enum BingoTileMatchType {
  ANY = 'any',
  ALL = 'all'
}

export enum BingoTileDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXTREME = 'extreme'
}

export enum BingoTileCategory {
  SLAYER = 'slayer',
  PVM = 'pvm',
  RAIDS = 'raids',
  COLLECTION = 'collection',
  CLUES = 'clues',
  SKILLS = 'skills',
  QUESTS = 'quests',
  DIARIES = 'diaries',
  MINIGAMES = 'minigames',
  COMBAT = 'combat',
  PETS = 'pets',
  AGILITY = 'agility'
}

export enum BingoTileRequirementType {
  ITEM_DROP = 'ITEM_DROP',
  PET = 'PET',
  VALUE_DROP = 'VALUE_DROP',
  SPEEDRUN = 'SPEEDRUN',
  EXPERIENCE = 'EXPERIENCE',
  BA_GAMBLES = 'BA_GAMBLES'
}

/**
 * Item drop requirement definition
 */
export interface ItemDropRequirementDef {
  type: BingoTileRequirementType.ITEM_DROP;
  items: Array<{
    itemName: string;
    itemId: number;
    itemAmount?: number;
  }>;
  totalAmount?: number;
}

/**
 * Pet requirement definition
 */
export interface PetRequirementDef {
  type: BingoTileRequirementType.PET;
  petName: string;
  amount: number;
}

/**
 * Value drop requirement definition
 */
export interface ValueDropRequirementDef {
  type: BingoTileRequirementType.VALUE_DROP;
  value: number;
}

/**
 * Speedrun requirement definition
 */
export interface SpeedrunRequirementDef {
  type: BingoTileRequirementType.SPEEDRUN;
  location: string;
  goalSeconds: number;
}

/**
 * Experience requirement definition
 */
export interface ExperienceRequirementDef {
  type: BingoTileRequirementType.EXPERIENCE;
  skill: string;
  experience: number;
}

/**
 * BA gambles requirement definition
 */
export interface BaGamblesRequirementDef {
  type: BingoTileRequirementType.BA_GAMBLES;
  amount: number;
}

/**
 * Union type for all requirement definitions
 */
export type BingoTileRequirementDef =
  | ItemDropRequirementDef
  | PetRequirementDef
  | ValueDropRequirementDef
  | SpeedrunRequirementDef
  | ExperienceRequirementDef
  | BaGamblesRequirementDef;

/**
 * Tiered requirement with points
 */
export interface TieredRequirementDef {
  tier: number;
  requirement: BingoTileRequirementDef;
  points: number;
}

/**
 * Complete requirements structure for a tile
 */
export interface BingoTileRequirements {
  matchType: BingoTileMatchType;
  requirements: BingoTileRequirementDef[];
  tiers?: TieredRequirementDef[];
}

export interface BingoTile {
  id: string;
  task: string;
  description?: string;
  category: BingoTileCategory;
  difficulty: BingoTileDifficulty;
  icon?: string;
  requirements: BingoTileRequirements;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a new tile (requires custom ID)
 */
export type CreateBingoTileInput = Pick<BingoTile, 'id' | 'task' | 'category' | 'difficulty'> & 
  Partial<Pick<BingoTile, 'description' | 'icon' | 'requirements' | 'points'>>;

/**
 * Input for updating a tile
 */
export type UpdateBingoTileInput = Partial<Pick<BingoTile, 'task' | 'description' | 'category' | 'difficulty' | 'icon' | 'requirements' | 'points'>>;

/**
 * Bingo Tiles Entity Class
 * Handles CRUD operations for the bingo_tiles table (tile library)
 * 
 * Note: Uses custom string IDs provided on creation (not auto-generated).
 */
export class BingoTilesEntity extends BaseEntity<BingoTile, string> {
  protected tableName = 'bingo_tiles';
  protected primaryKey = 'id';
  protected camelCaseFields = ['createdAt', 'updatedAt'];

  /**
   * Create the bingo_tiles table if it doesn't exist
   */
  static createTable = async (): Promise<void> => {
    await query(`
      CREATE TABLE IF NOT EXISTS bingo_tiles (
        id VARCHAR(100) PRIMARY KEY,
        task TEXT NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        icon VARCHAR(100),
        requirements JSONB DEFAULT '{}',
        points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme'))
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tiles_category ON bingo_tiles(category)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tiles_difficulty ON bingo_tiles(difficulty)`);

    console.log('✅ Bingo tiles table created/verified');
  };

  /**
   * Find a tile by ID
   */
  findById = async (id: string): Promise<BingoTile | null> => {
    const result = await queryOne(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result ? this.mapRow(result) : null;
  };

  /**
   * Find all tiles
   */
  async findAll(): Promise<BingoTile[]> {
    const results = await query(
      'SELECT * FROM bingo_tiles ORDER BY category, difficulty, task'
    );
    return results.map(row => this.mapRow(row));
  }

  /**
   * Find tiles by category
   */
  async findByCategory(category: BingoTileCategory): Promise<BingoTile[]> {
    const results = await query(
      'SELECT * FROM bingo_tiles WHERE category = $1 ORDER BY difficulty, task',
      [category]
    );
    return results.map(row => this.mapRow(row));
  }

  /**
   * Find tiles by difficulty
   */
  async findByDifficulty(difficulty: BingoTileDifficulty): Promise<BingoTile[]> {
    const results = await query(
      'SELECT * FROM bingo_tiles WHERE difficulty = $1 ORDER BY category, task',
      [difficulty]
    );
    return results.map(row => this.mapRow(row));
  }

  /**
   * Create a new tile with custom ID
   * Note: Use this instead of base create() because tile IDs are provided, not generated
   */
  createTile = async (input: CreateBingoTileInput): Promise<BingoTile> => {
    const result = await queryOne(`
      INSERT INTO bingo_tiles (id, task, description, category, difficulty, icon, requirements, points)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      input.id,
      input.task,
      input.description || null,
      input.category,
      input.difficulty,
      input.icon || null,
      JSON.stringify(input.requirements || {}),
      input.points || 0
    ]);

    if (!result) {
      throw new Error('Failed to create bingo tile');
    }

    return this.mapRow(result);
  };

  /**
   * Update a tile by ID
   */
  async update(id: string, input: Partial<Pick<BingoTile, 'task' | 'description' | 'category' | 'difficulty' | 'icon' | 'requirements' | 'points'>>): Promise<BingoTile | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.task !== undefined) {
      updates.push(`task = $${paramIndex++}`);
      params.push(input.task);
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(input.description);
    }

    if (input.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(input.category);
    }

    if (input.difficulty !== undefined) {
      updates.push(`difficulty = $${paramIndex++}`);
      params.push(input.difficulty);
    }

    if (input.icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      params.push(input.icon);
    }

    if (input.requirements !== undefined) {
      updates.push(`requirements = $${paramIndex++}`);
      params.push(JSON.stringify(input.requirements));
    }

    if (input.points !== undefined) {
      updates.push(`points = $${paramIndex++}`);
      params.push(input.points);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await queryOne(`
      UPDATE bingo_tiles 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    return result ? this.mapRow(result) : null;
  }

  /**
   * Delete a tile by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM bingo_tiles WHERE id = $1 RETURNING id',
      [id]
    );
    return result.length > 0;
  }

  /**
   * Search tiles by task text
   */
  async search(searchText: string): Promise<BingoTile[]> {
    const results = await query(
      'SELECT * FROM bingo_tiles WHERE task ILIKE $1 OR description ILIKE $1 ORDER BY task',
      [`%${searchText}%`]
    );
    return results.map(row => this.mapRow(row));
  }

  /**
   * Map database row to BingoTile
   */
  private mapRow(row: any): BingoTile {
    return {
      id: row.id,
      task: row.task,
      description: row.description,
      category: row.category as BingoTileCategory,
      difficulty: row.difficulty as BingoTileDifficulty,
      icon: row.icon,
      requirements: row.requirements as BingoTileRequirements,
      points: row.points,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

