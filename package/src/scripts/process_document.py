# process_document.py

from gensim.summarization import summarize
from keybert import KeyBERT

def process_document(file_path):
    with open(file_path, 'r') as file:
        text = file.read()

    summary = summarize(text)
    kw_model = KeyBERT()
    keywords = kw_model.extract_keywords(text)

    return {
        'summary': summary,
        'tags': [kw[0] for kw in keywords]
    }

if __name__ == "__main__":
    import sys
    import json

    file_path = sys.argv[1]
    result = process_document(file_path)
    print(json.dumps(result))
