import os, json
import boto3
from botocore.config import Config

REGION = os.getenv("AWS_REGION", "us-east-1")
MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620")

_bedrock = boto3.client(
    "bedrock-runtime",
    region_name=REGION,
    config=Config(retries={"max_attempts": 3, "mode": "standard"}),
)

def chat(prompt: str, max_tokens: int = 512, temperature: float = 0.2) -> str:
    """
    Send a simple chat prompt to Anthropic Claude on Amazon Bedrock and return the text reply.
    Requires AWS credentials to be configured in the environment/credentials file.
    """
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [
            {"role": "user", "content": [{"type": "text", "text": prompt}]}
        ],
    }
    resp = _bedrock.invoke_model(
        modelId=MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(body),
    )
    out = json.loads(resp["body"].read())
    return out["content"][0]["text"]
