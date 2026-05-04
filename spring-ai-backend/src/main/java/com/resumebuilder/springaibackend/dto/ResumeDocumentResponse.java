// author: jf
package com.resumebuilder.springaibackend.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record ResumeDocumentResponse(
        String id,
        String title,
        Map<String, Object> content,
        Integer version,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
