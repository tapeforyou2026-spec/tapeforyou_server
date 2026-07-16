'use strict';

// Migrates the exact 3 slides that used to be hardcoded in the customer
// frontend's data/heroSlides.js into the new admin-editable table, so the
// homepage looks identical on first deploy of this feature. Image paths
// point at the Next.js app's own /public/heroimages/* files (root-relative,
// resolved against whatever site renders them) rather than backend /uploads
// — these were never uploaded through the backend, they're static frontend
// assets. Once an admin uploads a new image through the admin panel, that
// slide's image switches to a real backend-served /uploads/hero/... path.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('hero_slides', [
      {
        heading_line1: 'Stronger Bond.',
        heading_line2: 'Every Time.',
        colored_line: 1,
        description_line1: 'Premium quality adhesive tapes for every need.',
        description_line2: 'Reliable. Durable. Made to stick.',
        desktop_image: '/heroimages/new_img_01.jpeg',
        mobile_image: '/heroimages/img_mobile_01.jpeg',
        offer_label: 'Welcome Offer',
        offer_discount: '15% OFF',
        offer_context_line1: 'On Your',
        offer_context_line2: 'First Order',
        coupon_code: 'TAPE15',
        button_text: 'Shop Now',
        button_link: '/shop',
        sort_order: 0,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        heading_line1: 'Wrap It Right.',
        heading_line2: 'Ship It Safe.',
        colored_line: 1,
        description_line1: 'Industrial-grade packaging tapes built for heavy loads.',
        description_line2: 'Your parcels, always protected.',
        desktop_image: '/heroimages/new_img_02.jpeg',
        mobile_image: '/heroimages/img_mobile_02.jpeg',
        offer_label: 'Bulk Offer',
        offer_discount: '10% OFF',
        offer_context_line1: 'On Orders',
        offer_context_line2: 'Above ₹500',
        coupon_code: 'PACK10',
        button_text: 'Shop Now',
        button_link: '/shop',
        sort_order: 1,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        heading_line1: 'Stick to Quality.',
        heading_line2: 'Always.',
        colored_line: 1,
        description_line1: 'From office to warehouse, consistent performance.',
        description_line2: 'Built to stick — every single time.',
        desktop_image: '/heroimages/new_img_03.jpeg',
        mobile_image: '/heroimages/img_mobile_03.jpeg',
        offer_label: 'Bulk Discount',
        offer_discount: '20% OFF',
        offer_context_line1: 'On Bulk',
        offer_context_line2: 'Orders',
        coupon_code: 'BULK20',
        button_text: 'Shop Now',
        button_link: '/shop',
        sort_order: 2,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('hero_slides', null, {});
  },
};
