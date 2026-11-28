from celery import Celery
from celery.worker import state as worker_state

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
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

worker_state.revoked.expires = 24 * 3600
