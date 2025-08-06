import openai
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        api_key = current_app.config.get('OPENAI_API_KEY')
        if not api_key:
            logger.error("OPENAI_API_KEY is not set in the application configuration.")
            raise ValueError("OPENAI_API_KEY is not set.")
        self.client = openai.OpenAI(api_key=api_key)

    def get_completion(self, prompt: str, max_tokens: int = 150) -> str:
        """Generates a completion for a given prompt."""
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant for managing Kubernetes clusters."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                n=1,
                stop=None,
                temperature=0.7,
            )
            completion = response.choices[0].message.content
            if completion is None:
                return ""
            return completion.strip()
        except openai.APIStatusError as e:
            logger.error(f"OpenAI API status error: {e}")
            if e.status_code == 429:
                try:
                    error_data = e.response.json()
                    if error_data.get("error", {}).get("type") == "insufficient_quota":
                        return "Error: OpenAI API quota exceeded. Please check your plan and billing details."
                except Exception:
                    pass
                return "Error: OpenAI rate limit or quota exceeded. Please try again later."
            return "Error: An unexpected API error occurred with OpenAI."
        except Exception as e:
            logger.error(f"An unexpected error occurred while getting completion from OpenAI: {e}")
            return "Error: Could not get a suggestion."
