from celery import Celery

from core.config import RABBITMQ_URL, REDIS_URL

celery_app = Celery(
    "project-rag",
    broker=RABBITMQ_URL,
    backend=REDIS_URL,
    include=["tasks.extract_task"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
)
