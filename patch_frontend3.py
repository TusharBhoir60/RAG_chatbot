with open("frontend/src/hooks/useChatStream.ts", "r", encoding="utf-8") as f:
    text = f.read()

import re
text = re.sub(
    r"\} catch \(e\) \{\s+console\.error\(\"Error parsing SSE data line\", line, e\);\s+\}",
    r'''} catch (e: any) {
                  if (e instanceof Error && data && e.message === data.content) throw e;
                  console.error("Error processing SSE data line", line, e);
                }''',
    text
)

with open("frontend/src/hooks/useChatStream.ts", "w", encoding="utf-8") as f:
    f.write(text)
