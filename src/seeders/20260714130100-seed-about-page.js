'use strict';

// Migrates the exact hardcoded content from app/about/page.js and
// components/sections/VisionMission.jsx into the new admin-editable
// singleton row, so the About page looks identical on first deploy.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('about_page', [{
      hero_label: 'Our Story',
      hero_heading: "We're Passionate About Quality Tapes",
      hero_paragraph1: 'Founded in 2020, Tapes For You started with a simple mission: make high-quality adhesive tapes accessible to everyone in India — from small businesses to large enterprises and everyday households.',
      hero_paragraph2: 'We source our products from trusted manufacturers who meet our strict quality standards. Every tape we sell is tested for adhesion strength, temperature resistance, and durability.',
      hero_image: 'https://placehold.co/600x600/DFF4F2/0B8B87?text=About+Us',
      hero_button_text: 'Shop Our Products',
      hero_button_link: '/shop',
      vision_label: 'Who We Are',
      vision_subheading: 'The purpose that drives everything we do',
      vision_title: "To be India's most trusted adhesive solutions brand",
      vision_body: 'We envision a future where every home, business, and industry in India has access to premium-quality adhesive tapes — delivered fast, priced fairly, and backed by unmatched reliability.',
      mission_title: 'Deliver quality that sticks — every single time',
      mission_body: 'Our mission is to source, test, and deliver ISO-certified adhesive tapes that perform exactly as promised — empowering businesses and households with products they can depend on, at prices that make sense.',
      values_label: 'What We Stand For',
      values_heading: 'Our Values',
      stats: JSON.stringify([
        { icon: 'users', value: '10,000+', label: 'Happy Customers' },
        { icon: 'package', value: '50+', label: 'Products' },
        { icon: 'truck', value: '5,000+', label: 'Orders Shipped' },
        { icon: 'award', value: '5★', label: 'Average Rating' },
      ]),
      values: JSON.stringify([
        { title: 'Quality First', description: 'Every product meets our strict quality standards before it reaches you.' },
        { title: 'Customer Focus', description: 'We listen, respond quickly, and go the extra mile for every customer.' },
        { title: 'Sustainability', description: 'We partner with manufacturers committed to responsible production.' },
      ]),
      created_at: new Date(),
      updated_at: new Date(),
    }]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('about_page', null, {});
  },
};
