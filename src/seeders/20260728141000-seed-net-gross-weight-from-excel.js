'use strict';

// Populates product_variants.net_weight / gross_weight (grams, added by
// migration 20260728140000) from TapesForYou_Product_Catalogue_List.xlsx's
// "Products" sheet, matched by variant SKU — same join-key approach as
// 20260711131952-seed-product-content-from-excel.js.
//
// The sheet only has ONE weight value per SKU ("Weight (g) *" column) — it
// does not distinguish net vs. gross. Per an explicit decision with the
// project owner, both new fields are seeded with that same figure for now;
// admins can edit either one independently later once real distinct
// packaging-weight figures are available.
//
// The source column is free text, not already numeric ("500 gram",
// "9-9.5 KG", "16.5 KG") — parsed to grams here: KG values are converted
// (×1000), and a "low-high" range is averaged (e.g. "9-9.5 KG" → 9250g).
// 5 SKUs had a blank weight in the sheet (PVC-FM-48-15-GRN/BLUE don't exist
// as products at all — same 2 rows excluded by the content-fields seeder;
// RERE-48-5-YLW/WHT/YB exist but have no weight value in the sheet) and are
// deliberately left out — those variants keep net_weight/gross_weight NULL
// until an admin fills them in.

const weights = [
  { sku: 'BOPP-48-50-BRN', grams: 500 },
  { sku: 'BOPP-48-65-BRN', grams: 500 },
  { sku: 'BOPP-48-100-BRN', grams: 500 },
  { sku: 'BOPP-48-150-BRN', grams: 750 },
  { sku: 'BOPP-72-50-BRN', grams: 500 },
  { sku: 'BOPP-72-65-BRN', grams: 500 },
  { sku: 'BOPP-72-100-BRN', grams: 750 },
  { sku: 'BOPP-72-150-BRN', grams: 1000 },
  { sku: 'BOPP-72-50-BRN-BOX', grams: 9250 },
  { sku: 'BOPP-72-100-BRN-BOX', grams: 16500 },
  { sku: 'BOPP-48-50-BRN-BOX', grams: 9250 },
  { sku: 'BOPP-48-100-BRN-BOX', grams: 16500 },
  { sku: 'BOPP-12-50-TRN', grams: 500 },
  { sku: 'BOPP-24-50-TRN', grams: 500 },
  { sku: 'BOPP-48-50-TRN', grams: 500 },
  { sku: 'BOPP-48-65-TRN', grams: 500 },
  { sku: 'BOPP-48-100-TRN', grams: 500 },
  { sku: 'BOPP-48-150-TRN', grams: 750 },
  { sku: 'BOPP-72-50-TRN', grams: 500 },
  { sku: 'BOPP-72-65-TRN', grams: 500 },
  { sku: 'BOPP-72-100-TRN', grams: 750 },
  { sku: 'BOPP-72-150-TRN', grams: 1000 },
  { sku: 'BOPP-72-50-TRN-BOX', grams: 9250 },
  { sku: 'BOPP-72-100-TRN-BOX', grams: 16500 },
  { sku: 'BOPP-48-50-TRN-BOX', grams: 9250 },
  { sku: 'BOPP-48-100-TRN-BOX', grams: 16500 },
  { sku: 'PVC-ET-17-6-BLK', grams: 500 },
  { sku: 'PVC-ET-17-6-BLUE', grams: 500 },
  { sku: 'PVC-ET-17-6-RED', grams: 500 },
  { sku: 'PVC-ET-17-6-YLW', grams: 500 },
  { sku: 'PVC-ET-17-6-GRN', grams: 500 },
  { sku: 'PVC-FM-48-15-RW', grams: 500 },
  { sku: 'PVC-FM-48-15-YB', grams: 500 },
  { sku: 'PVC-FM-48-15-YLW', grams: 500 },
  { sku: 'PVC-FM-48-15-RED', grams: 500 },
  { sku: 'ANTI-SKID-48-5-BKL', grams: 500 },
  { sku: 'ANTI-SKID-48-5-YB', grams: 500 },
  { sku: 'ANTI-SKID-48-5-GLOW', grams: 500 },
  { sku: 'MASKING-24-20-CW', grams: 500 },
  { sku: 'MASKING-24-40-CW', grams: 500 },
  { sku: 'DUCT-48-20-GRY', grams: 500 },
  { sku: 'DSEF-24-1.5-FOAM', grams: 500 },
  { sku: 'KFTP-48-20-HM', grams: 500 },
  { sku: 'KFTP-72-20-HM', grams: 500 },
  { sku: 'NANO-20-3-TRN', grams: 500 },
  { sku: 'RERE-48-5-RED', grams: 500 },
  { sku: 'ALBL-48-5-SLVR', grams: 500 },
  { sku: 'ALBL-96-5-SLVR', grams: 1000 },
  { sku: 'FLEX-96-1-BW', grams: 500 },
  { sku: 'TSUE-24-20-WHT', grams: 500 },
  { sku: 'TSUE-48-20-WHT', grams: 500 },
];

module.exports = {
  up: async (queryInterface) => {
    for (const w of weights) {
      await queryInterface.sequelize.query(
        'UPDATE product_variants SET net_weight = :grams, gross_weight = :grams, updated_at = NOW() WHERE sku = :sku',
        { replacements: w }
      );
    }
  },
  down: async (queryInterface) => {
    for (const w of weights) {
      await queryInterface.sequelize.query(
        'UPDATE product_variants SET net_weight = NULL, gross_weight = NULL, updated_at = NOW() WHERE sku = :sku',
        { replacements: { sku: w.sku } }
      );
    }
  },
};
