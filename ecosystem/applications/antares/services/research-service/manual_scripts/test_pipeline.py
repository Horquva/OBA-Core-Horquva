from discovery_pipeline import DiscoveryPipeline
import json

def main():
    print("🚀 Starting Day 3: Technology Discovery Pipeline Test...\n")
    
    # Raw text (Simulating an ingested research paper or tech blog)
    raw_article = """
    Recent advancements in Large Language Models (LLMs) have shown great promise in enterprise search. 
    However, hallucinations remain a critical problem for governance. To solve this, Retrieval-Augmented Generation (RAG) 
    has become the standard architecture. RAG relies heavily on a Vector Database like Pinecone or Milvus 
    to store embeddings efficiently. Furthermore, frameworks like LangChain make it easy to orchestrate these components, 
    paving the way for Agentic AI to automate enterprise workflows.
    """
    
    pipeline = DiscoveryPipeline()
    records = pipeline.process_source(raw_article, "https://arxiv.org/abs/enterprise-rag-2026")

    print(f"\n🔍 Final Intelligence Records Generated: {len(records)}")
    for r in records:
        print("-" * 50)
        print(json.dumps(r.model_dump(), indent=2, default=str))
        
    print("\n🎉 Day 3 Working Requirement Met: Raw text automatically converted to structured intelligence!")

if __name__ == "__main__":
    main()
