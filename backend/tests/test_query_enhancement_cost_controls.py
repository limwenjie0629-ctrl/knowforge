"""Regression tests for adaptive query enhancement cost controls."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.query_enhancer import QueryEnhancer, QueryEnhancerConfig


def _response(content: str):
    response = MagicMock()
    response.content = content
    return response


@pytest.mark.asyncio
async def test_simple_query_skips_hyde_and_decomposition():
    gateway = AsyncMock()
    gateway.complete.return_value = _response("简短查询的改写")
    embeddings = AsyncMock()
    enhancer = QueryEnhancer(
        llm_gateway=gateway,
        embedding_service=embeddings,
        config=QueryEnhancerConfig(adaptive_cost_control=True),
    )

    result = await enhancer.enhance("员工年假")

    assert result.variants == ["简短查询的改写"]
    assert result.hyde_embeddings == []
    assert result.sub_queries == []
    assert gateway.complete.await_count == 1
    embeddings.embed_query.assert_not_awaited()


@pytest.mark.asyncio
async def test_long_query_keeps_enabled_enhancements():
    gateway = AsyncMock()
    gateway.complete.side_effect = [
        _response("查询改写"),
        _response("无需分解"),
        _response("这是用于检索的假设文档段落，描述相关规则和适用条件。"),
    ]
    embeddings = AsyncMock()
    embedding = MagicMock(dense_vector=[0.1] * 4)
    embeddings.embed_query.return_value = embedding
    enhancer = QueryEnhancer(
        llm_gateway=gateway,
        embedding_service=embeddings,
        config=QueryEnhancerConfig(adaptive_cost_control=True),
    )

    result = await enhancer.enhance("请详细说明员工申请年假需要满足的条件以及主管审批的具体流程")

    assert gateway.complete.await_count == 3
    assert embeddings.embed_query.await_count == 1
    assert result.hyde_embeddings == [[0.1] * 4]


@pytest.mark.asyncio
async def test_hyde_generation_respects_configured_document_limit():
    gateway = AsyncMock()
    gateway.complete.return_value = _response(
        "这是第一段满足长度要求的假设文档内容，覆盖主要检索意图。\n\n"
        "这是第二段满足长度要求的假设文档内容，覆盖其他检索意图。"
    )
    embeddings = AsyncMock()
    embeddings.embed_query.return_value = MagicMock(dense_vector=[0.2] * 4)
    enhancer = QueryEnhancer(
        llm_gateway=gateway,
        embedding_service=embeddings,
        config=QueryEnhancerConfig(hyde_max_documents=1),
    )

    vectors = await enhancer._generate_hyde("一个足够长的查询")

    assert len(vectors) == 1
    embeddings.embed_query.assert_awaited_once()
