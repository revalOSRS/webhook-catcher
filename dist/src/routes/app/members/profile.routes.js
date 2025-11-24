/**
 * Member Profile Routes
 *
 * Routes for getting member profile data by Discord ID
 */
import { Router } from 'express';
import { MembersService } from '../../../modules/members/index.js';
import { DiscordService } from '../../../modules/discord/index.js';
import { requireMemberAuth } from '../../../middleware/auth.js';
const router = Router();
// Get member by member ID - main endpoint after auth
router.get('/:memberId', requireMemberAuth, async (req, res) => {
    try {
        const authenticatedMember = req.authenticatedMember;
        const discordId = authenticatedMember.discord_id;
        // Get member info
        const member = await MembersService.getMemberByDiscordId(discordId);
        if (!member) {
            return res.status(404).json({
                status: 'error',
                message: 'Member not found'
            });
        }
        // Get OSRS accounts
        const osrsAccounts = await MembersService.getOsrsAccountsByDiscordId(discordId);
        // Get donation stats and Discord avatar in parallel
        const [donationStats, allDonations, discordAvatar] = await Promise.all([
            MembersService.getDonationStats(discordId),
            MembersService.getRecentDonations(discordId),
            DiscordService.getDiscordAvatar(member.discord_id)
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                member: {
                    id: member.id,
                    discord_id: member.discord_id,
                    discord_tag: member.discord_tag,
                    discord_avatar: discordAvatar,
                    token_balance: member.token_balance,
                    is_active: member.is_active,
                    in_discord: member.in_discord,
                    notes: member.notes,
                    created_at: member.created_at,
                    updated_at: member.updated_at,
                    last_seen: member.last_seen
                },
                osrs_accounts: osrsAccounts,
                donations: {
                    total_approved: donationStats.total_approved,
                    total_pending: donationStats.total_pending,
                    all: allDonations
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching member by Discord ID:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch member data'
        });
    }
});
export default router;
