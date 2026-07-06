'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface) => {
    // Roles
    await queryInterface.bulkInsert('roles', [
      { name: 'Super Admin', slug: 'super_admin', description: 'Full system access', created_at: new Date(), updated_at: new Date() },
      { name: 'Admin', slug: 'admin', description: 'Admin panel access', created_at: new Date(), updated_at: new Date() },
      { name: 'Manager', slug: 'manager', description: 'Product & order management', created_at: new Date(), updated_at: new Date() },
      { name: 'Support', slug: 'support', description: 'Customer support access', created_at: new Date(), updated_at: new Date() },
    ]);

    // Super admin
    const password = await bcrypt.hash('Admin@2026', 12);
    await queryInterface.bulkInsert('admins', [{
      uuid: uuidv4(),
      name: 'Super Admin',
      email: 'admin@tapesforyou.in',
      password,
      is_super_admin: true,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    }]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('admins', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  },
};
