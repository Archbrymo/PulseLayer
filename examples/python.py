"""Raw Python client example. A wallet/agent must sign the B402 challenge first."""
import json, os, urllib.request
from urllib.error import HTTPError
BASE=os.getenv('PULSELAYER_URL','http://localhost:8787')
def get(path, payment_signature=None):
    headers={}
    if payment_signature: headers['payment-signature']=payment_signature
    req=urllib.request.Request(BASE+path,headers=headers)
    with urllib.request.urlopen(req) as response: return json.load(response)
print(get('/api/v1/resolve?symbol=NVDA'))
signature=os.getenv('PULSELAYER_PAYMENT_SIGNATURE')
if signature:
    print(get('/api/v1/state?symbol=NVDA',signature)['data'])
else:
    try:
        get('/api/v1/state?symbol=NVDA')
    except HTTPError as error:
        if error.code != 402: raise
        print('Paid API requires a wallet-signed B402 challenge. No demo payment is accepted.')
        print(error.read().decode())
