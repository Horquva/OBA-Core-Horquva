from discovery_pipeline import DiscoveryPipeline
from intelligence_registry import IntelligenceRegistry
from maturity_engine import MaturityEngine
from retrieval_api import TechnologyIntelligenceAPI
import json

def main():
    print("🚀 Starting Day 6: Relationship Graph & Intelligence Retrieval API...\n")
    
    pipeline = DiscoveryPipeline()
    registry = IntelligenceRegistry()

    # Ingest multiple sources with overlapping technologies
    sources = [
        ("RAG and Vector Databases are essential for modern AI. LangChain helps orchestrate them.", "src_1"),
        ("Agentic AI uses LLMs and RAG to make autonomous decisions.", "src_2"),
        ("LangChain is updating its support for Agentic AI workflows.", "src_3"),
    ]
    
    for text, src in sources:
        records = pipeline.process_source(text, src)
        for r in records:
            registry.upsert_technology(r)

    # Initialize Maturity and API
    MaturityEngine().evaluate_maturity(registry)
    api = TechnologyIntelligenceAPI(registry)

    print("\n" + "="*50)
    print("🔗 INTELLIGENCE RETRIEVAL API (Simulating Downstream Consumer)")
    print("="*50)
    
    # Simulate Muzammel (Organizational Futures) querying for RAG
    print("\n[Query by Muzammel's Platform]: Give me intelligence on 'Retrieval-Augmented Generation'")
    report = api.get_full_intelligence_report("Retrieval-Augmented Generation")
    print(json.dumps(report, indent=2))

    print("\n🎉 Day 6 Working Requirement Met: Relationship graph generated and Retrieval API ready for consumers!")

if __name__ == "__main__":
    main()
