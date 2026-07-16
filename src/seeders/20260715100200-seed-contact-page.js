'use strict';

// Migrates the exact hardcoded copy from the customer frontend's
// app/contact/page.js into the new admin-editable table.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('contact_page', [
      {
        hero_label: 'Reach Out',
        hero_heading: 'Get in Touch',
        hero_description: "Have a question, need bulk pricing, or just want to say hello? We're here to help.",
        phone: '+91 99999 99999',
        email: 'hello@tapesforyou.in',
        address: 'Mumbai, Maharashtra, India',
        bulk_heading: 'Bulk Orders?',
        bulk_description: 'Get special business pricing and dedicated support.',
        bulk_email: 'bulk@tapesforyou.in',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('contact_page', null, {});
  },
};
