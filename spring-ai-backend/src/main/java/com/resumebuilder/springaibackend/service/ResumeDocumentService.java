// author: Bob
package com.resumebuilder.springaibackend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumebuilder.springaibackend.dto.ResumeDocumentRequest;
import com.resumebuilder.springaibackend.dto.ResumeDocumentResponse;
import com.resumebuilder.springaibackend.dto.ResumeSharePublicResponse;
import com.resumebuilder.springaibackend.dto.ResumeShareResponse;
import com.resumebuilder.springaibackend.entity.ResumeDocumentEntity;
import com.resumebuilder.springaibackend.mapper.ResumeDocumentMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ResumeDocumentService {

    private final ResumeDocumentMapper resumeDocumentMapper;
    private final ObjectMapper objectMapper;

    public ResumeDocumentService(ResumeDocumentMapper resumeDocumentMapper, ObjectMapper objectMapper) {
        this.resumeDocumentMapper = resumeDocumentMapper;
        this.objectMapper = objectMapper;
    }

    public List<ResumeDocumentResponse> listDocuments() {
        return resumeDocumentMapper.selectActiveDocuments().stream()
                .map(this::toResponse)
                .toList();
    }

    public ResumeDocumentResponse getDocument(String id) {
        return toResponse(findActiveDocument(id));
    }

    @Transactional
    public ResumeShareResponse enableShare(String id) {
        ResumeDocumentEntity existing = findActiveDocument(id);
        String shareToken = normalizeShareToken(existing.getShareToken());
        if (!Boolean.TRUE.equals(existing.getShareEnabled()) || shareToken == null) {
            shareToken = "share_" + UUID.randomUUID().toString().replace("-", "");
            resumeDocumentMapper.enableShareById(existing.getId(), shareToken);
            existing = findActiveDocument(existing.getId());
        }

        return new ResumeShareResponse(
                existing.getId(),
                shareToken,
                buildShareUrl(shareToken),
                existing.getSharedAt()
        );
    }

    public ResumeSharePublicResponse getSharedDocument(String shareToken) {
        ResumeDocumentEntity entity = findSharedDocument(shareToken);
        return new ResumeSharePublicResponse(
                entity.getId(),
                entity.getTitle(),
                fromJson(entity.getContentJson()),
                entity.getVersion(),
                entity.getShareToken(),
                entity.getSharedAt(),
                entity.getUpdatedAt()
        );
    }

    @Transactional
    public ResumeDocumentResponse createDocument(ResumeDocumentRequest request) {
        LocalDateTime now = LocalDateTime.now();
        ResumeDocumentEntity entity = new ResumeDocumentEntity();
        entity.setId("resume_" + UUID.randomUUID().toString().replace("-", ""));
        entity.setTitle(normalizeTitle(request.title()));
        entity.setContentJson(toJson(request.content()));
        entity.setVersion(1);
        entity.setShareEnabled(false);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        resumeDocumentMapper.insert(entity);
        return toResponse(entity);
    }

    @Transactional
    public ResumeDocumentResponse updateDocument(String id, ResumeDocumentRequest request) {
        ResumeDocumentEntity existing = findActiveDocument(id);
        Integer version = request.version();
        if (version == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "保存简历时必须携带版本号");
        }

        int updated = resumeDocumentMapper.updateActiveDocumentIfVersion(
                existing.getId(),
                normalizeTitle(request.title()),
                toJson(request.content()),
                version
        );
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "简历已被其他页面更新，请刷新后再编辑");
        }

        return toResponse(findActiveDocument(existing.getId()));
    }

    @Transactional
    public void deleteDocument(String id) {
        ResumeDocumentEntity existing = findActiveDocument(id);
        resumeDocumentMapper.softDeleteActiveById(existing.getId());
    }

    private ResumeDocumentEntity findActiveDocument(String id) {
        String safeId = id == null ? "" : id.trim();
        if (safeId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "简历 ID 不能为空");
        }
        ResumeDocumentEntity entity = resumeDocumentMapper.selectActiveById(safeId);
        if (entity == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "未找到简历");
        }
        return entity;
    }

    private ResumeDocumentResponse toResponse(ResumeDocumentEntity entity) {
        return new ResumeDocumentResponse(
                entity.getId(),
                entity.getTitle(),
                fromJson(entity.getContentJson()),
                entity.getVersion(),
                entity.getShareToken(),
                Boolean.TRUE.equals(entity.getShareEnabled()),
                entity.getSharedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private String normalizeTitle(String title) {
        String value = title == null ? "" : title.trim();
        return value.isBlank() ? "未命名简历" : value;
    }

    private String toJson(Map<String, Object> content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "简历内容格式不合法");
        }
    }

    private Map<String, Object> fromJson(String raw) {
        try {
            return objectMapper.readValue(raw, new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "简历内容读取失败");
        }
    }

    private ResumeDocumentEntity findSharedDocument(String shareToken) {
        String safeToken = normalizeShareToken(shareToken);
        if (safeToken == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "分享链接无效");
        }
        ResumeDocumentEntity entity = resumeDocumentMapper.selectSharedByToken(safeToken);
        if (entity == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "未找到可分享简历");
        }
        return entity;
    }

    private String normalizeShareToken(String shareToken) {
        String safeToken = shareToken == null ? "" : shareToken.trim();
        return safeToken.isBlank() ? null : safeToken;
    }

    private String buildShareUrl(String shareToken) {
        return "/share/" + shareToken;
    }
}
