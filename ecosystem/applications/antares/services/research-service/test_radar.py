from discovery_pipeline import DiscoveryPipeline
from intelligence_registry import IntelligenceRegistry
from maturity_engine import MaturityEngine
import json

def main():
    print("🚀 Starting Day 5: Maturity Engine & Data-Driven Technology Radar...\n")
    
    pipeline = DiscoveryPipeline()
    registry = IntelligenceRegistry()
    engine = MaturityEngine()

    # Ingest multiple sources to build maturity dynamically
    sources = [
        ("RAG is now widely used in enterprise search.", "source_1"),
        ("Vector Databases like Pinecone are standard for AI.", "source_2"),
        ("LangChain has released v0.2 with major updates.", "source_3"),
        ("Agentic AI is still in early research phases.", "source_4"),
        ("RAG reduces hallucinations significantly according to recent papers.", "source_5"),
        ("Vector Databases are scaling to billions of embeddings efficiently.", "source_6")
    ]
    
    for text, src in sources:
        records = pipeline.process_source(text, src)
        for r in records:
            registry.upsert_technology(r)

    print("\n" + "="*50)
    print("📡 GENERATING DATA-DRIVEN TECHNOLOGY RADAR")
    print("="*50)
    
    radar = engine.generate_technology_radar(registry)
    print(json.dumps(radar, indent=2))
    
    print("\n🎉 Day 5 Working Requirement Met: Maturity Engine and Tech Radar generated from structured intelligence!")

if __name__ == "__main__":
    main()
