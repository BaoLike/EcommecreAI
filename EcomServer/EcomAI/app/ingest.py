import asyncio

from app.knowledge import ingest_documents


async def main() -> None:
    count = await ingest_documents()
    print(f"Indexed {count} knowledge chunks.")


if __name__ == "__main__":
    asyncio.run(main())
