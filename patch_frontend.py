with open("frontend/src/hooks/useChatStream.ts", "r", encoding="utf-8") as f:
    text = f.read()

old_block = '''              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (!dataStr) continue;
  
                try {
                  const data = JSON.parse(dataStr);'''

new_block = '''              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (!dataStr) continue;
  
                let data: any;
                try {
                  data = JSON.parse(dataStr);
                } catch (e) {
                  console.error("Error parsing SSE JSON:", line, e);
                  continue;
                }
                
                try {'''

text = text.replace(old_block, new_block)

with open("frontend/src/hooks/useChatStream.ts", "w", encoding="utf-8") as f:
    f.write(text)
