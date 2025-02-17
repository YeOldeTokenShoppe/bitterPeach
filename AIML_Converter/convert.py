import xml.etree.ElementTree as ET
import re

def clean_text(text):
    """Fix spacing, remove broken words, and clean text formatting."""
    text = text.replace("\n", " ").replace("  ", " ")  # Remove extra spaces
    text = re.sub(r"\s+", " ", text)  # Normalize spaces
    text = text.replace("dif ferentiated", "differentiated").replace("Y ou", "You")  # Fix common splits
    return text.strip()

def extract_text_from_xml(xml_file):
    tree = ET.parse(xml_file)
    root = tree.getroot()

    extracted_text = []
    for text_element in root.findall(".//Text"):
        text_content = text_element.text.strip() if text_element.text else ""
        if text_content:
            extracted_text.append(clean_text(text_content))  # Apply cleaning

    full_text = " ".join(extracted_text)  # Merge into full sentences
    sentences = re.split(r'(?<=[.!?])\s+', full_text)  # Split at punctuation
    return sentences

def convert_text_to_aiml(text_list, aiml_file="converted.aiml"):
    """Convert structured text into meaningful AIML categories."""
    with open(aiml_file, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<aiml version="1.0.1">\n')

        count = 0
        for i in range(len(text_list) - 1):
            question = text_list[i].strip().upper()
            answer = text_list[i + 1].strip()

            if len(question) > 10 and len(answer) > 10:
                f.write(f'<category>\n\t<pattern>{question}</pattern>\n\t<template>{answer}</template>\n</category>\n')
                count += 1

        f.write('</aiml>')
    
    print(f"✅ AIML file '{aiml_file}' created successfully with {count} categories!")

# Run extraction and conversion
xml_text = extract_text_from_xml("myFile.xml")
convert_text_to_aiml(xml_text, "converted.aiml")