import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.post('http://localhost:8001/api/fund/query', json={'code': '161039'})
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")

asyncio.run(test())