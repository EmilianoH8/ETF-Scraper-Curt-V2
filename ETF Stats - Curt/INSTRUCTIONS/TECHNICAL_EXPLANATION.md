# ETF Stats - Technical Explanation

## 🎯 Overview

This document explains the technical architecture behind the ETF Stats project, covering Python execution, web scraping technology, and anti-detection methods.

## 🐍 **Part 1: Python Execution and main.py**

### **What is main.py?**

`main.py` is the **entry point file** for this specific ETF Stats application. It contains the startup logic and coordinates all other components.

### **Why main.py and not another name?**

- **Convention**: `main.py` is a Python naming convention for the primary executable file
- **Script-specific**: This main.py is specific to the ETF Stats project
- **Multiple projects**: Other projects can have their own main.py files in different directories
- **No conflicts**: Each project's main.py only affects that project's directory

### **How Python Finds and Runs main.py**

When you run `python main.py`:

1. **Python interpreter** locates the file named "main.py" in the current directory
2. **Reads the file** from top to bottom
3. **Executes imports** first (loading required libraries)
4. **Runs the code** starting with global statements, then functions when called


## 🌐 **Part 2: Web Scraping Technology**

### **What is curl_cffi?**

`curl_cffi` is a Python HTTP client library that mimics real browsers to avoid detection:

- **Browser impersonation**: Makes requests that look identical to Chrome, Firefox, etc.
- **TLS fingerprinting**: Matches the exact security handshake patterns of real browsers
- **HTTP/2 support**: Uses modern web protocols like browsers do

### **Why curl_cffi vs Regular Requests**

**Regular requests library**:
- Simple HTTP requests
- Easily detected as automated
- Limited header customization

**curl_cffi**:
- Perfect browser impersonation
- Bypasses anti-bot systems
- Handles complex security protocols

### **Anti-Bot Protection Bypass Methods**

#### **1. Browser Impersonation**
```python
# Tell curl_cffi to impersonate Chrome 131 exactly
session = requests.Session()
response = session.get(url, impersonate="chrome131")
```

This automatically:
- Sets the correct User-Agent header
- Includes all Chrome-specific HTTP headers
- Matches Chrome's TLS fingerprint
- Uses Chrome's HTTP/2 settings

#### **2. Request Timing**
```python
# Add delays between requests like humans do
time.sleep(2)  # Wait 2 seconds between fund requests
```

#### **3. Session Management**
```python
# Maintain cookies and state like a real browser session
session = requests.Session()
# All requests use the same session and cookies
```

## 📊 **Part 3: Data Extraction Process**

### **Schwab's Website Structure**

Schwab uses an **iframe architecture**:

1. **Main page**: Contains navigation and iframe reference
2. **Iframe page**: Contains the actual fund data
3. **Our approach**: We go directly to the iframe page for faster access

### **HTML Parsing Strategy**

The scraper uses multiple strategies to find SEC yield data:

```python
# Strategy 1: Look for specific HTML elements
sec_yield_element = soup.find('span', {'data-testid': 'sec-yield'})

# Strategy 2: Search for text patterns
sec_yield_match = re.search(r'SEC.*?Yield.*?(\d+\.?\d*)', html_text)

# Strategy 3: Table-based extraction
yield_table = soup.find('table', class_='fund-data')
```

### **Data Validation**

```python
# Ensure extracted values are realistic
if 0.01 <= sec_yield <= 20.0:
    return sec_yield  # Valid yield
else:
    return None  # Invalid, try other methods
```
