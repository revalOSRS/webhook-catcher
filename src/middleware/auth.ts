import { Request, Response, NextFunction } from 'express'
import * as db from '../db/connection.js'

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
    
    // Require at least one authentication method
    if (!memberCode && !discordId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Provide either X-Member-Code or X-Discord-Id header.'
      })
    }
    
    // Get member from database
    const members = await db.query<any>(`
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
    
    // Verify authentication
    let authenticated = false
    
    // Check member code
    if (memberCode) {
      const code = parseInt(memberCode)
      if (isNaN(code)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid member code format'
        })
      }
      if (code === member.member_code) {
        authenticated = true
      }
    }
    
    // Check Discord ID (must match exactly)
    if (discordId && discordId === member.discord_id) {
      authenticated = true
    }
    
    if (!authenticated) {
      return res.status(403).json({
        status: 'error',
        message: 'Authentication failed. Invalid credentials.'
      })
    }
    
    // Check if member is active
    if (!member.is_active) {
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

