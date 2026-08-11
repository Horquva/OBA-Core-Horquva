import re
import hashlib
from models import TechnologyProfile, EvidenceRecord, MaturityState

class DiscoveryPipeline:
    def __init__(self):
        # Deterministic mapping for normalization (AI/ML Mock for local testing)
        self.tech_taxonomy = {
            "rag": "Retrieval-Augmented Generation",
            "llm": "Large Language Model",
            "vector database": "Vector Database",
            "langchain": "LangChain",
            "agentic ai": "Agentic AI"
        }
        self.domain_mapping = {
            "Retrieval-Augmented Generation": "AI Architecture",
            "Large Language Model": "AI Foundation",
            "Vector Database": "AI Infrastructure",
            "LangChain": "AI Framework",
            "Agentic AI": "Autonomous Systems"
        }

    def normalize_entity(self, raw_tech_name: str) -> str:
        """Entity Normalization: Deterministic identifier generation"""
        clean_name = self.tech_taxonomy.get(raw_tech_name.lower().strip(), raw_tech_name.strip())
        return clean_name

    def extract_evidence(self, text: str, tech_name: str) -> str:
        """Evidence Extraction: Grab the exact sentence where tech is mentioned"""
        sentences = re.split(r'(?<=[.!?]) +', text)
        for sentence in sentences:
            if tech_name.lower() in sentence.lower():
                return sentence.strip()
        return text[:100] + "..."

    def process_source(self, raw_text: str, source_url: str):
        """Core Pipeline: Ingestion -> Detection -> Normalization -> Evidence -> Classification"""
        print(f"⚙️ [Ingestion] Processing source: {source_url}")
        
        # 1. Technology Detection (Scanning raw text)
        detected_techs = []
        for key in self.tech_taxonomy.keys():
            if re.search(r'\b' + re.escape(key) + r'\b', raw_text, re.IGNORECASE):
                detected_techs.append(key)
        
        if not detected_techs:
            print("❌ No known technologies detected in this source.")
            return []

        intelligence_records = []
        for raw_tech in detected_techs:
            # 2. Entity Normalization
            normalized_name = self.normalize_entity(raw_tech)
            tech_id = hashlib.md5(normalized_name.encode()).hexdigest() # Deterministic ID
            
            # 3. Evidence Extraction
            evidence_text = self.extract_evidence(raw_text, raw_tech)
            
            # 4. Classification
            domain = self.domain_mapping.get(normalized_name, "General Technology")
            
            # 5. Profile Update / Intelligence Record Generation
            source_id = hashlib.md5(source_url.encode()).hexdigest()
            evidence = EvidenceRecord(
                source_id=source_id,
                extracted_text=evidence_text,
                confidence_score=0.85 
            )
            
            profile = TechnologyProfile(
                tech_id=tech_id,
                name=normalized_name,
                domain=domain,
                description=f"Auto-discovered technology: {normalized_name}",
                maturity_state=MaturityState.DEVELOPING,
                evidence=[evidence],
                sources=[source_id]
            )
            intelligence_records.append(profile)
            print(f"✅ [Detected & Normalized] '{raw_tech}' -> {normalized_name} (Domain: {domain})")

        return intelligence_records
