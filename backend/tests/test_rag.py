"""
test_rag.py — Tests for RAG material upload, listing, querying.
"""
import io
import pytest


async def _register_and_token(client, payload):
    resp = await client.post("/auth/register", json=payload)
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_list_materials_empty(client, test_user_payload):
    """GET /materials with valid username returns a list (may be empty)."""
    await client.post("/auth/register", json=test_user_payload)
    resp = await client.get(
        "/materials",
        headers={"X-User-Name": test_user_payload["username"]}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "materials" in data
    assert isinstance(data["materials"], list)


@pytest.mark.asyncio
async def test_upload_text_file(client, test_user_payload):
    """Upload a small plaintext file and expect a material record back."""
    await client.post("/auth/register", json=test_user_payload)
    content = b"Python is a high-level programming language. It is great for AI and data science."
    resp = await client.post(
        "/materials/upload",
        headers={"X-User-Name": test_user_payload["username"]},
        files={"file": ("test_doc.txt", io.BytesIO(content), "text/plain")},
        data={"title": "Python Intro"}
    )
    assert resp.status_code == 200, f"Upload failed: {resp.text}"
    data = resp.json()
    assert "material" in data
    assert data["material"]["title"] == "Python Intro"
    assert data["material"]["chunk_count"] > 0
    return data["material"]["id"]


@pytest.mark.asyncio
async def test_query_material(client, test_user_payload):
    """Upload a doc then query it — should get a cited answer."""
    await client.post("/auth/register", json=test_user_payload)
    uname = test_user_payload["username"]
    content = b"Photosynthesis is the process by which plants convert sunlight into glucose using chlorophyll."
    up = await client.post(
        "/materials/upload",
        headers={"X-User-Name": uname},
        files={"file": ("bio.txt", io.BytesIO(content), "text/plain")},
        data={"title": "Biology Notes"}
    )
    mat_id = up.json()["material"]["id"]

    resp = await client.post(
        f"/materials/{mat_id}/query",
        headers={"X-User-Name": uname},
        json={"question": "What is photosynthesis?"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert "citations" in data


@pytest.mark.asyncio
async def test_query_all_materials(client, test_user_payload):
    """POST /materials/query (cross-doc search) should return an answer."""
    await client.post("/auth/register", json=test_user_payload)
    uname = test_user_payload["username"]
    await client.post(
        "/materials/upload",
        headers={"X-User-Name": uname},
        files={"file": ("chem.txt", io.BytesIO(b"Water is H2O. It is a molecule."), "text/plain")},
        data={"title": "Chemistry"}
    )
    resp = await client.post(
        "/materials/query",
        headers={"X-User-Name": uname},
        json={"question": "What is water made of?"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data


@pytest.mark.asyncio
async def test_delete_material(client, test_user_payload):
    """DELETE /materials/{id} should remove the material."""
    await client.post("/auth/register", json=test_user_payload)
    uname = test_user_payload["username"]
    up = await client.post(
        "/materials/upload",
        headers={"X-User-Name": uname},
        files={"file": ("del.txt", io.BytesIO(b"Delete me"), "text/plain")},
        data={"title": "To Delete"}
    )
    mat_id = up.json()["material"]["id"]
    del_resp = await client.delete(
        f"/materials/{mat_id}",
        headers={"X-User-Name": uname}
    )
    assert del_resp.status_code == 200
    # Confirm it's gone from list
    lst = await client.get("/materials", headers={"X-User-Name": uname})
    ids = [m["id"] for m in lst.json()["materials"]]
    assert mat_id not in ids
