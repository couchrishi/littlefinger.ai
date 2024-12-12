import chainlit as cl
import httpx  # Use httpx for async API calls
import traceback  # To log the stack trace of errors
import asyncio  # For implementing retries
import re  # For extracting JSON from response

API_URL = "http://127.0.0.1:5001/saib-ai-playground/us-central1/chatWithAI"

# Custom retry logic
MAX_RETRIES = 3
TIMEOUT_SECONDS = 20  # Increase timeout from default 5 to 20 seconds

@cl.on_message
async def main(message: cl.Message):  # <-- Ensure "message" is a Chainlit Message object
    session_id = 'test_session'  # Hardcoded for testing
    chain_id = '0x13882'  # Polygon Mumbai testnet (0x13882 in hex = 80001 in decimal)
    query_id = 'test_query'  # Placeholder query ID
    tx_id = 'test_tx'  # Placeholder transaction ID
    
    # Extract the text from the Chainlit Message object
    user_message = message.content  # Extract the plain message content
    
    payload = {
        'message': user_message,  # Send only the plain string, not the Chainlit object
        'sessionId': session_id,
        'chainId': chain_id,  # Use the Amoy or Mumbai chain ID
        'queryId': query_id,
        'txId': tx_id
    }

    try:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                # 🚀 Log payload to debug issues
                print(f"🚀 Payload Sent (Attempt {attempt}/{MAX_RETRIES}): {payload}")

                # 🛠️ Send request to the API with timeout and retries
                async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                    response = await client.post(API_URL, json=payload)
                
                # 📦 Log response status
                print(f"🔄 Response Status (Attempt {attempt}): {response.status_code}")
                
                # Print the full response content regardless of status code
                print(f"📦 Full API Raw Response Text (Attempt {attempt}): {response.text}")
                
                try:
                    response_data = response.json()  # Parse the JSON response
                except Exception as e:
                    print(f"❌ Failed to parse JSON from API response (Attempt {attempt}): {e}")
                    traceback.print_exc()  # Print full error traceback
                    response_data = {"error": "Invalid JSON response from the API"}

                # 📦 Log the full response from the API to understand what is being returned
                print(f"📦 Full API Response (Attempt {attempt}): {response_data}")  

                if response.status_code == 200 and 'response' in response_data:
                    # Extract the main response message
                    ai_response = response_data['response']
                    
                    # 🔥 Extract any JSON hidden inside the "response"
                    match = re.search(r'<JSON_START>(.*?)<JSON_END>', ai_response, re.DOTALL)
                    if match:
                        extracted_json = match.group(1).strip()
                        print(f"🛠️ Extracted JSON from response: {extracted_json}")
                    
                    # Ensure ai_response is a simple string
                    if not isinstance(ai_response, str):
                        ai_response = str(ai_response)
                    
                    print(f"🤖 AI Response to be sent: {ai_response}")

                    # 🛠️ Ensure cl.Message is awaited properly and send only the string content
                    await cl.Message(content=ai_response).send()
                    break  # If successful, exit the retry loop
                else:
                    error_message = response_data.get('error', 'Unknown error')
                    
                    print(f"⚠️ Error message to be sent: {error_message}")
                    
                    # 🛠️ Send the error message to Chainlit
                    await cl.Message(content=f"❌ Error: {error_message}").send()
                    break  # No need to retry if the API responds with a known error

            except (httpx.ReadTimeout, httpx.RequestError) as e:
                print(f"⚠️ Attempt {attempt} failed with error: {e}")
                traceback.print_exc()
                if attempt == MAX_RETRIES:
                    await cl.Message(content=f"❌ Error: Request timed out after {MAX_RETRIES} attempts").send()
                    break  # If we've hit the max retries, give up

            except Exception as e:
                # 🛠️ Catch any other errors and log them to the console
                print(f"❌ General Exception occurred (Attempt {attempt}): {e}")
                traceback.print_exc()  # Print the stack trace for debugging
                if attempt == MAX_RETRIES:
                    await cl.Message(content=f"❌ Error: {str(e)}").send()
                    break  # If we've hit the max retries, give up

    except Exception as e:
        print(f"❌ Unhandled Exception occurred: {e}")
        traceback.print_exc()  # Print the stack trace for debugging
        await cl.Message(content=f"❌ Error: {str(e)}").send()
