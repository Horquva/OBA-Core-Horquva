import hashlib
import re
import logging
from typing import List, Optional, Dict, Tuple
from models import TechnologyProfile, EvidenceRecord, MaturityState, ConfidenceMetadata, EvolutionEvent, EventType
from llm_client import GeminiClient
from intelligence_registry import IntelligenceRegistry

logger = logging.getLogger("antares.discovery")

class DiscoveryPipeline:
    def __init__(self, llm_client: GeminiClient, registry: IntelligenceRegistry, similarity_threshold: float = 0.92):
        self.llm = llm_client
        self.registry = registry
        self.similarity_threshold = similarity_threshold

    def _extract_technologies_llm(self, raw_text: str) -> List[str]:
        prompt = (
            "You are an expert technology analyst. Extract all specific technology entities, frameworks, "
            "and concepts mentioned in the text. Return ONLY a valid JSON object with a single key 'technologies' "
"containing a list of strings. Preserve the original casing of acronyms.\n"
            f"Text: {raw_text}"
        )
        data = self.llm.generate_json(prompt)
        if data and "technologies" in data and isinstance(data["technologies"], list):
            return [str(t).strip() for t in data["technologies"] if t]
        return []

    def _build_registry_index(self) -> Tuple[List[TechnologyProfile], Optional[List[List[float]]]]:
        """FIXED: Batch-embed ALL existing profiles ONCE per process_source() call.
        This eliminates the N+1 API call problem — O(1) embed calls instead of O(N).
        """
        existing_profiles = list(self.registry.technologies.values())
        if not existing_profiles:
            return [], None
        existing_names = [p.name for p in existing_profiles]
        existing_vectors = self.llm.embed(existing_names)
        return existing_profiles, existing_vectors

    def _find_matching_profile(self, tech_name: str, tech_vector: List[float], 
                               existing_profiles: List[TechnologyProfile], 
                               existing_vectors: Optional[List[List[float]]]) -> Optional[TechnologyProfile]:
        """FIXED: Use pre-computed batch embeddings instead of per-profile API calls."""
        if not tech_vector or not existing_vectors:
            return None
        best_match, best_score = None, 0.0
        for profile, existing_vec in zip(existing_profiles, existing_vectors):
            score = self.llm.cosine_similarity(tech_vector, existing_vec)
            if score > best_score:
                best_score = score
                best_match = (profile, score)
        
        if best_match and best_match[1] >= self.similarity_threshold:
            logger.info(f"[Semantic Match] '{tech_name}' matched with '{best_match[0].name}' (score: {best_match[1]:.3f})")
            return best_match[0]
        return None

    def _extract_evidence_sentence(self, text: str, tech_name: str) -> str:
        sentences = re.split(r'(?<=[.!?]) +', text)
        for sentence in sentences:
            if tech_name.lower() in sentence.lower():
                return sentence.strip()
        return text[:150] + "..."

    def process_source(self, raw_text: str, source_url: str):
        logger.info(f"[Ingestion] Processing source: {source_url}")
        raw_techs = self._extract_technologies_llm(raw_text)
        if not raw_techs:
            return []
        
        vectors = self.llm.embed(raw_techs)
        if not vectors or len(vectors) != len(raw_techs):
            vectors = [None] * len(raw_techs)
            
        # FIXED: Build registry index ONCE (1 API call, not N!)
        existing_profiles, existing_vectors = self._build_registry_index()
        
        intelligence_records = []
        source_id = hashlib.md5(source_url.encode()).hexdigest()
        
        for i, raw_tech in enumerate(raw_techs):
            tech_vector = vectors[i]
            matched_profile = self._find_matching_profile(raw_tech, tech_vector, existing_profiles, existing_vectors)
            evidence_text = self._extract_evidence_sentence(raw_text, raw_tech)
            confidence = ConfidenceMetadata(score=0.90 if tech_vector else 0.60, variance=0.05, sample_size=1, calibration_source="gemini-llm")
            evidence = EvidenceRecord(source_id=source_id, extracted_text=evidence_text, confidence=confidence)
            
            if matched_profile:
                normalized_name, tech_id, domain, is_new = matched_profile.name, matched_profile.tech_id, matched_profile.domain, False
                event = EvolutionEvent(event_type=EventType.ADOPTION_SIGNAL, description=f"Adoption signal in {source_url}", evidence_refs=[evidence.evidence_id], impact_score=0.6, llm_interpretation=f"Continued mention of {normalized_name}.")
            else:
                normalized_name, tech_id, domain, is_new = raw_tech.strip(), hashlib.md5(raw_tech.strip().lower().encode()).hexdigest(), "Unclassified", True
                event = EvolutionEvent(event_type=EventType.EMERGENCE, description=f"Initial emergence in {source_url}", evidence_refs=[evidence.evidence_id], impact_score=0.8, llm_interpretation=f"First signal for {normalized_name}.")
                
            profile = TechnologyProfile(
                tech_id=tech_id, name=normalized_name, domain=domain, description=f"Auto: {normalized_name}", 
                maturity_state=MaturityState.EMERGING, evidence=[evidence], sources=[source_id], 
                overall_confidence=confidence, evolution_history=[event]
            )
            intelligence_records.append(profile)
            logger.info(f"{'[New]' if is_new else '[Match]'} Processed: {normalized_name}")
            
        return intelligence_records
