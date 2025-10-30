import { Request, Response, NextFunction } from 'express'

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


