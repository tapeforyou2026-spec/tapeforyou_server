'use strict';

// Singleton table — always exactly one row, same pattern as about_page/
// offers_hero/contact_page. Default values here match the content that was
// previously hardcoded directly in tapeforyou_client's Footer.jsx, so making
// this dynamic doesn't change anything visible until an admin edits it.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('footer_settings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tagline: { type: Sequelize.TEXT, allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: true },
      address_line1: { type: Sequelize.STRING(200), allowNull: true },
      address_line2: { type: Sequelize.STRING(200), allowNull: true },
      address_line3: { type: Sequelize.STRING(200), allowNull: true },
      address_line4: { type: Sequelize.STRING(200), allowNull: true },
      instagram_url: { type: Sequelize.STRING(300), allowNull: true },
      facebook_url: { type: Sequelize.STRING(300), allowNull: true },
      twitter_url: { type: Sequelize.STRING(300), allowNull: true },
      youtube_url: { type: Sequelize.STRING(300), allowNull: true },
      linkedin_url: { type: Sequelize.STRING(300), allowNull: true },
      copyright_text: { type: Sequelize.STRING(200), allowNull: true },
      credit_text: { type: Sequelize.STRING(200), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.bulkInsert('footer_settings', [{
      tagline: 'Premium quality adhesive tapes for every need — trusted across India.',
      phone: '+91 81497 60064',
      email: 'hello@tapesforyou.in',
      address_line1: 'Gat No. 193, Trimbak Road,',
      address_line2: 'Belgaon Dhaga Shivar,',
      address_line3: 'Pimpalgaon Bahula, Anjaneri,',
      address_line4: 'Nashik, Maharashtra – 422213',
      instagram_url: '#',
      facebook_url: '#',
      twitter_url: '#',
      youtube_url: '#',
      linkedin_url: '#',
      copyright_text: 'Tapes For You. All rights reserved.',
      credit_text: 'Created by Rich System Solutions Pvt Ltd',
      created_at: new Date(),
      updated_at: new Date(),
    }]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('footer_settings');
  },
};
