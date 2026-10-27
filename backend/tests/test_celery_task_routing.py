"""Regression tests for isolated document parsing task routing."""

import pytest

pytest.importorskip("celery", reason="celery 未安装，跳过 Celery 路由测试")

from app.core.celery_app import celery_app  # noqa: E402


def test_document_parsing_tasks_use_dedicated_queue():
    routes = celery_app.conf.task_routes

    assert routes["pipeline.parse_document"]["queue"] == "document-parse"
    assert routes["pipeline.universal_parser_check"]["queue"] == "document-parse"


def test_default_queue_remains_available_for_general_tasks():
    assert celery_app.conf.task_default_queue == "default"
    assert "default" in celery_app.conf.task_queues
    assert "document-parse" in celery_app.conf.task_queues
