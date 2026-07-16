'use strict';

// Migrates the exact hardcoded hero content from app/offers/page.js's top
// banner into the new admin-editable singleton row. The "Products on Sale"
// / "Max Discount" numbers stay computed from real product data in the
// frontend — only the editorial copy/images around them move here.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('offers_hero', [{
      badge_text: 'Limited Time Deals',
      heading_line1: 'Save Big on',
      heading_line2: 'Premium Tapes',
      subheading: "Exclusive discounts on ISO-certified adhesive tapes. Grab the best deals before they're gone!",
      desktop_image: '/heroimages/heroimg_01.jpeg',
      mobile_image: '/heroimages/heroimg_01_mobile.jpeg',
      coupon_label: 'Extra Savings',
      coupon_discount_text: '15% off',
      coupon_code: 'TAPE15',
      shipping_stat_value: 'Free',
      shipping_stat_label: 'Ship on ₹499+',
      flash_sale_chip_text: '🔥 FLASH SALE',
      iso_chip_text: '✓ ISO Certified',
      created_at: new Date(),
      updated_at: new Date(),
    }]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('offers_hero', null, {});
  },
};
