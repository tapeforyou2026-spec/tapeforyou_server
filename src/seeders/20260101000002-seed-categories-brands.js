'use strict';
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('categories', [
      { name: 'BOPP Self Adhesive Tape', slug: 'bopp-self-adhesive-tape', description: 'Clear and brown BOPP packaging tapes for industrial and domestic use', sort_order: 1, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'PVC Electrical Tape', slug: 'pvc-electrical-tape', description: 'Fire resistant PVC electrical insulation tapes', sort_order: 2, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'PVC Floor Marking Tape', slug: 'pvc-floor-marking-tape', description: 'High visibility PVC floor marking and safety tapes', sort_order: 3, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'Anti-Slip Tape', slug: 'anti-slip-tape', description: 'Rubber base anti-slip safety tapes', sort_order: 4, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'Masking Tape', slug: 'masking-tape', description: 'Crepe paper masking tapes for painting and finishing', sort_order: 5, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'Duct Tape', slug: 'duct-tape', description: 'Heavy duty cloth-backed duct tapes', sort_order: 6, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'Double Sided Foam Tape', slug: 'double-sided-foam-tape', description: 'EVA foam double sided adhesive tapes', sort_order: 7, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'Kraft Paper Tape', slug: 'kraft-paper-tape', description: 'Self adhesive kraft paper tapes', sort_order: 8, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'Nano Gel Tape', slug: 'nano-gel-tape', description: 'Acrylic solvent nano gel magic tapes', sort_order: 9, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'Reflective / Radium Tape', slug: 'reflective-radium-tape', description: 'High visibility retro reflective safety tapes', sort_order: 10, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'Butyl Tape', slug: 'butyl-tape', description: 'Waterproofing butyl rubber base adhesive tapes', sort_order: 11, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'Flex Tape', slug: 'flex-tape', description: 'Synthetic butyl rubber base flex tapes', sort_order: 12, status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'Tissue Tape', slug: 'tissue-tape', description: 'Hotmelt double sided adhesive tissue tapes', sort_order: 13, status: 'active', created_at: new Date(), updated_at: new Date() },
    ]);

    await queryInterface.bulkInsert('brands', [{
      name: 'TEP4U',
      slug: 'tep4u',
      description: 'Tapes For You — Premium Adhesive Tape Brand',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    }]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('brands', null, {});
    await queryInterface.bulkDelete('categories', null, {});
  },
};
