# Project: muniPDF Extractor

## Purpose:
This is a local, GUI-based PDF parsing tool for extracting structured text and financial tables from large municipal bond documents (e.g., POS and OS PDFs). The tool is built for internal environments where security and offline operation are critical (e.g., no use of ChatGPT or cloud tools).

## Key Objectives:
- Extract both unstructured text and structured tables from PDFs
- Handle large files (200–700+ pages) efficiently
- Log any parsing issues (e.g., pages skipped, errors)
- Split output into manageable chunks (e.g., every 100 pages)
- Export plain text (`.txt`) and tables (`.csv`)
- Flag any complex or empty pages for manual review
- Offer a simple GUI interface using PySimpleGUI
- Fully offline and self-contained

## Users:
- Internal analysts or staff working with municipal disclosures
- Non-technical users (thanks to GUI)
- Advanced users (via CLI and logs)

## Architecture:
- Backend: Python with `pdfplumber`, `pandas`, `os`, and `logging`
- GUI: for interaction and control
- CLI: Optional command-line interface for advanced use
- Output: Organized folder structure with chunks, logs, and summary

## Stretch Goals:
- Metadata extraction
- Bookmark-based navigation
- Configurable output formats (Markdown, Excel)

