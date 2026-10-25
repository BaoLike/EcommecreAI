"""Transform DummyJSON's fake electronics sample into this app's seed format.

Usage:
    python tools/prepare_dummyjson_products.py /path/to/dummyjson-products.json
"""

import json
import re
import sys
from datetime import date
from pathlib import Path


SOURCE_URL = "https://dummyjson.com/products?limit=0"
SOURCE_CDN = "https://cdn.dummyjson.com"
USD_TO_VND_SAMPLE_MULTIPLIER = 25_000
CATEGORIES = {
    "beauty": "Beauty",
    "fragrances": "Fragrances",
    "furniture": "Furniture",
    "groceries": "Groceries",
    "home-decoration": "Home Decoration",
    "kitchen-accessories": "Kitchen Accessories",
    "smartphones": "Mobile Phones",
    "mobile-accessories": "Mobile Accessories",
    "laptops": "Laptop",
    "tablets": "Tablet",
    "mens-shirts": "Men's Shirts",
    "mens-shoes": "Men's Shoes",
    "mens-watches": "Men's Watches",
    "motorcycle": "Motorcycle",
    "skin-care": "Skin Care",
    "sports-accessories": "Sports Accessories",
    "sunglasses": "Sunglasses",
    "tops": "Tops",
    "vehicle": "Vehicle",
    "womens-bags": "Women's Bags",
    "womens-dresses": "Women's Dresses",
    "womens-jewellery": "Women's Jewellery",
    "womens-shoes": "Women's Shoes",
    "womens-watches": "Women's Watches",
}
OUTPUT = Path(__file__).resolve().parents[1] / "src/main/resources/sample-products.json"


def warranty_months(text: str) -> int:
    years = re.search(r"(\d+)\s*year", text, re.IGNORECASE)
    months = re.search(r"(\d+)\s*month", text, re.IGNORECASE)
    return int(years.group(1)) * 12 if years else int(months.group(1)) if months else 0


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Pass the downloaded DummyJSON products JSON file as the only argument.")
    source_path = Path(sys.argv[1])
    source = json.loads(source_path.read_text(encoding="utf-8"))
    products = []
    for item in source.get("products", []):
        category = item.get("category")
        if category not in CATEGORIES:
            continue
        product_id = int(item["id"])
        source_price = float(item.get("price") or 0)
        price_vnd = round(source_price * USD_TO_VND_SAMPLE_MULTIPLIER / 1000) * 1000
        discount = round(float(item.get("discountPercentage") or 0), 2)
        image = item.get("thumbnail") or next(iter(item.get("images") or []), None)
        specifications = {
            "source": "DummyJSON sample data",
            "sourceProductId": product_id,
            "sourceCategory": category,
            "sourceSku": item.get("sku"),
            "sourcePrice": source_price,
            "sourceCurrency": "USD (sample data)",
            "rating": item.get("rating"),
            "tags": item.get("tags") or [],
            "dimensions": item.get("dimensions") or {},
            "weight": item.get("weight"),
            "warrantyInformation": item.get("warrantyInformation"),
            "shippingInformation": item.get("shippingInformation"),
            "returnPolicy": item.get("returnPolicy"),
        }
        products.append({
            "sku": f"DUMMYJSON-{product_id:03d}",
            "productName": item.get("title", f"Sample product {product_id}"),
            "brand": item.get("brand"),
            "model": item.get("title", "")[:150],
            "categoryName": CATEGORIES[category],
            "warrantyMonths": warranty_months(item.get("warrantyInformation") or ""),
            "specifications": specifications,
            "image": image,
            "description": item.get("description") or "Sample electronics product.",
            "quantity": max(0, int(item.get("stock") or 0)),
            "priceVnd": price_vnd,
            "discount": discount,
        })

    output_data = {
        "source": {
            "name": "DummyJSON sample Products API",
            "url": SOURCE_URL,
            "cdn": SOURCE_CDN,
            "retrievedDate": date.today().isoformat(),
            "productCount": len(products),
            "disclaimer": "Fake sample data for local development only. Prices were scaled from sample USD values at a fixed 25,000 VND per USD; all imported records are marked demoData=true.",
        },
        "products": products,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(products)} sample products to {OUTPUT}")


if __name__ == "__main__":
    main()
