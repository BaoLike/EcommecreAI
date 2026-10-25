package com.ecommerce.project.service;

import com.ecommerce.project.model.PurchaseHistory;
import com.ecommerce.project.payload.PurchaseHistoryDTO;

import java.util.List;

public interface PurchaseHistoryService {
    public List<PurchaseHistoryDTO> getPurchaseHistoryByUserId(Integer userId);
}
