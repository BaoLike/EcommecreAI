package com.ecommerce.project.security.jwt;

import com.ecommerce.project.security.services.UserDetailsImpl;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

import javax.crypto.SecretKey;
import java.security.Key;
import java.util.Date;
import java.time.Duration;

@Component
public class JwtUtils {
    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    @Value("${spring.app.jwtSecret}")
    private String jwtSecret;

    @Value("${spring.app.jwtExpirationMs}")
    private Long jwtExpirationMs;

    @Value("${spring.ecom.app.jwtCookieName}")
    private String jwtCookie;

    @Value("${spring.app.jwtCookieSecure:true}")
    private String jwtCookieSecure;

    @Value("${spring.app.jwtCookieSameSite:Lax}")
    private String jwtCookieSameSite;

    private boolean isCookieSecure() {
        return Boolean.parseBoolean(jwtCookieSecure);
    }

    @PostConstruct
    void validateJwtSecret() {
        final byte[] decodedSecret;
        try {
            decodedSecret = Decoders.BASE64.decode(jwtSecret);
        } catch (RuntimeException exception) {
            throw new IllegalStateException(
                    "JWT_SECRET must be Base64-encoded random data; generate it with `openssl rand -base64 48`.",
                    exception);
        }
        if (decodedSecret.length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must decode to at least 32 bytes; generate it with `openssl rand -base64 48`.");
        }
    }

    public String getJwtFromCookies(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, jwtCookie);
        if (cookie != null) {
            return cookie.getValue();
        } else {
            return null;
        }
    }

    public ResponseCookie generateJwtCookie(UserDetailsImpl userPrincipal) {
        String jwt = generateTokenFromUsername(userPrincipal);
        ResponseCookie cookie = ResponseCookie.from(jwtCookie, jwt).path("/")
                .maxAge(Duration.ofMillis(jwtExpirationMs))
                .httpOnly(true)
                .secure(isCookieSecure())
                .sameSite(jwtCookieSameSite)
                .build();
        return cookie;
    }
    public ResponseCookie getCleanCookie() {
        ResponseCookie cookie = ResponseCookie.from(jwtCookie, "").path("/").maxAge(Duration.ZERO)
                .httpOnly(true)
                .secure(isCookieSecure())
                .sameSite(jwtCookieSameSite)
                .build();
        return cookie;
    }

    public String generateTokenFromUsername(UserDetails userDetails) {
        String username = userDetails.getUsername();
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key())
                .compact();
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parser()
                        .verifyWith((SecretKey) key())
                .build().parseSignedClaims(token)
                .getPayload().getSubject();
    }

    private Key key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parser().verifyWith((SecretKey) key()).build().parseSignedClaims(authToken);
            return true;
        } catch (MalformedJwtException e) {
            logger.warn("Rejected malformed JWT.");
        } catch (ExpiredJwtException e) {
            logger.debug("Rejected expired JWT.");
        } catch (UnsupportedJwtException e) {
            logger.warn("Rejected unsupported JWT.");
        } catch (IllegalArgumentException e) {
            logger.warn("Rejected empty or invalid JWT.");
        }
        return false;
    }
}
