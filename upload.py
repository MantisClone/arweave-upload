# sudo npm install -g @bundlr-network/client --unsafe-perm=true --allow-root
# python3.8 -m venv venv
# source venv/bin/activate
# pip install pybundlr
from pybundlr import pybundlr
import os
import requests

eth_private_key = os.getenv('REMOTE_TEST_PRIVATE_KEY1')
assert eth_private_key is not None, "You must set REMOTE_TEST_PRIVATE_KEY1 environment variable"

eth_address = pybundlr.eth_address(eth_private_key)
bal = pybundlr.balance(eth_address, "matic")

assert bal > 0, "You need some MATIC to upload a file"

#print(pybundlr.price(1024*1024*1024, "matic"))

#create test file
file_name = "/tmp/testfile.txt"
content_in = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent condimentum tortor elit, euismod interdum arcu molestie ac." + "\n"
with open(file_name, 'w') as f:
	f.write(content_in)

#fund the node, and upload the file
url = pybundlr.fund_and_upload(file_name, "matic", eth_private_key)
print(f"Uploaded file. It's online at: {url}")

#retreive the result
result = requests.get(url)
content_out = result.text
assert content_out == content_in