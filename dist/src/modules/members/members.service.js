/**
 * Members Service
 * Business logic and operations for member management
 */
import { query, queryOne } from '../../db/connection.js';
import { MembersEntity } from './members.entity.js';
import { MemberMovementsEntity } from './member-movements.entity.js';
/**
 * Members Service Class
 * Provides all member-related business logic and operations
 */
export class MembersService {
    static membersEntity = new MembersEntity();
    static movementsEntity = new MemberMovementsEntity();
    /**
     * Convert MemberData (camelCase) to Member (snake_case)
     */
    static convertToMember(memberData) {
        return {
            id: memberData.id,
            discord_id: memberData.discordId,
            discord_tag: memberData.discordTag,
            member_code: memberData.memberCode,
            token_balance: memberData.tokenBalance,
            is_active: memberData.isActive,
            in_discord: memberData.inDiscord,
            notes: memberData.notes,
            created_at: memberData.createdAt,
            updated_at: memberData.updatedAt,
            last_seen: memberData.lastSeen
        };
    }
    /**
     * Convert MemberMovements (camelCase) to MemberMovements (snake_case for API)
     */
    static convertToMemberMovements(movementData) {
        return {
            id: movementData.id,
            memberId: movementData.memberId,
            discordId: movementData.discordId,
            eventType: movementData.eventType,
            previousRank: movementData.previousRank,
            notes: movementData.notes,
            timestamp: movementData.timestamp
        };
    }
    /**
     * Get member by Discord ID
     */
    static async getMemberByDiscordId(discordId) {
        const memberData = await this.membersEntity.findByDiscordId(discordId);
        return memberData ? this.convertToMember(memberData) : null;
    }
    /**
     * Get member by member code
     */
    static async getMemberByCode(memberCode) {
        const memberData = await this.membersEntity.findByMemberCode(memberCode);
        return memberData ? this.convertToMember(memberData) : null;
    }
    /**
     * Get all OSRS accounts for a member
     */
    static async getOsrsAccountsByDiscordId(discordId) {
        return query(`SELECT * FROM osrs_accounts
       WHERE discord_id = $1
       ORDER BY is_primary DESC, created_at ASC`, [discordId]);
    }
    /**
     * Get recent member movements (joins/leaves)
     */
    static async getRecentMovements(discordId, limit = 10) {
        const movements = await this.movementsEntity.getByDiscordId(discordId, limit);
        return movements.map(m => this.convertToMemberMovements(m));
    }
    /**
     * Get donation statistics for a member
     * Note: queryOne() auto-converts snake_case to camelCase
     */
    static async getDonationStats(discordId) {
        const result = await queryOne(`SELECT
         COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_approved,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending
       FROM donations
       WHERE player_discord_id = $1`, [discordId]);
        return {
            total_approved: result ? Number(result.totalApproved) : 0,
            total_pending: result ? Number(result.totalPending) : 0,
        };
    }
    /**
     * Get recent donations for a member
     */
    static async getRecentDonations(discordId, limit) {
        const limitClause = limit ? 'LIMIT $2' : '';
        const params = limit ? [discordId, limit] : [discordId];
        return query(`SELECT d.*
       FROM donations d
       WHERE d.player_discord_id = $1
       ORDER BY d.submitted_at DESC
       ${limitClause}`, params);
    }
    /**
     * Get token movements for a member
     */
    static async getTokenMovements(discordId, limit = 20) {
        return query(`SELECT * FROM token_movements
       WHERE discord_id = $1
       ORDER BY created_at DESC
       LIMIT $2`, [discordId, limit]);
    }
    /**
     * Get coffer movements for a member
     */
    static async getCofferMovements(discordId, limit = 20) {
        return query(`SELECT * FROM coffer_movements
       WHERE player_discord_id = $1
       ORDER BY created_at DESC
       LIMIT $2`, [discordId, limit]);
    }
    /**
     * Calculate member stats
     */
    static async calculateMemberStats(discordId, createdAt) {
        // Get total EHP and EHB from all accounts
        const accountStats = await queryOne(`SELECT
         COALESCE(SUM(ehp), 0) as total_ehp,
         COALESCE(SUM(ehb), 0) as total_ehb
       FROM osrs_accounts
       WHERE discord_id = $1`, [discordId]);
        // Calculate days as member
        const now = new Date();
        const memberSince = new Date(createdAt);
        const daysAsMember = Math.floor((now.getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24));
        return {
            total_ehp: accountStats ? Number(accountStats.total_ehp) : 0,
            total_ehb: accountStats ? Number(accountStats.total_ehb) : 0,
            days_as_member: daysAsMember,
        };
    }
    /**
     * Get member by ID
     */
    static async getMemberById(id) {
        const memberData = await this.membersEntity.findById(id);
        return memberData ? this.convertToMember(memberData) : null;
    }
    /**
     * Verify member code matches the member ID
     */
    static async verifyMemberCode(memberId, memberCode) {
        const member = await this.getMemberById(memberId);
        return member?.member_code === memberCode;
    }
    /**
     * Login with member code - returns member info if code is valid
     */
    static async loginWithCode(memberCode) {
        const member = await this.getMemberByCode(memberCode);
        if (!member)
            return null;
        return {
            id: member.id,
            discord_id: member.discord_id,
            discord_tag: member.discord_tag,
            member_code: member.member_code,
            is_active: member.is_active,
        };
    }
    /**
     * Get complete member profile with all related data
     */
    static async getMemberProfile(memberId, memberCode) {
        // Verify member code matches
        const isValid = await this.verifyMemberCode(memberId, memberCode);
        if (!isValid) {
            return null;
        }
        // Get member by ID
        const member = await this.getMemberById(memberId);
        if (!member) {
            return null;
        }
        // Fetch all related data in parallel
        const [osrs_accounts, recent_movements, donationStats, recent_donations, coffer_movements, stats,] = await Promise.all([
            this.getOsrsAccountsByDiscordId(member.discord_id),
            this.getRecentMovements(member.discord_id, 10),
            this.getDonationStats(member.discord_id),
            this.getRecentDonations(member.discord_id, 10),
            this.getCofferMovements(member.discord_id, 20),
            this.calculateMemberStats(member.discord_id, member.created_at),
        ]);
        return {
            member,
            osrs_accounts,
            recent_movements,
            donations: {
                total_approved: donationStats.total_approved,
                total_pending: donationStats.total_pending,
                recent_donations,
            },
            coffer_movements,
            stats,
        };
    }
    /**
     * Get all active members with basic info
     */
    static async getAllActiveMembers() {
        const members = await this.membersEntity.findAll({
            where: { isActive: true },
            orderBy: 'created_at',
            order: 'DESC'
        });
        return members.map(m => this.convertToMember(m));
    }
    /**
     * Update member's last seen timestamp
     */
    static async updateLastSeen(discordId) {
        await this.membersEntity.updateLastSeen(discordId);
    }
    /**
     * Create or update a member
     * For updates, only provided fields will be updated
     */
    static async upsertMember(data) {
        // Check if member exists
        const existingMember = await this.getMemberByDiscordId(data.discord_id);
        if (existingMember) {
            // Member exists - update only provided fields
            const updateData = {};
            if (data.discord_tag !== undefined)
                updateData.discordTag = data.discord_tag;
            if (data.member_code !== undefined)
                updateData.memberCode = data.member_code;
            if (data.is_active !== undefined)
                updateData.isActive = data.is_active;
            if (data.in_discord !== undefined)
                updateData.inDiscord = data.in_discord;
            if (data.notes !== undefined)
                updateData.notes = data.notes;
            // If no fields to update, just return existing member
            if (Object.keys(updateData).length === 0) {
                return existingMember;
            }
            const updatedMember = await this.membersEntity.updateById(existingMember.id, updateData);
            if (!updatedMember) {
                throw new Error('Failed to update member');
            }
            // Fetch the full member after update to ensure we have all fields
            // updateById might only return updated fields, so we need to fetch the complete record
            const fullMember = await this.membersEntity.findById(existingMember.id);
            if (!fullMember) {
                throw new Error('Failed to fetch updated member');
            }
            return this.convertToMember(fullMember);
        }
        else {
            // Member doesn't exist - insert new member
            if (!data.member_code) {
                throw new Error('member_code is required when creating a new member');
            }
            const memberCode = data.member_code || await MembersEntity.generateUniqueMemberCode();
            const newMember = await this.membersEntity.create({
                discordId: data.discord_id,
                discordTag: data.discord_tag,
                memberCode: memberCode,
                isActive: data.is_active !== undefined ? data.is_active : true,
                inDiscord: data.in_discord !== undefined ? data.in_discord : true,
                notes: data.notes,
            });
            return this.convertToMember(newMember);
        }
    }
    /**
     * Link an OSRS account to a member
     */
    static async linkOsrsAccount(data) {
        // If this should be primary, unset other primary accounts first
        if (data.is_primary) {
            await query(`UPDATE osrs_accounts
         SET is_primary = false
         WHERE discord_id = $1`, [data.discord_id]);
        }
        const result = await queryOne(`INSERT INTO osrs_accounts (discord_id, osrs_nickname, dink_hash, is_primary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (osrs_nickname)
       DO UPDATE SET
         discord_id = $1,
         dink_hash = COALESCE($3, osrs_accounts.dink_hash),
         is_primary = $4,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`, [
            data.discord_id,
            data.osrs_nickname,
            data.dink_hash || null,
            data.is_primary || false,
        ]);
        if (!result) {
            throw new Error('Failed to link OSRS account');
        }
        return result;
    }
    /**
     * Verify dink hash and check if member is active and in Discord
     * Returns true if the dink hash exists and the member is active and in Discord
     */
    static async verifyDinkHash(dinkHash) {
        const result = await queryOne(`SELECT
        CASE
          WHEN m.is_active = true AND m.in_discord = true THEN true
          ELSE false
        END as is_valid
       FROM osrs_accounts oa
       JOIN members m ON oa.discord_id = m.discord_id
       WHERE oa.dink_hash = $1`, [dinkHash]);
        return result?.isValid ?? false;
    }
    /**
     * Create tables for members module
     */
    static async createTables() {
        await MembersEntity.createTable();
        await MemberMovementsEntity.createTable();
    }
}
