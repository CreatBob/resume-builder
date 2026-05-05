// author: Bob
package com.resumebuilder.springaibackend.controller;

import com.resumebuilder.springaibackend.dto.ResumeDocumentRequest;
import com.resumebuilder.springaibackend.dto.ResumeDocumentResponse;
import com.resumebuilder.springaibackend.dto.ResumeSharePublicResponse;
import com.resumebuilder.springaibackend.dto.ResumeShareResponse;
import com.resumebuilder.springaibackend.service.ResumeDocumentService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/resumes")
public class ResumeDocumentController {

    private static final String RESUME_WORKSPACE_COOKIE_NAME = "resume_workspace";
    private static final Duration RESUME_WORKSPACE_COOKIE_MAX_AGE = Duration.ofDays(365);
    private static final Pattern RESUME_WORKSPACE_ID_PATTERN = Pattern.compile("^workspace_[0-9a-f]{32}$");

    private final ResumeDocumentService resumeDocumentService;

    public ResumeDocumentController(ResumeDocumentService resumeDocumentService) {
        this.resumeDocumentService = resumeDocumentService;
    }

    @GetMapping
    public List<ResumeDocumentResponse> listDocuments(HttpServletRequest request, HttpServletResponse response) {
        return resumeDocumentService.listDocuments(resolveOrCreateWorkspaceId(request, response));
    }

    @GetMapping("/{id}")
    public ResumeDocumentResponse getDocument(
            @PathVariable String id,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        return resumeDocumentService.getDocument(resolveOrCreateWorkspaceId(request, response), id);
    }

    @PostMapping
    public ResumeDocumentResponse createDocument(
            @Valid @RequestBody ResumeDocumentRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        return resumeDocumentService.createDocument(resolveOrCreateWorkspaceId(httpRequest, httpResponse), request);
    }

    @PostMapping("/{id}/share")
    public ResumeShareResponse enableShare(
            @PathVariable String id,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        return resumeDocumentService.enableShare(resolveOrCreateWorkspaceId(request, response), id);
    }

    @PutMapping("/{id}")
    public ResumeDocumentResponse updateDocument(
            @PathVariable String id,
            @Valid @RequestBody ResumeDocumentRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        return resumeDocumentService.updateDocument(resolveOrCreateWorkspaceId(httpRequest, httpResponse), id, request);
    }

    @GetMapping("/shared/{shareToken}")
    public ResumeSharePublicResponse getSharedDocument(@PathVariable String shareToken) {
        return resumeDocumentService.getSharedDocument(shareToken);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(
            @PathVariable String id,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        resumeDocumentService.deleteDocument(resolveOrCreateWorkspaceId(request, response), id);
    }

    private String resolveOrCreateWorkspaceId(HttpServletRequest request, HttpServletResponse response) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (!RESUME_WORKSPACE_COOKIE_NAME.equals(cookie.getName())) {
                    continue;
                }
                String value = cookie.getValue();
                if (isValidWorkspaceId(value)) {
                    return value;
                }
                break;
            }
        }

        String workspaceId = "workspace_" + UUID.randomUUID().toString().replace("-", "");
        ResponseCookie workspaceCookie = ResponseCookie.from(RESUME_WORKSPACE_COOKIE_NAME, workspaceId)
                .httpOnly(true)
                .path("/")
                .maxAge(RESUME_WORKSPACE_COOKIE_MAX_AGE)
                .sameSite("Lax")
                .secure(isSecureRequest(request))
                .build();
        response.addHeader("Set-Cookie", workspaceCookie.toString());
        return workspaceId;
    }

    private boolean isValidWorkspaceId(String workspaceId) {
        if (workspaceId == null) {
            return false;
        }
        return RESUME_WORKSPACE_ID_PATTERN.matcher(workspaceId).matches();
    }

    private boolean isSecureRequest(HttpServletRequest request) {
        if (request.isSecure()) {
            return true;
        }
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        return forwardedProto != null && "https".equalsIgnoreCase(forwardedProto.trim());
    }
}
