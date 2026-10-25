package com.ecommerce.project.service;

import com.ecommerce.project.model.Product;
import com.ecommerce.project.model.PurchaseHistory;
import com.ecommerce.project.payload.PurchaseHistoryDTO;
import com.ecommerce.project.repositories.PurchaseHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseHistoryServiceImpl implements PurchaseHistoryService {
    @Autowired
    private final PurchaseHistoryRepository purchaseHistoryRepository;

    public List<PurchaseHistoryDTO> getPurchaseHistoryByUserId(Integer userId) {
        List<PurchaseHistory> purchases = purchaseHistoryRepository.findByUserIdWithProduct(userId);

        return purchases.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private PurchaseHistoryDTO convertToDTO(PurchaseHistory purchase) {
        Product product = purchase.getProduct();

        PurchaseHistoryDTO dto = new PurchaseHistoryDTO();
        dto.setId(purchase.getId());
        dto.setProductId(product.getProductId());
        dto.setProductName(product.getProductName());
        dto.setImage(product.getImage());
        dto.setDescription(product.getDescription());
        dto.setCategoryName(product.getCategory() != null ? product.getCategory().getCategoryName() : null);
        dto.setQuantity(purchase.getQuantity());
        dto.setPrice(purchase.getPrice());
        dto.setDiscount(purchase.getDiscount());
        dto.setSpecialPrice(purchase.getSpecialPrice());

        // Tính tổng tiền dựa trên specialPrice nếu có, không thì dùng price
        double finalPrice = purchase.getSpecialPrice() != null && purchase.getSpecialPrice() > 0
                ? purchase.getSpecialPrice()
                : purchase.getPrice();
        dto.setTotalPrice(finalPrice * purchase.getQuantity());

        dto.setPurchaseDate(purchase.getPurchaseDate());
        dto.setOrderId(purchase.getOrderId());
        return dto;
    }

    public PurchaseHistory savePurchase(PurchaseHistory purchase) {
        return purchaseHistoryRepository.save(purchase);
    }
}
