Place car image assets for `/top` here.

Expected file naming:
- `<car_model_id>.png`

Examples:
- `0.png` for Porsche 991 GT3 R
- `16.png` for Lamborghini Huracan Evo (2019)
- `32.png` for Ferrari 296 GT3
- `36.png` for Ford Mustang GT3

The frontend helper functions already resolve image paths using:
- `assets/car-icons/<car_model_id>.png`

Current lookup is based on `car_model`, `car_model_id`, and a few compatible fallback field names in `app.js`.
