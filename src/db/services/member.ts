import { query, queryOne } from '../connection.js'
import type {
  Member,
  MemberMovement,
  OsrsAccount,
  Donation,
  CofferMovement,
  MemberProfile,
} from '../types.js'

/**
 * Get member by Discord ID
 */
export async function getMemberByDiscordId(discordId: string): Promise<Member | null> {
  return queryOne<Member>(
    `SELECT * FROM members WHERE discord_id = $1`,
    [discordId]
  )
}

/**
 * Get member by member code
 */
export async function getMemberByCode(memberCode: number): Promise<Member | null> {
  return queryOne<Member>(
    `SELECT * FROM members WHERE member_code = $1`,
    [memberCode]
  )
}

/**
 * Get all OSRS accounts for a member
 */
export async function getOsrsAccountsByDiscordId(discordId: string): Promise<OsrsAccount[]> {
  return query<OsrsAccount>(
    `SELECT * FROM osrs_accounts 
     WHERE discord_id = $1 
     ORDER BY is_primary DESC, created_at ASC`,
    [discordId]
  )
}

/**
 * Get recent member movements (joins/leaves)
 */
export async function getRecentMovements(discordId: string, limit: number = 10): Promise<MemberMovement[]> {
  return query<MemberMovement>(
    `SELECT * FROM member_movements 
     WHERE discord_id = $1 
     ORDER BY timestamp DESC 
     LIMIT $2`,
    [discordId, limit]
  )
}

/**
 * Get donation statistics for a member
 */
export async function getDonationStats(discordId: string): Promise<{ total_approved: number; total_pending: number }> {
  const result = await queryOne<{ total_approved: string; total_pending: string }>(
    `SELECT 
       COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_approved,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending
     FROM donations 
     WHERE player_discord_id = $1`,
    [discordId]
  )

  return {
    total_approved: result ? Number(result.total_approved) : 0,
    total_pending: result ? Number(result.total_pending) : 0,
  }
}

/**
 * Get recent donations for a member
 */
export async function getRecentDonations(discordId: string, limit: number = 10): Promise<Donation[]> {
  return query<Donation>(
    `SELECT d.*, dc.name as category_name
     FROM donations d
     LEFT JOIN donation_categories dc ON d.category_id = dc.id
     WHERE d.player_discord_id = $1 
     ORDER BY d.submitted_at DESC 
     LIMIT $2`,
    [discordId, limit]
  )
}

/**
 * Get coffer movements for a member
 */
