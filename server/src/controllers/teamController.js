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
  }
};

module.exports = teamController;