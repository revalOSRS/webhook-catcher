/**
 * Events Service
 * Business logic for event management
 */
import { EventsEntity } from './entities/events.entity.js';
import { EventTeamsEntity } from './entities/event-teams.entity.js';
import { EventTeamMembersEntity } from './entities/event-team-members.entity.js';
import { EventRegistrationsEntity } from './entities/event-registrations.entity.js';
import { EventStatus, EventType, EventRegistrationStatus } from './types/index.js';
/**
 * Events Service Class
 * Provides business logic for all event-related operations
 */
export class EventsService {
    static eventsEntity = new EventsEntity();
    static teamsEntity = new EventTeamsEntity();
    static teamMembersEntity = new EventTeamMembersEntity();
    static registrationsEntity = new EventRegistrationsEntity();
    // ============================================================================
    // Events
    // ============================================================================
    /**
     * Create a new event
     */
    static create = async (input) => {
        return this.eventsEntity.create(input);
    };
    /**
     * Get event by ID
     */
    static getById = async (id) => {
        return this.eventsEntity.findById(id);
    };
    /**
     * Get all events with optional filters
     */
    static getAll = async (filters) => {
        return this.eventsEntity.findAllFiltered(filters);
    };
    /**
     * Get all active events (optionally filtered by type)
     */
    static getActive = async (eventType) => {
        return this.eventsEntity.findActive(eventType);
    };
    /**
     * Get all active bingo events
     */
    static getActiveBingoEvents = async () => {
        return this.eventsEntity.findActive(EventType.BINGO);
    };
    /**
     * Update an event
     */
    static update = async (id, input) => {
        return this.eventsEntity.update(id, input);
    };
    /**
     * Delete an event (cascades to teams, members, registrations)
     */
    static delete = async (id) => {
        return this.eventsEntity.delete(id);
    };
    /**
     * Update event status with validation
     *
     * Valid transitions:
     * - draft → scheduled, active, cancelled
     * - scheduled → active, cancelled
     * - active → paused, completed, cancelled
     * - paused → active, completed, cancelled
     * - completed → (no transitions)
     * - cancelled → (no transitions)
     */
    static updateStatus = async (id, newStatus) => {
        const event = await this.eventsEntity.findById(id);
        if (!event)
            return null;
        const validTransitions = {
            [EventStatus.DRAFT]: [EventStatus.SCHEDULED, EventStatus.ACTIVE, EventStatus.CANCELLED],
            [EventStatus.SCHEDULED]: [EventStatus.ACTIVE, EventStatus.CANCELLED],
            [EventStatus.ACTIVE]: [EventStatus.PAUSED, EventStatus.COMPLETED, EventStatus.CANCELLED],
            [EventStatus.PAUSED]: [EventStatus.ACTIVE, EventStatus.COMPLETED, EventStatus.CANCELLED],
            [EventStatus.COMPLETED]: [],
            [EventStatus.CANCELLED]: []
        };
        const allowed = validTransitions[event.status];
        if (!allowed.includes(newStatus)) {
            throw new Error(`Cannot transition from ${event.status} to ${newStatus}`);
        }
        return this.eventsEntity.updateStatus(id, newStatus);
    };
    /**
     * Activate an event
     */
    static activate = async (id) => {
        return this.updateStatus(id, EventStatus.ACTIVE);
    };
    /**
     * Pause an event
     */
    static pause = async (id) => {
        return this.updateStatus(id, EventStatus.PAUSED);
    };
    /**
     * Complete an event
     */
    static complete = async (id) => {
        return this.updateStatus(id, EventStatus.COMPLETED);
    };
    /**
     * Cancel an event
     */
    static cancel = async (id) => {
        return this.updateStatus(id, EventStatus.CANCELLED);
    };
    /**
     * Update event config (merges with existing)
     */
    static updateConfig = async (id, configUpdate) => {
        return this.eventsEntity.updateConfig(id, configUpdate);
    };
    // ============================================================================
    // Teams
    // ============================================================================
    /**
     * Create a team for an event
     */
    static createTeam = async (input) => {
        return this.teamsEntity.create(input);
    };
    /**
     * Get team by ID
     */
    static getTeamById = async (id) => {
        return this.teamsEntity.findById(id);
    };
    /**
     * Get all teams for an event
     */
    static getTeamsByEventId = async (eventId) => {
        return this.teamsEntity.findByEventId(eventId);
    };
    /**
     * Get team by event and name
     */
    static getTeamByName = async (eventId, name) => {
        return this.teamsEntity.findByEventAndName(eventId, name);
    };
    /**
     * Update a team
     */
    static updateTeam = async (id, input) => {
        return this.teamsEntity.update(id, input);
    };
    /**
     * Delete a team (cascades to team members)
     */
    static deleteTeam = async (id) => {
        return this.teamsEntity.delete(id);
    };
    /**
     * Update team score
     */
    static updateTeamScore = async (id, score) => {
        return this.teamsEntity.updateScore(id, score);
    };
    /**
     * Increment team score
     */
    static incrementTeamScore = async (id, points) => {
        return this.teamsEntity.incrementScore(id, points);
    };
    /**
     * Get event leaderboard (teams sorted by score)
     */
    static getLeaderboard = async (eventId) => {
        return this.teamsEntity.getLeaderboard(eventId);
    };
    // ============================================================================
    // Team Members
    // ============================================================================
    /**
     * Add a member to a team
     */
    static addTeamMember = async (input) => {
        return this.teamMembersEntity.create(input);
    };
    /**
     * Get team member by ID
     */
    static getTeamMemberById = async (id) => {
        return this.teamMembersEntity.findById(id);
    };
    /**
     * Get all members of a team
     */
    static getTeamMembers = async (teamId) => {
        return this.teamMembersEntity.findByTeamId(teamId);
    };
    /**
     * Find team member by OSRS account in a specific event
     */
    static findTeamMemberByOsrsAccount = async (osrsAccountId, eventId) => {
        return this.teamMembersEntity.findByOsrsAccountAndEvent(osrsAccountId, eventId);
    };
    /**
     * Update a team member
     */
    static updateTeamMember = async (id, input) => {
        return this.teamMembersEntity.update(id, input);
    };
    /**
     * Remove a member from a team
     */
    static removeTeamMember = async (id) => {
        return this.teamMembersEntity.delete(id);
    };
    /**
     * Update team member's individual score
     */
    static updateMemberScore = async (id, score) => {
        return this.teamMembersEntity.updateScore(id, score);
    };
    /**
     * Increment team member's individual score
     */
    static incrementMemberScore = async (id, points) => {
        return this.teamMembersEntity.incrementScore(id, points);
    };
    /**
     * Get team's internal leaderboard
     */
    static getTeamMemberLeaderboard = async (teamId) => {
        return this.teamMembersEntity.getTeamLeaderboard(teamId);
    };
    // ============================================================================
    // Registrations
    // ============================================================================
    /**
     * Register a member for an event
     */
    static register = async (input) => {
        return this.registrationsEntity.create(input);
    };
    /**
     * Get registration by ID
     */
    static getRegistrationById = async (id) => {
        return this.registrationsEntity.findById(id);
    };
    /**
     * Get all registrations for an event
     */
    static getRegistrationsByEventId = async (eventId) => {
        return this.registrationsEntity.findByEventId(eventId);
    };
    /**
     * Get registration by event and member
     */
    static getRegistration = async (eventId, memberId) => {
        return this.registrationsEntity.findByEventAndMember(eventId, memberId);
    };
    /**
     * Get registrations by status
     */
    static getRegistrationsByStatus = async (eventId, status) => {
        return this.registrationsEntity.findByEventAndStatus(eventId, status);
    };
    /**
     * Update registration status
     */
    static updateRegistrationStatus = async (id, status) => {
        return this.registrationsEntity.updateStatus(id, status);
    };
    /**
     * Approve a registration
     */
    static approveRegistration = async (id) => {
        return this.registrationsEntity.updateStatus(id, EventRegistrationStatus.REGISTERED);
    };
    /**
     * Cancel a registration
     */
    static cancelRegistration = async (id) => {
        return this.registrationsEntity.updateStatus(id, EventRegistrationStatus.CANCELLED);
    };
    /**
     * Delete a registration
     */
    static deleteRegistration = async (id) => {
        return this.registrationsEntity.delete(id);
    };
    /**
     * Check if member is registered for an event
     */
    static isRegistered = async (eventId, memberId) => {
        return this.registrationsEntity.isRegistered(eventId, memberId);
    };
    /**
     * Get registration count for an event
     */
    static getRegistrationCount = async (eventId) => {
        return this.registrationsEntity.countByEventId(eventId);
    };
    // ============================================================================
    // Composite Operations
    // ============================================================================
    /**
     * Get full event details including teams and their members
     */
    static getEventWithTeams = async (eventId) => {
        const event = await this.eventsEntity.findById(eventId);
        if (!event)
            return null;
        const teams = await this.teamsEntity.findByEventId(eventId);
        const teamsWithMembers = await Promise.all(teams.map(async (team) => ({
            ...team,
            members: await this.teamMembersEntity.findByTeamId(team.id)
        })));
        return { event, teams: teamsWithMembers };
    };
    /**
     * Get event statistics
     */
    static getEventStats = async (eventId) => {
        const teams = await this.teamsEntity.findByEventId(eventId);
        const memberCounts = await Promise.all(teams.map(team => this.teamMembersEntity.countByTeamId(team.id)));
        return {
            teamCount: teams.length,
            totalMembers: memberCounts.reduce((sum, count) => sum + count, 0),
            registrationCount: await this.registrationsEntity.countByEventId(eventId),
            pendingRegistrations: await this.registrationsEntity.countByEventAndStatus(eventId, EventRegistrationStatus.PENDING)
        };
    };
    // ============================================================================
    // Table Creation
    // ============================================================================
    /**
     * Create all tables for the events module
     */
    static createTables = async () => {
        await EventsEntity.createTable();
        await EventTeamsEntity.createTable();
        await EventTeamMembersEntity.createTable();
        await EventRegistrationsEntity.createTable();
    };
}
