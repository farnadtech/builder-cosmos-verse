import bcrypt from 'bcryptjs';
import { query } from '../database/connection';

async function createAdminUser() {
  try {
    console.log('🔍 Checking for existing admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await query(
      'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
      ['admin@zemano.ir', '+989123456789']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }

    console.log('👤 Creating admin user...');

    // Hash password
    const passwordHash = await bcrypt.hash('admin123456', 12);

    // Create admin user
    const userResult = await query(
      `INSERT INTO users (
         first_name, last_name, email, phone_number, password_hash, 
         role, is_verified, is_active, created_at
       ) VALUES ($1, $2, $3, $4, $5, 'admin', true, true, NOW())
       RETURNING id`,
      ['مدیر', 'سیستم', 'admin@zemano.ir', '+989123456789', passwordHash]
    );

    const adminId = userResult.rows[0].id;

    // Create wallet for admin
    await query(
      'INSERT INTO wallets (user_id, balance, total_earned, total_spent) VALUES ($1, 0, 0, 0)',
      [adminId]
    );

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@zemano.ir');
    console.log('📱 Phone: +989123456789');
    console.log('🔑 Password: admin123456');
    console.log('');
    console.log('⚠️  Please change the password after first login!');

    // Create some sample arbitrators
    console.log('👨‍⚖️ Creating sample arbitrators...');

    const arbitrators = [
      {
        firstName: 'دکتر رضا',
        lastName: 'نوری',
        email: 'reza.nouri@zemano.ir',
        phone: '+989123456780'
      },
      {
        firstName: 'دکتر مریم',
        lastName: 'احمدی',
        email: 'maryam.ahmadi@zemano.ir',
        phone: '+989123456781'
      },
      {
        firstName: 'مهندس علی',
        lastName: 'کریمی',
        email: 'ali.karimi@zemano.ir',
        phone: '+989123456782'
      }
    ];

    for (const arbitrator of arbitrators) {
      const arbPasswordHash = await bcrypt.hash('arbitrator123', 12);
      
      const arbResult = await query(
        `INSERT INTO users (
           first_name, last_name, email, phone_number, password_hash, 
           role, is_verified, is_active, created_at
         ) VALUES ($1, $2, $3, $4, $5, 'arbitrator', true, true, NOW())
         RETURNING id`,
        [arbitrator.firstName, arbitrator.lastName, arbitrator.email, arbitrator.phone, arbPasswordHash]
      );

      // Create wallet for arbitrator
      await query(
        'INSERT INTO wallets (user_id, balance, total_earned, total_spent) VALUES ($1, 0, 0, 0)',
        [arbResult.rows[0].id]
      );

      console.log(`✅ Arbitrator created: ${arbitrator.firstName} ${arbitrator.lastName}`);
    }

    console.log('');
    console.log('🎉 Setup completed successfully!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser().then(() => {
    process.exit(0);
  });
}

export { createAdminUser };
