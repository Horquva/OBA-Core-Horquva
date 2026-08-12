from models import SourceRecord
from ingestion import TechnologyIntelligenceEngine
from datetime import datetime, timezone
import json

def main():
    print("🚀 Starting Technology Intelligence Engine (Day 2 - Part 2)...")
    engine = TechnologyIntelligenceEngine()

    # 1. Register a real source
    source = SourceRecord(
        url="https://arxiv.org/abs/2310.06825",
        title="Retrieval-Augmented Generation for Large Language Models",
        author="Lewis et al.",
        publish_date=datetime(2023, 10, 10, tzinfo=timezone.utc),
        credibility_score=0.95,
        raw_content="RAG is an AI framework that enhances the quality of LLM-generated responses..."
    )
    source_id = engine.register_source(source)
    print(f"✅ Source registered with ID: {source_id}")

    # 2. Ingest technology signal
    profile = engine.ingest_technology_signal(
        tech_name="Retrieval-Augmented Generation (RAG)",
        domain="AI & Machine Learning",
        description="Framework to ground LLMs on external data.",
        source_id=source_id,
        evidence_text="RAG reduces hallucinations by retrieving relevant documents.",
        confidence=0.98
    )
    print(f"✅ Technology profile created for: {profile.name}")

    # 3. Retrieve and print
    retrieved = engine.retrieve_intelligence("Retrieval-Augmented Generation (RAG)")
    print("\n🔍 Retrieved Intelligence:")
    print(json.dumps(retrieved.model_dump(), indent=2, default=str))
    print("\n🎉 Day 2 Working Requirement Met: Real source ingested -> Structured record retrieved!")

if __name__ == "__main__":
    main()
