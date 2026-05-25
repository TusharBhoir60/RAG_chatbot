import json
with open('app/api/main.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(
    r'        except Exception as exc:\n            logger\.exception\("Error during token generation"\)\n            yield f"data: {json\.dumps\(\{\\'type\\': \\'error\\', \\'content\\': \\'Error generating response\\'\}\)}\\n\\n"',
    r'''        except Exception as exc:
            from app.rag.exceptions import OllamaServiceError, RetrievalServiceError
            if isinstance(exc, OllamaServiceError):
                logger.warning("chat failed during generation: Ollama unavailable - %s", exc)
                yield f"data: {json.dumps({'type': 'error', 'content': str(exc)})}\\n\\n"
            elif isinstance(exc, RetrievalServiceError):
                logger.warning("chat failed during generation: retrieval unavailable - %s", exc)
                yield f"data: {json.dumps({'type': 'error', 'content': str(exc)})}\\n\\n"
            else:
                logger.exception("Error during token generation")
                yield f"data: {json.dumps({'type': 'error', 'content': 'Error generating response'})}\\n\\n"''',
    text
)

with open('app/api/main.py', 'w', encoding='utf-8') as f:
    f.write(text)
