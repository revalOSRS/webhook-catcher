import { Request, Response, NextFunction } from 'express'
import * as db from '../db/connection.js'

// Define Discord IDs that have admin access
// TODO: Move this to environment variables or database configuration
const ADMIN_DISCORD_IDS = [
  // '603849391970975744' Example Discord ID - replace with actual admin IDs
  // Add more admin Discord IDs here
]

/**
 * Middleware to verify admin API key
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key
  
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ 
      status: 'error', 
      message: 'Unauthorized: Invalid or missing admin key' 
    })
  }
  
  next()
}

/**
 * Middleware to verify Discord admin access
 * Requires both X-Discord-Id and X-Member-Code headers
 * Checks if the Discord ID is in the admin whitelist and validates member code
 */
export async function requireDiscordAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const discordId = req.headers['x-discord-id'] as string
    const memberCode = req.headers['x-member-code'] as string
    
    // Check for required headers
    if (!discordId || !memberCode) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      })
    }
    
    // Validate member code format
    const code = parseInt(memberCode)
    if (isNaN(code)) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication failed'
      })
    }
    
    // Check if Discord ID is in admin whitelist
    if (!ADMIN_DISCORD_IDS.includes(discordId)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      })
    }
    
    // Get member from database and verify credentials
    const members = await db.query<{
      id: number;
      discordId: string;
      discordTag: string;
      memberCode: number;
      isActive: boolean;
    }>(`
      SELECT id, discord_id, discord_tag, member_code, is_active
      FROM members
      WHERE discord_id = $1
    `, [discordId])
    
    if (members.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      })
    }
    
    const member = members[0]
    
    // Verify member code matches and member is active
    if (code !== member.memberCode || !member.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      })
    }
    
    // Attach authenticated admin member to request
    (req as any).authenticatedAdmin = member
    next()
    
  } catch (error) {
    console.error('Admin authentication error:', error)
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    })
  }
}

/**
 * Middleware to verify member code
 */
export function requireMemberCode(req: Request, res: Response, next: NextFunction) {
  const memberCode = req.query.code || req.headers['x-member-code']
  
  if (!memberCode) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Valid member code is required' 
    })
  }
  
  // Attach to request for use in route handler
  (req as any).memberCode = parseInt(memberCode as string)
  next()
}

/**
 * Middleware to require and verify member authentication
 * Validates that the authenticated member matches the requested memberId
 */
export async function requireMemberAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const memberId = parseInt(req.params.memberId)
    const memberCode = req.headers['x-member-code'] as string
    const discordId = req.headers['x-discord-id'] as string
    
    // Require both authentication methods
    if (!memberCode || !discordId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Provide both X-Member-Code and X-Discord-Id headers.'
      })
    }
    
    // Validate member code format
    const code = parseInt(memberCode)
    if (isNaN(code)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid member code format'
      })
    }
    
    // Get member from database
    const members = await db.query<{
      id: number;
      discordId: string;
      memberCode: number;
      isActive: boolean;
    }>(`
      SELECT id, discord_id, member_code, is_active
      FROM members
      WHERE id = $1
    `, [memberId])
    
    if (members.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found'
      })
    }
    
    const member = members[0]
    
    // Verify both authentication methods match
    const memberCodeMatches = code === member.memberCode
    const discordIdMatches = discordId === member.discordId
    
    if (!memberCodeMatches || !discordIdMatches) {
      return res.status(403).json({
        status: 'error',
        message: 'Authentication failed. Invalid credentials.'
      })
    }
    
    // Check if member is active
    if (!member.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Member account is inactive'
      })
    }
    
    // Attach authenticated member to request
    (req as any).authenticatedMember = member
    next()
    
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    })
  }
}

