const BigshipService = require('../services/bigship/BigshipService');
const R = require('../utils/response');

// One-time pickup warehouse setup — see services/bigship/claude.md "Pickup Flow".
// The returned warehouseId must be copied into BIGSHIP_WAREHOUSE_ID manually;
// this endpoint does not write to .env itself (matches how every other
// credential in this project is provisioned — a deliberate manual step).
exports.registerWarehouse = async (req, res) => {
  const {
    warehouseName, warehouseContactPerson, warehouseAddressPhone, warehouseState, warehouseCity,
    warehousePinCode, warehouseAddressLine1, warehouseAddressLine2, warehouseAddressLandMark,
  } = req.body;

  const result = await BigshipService.saveWarehouse({
    segment_type: 'local',
    // Not in Bigship's documented sample payload at all — a real, undocumented
    // required field discovered via a live 422 ("The warehouse name field is
    // required."), not something the PDF mentions. Also validated server-side
    // as letters-and-spaces-only (another live 422, no digits/hyphens allowed).
    // Falls back to a generated label if the caller doesn't supply one; rename
    // anytime via Update Warehouse.
    warehouseName: warehouseName || 'Tapes For You Nashik',
    warehouseContactPerson,
    warehouseAddressPhone,
    warehouseCountry: 'India',
    warehouseState,
    warehouseCity,
    warehousePinCode,
    warehouseAddressLine1,
    warehouseAddressLine2: warehouseAddressLine2 || '',
    warehouseAddressLandMark,
  });

  return R.success(res, 'Warehouse registered with Bigship — copy the warehouseId below into BIGSHIP_WAREHOUSE_ID', result.data);
};

exports.getWarehouse = async (req, res) => {
  const result = await BigshipService.getWarehouseList({ segment_type: 'local', perPage: '10', page: '1' });
  return R.success(res, 'Warehouse list fetched', result.data);
};

// Wallet balance lives inside Get Profile's response (data.userWallet.Balance) —
// Bigship has no separate "get balance" endpoint. Confirmed via a real live call:
// { firstName, lastName, EmailID, mobileNumber, userWallet: { Balance, kycCurrency } }.
exports.getProfile = async (req, res) => {
  const result = await BigshipService.getProfile();
  return R.success(res, 'Bigship profile fetched', result.data);
};
