'use strict';

// Populates product_variants.dim_length / dim_width / dim_height (cm — these
// columns existed from day one but were only ever populated for 6 legacy
// seeded variants, never wired into any admin UI or shipping calculation —
// see server/server/CLAUDE.md's "Real Package Dimensions" section) from
// TapesForYou_Product_Catalogue_List.xlsx's "Products" sheet — the
// "SHIPPING DIMENSIONS" section has real Length(cm)/Width(cm)/Height(cm)
// columns per SKU (distinct from the single "Weight (g)" column used by
// 20260728141000-seed-net-gross-weight-from-excel.js). Matched by variant
// SKU, same pattern as that seeder and the earlier content-fields one.
//
// 54 of 55 non-header Excel rows matched real variants (only
// PVC-FM-48-15-GRN/BLUE were blank in the sheet and don't exist as products
// at all — same 2 rows excluded everywhere else in this project).

const dimensions = [
  { sku: 'BOPP-48-50-BRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-48-65-BRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-48-100-BRN', length: 12, width: 12, height: 12 },
  { sku: 'BOPP-48-150-BRN', length: 13, width: 13, height: 12 },
  { sku: 'BOPP-72-50-BRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-72-65-BRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-72-100-BRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-72-150-BRN', length: 13, width: 13, height: 16 },
  { sku: 'BOPP-72-50-BRN-BOX', length: 44, width: 31, height: 31 },
  { sku: 'BOPP-72-100-BRN-BOX', length: 49, width: 36, height: 31 },
  { sku: 'BOPP-48-50-BRN-BOX', length: 44, width: 31, height: 31 },
  { sku: 'BOPP-48-100-BRN-BOX', length: 49, width: 36, height: 31 },
  { sku: 'BOPP-12-50-TRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-24-50-TRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-48-50-TRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-48-65-TRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-48-100-TRN', length: 12, width: 12, height: 12 },
  { sku: 'BOPP-48-150-TRN', length: 13, width: 13, height: 12 },
  { sku: 'BOPP-72-50-TRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-72-65-TRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-72-100-TRN', length: 12, width: 12, height: 16 },
  { sku: 'BOPP-72-150-TRN', length: 13, width: 13, height: 16 },
  { sku: 'BOPP-72-50-TRN-BOX', length: 44, width: 31, height: 31 },
  { sku: 'BOPP-72-100-TRN-BOX', length: 49, width: 36, height: 31 },
  { sku: 'BOPP-48-50-TRN-BOX', length: 44, width: 31, height: 31 },
  { sku: 'BOPP-48-100-TRN-BOX', length: 49, width: 36, height: 31 },
  { sku: 'PVC-ET-17-6-BLK', length: 12, width: 8, height: 16 },
  { sku: 'PVC-ET-17-6-BLUE', length: 12, width: 8, height: 16 },
  { sku: 'PVC-ET-17-6-RED', length: 12, width: 8, height: 16 },
  { sku: 'PVC-ET-17-6-YLW', length: 12, width: 8, height: 16 },
  { sku: 'PVC-ET-17-6-GRN', length: 12, width: 8, height: 16 },
  { sku: 'PVC-FM-48-15-RW', length: 12, width: 12, height: 12 },
  { sku: 'PVC-FM-48-15-YB', length: 12, width: 12, height: 12 },
  { sku: 'PVC-FM-48-15-YLW', length: 12, width: 12, height: 12 },
  { sku: 'PVC-FM-48-15-RED', length: 12, width: 12, height: 12 },
  { sku: 'ANTI-SKID-48-5-BKL', length: 12, width: 12, height: 12 },
  { sku: 'ANTI-SKID-48-5-YB', length: 12, width: 12, height: 12 },
  { sku: 'ANTI-SKID-48-5-GLOW', length: 12, width: 12, height: 12 },
  { sku: 'MASKING-24-20-CW', length: 12, width: 12, height: 16 },
  { sku: 'MASKING-24-40-CW', length: 14, width: 14, height: 16 },
  { sku: 'DUCT-48-20-GRY', length: 16, width: 12, height: 12 },
  { sku: 'DSEF-24-1.5-FOAM', length: 16, width: 14, height: 14 },
  { sku: 'KFTP-48-20-HM', length: 12, width: 12, height: 16 },
  { sku: 'KFTP-72-20-HM', length: 12, width: 12, height: 16 },
  { sku: 'NANO-20-3-TRN', length: 12, width: 12, height: 16 },
  { sku: 'RERE-48-5-RED', length: 16, width: 12, height: 12 },
  { sku: 'RERE-48-5-YLW', length: 16, width: 12, height: 12 },
  { sku: 'RERE-48-5-WHT', length: 16, width: 12, height: 12 },
  { sku: 'RERE-48-5-YB', length: 16, width: 12, height: 12 },
  { sku: 'ALBL-48-5-SLVR', length: 12, width: 12, height: 12 },
  { sku: 'ALBL-96-5-SLVR', length: 12, width: 12, height: 12 },
  { sku: 'FLEX-96-1-BW', length: 12, width: 12, height: 12 },
  { sku: 'TSUE-24-20-WHT', length: 12, width: 12, height: 12 },
  { sku: 'TSUE-48-20-WHT', length: 12, width: 12, height: 12 },
];

module.exports = {
  up: async (queryInterface) => {
    for (const d of dimensions) {
      await queryInterface.sequelize.query(
        'UPDATE product_variants SET dim_length = :length, dim_width = :width, dim_height = :height, updated_at = NOW() WHERE sku = :sku',
        { replacements: d }
      );
    }
  },
  down: async (queryInterface) => {
    for (const d of dimensions) {
      await queryInterface.sequelize.query(
        'UPDATE product_variants SET dim_length = NULL, dim_width = NULL, dim_height = NULL, updated_at = NOW() WHERE sku = :sku',
        { replacements: { sku: d.sku } }
      );
    }
  },
};
