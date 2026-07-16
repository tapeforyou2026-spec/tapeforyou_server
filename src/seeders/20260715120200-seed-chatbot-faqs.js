'use strict';

// Migrates the exact 10 FAQ pairs that used to be hardcoded in
// components/chatbot/Chatbot.jsx — content copied verbatim, not reworded.
const now = new Date();

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('chatbot_faqs', [
      {
        question: 'What types of tapes do you sell?',
        answer: 'We sell BOPP packaging tapes, masking tapes, double-sided tapes, foam tapes, cello tapes, brown tapes, duct tapes and more — available in various widths and lengths.',
        sort_order: 0, status: 'active', created_at: now, updated_at: now,
      },
      {
        question: 'Do you offer bulk / wholesale pricing?',
        answer: 'Yes! We offer special pricing for bulk and wholesale orders. The more you order, the better the price. Contact us for a custom quote.',
        sort_order: 1, status: 'active', created_at: now, updated_at: now,
      },
      {
        question: 'What is the minimum order quantity?',
        answer: 'There is no minimum for retail purchases. For wholesale pricing, a minimum of 50 rolls per SKU is typically required.',
        sort_order: 2, status: 'active', created_at: now, updated_at: now,
      },
      {
        question: 'How long does delivery take?',
        answer: 'Delivery takes 3–7 business days depending on your location. Metro cities usually receive orders within 3–4 days.',
        sort_order: 3, status: 'active', created_at: now, updated_at: now,
      },
      {
        question: 'Do you deliver across India?',
        answer: 'Yes, we deliver pan-India via our logistics partners. Free shipping on orders above ₹500.',
        sort_order: 4, status: 'active', created_at: now, updated_at: now,
      },
      {
        question: 'What are the payment options?',
        answer: 'We accept UPI, net banking, credit/debit cards, and Cash on Delivery (COD) for eligible orders.',
        sort_order: 5, status: 'active', created_at: now, updated_at: now,
      },
      {
        question: 'How can I track my order?',
        answer: "Once your order is shipped, you will receive an SMS/email with the tracking number to track it on the courier's website.",
        sort_order: 6, status: 'active', created_at: now, updated_at: now,
      },
      {
        question: 'What is your return / refund policy?',
        answer: 'We accept returns within 7 days if the product is damaged or incorrect. Refunds are processed within 5–7 business days after inspection.',
        sort_order: 7, status: 'active', created_at: now, updated_at: now,
      },
      {
        question: 'Are tapes suitable for industrial use?',
        answer: 'Yes! Our BOPP, duct, and foam tapes are widely used in industrial packaging, manufacturing, and construction applications.',
        sort_order: 8, status: 'active', created_at: now, updated_at: now,
      },
      {
        question: 'How do I place a custom / bulk order?',
        answer: 'For custom sizes, printed tapes, or bulk orders, please reach out to us directly. Our team will get back to you within 24 hours.',
        sort_order: 9, status: 'active', created_at: now, updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('chatbot_faqs', null, {});
  },
};