export async function getCofferMovements(discordId: string, limit: number = 20): Promise<CofferMovement[]> {
  return query<CofferMovement>(
    `SELECT * FROM coffer_movements 
     WHERE player_discord_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [discordId, limit]
  )
}

/**
 * Calculate member stats
 */
export async function calculateMemberStats(discordId: string, createdAt: Date): Promise<{
  total_ehp: number
  total_ehb: number
  days_as_member: number
}> {
  // Get total EHP and EHB from all accounts
  const accountStats = await queryOne<{ total_ehp: string; total_ehb: string }>(
    `SELECT 
       COALESCE(SUM(ehp), 0) as total_ehp,
       COALESCE(SUM(ehb), 0) as total_ehb
     FROM osrs_accounts 
     WHERE discord_id = $1`,
    [discordId]
  )

  // Calculate days as member
  const now = new Date()
  const memberSince = new Date(createdAt)
  const daysAsMember = Math.floor((now.getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24))

  return {
    total_ehp: accountStats ? Number(accountStats.total_ehp) : 0,
    total_ehb: accountStats ? Number(accountStats.total_ehb) : 0,
    days_as_member: daysAsMember,
  }
}

/**
 * Get member by ID
 */
export async function getMemberById(id: number): Promise<Member | null> {
  return queryOne<Member>(
    `SELECT * FROM members WHERE id = $1`,
    [id]
  )
}

/**
 * Verify member code matches the member ID
 */
export async function verifyMemberCode(memberId: number, memberCode: number): Promise<boolean> {
  const member = await queryOne<{ id: number }>(
    `SELECT id FROM members WHERE id = $1 AND member_code = $2`,
    [memberId, memberCode]
  )
  return member !== null
}

/**
 * Login with member code - returns member info if code is valid
 */
export async function loginWithCode(memberCode: number): Promise<{
  id: number
  discord_id: string
  discord_tag: string | null
  member_code: number
  is_active: boolean
} | null> {
  const member = await queryOne<Member>(
    `SELECT * FROM members WHERE member_code = $1`,
    [memberCode]
  )

  if (!member) {
    return null
  }

  return {
    id: member.id,
    discord_id: member.discord_id,
    discord_tag: member.discord_tag,
    member_code: member.member_code,
    is_active: member.is_active,
  }
}

/**
 * Get complete member profile with all related data
 */
export async function getMemberProfile(memberId: number, memberCode: number): Promise<MemberProfile | null> {
  // Verify member code matches
  const isValid = await verifyMemberCode(memberId, memberCode)
  if (!isValid) {
    return null
  }

  // Get member by ID
  const member = await getMemberById(memberId)
  if (!member) {
    return null
  }

  // Fetch all related data in parallel
  const [
    osrs_accounts,
    recent_movements,
    donationStats,
    recent_donations,
    coffer_movements,
    stats,
  ] = await Promise.all([
    getOsrsAccountsByDiscordId(member.discord_id),
    getRecentMovements(member.discord_id, 10),
    getDonationStats(member.discord_id),
    getRecentDonations(member.discord_id, 10),
    getCofferMovements(member.discord_id, 20),
    calculateMemberStats(member.discord_id, member.created_at),
  ])

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
  }
}

/**
 * Get all active members with basic info
 */
export async function getAllActiveMembers(): Promise<Member[]> {
  return query<Member>(
    `SELECT * FROM members 
     WHERE is_active = true 
     ORDER BY created_at DESC`
  )
}

/**
 * Update member's last seen timestamp
 */
export async function updateLastSeen(discordId: string): Promise<void> {
  await query(
    `UPDATE members 
     SET last_seen = CURRENT_TIMESTAMP 
     WHERE discord_id = $1`,
    [discordId]
  )
}

/**
 * Create or update a member
 * For updates, only provided fields will be updated
 */
export async function upsertMember(data: {
  discord_id: string
  discord_tag?: string
  member_code?: number
  is_active?: boolean
  in_discord?: boolean
  notes?: string
}): Promise<Member> {
  // Check if member exists
  const existingMember = await getMemberByDiscordId(data.discord_id)

  if (existingMember) {
    // Member exists - update only provided fields
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.discord_tag !== undefined) {
      updates.push(`discord_tag = $${paramIndex++}`)
      values.push(data.discord_tag)
    }
    if (data.member_code !== undefined) {
      updates.push(`member_code = $${paramIndex++}`)
      values.push(data.member_code)
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`)
      values.push(data.is_active)
    }
    if (data.in_discord !== undefined) {
      updates.push(`in_discord = $${paramIndex++}`)
      values.push(data.in_discord)
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`)
      values.push(data.notes)
    }

    // Only update updated_at if we actually have fields to update
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
    }

    // If no fields to update, just return existing member
    if (updates.length === 0) {
      return existingMember
    }

    values.push(data.discord_id)

    const result = await queryOne<Member>(
      `UPDATE members 
       SET ${updates.join(', ')}
       WHERE discord_id = $${paramIndex}
       RETURNING *`,
      values
    )

    if (!result) {
      throw new Error('Failed to update member')
    }

    return result
  } else {
    // Member doesn't exist - insert new member (all required fields must be provided)
    if (!data.member_code) {
      throw new Error('member_code is required when creating a new member')
    }

    const result = await queryOne<Member>(
      `INSERT INTO members (discord_id, discord_tag, member_code, is_active, in_discord, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.discord_id,
        data.discord_tag || null,
        data.member_code,
        data.is_active !== undefined ? data.is_active : true,
        data.in_discord !== undefined ? data.in_discord : true,
        data.notes || null,
      ]
    )

    if (!result) {
      throw new Error('Failed to insert member')
    }

    return result
  }
}

/**
 * Link an OSRS account to a member
 */
export async function linkOsrsAccount(data: {
  discord_id: string
  osrs_nickname: string
  dink_hash?: string
  is_primary?: boolean
}): Promise<OsrsAccount> {
  // If this should be primary, unset other primary accounts first
  if (data.is_primary) {
    await query(
      `UPDATE osrs_accounts 
       SET is_primary = false 
       WHERE discord_id = $1`,
      [data.discord_id]
    )
  }

  const result = await queryOne<OsrsAccount>(
    `INSERT INTO osrs_accounts (discord_id, osrs_nickname, dink_hash, is_primary)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (osrs_nickname) 
     DO UPDATE SET
       discord_id = $1,
       dink_hash = COALESCE($3, osrs_accounts.dink_hash),
       is_primary = $4,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      data.discord_id,
      data.osrs_nickname,
      data.dink_hash || null,
      data.is_primary || false,
    ]
  )

  if (!result) {
    throw new Error('Failed to link OSRS account')
  }

  return result
}

