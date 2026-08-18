from llm_client import GeminiClient
from intelligence_registry import IntelligenceRegistry
from discovery_pipeline import DiscoveryPipeline
from maturity_engine import MaturityEngine
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(name)s | %(levelname)s | %(message)s")

def main():
    print("=" * 60)
    print("AI-NATIVE DISCOVERY PIPELINE TEST (LLM + SEMANTIC SEARCH)")
    print("=" * 60)
    
    llm = GeminiClient()
    registry = IntelligenceRegistry()
    pipeline = DiscoveryPipeline(llm_client=llm, registry=registry)
    maturity = MaturityEngine()

    # Source 1: Mentions "Retrieval-Augmented Generation"
    text1 = "Retrieval-Augmented Generation is fundamentally changing how enterprises use Large Language Models."
    recs1 = pipeline.process_source(text1, "source_1")
    for r in recs1: registry.upsert_technology(r)

    print("\n" + "-" * 40)

    # Source 2: Mentions "RAG" and "Vector Databases". 
    # The AI should realize "RAG" == "Retrieval-Augmented Generation" via embeddings!
    text2 = "Modern RAG pipelines rely heavily on Vector Databases like Milvus to store embeddings efficiently."
    recs2 = pipeline.process_source(text2, "source_2")
    for r in recs2: registry.upsert_technology(r)

    print("\n" + "=" * 60)
    print("FINAL REGISTRY STATE (Semantic Deduplication Proof)")
    print("=" * 60)
    
    maturity.evaluate_maturity(registry)
    for tech in registry.get_all():
        print(f"\n📌 {tech.name} (ID: {tech.tech_id[:8]}...)")
        print(f"   Maturity: {tech.maturity_state.value}")
        print(f"   Evidence Count: {len(tech.evidence)}")
        print(f"   Sources: {len(tech.sources)}")
        for ev in tech.evidence:
            print(f"   - '{ev.extracted_text[:60]}...' (Conf: {ev.confidence.score})")

    print("\n🎉 AI-Native Pipeline Test Complete!")

if __name__ == "__main__":
    main()
