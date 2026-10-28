from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from api.dependencies import existing_space
from db.analyses.analyses import (
    change_canvas,
    create_analysis,
    delete_analysis,
    get_analysis,
    list_all_analyses,
    list_analyses,
    reorder_analyses,
    update_analysis,
)
from db.errors import RevisionConflictError
from schemas.analyses import (
    Analysis,
    AnalysisCreate,
    AnalysisListItem,
    AnalysisOrder,
    AnalysisSummary,
    AnalysisUpdate,
    CanvasChanges,
    CanvasSaved,
)

router = APIRouter(
    prefix="/spaces/{space_id}/analyses",
    tags=["analyses"],
    dependencies=[Depends(existing_space)],
)
# Analyses of every space, for the analyses page.
all_router = APIRouter(prefix="/analyses", tags=["analyses"])


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Analysis not found")


@all_router.get("", response_model=list[AnalysisListItem])
async def get_all_analyses(limit: int = Query(100, ge=1, le=500)):
    return await list_all_analyses(limit)


@all_router.put("/order", status_code=status.HTTP_204_NO_CONTENT)
async def put_analysis_order(body: AnalysisOrder):
    await reorder_analyses(body.analysis_ids)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("", response_model=list[AnalysisSummary])
async def get_analyses(space_id: str):
    return await list_analyses(space_id)


@router.post("", response_model=Analysis, status_code=status.HTTP_201_CREATED)
async def post_analysis(space_id: str, body: AnalysisCreate):
    entities = [e.model_dump() for e in body.entities]
    return await create_analysis(space_id, body.name, entities, body.article_ids)


@router.get("/{analysis_id}", response_model=Analysis)
async def get_one_analysis(space_id: str, analysis_id: str):
    analysis = await get_analysis(space_id, analysis_id)
    if analysis is None:
        raise _not_found()
    return analysis


@router.patch("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def patch_analysis(space_id: str, analysis_id: str, body: AnalysisUpdate):
    changes = {}
    if body.name is not None:
        changes["name"] = body.name
    if body.viewport is not None:
        changes |= {f"viewport_{k}": v for k, v in body.viewport.model_dump().items()}
    if not await update_analysis(space_id, analysis_id, changes):
        raise _not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{analysis_id}/canvas", response_model=CanvasSaved)
async def patch_canvas(space_id: str, analysis_id: str, body: CanvasChanges):
    """Save what changed on the canvas. 409 when another tab saved since `revision`;
    the client then reloads."""
    changes = body.model_dump(exclude={"revision"})
    try:
        saved = await change_canvas(space_id, analysis_id, body.revision, changes)
    except RevisionConflictError as e:
        raise HTTPException(
            status_code=409, detail="Analiza zmieniła się w innym miejscu, wczytaj ją ponownie"
        ) from e
    if saved is None:
        raise _not_found()
    return saved


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_analysis(space_id: str, analysis_id: str):
    if not await delete_analysis(space_id, analysis_id):
        raise _not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
