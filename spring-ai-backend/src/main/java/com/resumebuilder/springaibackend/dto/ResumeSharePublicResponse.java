// author: Bob
package com.resumebuilder.springaibackend.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record ResumeSharePublicResponse(
        String id,
        String title,
        Map<String, Object> content,
        Integer version,
        String shareToken,
        LocalDateTime sharedAt,
        LocalDateTime updatedAt
) {
}
