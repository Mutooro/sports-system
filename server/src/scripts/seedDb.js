const { User, Hall, Team, Player, sequelize } = require('../models');
const { hashPassword } = require('../utils/helpers');

const seedDatabase = async () => {
  try {
    // Create halls (Makerere's 9 halls of residence)
    const halls = await Hall.bulkCreate([
      { name: 'Mitchell Hall', location: 'Main Campus', capacity: 500 },
      { name: 'Nkrumah Hall', location: 'Main Campus', capacity: 450 },
      { name: 'Livingstone Hall', location: 'Main Campus', capacity: 400 },
      { name: 'University Hall', location: 'Main Campus', capacity: 550 },
      { name: 'Mary Stuart Hall', location: 'Main Campus', capacity: 600 },
      { name: 'Africa Hall', location: 'Main Campus', capacity: 350 },
      { name: 'Lumumba Hall', location: 'Main Campus', capacity: 400 },
      { name: 'Complex Hall', location: 'Main Campus', capacity: 300 },
      { name: 'Nsibirwa Hall', location: 'Main Campus', capacity: 250 }
    ]);
    console.log('✅ Halls seeded');

    // Create admin user
    const adminPassword = await hashPassword('admin123');
    await User.create({
      email: 'admin@makerere.ac.ug',
      password: adminPassword,
      first_name: 'System',
      last_name: 'Administrator',
      role: 'admin',
      is_active: true
    });

    // Create coach users
    const coachPassword = await hashPassword('coach123');
    const coaches = await User.bulkCreate([
      { email: 'coach.mitchell@makerere.ac.ug', password: coachPassword, first_name: 'John', last_name: 'Mukasa', role: 'coach' },
      { email: 'coach.nkrumah@makerere.ac.ug', password: coachPassword, first_name: 'David', last_name: 'Okello', role: 'coach' },
      { email: 'coach.livingstone@makerere.ac.ug', password: coachPassword, first_name: 'Peter', last_name: 'Kato', role: 'coach' }
    ]);
    console.log('✅ Coaches seeded');

    // Create teams
    const teams = await Team.bulkCreate([
      { name: 'Mitchell FC', hall_id: halls[0].id, sport_type: 'football', coach_id: coaches[0].id },
      { name: 'Nkrumah United', hall_id: halls[1].id, sport_type: 'football', coach_id: coaches[1].id },
      { name: 'Livingstone Stars', hall_id: halls[2].id, sport_type: 'football', coach_id: coaches[2].id }
    ]);
    console.log('✅ Teams seeded');

    // Create student users with player profiles
    const studentPassword = await hashPassword('student123');
    const students = await User.bulkCreate([
      { email: 'student1@stud.mak.ac.ug', password: studentPassword, first_name: 'James', last_name: 'Akena', role: 'student' },
      { email: 'student2@stud.mak.ac.ug', password: studentPassword, first_name: 'Robert', last_name: 'Ochaya', role: 'student' },
      { email: 'student3@stud.mak.ac.ug', password: studentPassword, first_name: 'Emmanuel', last_name: 'Opio', role: 'student' },
      { email: 'student4@stud.mak.ac.ug', password: studentPassword, first_name: 'Daniel', last_name: 'Kigozi', role: 'student' },
      { email: 'student5@stud.mak.ac.ug', password: studentPassword, first_name: 'Michael', last_name: 'Ssempala', role: 'student' }
    ]);

    await Player.bulkCreate([
      { user_id: students[0].id, student_number: '21/U/1234', height: 175.5, weight: 70.0, position: 'forward', sport: 'football', team_id: teams[0].id, hall_id: halls[0].id },
      { user_id: students[1].id, student_number: '21/U/1235', height: 180.0, weight: 75.0, position: 'defender', sport: 'football', team_id: teams[0].id, hall_id: halls[0].id },
      { user_id: students[2].id, student_number: '21/U/1236', height: 172.0, weight: 68.0, position: 'midfielder', sport: 'football', team_id: teams[1].id, hall_id: halls[1].id },
      { user_id: students[3].id, student_number: '21/U/1237', height: 185.0, weight: 80.0, position: 'goalkeeper', sport: 'football', team_id: teams[1].id, hall_id: halls[1].id },
      { user_id: students[4].id, student_number: '21/U/1238', height: 178.0, weight: 72.0, position: 'winger', sport: 'football', team_id: teams[2].id, hall_id: halls[2].id }
    ]);
    console.log('✅ Students & Players seeded');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\nDefault credentials:');
    console.log('  Admin: admin@makerere.ac.ug / admin123');
    console.log('  Coach: coach.mitchell@makerere.ac.ug / coach123');
    console.log('  Student: student1@stud.mak.ac.ug / student123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
