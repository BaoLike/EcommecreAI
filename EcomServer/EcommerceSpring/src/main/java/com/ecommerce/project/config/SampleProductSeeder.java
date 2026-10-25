package com.ecommerce.project.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ecommerce.project.model.Category;
import com.ecommerce.project.model.Product;
import com.ecommerce.project.repositories.CategoryRepository;
import com.ecommerce.project.repositories.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Explicit, one-time local seed profile. It never runs during a normal app start
 * and it skips existing SKUs so it cannot overwrite products already in the DB.
 */
@Component
@Profile("sample-products")
public class SampleProductSeeder implements CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(SampleProductSeeder.class);

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;

    public SampleProductSeeder(CategoryRepository categoryRepository,
                               ProductRepository productRepository,
                               ObjectMapper objectMapper) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        int created = 0;
        int skipped = 0;
        Map<String, Category> categories = new HashMap<>();
        try (InputStream input = new ClassPathResource("sample-products.json").getInputStream()) {
            JsonNode rows = objectMapper.readTree(input).path("products");
            if (!rows.isArray()) {
                throw new IllegalStateException("sample-products.json must contain a products array");
            }

            for (JsonNode row : rows) {
                String sku = requiredText(row, "sku");
                if (productRepository.existsBySku(sku)) {
                    skipped++;
                    continue;
                }

                String categoryName = requiredText(row, "categoryName");
                Category category = categories.computeIfAbsent(categoryName, name -> {
                    Category existing = categoryRepository.findByCategoryName(name);
                    if (existing != null) return existing;
                    Category createdCategory = new Category();
                    createdCategory.setCategoryName(name);
                    createdCategory.setDemoData(true);
                    return categoryRepository.save(createdCategory);
                });

                Product product = new Product();
                product.setSku(sku);
                product.setProductName(requiredText(row, "productName"));
                product.setBrand(optionalText(row, "brand"));
                product.setModel(optionalText(row, "model"));
                product.setWarrantyMonths(row.path("warrantyMonths").asInt(0));
                product.setSpecifications(objectMapper.convertValue(
                        row.path("specifications"), new TypeReference<Map<String, Object>>() {}));
                product.setImage(optionalText(row, "image"));
                // Keep the source description below the current PostgreSQL varchar(255) column limit.
                product.setDescription(requiredText(row, "description"));
                product.setQuantity(Math.max(0, row.path("quantity").asInt(0)));
                product.setPrice(Math.max(0, row.path("priceVnd").asDouble(0)));
                product.setDiscount(Math.min(100, Math.max(0, row.path("discount").asDouble(0))));
                product.setSpecialPrice(product.getPrice() * (1 - product.getDiscount() / 100.0));
                product.setCategory(category);
                product.setDemoData(true);
                productRepository.save(product);
                created++;
            }
        }
        logger.info("Sample product import completed: {} created, {} existing SKUs skipped. All imported rows are demo data.",
                created, skipped);
    }

    private static String requiredText(JsonNode row, String field) {
        String value = optionalText(row, field);
        if (value == null) throw new IllegalStateException("Missing " + field + " in sample-products.json");
        return value;
    }

    private static String optionalText(JsonNode row, String field) {
        JsonNode value = row.get(field);
        return value == null || value.isNull() || value.asText().isBlank() ? null : value.asText().trim();
    }
}
