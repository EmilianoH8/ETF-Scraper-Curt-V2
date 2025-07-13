#!/usr/bin/env python3
"""
Analyze the Tableau Public HAR file to find API endpoints for WARN data.
This will identify the real data access patterns.
"""

import json
import re
from urllib.parse import urlparse, parse_qs
from collections import defaultdict

def analyze_har_file(har_path):
    """Analyze HAR file to find data API endpoints."""
    
    print("🔍 Analyzing Tableau Public HAR File")
    print("=" * 50)
    
    try:
        with open(har_path, 'r', encoding='utf-8') as f:
            har_data = json.load(f)
    except Exception as e:
        print(f"❌ Error loading HAR file: {e}")
        return
    
    entries = har_data.get('log', {}).get('entries', [])
    print(f"📊 Total requests: {len(entries)}")
    print()
    
    # Categorize requests
    request_types = defaultdict(list)
    data_endpoints = []
    interesting_requests = []
    
    for entry in entries:
        request = entry.get('request', {})
        response = entry.get('response', {})
        
        url = request.get('url', '')
        method = request.get('method', '')
        status = response.get('status', 0)
        content_type = response.get('content', {}).get('mimeType', '')
        response_size = response.get('content', {}).get('size', 0)
        
        # Parse URL
        parsed_url = urlparse(url)
        path = parsed_url.path
        query_params = parse_qs(parsed_url.query)
        
        # Categorize by endpoint type
        if '/vizql/' in path:
            request_types['vizql'].append(entry)
        elif '/bootstrapSession/' in path:
            request_types['bootstrap'].append(entry)
        elif '/commands/' in path:
            request_types['commands'].append(entry)
        elif '/api/' in path:
            request_types['api'].append(entry)
        elif method == 'POST' and status == 200:
            request_types['post_success'].append(entry)
        
        # Look for data endpoints
        if (status == 200 and 
            (response_size > 1000 or 
             'json' in content_type or 
             'csv' in content_type or 
             'application' in content_type)):
            data_endpoints.append(entry)
        
        # Look for interesting patterns
        if any(keyword in path.lower() for keyword in ['data', 'query', 'export', 'download']):
            interesting_requests.append(entry)
    
    print("📋 REQUEST CATEGORIES")
    print("=" * 50)
    for category, requests in request_types.items():
        print(f"🔗 {category.upper()}: {len(requests)} requests")
        if requests:
            # Show a few examples
            for i, req in enumerate(requests[:3]):
                url = req['request']['url']
                method = req['request']['method']
                status = req['response']['status']
                size = req['response']['content'].get('size', 0)
                print(f"  {i+1}. {method} {status} - {size:,} bytes")
                print(f"     {url}")
                if i < 2:  # Show first 3
                    print()
    
    print("\n" + "=" * 50)
    print("🎯 POTENTIAL DATA ENDPOINTS")
    print("=" * 50)
    
    if data_endpoints:
        print(f"Found {len(data_endpoints)} potential data endpoints:")
        print()
        
        for i, entry in enumerate(data_endpoints[:10], 1):  # Show top 10
            request = entry['request']
            response = entry['response']
            
            url = request['url']
            method = request['method']
            status = response['status']
            content_type = response['content'].get('mimeType', '')
            size = response['content'].get('size', 0)
            
            print(f"🔍 ENDPOINT {i}:")
            print(f"   URL: {url}")
            print(f"   Method: {method}")
            print(f"   Status: {status}")
            print(f"   Content-Type: {content_type}")
            print(f"   Size: {size:,} bytes")
            
            # Check if response contains data
            response_text = response.get('content', {}).get('text', '')
            if response_text:
                # Look for data patterns
                if any(pattern in response_text.lower() for pattern in ['warn', 'company', 'employee', 'layoff']):
                    print(f"   🎯 CONTAINS WARN DATA!")
                    # Show sample
                    sample = response_text[:500] + "..." if len(response_text) > 500 else response_text
                    print(f"   Sample: {sample}")
                
                # Check for JSON structure
                if response_text.strip().startswith('{') or response_text.strip().startswith('['):
                    print(f"   📊 JSON Response")
                    try:
                        json.loads(response_text)
                        print(f"   ✅ Valid JSON")
                    except:
                        print(f"   ⚠️  Invalid JSON")
            
            # Show request headers
            headers = request.get('headers', [])
            important_headers = ['authorization', 'x-tableau-auth', 'cookie', 'x-requested-with']
            for header in headers:
                if header.get('name', '').lower() in important_headers:
                    print(f"   Header: {header['name']}: {header['value'][:50]}...")
            
            # Show POST data
            if method == 'POST':
                post_data = request.get('postData', {})
                if post_data:
                    print(f"   POST Data: {post_data.get('text', '')[:200]}...")
            
            print()
    else:
        print("⚠️  No obvious data endpoints found")
    
    print("\n" + "=" * 50)
    print("🚀 RECOMMENDED APPROACH")
    print("=" * 50)
    
    # Find the best endpoints to replicate
    best_endpoints = []
    
    # Look for VizQL endpoints with successful responses
    vizql_endpoints = request_types.get('vizql', [])
    for entry in vizql_endpoints:
        if entry['response']['status'] == 200:
            size = entry['response']['content'].get('size', 0)
            if size > 1000:  # Substantial response
                best_endpoints.append(('VizQL', entry))
    
    # Look for command endpoints
    command_endpoints = request_types.get('commands', [])
    for entry in command_endpoints:
        if entry['response']['status'] == 200:
            size = entry['response']['content'].get('size', 0)
            if size > 1000:
                best_endpoints.append(('Commands', entry))
    
    if best_endpoints:
        print("✅ Found promising endpoints to replicate:")
        for endpoint_type, entry in best_endpoints[:5]:  # Show top 5
            url = entry['request']['url']
            method = entry['request']['method']
            size = entry['response']['content'].get('size', 0)
            print(f"  🎯 {endpoint_type}: {method} - {size:,} bytes")
            print(f"     {url}")
            print()
        
        print("🔧 NEXT STEPS:")
        print("1. Replicate the bootstrap session initialization")
        print("2. Execute the key data-fetching requests")
        print("3. Parse the JSON responses for WARN data")
        print("4. Much simpler than the original API reverse-engineering!")
    else:
        print("⚠️  No clear data endpoints found")
        print("   → May need browser automation approach")

def main():
    """Main function."""
    har_file = "public.tableau.com.har"
    analyze_har_file(har_file)

if __name__ == "__main__":
    main() 