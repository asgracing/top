# Clubs/Teams frontend Stage F4b2b1 handoff

Local feature branch only. Production is unchanged.

Implemented:

- public detail membership-request link using public entity ID only;
- account request confirmation;
- pending invitation/request cards;
- accept/reject according to backend-provided resolution role;
- leave action for ordinary members; leaders remain protected;
- RU/EN copy and mobile stacking.

Validation:

- `npm run ci`: 237/237 tests passed;
- build: 260 files;
- references: 727;
- smoke: 25 routes/assets;
- visual matrix pending because no browser backend was available.

Remaining before production: manager invite/remove, staging round-trip, manual
desktop/tablet/mobile and keyboard validation.
