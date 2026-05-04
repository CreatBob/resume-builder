// author: jf
package com.resumebuilder.springaibackend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.resumebuilder.springaibackend.entity.ResumeDocumentEntity;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ResumeDocumentMapper extends BaseMapper<ResumeDocumentEntity> {

    List<ResumeDocumentEntity> selectActiveDocuments();

    ResumeDocumentEntity selectActiveById(@Param("id") String id);

    int updateActiveDocumentIfVersion(
            @Param("id") String id,
            @Param("title") String title,
            @Param("contentJson") String contentJson,
            @Param("version") Integer version
    );

    int softDeleteActiveById(@Param("id") String id);
}
