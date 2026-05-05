// author: Bob
package com.resumebuilder.springaibackend.controller;

import com.resumebuilder.springaibackend.dto.ResumeDocumentRequest;
import com.resumebuilder.springaibackend.dto.ResumeDocumentResponse;
import com.resumebuilder.springaibackend.dto.ResumeSharePublicResponse;
import com.resumebuilder.springaibackend.dto.ResumeShareResponse;
import com.resumebuilder.springaibackend.service.ResumeDocumentService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
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

    private final ResumeDocumentService resumeDocumentService;

    public ResumeDocumentController(ResumeDocumentService resumeDocumentService) {
        this.resumeDocumentService = resumeDocumentService;
    }

    @GetMapping
    public List<ResumeDocumentResponse> listDocuments() {
        return resumeDocumentService.listDocuments();
    }

    @GetMapping("/{id}")
    public ResumeDocumentResponse getDocument(@PathVariable String id) {
        return resumeDocumentService.getDocument(id);
    }

    @PostMapping
    public ResumeDocumentResponse createDocument(@Valid @RequestBody ResumeDocumentRequest request) {
        return resumeDocumentService.createDocument(request);
    }

    @PostMapping("/{id}/share")
    public ResumeShareResponse enableShare(@PathVariable String id) {
        return resumeDocumentService.enableShare(id);
    }

    @PutMapping("/{id}")
    public ResumeDocumentResponse updateDocument(
            @PathVariable String id,
            @Valid @RequestBody ResumeDocumentRequest request
    ) {
        return resumeDocumentService.updateDocument(id, request);
    }

    @GetMapping("/shared/{shareToken}")
    public ResumeSharePublicResponse getSharedDocument(@PathVariable String shareToken) {
        return resumeDocumentService.getSharedDocument(shareToken);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(@PathVariable String id) {
        resumeDocumentService.deleteDocument(id);
    }
}
