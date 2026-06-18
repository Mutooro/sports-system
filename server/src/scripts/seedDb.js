const { User, Hall, Team, Player, sequelize } = require('../models');
const { hashPassword } = require('../utils/helpers');

const seedDatabase = async () => {
  try {
    // Halls (Makerere's 9 halls of residence).
    const halls = await Hall.bulkCreate([
      { name: 'Mitchell Hall',   location: 'Main Campus', capacity: 500 },
      { name: 'Nkrumah Hall',    location: 'Main Campus', capacity: 450 },
      { name: 'Livingstone Hall', location: 'Main Campus', capacity: 400 },
      { name: 'University Hall', location: 'Main Campus', capacity: 550 },
      { name: 'Mary Stuart Hall', location: 'Main Campus', capacity: 600 },
      { name: 'Africa Hall',     location: 'Main Campus', capacity: 350 },
      { name: 'Lumumba Hall',    location: 'Main Campus', capacity: 400 },
      { name: 'Complex Hall',    location: 'Main Campus', capacity: 300 },
      { name: 'Nsibirwa Hall',   location: 'Main Campus', capacity: 250 }
    ]);
    console.log('Halls seeded');

    // Admin user.
    const adminPassword = await hashPassword('admin123');
    await User.create({
      email: 'admin@makerere.ac.ug',
      password: adminPassword,
      first_name: 'System',
      last_name: 'Administrator',
      role: 'admin',
      student_number: 'ADMIN-0001',
      is_active: true
    });

    // Coach users.
    const coachPassword = await hashPassword('coach123');
    const coaches = await User.bulkCreate([
      { email: 'coach.mitchell@makerere.ac.ug',   password: coachPassword, first_name: 'John',   last_name: 'Mukasa', role: 'coach', student_number: 'COACH-0001' },
      { email: 'coach.nkrumah@makerere.ac.ug',    password: coachPassword, first_name: 'David',  last_name: 'Okello', role: 'coach', student_number: 'COACH-0002' },
      { email: 'coach.livingstone@makerere.ac.ug', password: coachPassword, first_name: 'Peter', last_name: 'Kato',   role: 'coach', student_number: 'COACH-0003' }
    ]);
    console.log('Coaches seeded');

    // Teams.
    const teams = await Team.bulkCreate([
      { name: 'Mitchell FC',        hall_id: halls[0].id, sport_type: 'football', coach_id: coaches[0].id },
      { name: 'Nkrumah United',     hall_id: halls[1].id, sport_type: 'football', coach_id: coaches[1].id },
      { name: 'Livingstone Stars',  hall_id: halls[2].id, sport_type: 'football', coach_id: coaches[2].id }
    ]);
    console.log('Teams seeded');

    // Students (with student_number on User, no longer on Player).
    const studentPassword = await hashPassword('student123');
    const students = await User.bulkCreate([
      { email: 'student1@stud.mak.ac.ug', password: studentPassword, first_name: 'James',     last_name: 'Akena',    role: 'student', student_number: '21/U/1234' },
      { email: 'student2@stud.mak.ac.ug', password: studentPassword, first_name: 'Robert',    last_name: 'Ochaya',   role: 'student', student_number: '21/U/1235' },
      { email: 'student3@stud.mak.ac.ug', password: studentPassword, first_name: 'Emmanuel',  last_name: 'Opio',     role: 'student', student_number: '21/U/1236' },
      { email: 'student4@stud.mak.ac.ug', password: studentPassword, first_name: 'Daniel',    last_name: 'Kigozi',   role: 'student', student_number: '21/U/1237' },
      { email: 'student5@stud.mak.ac.ug', password: studentPassword, first_name: 'Michael',   last_name: 'Ssempala', role: 'student', student_number: '21/U/1238' }
    ]);

    // Player profiles — no student_number here anymore; one per (user, sport).
    await Player.bulkCreate([
      { user_id: students[0].id, height: 175.5, weight: 70.0, position: 'forward',     sport: 'football', team_id: teams[0].id, hall_id: halls[0].id },
      { user_id: students[1].id, height: 180.0, weight: 75.0, position: 'defender',    sport: 'football', team_id: teams[0].id, hall_id: halls[0].id },
      { user_id: students[2].id, height: 172.0, weight: 68.0, position: 'midfielder',  sport: 'football', team_id: teams[1].id, hall_id: halls[1].id },
      { user_id: students[3].id, height: 185.0, weight: 80.0, position: 'goalkeeper',  sport: 'football', team_id: teams[1].id, hall_id: halls[1].id },
      { user_id: students[4].id, height: 178.0, weight: 72.0, position: 'winger',      sport: 'football', team_id: teams[2].id, hall_id: halls[2].id }
    ]);
    console.log('Students & Players seeded');

    console.log('\nDatabase seeded successfully!');
    console.log('\nDefault credentials:');
    console.log('  Admin:   admin@makerere.ac.ug / admin123');
    console.log('  Coach:   coach.mitchell@makerere.ac.ug / coach123');
    console.log('  Student: student1@stud.mak.ac.ug / student123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
