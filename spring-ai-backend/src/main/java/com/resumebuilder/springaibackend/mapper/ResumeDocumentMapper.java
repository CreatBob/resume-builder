// author: Bob
package com.resumebuilder.springaibackend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.resumebuilder.springaibackend.entity.ResumeDocumentEntity;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ResumeDocumentMapper extends BaseMapper<ResumeDocumentEntity> {

    List<ResumeDocumentEntity> selectActiveDocuments(@Param("workspaceId") String workspaceId);

    ResumeDocumentEntity selectActiveById(
            @Param("workspaceId") String workspaceId,
            @Param("id") String id
    );

    ResumeDocumentEntity selectSharedByToken(@Param("shareToken") String shareToken);

    int updateActiveDocumentIfVersion(
            @Param("id") String id,
            @Param("workspaceId") String workspaceId,
            @Param("title") String title,
            @Param("contentJson") String contentJson,
            @Param("version") Integer version
    );

    int enableShareById(
            @Param("id") String id,
            @Param("workspaceId") String workspaceId,
            @Param("shareToken") String shareToken
    );

    int softDeleteActiveById(
            @Param("workspaceId") String workspaceId,
            @Param("id") String id
    );
}
