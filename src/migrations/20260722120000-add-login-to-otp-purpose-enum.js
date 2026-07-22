'use strict';

// Adds the new 'login' OTP purpose (mobile-OTP login, alongside the existing
// verify_mobile/reset_password) to the real Postgres ENUM type backing
// otps.purpose. Adding the value to the JS-level OTP_PURPOSE constant alone
// is not enough — Postgres enums are strict, and inserting 'login' without
// this migration fails with "invalid input value for enum
// enum_otps_purpose: 'login'" (hit live while building this feature).
//
// ALTER TYPE ... ADD VALUE cannot run inside the same transaction as a query
// that uses the new value, but this migration only adds the value — nothing
// here also inserts a 'login' row — so it's safe to run as-is.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_otps_purpose\" ADD VALUE IF NOT EXISTS 'login';"
    );
  },

  // Postgres has no direct "remove enum value" operation — down is a no-op.
  // If this ever needs reverting, it requires a manual column rebuild.
  async down() {},
};
