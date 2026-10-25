//package com.ecommerce.project.service;
//
//import com.ecommerce.project.model.OrderItem;
//import com.ecommerce.project.repositories.OrderItemRepository;
//import com.ecommerce.project.repositories.ProductRepository;
//import lombok.extern.slf4j.Slf4j;
//import org.deeplearning4j.models.embeddings.loader.WordVectorSerializer;
//import org.deeplearning4j.models.word2vec.Word2Vec;
//import org.deeplearning4j.text.sentenceiterator.CollectionSentenceIterator;
//import org.deeplearning4j.text.tokenization.tokenizer.preprocessor.CommonPreprocessor;
//import org.deeplearning4j.text.tokenization.tokenizerfactory.DefaultTokenizerFactory;
//import org.deeplearning4j.text.tokenization.tokenizerfactory.TokenizerFactory;
//import org.nd4j.linalg.api.ndarray.INDArray;
//import org.nd4j.linalg.factory.Nd4j;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.stereotype.Service;
//
//import javax.annotation.PostConstruct;
//import java.io.File;
//import java.util.*;
//import java.util.stream.Collectors;
//
//@Service
//@Slf4j
//public class ProductRecommendationService {
//
//    @Autowired
//    private ProductRepository productRepository;
//
//    @Autowired
//    private OrderItemRepository orderItemRepository;
//
//    private Word2Vec word2Vec;
//    private Map<Long, INDArray> productEmbeddings;
//    private static final String MODEL_PATH = "models/product2vec.model";
//    private static final int EMBEDDING_SIZE = 100;
//
//    @PostConstruct
//    public void init() {
//        productEmbeddings = new HashMap<>();
//        loadOrTrainModel();
//    }
//
//    /**
//     * Train Product2Vec model using purchase history
//     * Similar to Word2Vec but for products
//     */
//    public void trainModel() {
//        log.info("Starting Product2Vec model training...");
//
//        try {
//            // Get all orders with items, grouped by user
//            List<OrderItem> allOrderItems = orderItemRepository.findAllOrderByUserAndDate();
//
//            // Create product sequences (like sentences in Word2Vec)
//            Map<Long, List<String>> userPurchaseSequences = new HashMap<>();
//
//            for (OrderItem item : allOrderItems) {
//                Long userId = item.getOrder().getUser().getUserId();
//                String productId = "PROD_" + item.getProduct().getProductId();
//
//                userPurchaseSequences.computeIfAbsent(userId, k -> new ArrayList<>())
//                        .add(productId);
//            }
//
//            // Convert to sentences for Word2Vec
//            List<String> sentences = userPurchaseSequences.values().stream()
//                    .map(seq -> String.join(" ", seq))
//                    .collect(Collectors.toList());
//
//            if (sentences.isEmpty()) {
//                log.warn("No purchase history found. Using default embeddings.");
//                return;
//            }
//
//            // Configure Word2Vec
//            CollectionSentenceIterator iterator = new CollectionSentenceIterator(sentences);
//            TokenizerFactory tokenizerFactory = new DefaultTokenizerFactory();
//            tokenizerFactory.setTokenPreProcessor(new CommonPreprocessor());
//
//            // Build Word2Vec model
//            word2Vec = new Word2Vec.Builder()
//                    .minWordFrequency(1)
//                    .iterations(10)
//                    .layerSize(EMBEDDING_SIZE)
//                    .seed(42)
//                    .windowSize(5)
//                    .iterate(iterator)
//                    .tokenizerFactory(tokenizerFactory)
//                    .build();
//
//            word2Vec.fit();
//
//            // Save model
//            File modelFile = new File(MODEL_PATH);
//            modelFile.getParentFile().mkdirs();
//            WordVectorSerializer.writeWord2VecModel(word2Vec, modelFile);
//
//            // Build product embeddings map
//            buildProductEmbeddings();
//
//            log.info("Model training completed successfully!");
//
//        } catch (Exception e) {
//            log.error("Error training model: ", e);
//        }
//    }
//
//    /**
//     * Load existing model or train new one
//     */
//    private void loadOrTrainModel() {
//        File modelFile = new File(MODEL_PATH);
//
//        if (modelFile.exists()) {
//            try {
//                log.info("Loading existing Product2Vec model...");
//                word2Vec = WordVectorSerializer.readWord2VecModel(modelFile);
//                buildProductEmbeddings();
//                log.info("Model loaded successfully!");
//            } catch (Exception e) {
//                log.error("Error loading model, training new one...", e);
//                trainModel();
//            }
//        } else {
//            trainModel();
//        }
//    }
//
//    /**
//     * Build embeddings for all products
//     */
//    private void buildProductEmbeddings() {
//        List<Product> allProducts = productRepository.findAll();
//
//        for (Product product : allProducts) {
//            String productKey = "PROD_" + product.getProductId();
//
//            if (word2Vec != null && word2Vec.hasWord(productKey)) {
//                INDArray embedding = word2Vec.getWordVectorMatrix(productKey);
//                productEmbeddings.put(product.getProductId(), embedding);
//            } else {
//                // Random embedding for products not in training data
//                productEmbeddings.put(product.getProductId(), Nd4j.randn(1, EMBEDDING_SIZE));
//            }
//        }
//    }
//
//    /**
//     * Get personalized search results based on purchase history
//     */
//    public List<Product> personalizedSearch(Long userId, String searchQuery) {
//        log.info("Performing personalized search for user: {} with query: {}", userId, searchQuery);
//
//        // Get all products matching the search query
//        List<Product> candidateProducts = productRepository.searchByNameOrCategory(searchQuery);
//
//        if (candidateProducts.isEmpty()) {
//            return new ArrayList<>();
//        }
//
//        // Get user's purchase history
//        List<OrderItem> userHistory = orderItemRepository.findByUserId(userId);
//
//        if (userHistory.isEmpty()) {
//            // No history - return based on popularity or default ranking
//            return candidateProducts.stream()
//                    .limit(10)
//                    .collect(Collectors.toList());
//        }
//
//        // Calculate user preference vector (average of purchased products)
//        INDArray userVector = calculateUserVector(userHistory);
//
//        // Score and rank products
//        List<ProductScore> scoredProducts = new ArrayList<>();
//
//        for (Product product : candidateProducts) {
//            double score = calculateSimilarityScore(userVector, product);
//
//            // Bonus for same category as previously purchased
//            if (isPurchasedCategory(userHistory, product.getCategory().getCategoryId())) {
//                score *= 1.3; // 30% bonus
//            }
//
//            // Consider discount
//            if (product.getDiscount() != null && product.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
//                score *= 1.1; // 10% bonus for discounted items
//            }
//
//            scoredProducts.add(new ProductScore(product, score));
//        }
//
//        // Sort by score descending
//        return scoredProducts.stream()
//                .sorted((a, b) -> Double.compare(b.score, a.score))
//                .map(ps -> ps.product)
//                .limit(10)
//                .collect(Collectors.toList());
//    }
//
//    /**
//     * Get recommended products for homepage
//     */
//    public List<Product> getRecommendedProducts(Long userId, int limit) {
//        log.info("Getting product recommendations for user: {}", userId);
//
//        List<OrderItem> userHistory = orderItemRepository.findByUserId(userId);
//
//        if (userHistory.isEmpty()) {
//            // New user - return popular products
//            return productRepository.findTopByOrderByQuantityDesc()
//                    .stream()
//                    .limit(limit)
//                    .collect(Collectors.toList());
//        }
//
//        // Calculate user preference vector
//        INDArray userVector = calculateUserVector(userHistory);
//
//        // Get all products user hasn't purchased
//        Set<Long> purchasedProductIds = userHistory.stream()
//                .map(item -> item.getProduct().getProductId())
//                .collect(Collectors.toSet());
//
//        List<Product> allProducts = productRepository.findAll();
//        List<ProductScore> scoredProducts = new ArrayList<>();
//
//        for (Product product : allProducts) {
//            if (!purchasedProductIds.contains(product.getProductId())
//                    && product.getQuantity() > 0) {
//
//                double score = calculateSimilarityScore(userVector, product);
//
//                // Category preference bonus
//                if (isPurchasedCategory(userHistory, product.getCategory().getCategoryId())) {
//                    score *= 1.5;
//                }
//
//                scoredProducts.add(new ProductScore(product, score));
//            }
//        }
//
//        return scoredProducts.stream()
//                .sorted((a, b) -> Double.compare(b.score, a.score))
//                .limit(limit)
//                .map(ps -> ps.product)
//                .collect(Collectors.toList());
//    }
//
//    /**
//     * Calculate user preference vector from purchase history
//     */
//    private INDArray calculateUserVector(List<OrderItem> userHistory) {
//        INDArray sumVector = Nd4j.zeros(1, EMBEDDING_SIZE);
//        int count = 0;
//
//        for (OrderItem item : userHistory) {
//            Long productId = item.getProduct().getProductId();
//            INDArray productVector = productEmbeddings.get(productId);
//
//            if (productVector != null) {
//                // Weight by quantity purchased
//                int weight = item.getQuantity() != null ? item.getQuantity() : 1;
//                sumVector.addi(productVector.mul(weight));
//                count += weight;
//            }
//        }
//
//        if (count > 0) {
//            return sumVector.div(count); // Average vector
//        }
//
//        return Nd4j.randn(1, EMBEDDING_SIZE);
//    }
//
//    /**
//     * Calculate cosine similarity between user vector and product
//     */
//    private double calculateSimilarityScore(INDArray userVector, Product product) {
//        INDArray productVector = productEmbeddings.get(product.getProductId());
//
//        if (productVector == null) {
//            return 0.0;
//        }
//
//        // Cosine similarity
//        double dotProduct = userVector.mmul(productVector.transpose()).getDouble(0);
//        double userNorm = userVector.norm2Number().doubleValue();
//        double productNorm = productVector.norm2Number().doubleValue();
//
//        if (userNorm == 0 || productNorm == 0) {
//            return 0.0;
//        }
//
//        return dotProduct / (userNorm * productNorm);
//    }
//
//    /**
//     * Check if user has purchased from this category before
//     */
//    private boolean isPurchasedCategory(List<OrderItem> userHistory, Long categoryId) {
//        return userHistory.stream()
//                .anyMatch(item -> item.getProduct().getCategory().getCategoryId().equals(categoryId));
//    }
//
//    /**
//     * Inner class to hold product with score
//     */
//    private static class ProductScore {
//        Product product;
//        double score;
//
//        ProductScore(Product product, double score) {
//            this.product = product;
//            this.score = score;
//        }
//    }
//
//    /**
//     * Get similar products based on product embedding
//     */
//    public List<Product> getSimilarProducts(Long productId, int limit) {
//        log.info("Getting similar products for product: {}", productId);
//
//        INDArray targetVector = productEmbeddings.get(productId);
//        if (targetVector == null) {
//            return new ArrayList<>();
//        }
//
//        List<Product> allProducts = productRepository.findAll();
//        List<ProductScore> scoredProducts = new ArrayList<>();
//
//        for (Product product : allProducts) {
//            if (!product.getProductId().equals(productId) && product.getQuantity() > 0) {
//                INDArray productVector = productEmbeddings.get(product.getProductId());
//
//                if (productVector != null) {
//                    double similarity = cosineSimilarity(targetVector, productVector);
//                    scoredProducts.add(new ProductScore(product, similarity));
//                }
//            }
//        }
//
//        return scoredProducts.stream()
//                .sorted((a, b) -> Double.compare(b.score, a.score))
//                .limit(limit)
//                .map(ps -> ps.product)
//                .collect(Collectors.toList());
//    }
//
//    /**
//     * Calculate cosine similarity between two vectors
//     */
//    private double cosineSimilarity(INDArray vec1, INDArray vec2) {
//        double dotProduct = vec1.mmul(vec2.transpose()).getDouble(0);
//        double norm1 = vec1.norm2Number().doubleValue();
//        double norm2 = vec2.norm2Number().doubleValue();
//
//        if (norm1 == 0 || norm2 == 0) {
//            return 0.0;
//        }
//
//        return dotProduct / (norm1 * norm2);
//    }