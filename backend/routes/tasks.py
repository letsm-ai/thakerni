from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
from database import db
from auth_helpers import get_current_user
from models import TaskCreate, TaskUpdate, TaskResponse
import uuid

tasks_router = APIRouter(prefix="/api")


@tasks_router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, user: dict = Depends(get_current_user)):
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    task_doc = {
        "task_id": task_id, "user_id": user["user_id"],
        "title": task.title, "description": task.description,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "priority": task.priority, "completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task_doc)
    return TaskResponse(
        task_id=task_id, title=task.title, description=task.description,
        due_date=task.due_date, priority=task.priority,
        completed=False, created_at=datetime.now(timezone.utc)
    )


@tasks_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for task in tasks:
        created_at = task["created_at"]
        due_date = task.get("due_date")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date)
        result.append(TaskResponse(
            task_id=task["task_id"], title=task["title"],
            description=task.get("description"), due_date=due_date,
            priority=task["priority"], completed=task["completed"], created_at=created_at
        ))
    return result


@tasks_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task_update: TaskUpdate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"task_id": task_id, "user_id": user["user_id"]}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = {}
    if task_update.title is not None:
        update_data["title"] = task_update.title
    if task_update.description is not None:
        update_data["description"] = task_update.description
    if task_update.due_date is not None:
        update_data["due_date"] = task_update.due_date.isoformat()
    if task_update.priority is not None:
        update_data["priority"] = task_update.priority
    if task_update.completed is not None:
        update_data["completed"] = task_update.completed

    if update_data:
        await db.tasks.update_one({"task_id": task_id}, {"$set": update_data})

    updated_task = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    created_at = updated_task["created_at"]
    due_date = updated_task.get("due_date")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    if isinstance(due_date, str):
        due_date = datetime.fromisoformat(due_date)

    return TaskResponse(
        task_id=updated_task["task_id"], title=updated_task["title"],
        description=updated_task.get("description"), due_date=due_date,
        priority=updated_task["priority"], completed=updated_task["completed"],
        created_at=created_at
    )


@tasks_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"task_id": task_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}
