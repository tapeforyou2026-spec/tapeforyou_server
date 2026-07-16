'use strict';

// Migrates the exact 6 testimonials that used to be hardcoded in the
// customer frontend's data/testimonials.js into the new admin-editable
// table. Avatars stay on placehold.co (never uploaded through the backend)
// until an admin replaces them via the admin panel, matching the
// hero-slides/blog seeders' approach for pre-existing content.
const now = new Date();

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('testimonials', [
      {
        name: 'Rajesh Sharma',
        role: 'Warehouse Manager',
        company: 'QuickShip Logistics',
        avatar: 'https://placehold.co/80x80/DFF4F2/0B8B87?text=RS',
        rating: 5,
        review: "The BOPP packaging tape is excellent! Strong adhesion, doesn't peel off even in humid conditions. We use it for all our shipments. Highly recommended for businesses.",
        product: 'BOPP Packaging Tape',
        sort_order: 0, status: 'active', created_at: now, updated_at: now,
      },
      {
        name: 'Priya Mehta',
        role: 'Interior Designer',
        company: 'Design Studio',
        avatar: 'https://placehold.co/80x80/DFF4F2/0B8B87?text=PM',
        rating: 5,
        review: 'The masking tape is perfect for my paint projects. Comes off cleanly without any residue, and the edge lines are super sharp. Will definitely reorder.',
        product: 'Premium Paint Masking Tape',
        sort_order: 1, status: 'active', created_at: now, updated_at: now,
      },
      {
        name: 'Arun Kumar',
        role: 'Electrician',
        company: 'Power Fix Solutions',
        avatar: 'https://placehold.co/80x80/DFF4F2/0B8B87?text=AK',
        rating: 5,
        review: 'The electrical insulation tape is top quality. Good dielectric strength and stays put even in high temperature environments. My go-to for all electrical work.',
        product: 'Electrical Insulation Tape',
        sort_order: 2, status: 'active', created_at: now, updated_at: now,
      },
      {
        name: 'Sunita Joshi',
        role: 'Small Business Owner',
        company: 'Handcraft Store',
        avatar: 'https://placehold.co/80x80/DFF4F2/0B8B87?text=SJ',
        rating: 4,
        review: 'Love the double sided tape for my craft projects. Very strong bond and the price is really competitive. Delivery was also super fast!',
        product: 'Double Sided Tape',
        sort_order: 3, status: 'active', created_at: now, updated_at: now,
      },
      {
        name: 'Vikram Singh',
        role: 'Maintenance Engineer',
        company: 'BuildRight Constructions',
        avatar: 'https://placehold.co/80x80/DFF4F2/0B8B87?text=VS',
        rating: 5,
        review: 'The foam tape works great for sealing gaps around doors and windows. Excellent weather resistance and easy to apply. Reduced our AC bills noticeably!',
        product: 'PE Foam Tape',
        sort_order: 4, status: 'active', created_at: now, updated_at: now,
      },
      {
        name: 'Anita Desai',
        role: 'Procurement Head',
        company: 'MegaMart India',
        avatar: 'https://placehold.co/80x80/DFF4F2/0B8B87?text=AD',
        rating: 5,
        review: 'We bulk order from Tapes For You every month. Consistent quality, competitive pricing, and the customer service team is very responsive. Excellent B2B partner.',
        product: 'Bulk Orders',
        sort_order: 5, status: 'active', created_at: now, updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('testimonials', null, {});
  },
};
