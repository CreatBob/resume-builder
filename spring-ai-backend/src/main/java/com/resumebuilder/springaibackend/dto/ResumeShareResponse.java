// author: Bob
package com.resumebuilder.springaibackend.dto;

import java.time.LocalDateTime;

public record ResumeShareResponse(
        String documentId,
        String shareToken,
        String shareUrl,
        LocalDateTime sharedAt
) {
}
