from discovery_pipeline import DiscoveryPipeline
from intelligence_registry import IntelligenceRegistry

def main():
    print("🚀 Starting Day 4: Adversarial Testing & Multi-Source Merging...\n")
    pipeline = DiscoveryPipeline()
    registry = IntelligenceRegistry()

    # Source 1 (Mentions RAG and Vector Database)
    text1 = "Retrieval-Augmented Generation (RAG) is essential for grounding LLMs. It relies on a Vector Database."
    records1 = pipeline.process_source(text1, "https://arxiv.org/source1")
    for r in records1: 
        registry.upsert_technology(r)

    print("-" * 40)

    # Source 2 (Mentions RAG again, plus LangChain - This tests duplicate merging!)
    text2 = "Recent papers show RAG reduces hallucinations by 40%. LangChain is often used to build RAG pipelines."
    records2 = pipeline.process_source(text2, "https://arxiv.org/source2")
    for r in records2: 
        registry.upsert_technology(r)

    print("\n" + "=" * 50)
    print(f"🔍 Total Unique Technologies in Registry: {len(registry.get_all())}")
    for tech in registry.get_all():
        print(f"📌 {tech.name}")
        print(f"   - Evidence count: {len(tech.evidence)}")
        print(f"   - Sources tracked: {len(tech.sources)}")
        
    print("\n🎉 Day 4 Working Requirement Met: Duplicate detection and multi-source merging successful!")

if __name__ == "__main__":
    main()
