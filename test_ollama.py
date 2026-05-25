import sys
import os
sys.path.insert(0, os.path.abspath('.'))
from app.rag.pipeline import generate_stream
try:
    for chunk in generate_stream('ollama', 'llama3', 'Hello world'):
        print(chunk, end='', flush=True)
except Exception as e:
    print('ERROR:', e)
    import traceback
    traceback.print_exc()
