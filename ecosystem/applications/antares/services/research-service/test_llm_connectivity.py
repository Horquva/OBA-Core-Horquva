from llm_client import GeminiClient
import json

def main():
    client = GeminiClient()
    print("=" * 60)
    print("GEMINI INTERACTIONS API CONNECTIVITY TEST")
    print("=" * 60)

    if not client.available:
        print("❌ API key/SDK missing.")
        return

    prompt = ('Extract technology entities. Return ONLY valid JSON: {"technologies": ["name1"]}\n'
              'Text: "RAG pipelines rely on vector databases like Milvus, while LangChain orchestrates agentic AI."')
    data = client.generate_json(prompt)
    if data and "technologies" in data:
        print("✅ LLM extraction OK:", json.dumps(data))
    else:
        print("⚠️ LLM extraction failed.")

    vecs = client.embed(["retrieval augmented generation", "vector database"])
    if vecs and len(vecs) == 2:
        sim = client.cosine_similarity(vecs[0], vecs[1])
        print(f"✅ Embeddings OK. dims={len(vecs[0])}, cosine_sim={sim:.4f}")
    else:
        print("⚠️ Embeddings unavailable.")

    print("\nAUDIT LOG:")
    for rec in client.audit_log:
        print(f" - {rec['operation']} | {rec['model']} | success: {rec['success']} | {rec['latency_s']}s | {rec['error'] or ''}")

if __name__ == "__main__":
    main()
