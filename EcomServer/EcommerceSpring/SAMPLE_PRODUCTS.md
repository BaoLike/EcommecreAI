# Sample product catalog

`src/main/resources/sample-products.json` contains 194 sample products across 24 categories from the [DummyJSON Products API](https://dummyjson.com/docs/products), including electronics, clothing, home goods, groceries, and accessories. DummyJSON describes this catalog as sample data for testing and prototyping; these are not verified offers from the named brands or a supplier.

All imported products are marked `demoData=true`, and the storefront displays a DEMO warning. Source prices are sample USD values scaled at a fixed 25,000 VND per USD for display; this is not a live exchange rate or a recommended retail price. Images are remote URLs served by DummyJSON.

## Import into the local `Ecommerce` database

This is an explicit profile and does not run during normal application startup. Ensure the local schema is current (`JPA_DDL_AUTO=update` for a throwaway development database), then set `SPRING_PROFILES_ACTIVE=sample-products` in the Spring run configuration and start the backend once. The startup log reports how many sample rows were inserted. Remove that profile and restart the app normally afterward.

The seeder inserts only SKUs with the `DUMMYJSON-` prefix and skips any SKU already present. It does not delete or update existing catalog rows. The seed creates the needed categories when absent and leaves existing categories alone. To remove imported examples later, filter `product.sku LIKE 'DUMMYJSON-%'`; check that no sample product has been used in an order before deleting it.

If this catalog will be used for actual sales, replace it with an authorized supplier/product export and verified VND pricing, stock, warranty, return, and shipping terms.
