const { Team, Hall, Player, User, Rating, Fixture } = require('../models');
const FixtureGenerator = require('../services/fixtureGenerator');
const { successResponse, errorResponse } = require('../utils/helpers');
const { logger } = require('../utils/logger');

const teamController = {
  getAll: async (req, res) => {
    try {
      const { hall_id, sport_type } = req.query;
      const where = {};
      if (hall_id) where.hall_id = hall_id;
      if (sport_type) where.sport_type = sport_type;
      
      const teams = await Team.findAll({
        where,
        include: [
          { model: Hall, as: 'hall', attributes: ['id', 'name'] },
          { model: User, as: 'coach', attributes: ['id', 'first_name', 'last_name'] },
          { model: Player, as: 'players', attributes: ['id'] }
        ]
      });
      
      return successResponse(res, teams);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve teams', 500);
    }
  },

  getById: async (req, res) => {
    try {
      const team = await Team.findByPk(req.params.id, {
        include: [
          { model: Hall, as: 'hall' },
          { model: User, as: 'coach', attributes: { exclude: ['password'] } },
          { 
            model: Player, 
            as: 'players',
            include: [
              { model: User, as: 'user', attributes: ['first_name', 'last_name'] }
            ]
          }
        ]
      });
      
      if (!team) {
        return errorResponse(res, 'Team not found', 404);
      }
      
      return successResponse(res, team);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve team', 500);
    }
  },

  getTeamPlayers: async (req, res) => {
    try {
      const players = await Player.findAll({
        where: { team_id: req.params.id },
        include: [
          { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] },
          { 
            model: Rating, 
            as: 'ratings',
            limit: 1,
            order: [['calculation_date', 'DESC']]
          }
        ]
      });
      
      return successResponse(res, players);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve team players', 500);
    }
  },

  getTeamRatings: async (req, res) => {
    try {
      const players = await Player.findAll({
        where: { team_id: req.params.id },
        include: [
          { model: User, as: 'user', attributes: ['first_name', 'last_name'] },
          { 
            model: Rating, 
            as: 'ratings',
            limit: 1,
            order: [['calculation_date', 'DESC']]
          }
        ]
      });
      
      const ratings = players.map(p => ({
        player: p.user,
        rating: p.ratings[0] || null
      }));
      
      return successResponse(res, ratings);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve team ratings', 500);
    }
  },

  // CREATE TEAM + AUTO-GENERATE FIXTURES
  create: async (req, res) => {
    try {
      const { name, hall_id, sport_type, coach_id, description, auto_generate_fixtures } = req.body;
      
      const team = await Team.create({ name, hall_id, sport_type, coach_id, description });
      
      const teamWithDetails = await Team.findByPk(team.id, {
        include: [
          { model: Hall, as: 'hall' },
          { model: User, as: 'coach', attributes: { exclude: ['password'] } }
        ]
      });

      let generatedFixtures = [];
      
      // Auto-generate fixtures if requested and we have enough teams
      if (auto_generate_fixtures) {
        const allTeams = await Team.findAll({
          where: { sport_type },
          include: [{ model: Hall, as: 'hall' }]
        });

        if (allTeams.length >= 2) {
          try {
            // Delete existing future fixtures for this sport
            await Fixture.destroy({
              where: {
                sport_type,
                match_date: { [require('sequelize').Op.gte]: new Date() },
                status: 'scheduled'
              }
            });

            const options = {
              startDate: new Date(),
              matchesPerWeek: 2,
              matchDays: [0, 3], // Sunday, Wednesday
              matchTime: '16:00',
              venues: ['football_pitch'],
              includeReturnLeg: true,
              sportType: sport_type
            };

            generatedFixtures = await FixtureGenerator.generateAndSave(allTeams, options);
            logger.info(`Auto-generated ${generatedFixtures.length} fixtures after team creation`);
          } catch (genError) {
            logger.error('Auto-generation failed:', genError);
            // Don't fail team creation if fixture generation fails
          }
        }
      }
      
      return successResponse(res, {
        team: teamWithDetails,
        fixtures_generated: generatedFixtures.length,
        message: generatedFixtures.length > 0 
          ? `Team created and ${generatedFixtures.length} fixtures auto-generated` 
          : 'Team created successfully'
      }, 'Team created', 201);
    } catch (error) {
      logger.error('Create team error:', error);
      return errorResponse(res, 'Failed to create team', 500);
    }
  },

  update: async (req, res) => {
    try {
      const team = await Team.findByPk(req.params.id);
      if (!team) {
        return errorResponse(res, 'Team not found', 404);
      }
      
      await team.update(req.body);
      return successResponse(res, team, 'Team updated successfully');
    } catch (error) {
      return errorResponse(res, 'Failed to update team', 500);
    }
  },

  delete: async (req, res) => {
    try {
      const team = await Team.findByPk(req.params.id);
      if (!team) {
        return errorResponse(res, 'Team not found', 404);
      }
      
      await team.destroy();
      logger.info(`Team deleted: ${req.params.id}`);
      return successResponse(res, null, 'Team deleted successfully');
    } catch (error) {
      return errorResponse(res, 'Failed to delete team', 500);
    }
  },

  // GET /teams/:id/formation — lightweight read of the saved formation
  getFormation: async (req, res) => {
    try {
      const team = await Team.findByPk(req.params.id, {
        attributes: ['id', 'name', 'formation']
      });
      if (!team) return errorResponse(res, 'Team not found', 404);

      return successResponse(res, {
        team_id: team.id,
        team_name: team.name,
        formation: team.formation || null
      });
    } catch (error) {
      logger.error('getFormation error:', error);
      return errorResponse(res, 'Failed to retrieve formation', 500);
    }
  },

  // PUT /teams/:id/formation — persist the tactical lineup
  saveFormation: async (req, res) => {
    try {
      const team = await Team.findByPk(req.params.id);
      if (!team) return errorResponse(res, 'Team not found', 404);

      const { formation } = req.body;
      if (!Array.isArray(formation) || formation.length === 0) {
        return errorResponse(res, 'formation must be a non-empty array of slot objects', 400);
      }

      // Validate each slot has the minimum required shape
      for (const slot of formation) {
        if (!slot.id || !slot.label) {
          return errorResponse(res, 'Each formation slot must have id and label', 400);
        }
      }

      await team.update({ formation });
      logger.info(`Formation saved for team ${team.id} (${team.name})`);

      return successResponse(res, {
        team_id: team.id,
        team_name: team.name,
        formation: team.formation
      }, 'Formation saved successfully');
    } catch (error) {
      logger.error('saveFormation error:', error);
      return errorResponse(res, 'Failed to save formation', 500);
    }
  },

  // Bulk create teams from CSV/JSON import
  bulkCreate: async (req, res) => {
    try {
      const { teams } = req.body;
      if (!Array.isArray(teams) || teams.length === 0) {
        return errorResponse(res, 'teams must be a non-empty array', 400);
      }

      const { Op } = require('sequelize');
      const created = [];
      const errors = [];

      for (let i = 0; i < teams.length; i++) {
        const row = teams[i];
        try {
          if (!row.name?.trim()) throw new Error('name is required');

          let hall_id = row.hall_id ? parseInt(row.hall_id) : null;
          if (!hall_id && row.hall_name) {
            const hall = await Hall.findOne({ where: { name: { [Op.iLike]: row.hall_name.trim() } } });
            if (!hall) throw new Error(`Hall not found: ${row.hall_name}`);
            hall_id = hall.id;
          }
          if (!hall_id) throw new Error('hall_name or hall_id is required');

          let coach_id = row.coach_id ? parseInt(row.coach_id) : null;
          if (!coach_id && row.coach_email) {
            const coach = await User.findOne({ where: { email: row.coach_email.trim().toLowerCase(), role: 'coach' } });
            if (coach) coach_id = coach.id;
          }

          const team = await Team.create({
            name: row.name.trim(),
            hall_id,
            sport_type: row.sport_type || 'football',
            coach_id,
            description: row.description || null
          });

          created.push(team);
        } catch (err) {
          errors.push({ row: i + 2, name: row.name || '', message: err.message });
        }
      }

      logger.info(`Bulk team import: ${created.length} created, ${errors.length} failed`);
      return successResponse(res, {
        created: created.length,
        failed: errors.length,
        errors
      }, `Imported ${created.length} team(s)`);
    } catch (error) {
      logger.error('Bulk create teams error:', error);
      return errorResponse(res, 'Failed to bulk import teams', 500);
    }
  }
};

module.exports = teamController;