with open("frontend/src/hooks/useChatStream.ts", "r", encoding="utf-8") as f:
    text = f.read()

old_block = '''                } else if (data.type === 'error') {
                    throw new Error(data.content);
                  }
                } catch (e) {
                  console.error("Error parsing SSE data line", line, e);
                }'''

new_block = '''                } else if (data.type === 'error') {
                    throw new Error(data.content);
                  }
                } catch (e: any) {
                  if (e instanceof Error && e.message === data.content) throw e;
                  console.error("Error processing SSE data line", line, e);
                }'''

text = text.replace(old_block, new_block)

with open("frontend/src/hooks/useChatStream.ts", "w", encoding="utf-8") as f:
    f.write(text)
