import zipfile
import xml.etree.ElementTree as ET

# Open the docx file
zip_file = zipfile.ZipFile('d:/NeuroLearn/NeuroLearn_V1.docx', 'r')

# Read the document.xml file
document_xml = zip_file.read('word/document.xml').decode('utf-8')
zip_file.close()

# Parse the XML and extract text
root = ET.fromstring(document_xml)
text_content = ''.join(root.itertext())

# Save to file
with open('extracted_content.txt', 'w', encoding='utf-8') as f:
    f.write(text_content)

# Also print the content
print(text_content)
print('\n\n--- Content extracted and saved to extracted_content.txt ---')