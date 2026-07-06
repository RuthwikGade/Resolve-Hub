const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const SALT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Seeding ResolveHub Database...');

  const client = new Client({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database for seeding');

    // 1. Hash passwords
    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);

    // 2. Insert Users
    console.log('Inserting users...');
    const usersResult = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES 
        ('Super Admin', 'superadmin@resolvehub.dev', $1, 'super_admin'),
        ('Community Admin', 'admin@resolvehub.dev', $1, 'community_admin'),
        ('Jane Staff', 'staff@resolvehub.dev', $1, 'responsible_person'),
        ('John Doe', 'john@resolvehub.dev', $1, 'member')
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
      RETURNING id, name, email, role
    `, [hashedPassword]);

    const users = {};
    usersResult.rows.forEach(u => {
      users[u.email] = u.id;
    });

    console.log('✅ Users inserted:', Object.keys(users));

    // Seed super admin in platform_admins
    const superAdminId = users['superadmin@resolvehub.dev'];
    await client.query(`
      INSERT INTO platform_admins (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [superAdminId]);
    console.log('✅ Super Admin registered in platform_admins');

    // 3. Create Default Community
    console.log('Inserting community...');
    const communityAdminId = users['admin@resolvehub.dev'];
    const commResult = await client.query(`
      INSERT INTO communities (name, type, description, address, created_by)
      VALUES ('Green Valley Heights', 'Apartment', 'A peaceful residential community with modern amenities.', '100 Green Valley Road, Sector 5', $1)
      RETURNING id, name
    `, [communityAdminId]);
    
    const communityId = commResult.rows[0].id;
    console.log('✅ Created Community:', commResult.rows[0].name, `(${communityId})`);

    // 4. Create Community Memberships
    console.log('Adding members to community...');
    
    // Add Admin as community_admin
    await client.query(`
      INSERT INTO community_members (community_id, user_id, role)
      VALUES ($1, $2, 'community_admin')
      ON CONFLICT (community_id, user_id) DO NOTHING
    `, [communityId, communityAdminId]);

    // Add Staff as responsible_person
    const staffId = users['staff@resolvehub.dev'];
    await client.query(`
      INSERT INTO community_members (community_id, user_id, role)
      VALUES ($1, $2, 'responsible_person')
      ON CONFLICT (community_id, user_id) DO NOTHING
    `, [communityId, staffId]);

    // Add John Doe as member
    const memberId = users['john@resolvehub.dev'];
    await client.query(`
      INSERT INTO community_members (community_id, user_id, role)
      VALUES ($1, $2, 'member')
      ON CONFLICT (community_id, user_id) DO NOTHING
    `, [communityId, memberId]);

    console.log('✅ Memberships created and approved');

    // 5. Create default SLA rules
    console.log('Seeding SLA rules...');
    const categories = ['Electrical', 'Water Supply', 'Internet', 'Security', 'Maintenance', 'Cleanliness', 'Infrastructure', 'Other'];
    
    const slaLimits = {
      'Electrical': 360, // 6h (Critical)
      'Water Supply': 1440, // 24h (High)
      'Internet': 1440, // 24h
      'Security': 360, // 6h
      'Cleanliness': 4320, // 3 days (Medium)
      'Maintenance': 4320, // 3 days
      'Infrastructure': 10080, // 7 days (Low)
      'Other': 4320
    };

    for (const cat of categories) {
      await client.query(`
        INSERT INTO sla_rules (community_id, category, max_resolution_minutes)
        VALUES ($1, $2, $3)
        ON CONFLICT (community_id, category) DO UPDATE SET max_resolution_minutes = $3
      `, [communityId, cat, slaLimits[cat]]);
    }
    console.log('✅ SLA rules seeded');

    // 6. Create category role mappings (Routing rules)
    console.log('Seeding Routing Rules...');
    for (const cat of categories) {
      // Route electrical, water, internet to Jane Staff
      const targetUser = ['Electrical', 'Water Supply', 'Internet', 'Maintenance'].includes(cat) ? staffId : communityAdminId;
      await client.query(`
        INSERT INTO category_role_mapping (community_id, category, role_name, assigned_user_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (community_id, category) DO UPDATE SET assigned_user_id = $4
      `, [communityId, cat, 'responsible_person', targetUser]);
    }
    console.log('✅ Routing Rules seeded');

    console.log('🎉 Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
