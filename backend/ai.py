# ai.py – FREE AI advisor (Ollama + rule-based)
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

def ask_ai(q: str):
    """
    Free LLM via Ollama (local model).
    Fallback: rule-based permaculture expert system.
    """

    # --- Try LLM first ---
    try:
        payload = {
            "model": "llama3.1",       # FREE model
            "prompt": f"You are a permaculture design expert. Answer clearly:\n{q}",
            "stream": False
        }
        r = requests.post(OLLAMA_URL, json=payload, timeout=15)
        if r.status_code == 200:
            return {"answer": r.json()["response"]}
    except Exception:
        pass

    # --- Rule-based fallback ---
    return {"answer": rule_based_answer(q)}


def rule_based_answer(q: str):
    q_low = q.lower()

    if "water" in q_low or "flow" in q_low or "swale" in q_low:
        return (
            "For water management:\n"
            "- Place swales on contour\n"
            "- Start from highest catchment\n"
            "- Use 1:400 gradient for diversion drains\n"
            "- Include spillways for overflow\n"
        )

    if "sun" in q_low:
        return (
            "For sun exposure:\n"
            "- Place vegetable gardens on east/south-east slopes\n"
            "- Avoid tall trees on southern side (winter shade)\n"
            "- Solar panels face true south in India\n"
        )

    if "crop" in q_low or "plant" in q_low:
        return (
            "Suggested permaculture plants:\n"
            "- Nitrogen fixers: Gliricidia, Leucaena, Pigeon Pea\n"
            "- Fruit trees: Mango, Guava, Banana, Jackfruit\n"
            "- Support species: Vetiver, Lemongrass, Crotalaria\n"
        )

    return "General permaculture advice: increase biodiversity, harvest water, and design on contour."
