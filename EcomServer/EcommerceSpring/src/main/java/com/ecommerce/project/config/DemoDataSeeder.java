package com.ecommerce.project.config;

import com.ecommerce.project.model.*;
import com.ecommerce.project.repositories.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
@Profile("demo")
public class DemoDataSeeder implements CommandLineRunner {
    private static final String DEMO_USERNAME = "demo_customer";
    private static final String DEMO_EMAIL = "demo-customer@example.test";
    private static final String DEMO_ADMIN_USERNAME = "demo_admin";
    private static final String DEMO_ADMIN_EMAIL = "demo-admin@example.test";

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final PurchaseHistoryRepository purchaseHistoryRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${demo.seed.customer.password}")
    private String demoCustomerPassword;

    @Value("${demo.seed.admin.password}")
    private String demoAdminPassword;

    public DemoDataSeeder(
            CategoryRepository categoryRepository,
            ProductRepository productRepository,
            RoleRepository roleRepository,
            UserRepository userRepository,
            AddressRepository addressRepository,
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            PurchaseHistoryRepository purchaseHistoryRepository,
            PasswordEncoder passwordEncoder) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.purchaseHistoryRepository = purchaseHistoryRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        Map<String, Category> categories = seedCategories();
        Map<String, Product> products = seedProducts(categories);
        Users customer = seedCustomer();
        seedAdmin();
        Address address = seedAddress(customer);
        seedDeliveredOrder(customer, address, products.get("DEMO-PHN-001"), products.get("DEMO-TAB-001"));
        seedPendingOrder(customer, address, products.get("DEMO-LAP-001"));
    }

    private Map<String, Category> seedCategories() {
        Map<String, Category> result = new LinkedHashMap<>();
        for (String name : List.of("Mobile Phones", "Laptop", "Tablet", "Television", "Home Appliances")) {
            Category category = categoryRepository.findByCategoryName(name);
            if (category == null) {
                category = new Category();
                category.setCategoryName(name);
            }
            category.setDemoData(true);
            category = categoryRepository.save(category);
            result.put(name, category);
        }
        return result;
    }

    private Map<String, Product> seedProducts(Map<String, Category> categories) {
        Map<String, Product> result = new LinkedHashMap<>();
        result.put("DEMO-PHN-001", seedProduct("DEMO-PHN-001", "Mobile Phones", "Điện thoại Demo A 256GB",
                "Demo Electronics", "Phone A 256", 21_990_000, 8, 8, 24,
                Map.of("storage", "256 GB", "ram", "8 GB", "screen", "6.1 inch", "connectivity", "5G")));
        result.put("DEMO-PHN-002", seedProduct("DEMO-PHN-002", "Mobile Phones", "Điện thoại Demo B 256GB",
                "Demo Electronics", "Phone B 256", 18_490_000, 5, 5, 24,
                Map.of("storage", "256 GB", "ram", "8 GB", "screen", "6.5 inch", "connectivity", "5G")));
        result.put("DEMO-LAP-001", seedProduct("DEMO-LAP-001", "Laptop", "Laptop Demo 14 Ryzen 5",
                "Demo Computing", "Laptop 14 R5", 16_990_000, 10, 10, 24,
                Map.of("cpu", "Ryzen 5 7530U", "ram", "16 GB", "storage", "512 GB SSD", "screen", "14 inch FHD")));
        result.put("DEMO-LAP-002", seedProduct("DEMO-LAP-002", "Laptop", "Laptop Demo 15 Core i5",
                "Demo Computing", "Laptop 15 i5", 19_490_000, 0, 0, 24,
                Map.of("cpu", "Intel Core i5", "ram", "16 GB", "storage", "512 GB SSD", "screen", "15.6 inch FHD")));
        result.put("DEMO-TAB-001", seedProduct("DEMO-TAB-001", "Tablet", "Máy tính bảng Demo 128GB",
                "Demo Electronics", "Tablet 128", 9_990_000, 0, 3, 12,
                Map.of("storage", "128 GB", "ram", "8 GB", "screen", "11 inch", "connectivity", "Wi-Fi")));
        result.put("DEMO-TV-001", seedProduct("DEMO-TV-001", "Television", "Smart TV Demo 55 inch 4K",
                "Demo Vision", "TV 55 4K", 12_990_000, 0, 4, 24,
                Map.of("screen", "55 inch", "resolution", "4K UHD", "panel", "LED", "smartPlatform", "Demo TV OS")));
        result.put("DEMO-HOME-001", seedProduct("DEMO-HOME-001", "Home Appliances", "Máy lọc không khí Demo",
                "Demo Home", "Air Purifier 1", 3_490_000, 0, 6, 12,
                Map.of("coverage", "30 m2", "filter", "HEPA", "noise", "Low noise")));
        return result;
    }

    private Product seedProduct(String sku, String categoryName, String name, String brand, String model,
                                double price, double discount, int stockQuantity, int warrantyMonths,
                                Map<String, Object> specifications) {
        Product product = productRepository.findBySku(sku).orElseGet(Product::new);
        product.setSku(sku);
        product.setProductName(name);
        product.setDescription("Dữ liệu mô phỏng phục vụ kiểm thử và trình diễn. Không phải thông tin bán hàng thực tế.");
        product.setBrand(brand);
        product.setModel(model);
        product.setWarrantyMonths(warrantyMonths);
        product.setSpecifications(specifications);
        product.setCategory(categoryRepository.findByCategoryName(categoryName));
        product.setPrice(price);
        product.setDiscount(discount);
        product.setSpecialPrice(price * (1 - discount / 100.0));
        product.setQuantity(product.getProductId() == null || product.getQuantity() == null ? stockQuantity : product.getQuantity());
        product.setDemoData(true);
        return productRepository.save(product);
    }

    private Users seedCustomer() {
        Users user = userRepository.findByUsername(DEMO_USERNAME).orElseGet(() -> {
            Users newUser = new Users(DEMO_USERNAME, DEMO_EMAIL, passwordEncoder.encode(demoCustomerPassword));
            newUser.setSex("N/A");
            newUser.setAge(30);
            newUser.setDemoData(true);
            return newUser;
        });
        Roles userRole = roleRepository.findByRoleName(AppRole.ROLE_USER)
                .orElseGet(() -> roleRepository.save(new Roles(AppRole.ROLE_USER)));
        user.setRoles(Set.of(userRole));
        user.setDemoData(true);
        return userRepository.save(user);
    }

    private Users seedAdmin() {
        Users admin = userRepository.findByUsername(DEMO_ADMIN_USERNAME).orElseGet(() -> {
            Users newAdmin = new Users(DEMO_ADMIN_USERNAME, DEMO_ADMIN_EMAIL, passwordEncoder.encode(demoAdminPassword));
            newAdmin.setSex("N/A");
            newAdmin.setAge(30);
            newAdmin.setDemoData(true);
            return newAdmin;
        });
        Roles adminRole = roleRepository.findByRoleName(AppRole.ROLE_ADMIN)
                .orElseGet(() -> roleRepository.save(new Roles(AppRole.ROLE_ADMIN)));
        admin.setRoles(Set.of(adminRole));
        admin.setDemoData(true);
        return userRepository.save(admin);
    }

    private Address seedAddress(Users customer) {
        return customer.getAddresses().stream()
                .filter(Address::isDemoData)
                .findFirst()
                .orElseGet(() -> {
                    Address address = new Address();
                    address.setStreet("Đường Demo 01");
                    address.setBuildingName("Số 10");
                    address.setCity("Thành phố Hồ Chí Minh");
                    address.setWard("Phường Demo");
                    address.setReceiverName("Khách hàng Demo");
                    address.setPhoneNumberReceiver("0900000000");
                    address.setDemoData(true);
                    address.setUser(customer);
                    Address saved = addressRepository.save(address);
                    customer.getAddresses().add(saved);
                    userRepository.save(customer);
                    return saved;
                });
    }

    private void seedDeliveredOrder(Users customer, Address address, Product phone, Product tablet) {
        String reference = "DEMO-ORDER-0001";
        if (orderRepository.findByVnpayTxnRef(reference).isPresent()) return;
        Order order = newOrder(customer, address, reference, "DELIVERED");
        order.setOrderDate(LocalDate.now().minusDays(5));
        order.setCreatedAt(LocalDateTime.now().minusDays(5));
        order.setUpdatedAt(order.getCreatedAt());
        order.setTotalAmount(phone.getSpecialPrice() + tablet.getSpecialPrice());
        order.setPaymentMethod("VNPAY_SIMULATED");
        phone.setQuantity(Math.max(0, phone.getQuantity() - 1));
        tablet.setQuantity(Math.max(0, tablet.getQuantity() - 1));
        productRepository.save(phone);
        productRepository.save(tablet);
        addItem(order, phone, 1);
        addItem(order, tablet, 1);

        Payment payment = new Payment();
        payment.setPaymentMethod("VNPAY_SIMULATED");
        payment.setPaymentStatus("SUCCESS");
        payment.setAmount(order.getTotalAmount());
        payment.setTransactionNo("DEMO-TXN-0001");
        payment.setResponseCode("00");
        payment.setDemoData(true);
        paymentRepository.save(payment);
        order.setPayment(payment);
        orderRepository.save(order);

        for (Product purchasedProduct : List.of(phone, tablet)) {
            PurchaseHistory history = new PurchaseHistory();
            history.setUser(customer);
            history.setProduct(purchasedProduct);
            history.setQuantity(1);
            history.setPrice(purchasedProduct.getPrice());
            history.setDiscount(purchasedProduct.getDiscount());
            history.setSpecialPrice(purchasedProduct.getSpecialPrice());
            history.setPurchaseDate(LocalDateTime.now().minusDays(5));
            history.setOrderId(reference);
            history.setDemoData(true);
            purchaseHistoryRepository.save(history);
        }
    }

    private void seedPendingOrder(Users customer, Address address, Product laptop) {
        String reference = "DEMO-ORDER-0002";
        if (orderRepository.findByVnpayTxnRef(reference).isPresent()) return;
        Order order = newOrder(customer, address, reference, "PENDING");
        order.setTotalAmount(laptop.getSpecialPrice());
        order.setPaymentMethod("VNPAY_SIMULATED");
        order.setInventoryReserved(true);
        laptop.setQuantity(Math.max(0, laptop.getQuantity() - 1));
        productRepository.save(laptop);
        addItem(order, laptop, 1);

        Payment payment = new Payment();
        payment.setPaymentMethod("VNPAY_SIMULATED");
        payment.setPaymentStatus("PENDING");
        payment.setAmount(order.getTotalAmount());
        payment.setDemoData(true);
        paymentRepository.save(payment);
        order.setPayment(payment);
        orderRepository.save(order);
    }

    private Order newOrder(Users customer, Address address, String reference, String status) {
        Order order = new Order();
        order.setUser(customer);
        order.setEmail(customer.getEmail());
        order.setAddress(address);
        order.setVnpayTxnRef(reference);
        order.setOrderStatus(status);
        order.setDemoData(true);
        order.setInventoryReserved(false);
        order.setOrderItems(new java.util.ArrayList<>());
        return order;
    }

    private void addItem(Order order, Product product, int quantity) {
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setProduct(product);
        item.setQuantity(quantity);
        item.setDiscount(product.getDiscount());
        item.setOrderedProductPrice(product.getSpecialPrice());
        order.getOrderItems().add(item);
    }
}
