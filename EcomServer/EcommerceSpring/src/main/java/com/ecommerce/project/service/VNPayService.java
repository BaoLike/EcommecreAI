package com.ecommerce.project.service;

import com.ecommerce.project.Utils.VNPayUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.*;
import com.ecommerce.project.payload.PaymentRequestDTO;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@Service
@Log4j2
public class VNPayService {

    @Value("${vnpay.tmnCode}")
    private String vnpTmnCode;

    @Value("${vnpay.hashSecret}")
    private String vnpHashSecret;

    @Value("${vnpay.payUrl}")
    private String vnpPayUrl;

    @Value("${vnpay.returnUrl}")
    private String vnpReturnUrl;

    public String createPayment(PaymentRequestDTO paymentRequestDTO, String vnpayTxnRef,
                                HttpServletRequest request) throws UnsupportedEncodingException {
        ensureConfigured();

        String vnpVersion = "2.1.0";
        String vnpCommand = "pay";
        String vnpIpAddr = VNPayUtil.getIpAddress(request);

        long vnpAmount = Math.multiplyExact(paymentRequestDTO.getAmount(), 100L);

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", vnpVersion);
        vnpParams.put("vnp_Command", vnpCommand);
        vnpParams.put("vnp_TmnCode", vnpTmnCode);
        vnpParams.put("vnp_Amount", String.valueOf(vnpAmount));
        vnpParams.put("vnp_CurrCode", "VND");

        if (paymentRequestDTO.getBankCode() != null && !paymentRequestDTO.getBankCode().isEmpty()) {
            vnpParams.put("vnp_BankCode", paymentRequestDTO.getBankCode());
        }

        vnpParams.put("vnp_TxnRef", vnpayTxnRef);
        vnpParams.put("vnp_OrderInfo", paymentRequestDTO.getOrderInfo());
        vnpParams.put("vnp_OrderType", paymentRequestDTO.getOrderType());
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnpReturnUrl);
        vnpParams.put("vnp_IpAddr", vnpIpAddr);

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String vnpCreateDate = formatter.format(cld.getTime());
        vnpParams.put("vnp_CreateDate", vnpCreateDate);

        cld.add(Calendar.MINUTE, 15);
        String vnpExpireDate = formatter.format(cld.getTime());
        vnpParams.put("vnp_ExpireDate", vnpExpireDate);

        vnpParams.put("vnp_Bill_Mobile", paymentRequestDTO.getBillingMobile());
        vnpParams.put("vnp_Bill_Email", paymentRequestDTO.getBillingEmail());

        if (paymentRequestDTO.getBillingFullname() != null && !paymentRequestDTO.getBillingFullname().isEmpty()) {
            String billingFullname = paymentRequestDTO.getBillingFullname().trim();
            String[] nameParts = billingFullname.split("\\s+", 2);
            String firstName = nameParts[0];
            String lastName = nameParts.length == 2 ? nameParts[1] : nameParts[0];
            vnpParams.put("vnp_Bill_FirstName", firstName);
            vnpParams.put("vnp_Bill_LastName", lastName);
        }

        vnpParams.put("vnp_Bill_Address", paymentRequestDTO.getBillAddress());
        vnpParams.put("vnp_Bill_City", paymentRequestDTO.getBillCity());
        vnpParams.put("vnp_Bill_Country", paymentRequestDTO.getBillCountry());

        if (paymentRequestDTO.getBillState() != null && !paymentRequestDTO.getBillState().isEmpty()) {
            vnpParams.put("vnp_Bill_State", paymentRequestDTO.getBillState());
        }

        vnpParams.put("vnp_Inv_Phone", paymentRequestDTO.getInvMobile());
        vnpParams.put("vnp_Inv_Email", paymentRequestDTO.getInvEmail());
        vnpParams.put("vnp_Inv_Customer", paymentRequestDTO.getInvCustomer());
        vnpParams.put("vnp_Inv_Address", paymentRequestDTO.getBillAddress());
        vnpParams.put("vnp_Inv_Company", paymentRequestDTO.getInvCompany());
        vnpParams.put("vnp_Inv_Taxcode", paymentRequestDTO.getInvTaxcode());
        vnpParams.put("vnp_Inv_Type", paymentRequestDTO.getInvType());

        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);

        StringJoiner hashData = new StringJoiner("&");
        StringJoiner query = new StringJoiner("&");
        for (String fieldName : fieldNames) {
            String fieldValue = vnpParams.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                String encodedName = URLEncoder.encode(fieldName, StandardCharsets.UTF_8);
                String encodedValue = URLEncoder.encode(fieldValue, StandardCharsets.UTF_8);
                hashData.add(encodedName + "=" + encodedValue);
                query.add(encodedName + "=" + encodedValue);
            }
        }

        String queryUrl = query.toString();
        String vnpSecureHash = VNPayUtil.hmacSHA512(vnpHashSecret, hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnpSecureHash;

        return vnpPayUrl + "?" + queryUrl;
    }

    public void ensureConfigured() {
        if (vnpTmnCode == null || vnpTmnCode.isBlank() || vnpHashSecret == null || vnpHashSecret.isBlank() ||
                vnpPayUrl == null || vnpPayUrl.isBlank() || vnpReturnUrl == null || vnpReturnUrl.isBlank()) {
            throw new IllegalStateException("VNPay is not configured.");
        }
    }

    public String createPaymentFromDTO(PaymentRequestDTO dto, String vnpayTxnRef, HttpServletRequest request)
            throws UnsupportedEncodingException {
        return createPayment(
                dto,
                vnpayTxnRef,
                request
        );
    }

    public String calculateSecureHash(Map<String, String> params) {
        Map<String, String> fields = new HashMap<>(params);

        fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");

        return hashAllFields(fields);
    }

    private String bytesToHex(byte[] bytes) {
        return HexFormat.of().formatHex(bytes);
    }


    public String hashAllFields(Map<String, String> fields) {
        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);
        StringJoiner hashData = new StringJoiner("&");
        for (String fieldName : fieldNames) {
            String fieldValue = fields.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                hashData.add(fieldName + "=" + URLEncoder.encode(fieldValue, StandardCharsets.UTF_8));
            }
        }
        return hmacSHA512(vnpHashSecret, hashData.toString());
    }

    public static String hmacSHA512(final String key, final String data) {
        try {
            if (key == null || data == null) {
                throw new NullPointerException();
            }
            final Mac hmac512 = Mac.getInstance("HmacSHA512");
            byte[] hmacKeyBytes = key.getBytes(StandardCharsets.UTF_8);
            final SecretKeySpec secretKey = new SecretKeySpec(hmacKeyBytes, "HmacSHA512");
            hmac512.init(secretKey);
            byte[] dataBytes = data.getBytes(StandardCharsets.UTF_8);
            byte[] result = hmac512.doFinal(dataBytes);
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            return "";
        }
    }
}
