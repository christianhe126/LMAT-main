import base64
import sys
import json

from documents.pptx_document import PptxDocument
from documents.docx_document import DocxDocument

if __name__ == "__main__":
    # Read JSON data from stdin
    input_data = sys.stdin.read()

    # Try loading the JSON data
    try:
        data = json.loads(input_data)
        format = data['fileFormat']
        html = data['html']

        template = None
        if data['template'] and data['template'] != 'null' and data['template'] != 'undefined':
            template = data['template']
        metadata = None
        if data['metadata'] and data['metadata'] != 'null' and data['metadata'] != 'undefined':
            try: 
                _t = json.loads(data['metadata']).get('Items')
                metadata = {item['key']: item['value'] for item in _t}
            except json.JSONDecodeError as e:
                print(f"Error decoding metadata JSON: {e}", file=sys.stderr)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}", file=sys.stderr)

    # Create a document based on the format
    if format == '.pptx':
        document = PptxDocument(format, data=data, template=template, metadata=metadata)
    elif format == '.docx':
        document = DocxDocument(format, data=data, template=template, metadata=metadata)
    
    # Process the document and print the result
    result = document.process()
    print(result)
