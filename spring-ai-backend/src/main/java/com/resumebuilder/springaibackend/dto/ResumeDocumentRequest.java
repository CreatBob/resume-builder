// author: jf
package com.resumebuilder.springaibackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record ResumeDocumentRequest(
        @NotBlank(message = "简历名称不能为空")
        @Size(max = 120, message = "简历名称不能超过120个字符")
        String title,

        @NotNull(message = "简历内容不能为空")
        Map<String, Object> content,

        Integer version
) {
}
